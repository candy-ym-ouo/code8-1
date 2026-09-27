import { flushPromises, mount, RouterLinkStub } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import BooksPage from './BooksPage.vue';
import { booksApi, savedFiltersApi } from '../api';
import type { Book, BookStatus, SavedFilter } from '../types/domain';

vi.mock('../api', () => ({
  booksApi: { list: vi.fn() },
  savedFiltersApi: { list: vi.fn(), create: vi.fn(), delete: vi.fn() }
}));

const listMock = vi.mocked(booksApi.list);
const savedListMock = vi.mocked(savedFiltersApi.list);
const savedCreateMock = vi.mocked(savedFiltersApi.create);
const savedDeleteMock = vi.mocked(savedFiltersApi.delete);

interface ListResult {
  items: Book[];
  pagination: { page: number; pageSize: number; total: number };
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

function makeFilter(id: string, name: string, search: string, status: BookStatus | 'ALL'): SavedFilter {
  return { id, name, search, status, createdAt: '2026-09-01T00:00:00.000Z', updatedAt: '2026-09-01T00:00:00.000Z' };
}

function emptyPage(): ListResult {
  return { items: [], pagination: { page: 1, pageSize: 12, total: 0 } };
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

function mountPage() {
  return mount(BooksPage, { global: { stubs: { RouterLink: RouterLinkStub } } });
}

beforeEach(() => {
  vi.clearAllMocks();
  savedListMock.mockResolvedValue({ items: [] });
});

describe('BooksPage', () => {
  it('never lets a stale response overwrite newer results', async () => {
    const calls: Array<ReturnType<typeof deferred<ListResult>>> = [];
    listMock.mockImplementation(() => {
      const pending = deferred<ListResult>();
      calls.push(pending);
      return pending.promise;
    });

    const wrapper = mountPage();
    expect(calls).toHaveLength(1);

    await wrapper.find('form.toolbar input[type="search"]').setValue('旧条件');
    await wrapper.find('form.toolbar').trigger('submit');
    expect(calls).toHaveLength(2);

    await wrapper.find('form.toolbar input[type="search"]').setValue('新条件');
    await wrapper.find('form.toolbar').trigger('submit');
    expect(calls).toHaveLength(3);

    // 新条件的响应先到达并渲染
    calls[2]!.resolve({ items: [makeBook('1', '新结果')], pagination: { page: 1, pageSize: 12, total: 1 } });
    await flushPromises();
    expect(wrapper.text()).toContain('新结果');

    // 旧响应后到达，不得覆盖新结果
    calls[1]!.resolve({ items: [makeBook('2', '旧结果')], pagination: { page: 1, pageSize: 12, total: 1 } });
    calls[0]!.resolve({ items: [makeBook('3', '首次加载')], pagination: { page: 1, pageSize: 12, total: 1 } });
    await flushPromises();
    expect(wrapper.text()).toContain('新结果');
    expect(wrapper.text()).not.toContain('旧结果');
    expect(wrapper.text()).not.toContain('首次加载');
  });

  it('applies a saved filter and restarts from page 1', async () => {
    savedListMock.mockResolvedValue({ items: [makeFilter('f1', '余华在读', '余华', 'READING')] });
    listMock.mockResolvedValue(emptyPage());

    const wrapper = mountPage();
    await flushPromises();

    await wrapper.find('.saved-filter-chip .chip-apply').trigger('click');
    await flushPromises();

    const params = listMock.mock.calls.at(-1)?.[0] as URLSearchParams;
    expect(params.get('search')).toBe('余华');
    expect(params.get('status')).toBe('READING');
    expect(params.get('page')).toBe('1');
    expect((wrapper.find('form.toolbar input[type="search"]').element as HTMLInputElement).value).toBe('余华');
    expect((wrapper.find('form.toolbar select').element as HTMLSelectElement).value).toBe('READING');
  });

  it('saves the current condition as a named filter', async () => {
    listMock.mockResolvedValue(emptyPage());
    savedCreateMock.mockImplementation(async (body) => ({
      filter: makeFilter('f9', body.name, body.search, body.status)
    }));

    const wrapper = mountPage();
    await flushPromises();

    await wrapper.find('form.toolbar input[type="search"]').setValue('活着');
    await wrapper.find('form.toolbar select').setValue('READ');
    await flushPromises();

    await wrapper.find('.saved-filter-form input').setValue('读完的');
    await wrapper.find('.saved-filter-form').trigger('submit');
    await flushPromises();

    expect(savedCreateMock).toHaveBeenCalledWith({ name: '读完的', search: '活着', status: 'READ' });
    expect(wrapper.find('.saved-filter-chip .chip-apply').text()).toBe('读完的');
  });

  it('deletes a saved filter', async () => {
    savedListMock.mockResolvedValue({ items: [makeFilter('f1', '在读', '', 'READING')] });
    savedDeleteMock.mockResolvedValue(undefined);
    listMock.mockResolvedValue(emptyPage());

    const wrapper = mountPage();
    await flushPromises();
    expect(wrapper.find('.saved-filter-chip').exists()).toBe(true);

    await wrapper.find('.saved-filter-chip .chip-remove').trigger('click');
    await flushPromises();

    expect(savedDeleteMock).toHaveBeenCalledWith('f1');
    expect(wrapper.find('.saved-filter-chip').exists()).toBe(false);
  });
});
