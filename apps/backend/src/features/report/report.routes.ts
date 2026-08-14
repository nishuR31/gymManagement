import type { ZodTypeProvider } from "fastify-type-provider-zod";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { paymentAnalyticsRanges, type ReportDto } from "@gym/shared";
import { z } from "zod";
import { errors } from "../../core/errors/app-error.js";
import type { ReportService } from "./report.service.js";
import type { RequestActor } from "../../core/types/auth.js";

export interface ReportRoutesOptions {
  reportService: ReportService;
}

const formatSchema = z.object({ format: z.enum(["json", "csv"]).default("json") });
const rangeQuerySchema = formatSchema.extend({ range: z.enum(paymentAnalyticsRanges).default("monthly") });
const monthQuerySchema = formatSchema.extend({ month: z.string().regex(/^\d{4}-\d{2}$/) });

export async function reportRoutes(app: FastifyInstance, options: ReportRoutesOptions): Promise<void> {
  const server = app.withTypeProvider<ZodTypeProvider>();
  app.addHook("preHandler", app.authenticate);

  server.get("/revenue", async (request, reply) => {
    const actor = requireActor(request);
    const query = rangeQuerySchema.parse(request.query);
    const report = await options.reportService.revenue(query.range, actor);
    return sendReport(reply, report, query.format, options.reportService);
  });

  server.get("/attendance", { schema: { querystring: monthQuerySchema } }, async (request, reply) => {
    const actor = requireActor(request);
    const query = monthQuerySchema.parse(request.query);
    const report = await options.reportService.attendance(query.month, actor);
    return sendReport(reply, report, query.format, options.reportService);
  });

  server.get("/memberships", async (request, reply) => sendComputed(request, reply, options, (actor) => options.reportService.memberships(actor)));
  server.get("/inventory", async (request, reply) => sendComputed(request, reply, options, (actor) => options.reportService.inventory(actor)));
  server.get("/payments", async (request, reply) => sendComputed(request, reply, options, (actor) => options.reportService.payments(actor)));
  server.get("/trainer-performance", async (request, reply) =>
    sendComputed(request, reply, options, (actor) => options.reportService.trainerPerformance(actor))
  );
  server.get("/growth-retention", async (request, reply) =>
    sendComputed(request, reply, options, (actor) => options.reportService.growthRetention(actor))
  );
}

async function sendComputed(
  request: FastifyRequest,
  reply: FastifyReply,
  options: ReportRoutesOptions,
  compute: (actor: RequestActor) => Promise<ReportDto>
) {
  const actor = requireActor(request);
  const query = formatSchema.parse(request.query);
  const report = await compute(actor);
  return sendReport(reply, report, query.format, options.reportService);
}

function sendReport(reply: FastifyReply, report: ReportDto, format: "json" | "csv", service: ReportService) {
  if (format === "csv") {
    reply.header("content-type", "text/csv; charset=utf-8");
    reply.header("content-disposition", `attachment; filename="${report.type}.csv"`);
    return service.toCsv(report);
  }
  return report;
}

function requireActor(request: FastifyRequest) {
  if (!request.actor) {
    throw errors.unauthorized();
  }
  return request.actor;
}
