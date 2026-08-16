#!/usr/bin/env node

const BASE = (process.env.API_BASE_URL || "https://gymmanagement-kejr.onrender.com").replace(/\/+$/, "");
const DOCS = `${BASE}/docs/json`;
const TIMEOUT = Number(process.env.TEST_TIMEOUT_MS || 30000);
const PREFIX = process.env.TEST_PREFIX || "TEST_API_";
const KEEP = process.env.KEEP_TEST_DATA === "1";



export const API_ACCOUNTS = [
  {
    "role": "SUPER_ADMIN",
    "email": "nishanrajak01@gmail.com",
    "password": "nishanr31@"
  }];

process.env.API_ACCOUNTS = JSON.stringify(API_ACCOUNTS);
const accounts = JSON.parse(process.env.API_ACCOUNTS);

class CookieJar {
  constructor() {
    this.cookies = new Map();
  }

  absorb(headers) {
    const cookies =
      typeof headers.getSetCookie === "function"
        ? headers.getSetCookie()
        : headers.get("set-cookie")
          ? [headers.get("set-cookie")]
          : [];

    for (const cookie of cookies) {
      const first = cookie.split(";")[0];
      const i = first.indexOf("=");
      if (i > 0) {
        this.cookies.set(
          first.slice(0, i).trim(),
          first.slice(i + 1).trim()
        );
      }
    }
  }

  header() {
    return [...this.cookies]
      .map(([key, value]) => `${key}=${value}`)
      .join("; ");
  }
}

async function request(jar, method, path, body) {
  const started = performance.now();

  const headers = {
    accept: "application/json"
  };

  const cookie = jar.header();
  if (cookie) headers.cookie = cookie;

  if (body !== undefined) {
    headers["content-type"] = "application/json";
  }

  try {
    const response = await fetch(new URL(path, BASE), {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(TIMEOUT)
    });

    jar.absorb(response.headers);

    const text = await response.text();

    let data;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = text;
    }

    return {
      method,
      path,
      status: response.status,
      ms: Math.round(performance.now() - started),
      data
    };
  } catch (error) {
    return {
      method,
      path,
      status: 0,
      ms: Math.round(performance.now() - started),
      error: error.message
    };
  }
}

function resolveSchema(doc, schema) {
  if (!schema) return {};
  if (schema.$ref) {
    const name = schema.$ref.split("/").pop();
    return doc.components?.schemas?.[name] || {};
  }
  return schema;
}

function exampleFromSchema(doc, schema, field = "") {
  schema = resolveSchema(doc, schema);

  if (schema.example !== undefined) return schema.example;
  if (schema.default !== undefined) return schema.default;
  if (schema.enum?.length) return schema.enum[0];

  if (schema.oneOf?.length) {
    return exampleFromSchema(doc, schema.oneOf[0], field);
  }

  if (schema.allOf?.length) {
    return Object.assign(
      {},
      ...schema.allOf.map(x => exampleFromSchema(doc, x, field))
    );
  }

  if (schema.type === "object" || schema.properties) {
    const result = {};

    for (const [key, value] of Object.entries(schema.properties || {})) {
      if (
        /^(id|_id|uuid|createdAt|updatedAt|deletedAt)$/i.test(key)
      ) {
        continue;
      }

      const resolved = resolveSchema(doc, value);

      if (resolved.readOnly) continue;

      const example = exampleFromSchema(doc, resolved, key);

      if (example !== undefined) {
        result[key] = example;
      }
    }

    return result;
  }

  if (schema.type === "array") return [];

  if (schema.type === "integer" || schema.type === "number") {
    return 1;
  }

  if (schema.type === "boolean") {
    return true;
  }

  if (/email/i.test(field)) {
    return `${PREFIX.toLowerCase()}${Date.now()}@example.com`;
  }

  if (/phone|mobile/i.test(field)) {
    return "9000000000";
  }

  if (/name/i.test(field)) {
    return `${PREFIX}${field}`;
  }

  if (/description|bio|note/i.test(field)) {
    return `${PREFIX}${field}`;
  }

  if (/password/i.test(field)) {
    return "TestPassword123!";
  }

  return `${PREFIX}${field || "value"}`;
}

