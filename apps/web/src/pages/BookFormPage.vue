<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ApiError } from '../api/client';
import { booksApi, type BookPayload } from '../api';
import ErrorNotice from '../components/ErrorNotice.vue';
import { BOOK_STATUSES, type BookStatus } from '@paper-book-traces/shared';
import { STATUS_LABELS } from '../types/domain';

const route = useRoute();
const router = useRouter();
const bookId = computed(() => (typeof route.params.bookId === 'string' ? route.params.bookId : null));
const isEdit = computed(() => Boolean(bookId.value));
const createStatuses = BOOK_STATUSES.filter((status) => status !== 'READ');
const loading = ref(false);
const saving = ref(false);
const error = ref('');
const fields = ref<Record<string, string>>({});
type FormValue = string | number;

const form = reactive({
  title: '',
  author: '',
  publisher: '',
  publicationYear: '' as FormValue,
  isbn: '',
  pageCount: '' as FormValue,
  coverUrl: '',
  status: 'TO_READ' as BookStatus,
  version: 1
});

function asText(value: FormValue): string {
  return String(value).trim();
}

function nullable(value: FormValue): string | null {
  const text = asText(value);
  return text ? text : null;
}

function numberOrNull(value: FormValue): number | null {
  return asText(value) ? Number(value) : null;
}

async function load(): Promise<void> {
  if (!bookId.value) return;
  loading.value = true;
  try {
    const result = await booksApi.get(bookId.value);
    const book = result.book;
    form.title = book.title;
    form.author = book.author ?? '';
    form.publisher = book.publisher ?? '';
    form.publicationYear = book.publicationYear ? String(book.publicationYear) : '';
    form.isbn = book.isbn ?? '';
    form.pageCount = book.pageCount ? String(book.pageCount) : '';
    form.coverUrl = book.coverUrl ?? '';
    form.status = book.status;
    form.version = book.version;
  } catch (caught) {
    error.value = caught instanceof ApiError ? caught.message : '书目加载失败';
  } finally {
    loading.value = false;
  }
}

async function submit(): Promise<void> {
  error.value = '';
  fields.value = {};
  if (!form.title.trim()) {
    fields.value.title = '请输入书名';
    return;
  }
  const payload: BookPayload = {
    title: form.title.trim(),
    author: nullable(form.author),
    publisher: nullable(form.publisher),
    publicationYear: numberOrNull(form.publicationYear),
    isbn: nullable(form.isbn),
    pageCount: numberOrNull(form.pageCount),
    coverUrl: nullable(form.coverUrl),
    status: form.status
  };
  saving.value = true;
  try {
    if (bookId.value) {
      await booksApi.update(bookId.value, { ...payload, version: form.version });
      await router.push(`/books/${bookId.value}`);
    } else {
      const result = await booksApi.create(payload);
      await router.push(`/books/${result.book.id}`);
    }
  } catch (caught) {
    if (caught instanceof ApiError) {
      error.value = caught.message;
      fields.value = caught.fields ?? {};
    } else error.value = '保存失败，请稍后重试';
  } finally {
    saving.value = false;
  }
}

onMounted(load);
</script>

<template>
  <section class="narrow-section">
    <header class="page-heading">
      <div>
        <p class="eyebrow">{{ isEdit ? 'EDIT BOOK' : 'NEW BOOK' }}</p>
        <h1>{{ isEdit ? '编辑书目' : '添加一本纸质书' }}</h1>
        <p>{{ isEdit ? '修改书目信息不会抹去已有痕迹。' : '只有书名必填，其他信息可以以后再补。' }}</p>
      </div>
      <RouterLink class="button button-quiet" :to="bookId ? `/books/${bookId}` : '/'">返回</RouterLink>
    </header>

    <ErrorNotice :message="error" :fields="fields" />
    <div v-if="loading" class="state-panel">正在读取书目…</div>
    <form v-else class="card form-stack" @submit.prevent="submit">
      <label>
        书名 <span class="required">必填</span>
        <input v-model="form.title" maxlength="300" required />
      </label>
      <div class="form-grid">
        <label>作者<input v-model="form.author" maxlength="300" /></label>
        <label>出版社<input v-model="form.publisher" maxlength="300" /></label>
        <label>出版年份<input v-model="form.publicationYear" type="number" min="1000" :max="new Date().getFullYear()" /></label>
        <label>ISBN<input v-model="form.isbn" inputmode="numeric" placeholder="可带连字符" /></label>
        <label>总页数<input v-model="form.pageCount" type="number" min="1" max="100000" /></label>
        <label>
          状态
          <select v-if="!isEdit" v-model="form.status">
            <option v-for="value in createStatuses" :key="value" :value="value">{{ STATUS_LABELS[value] }}</option>
          </select>
          <span v-else class="readonly-value">请通过书详情中的状态操作完成阅读闭环</span>
        </label>
      </div>
      <label>封面 URL<input v-model="form.coverUrl" type="url" placeholder="https://…" /></label>
      <div class="form-actions">
        <RouterLink class="button button-quiet" :to="bookId ? `/books/${bookId}` : '/'">取消</RouterLink>
        <button class="button button-primary" type="submit" :disabled="saving">
          {{ saving ? '正在保存…' : '保存书目' }}
        </button>
      </div>
    </form>
  </section>
</template>
