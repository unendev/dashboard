# 🧪 GitHub Actions 测试指南

## 🎯 测试目标

验证小黑盒爬虫在GitHub Actions环境中是否能成功绕过反爬并获取数据。

---

## 📋 前置准备

### 1. 配置GitHub Secrets

进入仓库设置：**Settings → Secrets and variables → Actions**

添加以下3个密钥：

| 名称 | 值 | 说明 |
|------|---|------|
| `HEYBOX_TOKEN_ID` | `BmG6lgAmG/emKgY6F+XyquvLgj0l21Tf6MDDBZSCR0v9o8u5H5M463Gz+ERKSJN1rb1nQpDeQWKmMcV2jIdcNIg%3D%3D` | 小黑盒Token |
| `DEEPSEEK_API_KEY` | `sk-xxx` | DeepSeek API密钥 |
| `DATABASE_URL` | `postgresql://xxx` | 数据库连接串 |

### 2. 推送workflow文件

确保 `.github/workflows/heybox-scraper.yml` 已推送到GitHub。

---

## 🚀 测试步骤

### 步骤1：手动触发

1. 访问GitHub仓库页面
2. 点击 **Actions** 标签
3. 左侧选择 **小黑盒爬虫定时任务**
4. 点击右上角 **Run workflow**
5. 点击绿色按钮 **Run workflow**

### 步骤2：观察日志

等待几分钟，workflow开始执行：

**✅ 成功标志**：
```
✓ 浏览器启动成功
✓ Token注入成功
✓ 页面加载完成
✅ 成功提取 10-20 个帖子
✅ AI分析完成
✅ 数据保存完成
```

**❌ 失败标志**：
```
Error: Navigation timeout
Error: Target closed
Error: Browser was closed
验证失败 / 滑块验证
```

### 步骤3：验证数据

运行成功后，检查数据库：

```bash
# 本地运行
node scripts/check-heybox-data.mjs
```

应该看到新增的帖子（时间戳为Actions运行时间）。

---

## 📊 成功率预测

基于技术栈分析：

| 场景 | 成功率 | 说明 |
|------|--------|------|
| **首次测试** | 70% | IP识别、环境差异 |
| **Token有效** | 85% | Playwright Stealth生效 |
| **优化后** | 95% | 调整参数后 |

---

## 🔧 故障排查

### 问题1：浏览器启动失败

**错误**：
```
Error: Browser was not found
```

**解决**：
```yaml
# 在workflow中添加依赖
- name: 安装系统依赖
  run: |
    sudo apt-get update
    sudo apt-get install -y libgbm1 libxshmfence1
```

### 问题2：Token认证失败

**错误**：
```
Error: 未授权 / 验证失败
```

**原因**：
- Token在新IP下失效
- Token过期

**解决**：
1. 重新获取Token（从本地浏览器）
2. 更新GitHub Secret
3. 考虑使用Cookie认证

### 问题3：滑块验证出现

**错误**：
```
检测到滑块验证
```

**解决**：
1. 降低请求频率（增加 `REQUEST_INTERVAL`）
2. 添加更多随机行为模拟
3. 考虑使用代理IP

---

## 🎯 优化建议

### 如果成功率 < 50%

**改用本地运行**：
- 使用Windows任务计划程序
- 运行 `run-heybox-scraper.bat`
- 每天凌晨自动执行

### 如果成功率 50-80%

**双轨运行**：
- GitHub Actions主力
- 本地脚本备份
- 监控失败率

### 如果成功率 > 80%

**完全依赖Actions**：
- 关闭本地定时任务
- 监控GitHub Actions邮件通知
- 偶尔手动检查

---

## 📧 失败通知

在workflow中添加通知（可选）：

```yaml
- name: 发送失败通知
  if: failure()
  run: |
    # 发送邮件或webhook通知
    echo "爬虫执行失败" >> $GITHUB_STEP_SUMMARY
```

---

## 🔄 定时任务说明

当前配置：
```yaml
schedule:
  - cron: '0 16 * * *'  # UTC 16:00 = 北京时间 00:00
```

**可调整为**：
- `0 8 * * *` - 北京时间 16:00（下午）
- `0 0 * * *` - 北京时间 08:00（早上）
- `0 */6 * * *` - 每6小时一次

---

## ✅ 测试完成清单

- [ ] GitHub Secrets配置完成
- [ ] workflow文件已推送
- [ ] 手动触发测试
- [ ] 查看Actions日志
- [ ] 验证数据库数据
- [ ] 测试前端显示
- [ ] 决定是否启用定时任务

---

## 📌 最终决策

**测试成功** → 启用定时任务，享受全自动！  
**测试失败** → 使用本地脚本，稳定可靠！  
**部分成功** → 双轨运行，互为备份！

---

**立即开始测试吧！** 🚀