function bodySchema(operation) {
  const content = operation?.requestBody?.content || {};
  return (
    content["application/json"]?.schema ||
    content["application/*+json"]?.schema
  );
}

function findLogin(doc) {
  const candidates = [];

  for (const [path, item] of Object.entries(doc.paths || {})) {
    for (const method of ["post", "put", "patch"]) {
      const operation = item[method];
      if (!operation) continue;

      const text = `
        ${path}
        ${operation.operationId || ""}
        ${operation.summary || ""}
        ${(operation.tags || []).join(" ")}
      `.toLowerCase();

      let score = 0;

      if (text.includes("login")) score += 100;
      if (text.includes("signin")) score += 90;
      if (text.includes("sign-in")) score += 90;
      if (text.includes("auth")) score += 30;

      if (score) {
        candidates.push({
          path,
          method: method.toUpperCase(),
          operation,
          score
        });
      }
    }
  }

  candidates.sort((a, b) => b.score - a.score);

  return candidates[0];
}

function findLogout(doc) {
  for (const [path, item] of Object.entries(doc.paths || {})) {
    for (const method of ["post", "get", "delete"]) {
      const operation = item[method];
      if (!operation) continue;

      const text =
        `${path} ${operation.operationId || ""} ${operation.summary || ""}`
          .toLowerCase();

      if (
        text.includes("logout") ||
        text.includes("signout") ||
        text.includes("sign-out")
      ) {
        return {
          path,
          method: method.toUpperCase(),
          operation
        };
      }
    }
  }

  return null;
}

function extractId(data) {
  if (!data || typeof data !== "object") return null;

  const candidates = [
    data.id,
    data._id,
    data.uuid,
    data.data?.id,
    data.data?._id,
    data.data?.uuid,
    data.data?.data?.id
  ];

  for (const value of candidates) {
    if (value !== undefined && value !== null) {
      return String(value);
    }
  }

  return null;
}

function replaceId(path, id) {
  return path.replace(
    /\{[^}]+\}/g,
    encodeURIComponent(id)
  );
}

function print(result) {
  const status = String(result.status).padStart(3);
  const time = `${result.ms}ms`.padStart(7);

  console.log(
    `${result.method.padEnd(6)} ${status} ${time} ${result.path}`
  );
}

const results = [];

console.log(`\nAPI: ${BASE}`);
console.log(`OpenAPI: ${DOCS}`);
console.log(`Test prefix: ${PREFIX}\n`);

const docsStart = performance.now();

const docsResponse = await fetch(DOCS, {
  signal: AbortSignal.timeout(TIMEOUT)
});

const docsMs = Math.round(performance.now() - docsStart);

if (!docsResponse.ok) {
  throw new Error(
    `Could not fetch /docs/json: HTTP ${docsResponse.status}`
  );
}

const doc = await docsResponse.json();

console.log(
  `OpenAPI loaded in ${docsMs}ms`
);

const paths = Object.entries(doc.paths || {});

console.log(
  `Discovered ${paths.length} documented paths`
);

const login = findLogin(doc);
const logout = findLogout(doc);

if (!login) {
  throw new Error(
    "Could not automatically identify login endpoint."
  );
}

console.log(
  `Login: ${login.method} ${login.path}`
);

if (logout) {
  console.log(
    `Logout: ${logout.method} ${logout.path}`
  );
}

