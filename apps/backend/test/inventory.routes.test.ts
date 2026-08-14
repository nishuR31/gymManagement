import type { FastifyInstance } from "fastify";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { AuthUserDto, ProductDto, RoleName } from "@gym/shared";
import { buildApp } from "../src/app.js";
import type { Env } from "../src/config/env.js";
import { InventoryService } from "../src/services/inventory.service.js";
import { hashPassword } from "../src/utils/password.js";
import { InMemoryAuthRepository } from "./in-memory-auth-repository.js";
import { InMemoryInventoryAggregateCache } from "./in-memory-inventory-cache.js";
import { InMemoryInventoryRepository } from "./in-memory-inventory-repository.js";
import { InMemoryMemberRepository } from "./in-memory-member-repository.js";
import { InMemoryPaymentAnalyticsCache } from "./in-memory-payment-cache.js";

interface LoginResponse {
  user: AuthUserDto;
  accessToken: string;
  expiresIn: string;
}

interface ProductResponse {
  product: ProductDto;
}

const testEnv: Env = {
  NODE_ENV: "test",
  DATABASE_URL: "postgresql://gym:gym@localhost:5432/gym?schema=public",
  REDIS_URL: "redis://localhost:6379",
  JWT_ACCESS_SECRET: "test-secret-with-more-than-32-characters",
  JWT_ACCESS_EXPIRES_IN: "15m",
  REFRESH_TOKEN_TTL_DAYS: 30,
  PASSWORD_RESET_TOKEN_TTL_MINUTES: 30,
  CORS_ORIGIN: "http://localhost:5173",
  COOKIE_SECURE: false,
  API_PORT: 4000
};

describe("inventory routes", () => {
  let app: FastifyInstance;
  let authRepository: InMemoryAuthRepository;
  let memberRepository: InMemoryMemberRepository;
  let inventoryRepository: InMemoryInventoryRepository;
  let inventoryCache: InMemoryInventoryAggregateCache;
  let paymentCache: InMemoryPaymentAnalyticsCache;
  let adminToken: string;
  let adminUser: AuthUserDto;

  beforeEach(async () => {
    authRepository = new InMemoryAuthRepository();
    memberRepository = new InMemoryMemberRepository();
    inventoryRepository = new InMemoryInventoryRepository();
    inventoryCache = new InMemoryInventoryAggregateCache();
    paymentCache = new InMemoryPaymentAnalyticsCache();
    app = await buildApp({
      env: testEnv,
      authRepository,
      memberRepository,
      inventoryRepository,
      inventoryCache,
      paymentAnalyticsCache: paymentCache,
      enableRateLimit: false,
      enableJobs: false
    });
    adminUser = await seedUser("admin@example.com", "AdminPass123", "ADMIN");
    adminToken = await login("admin@example.com", "AdminPass123");
  });

  afterEach(async () => {
    await app.close();
  });

  it("derives stock from movements for low-stock and valuation reads", async () => {
    const product = await createProduct("Whey", 250000, 180000, 3);
    await app.inject({
      method: "POST",
      url: "/inventory/purchase",
      headers: authHeader(adminToken),
      payload: { productId: product.id, quantity: 5, unitCostCents: 180000 }
    });
    await app.inject({
      method: "POST",
      url: "/inventory/adjustment",
      headers: authHeader(adminToken),
      payload: { productId: product.id, quantity: -2, reference: "Damaged" }
    });

    const products = await app.inject({ method: "GET", url: "/inventory/products", headers: authHeader(adminToken) });
    expect(products.json<{ data: ProductDto[] }>().data[0]?.currentStock).toBe(3);

    const lowStock = await app.inject({ method: "GET", url: "/inventory/low-stock", headers: authHeader(adminToken) });
    expect(lowStock.json<{ data: ProductDto[] }>().data.map((row) => row.id)).toContain(product.id);

    const valuation = await app.inject({ method: "GET", url: "/inventory/valuation", headers: authHeader(adminToken) });
    expect(valuation.statusCode).toBe(200);
    expect(valuation.json<{ totalValueCents: number }>().totalValueCents).toBe(540000);
  });

  it("allows only one concurrent sale of the last unit", async () => {
    const product = await inventoryRepository.createProduct({
      name: "Creatine",
      category: "CREATINE",
      sku: "CRE-001",
      priceCents: 120000,
      costCents: 80000,
      reorderThreshold: 1
    });
    await inventoryRepository.recordPurchase({ productId: product.id, quantity: 1, unitCostCents: 80000, recordedBy: adminUser.id });
    const member = await memberRepository.create({
      firstName: "Ava",
      lastName: "Rao",
      phone: "9999999999",
      qrSecret: "member-qr"
    });
    const service = new InventoryService(inventoryRepository, memberRepository, authRepository, inventoryCache, paymentCache);

    const results = await Promise.allSettled(
      Array.from({ length: 10 }, () =>
        service.recordSale({ memberId: member.id, productId: product.id, quantity: 1, method: "CASH" }, adminUser, {})
      )
    );
    const fulfilled = results.filter((result) => result.status === "fulfilled");
    const rejected = results.filter((result) => result.status === "rejected");
    const finalProduct = await inventoryRepository.findProductById(product.id);

    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(9);
    expect(finalProduct?.currentStock).toBe(0);
    expect(rejected.every((result) => result.status === "rejected" && result.reason.code === "INSUFFICIENT_STOCK")).toBe(true);
  });

  async function createProduct(name: string, priceCents: number, costCents: number, reorderThreshold: number): Promise<ProductDto> {
    const response = await app.inject({
      method: "POST",
      url: "/inventory/products",
      headers: authHeader(adminToken),
      payload: {
        name,
        category: "PROTEIN",
        sku: `${name}-001`,
        priceCents,
        costCents,
        reorderThreshold
      }
    });
    expect(response.statusCode).toBe(201);
    return response.json<ProductResponse>().product;
  }

  async function seedUser(email: string, password: string, role: RoleName): Promise<AuthUserDto> {
    return authRepository.createUser({
      email,
      passwordHash: await hashPassword(password),
      firstName: role,
      lastName: "User",
      roleName: role
    });
  }

  async function login(email: string, password: string): Promise<string> {
    const response = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: { email, password }
    });
    expect(response.statusCode).toBe(200);
    return response.json<LoginResponse>().accessToken;
  }
});

function authHeader(token: string) {
  return {
    authorization: `Bearer ${token}`
  };
}
