# Backend

这是小程序对应的 Next.js + Prisma 后端服务。

## 本地启动

1. 安装依赖

```bash
npm install
```

2. 复制环境变量模板

```bash
cp .env.example .env.local
```

3. 按需修改 `.env.local`

至少要确认下面 4 个值是有效的，否则小程序微信登录会失败：

- `DATABASE_URL`
- `JWT_SECRET`
- `WECHAT_APPID`
- `WECHAT_SECRET`

4. 生成 Prisma Client

```bash
npm run prisma:generate
```

5. 启动开发服务

```bash
npm run dev
```

服务默认运行在 `http://localhost:3000`。

## 环境变量说明

项目当前代码里实际使用到的环境变量只有这些：

| 变量名 | 是否必须 | 用途 |
| --- | --- | --- |
| `DATABASE_URL` | 是 | Prisma 连接数据库，当前仓库使用 sqlite |
| `JWT_SECRET` | 是 | 用户登录、管理员登录、接口鉴权时签发和校验 JWT |
| `WECHAT_APPID` | 小程序微信登录时必须 | 调用微信 `jscode2session` 时使用 |
| `WECHAT_SECRET` | 小程序微信登录时必须 | 调用微信 `jscode2session` 时使用 |
| `ADMIN_USERNAME` | 管理员登录时必须 | `/api/admin/login` 用户名 |
| `ADMIN_PASSWORD` | 管理员登录时必须 | `/api/admin/login` 密码 |

推荐直接以 [`.env.example`](./.env.example) 为起点。

## 这份仓库的推荐开发配置

```env
DATABASE_URL="file:./prisma/dev.db"
JWT_SECRET="replace-this-with-a-long-random-string"
WECHAT_APPID="wx8e54bced7dbc10bd"
WECHAT_SECRET="replace-with-your-wechat-mini-program-secret"
ADMIN_USERNAME="admin"
ADMIN_PASSWORD="change-this-password"
```

说明：

- `DATABASE_URL="file:./prisma/dev.db"` 会连接到仓库里现成的 sqlite 文件：`backend/prisma/prisma/dev.db`
- `WECHAT_APPID` 应该和小程序实际使用的 AppID 保持一致；当前仓库里的开发者工具配置在 `miniprogem/project.config.json`
- `WECHAT_SECRET` 需要去微信公众平台的小程序后台获取，仓库里不会保存这个值

## 小程序联调

- 小程序请求地址来自 `miniprogem/config.js`，默认是 `http://localhost:3000`
- 你现在在开发者工具模拟器里联调时，这个地址可以直接用
- 如果改成真机调试，`localhost` 指向手机自己，需要改成你电脑可访问的局域网 IP 或线上域名

## 常见报错

### 1. `/api/user/login` 返回 500，提示微信配置缺失

说明后端缺少下面其中一个或多个变量：

- `WECHAT_APPID`
- `WECHAT_SECRET`

开发环境下现在会直接返回缺失的变量名，方便排查。

### 2. `/api/user/login` 返回 500，登录配置缺失

通常是 `JWT_SECRET` 没有配置。这个变量不参与微信换取 `openid`，但会在后端签发登录 token 时使用。

### 3. Prisma 启动时报数据库错误

优先检查：

- `.env.local` 里的 `DATABASE_URL` 是否还是 `file:./prisma/dev.db`
- 是否已经执行过 `npm run prisma:generate`

如果你想重建本地数据库结构，可以执行：

```bash
npm run prisma:db:push
```
