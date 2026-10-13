import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const ts = createRequire(resolve(appRoot, "package.json"))("typescript");

function harness(mock = true) {
  const storage = new Map([["token", "real-token"], ["user", { id: "real-user", nickname: "真实账号", role: "STUDENT" }]]);
  const modules = new Map();
  let requests = 0;
  let wechatLogins = 0;
  const uni = {
    getStorageSync: (key) => storage.get(key),
    setStorageSync: (key, value) => storage.set(key, structuredClone(value)),
    removeStorageSync: (key) => storage.delete(key),
    showModal: () => {},
    showToast: () => {},
    login: () => { wechatLogins += 1; },
    request: (options) => { requests += 1; options.success({ statusCode: 200, data: [] }); },
  };
  const env = { VITE_MOCK_ENABLED: String(mock), VITE_DEV_AUTH_ENABLED: "false", DEV: false };
  function load(relative, parent = resolve(appRoot, "src")) {
    let filename = resolve(parent, relative);
    if (!existsSync(filename + ".ts")) filename = resolve(filename, "index");
    filename += ".ts";
    if (modules.has(filename)) return modules.get(filename).exports;
    const module = { exports: {} };
    modules.set(filename, module);
    const source = readFileSync(filename, "utf8").replaceAll("import.meta.env", "env");
    const compiled = ts.transpileModule(source, {
      compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
    }).outputText;
    const requireLocal = (name) => load(name, dirname(filename));
    new Function("require", "module", "exports", "uni", "env", compiled)(requireLocal, module, module.exports, uni, env);
    return module.exports;
  }
  const { dispatchMockRequest } = load("./mock");
  const { MOCK_STUDENT: student, MOCK_MERCHANT: merchant } = load("./mock/fixtures");
  return {
    storage, load, student, merchant,
    request: (path, method = "GET", data, user = student) => dispatchMockRequest(path, { method, data }, user),
    counters: () => ({ requests, wechatLogins }),
  };
}

test("完整场景、订单权限、响应副本与本地图片", () => {
  const h = harness();
  const shops = h.request("/shops");
  assert.equal(shops.length, 6);
  assert.ok(shops.some((shop) => !shop.isOpen));
  assert.ok(shops.flatMap((shop) => shop.products).some((product) => !product.image));
  for (const product of shops.flatMap((shop) => shop.products)) {
    if (product.image) assert.ok(existsSync(resolve(appRoot, "src", product.image.slice(1))));
  }
  shops[0].name = "修改返回对象";
  assert.equal(h.request("/shops")[0].name, "禾间小馆");
  const orders = h.request("/orders");
  assert.equal(new Set(orders.map((order) => order.status)).size, 5);
  assert.ok(orders.every((order) => !("studentId" in order)));
  const merchantOrders = h.request("/merchant/orders", "GET", undefined, h.merchant);
  assert.ok(merchantOrders.every((order) => order.shop.id === h.merchant.shopId));
  assert.ok(merchantOrders.some((order) => !orders.some((item) => item.id === order.id)));
  assert.throws(() => h.request("/merchant/shop"), (error) => error.statusCode === 403);
  assert.throws(() => h.request("/orders/mock-order-4"), (error) => error.statusCode === 404);
});

test("下单计价、库存扣减、幂等重放与取消恢复", () => {
  const h = harness();
  const before = h.request("/shops/mock-hejian").products.find((product) => product.id === "mock-rice-1").stock;
  const input = { shopId: "mock-hejian", items: [
    { productId: "mock-rice-1", quantity: 1, expectedPrice: 1850 },
    { productId: "mock-rice-1", quantity: 1, expectedPrice: 1850 },
  ], remark: " 少盐 ", idempotencyKey: "test-replay" };
  const created = h.request("/orders", "POST", input);
  assert.equal(created.total, 3700);
  assert.equal(created.items.length, 1);
  assert.equal(created.remark, "少盐");
  const replay = h.request("/orders", "POST", { ...input, items: [{ productId: "mock-rice-1", quantity: 2, expectedPrice: 1850 }] });
  assert.equal(replay.id, created.id);
  assert.equal(h.request("/shops/mock-hejian").products.find((product) => product.id === "mock-rice-1").stock, before - 2);
  assert.throws(() => h.request("/orders", "POST", { ...input, remark: "另一个订单" }), (error) => error.statusCode === 409);
  h.request("/orders/" + created.id + "/status", "PATCH", { status: "CANCELLED" });
  assert.equal(h.request("/shops/mock-hejian").products.find((product) => product.id === "mock-rice-1").stock, before);
  assert.throws(() => h.request("/orders/" + created.id + "/status", "PATCH", { status: "CANCELLED" }), (error) => error.statusCode === 409);
});