for (const account of accounts) {
  console.log(
    `\n========== ${account.role || "account"} / ${account.email} ==========`
  );

  const jar = new CookieJar();

  let loginBody =
    exampleFromSchema(
      doc,
      bodySchema(login.operation)
    ) || {};

  const keys = Object.keys(loginBody);

  const emailKey =
    keys.find(key => /email|username/i.test(key)) ||
    "email";

  const passwordKey =
    keys.find(key => /password|pass/i.test(key)) ||
    "password";

  loginBody[emailKey] = account.email;
  loginBody[passwordKey] = account.password;

  console.log("\nLOGIN");

  const loginResult = await request(
    jar,
    login.method,
    login.path,
    loginBody
  );

  results.push({
    role: account.role,
    type: "LOGIN",
    ...loginResult
  });

  print(loginResult);

  if (loginResult.status < 200 || loginResult.status >= 300) {
    console.log(
      "Login response:",
      JSON.stringify(loginResult.data).slice(0, 1000)
    );
    continue;
  }

  console.log("\nGET SWEEP");

  /*
   * First request to each authenticated route.
   * This gives us route-by-route latency.
   */
  for (const [path, item] of paths) {
    if (!item.get) continue;

    if (
      path.includes("/docs") ||
      path.includes("/swagger") ||
      path.includes("/health")
    ) {
      continue;
    }

    // Don't guess path parameters.
    if (/\{[^}]+\}/.test(path)) continue;

    const result = await request(
      jar,
      "GET",
      path
    );

    results.push({
      role: account.role,
      type: "GET",
      ...result
    });

    print(result);
  }

  console.log("\nCRUD TESTS");

  /*
   * Find collection POST endpoints.
   *
   * We intentionally only test endpoints where:
   * - POST exists
   * - request body has a JSON schema
   * - endpoint is not auth/upload/import/export/docs
   */
  for (const [collectionPath, item] of paths) {
    const post = item.post;

    if (!post) continue;

    if (
      collectionPath.includes("/auth") ||
      collectionPath.includes("/login") ||
      collectionPath.includes("/logout") ||
      collectionPath.includes("/upload") ||
      collectionPath.includes("/import") ||
      collectionPath.includes("/export") ||
      collectionPath.includes("/docs") ||
      collectionPath.includes("/swagger")
    ) {
      continue;
    }

    if (/\{[^}]+\}/.test(collectionPath)) continue;

    const schema = bodySchema(post);

    if (!schema) continue;

    let payload =
      exampleFromSchema(doc, schema) || {};

    if (
      !payload ||
      typeof payload !== "object" ||
      Array.isArray(payload)
    ) {
      continue;
    }

    /*
     * Force obvious identifying fields to TEST values.
     */
    for (const [key, value] of Object.entries(payload)) {
      if (typeof value !== "string") continue;

      if (/email/i.test(key)) {
        payload[key] =
          `${PREFIX.toLowerCase()}${Date.now()}@example.com`;
      } else if (/name/i.test(key)) {
        payload[key] =
          `${PREFIX}${key}_${Date.now()}`;
      } else if (/description|note|bio/i.test(key)) {
        payload[key] =
          `${PREFIX}${key}_${Date.now()}`;
      }
    }

    console.log(
      `\nPOST TEST ${collectionPath}`
    );

    const create = await request(
      jar,
      "POST",
      collectionPath,
      payload
    );

    results.push({
      role: account.role,
      type: "POST",
      ...create
    });

    print(create);

    if (
      create.status < 200 ||
      create.status >= 300
    ) {
      console.log(
        "Response:",
        JSON.stringify(create.data).slice(0, 500)
      );
      continue;
    }

    const id = extractId(create.data);

    if (!id) {
      console.log(
        "Created successfully, but no ID could be extracted."
      );
      continue;
    }

    /*
     * Find the corresponding /resource/{id} route.
     */
    const parameterized = paths.find(
      ([path]) => {
        const normalized = path.replace(
          /\{[^}]+\}/g,
          ":id"
        );

        return (
          normalized ===
          `${collectionPath.replace(/\/+$/, "")}/:id`
        );
      }
    );

    if (!parameterized) {
      console.log(
        `Created ID ${id}, but no /{id} route was documented.`
      );
      continue;
    }

    const [itemPath, detailItem] =
      parameterized;

    const detailPath =
      replaceId(itemPath, id);

    /*
     * GET created record
     */
    if (detailItem.get) {
      const getCreated =
        await request(
          jar,
          "GET",
          detailPath
        );

      results.push({
        role: account.role,
        type: "GET_CREATED",
        ...getCreated
      });

      print(getCreated);
    }

    /*
     * PATCH created record
     */
    const patchOperation =
      detailItem.patch ||
      detailItem.put;

    if (patchOperation) {
      const patchSchema =
        bodySchema(patchOperation);

      if (patchSchema) {
        let patchBody =
          exampleFromSchema(
            doc,
            patchSchema
          ) || {};

        if (
          patchBody &&
          typeof patchBody === "object" &&
          !Array.isArray(patchBody)
        ) {
          for (const [key, value] of Object.entries(
            patchBody
          )) {
            if (typeof value !== "string")
              continue;

            if (/email/i.test(key)) {
              patchBody[key] =
                `${PREFIX.toLowerCase()}patched_${Date.now()}@example.com`;
            } else if (/name/i.test(key)) {
              patchBody[key] =
                `${PREFIX}PATCHED_${Date.now()}`;
            } else if (
              /description|note|bio/i.test(key)
            ) {
              patchBody[key] =
                `${PREFIX}PATCHED_${Date.now()}`;
            }
          }

          const method =
            detailItem.patch
              ? "PATCH"
              : "PUT";

          const update =
            await request(
              jar,
              method,
              detailPath,
              patchBody
            );

          results.push({
            role: account.role,
            type: "PATCH",
            ...update
          });

          print(update);
        }
      }
    }

    /*
     * DELETE test record.
     *
     * KEEP_TEST_DATA=1 prevents deletion.
     */
    if (detailItem.delete && !KEEP) {
      const remove =
        await request(
          jar,
          "DELETE",
          detailPath
        );

      results.push({
        role: account.role,
        type: "DELETE",
        ...remove
      });

      print(remove);
    }
  }

  if (logout) {
    console.log("\nLOGOUT");

    const result =
      await request(
        jar,
        logout.method,
        logout.path
      );

    results.push({
      role: account.role,
      type: "LOGOUT",
      ...result
    });

    print(result);
  }
}

