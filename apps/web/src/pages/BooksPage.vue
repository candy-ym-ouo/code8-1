<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ApiError } from '../api/client';
import { booksApi } from '../api';
import { formatDateTime } from '../api/format';
import ErrorNotice from '../components/ErrorNotice.vue';
import { useAuthStore } from '../stores/auth';
import { STATUS_LABELS, type Book, type BookStatus } from '../types/domain';
import {
  DEFAULT_BOOKS_FILTER,
  booksFilterFromQuery,
  booksFilterToQuery,
  clampPageToTotal,
  loadSavedBooksFilter,
  sameBooksFilter,
  saveBooksFilter,
  type BooksFilter
} from './booksFilter';

const route = useRoute();
const router = useRouter();
const auth = useAuthStore();

const books = ref<Book[]>([]);
const loading = ref(true);
const error = ref('');
const search = ref('');
const status = ref<'ALL' | BookStatus>('ALL');
const page = ref(1);
const pageSize = 12;
const total = ref(0);

const hasActiveFilter = computed(() => search.value.trim() !== '' || status.value !== 'ALL');

function currentFilter(): BooksFilter {
  return { search: search.value.trim(), status: status.value, page: page.value };
}

function applyFilter(filter: BooksFilter): void {
  search.value = filter.search;
  status.value = filter.status;
  page.value = filter.page;
}

/** URL query 优先，其次是本地保存的筛选，最后是默认值。 */
function resolveInitialFilter(): BooksFilter {
  return (
    booksFilterFromQuery(route.query) ??
    loadSavedBooksFilter(localStorage, auth.user?.id ?? null) ??
    DEFAULT_BOOKS_FILTER
  );
}

/** 把当前筛选同步到 localStorage 与 URL，刷新或分享链接后状态可恢复。 */
function persistFilter(): void {
  saveBooksFilter(localStorage, auth.user?.id ?? null, currentFilter());
  void router.replace({ query: booksFilterToQuery(currentFilter()) });
}

// 单调递增的请求序号：只有最新一次请求允许写入列表状态，
// 快速切换筛选时，先发出的旧响应即使后返回也不得覆盖新结果。
let loadSeq = 0;

async function load(): Promise<void> {
  const seq = ++loadSeq;
  loading.value = true;
  error.value = '';
  const params = new URLSearchParams({
    page: String(page.value),
    pageSize: String(pageSize)
  });
  if (search.value.trim()) params.set('search', search.value.trim());
  if (status.value !== 'ALL') params.set('status', status.value);
  try {
    const result = await booksApi.list(params);
    if (seq !== loadSeq) return;
    const clamped = clampPageToTotal(page.value, result.pagination.total, pageSize);
    if (clamped !== page.value) {
      // 并发删除后当前页已不存在：回退到最后一页重新取数
      page.value = clamped;
      persistFilter();
      return load();
    }
    books.value = result.items;
    total.value = result.pagination.total;
  } catch (caught) {
    if (seq !== loadSeq) return;
    error.value = caught instanceof ApiError ? caught.message : '书目加载失败';
  } finally {
    if (seq === loadSeq) loading.value = false;
  }
}

function submitSearch(): void {
  page.value = 1;
  persistFilter();
  void load();
}

function resetFilter(): void {
  applyFilter(DEFAULT_BOOKS_FILTER);
  persistFilter();
  void load();
}

function changePage(next: number): void {
  page.value = next;
  persistFilter();
  void load();
}

// 浏览器前进/后退或导航导致 URL 变化时，按 URL 恢复筛选状态
watch(
  () => route.query,
  () => {
    const next = resolveInitialFilter();
    if (sameBooksFilter(next, currentFilter())) return;
    applyFilter(next);
    persistFilter();
    void load();
  }
);

onMounted(() => {
  applyFilter(resolveInitialFilter());
  persistFilter();
  void load();
});
</script>

<template>
  <section>
    <header class="page-heading">
      <div>
        <p class="eyebrow">MY PAPER BOOKS</p>
        <h1>我的书</h1>
        <p>只记录书与你之间发生过什么。</p>
      </div>
      <RouterLink class="button button-primary" to="/books/new">添加书</RouterLink>
    </header>

    <form class="toolbar card" @submit.prevent="submitSearch">
      <label class="grow">
        搜索
        <input v-model="search" type="search" placeholder="书名或作者" />
      </label>
      <label>
        状态
        <select v-model="status" @change="submitSearch">
          <option value="ALL">全部</option>
          <option v-for="(label, value) in STATUS_LABELS" :key="value" :value="value">{{ label }}</option>
        </select>
      </label>
      <button class="button" type="submit">筛选</button>
    </form>

    <ErrorNotice :message="error" />

    <div v-if="loading" class="state-panel">正在翻阅你的书目…</div>
    <div v-else-if="books.length === 0" class="empty-state card">
      <template v-if="hasActiveFilter">
        <span class="empty-mark">筛</span>
        <h2>没有符合筛选条件的书</h2>
        <p>换个关键词或状态试试，或者清除筛选查看全部书目。</p>
        <button class="button button-primary" type="button" @click="resetFilter">清除筛选</button>
      </template>
      <template v-else>
        <span class="empty-mark">页</span>
        <h2>还没有记录一本纸质书</h2>
        <p>添加一本真实拥有的书，然后从某一页的折角或批注开始。</p>
        <RouterLink class="button button-primary" to="/books/new">添加第一本书</RouterLink>
      </template>
    </div>
    <div v-else class="book-grid">
      <article v-for="book in books" :key="book.id" class="book-card card">
        <div class="book-card-top">
          <img
            v-if="book.coverUrl"
            class="book-cover"
            :src="book.coverUrl"
            :alt="`${book.title} 封面`"
            loading="lazy"
            referrerpolicy="no-referrer"
          />
          <div v-else class="book-cover book-cover-placeholder" aria-hidden="true">
            {{ book.title.slice(0, 1) }}
          </div>
          <div>
            <span class="status-badge" :data-status="book.status">{{ STATUS_LABELS[book.status] }}</span>
            <h2><RouterLink :to="`/books/${book.id}`">{{ book.title }}</RouterLink></h2>
            <p class="muted">{{ book.author || '作者未填写' }}</p>
          </div>
        </div>
        <p v-if="book.lastTraceAt" class="book-last-trace">
          最近留下痕迹：{{ formatDateTime(book.lastTraceAt) }}
        </p>
        <p v-else class="muted">还没有留下阅读痕迹</p>
        <dl class="trace-summary" aria-label="痕迹数量">
          <div><dt>折角</dt><dd>{{ book.traceSummary.dogEars }}</dd></div>
          <div><dt>批注</dt><dd>{{ book.traceSummary.annotations }}</dd></div>
          <div><dt>重读页</dt><dd>{{ book.traceSummary.rereadMarks }}</dd></div>
        </dl>
        <p v-if="book.hasCompletionReflection" class="completion-hint">
          已留下读完后的感受
        </p>
        <RouterLink class="button button-block" :to="`/books/${book.id}`">查看这本书</RouterLink>
      </article>
    </div>

    <nav v-if="total > pageSize" class="pagination" aria-label="书目分页">
      <button class="button button-quiet" :disabled="page <= 1" @click="changePage(page - 1)">上一页</button>
      <span>第 {{ page }} 页，共 {{ Math.ceil(total / pageSize) }} 页</span>
      <button class="button button-quiet" :disabled="page >= Math.ceil(total / pageSize)" @click="changePage(page + 1)">
        下一页
      </button>
    </nav>
  </section>
</template>
