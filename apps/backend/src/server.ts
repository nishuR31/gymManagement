import Fastify from "fastify";
import { serializerCompiler, validatorCompiler } from "fastify-type-provider-zod";
import type { FastifyInstance } from "fastify";
import compress from "@fastify/compress";

import { registerRoutes } from "./routes/index.js";
import { registerErrorHandler } from "./core/plugins/error-handler.js";
import { registerSecurity } from "./core/plugins/security.js";
import { registerAuthMiddleware } from "./core/middlewares/auth.middleware.js";
import { registerAttendanceAutoCheckoutJob } from "./core/plugins/attendance-auto-checkout.js";
import { registerMembershipExpiryJob } from "./core/plugins/membership-expiry.js";
import type { Env } from "./core/config/env.js";
import { RedisMemoryServer } from "redis-memory-server";

export async function configureServer(options: any): Promise<FastifyInstance> {
  const env: Env = options.env;
  
  const app = Fastify({
    logger: {
      level: env.NODE_ENV === "test" ? "silent" : "info"
    }
  });

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  /*
    logger: {
      level: env.NODE_ENV === "test" ? "silent" : "info"
    }
  });

*/
  // Basic Fastify plugins
      await app.register(compress, { global: true });
    
  
  // Setup memory redis if dev and not specified
  if (env.NODE_ENV !== "production" && (!env.REDIS_URL || env.REDIS_URL.includes("localhost") || env.REDIS_URL.includes("127.0.0.1"))) {
    try {
      const redisServer = new RedisMemoryServer();
      const host = await redisServer.getHost();
      const port = await redisServer.getPort();
      env.REDIS_URL = `redis://${host}:${port}`;
      app.log.info(`Started in-memory Redis instance at ${env.REDIS_URL}`);

      app.addHook("onClose", async () => {
        await redisServer.stop();
      });
    } catch (e) {
      app.log.error(e, "Failed to start in-memory Redis instance");
    }
  }

  // App specific plugins
  await registerErrorHandler(app);
  
  await registerSecurity(
    app,
    { env, enableRateLimit: options.enableRateLimit, redisClient: options.redisClient }
  );

  registerAuthMiddleware(app, {
    repository: options.authRepository,
    tokenService: options.tokenService
  });

  // Routes
  await registerRoutes(app, options);

  // Background Jobs
  if (options.enableJobs ?? env.NODE_ENV !== "test") {
    registerAttendanceAutoCheckoutJob(app, options.attendanceService);
    registerMembershipExpiryJob(app, options.membershipService);
  }

  return app;
}