const latency =
  results
    .filter(x => x.status > 0)
    .map(x => x.ms);

function percentile(values, p) {
  if (!values.length) return 0;

  const sorted =
    [...values].sort(
      (a, b) => a - b
    );

  const index =
    Math.min(
      sorted.length - 1,
      Math.ceil(
        sorted.length * p / 100
      ) - 1
    );

  return sorted[index];
}

const summary = {
  requests: results.length,
  successful: results.filter(
    x => x.status >= 200 && x.status < 300
  ).length,
  redirects: results.filter(
    x => x.status >= 300 && x.status < 400
  ).length,
  clientErrors: results.filter(
    x => x.status >= 400 && x.status < 500
  ).length,
  serverErrors: results.filter(
    x => x.status >= 500
  ).length,
  networkErrors: results.filter(
    x => x.status === 0
  ).length,

  latency: {
    min: latency.length
      ? Math.min(...latency)
      : 0,

    p50: percentile(latency, 50),
    p95: percentile(latency, 95),
    p99: percentile(latency, 99),

    max: latency.length
      ? Math.max(...latency)
      : 0
  }
};

const slowest =
  [...results]
    .sort((a, b) => b.ms - a.ms)
    .slice(0, 25)
    .map(x => ({
      role: x.role,
      type: x.type,
      method: x.method,
      path: x.path,
      status: x.status,
      ms: x.ms
    }));

const report = {
  generatedAt: new Date().toISOString(),
  base: BASE,
  docs: DOCS,
  testPrefix: PREFIX,
  keepTestData: KEEP,
  login: {
    method: login.method,
    path: login.path
  },
  summary,
  slowest,
  results
};

await import("node:fs/promises").then(fs =>
  fs.writeFile(
    "gym-api-performance.json",
    JSON.stringify(report, null, 2)
  )
);

console.log("\n========================================");
console.log(" PERFORMANCE SUMMARY");
console.log("========================================");

console.log(
  JSON.stringify(
    summary,
    null,
    2
  )
);

console.log("\nSLOWEST REQUESTS");

for (const item of slowest.slice(0, 15)) {
  console.log(
    `${String(item.ms).padStart(6)}ms ` +
    `${String(item.status).padStart(3)} ` +
    `${item.type.padEnd(12)} ` +
    `${item.method} ${item.path}`
  );
}

console.log(
  "\nReport written to:",
  `${process.cwd()}/gym-api-performance.json`
);
