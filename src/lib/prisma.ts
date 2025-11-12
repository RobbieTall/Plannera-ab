import { PrismaClient } from "@prisma/client";

if (!process.env.PRISMA_CLIENT_ENGINE_TYPE) {
  process.env.PRISMA_CLIENT_ENGINE_TYPE = "wasm";
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const createClient = () =>
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });

const createNoopClient = () =>
  new Proxy(
    {},
    {
      get: () => () => {
        throw new Error("Prisma client is not available in this environment.");
      },
    },
  ) as unknown as PrismaClient;

let prismaInstance: PrismaClient;

if (!globalForPrisma.prisma) {
  try {
    prismaInstance = createClient();
  } catch (error) {
    console.warn("[prisma] Falling back to a no-op Prisma client:", error);
    prismaInstance = createNoopClient();
  }

  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = prismaInstance;
  }
} else {
  prismaInstance = globalForPrisma.prisma;
}

export const prisma = prismaInstance;
