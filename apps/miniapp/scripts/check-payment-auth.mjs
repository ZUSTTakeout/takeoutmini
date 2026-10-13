import assert from "node:assert/strict";
import test from "node:test";
import { harness } from "./test-harness.mjs";

function payment() {
  const h = harness(false);
  const api = h.load("./services/api").api;
  api.restore();
  const created = h.request("/orders", "POST", {
    shopId: "mock-hejian", idempotencyKey: "payment-order", remark: "",
    items: [{ productId: "mock-rice-1", quantity: 2, expectedPrice: 1850 }],
  });
  const page = h.load("./pages/orders/detail.vue");
  page.orderId.value = created.id;
  page.order.value = created;
  const respond = (options) => {
    const path = new URL(options.url).pathname.replace(/^\/api/, "");
    try { options.success({ statusCode: 200, data: h.request(path, options.method, options.data) }); }
    catch (reason) { options.success({ statusCode: reason.statusCode || 500, data: { message: reason.message } }); }
  };
  h.setRequestHandler(respond);
  return { ...h, api, page, created, respond };
}

test("测试支付确认后才请求服务端，金额取订单结果", async () => {
  const h = payment();
  const paying = h.page.pay();
  assert.equal(h.requestLog.length, 0);
  assert.equal(h.page.paying.value, true);
  assert.match(h.modals.at(-1).content, /¥37.00.*不会实际扣款/);
  h.modals.at(-1).success({ confirm: true });
  await paying;
  assert.equal(h.requestLog.length, 1);
  assert.equal(h.requestLog[0].path, `/orders/${h.created.id}/pay/test`);
  assert.equal(h.requestLog[0].data, undefined);
  assert.equal(h.page.order.value.paymentStatus, "PAID");
  assert.equal(h.page.order.value.total, 3700);
  assert.equal(h.page.paying.value, false);
  assert.equal(h.toasts.at(-1).title, "支付成功");
});

test("暂不支付保持待付款，再次点击不会重复弹窗或请求", async () => {
  const h = payment();
  const first = h.page.pay();
  await h.page.pay();
  assert.equal(h.modals.length, 1);
  h.modals[0].success({ confirm: false });
  await first;
  assert.equal(h.page.paying.value, false);
  assert.equal(h.page.order.value.paymentStatus, "PENDING");
  assert.equal(h.requestLog.length, 0);
  assert.equal(h.toasts.length, 0);
});

test("支付响应丢失只重试一次，同一笔订单只产生一次支付", async () => {
  const h = payment();
  let paid;
  h.setRequestHandler((options) => {
    if (!paid) {
      paid = h.request(`/orders/${h.created.id}/pay/test`, "POST");
      options.fail({ errMsg: "request:fail timeout" });
    } else h.respond(options);
  });
  const result = await h.api.payTestOrder(h.created.id);
  assert.equal(result.paymentStatus, "PAID");
  assert.equal(result.paymentReference, paid.paymentReference);
  assert.equal(h.requestLog.length, 2);
  assert.equal(h.requestLog[0].path, h.requestLog[1].path);
});

test("两次响应丢失后查询服务端，已付订单按成功处理", async () => {
  const h = payment();
  h.setRequestHandler((options) => {
    if (options.method === "POST") {
      h.request(`/orders/${h.created.id}/pay/test`, "POST");
      options.fail({ errMsg: "request:fail connection lost" });
    } else h.respond(options);
  });
  const result = await h.api.payTestOrder(h.created.id);
  assert.equal(result.paymentStatus, "PAID");
  assert.deepEqual(h.requestLog.map((entry) => entry.method), ["POST", "POST", "GET"]);
});

test("持续网络失败且未付款，不伪造支付成功", async () => {
  const h = payment();
  h.setRequestHandler((options) => {
    if (options.method === "POST") options.fail({ errMsg: "request:fail timeout" });
    else h.respond(options);
  });
  const task = h.page.pay();
  h.modals.at(-1).success({ confirm: true });
  await task;
  assert.equal(h.page.order.value.paymentStatus, "PENDING");
  assert.equal(h.page.paying.value, false);
  assert.equal(h.toasts.at(-1).title, "未确认支付结果，请下拉查看");
  assert.equal(h.requestLog.filter((entry) => entry.method === "POST").length, 2);
});

test("收到 HTTP 错误不重试，也不会用本地状态宣称支付完成", async () => {
  for (const statusCode of [400, 401, 403, 409, 500, 503]) {
    const h = payment();
    h.setRequestHandler((options) => options.success({ statusCode, data: { message: "无法支付" } }));
    await assert.rejects(h.api.payTestOrder(h.created.id), (reason) => reason.statusCode === statusCode);
    assert.equal(h.requestLog.length, 1, String(statusCode));
    assert.equal(h.page.order.value.paymentStatus, "PENDING");
  }
});

