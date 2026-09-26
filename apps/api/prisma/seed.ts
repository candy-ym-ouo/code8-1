import { config } from 'dotenv';
config({ path: ['.env', '../../.env'], quiet: true });

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const userCount = await prisma.user.count();
  console.log(`Database is ready. Existing users: ${userCount}. No demo data was inserted.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
