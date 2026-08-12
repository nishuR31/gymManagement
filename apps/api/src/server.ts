import { buildApp } from "./app.js";
import { loadEnv } from "./config/env.js";
import { prisma } from "./plugins/prisma.js";

const env = loadEnv();
const app = await buildApp({ env });

try {
  await app.listen({
    host: "0.0.0.0",
    port: env.API_PORT
  });
} catch (error: unknown) {
  app.log.error(error);
  await prisma.$disconnect();
  process.exit(1);
}

const shutdown = async (): Promise<void> => {
  await app.close();
  await prisma.$disconnect();
};

process.on("SIGINT", () => {
  void shutdown();
});

process.on("SIGTERM", () => {
  void shutdown();
});
