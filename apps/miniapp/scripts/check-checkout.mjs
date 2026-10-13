import assert from "node:assert/strict";
import test from "node:test";
import { harness } from "./test-harness.mjs";

const snapshot = (value) => JSON.parse(JSON.stringify(value));
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function checkout() {
  const h = harness(false);
  const { api } = h.load("./services/api");
  api.restore();
  const page = h.load("./pages/cart/index.vue");
  const shop = h.request("/shops/mock-hejian");
  const cart = h.load("./services/cart");
  page.shopId.value = shop.id;
  page.shop.value = shop;
  page.items.value = ["mock-rice-1", "mock-rice-2"].map((id) => {
    const product = shop.products.find((item) => item.id === id);
    return { productId: id, name: product.name, price: product.price, stock: product.stock, quantity: 2 };
  });
  page.remark.value = "少盐";
  cart.saveCart(shop.id, page.items.value);
  cart.saveCheckoutRemark(shop.id, page.remark.value);
  function respond(options) {
    const path = new URL(options.url).pathname.replace(/^\/api/, "");
    try {
      options.success({ statusCode: 200, data: h.request(path, options.method, options.data) });
    } catch (error) {
      options.success({ statusCode: error.statusCode || 500, data: { message: error.message } });
    }
  }
  h.setRequestHandler(respond);
  return {
    ...h, page, api, cart, respond,
    state: () => h.storage.get("mock:v1:data"),
    posts: () => h.requestLog.filter((entry) => entry.method === "POST"),
  };
}

test("正常提交先读取店铺，只发送一次订单，成功后清理购物车和备注", async () => {
  const h = checkout();
  const initialOrders = h.state().orders.length;
  const initialStock = h.state().shops[0].products[0].stock;
  await h.page.submit();
  assert.deepEqual(h.requestLog.map(({ method, path }) => [method, path]), [
    ["GET", "/shops/mock-hejian"], ["POST", "/orders"],
  ]);
  assert.match(h.posts()[0].data.idempotencyKey, uuidPattern);
  assert.equal(h.state().orders.length, initialOrders + 1);
  assert.equal(h.state().shops[0].products[0].stock, initialStock - 2);
  assert.equal(h.page.items.value.length, 0);
  assert.equal(h.cart.loadCart("mock-hejian").length, 0);
  assert.equal(h.cart.loadCheckoutRemark("mock-hejian"), "");
  assert.equal(h.page.submitting.value, false);
  assert.equal(h.navigation.at(-1).url, `/pages/orders/detail?id=${h.state().orders[0].id}&pay=1`);
  assert.ok(!h.storage.has("checkout:mock-hejian"));
});

test("售罄、下架、删除、限量和调价都会说明具体变更并中止订单", async () => {
  const scenarios = [
    { name: "售罄", change: (product) => { product.stock = 0; }, expected: /已移除/ },
    { name: "下架", change: (product) => { product.isAvailable = false; }, expected: /已移除/ },
    { name: "删除", change: (_, shop) => { shop.products.shift(); }, expected: /已移除/ },
    { name: "限量", change: (product) => { product.stock = 1; }, expected: /数量从 2 份调整为 1 份/ },
    { name: "调价", change: (product) => { product.price = 2100; }, expected: /价格从 ¥18.50 调整为 ¥21.00/ },
  ];
  for (const scenario of scenarios) {
    const h = checkout();
    const orderCount = h.state().orders.length;
    const name = h.page.items.value[0].name;
    const shop = h.state().shops[0];
    scenario.change(shop.products[0], shop);
    let uuidCalls = 0;
    h.load("./utils/crypto").crypto.randomUUID = () => { uuidCalls += 1; return "unused"; };
    await h.page.submit();
    assert.equal(h.posts().length, 0, scenario.name);
    assert.equal(h.state().orders.length, orderCount, scenario.name);
    assert.equal(uuidCalls, 0, scenario.name);
    assert.match(h.toasts.at(-1).title, scenario.expected, scenario.name);
    assert.ok(h.toasts.at(-1).title.includes(name), scenario.name);
    assert.deepEqual(h.cart.loadCart(shop.id), snapshot(h.page.items.value));
    assert.equal(h.page.submitting.value, false);
  }
});

