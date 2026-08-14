import cron, { type ScheduledTask } from "node-cron";
import type { FastifyInstance } from "fastify";
import type { MembershipService } from "../../features/membership/membership.service.js";

export function registerMembershipExpiryJob(app: FastifyInstance, membershipService: MembershipService): ScheduledTask {
  const task = cron.schedule("5 0 * * *", () => {
    void membershipService.expireSubscriptionsPastGrace().catch((error: unknown) => {
      app.log.error({ error }, "membership expiry failed");
    });
  });

  app.addHook("onClose", () => {
    task.stop();
  });

  return task;
}
