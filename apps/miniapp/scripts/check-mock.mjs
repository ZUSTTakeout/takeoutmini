import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { relative, resolve } from "node:path";
import test from "node:test";
import { appRoot, harness } from "./test-harness.mjs";

// 单元测试仍可独立运行；上线检查必须额外验证实际生成的正式包。
if (process.argv.includes("--production")) {
  test("正式构建不包含 Mock 模块、演示图片、商品或账号", () => {
    const output = resolve(appRoot, "dist/build/mp-weixin");
    assert.ok(existsSync(resolve(output, "app.json")), "请先关闭 Mock 并执行 build:mp-weixin");
    const files = [];
    function collect(directory) {
      for (const entry of readdirSync(directory, { withFileTypes: true })) {
        const path = resolve(directory, entry.name);
        if (entry.isDirectory()) collect(path);
        else files.push({ path, name: relative(output, path).replaceAll("\\", "/"), bytes: statSync(path).size });
      }
    }
    collect(output);
    const h = harness();
    const shops = h.request("/shops");
    const forbidden = new Set([
      "mock:v1:", "mock-wechat-code", "static/mock-food/",
      h.student.id, h.student.nickname, h.merchant.id, h.merchant.nickname,
      ...shops.flatMap((shop) => [
        shop.id, shop.name,
        ...shop.products.flatMap((product) => [product.id, product.name]),
      ]),
    ]);
    for (const file of files) {
      assert.ok(!/(^|\/)mock(?:-food)?\//i.test(file.name), `正式包包含演示目录：${file.name}`);
      const content = readFileSync(file.path, "utf8");
      for (const marker of forbidden) {
        assert.ok(!content.includes(marker), `正式包残留演示数据：${file.name}（${marker}）`);
      }
    }
    const bytes = files.reduce((total, file) => total + file.bytes, 0);
    const vant = files.filter((file) => file.name.startsWith("wxcomponents/vant/"));
    console.log(`正式包：${files.length} 个文件，${bytes} 字节；Vant：${vant.length} 个文件，${vant.reduce((total, file) => total + file.bytes, 0)} 字节。`);
  });
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

test("短订单号完整保留、流水递增与旧格式取餐兼容", async () => {
  const h = harness();
  const { getPickupCode } = h.load("./utils/order-number");
  const input = {
    shopId: "mock-hejian",
    items: [{ productId: "mock-rice-1", quantity: 1, expectedPrice: 1850 }],
    idempotencyKey: "short-number",
  };
  const first = h.request("/orders", "POST", input);
  const second = h.request("/orders", "POST", { ...input, idempotencyKey: "next-number" });
  assert.match(first.number, /^\d{6}-MOCK-\d{4}$/);
  assert.equal(Number(getPickupCode(second.number)), Number(getPickupCode(first.number)) + 1);
  assert.equal(getPickupCode("261013-A3F9-0038"), "0038");
  const legacy = "CF" + "A".repeat(32);
  assert.equal(getPickupCode(legacy), "");
  assert.ok(h.request("/orders").some((order) => order.number === legacy));
  const api = h.load("./services/api").api;
  api.restore();
  assert.equal((await api.order(first.id)).number, first.number);
  assert.equal((await api.order(second.id)).number, second.number);
});
