# 校园美食街微信小程序

微信小程序与统一 API 的校园餐饮演示项目，不包含 H5 或独立 App。

## 功能

- 学生端：浏览营业店铺和分类商品、按店购物车、库存校验、线下自取下单、查看和取消订单。
- 商户端：演示登录、营业状态、订单流转和经营统计；API 提供商品与分类管理接口。
- API：NestJS、TypeScript、Prisma、MySQL 8、JWT/RBAC、订单幂等和事务扣减库存。
- 小程序：uni-app、Vue 3、TypeScript，核心流程请求真实 API。

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

`lint` 会对 API TypeScript/测试文件和小程序 TypeScript/Vue SFC 执行 ESLint，再运行 TypeScript/Vue 类型检查并校验 smoke 脚本语法。`test:smoke` 需要开发后端已经启动且 `DEV_AUTH_ENABLED=true`；它验证登录、菜单、订单幂等、商户可见性、取消和库存恢复。没有商品时会补充演示商品，测试订单会自动取消。

API 存活与就绪探针分别为 `/api/health/live` 和 `/api/health/ready`；后者会验证数据库连接。

API 依赖审计当前为 0 个已知漏洞。小程序仍有来自 uni-app 构建工具链的审计报告：当前 `@dcloudio/vite-plugin-uni` 将 Vite peer 固定为 `5.2.8`，而审计建议的 Vite 更新与该约束冲突；普通 `npm audit fix` 因 DCloud 的精确依赖约束不会改动锁文件，`--force` 给出的方案则会替换为不兼容的 uni-app 版本。项目不使用强制修复；待 DCloud 发布兼容版本后应整套升级并重新验证构建。

## 上线前

生产环境必须设置 `NODE_ENV=production`、`DEV_AUTH_ENABLED=false`、高强度随机密钥和 HTTPS API 域名，并配置真实微信 AppID/Secret。API 已实现微信 `code2session` 登录流程，但仍需使用真实配置完成联调验收；支付/退款、WebSocket 业务通知和 Redis 业务接入尚未完成。构建与 smoke 通过不等同于生产验收。
