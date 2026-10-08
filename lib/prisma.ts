import { PrismaClient } from "@prisma/client";

// بنخزن الـ instance على الـ global عشان في الـ dev mode (hot reload) ميتفتحش
// اتصال جديد بالداتابيز مع كل تعديل في الكود
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