test("确认更新后的价格和数量后可再次提交，此时生成新的 UUID", async () => {
  const h = checkout();
  const product = h.state().shops[0].products[0];
  product.price = 2100;
  product.stock = 1;
  await h.page.submit();
  assert.equal(h.posts().length, 0);
  assert.equal(h.page.cartChanges.value.length, 2);
  await h.page.submit();
  assert.equal(h.posts().length, 1);
  const item = h.posts()[0].data.items.find((entry) => entry.productId === product.id);
  assert.deepEqual(item, { productId: product.id, quantity: 1, expectedPrice: 2100 });
  assert.match(h.posts()[0].data.idempotencyKey, uuidPattern);
  assert.equal(h.page.cartChanges.value.length, 0);
});

test("商品返回顺序改变或库存仍充足时不会误判为需要确认", async () => {
  const h = checkout();
  h.state().shops[0].products.reverse();
  h.state().shops[0].products.find((product) => product.id === "mock-rice-1").stock = 5;
  await h.page.submit();
  assert.equal(h.posts().length, 1);
  assert.match(h.navigation.at(-1).url, /^\/pages\/orders\/detail\?id=.+&pay=1$/);
});

test("订单已创建但响应丢失时，用相同 UUID 和请求体重试且只扣一次库存", async () => {
  const h = checkout();
  const orderCount = h.state().orders.length;
  const initialStock = h.state().shops[0].products[0].stock;
  let acceptedOrder;
  h.setRequestHandler((options) => {
    if (options.method === "POST" && !acceptedOrder) {
      acceptedOrder = h.request("/orders", "POST", options.data);
      options.fail({ errMsg: "request:fail timeout" });
      return;
    }
    h.respond(options);
  });
  await h.page.submit();
  assert.equal(h.posts().length, 2);
  assert.deepEqual(h.posts()[0].data, h.posts()[1].data);
  assert.match(h.posts()[0].data.idempotencyKey, uuidPattern);
  assert.equal(h.requestLog.filter((entry) => entry.method === "GET").length, 1);
  assert.equal(h.state().orders.length, orderCount + 1);
  assert.equal(h.state().shops[0].products[0].stock, initialStock - 2);
  assert.equal(h.navigation.at(-1).url, `/pages/orders/detail?id=${acceptedOrder.id}&pay=1`);
});

test("收到 HTTP 响应时不重试，错误经 fail 回调返回状态码也不重试", async () => {
  for (const statusCode of [0, 302, 400, 401, 403, 409, 422, 500, 502, 503]) {
    const h = checkout();
    const original = snapshot(h.page.items.value);
    h.setRequestHandler((options) => {
      if (options.method === "POST") options.success({ statusCode, data: { message: "订单请求被拒绝" } });
      else h.respond(options);
    });
    await h.page.submit();
    assert.equal(h.posts().length, 1, String(statusCode));
    assert.deepEqual(snapshot(h.page.items.value), original);
    assert.equal(h.cart.loadCheckoutRemark("mock-hejian"), "少盐");
  }
  const h = checkout();
  h.setRequestHandler((options) => {
    if (options.method === "POST") options.fail({ errMsg: "request:fail server error", statusCode: 503 });
    else h.respond(options);
  });
  await h.page.submit();
  assert.equal(h.posts().length, 1);
});

test("网络连续失败最多两次，保留购物车并提示先确认订单结果", async () => {
  const h = checkout();
  const original = snapshot(h.page.items.value);
  h.setRequestHandler((options) => {
    if (options.method === "POST") options.fail({ errMsg: "request:fail connection lost" });
    else h.respond(options);
  });
  await h.page.submit();
  assert.equal(h.posts().length, 2);
  assert.deepEqual(h.posts()[0].data, h.posts()[1].data);
  assert.deepEqual(snapshot(h.page.items.value), original);
  assert.equal(h.cart.loadCheckoutRemark("mock-hejian"), "少盐");
  assert.equal(h.toasts.at(-1).title, "未收到下单结果，请先查看订单");
  assert.equal(h.page.submitting.value, false);
});

