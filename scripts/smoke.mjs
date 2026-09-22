import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

const base = (process.env.API_BASE_URL || "http://127.0.0.1:3000/api").replace(
  /\/+$/,
  "",
);

async function request(path, method = "GET", data, token, expectedStatus) {
  let response;
  try {
    response = await fetch(base + path, {
      method,
      headers: {
        ...(data === undefined ? {} : { "Content-Type": "application/json" }),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: data === undefined ? undefined : JSON.stringify(data),
      signal: AbortSignal.timeout(10000),
    });
  } catch (error) {
    throw new Error(`${method} ${path}: request failed (${error.message})`, {
      cause: error,
    });
  }

  const responseText = await response.text();
  let body = null;
  if (responseText) {
    try {
      body = JSON.parse(responseText);
    } catch {
      body = responseText;
    }
  }
  const bodySummary =
    typeof body === "string" ? body.slice(0, 500) : JSON.stringify(body);
  if (expectedStatus !== undefined) {
    assert.equal(
      response.status,
      expectedStatus,
      `${method} ${path}: expected ${expectedStatus}, received ${response.status} ${bodySummary}`,
    );
    return body;
  }
  assert.ok(
    response.ok,
    `${method} ${path}: ${response.status} ${bodySummary}`,
  );
  return body;
}

function combineFailures(current, next, message) {
  return current ? new AggregateError([current, next], message) : next;
}

await request("/orders", "GET", undefined, undefined, 401);
const merchant = await request("/auth/dev", "POST", { role: "MERCHANT" });
const student = await request("/auth/dev", "POST", { role: "STUDENT" });
assert.ok(merchant?.token, "Merchant login must return a token");
assert.ok(student?.token, "Student login must return a token");
await request("/merchant/shop", "GET", undefined, student.token, 403);

let shop;
let originalIsOpen;
let product;
let order;
let failure;
try {
  shop = await request("/merchant/shop", "GET", undefined, merchant.token);
  originalIsOpen = shop.isOpen;
  if (!originalIsOpen) {
    await request(
      "/merchant/shop",
      "PATCH",
      { isOpen: true },
      merchant.token,
    );
  }

  // Only add missing demo products; keep existing stock and user edits intact.
  if (!shop.products.length) {
    const category =
      shop.categories[0] ||
      (await request(
        "/merchant/categories",
        "POST",
        { name: "热销主食" },
        merchant.token,
      ));
    for (const [name, price] of [
      ["招牌鸡腿饭", 1500],
      ["番茄鸡蛋面", 1200],
      ["香菇滑鸡饭", 1600],
    ]) {
      await request(
        "/merchant/products",
        "POST",
        { categoryId: category.id, name, price, stock: 100 },
        merchant.token,
      );
    }
  }

  const shops = await request("/shops");
  const current = shops.find((candidate) => candidate.id === shop.id);
  assert.ok(current, "Demo shop must be open");
  product = current.products.find((candidate) => candidate.stock >= 1);
  assert.ok(product, "Need an available demo product");

  const body = {
    shopId: shop.id,
    items: [
      {
        productId: product.id,
        quantity: 1,
        expectedPrice: product.price,
      },
    ],
    idempotencyKey: `smoke-${Date.now()}-${randomUUID()}`,
    remark: "联调测试订单（自动取消）",
  };
  await request("/orders", "POST", body, merchant.token, 403);
  await request(
    "/orders",
    "POST",
    {
      ...body,
      items: [{ ...body.items[0], expectedPrice: product.price + 1 }],
      idempotencyKey: `${body.idempotencyKey}-price-check`,
    },
    student.token,
    409,
  );
  order = await request("/orders", "POST", body, student.token);
  assert.equal(order.total, product.price);
  const retry = await request("/orders", "POST", body, student.token);
  assert.equal(retry.id, order.id, "Retry must return same order");
  await request(
    "/orders",
    "POST",
    { ...body, remark: "幂等键冲突检查" },
    student.token,
    409,
  );
  const merchantOrders = await request(
    "/merchant/orders",
    "GET",
    undefined,
    merchant.token,
  );
  assert.ok(merchantOrders.some((o) => o.id === order.id));
  const after = await request(`/shops/${shop.id}`);
  assert.equal(
    after.products.find((p) => p.id === product.id).stock,
    product.stock - 1,
  );
} catch (error) {
  failure = error;
}

if (order) {
  try {
    await request(
      `/orders/${order.id}/status`,
      "PATCH",
      { status: "CANCELLED" },
      student.token,
    );
    await request(
      `/orders/${order.id}/status`,
      "PATCH",
      { status: "CANCELLED" },
      student.token,
      409,
    );
  } catch (cleanupError) {
    failure = combineFailures(
      failure,
      cleanupError,
      "Smoke assertions and order cleanup both failed",
    );
  }
}

if (!failure && order) {
  try {
    const restored = await request(`/shops/${shop.id}`);
    assert.equal(
      restored.products.find((candidate) => candidate.id === product.id).stock,
      product.stock,
    );
  } catch (restoreAssertionError) {
    failure = restoreAssertionError;
  }
}

if (shop && originalIsOpen === false) {
  try {
    await request(
      "/merchant/shop",
      "PATCH",
      { isOpen: false },
      merchant.token,
    );
  } catch (shopRestoreError) {
    failure = combineFailures(
      failure,
      shopRestoreError,
      "Smoke assertions and shop-state cleanup both failed",
    );
  }
}

if (failure) throw failure;
console.log(
  "PASS: auth guards, login, shop/menu, create order, idempotent replay/conflict, merchant visibility, cleanup and stock restore",
);
