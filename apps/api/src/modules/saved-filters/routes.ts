import type { FastifyPluginAsync } from 'fastify';
import { prisma } from '../../lib/prisma.js';
import { AppError, zodFields } from '../../lib/errors.js';
import { currentUser, requireAuth } from '../../lib/auth.js';
import { parseId } from '../../lib/http.js';
import { savedFilterInputSchema, serializeSavedFilter } from './schema.js';

export const savedFilterRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', requireAuth);

  app.get('/saved-filters', async (request) => {
    const userId = currentUser(request).id;
    const filters = await prisma.savedFilter.findMany({
      where: { userId },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }]
    });
    return { items: filters.map(serializeSavedFilter) };
  });

  app.post('/saved-filters', async (request, reply) => {
    const parsed = savedFilterInputSchema.safeParse(request.body);
    if (!parsed.success) {
      throw new AppError(422, 'VALIDATION_ERROR', '筛选信息无效', zodFields(parsed.error));
    }
    const userId = currentUser(request).id;
    const existing = await prisma.savedFilter.findUnique({
      where: { userId_name: { userId, name: parsed.data.name } }
    });
    if (existing) {
      throw new AppError(409, 'DUPLICATE_RESOURCE', '同名筛选已存在', { name: '同名筛选已存在' });
    }
    const filter = await prisma.savedFilter.create({
      data: {
        userId,
        name: parsed.data.name,
        search: parsed.data.search,
        status: parsed.data.status === 'ALL' ? null : parsed.data.status
      }
    });
    return reply.status(201).send({ filter: serializeSavedFilter(filter) });
  });

  app.delete('/saved-filters/:filterId', async (request, reply) => {
    const filterId = parseId((request.params as { filterId: string }).filterId, 'filterId');
    const userId = currentUser(request).id;
    const result = await prisma.savedFilter.deleteMany({ where: { id: filterId, userId } });
    if (result.count !== 1) {
      throw new AppError(404, 'NOT_FOUND', '筛选不存在');
    }
    return reply.status(204).send();
  });
};