test("非网络异常不会重试，店铺预检失败时不生成 UUID 或发订单", async () => {
  const h = checkout();
  const { ApiError } = h.load("./services/errors");
  h.setRequestHandler((options) => {
    if (options.method === "POST") throw new ApiError("客户端校验失败");
    else h.respond(options);
  });
  await h.page.submit();
  assert.equal(h.posts().length, 1);
  assert.equal(h.toasts.at(-1).title, "客户端校验失败");
  const preflight = checkout();
  let uuidCalls = 0;
  preflight.load("./utils/crypto").crypto.randomUUID = () => { uuidCalls += 1; return "unused"; };
  preflight.setRequestHandler((options) => options.fail({ errMsg: "request:fail timeout" }));
  await preflight.page.submit();
  assert.equal(preflight.requestLog.length, 1);
  assert.equal(preflight.posts().length, 0);
  assert.equal(uuidCalls, 0);
  assert.equal(preflight.toasts.at(-1).title, "请求超时，请检查网络后重试");
});

test("未登录或非学生只显示登录引导，空购物车和休息店铺不发订单", async () => {
  for (const role of [null, "MERCHANT"]) {
    const h = checkout();
    if (role) h.load("./services/session").session.save({ token: "merchant", user: h.merchant });
    else h.api.logout();
    await h.page.submit();
    assert.equal(h.requestLog.length, 0);
    assert.equal(h.modals.at(-1).title, "需要学生身份");
  }
  const empty = checkout();
  empty.page.items.value = [];
  await empty.page.submit();
  assert.equal(empty.requestLog.length, 0);
  const closed = checkout();
  closed.state().shops[0].isOpen = false;
  await closed.page.submit();
  assert.equal(closed.posts().length, 0);
  assert.equal(closed.page.shop.value.isOpen, false);
  assert.equal(closed.toasts.at(-1).title, "店铺当前未营业");
});

test("提交中再次点击不会产生第二次预检或订单", async () => {
  const h = checkout();
  let pending;
  h.setRequestHandler((options) => {
    if (options.method === "GET") pending = options;
    else h.respond(options);
  });
  const first = h.page.submit();
  await h.page.submit();
  assert.equal(h.requestLog.length, 1);
  h.respond(pending);
  await first;
  assert.equal(h.posts().length, 1);
});

test("微信安全随机数适配生成 UUID v4，失败时不回退到非安全随机数", async () => {
  const h = harness(false, null);
  const { crypto } = h.load("./utils/crypto");
  const first = await crypto.randomUUID();
  const second = await crypto.randomUUID();
  assert.match(first, uuidPattern);
  assert.match(second, uuidPattern);
  assert.notEqual(first, second);
  h.wx.getRandomValues = ({ fail }) => fail();
  await assert.rejects(crypto.randomUUID(), /订单准备失败/);
  delete h.wx.getRandomValues;
  await assert.rejects(crypto.randomUUID(), /请升级微信/);
});

test("mock 重放按已存订单校验内容，店铺或库存改变不会重复下单", () => {
  const h = checkout();
  const input = {
    shopId: "mock-hejian", items: [
      { productId: "mock-rice-1", quantity: 1, expectedPrice: 1850 },
      { productId: "mock-rice-2", quantity: 2, expectedPrice: 2650 },
    ],
    remark: "少盐", idempotencyKey: "historical-order",
  };
  const original = h.request("/orders", "POST", input);
  const count = h.state().orders.length;
  h.state().shops[0].isOpen = false;
  h.state().shops[0].products[0].stock = 0;
  assert.equal(h.request("/orders", "POST", { ...input, items: [...input.items].reverse() }).id, original.id);
  assert.equal(h.state().orders.length, count);
  assert.throws(() => h.request("/orders", "POST", { ...input, remark: "多盐" }), (error) => error.statusCode === 409);
  assert.throws(() => h.request("/orders", "POST", {
    ...input, items: [{ ...input.items[0], expectedPrice: 2100 }, input.items[1]],
  }), (error) => error.statusCode === 409);
});