test("商户视图和已关闭订单没有支付操作", async () => {
  const h = payment();
  h.page.merchantView.value = true;
  await h.page.pay();
  h.page.merchantView.value = false;
  h.page.order.value.status = "CANCELLED";
  h.page.order.value.paymentStatus = "CLOSED";
  await h.page.pay();
  assert.equal(h.modals.length, 0);
  assert.equal(h.requestLog.length, 0);
});

test("未付订单不可接单，付款后商户可接单，取消回补库存并记录退款", () => {
  const h = payment();
  const path = `/orders/${h.created.id}`;
  const stock = () => h.request("/shops/mock-hejian").products[0].stock;
  const initial = stock();
  assert.ok(!h.request("/merchant/orders", "GET", undefined, h.merchant).some((order) => order.id === h.created.id));
  assert.throws(() => h.request(`${path}/status`, "PATCH", { status: "ACCEPTED" }, h.merchant), (reason) => reason.statusCode === 409);
  const paid = h.request(`${path}/pay/test`, "POST");
  assert.equal(h.request(`${path}/pay/test`, "POST").paymentReference, paid.paymentReference);
  assert.throws(() => h.request(`${path}/pay/test`, "POST", undefined, { ...h.student, id: "other" }), (reason) => reason.statusCode === 404);
  assert.ok(h.request("/merchant/orders", "GET", undefined, h.merchant).some((order) => order.id === h.created.id));
  h.request(`${path}/status`, "PATCH", { status: "ACCEPTED" }, h.merchant);
  const cancelled = h.request(`${path}/status`, "PATCH", { status: "CANCELLED" }, h.merchant);
  assert.equal(cancelled.paymentStatus, "REFUNDED");
  assert.equal(stock(), initial + 2);
  assert.throws(() => h.request(`${path}/pay/test`, "POST"), (reason) => reason.statusCode === 409);
});

test("真实模式每次微信登录都取新 code，只传 code，不走开发身份入口", async () => {
  const h = harness(false);
  const api = h.load("./services/api").api;
  h.setRequestHandler((options) => {
    assert.equal(options.header.Authorization, undefined);
    options.success({ statusCode: 200, data: { token: "wechat-jwt", user: h.student } });
  });
  await api.loginWithWechat();
  await api.loginWithWechat();
  assert.deepEqual(h.requestLog.map((entry) => [entry.path, entry.data]), [
    ["/auth/wechat", { code: "wechat-code-1" }],
    ["/auth/wechat", { code: "wechat-code-2" }],
  ]);
  assert.equal(api.token, "wechat-jwt");
  assert.equal(api.user.id, h.student.id);
  assert.equal(h.storage.get("token"), "wechat-jwt");
});

test("微信登录失败或未返回 code，不发 HTTP、不保存假登录态", async () => {
  for (const handler of [(options) => options.fail({ errMsg: "login:fail" }), (options) => options.success({ code: "" })]) {
    const h = harness(false);
    const api = h.load("./services/api").api;
    api.logout();
    h.setLoginHandler(handler);
    await assert.rejects(api.loginWithWechat());
    assert.equal(h.requestLog.length, 0);
    assert.equal(api.user, null);
    assert.equal(api.token, "");
  }
});

test("微信入口连续点击只登录一次，成功后回到上页", async () => {
  const h = harness(false);
  let loginOptions;
  h.setLoginHandler((options) => { loginOptions = options; });
  h.setRequestHandler((options) => options.success({ statusCode: 200, data: { token: "wechat-jwt", user: h.student } }));
  const page = h.load("./pages/profile/login.vue");
  const first = page.login();
  await page.login();
  assert.equal(h.counters().wechatLogins, 1);
  loginOptions.success({ code: "single-code" });
  await first;
  assert.equal(h.requestLog.length, 1);
  assert.equal(h.navigation.at(-1).type, "navigateBack");
  assert.equal(page.busy.value, "");
});

test("恢复会话向服务端刷新身份，退出和切换账号不被旧响应覆盖", async () => {
  const h = harness(false);
  const api = h.load("./services/api").api;
  api.restore();
  const requests = [];
  h.setRequestHandler((options) => requests.push(options));
  const stale = api.refreshUser();
  api.logout();
  requests.shift().success({ statusCode: 200, data: h.student });
  await stale;
  assert.equal(api.user, null);
  assert.equal(api.token, "");
  h.load("./services/session").session.save({ token: "current-user", user: h.student });
  const current = api.refreshUser();
  requests.shift().success({ statusCode: 200, data: h.merchant });
  await current;
  assert.equal(api.user.role, "MERCHANT");
  assert.equal(api.user.shopId, h.merchant.shopId);
});
