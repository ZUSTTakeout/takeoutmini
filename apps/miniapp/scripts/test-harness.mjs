import { readFileSync, existsSync } from "node:fs";
import { webcrypto } from "node:crypto";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const requirePackage = createRequire(resolve(appRoot, "package.json"));
const ts = requirePackage("typescript");
const copy = (value) => value === undefined ? undefined : JSON.parse(JSON.stringify(value));

export function harness(mock = true, platformCrypto = webcrypto) {
  const storage = new Map([["token", "real-token"], ["user", { id: "real-user", nickname: "真实账号", role: "STUDENT" }]]);
  const modules = new Map();
  const requestLog = [];
  const toasts = [];
  const modals = [];
  const navigation = [];
  const hooks = { load: [], show: [], hide: [], unload: [], pullDownRefresh: [] };
  let wechatLogins = 0;
  let loginHandler;
  let requestHandler;
  const uni = {
    getStorageSync: (key) => storage.get(key),
    setStorageSync: (key, value) => storage.set(key, copy(value)),
    removeStorageSync: (key) => storage.delete(key),
    showModal: (options) => modals.push(options),
    showToast: (options) => toasts.push(options),
    setNavigationBarTitle: () => {},
    login: (options) => {
      wechatLogins += 1;
      if (loginHandler) loginHandler(options);
      else options.success({ code: `wechat-code-${wechatLogins}` });
    },
    navigateTo: (options) => navigation.push({ type: "navigateTo", url: options.url }),
    switchTab: (options) => navigation.push({ type: "switchTab", url: options.url }),
    navigateBack: () => navigation.push({ type: "navigateBack" }),
    request: (options) => {
      requestLog.push({
        path: new URL(options.url).pathname.replace(/^\/api/, ""),
        method: options.method || "GET",
        data: copy(options.data),
      });
      if (requestHandler) requestHandler(options);
      else options.success({ statusCode: 200, data: [] });
    },
  };
  const wx = {
    getRandomValues: ({ length, success }) => {
      const bytes = webcrypto.getRandomValues(new Uint8Array(length));
      success({ randomValues: bytes.buffer });
    },
  };
  const env = { VITE_MOCK_ENABLED: String(mock), VITE_DEV_AUTH_ENABLED: "false", DEV: false };
  function load(relative, parent = resolve(appRoot, "src")) {
    if (relative === "vue") return requirePackage("vue");
    if (relative === "@dcloudio/uni-app") return {
      onLoad: (callback) => hooks.load.push(callback),
      onShow: (callback) => hooks.show.push(callback),
      onHide: (callback) => hooks.hide.push(callback),
      onUnload: (callback) => hooks.unload.push(callback),
      onPullDownRefresh: (callback) => hooks.pullDownRefresh.push(callback),
    };
    let filename = resolve(parent, relative);
    const pageExports = {
      [resolve(appRoot, "src/pages/cart/index.vue")]: "submit, load, items, shop, shopId, remark, submitting, cartChanges",
      [resolve(appRoot, "src/pages/orders/detail.vue")]: "pay, load, cancel, requestCancel, order, orderId, merchantView, paying, cancelling",
      [resolve(appRoot, "src/pages/profile/login.vue")]: "login, busy",
    };
    const isPage = filename in pageExports;
    if (relative.endsWith(".vue") && !isPage) return {};
    if (!isPage) {
      if (!existsSync(filename + ".ts")) filename = resolve(filename, "index");
      filename += ".ts";
    }
    if (modules.has(filename)) return modules.get(filename).exports;
    const module = { exports: {} };
    modules.set(filename, module);
    let source = readFileSync(filename, "utf8");
    if (isPage) {
      source = source.match(/<script setup lang="ts">([\s\S]*?)<\/script>/)[1];
      source += `\nexport { ${pageExports[filename]} };`;
    }
    source = source.replaceAll("import.meta.env", "env");
    const compiled = ts.transpileModule(source, {
      compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
    }).outputText;
    const requireLocal = (name) => load(name, dirname(filename));
    new Function("require", "module", "exports", "uni", "env", "globalThis", "wx", compiled)(
      requireLocal, module, module.exports, uni, env, { crypto: platformCrypto }, wx,
    );
    return module.exports;
  }
  const { dispatchMockRequest } = load("./mock");
  const { MOCK_STUDENT: student, MOCK_MERCHANT: merchant } = load("./mock/fixtures");
  return {
    storage, load, student, merchant, uni, wx, toasts, modals, requestLog, navigation, hooks,
    setLoginHandler: (handler) => { loginHandler = handler; },
    setRequestHandler: (handler) => { requestHandler = handler; },
    request: (path, method = "GET", data, user = student) => dispatchMockRequest(path, { method, data }, user),
    counters: () => ({ requests: requestLog.length, wechatLogins }),
  };
}
