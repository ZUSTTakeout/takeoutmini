# 校园美食街微信小程序

微信小程序与统一 API 的校园餐饮演示项目，不包含 H5 或独立 App。

## 功能

- 学生端：微信登录、浏览营业店铺和分类商品、按店购物车、库存校验、自取下单、本地测试支付、查看和取消订单。
- 商户端：演示登录、营业状态、订单流转和经营统计；API 提供商品与分类管理接口。
- API：NestJS、TypeScript、Prisma、MySQL 8、JWT/RBAC、订单幂等和事务扣减库存。
- 小程序：uni-app、Vue 3、TypeScript，核心流程请求真实 API。

## 项目结构

```text
apps/
  api/src/
    auth/          登录、身份校验
    shops/         店铺和菜单
    orders/        订单、状态规则
    payments/      测试支付、幂等确认
    merchant/      商户经营与商品管理
    health/        健康检查
    database/      Prisma 与数据库配置
    common/        环境加载、共用转换
  miniapp/src/
    pages/         小程序页面
    components/    共用图标、操作按钮、订单与状态组件
    composables/   页面轮询等组合逻辑
    services/      请求、会话、各功能 API 与购物车
    utils/         金额格式化、订单状态规则
    icons/         ReIcon 图标与配色配置
    static/icons/  小程序图标资源
scripts/           本地启动、数据库与联调脚本
deploy/            部署配置
```

图标统一使用 ReIcon，由 `ReIcon.vue` 展示，操作按钮复用 `IconButton.vue`。页面图标和底部导航均来自同一图库；更新图标配置后运行 `npm run icons:generate` 重新生成静态资源。

## 环境要求

- Node.js 22 与 npm 10 或更高版本
- Docker Desktop（用于本地 MySQL 或完整容器启动）
- 微信开发者工具

## 首次配置

```powershell
Copy-Item .env.example .env
npm run setup
```

启动前请修改 `.env` 中的数据库连接参数和 `JWT_SECRET`。`DATABASE_HOST` 可填写 IP 或纯域名（例如 `db.example.com`），不要带协议或路径；`DATABASE_PORT` 填数据库端口。本地默认是 `127.0.0.1:13306`。应用也支持用完整的 `DATABASE_URL` 覆盖这些拆分参数。API 从仓库根目录或 `apps/api` 启动时都会加载根目录 `.env`。MySQL 容器会自动生成仅用于初始化的 root 密码，应用始终使用 `DATABASE_USER`，无需配置或持有 root 密码。`npm run setup` 使用两个应用各自的锁文件执行 `npm ci`，并显式生成 Prisma Client，安装结果可重复。

## 本地开发后端

以下脚本启动 Docker 中的 MySQL，在宿主机同步数据库结构、构建 API，并等待 API readiness 检查成功：

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/start-local.ps1
```

API 地址为 `http://127.0.0.1:3000/api`。后台进程日志和 PID 位于 `.local/api/`。脚本不会启动前端开发服务器。

如果不使用上述启动脚本、而是手动启动 API，首次连接一个空数据库时先同步表结构：

```powershell
npm run db:push
```

随后构建小程序：

```powershell
npm --prefix apps/miniapp run build:mp-weixin
```

微信开发者工具导入 `apps/miniapp/dist/build/mp-weixin`。真机调试时需要通过构建环境变量 `VITE_API_BASE_URL` 指向已配置合法域名的 HTTPS API。

## 微信登录与测试支付

根目录 `.env` 填写 `WECHAT_APP_ID`、`WECHAT_APP_SECRET`，并设置 `TEST_PAYMENT_ENABLED=true`、`NODE_ENV=development`。AppSecret 仅供 API 使用，不放入小程序环境变量或前端源码。修改后重新启动已构建的 API。

