import { z } from 'zod';
import type { FastifyRequest } from 'fastify';
import { AppError } from './errors.js';

const uuidSchema = z.string().uuid();

export function parseId(value: string, field = 'id'): string {
  const parsed = uuidSchema.safeParse(value);
  if (!parsed.success) {
    throw new AppError(404, 'NOT_FOUND', '资源不存在', { [field]: '资源不存在' });
  }
  return parsed.data;
}

export function paginationFromQuery(request: FastifyRequest): { page: number; pageSize: number; skip: number } {
  const rawPage = Number((request.query as Record<string, unknown>).page ?? 1);
  const rawPageSize = Number((request.query as Record<string, unknown>).pageSize ?? 20);
  const page = Number.isInteger(rawPage) && rawPage > 0 ? rawPage : 1;
  const pageSize = Number.isInteger(rawPageSize) && rawPageSize > 0 ? Math.min(rawPageSize, 100) : 20;
  return { page, pageSize, skip: (page - 1) * pageSize };
}

export function optionalDate(value: unknown, field: string): Date | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) {
    throw new AppError(422, 'VALIDATION_ERROR', `${field} 不是有效时间`, { [field]: '无效时间' });
  }
  return date;
}
