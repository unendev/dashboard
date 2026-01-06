# Vercel 部署配置指南

## 环境变量配置

在 Vercel 项目设置中，需要配置以下环境变量：

### 必需的环境变量

```bash
# 数据库连接（使用 Vercel Postgres 或其他 PostgreSQL 数据库）
DATABASE_URL="postgresql://..."

# NextAuth 配置
NEXTAUTH_URL="https://your-domain.vercel.app"
NEXTAUTH_SECRET="生成一个随机密钥"

# 演示模式（启用自动登录示例账户）
NEXT_PUBLIC_DEMO_MODE="true"
```

### 生成 NEXTAUTH_SECRET

运行以下命令生成随机密钥：

```bash
openssl rand -base64 32
```

或访问：https://generate-secret.vercel.app/32

## Vercel 环境变量设置步骤

1. 登录 Vercel Dashboard
2. 选择你的项目
3. 进入 **Settings** → **Environment Variables**
4. 添加以下变量：

| 变量名 | 值 | 环境 |
|--------|-----|------|
| `DATABASE_URL` | 你的数据库连接字符串 | Production, Preview, Development |
| `NEXTAUTH_URL` | `https://your-domain.vercel.app` | Production |
| `NEXTAUTH_SECRET` | 生成的随机密钥 | Production, Preview, Development |
| `NEXT_PUBLIC_DEMO_MODE` | `true` | Production, Preview, Development |

5. 保存后，重新部署项目

## 自动登录工作原理

当 `NEXT_PUBLIC_DEMO_MODE=true` 时：

1. 用户首次访问应用时，`useDevSession` hook 会检测到未登录状态
2. 自动调用 `/api/auth/ensure-demo-user` 确保示例用户存在
3. 使用 NextAuth 的 `signIn` 函数自动登录示例账户（`demo@example.com`）
4. 登录后，用户获得真实的 session cookie，API 请求可以正常认证

## 禁用演示模式

如果你想要求用户手动登录，设置：

```bash
NEXT_PUBLIC_DEMO_MODE="false"
```

## 数据库迁移

部署前确保数据库已执行所有迁移：

```bash
npx prisma migrate deploy
```

在 Vercel 中，可以在 **Settings** → **General** → **Build & Development Settings** 中设置构建命令：

```bash
npm run build
```

## 疑难解答

### 问题：API 返回 500 错误 "需要认证才能访问此资源"

**解决方案：**

1. 检查 Vercel 环境变量中是否设置了 `NEXT_PUBLIC_DEMO_MODE=true`
2. 清除浏览器缓存和 localStorage
3. 重新访问应用，检查控制台日志是否显示 "🔐 使用演示账户登录"
4. 确认 `DATABASE_URL` 配置正确，示例用户已创建

### 问题：自动登录失败

**检查步骤：**

1. 打开浏览器控制台，查看是否有错误日志
2. 检查 `/api/auth/ensure-demo-user` 是否可以正常访问
3. 验证 `NEXTAUTH_SECRET` 是否已设置
4. 确认数据库连接正常

### 问题：部署后白屏或错误

**解决方案：**

1. 查看 Vercel 部署日志
2. 检查 Vercel Function Logs（Runtime Logs）
3. 确保所有必需的环境变量都已设置
4. 尝试手动访问 `/api/auth/signin` 页面

