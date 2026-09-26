import { Prisma, type ActivityAction, type ActivityEntityType } from '@prisma/client';

type Tx = Prisma.TransactionClient;

export async function writeEvent(
  tx: Tx,
  input: {
    userId: string;
    bookId?: string | null;
    entityType: ActivityEntityType;
    entityId?: string | null;
    action: ActivityAction;
    payload?: Prisma.InputJsonValue;
  }
): Promise<void> {
  await tx.activityEvent.create({
    data: {
      userId: input.userId,
      bookId: input.bookId ?? null,
      entityType: input.entityType,
      entityId: input.entityId ?? null,
      action: input.action,
      payloadJson: input.payload ?? {}
    }
  });
}
