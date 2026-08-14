import type { FastifyInstance, FastifyRequest } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { productOrderPaymentStatuses, productOrderStatuses } from "@gym/shared";
import { z } from "zod";
import { errors } from "../../core/errors/app-error.js";
import type { ProductOrderService } from "./product-order.service.js";
import type { RequestContext } from "../../core/types/auth.js";
import { sendSuccess } from "../../core/utils/response.js";

export interface ProductOrderRoutesOptions {
  productOrderService: ProductOrderService;
}

const idParamsSchema = z.object({
  id: z.string().min(1)
});

const createOrderSchema = z.object({
  memberId: z.string().min(1).optional(),
  productId: z.string().min(1),
  quantity: z.number().int().positive(),
  notes: z.string().trim().min(1).max(500).optional()
});

const listOrdersSchema = z.object({
  memberId: z.string().min(1).optional(),
  productId: z.string().min(1).optional(),
  status: z.enum(productOrderStatuses).optional(),
  paymentStatus: z.enum(productOrderPaymentStatuses).optional(),
  search: z.string().trim().min(1).max(160).optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  sortBy: z.enum(["createdAt", "amountCents", "status"]).default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(25)
});

const updateOrderSchema = z
  .object({
    status: z.enum(productOrderStatuses).optional(),
    paymentStatus: z.enum(productOrderPaymentStatuses).optional()
  })
  .refine((value) => Object.keys(value).length > 0, "At least one field is required");

export async function productOrderRoutes(app: FastifyInstance, options: ProductOrderRoutesOptions): Promise<void> {
  const server = app.withTypeProvider<ZodTypeProvider>();
  app.addHook("preHandler", app.authenticate);

  server.post("/", { schema: { body: createOrderSchema } }, async (request, reply) => {
    const actor = requireActor(request);
    const body = createOrderSchema.parse(request.body);
    const order = await options.productOrderService.createOrder(body, actor, getRequestContext(request));
    sendSuccess(reply, "Success", 201, { order });
  });

  server.get("/", { schema: { querystring: listOrdersSchema } }, async (request) => {
    const actor = requireActor(request);
    const query = listOrdersSchema.parse(request.query);
    return options.productOrderService.listOrders(query, actor);
  });

  server.get("/:id", { schema: { params: idParamsSchema } }, async (request) => {
    const actor = requireActor(request);
    const params = idParamsSchema.parse(request.params);
    return { order: await options.productOrderService.getOrder(params.id, actor) };
  });

  server.patch("/:id", { schema: { params: idParamsSchema, body: updateOrderSchema } }, async (request) => {
    const actor = requireActor(request);
    const params = idParamsSchema.parse(request.params);
    const body = updateOrderSchema.parse(request.body);
    return { order: await options.productOrderService.updateOrder(params.id, body, actor, getRequestContext(request)) };
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