test("价格变化、缺货、休息店铺与失败请求保持库存", () => {
  const h = harness();
  const before = h.request("/shops/mock-hejian");
  const input = { shopId: before.id, items: [
    { productId: "mock-rice-1", quantity: 1, expectedPrice: 1850 },
    { productId: "mock-noodle-2", quantity: 2, expectedPrice: 1200 },
  ], remark: "", idempotencyKey: "invalid-stock" };
  assert.throws(() => h.request("/orders", "POST", input), (error) => error.statusCode === 409);
  assert.deepEqual(h.request("/shops/mock-hejian"), before);
  assert.throws(() => h.request("/orders", "POST", { ...input, items: [{ productId: "mock-rice-1", quantity: 1, expectedPrice: 1 }] }), (error) => error.statusCode === 409);
  assert.throws(() => h.request("/orders", "POST", { ...input, shopId: "mock-coffee" }), (error) => error.statusCode === 409);
  assert.throws(() => h.request("/orders", "POST", { ...input, items: [{ productId: "mock-rice-1", quantity: 100, expectedPrice: 1850 }] }), (error) => error.statusCode === 400);
  assert.deepEqual(h.request("/shops/mock-hejian"), before);
});

test("商户订单流转、营业设置、分类和商品持久化", () => {
  const h = harness();
  const patch = (id, status, user = h.merchant) => h.request("/orders/" + id + "/status", "PATCH", { status }, user);
  assert.throws(() => patch("mock-order-1", "COMPLETED"), (error) => error.statusCode === 409);
  patch("mock-order-1", "ACCEPTED");
  assert.throws(() => patch("mock-order-1", "CANCELLED", h.student), (error) => error.statusCode === 409);
  patch("mock-order-1", "READY");
  patch("mock-order-1", "COMPLETED");
  const stats = h.request("/merchant/stats", "GET", undefined, h.merchant);
  assert.equal(stats.completedOrders, 4);
  h.request("/merchant/shop", "PATCH", { name: "新的店名", notice: "午后取餐", isOpen: false }, h.merchant);
  assert.equal(h.request("/shops/mock-hejian").name, "新的店名");
  assert.equal(h.request("/orders")[0].shop.name, "新的店名");
  const category = h.request("/merchant/categories", "POST", { name: "下午茶" }, h.merchant);
  const product = h.request("/merchant/products", "POST", {
    name: "新品", price: 1250, stock: 8, categoryId: category.id, isAvailable: true,
  }, h.merchant);
  h.request("/merchant/products/" + product.id, "PATCH", { stock: 7, isAvailable: false }, h.merchant);
  assert.ok(!h.request("/shops/mock-hejian").products.some((item) => item.id === product.id));
  const saved = h.request("/merchant/shop", "GET", undefined, h.merchant).products.find((item) => item.id === product.id);
  assert.equal(saved.stock, 7);
  assert.equal(saved.isAvailable, false);
});

test("mock 会话和购物车隔离，退出后保持退出状态", () => {
  const h = harness();
  const { session } = h.load("./services/session");
  const cart = h.load("./services/cart");
  session.restore();
  assert.equal(session.user.id, h.student.id);
  assert.equal(h.storage.get("token"), "real-token");
  assert.equal(h.storage.get("user").id, "real-user");
  h.request("/shops");
  assert.equal(cart.loadCart("mock-hejian").length, 3);
  cart.saveCart("mock-hejian", []);
  assert.equal(cart.loadCart("mock-hejian").length, 0);
  h.request("/shops");
  assert.equal(cart.loadCart("mock-hejian").length, 0);
  session.clear();
  assert.equal(session.restore(), null);
  assert.equal(h.storage.get("token"), "real-token");
});

test("mock 模式不发送请求或微信登录，正式模式仍请求 API", async () => {
  const h = harness();
  const { api } = h.load("./services/api");
  api.restore();
  assert.equal((await api.shops()).length, 6);
  await api.login("MERCHANT");
  assert.equal((await api.merchantShop()).id, h.merchant.shopId);
  await api.loginWithWechat();
  assert.equal(api.user.role, "STUDENT");
  assert.deepEqual(h.counters(), { requests: 0, wechatLogins: 0 });
  const live = harness(false);
  const liveApi = live.load("./services/api").api;
  liveApi.restore();
  assert.equal(liveApi.user.id, "real-user");
  await liveApi.shops();
  assert.equal(live.counters().requests, 1);
});