小程序构建的 AppID 优先读取 `VITE_WECHAT_APP_ID`，未指定时沿用仓库根目录 `project.config.json` 中的 AppID；该文件属于本地配置，不提交到 Git。小程序 AppID 必须与 API 的 `WECHAT_APP_ID` 一致。微信入口使用 [`uni.login`](https://uniapp.dcloud.net.cn/api/plugins/login.html) 取得一次性 code，由 API 调用 [`code2Session`](https://developers.weixin.qq.com/miniprogram/dev/OpenApiDoc/user-login/code2Session.html) 验证身份：首次登录注册学生账号，已绑定商户按数据库中的身份登录；不会通过客户端选择身份来获得商户权限。

已有数据库先运行 `npm run db:push` 添加支付字段，原订单保留原有流程。新订单先显示“待付款”，确认后执行服务端测试支付，不调用微信收银台、不实际扣款。已付订单才进入商户待接单列表。可从订单列表的“待付款”继续付款，取消时关闭支付或撤销已完成的测试支付，并在同一事务中回补库存。支付结果和金额以服务端订单为准，重复点击或网络重试不会重复付款。

`POST /api/orders/:id/pay/test` 仅允许订单所属学生调用；`GET /api/auth/me` 返回当前账号公开信息。设置 `TEST_PAYMENT_ENABLED=false` 或 `NODE_ENV=production` 后，测试支付与新的测试下单都不可用；历史订单仍可查询。当前实现仅供测试，真实微信收款和退款需另行接入。

```powershell
npm --prefix apps/miniapp run test:payment-auth
npm --prefix apps/miniapp run test:checkout
npm run test:smoke
```

## Mock 预览

```powershell
npm run build:mock
```

微信开发者工具导入 `apps/miniapp/dist/build/mp-weixin-mock`。该构建包含 6 家店铺、24 件商品、不同状态的订单、本地商品图片和初始购物车，首次使用自动进入学生账号。在「我的」中使用「商户登录」进入商户工作台，也可切回学生账号。下单、取消、接单、取餐、商品编辑和营业设置均保存到本地，重新编译后保留修改。

Mock 会话、购物车和订单使用独立存储；`npm run build` 仍然构建连接 API 的版本。如需重置示例数据，在开发者工具中仅移除 `mock:v1:` 开头的存储项。

```powershell
npm run test:mock
```

图片来源记录在 `apps/miniapp/docs/mock-assets.md`。

## 完整 Docker 启动

```powershell
docker compose --env-file .env up --build -d --wait
```

Compose 会等待 MySQL 健康、同步 Prisma schema、等待 API readiness，再启动 Nginx。容器间数据库地址由 Compose 自动设为 `mysql:3306`，宿主机访问端口仍取 `.env` 的 `DATABASE_PORT`。API 入口为 `http://127.0.0.1:3000/api`。停止服务但保留数据库卷：

```powershell
docker compose down
```

## 校验

```powershell
npm run lint
npm run build
npm run test:api
npm run test:smoke
```

`lint` 会对 API TypeScript/测试文件和小程序 TypeScript/Vue SFC 执行 ESLint，再运行 TypeScript/Vue 类型检查并校验 smoke 脚本语法。`test:smoke` 需要开发后端已经启动且 `DEV_AUTH_ENABLED=true`、`TEST_PAYMENT_ENABLED=true`；它验证登录、菜单、订单幂等、付款前接单拦截、并发测试支付、退款和库存恢复。没有商品时会补充演示商品，测试订单会自动取消。

API 存活与就绪探针分别为 `/api/health/live` 和 `/api/health/ready`；后者会验证数据库连接。

API 依赖审计当前为 0 个已知漏洞。小程序仍有来自 uni-app 构建工具链的审计报告：当前 `@dcloudio/vite-plugin-uni` 将 Vite peer 固定为 `5.2.8`，而审计建议的 Vite 更新与该约束冲突；普通 `npm audit fix` 因 DCloud 的精确依赖约束不会改动锁文件，`--force` 给出的方案则会替换为不兼容的 uni-app 版本。项目不使用强制修复；待 DCloud 发布兼容版本后应整套升级并重新验证构建。

## 上线前

生产环境必须设置 `NODE_ENV=production`、`DEV_AUTH_ENABLED=false`、`TEST_PAYMENT_ENABLED=false`、高强度随机密钥和 HTTPS API 域名，并配置真实微信 AppID/Secret。微信登录与本地测试支付已接通；真实微信收款/退款、WebSocket 业务通知和 Redis 业务接入尚未完成。测试支付不能用于生产收款，构建与 smoke 通过不等同于生产验收。
