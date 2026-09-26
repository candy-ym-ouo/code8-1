import type { FastifyReply } from 'fastify';
import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';

export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
    public readonly fields?: Record<string, string>
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export function sendError(
  reply: FastifyReply,
  statusCode: number,
  code: string,
  message: string,
  fields?: Record<string, string>,
  requestId = reply.request.id
): FastifyReply {
  return reply.status(statusCode).send({
    error: {
      code,
      message,
      ...(fields ? { fields } : {}),
      requestId
    }
  });
}

export function zodFields(error: ZodError): Record<string, string> {
  const fields: Record<string, string> = {};
  for (const issue of error.issues) {
    const path = issue.path.join('.') || '_form';
    if (!fields[path]) fields[path] = issue.message;
  }
  return fields;
}

export function mapPrismaError(error: unknown, reply: FastifyReply): boolean {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') {
      return Boolean(sendError(reply, 409, 'DUPLICATE_RESOURCE', '该记录已存在'));
    }
    if (error.code === 'P2025') {
      return Boolean(sendError(reply, 404, 'NOT_FOUND', '资源不存在'));
    }
  }
  return false;
}
