# Cloudflare Tunnel 快速配置指南（域名已托管在 CF）

## 前提条件
- ✅ 域名已托管在 Cloudflare
- ✅ 有 Cloudflare 账号访问权限

---

## 步骤 1：安装 Cloudflared

```powershell
# Windows 安装
winget install --id Cloudflare.cloudflared

# 验证安装
cloudflared --version
```

---

## 步骤 2：登录 Cloudflare

```bash
cloudflared tunnel login
```

- 浏览器会自动打开，选择您的域名
- 授权后会在本地生成证书文件

---

## 步骤 3：创建隧道

```bash
# 创建隧道（名称可自定义）
cloudflared tunnel create dashboard-proxy
```

**输出示例**：
```
Tunnel credentials written to C:\Users\YourName\.cloudflared\a1b2c3d4-e5f6-7890-abcd-ef1234567890.json
Created tunnel dashboard-proxy with id a1b2c3d4-e5f6-7890-abcd-ef1234567890
```

**记录隧道 ID**：`a1b2c3d4-e5f6-7890-abcd-ef1234567890`

---

## 步骤 4：配置隧道

创建配置文件：`C:\Users\YourName\.cloudflared\config.yml`

```yaml
# 替换为你的隧道 ID
tunnel: a1b2c3d4-e5f6-7890-abcd-ef1234567890

# 替换为你的用户名和隧道 ID
credentials-file: C:\Users\YourName\.cloudflared\a1b2c3d4-e5f6-7890-abcd-ef1234567890.json

ingress:
  # 将你的子域名指向 Vercel
  - hostname: api.yourdomain.com  # 替换为你的域名
    service: https://dashboard-d3pbgul4p-uneneichs-projects.vercel.app
    originRequest:
      noTLSVerify: false
      # 保留原始 Host 头
      httpHostHeader: dashboard-d3pbgul4p-uneneichs-projects.vercel.app
  
  # 默认规则（必须保留）
  - service: http_status:404
```

---

## 步骤 5：配置 DNS（自动）

```bash
# 自动在 Cloudflare 创建 DNS 记录
cloudflared tunnel route dns dashboard-proxy api.yourdomain.com
```

**输出示例**：
```
Created CNAME record for api.yourdomain.com
```

此时在 Cloudflare Dashboard 的 DNS 页面会看到一条新的 CNAME 记录：
- **类型**：CNAME
- **名称**：api
- **目标**：a1b2c3d4-e5f6-7890-abcd-ef1234567890.cfargotunnel.com
- **代理状态**：已代理（橙色云朵）

---

## 步骤 6：启动隧道

### 方式 A：临时测试（推荐先测试）

```bash
cloudflared tunnel run dashboard-proxy
```

**输出示例**：
```
2026-01-08T16:20:00Z INF Starting tunnel tunnelID=a1b2c3d4...
2026-01-08T16:20:01Z INF Connection registered connIndex=0 location=HKG
2026-01-08T16:20:01Z INF Connection registered connIndex=1 location=SIN
```

看到 `Connection registered` 表示隧道已启动成功。

**测试访问**：
```bash
# 在浏览器或命令行测试
curl https://api.yourdomain.com
```

### 方式 B：后台运行（测试成功后）

```bash
# 安装为 Windows 服务
cloudflared service install

# 启动服务
cloudflared service start

# 查看服务状态
sc query cloudflared
```

---

## 步骤 7：修改 Timer 配置

编辑 `timer/.env.production`：

```env
VITE_API_BASE_URL=https://api.yourdomain.com
```

重新构建 Timer：

```bash
cd timer
pnpm build
```

---

## 步骤 8：验证

### 1. 测试 API 访问

```bash
# 测试健康检查（如果有）
curl https://api.yourdomain.com/api/health

# 测试实际 API
curl https://api.yourdomain.com/api/timer-tasks
```

### 2. 启动 Timer 应用

```bash
cd timer
pnpm start
```

检查是否能正常访问云端数据。

---

## 常见问题

### Q1: 隧道启动后无法访问？

**检查步骤**：
1. 确认隧道正在运行：`cloudflared tunnel info dashboard-proxy`
2. 检查 DNS 记录是否生效：`nslookup api.yourdomain.com`
3. 查看隧道日志：`cloudflared tunnel run dashboard-proxy`（前台运行查看日志）

### Q2: 502 Bad Gateway 错误？

**原因**：Vercel 后端可能拒绝了请求

**解决**：在 `config.yml` 中添加正确的 `httpHostHeader`：

```yaml
originRequest:
  httpHostHeader: dashboard-d3pbgul4p-uneneichs-projects.vercel.app
```

### Q3: 如何停止隧道服务？

```bash
# 停止服务
cloudflared service stop

# 卸载服务
cloudflared service uninstall
```

### Q4: 如何更新配置？

1. 修改 `~/.cloudflared/config.yml`
2. 重启服务：
   ```bash
   cloudflared service stop
   cloudflared service start
   ```

---

## 管理命令速查

```bash
# 查看所有隧道
cloudflared tunnel list

# 查看隧道详情
cloudflared tunnel info dashboard-proxy

# 删除隧道
cloudflared tunnel delete dashboard-proxy

# 查看隧道路由
cloudflared tunnel route dns dashboard-proxy

# 测试配置文件
cloudflared tunnel ingress validate
```

---

## 性能优化建议

### 1. 启用 Cloudflare 缓存（可选）

在 Cloudflare Dashboard 的 **Caching** 页面：
- 设置缓存级别：Standard
- 为静态资源设置 Page Rules

### 2. 启用 Argo Smart Routing（付费）

可以进一步优化国内访问速度，但需要付费（约 $5/月）。

---

## 总结

✅ **完成后的架构**：

```
Timer App (本地)
    ↓
https://api.yourdomain.com (Cloudflare Tunnel)
    ↓
Cloudflare 全球 CDN
    ↓
https://dashboard-d3pbgul4p-uneneichs-projects.vercel.app (Vercel)
```

✅ **优势**：
- 国内访问速度快
- 自动 HTTPS
- 免费且稳定
- 零维护成本
