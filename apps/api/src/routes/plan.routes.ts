import type { FastifyInstance, FastifyRequest } from "fastify";
import { z } from "zod";
import { errors } from "../errors/app-error.js";
import type { StaffService } from "../services/staff.service.js";
import type { RequestContext } from "../types/auth.js";

export interface PlanRoutesOptions {
  staffService: StaffService;
}

const exerciseSchema = z.object({
  name: z.string().trim().min(1).max(160),
  sets: z.number().int().positive().max(100),
  reps: z.number().int().positive().max(1000),
  notes: z.string().trim().min(1).max(1000).optional()
});

const mealSchema = z.object({
  name: z.string().trim().min(1).max(160),
  calories: z.number().int().nonnegative().max(10000),
  proteinGrams: z.number().nonnegative().max(1000),
  carbsGrams: z.number().nonnegative().max(1000),
  fatGrams: z.number().nonnegative().max(1000),
  notes: z.string().trim().min(1).max(1000).optional()
});

const workoutTemplateSchema = z.object({
  name: z.string().trim().min(1).max(160),
  exercises: z.array(exerciseSchema).min(1)
});

const workoutTemplateUpdateSchema = workoutTemplateSchema
  .partial()
  .extend({ isActive: z.boolean().optional() })
  .refine((value) => Object.keys(value).length > 0, "At least one field is required");

const dietTemplateSchema = z.object({
  name: z.string().trim().min(1).max(160),
  meals: z.array(mealSchema).min(1)
});

const dietTemplateUpdateSchema = dietTemplateSchema
  .partial()
  .extend({ isActive: z.boolean().optional() })
  .refine((value) => Object.keys(value).length > 0, "At least one field is required");

const assignmentSchema = z.object({
  memberId: z.string().min(1),
  templateId: z.string().min(1),
  trainerId: z.string().min(1).optional(),
  startDate: z.coerce.date()
});

const memberParamsSchema = z.object({
  memberId: z.string().min(1)
});

const templateParamsSchema = z.object({
  id: z.string().min(1)
});

export async function planRoutes(app: FastifyInstance, options: PlanRoutesOptions): Promise<void> {
  app.addHook("preHandler", app.authenticate);

  app.get("/workout-templates", async (request) => options.staffService.listWorkoutTemplates(requireActor(request)));
  app.post("/workout-templates", async (request, reply) => {
    const actor = requireActor(request);
    const body = workoutTemplateSchema.parse(request.body);
    const template = await options.staffService.createWorkoutTemplate(body, actor, getRequestContext(request));
    reply.status(201).send({ template });
  });
  app.patch("/workout-templates/:id", async (request) => {
    const actor = requireActor(request);
    const params = templateParamsSchema.parse(request.params);
    const body = workoutTemplateUpdateSchema.parse(request.body);
    return { template: await options.staffService.updateWorkoutTemplate(params.id, body, actor, getRequestContext(request)) };
  });
  app.delete("/workout-templates/:id", async (request) => {
    const actor = requireActor(request);
    const params = templateParamsSchema.parse(request.params);
    return { template: await options.staffService.updateWorkoutTemplate(params.id, { isActive: false }, actor, getRequestContext(request)) };
  });
  app.post("/workout-assignments", async (request, reply) => {
    const actor = requireActor(request);
    const body = assignmentSchema.parse(request.body);
    const plan = await options.staffService.assignWorkoutPlan(body, actor, getRequestContext(request));
    reply.status(201).send({ plan });
  });
  app.get("/members/:memberId/workouts", async (request) => {
    const actor = requireActor(request);
    const params = memberParamsSchema.parse(request.params);
    return options.staffService.listWorkoutPlans(params.memberId, actor);
  });

  app.get("/diet-templates", async (request) => options.staffService.listDietTemplates(requireActor(request)));
  app.post("/diet-templates", async (request, reply) => {
    const actor = requireActor(request);
    const body = dietTemplateSchema.parse(request.body);
    const template = await options.staffService.createDietTemplate(body, actor, getRequestContext(request));
    reply.status(201).send({ template });
  });
  app.patch("/diet-templates/:id", async (request) => {
    const actor = requireActor(request);
    const params = templateParamsSchema.parse(request.params);
    const body = dietTemplateUpdateSchema.parse(request.body);
    return { template: await options.staffService.updateDietTemplate(params.id, body, actor, getRequestContext(request)) };
  });
  app.delete("/diet-templates/:id", async (request) => {
    const actor = requireActor(request);
    const params = templateParamsSchema.parse(request.params);
    return { template: await options.staffService.updateDietTemplate(params.id, { isActive: false }, actor, getRequestContext(request)) };
  });
  app.post("/diet-assignments", async (request, reply) => {
    const actor = requireActor(request);
    const body = assignmentSchema.parse(request.body);
    const plan = await options.staffService.assignDietPlan(body, actor, getRequestContext(request));
    reply.status(201).send({ plan });
  });
  app.get("/members/:memberId/diets", async (request) => {
    const actor = requireActor(request);
    const params = memberParamsSchema.parse(request.params);
    return options.staffService.listDietPlans(params.memberId, actor);
  });
}

function requireActor(request: FastifyRequest) {
  if (!request.actor) {
    throw errors.unauthorized();
  }
  return request.actor;
}

function getRequestContext(request: FastifyRequest): RequestContext {
  return {
    ...(request.ip ? { ipAddress: request.ip } : {}),
    ...(request.headers["user-agent"] ? { userAgent: request.headers["user-agent"] } : {})
  };
}
