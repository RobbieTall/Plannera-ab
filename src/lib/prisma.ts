import type { PrismaClient } from "@prisma/client";

type PrismaClientConstructor = new (...args: unknown[]) => PrismaClient;

if (!process.env.PRISMA_CLIENT_ENGINE_TYPE) {
  process.env.PRISMA_CLIENT_ENGINE_TYPE = "wasm";
}

const loadPrismaClient = (): PrismaClientConstructor | null => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports, global-require
    const { PrismaClient: LoadedPrismaClient } = require("@prisma/client");
    return LoadedPrismaClient as PrismaClientConstructor;
  } catch (error) {
    console.warn("[prisma] Unable to load PrismaClient, using a no-op fallback.", error);
    return null;
  }
};

const createNoopClient = () =>
  new Proxy(
    {},
    {
      get: () => () => {
        throw new Error("Prisma client is not available in this environment.");
      },
    },
  ) as unknown as PrismaClient;

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

let prismaInstance: PrismaClient;

if (!globalForPrisma.prisma) {
  const PrismaClientCtor = loadPrismaClient();

  if (PrismaClientCtor) {
    try {
      prismaInstance = new PrismaClientCtor({
        log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
      });
    } catch (error) {
      console.warn("[prisma] Failed to instantiate PrismaClient, using a no-op fallback.", error);
      prismaInstance = createNoopClient();
    }
  } else {
    prismaInstance = createNoopClient();
  }

  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = prismaInstance;
  }
} else {
  prismaInstance = globalForPrisma.prisma;
}

export const prisma = prismaInstance;
