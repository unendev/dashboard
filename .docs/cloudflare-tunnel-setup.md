# Cloudflare Tunnel 反代 Vercel 部署指南

## 方案概述
使用 Cloudflare Tunnel 将 Vercel 部署的应用代理到国内可访问的域名，无需自建服务器。

---

## 步骤 1：安装 Cloudflared

### Windows
```powershell
# 下载安装包
winget install --id Cloudflare.cloudflared
```

### 验证安装
```bash
cloudflared --version
```

---

## 步骤 2：登录 Cloudflare

```bash
cloudflared tunnel login
```
- 会自动打开浏览器，选择你的 Cloudflare 账号（没有的话免费注册一个）
- 选择一个域名（或使用 Cloudflare 提供的免费子域名）

---

## 步骤 3：创建隧道

```bash
# 创建名为 dashboard-proxy 的隧道
cloudflared tunnel create dashboard-proxy
```

会生成一个隧道 ID，记录下来（如：`a1b2c3d4-e5f6-7890-abcd-ef1234567890`）

---

## 步骤 4：配置隧道

创建配置文件 `~/.cloudflared/config.yml`：

```yaml
tunnel: a1b2c3d4-e5f6-7890-abcd-ef1234567890  # 替换为你的隧道 ID
credentials-file: C:\Users\你的用户名\.cloudflared\a1b2c3d4-e5f6-7890-abcd-ef1234567890.json

ingress:
  # 将所有流量转发到 Vercel
  - hostname: dashboard.你的域名.com  # 或使用 Cloudflare 提供的免费域名
    service: https://dashboard-d3pbgul4p-uneneichs-projects.vercel.app
    originRequest:
      noTLSVerify: false
  
  # 默认规则（必须）
  - service: http_status:404
```

---

## 步骤 5：配置 DNS

```bash
# 自动配置 DNS 记录
cloudflared tunnel route dns dashboard-proxy dashboard.你的域名.com
```

如果没有域名，Cloudflare 会提供一个免费的 `*.trycloudflare.com` 子域名。

---

## 步骤 6：启动隧道

### 临时测试
```bash
cloudflared tunnel run dashboard-proxy
```

### 后台运行（推荐）
```bash
# Windows 服务方式
cloudflared service install
cloudflared service start
```

---

## 步骤 7：修改 Timer 配置

```env
# timer/.env.production
VITE_API_BASE_URL=https://dashboard.你的域名.com
```

重新构建 Timer 应用：
```bash
cd timer
pnpm build
```

---

## 验证

访问 `https://dashboard.你的域名.com/api/health`，应该能看到 Vercel 的响应。

---

## 优势

✅ **零成本**：完全免费  
✅ **零维护**：自动更新、自动重连  
✅ **高可用**：Cloudflare 全球 CDN  
✅ **安全**：自动 HTTPS，DDoS 防护  
✅ **快速**：国内访问速度优化  

---

## 备选方案：使用 Cloudflare Workers（更简单）

如果觉得 Tunnel 复杂，可以用 Cloudflare Workers 做反向代理（纯代码，无需安装客户端）：

```javascript
// workers.js
export default {
  async fetch(request) {
    const url = new URL(request.url);
    url.hostname = 'dashboard-d3pbgul4p-uneneichs-projects.vercel.app';
    
    return fetch(url, {
      method: request.method,
      headers: request.headers,
      body: request.body,
    });
  }
}
```

部署到 Cloudflare Workers 后，会得到一个 `https://你的worker.workers.dev` 地址。

**优势**：
- 无需安装任何客户端
- 完全托管，零维护
- 免费额度：每天 10 万次请求

**劣势**：
- Workers 域名可能被墙（可绑定自定义域名解决）
