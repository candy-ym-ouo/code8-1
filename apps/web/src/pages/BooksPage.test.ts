import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../api/client';
import type { Book } from '../types/domain';
import BooksPage from './BooksPage.vue';

const hoisted = vi.hoisted(() => ({
  listMock: vi.fn(),
  replaceMock: vi.fn(),
  route: { query: {} as Record<string, unknown> }
}));

vi.mock('vue-router', async () => {
  const { reactive } = await import('vue');
  const route = reactive({ query: {} as Record<string, unknown> });
  hoisted.route = route;
  return {
    useRoute: () => route,
    useRouter: () => ({ replace: hoisted.replaceMock })
  };
});

vi.mock('../api', () => ({
  booksApi: {
    list: (...args: unknown[]) => hoisted.listMock(...args)
  }
}));

interface ListResult {
  items: Book[];
  pagination: { page: number; pageSize: number; total: number };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function makeBook(id: string, title: string): Book {
  return {
    id,
    title,
    author: null,
    publisher: null,
    publicationYear: null,
    isbn: null,
    pageCount: null,
    coverUrl: null,
    status: 'READING',
    version: 1,
    createdAt: '2026-09-01T00:00:00.000Z',
    updatedAt: '2026-09-01T00:00:00.000Z',
    traceSummary: { dogEars: 0, annotations: 0, rereadMarks: 0 },
    hasCompletionReflection: false,
    lastTraceAt: null
  };
}

function mountPage() {
  return mount(BooksPage, {
    global: {
      stubs: { RouterLink: { template: '<a><slot /></a>' } }
    }
  });
}

function lastParams(): URLSearchParams {
  const calls = hoisted.listMock.mock.calls;
  const last = calls[calls.length - 1];
  if (!last) throw new Error('booksApi.list 未被调用');
  return last[0] as URLSearchParams;
}

const STORAGE_KEY = 'paper-book-traces:books-filter';

// 每个用例结束后卸载组件：否则存活的 watcher 会响应后续用例对 route 的改动，
// 发出计划外的列表请求
enableAutoUnmount(afterEach);

beforeEach(() => {
  setActivePinia(createPinia());
  localStorage.clear();
  hoisted.listMock.mockReset();
  hoisted.replaceMock.mockReset();
  hoisted.route.query = {};
});

describe('BooksPage', () => {
  it('切换筛选时，先发出的旧响应不得覆盖新结果', async () => {
    const stale = deferred<ListResult>();
    const fresh = deferred<ListResult>();
    hoisted.listMock.mockReturnValueOnce(stale.promise).mockReturnValueOnce(fresh.promise);
    const wrapper = mountPage();

    // 首次加载尚未返回，立刻切换状态筛选，发出第二个请求
    await wrapper.find('select').setValue('READING');
    expect(hoisted.listMock).toHaveBeenCalledTimes(2);

    // 新请求先返回并渲染
    fresh.resolve({ items: [makeBook('book-new', '新结果书')], pagination: { page: 1, pageSize: 12, total: 1 } });
    await flushPromises();
    expect(wrapper.text()).toContain('新结果书');

    // 旧请求随后返回，必须被丢弃
    stale.resolve({ items: [makeBook('book-old', '旧结果书')], pagination: { page: 1, pageSize: 12, total: 1 } });
    await flushPromises();
    expect(wrapper.text()).toContain('新结果书');
    expect(wrapper.text()).not.toContain('旧结果书');
    expect(wrapper.find('.state-panel').exists()).toBe(false);
  });

  it('旧请求的失败不会顶掉新结果，也不显示过期错误', async () => {
    const stale = deferred<ListResult>();
    const fresh = deferred<ListResult>();
    hoisted.listMock.mockReturnValueOnce(stale.promise).mockReturnValueOnce(fresh.promise);
    const wrapper = mountPage();

    await wrapper.find('select').setValue('READING');
    fresh.resolve({ items: [makeBook('book-new', '新结果书')], pagination: { page: 1, pageSize: 12, total: 1 } });
    await flushPromises();

    stale.reject(new ApiError(500, 'REQUEST_FAILED', '旧请求失败'));
    await flushPromises();
    expect(wrapper.text()).toContain('新结果书');
    expect(wrapper.find('.error-notice').exists()).toBe(false);
  });

  it('进入页面时恢复本地保存的筛选', async () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ search: '雪国', status: 'READ', page: 2 }));
    hoisted.listMock.mockResolvedValue({ items: [], pagination: { page: 2, pageSize: 12, total: 30 } });
    mountPage();
    await flushPromises();

    expect(hoisted.listMock).toHaveBeenCalledTimes(1);
    const params = lastParams();
    expect(params.get('search')).toBe('雪国');
    expect(params.get('status')).toBe('READ');
    expect(params.get('page')).toBe('2');
  });

  it('URL query 优先于本地保存的筛选', async () => {
    hoisted.route.query = { status: 'PAUSED' };
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ search: '雪国', status: 'READ', page: 2 }));
    hoisted.listMock.mockResolvedValue({ items: [], pagination: { page: 1, pageSize: 12, total: 0 } });
    mountPage();
    await flushPromises();

    const params = lastParams();
    expect(params.get('status')).toBe('PAUSED');
    expect(params.get('search')).toBeNull();
    expect(params.get('page')).toBe('1');
  });

  it('筛选变化会保存到本地并同步到 URL', async () => {
    hoisted.listMock.mockResolvedValue({ items: [], pagination: { page: 1, pageSize: 12, total: 0 } });
    const wrapper = mountPage();
    await flushPromises();

    await wrapper.find('input[type="search"]').setValue('边城');
    await wrapper.find('form').trigger('submit');

    expect(hoisted.replaceMock).toHaveBeenLastCalledWith({ query: { search: '边城' } });
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!)).toEqual({ search: '边城', status: 'ALL', page: 1 });
    expect(lastParams().get('search')).toBe('边城');
  });

  it('并发删除导致当前页越界时，回退到最后一页重新取数', async () => {
    hoisted.route.query = { page: '3' };
    hoisted.listMock
      .mockResolvedValueOnce({ items: [], pagination: { page: 3, pageSize: 12, total: 13 } })
      .mockResolvedValueOnce({ items: [makeBook('book-x', '留存的书')], pagination: { page: 2, pageSize: 12, total: 13 } });
    const wrapper = mountPage();
    await flushPromises();

    expect(hoisted.listMock).toHaveBeenCalledTimes(2);
    expect(lastParams().get('page')).toBe('2');
    expect(wrapper.text()).toContain('留存的书');
    expect(hoisted.replaceMock).toHaveBeenLastCalledWith({ query: { page: '2' } });
  });

  it('URL 变化时按新地址恢复筛选并重新加载', async () => {
    hoisted.listMock.mockResolvedValue({ items: [], pagination: { page: 1, pageSize: 12, total: 0 } });
    mountPage();
    await flushPromises();
    expect(hoisted.listMock).toHaveBeenCalledTimes(1);

    hoisted.route.query = { status: 'READ' };
    await flushPromises();

    expect(hoisted.listMock).toHaveBeenCalledTimes(2);
    expect(lastParams().get('status')).toBe('READ');
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!)).toMatchObject({ status: 'READ' });
  });
});
