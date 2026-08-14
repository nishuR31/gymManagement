import type { FastifyInstance, FastifyRequest } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { paymentMethods, productCategories, stockMovementTypes } from "@gym/shared";
import { z } from "zod";
import { errors } from "../../core/errors/app-error.js";
import type { InventoryService } from "./inventory.service.js";
import type { RequestContext } from "../../core/types/auth.js";
import { sendSuccess } from "../../core/utils/response.js";

export interface InventoryRoutesOptions {
  inventoryService: InventoryService;
}

const idParamsSchema = z.object({
  id: z.string().min(1)
});

const createProductSchema = z.object({
  name: z.string().trim().min(1).max(160),
  description: z.string().trim().max(1000).optional(),
  imageUrl: z.string().url().optional(),
  category: z.enum(productCategories),
  sku: z.string().trim().min(1).max(80),
  priceCents: z.number().int().nonnegative(),
  costCents: z.number().int().nonnegative(),
  reorderThreshold: z.number().int().nonnegative().default(0)
});

const updateProductSchema = createProductSchema
  .partial()
  .extend({
    isActive: z.boolean().optional()
  })
  .refine((value) => Object.keys(value).length > 0, "At least one field is required");

const createSupplierSchema = z.object({
  name: z.string().trim().min(1).max(160),
  contactName: z.string().trim().min(1).max(160).optional(),
  phone: z.string().trim().min(1).max(40).optional(),
  email: z.string().email().optional()
});

const updateSupplierSchema = createSupplierSchema
  .partial()
  .extend({
    contactName: z.string().trim().min(1).max(160).nullable().optional(),
    phone: z.string().trim().min(1).max(40).nullable().optional(),
    email: z.string().email().nullable().optional(),
    isActive: z.boolean().optional()
  })
  .refine((value) => Object.keys(value).length > 0, "At least one field is required");

const listQuerySchema = z.object({
  includeInactive: z.coerce.boolean().default(false)
});

const movementSchema = z.object({
  productId: z.string().min(1),
  supplierId: z.string().min(1).optional(),
  quantity: z.number().int(),
  unitCostCents: z.number().int().nonnegative().optional(),
  reference: z.string().trim().min(1).max(160).optional()
});

const purchaseSchema = movementSchema.extend({
  quantity: z.number().int().positive()
});

const saleSchema = z.object({
  memberId: z.string().min(1),
  productId: z.string().min(1),
  quantity: z.number().int().positive(),
  method: z.enum(paymentMethods),
  reference: z.string().trim().min(1).max(160).optional(),
  soldAt: z.coerce.date().optional()
});

const movementsQuerySchema = z.object({
  productId: z.string().min(1).optional(),
  supplierId: z.string().min(1).optional(),
  type: z.enum(stockMovementTypes).optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(50)
});

export async function inventoryRoutes(app: FastifyInstance, options: InventoryRoutesOptions): Promise<void> {
  const server = app.withTypeProvider<ZodTypeProvider>();
  app.addHook("preHandler", app.authenticate);

  server.get("/products", { schema: { querystring: listQuerySchema } }, async (request) => {
    const actor = requireActor(request);
    const query = listQuerySchema.parse(request.query);
    return options.inventoryService.listProducts(actor, query.includeInactive);
  });

  server.post("/products", { schema: { body: createProductSchema } }, async (request, reply) => {
    const actor = requireActor(request);
    const body = createProductSchema.parse(request.body);
    const product = await options.inventoryService.createProduct(body, actor, getRequestContext(request));
    sendSuccess(reply, "Success", 201, { product });
  });

  server.patch("/products/:id", { schema: { params: idParamsSchema, body: updateProductSchema } }, async (request) => {
    const actor = requireActor(request);
    const params = idParamsSchema.parse(request.params);
    const body = updateProductSchema.parse(request.body);
    return { product: await options.inventoryService.updateProduct(params.id, body, actor, getRequestContext(request)) };
  });

  server.delete("/products/:id", { schema: { params: idParamsSchema } }, async (request) => {
    const actor = requireActor(request);
    const params = idParamsSchema.parse(request.params);
    return { product: await options.inventoryService.archiveProduct(params.id, actor, getRequestContext(request)) };
  });

  server.get("/suppliers", { schema: { querystring: listQuerySchema } }, async (request) => {
    const actor = requireActor(request);
    const query = listQuerySchema.parse(request.query);
    return options.inventoryService.listSuppliers(actor, query.includeInactive);
  });

  server.post("/suppliers", { schema: { body: createSupplierSchema } }, async (request, reply) => {
    const actor = requireActor(request);
    const body = createSupplierSchema.parse(request.body);
    const supplier = await options.inventoryService.createSupplier(body, actor, getRequestContext(request));
    sendSuccess(reply, "Success", 201, { supplier });
  });

  server.patch("/suppliers/:id", { schema: { params: idParamsSchema, body: updateSupplierSchema } }, async (request) => {
    const actor = requireActor(request);
    const params = idParamsSchema.parse(request.params);
    const body = updateSupplierSchema.parse(request.body);
    return { supplier: await options.inventoryService.updateSupplier(params.id, body, actor, getRequestContext(request)) };
  });

  server.post("/purchase", async (request, reply) => {
    const actor = requireActor(request);
    const body = purchaseSchema.parse(request.body);
    const movement = await options.inventoryService.recordPurchase(body, actor, getRequestContext(request));
    sendSuccess(reply, "Success", 201, { movement });
  });

  server.post("/adjustment", async (request, reply) => {
    const actor = requireActor(request);
    const body = movementSchema.parse(request.body);
    const movement = await options.inventoryService.recordAdjustment(body, actor, getRequestContext(request));
    sendSuccess(reply, "Success", 201, { movement });
  });

  server.post("/sale", async (request, reply) => {
    const actor = requireActor(request);
    const body = saleSchema.parse(request.body);
    const result = await options.inventoryService.recordSale(body, actor, getRequestContext(request));
    sendSuccess(reply, "Success", 201, result);
  });

  server.get("/low-stock", async (request) => {
    const actor = requireActor(request);
    return options.inventoryService.listLowStock(actor);
  });

  server.get("/valuation", async (request) => {
    const actor = requireActor(request);
    return options.inventoryService.valuation(actor);
  });

  server.get("/movements", { schema: { querystring: movementsQuerySchema } }, async (request) => {
    const actor = requireActor(request);
    const query = movementsQuerySchema.parse(request.query);
    return options.inventoryService.listMovements(actor, query);
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
