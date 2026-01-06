import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Linuxdo测试数据
const linuxdoPosts = [
  {
    id: 'test-linuxdo-1',
    title: 'Next.js 15 性能优化实践分享',
    url: 'https://linux.do/t/nextjs-15-performance',
    core_issue: '分享Next.js 15在生产环境中的性能优化技巧和最佳实践',
    key_info: JSON.stringify([
      'Server Components减少客户端JS体积40%',
      'Turbopack构建速度提升700%',
      '新增Partial Prerendering特性'
    ]),
    post_type: '技术问答',
    value_assessment: '高',
    detailed_analysis: `## 📋 背景介绍

Next.js 15作为最新版本，带来了显著的性能提升和开发体验改进。本文分享了在生产环境中实施性能优化的实战经验，特别是针对大型应用的场景。

## 🎯 核心内容

### Server Components的革命性改变

React Server Components (RSC)是Next.js 15的核心特性：
- 将数据获取逻辑完全移至服务端
- 减少客户端JavaScript包体积约40%
- 首屏加载时间平均降低2.5秒

### Turbopack的惊人速度

新的打包工具Turbopack带来了：
- 冷启动速度提升700%
- 热更新响应时间缩短至50ms以内
- 内存占用降低30%

### Partial Prerendering（实验性）

这是一个突破性的渲染策略：
- 静态内容立即展示
- 动态部分流式传输
- 用户感知的加载速度提升80%

## 💡 技术细节

\`\`\`typescript
// 使用Server Components获取数据
async function ProductList() {
  const products = await db.product.findMany();
  
  return (
    <div className="grid grid-cols-3 gap-4">
      {products.map(p => (
        <ProductCard key={p.id} data={p} />
      ))}
    </div>
  );
}

// 配置Partial Prerendering
export const experimental_ppr = true;
\`\`\`

关键配置优化：
- 启用\`output: 'standalone'\`减少部署体积
- 使用\`optimizeFonts: true\`自动优化字体加载
- 配置\`images.remotePatterns\`安全加载外部图片

## 🔧 实用价值

**适用场景**：
- 电商平台（大量商品展示）
- 内容管理系统（复杂的页面结构）
- 数据密集型应用（实时数据展示）

**迁移建议**：
1. 逐步将Page Router迁移到App Router
2. 优先改造高流量页面为Server Components
3. 监控Core Web Vitals指标变化

**注意事项**：
- Server Components不能使用useState、useEffect等客户端hook
- 需要明确标记'use client'边界
- 某些第三方库可能不兼容

## 🚀 总结与建议

Next.js 15的性能提升是实质性的，特别适合：
- 需要SEO优化的应用
- 对首屏加载速度有严格要求的项目
- 希望减少客户端运行时成本的场景

**行动建议**：立即升级并采用Server Components，预期性能提升20-50%。`
  },
  {
    id: 'test-linuxdo-2',
    title: '自建NAS完全指南：从硬件选型到软件配置',
    url: 'https://linux.do/t/diy-nas-guide',
    core_issue: '详细介绍如何从零搭建个人NAS系统，包含硬件推荐和软件配置',
    key_info: JSON.stringify([
      '硬件总成本约3000元，性价比极高',
      'TrueNAS Scale作为操作系统',
      '支持Docker容器化部署各种服务'
    ]),
    post_type: '资源分享',
    value_assessment: '高',
    detailed_analysis: `## 📋 背景介绍

随着数据量的爆炸式增长，个人数据存储和管理成为刚需。自建NAS相比商业成品，不仅成本更低，还拥有更高的可定制性和可扩展性。本文基于实战经验，分享完整的NAS搭建过程。

## 🎯 核心内容

### 硬件配置清单

**核心组件**：
- CPU：Intel N100（4核4线程，TDP 6W）
- 主板：华擎N100M ITX
- 内存：DDR4 16GB（建议32GB）
- 硬盘：4x4TB机械硬盘（监控盘）
- 系统盘：250GB NVMe SSD
- 电源：180W DC电源
- 机箱：ITX小机箱

**总成本**：约2800-3200元

### 软件方案选择

选择TrueNAS Scale的理由：
- 基于Debian，稳定性极佳
- 原生支持Docker和Kubernetes
- Web管理界面友好
- ZFS文件系统，数据安全性高

## 💡 技术细节

### ZFS存储池配置

\`\`\`bash
# 创建RAIDZ1存储池（类似RAID5）
zpool create tank raidz1 /dev/sda /dev/sdb /dev/sdc /dev/sdd

# 启用压缩和去重
zfs set compression=lz4 tank
zfs set dedup=on tank

# 创建数据集
zfs create tank/media
zfs create tank/backup
\`\`\`

### Docker服务部署

推荐安装的服务：
- **Plex/Jellyfin**：媒体中心
- **Nextcloud**：私有云盘
- **Syncthing**：文件同步
- **qBittorrent**：下载工具
- **Home Assistant**：智能家居中枢
- **Vaultwarden**：密码管理

### 远程访问配置

使用Tailscale实现安全远程访问：
- 零配置P2P连接
- 无需公网IP和端口转发
- 端到端加密
- 跨平台支持

## 🔧 实用价值

**优势对比**：
| 方案 | 成本 | 扩展性 | 自由度 | 难度 |
|------|------|--------|--------|------|
| 群晖 | ¥4000+ | 受限 | 低 | 简单 |
| 自建 | ¥3000 | 极高 | 完全 | 中等 |

**适用人群**：
- 影音爱好者（存储大量4K视频）
- 摄影师/视频创作者（RAW文件管理）
- 技术爱好者（喜欢折腾）
- 小型工作室（团队文件共享）

**注意事项**：
- 建议UPS不间断电源（防止数据丢失）
- 定期备份重要数据到云端
- 监控硬盘SMART状态，及时更换老化硬盘

## 🚀 总结与建议

自建NAS是一个一次投入、长期受益的项目。相比商业方案，虽然需要一定学习成本，但带来的灵活性和成就感是无可替代的。

**未来扩展方向**：
- 添加GPU进行转码
- 部署AI模型（本地Stable Diffusion）
- 搭建家庭监控系统
- 配置自动化备份脚本`
  },
  {
    id: 'test-linuxdo-3',
    title: '2024年最佳免费API推荐：开发者必备清单',
    url: 'https://linux.do/t/free-api-2024',
    core_issue: '整理并推荐2024年最实用的免费API服务，覆盖各类开发场景',
    key_info: JSON.stringify([
      '涵盖AI、地图、天气、金融等12个类别',
      '所有API均免费或有慷慨的免费额度',
      '附带代码示例和限流说明'
    ]),
    post_type: '资源分享',
    value_assessment: '高',
    detailed_analysis: `## 📋 背景介绍

在项目开发过程中，合理使用第三方API可以大幅提升开发效率。本文精选了2024年最值得关注的免费API服务，帮助开发者快速构建功能丰富的应用。

## 🎯 核心内容

### AI与机器学习

**1. DeepSeek API**
- 免费额度：每月200万tokens
- 特点：中文能力强，价格仅为GPT-4的1/10
- 适用：聊天机器人、内容生成、代码辅助

**2. Hugging Face Inference API**
- 免费额度：每月1000次请求
- 特点：海量开源模型，支持文本、图像、音频
- 适用：AI原型开发、模型测试

### 地图与地理信息

**3. Mapbox**
- 免费额度：每月50,000次地图加载
- 特点：精美的地图样式，3D可视化
- 适用：位置服务、数据可视化

**4. OpenCage Geocoding**
- 免费额度：每天2500次请求
- 特点：全球地理编码，支持反向解析
- 适用：地址转坐标、坐标转地址

### 天气数据

**5. OpenWeatherMap**
- 免费额度：每分钟60次请求
- 特点：实时天气、预报、历史数据
- 适用：天气应用、农业监测

### 金融数据

**6. Alpha Vantage**
- 免费额度：每天25次API调用
- 特点：股票、外汇、加密货币实时数据
- 适用：金融分析、投资工具

## 💡 技术细节

### 使用示例：DeepSeek API

\`\`\`javascript
const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_API_KEY',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    model: 'deepseek-chat',
    messages: [
      { role: 'user', content: '请解释什么是RESTful API' }
    ],
    max_tokens: 500
  })
});

const data = await response.json();
console.log(data.choices[0].message.content);
\`\`\`

### 速率限制处理

实现指数退避重试：

\`\`\`javascript
async function fetchWithRetry(url, options, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(url, options);
      if (response.status === 429) {
        const delay = Math.pow(2, i) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      return response;
    } catch (error) {
      if (i === maxRetries - 1) throw error;
    }
  }
}
\`\`\`

## 🔧 实用价值

**选择标准**：
- ✅ 免费额度是否满足开发测试需求
- ✅ 文档质量和社区活跃度
- ✅ API稳定性和响应速度
- ✅ 付费方案价格是否合理（项目上线后）

**最佳实践**：
1. 使用环境变量存储API密钥
2. 实现请求缓存减少调用次数
3. 监控API使用量，避免超限
4. 准备备用API方案

**常见陷阱**：
- 忘记处理速率限制导致服务中断
- 密钥泄露到公开代码仓库
- 过度依赖单一API服务

## 🚀 总结与建议

善用免费API可以以极低成本快速验证产品想法。建议：
- 开发阶段优先使用免费服务
- 产品上线前评估API成本
- 关键功能准备降级方案
- 定期关注新的API服务

**更多资源**：
- [RapidAPI](https://rapidapi.com)：API市场
- [Public APIs](https://github.com/public-apis/public-apis)：开源API清单
- [API List](https://apilist.fun)：中文API导航`
  }
];

// Reddit测试数据
const redditPosts = [
  {
    id: 'test-reddit-tech-1',
    title: 'Google announces Gemini 2.0 with multimodal reasoning',
    title_cn: 'Google发布Gemini 2.0：具备多模态推理能力',
    url: 'https://reddit.com/r/technology/comments/test1',
    core_issue: 'Google最新AI模型Gemini 2.0发布，在多模态理解和推理方面取得突破',
    key_info: JSON.stringify([
      '性能超越GPT-4，在多项基准测试中领先',
      '原生支持图像、视频、音频输入',
      '推理速度提升3倍，成本降低50%'
    ]),
    post_type: '新闻分享',
    value_assessment: '高',
    subreddit: 'technology',
    score: 15420,
    num_comments: 892,
    detailed_analysis: `## 📋 背景介绍

在OpenAI发布GPT-4一年后，Google终于推出了真正有竞争力的产品。Gemini 2.0不仅在性能上追平甚至超越GPT-4，更重要的是在多模态理解和实时推理方面展现了革命性的进步。

## 🎯 核心内容

### 性能突破

根据Google公布的基准测试：
- **MMLU**（多任务语言理解）：90.2% vs GPT-4的86.4%
- **HumanEval**（代码生成）：88.4% vs GPT-4的67.0%
- **MMMU**（多模态理解）：77.8%，新的SOTA记录

### 多模态能力

Gemini 2.0真正实现了"看、听、说"的统一：
- 可以分析视频内容并生成详细总结
- 理解复杂图表和技术图纸
- 处理长达1小时的音频输入
- 生成带配音的视频内容

### 技术架构创新

采用了混合专家模型（MoE）：
- 1.6万亿参数（稀疏激活）
- 推理时仅激活约1400亿参数
- 大幅降低计算成本

## 💡 技术/开发细节

### API使用示例

\`\`\`python
import google.generativeai as genai

# 多模态输入
model = genai.GenerativeModel('gemini-2.0-pro')
response = model.generate_content([
    "分析这个视频中的物体运动轨迹",
    {
        "mime_type": "video/mp4",
        "data": video_bytes
    }
])
print(response.text)
\`\`\`

### 实时流式输出

支持逐token流式返回，用户体验显著提升：

\`\`\`javascript
const stream = await model.generateContentStream({
  contents: [{ role: 'user', parts: [{ text: prompt }] }],
});

for await (const chunk of stream) {
  process.stdout.write(chunk.text());
}
\`\`\`

### 成本优化

- 输入：$0.25 / 1M tokens（GPT-4的1/6）
- 输出：$1.00 / 1M tokens（GPT-4的1/3）
- 图像：$0.002 / 张
- 视频：$0.01 / 秒

## 🔧 实用价值

**适用场景**：
- 🎬 **视频内容分析**：自动生成字幕、总结、标签
- 📊 **数据可视化**：从图表中提取结构化数据
- 🏥 **医疗影像**：辅助诊断（需专业审核）
- 🎓 **在线教育**：多模态互动学习

**与GPT-4对比**：
| 特性 | Gemini 2.0 | GPT-4 |
|------|------------|-------|
| 上下文长度 | 128K | 128K |
| 多模态 | ✅ 原生 | ⚠️ 分离模型 |
| 价格 | 💰 | 💰💰💰 |
| API速度 | 🚀🚀🚀 | 🚀 |
| 开源 | ❌ | ❌ |

**局限性**：
- 仍可能产生幻觉（hallucination）
- 中文能力弱于GPT-4
- API稳定性需要观察

## 🚀 总结与建议

Gemini 2.0的发布标志着AI竞赛进入新阶段。对开发者而言，这是个好消息——更强的性能、更低的价格、更丰富的功能。

**行动建议**：
1. 立即申请API密钥进行测试
2. 评估迁移成本（从GPT-4切换）
3. 探索视频理解场景的新可能
4. 关注Google即将发布的开源版本Gemma 2

**未来展望**：
随着竞争加剧，AI API价格将持续下降，开发者将获得更强大的工具。预计2024年底，多模态AI将成为标配，而非奢侈品。`
  },
  {
    id: 'test-reddit-tech-2',
    title: 'Microsoft Edge adding AI-powered "Rewrite" feature',
    title_cn: 'Microsoft Edge浏览器新增AI重写功能',
    url: 'https://reddit.com/r/technology/comments/test2',
    core_issue: 'Edge浏览器集成AI文本重写工具，可自动改写网页内容风格和语气',
    key_info: JSON.stringify([
      '支持正式、随意、专业等多种风格转换',
      '完全离线运行，保护隐私',
      '基于微软自研的小型语言模型'
    ]),
    post_type: '新闻分享',
    value_assessment: '中',
    subreddit: 'technology',
    score: 3420,
    num_comments: 156,
    detailed_analysis: `## 📋 背景介绍

继Chrome的AI写作助手后，Microsoft Edge也推出了类似功能。但Edge的"Rewrite"功能有所不同——它完全在本地运行，不会将数据发送到云端，这在隐私保护方面是一大进步。

## 🎯 核心内容

### 功能特性

**文本重写模式**：
- 📝 **正式化**：将口语转换为正式商务语言
- 💬 **随意化**：让严肃内容变得轻松易读
- 🎓 **学术化**：转换为学术论文风格
- 📊 **专业化**：适配特定行业术语

### 使用场景

实际应用案例：
- 写邮件时调整语气
- 社交媒体内容优化
- 翻译后文本润色
- 学习材料改写

## 💡 技术/开发细节

### 模型架构

Edge使用的是微软自研的Phi-3系列小模型：
- 参数量：38亿（比GPT-3小1000倍）
- 推理速度：< 50ms（本地CPU）
- 模型大小：2.4GB（可接受的下载量）

### 隐私保护机制

\`\`\`
用户输入 → 浏览器本地处理 → 输出结果
        ↓
    ❌ 不发送到云端
    ❌ 不保存历史记录
    ❌ 不用于模型训练
\`\`\`

### 与竞品对比

| 功能 | Edge Rewrite | Grammarly | GPT-4 |
|------|--------------|-----------|-------|
| 隐私 | ✅ 本地 | ❌ 云端 | ❌ 云端 |
| 速度 | 🚀 瞬时 | ⏱️ 1-2s | ⏱️ 3-5s |
| 免费 | ✅ 是 | ⚠️ 限制 | ❌ 否 |
| 效果 | ⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |

## 🔧 实用价值

**优势**：
- ✅ 完全免费，无需订阅
- ✅ 隐私友好，数据不出设备
- ✅ 响应速度快，无网络延迟
- ✅ 与浏览器深度集成

**局限性**：
- ⚠️ 仅支持英文（中文支持计划中）
- ⚠️ 效果不如GPT-4等大模型
- ⚠️ 需要较新的设备（CPU需支持AVX2）

**适用人群**：
- 隐私敏感用户
- 经常需要调整文本风格的工作者
- 不想付费订阅AI工具的用户
- 在没有网络环境下工作的场景

## 🚀 总结与建议

Edge的AI重写功能体现了浏览器AI化的趋势。虽然效果不如云端大模型，但在隐私、速度、成本方面有明显优势。

**发展趋势**：
- 浏览器将成为AI助手的新战场
- 本地运行的小模型将越来越强
- 隐私保护将成为核心竞争力

**对用户的建议**：
如果你注重隐私且不需要最强的AI能力，Edge的这个功能值得一试。对于专业写作，仍建议使用GPT-4等更强大的工具。`
  },
  {
    id: 'test-reddit-gamedev-1',
    title: 'Successfully launched my first indie game on Steam!',
    title_cn: '我的第一款独立游戏成功在Steam上线了！',
    url: 'https://reddit.com/r/gamedev/comments/test3',
    core_issue: '独立开发者分享首款游戏的开发历程、营销策略和上线后的数据',
    key_info: JSON.stringify([
      '开发耗时18个月，使用Unity和C#',
      '上线首周销售3200份，收入$35000',
      'Reddit和TikTok成为最有效的营销渠道'
    ]),
    post_type: '项目展示',
    value_assessment: '高',
    subreddit: 'gamedev',
    score: 8920,
    num_comments: 445,
    detailed_analysis: `## 📋 背景介绍

这是一个典型的独立游戏开发成功案例。作者作为全职开发者，用18个月时间完成了从概念到发布的全过程。这篇分享提供了宝贵的第一手数据和经验教训。

## 🎯 核心内容

### 游戏基本信息

- **类型**：2D平台解谜游戏
- **引擎**：Unity 2022 LTS
- **美术**：像素风格（作者自己绘制）
- **音乐**：外包给freelancer（成本$1200）
- **价格**：$10.99
- **平台**：Steam（计划移植Switch）

### 开发时间线

| 阶段 | 时长 | 关键产出 |
|------|------|----------|
| 原型开发 | 2个月 | 核心玩法验证 |
| 垂直切片 | 3个月 | 完整的一个关卡 |
| 内容制作 | 8个月 | 50个关卡 + boss战 |
| 打磨优化 | 3个月 | bug修复、性能优化 |
| 营销准备 | 2个月 | 预告片、Demo、愿望单 |

### 营销策略

**最有效的渠道**：
1. **Reddit** (r/indiegames, r/gaming)
   - 成本：$0
   - 愿望单转化：2800人
   - 技巧：在合适的时区发帖，使用GIF而非视频

2. **TikTok**
   - 成本：$0
   - 最高播放量：450万
   - 技巧：展示失败的搞笑瞬间比炫耀成功更受欢迎

3. **Steam Next Fest**
   - 成本：$0（Steam官方活动）
   - Demo下载量：15000
   - 愿望单转化率：18%

**失败的尝试**：
- ❌ Facebook广告（花费$500，ROI惨淡）
- ❌ 游戏评测网站（石沉大海）
- ❌ Discord服务器（只有5个活跃用户）

## 💡 技术/开发细节

### Unity性能优化

关键优化技巧：

\`\`\`csharp
// 对象池管理（避免频繁实例化）
public class ObjectPool {
    private Queue<GameObject> pool = new Queue<GameObject>();
    
    public GameObject Get() {
        if (pool.Count > 0) {
            var obj = pool.Dequeue();
            obj.SetActive(true);
            return obj;
        }
        return Instantiate(prefab);
    }
    
    public void Return(GameObject obj) {
        obj.SetActive(false);
        pool.Enqueue(obj);
    }
}

// 使用Addressables实现资源动态加载
await Addressables.LoadAssetAsync<Sprite>("level_background").Task;
\`\`\`

### 存档系统

使用JSON序列化：

\`\`\`csharp
[System.Serializable]
public class SaveData {
    public int level;
    public List<string> unlockedAchievements;
    public float playTime;
}

public void SaveGame() {
    SaveData data = new SaveData {
        level = currentLevel,
        unlockedAchievements = achievements,
        playTime = Time.realtimeSinceStartup
    };
    
    string json = JsonUtility.ToJson(data);
    string encrypted = Encrypt(json); // 防止作弊
    File.WriteAllText(savePath, encrypted);
}
\`\`\`

### Steam成就集成

\`\`\`csharp
// 使用Steamworks.NET
if (SteamManager.Initialized) {
    SteamUserStats.SetAchievement("FIRST_BOSS_DEFEATED");
    SteamUserStats.StoreStats();
}
\`\`\`

## 🔧 实用价值

### 收入分析

**首周数据**（税前）：
- 销量：3200份
- 总收入：$35,200
- Steam抽成：$10,560（30%）
- 实际到手：$24,640

**长期预测**：
- 预计首月销量：8000份
- 预计首年总销量：20000份
- 预计总收入：$150,000（税前）

### 成本清单

- 软件订阅（Unity Pro, Photoshop）：$1,800
- 音乐外包：$1,200
- Steam发行费：$100
- 营销支出：$800
- **总成本：$3,900**

**ROI**：超过600%（首周即收回所有成本）

### 经验教训

**做得对的事**：
- ✅ 早期发布Demo收集反馈
- ✅ 参加Steam Next Fest
- ✅ 在社交媒体持续更新开发进度
- ✅ 定价合理（$10.99是甜点价格）

**失误**：
- ❌ 没有更早建立社区
- ❌ 低估了移植到其他平台的工作量
- ❌ 某些关卡设计过难，劝退玩家

## 🚀 总结与建议

独立游戏开发是马拉松而非短跑。成功的关键是：
1. **核心玩法要扎实**：原型阶段就要好玩
2. **营销从第一天开始**：不要等游戏做完再推广
3. **社区反馈很重要**：早期测试者的意见价值千金
4. **定价策略要慎重**：$10-15是独立游戏的甜点区间

**给新手的建议**：
- 第一款游戏别做得太大（我原计划100关，最后削减到50关）
- 使用成熟的引擎和工具（Unity/Unreal/Godot）
- 加入开发者社区（r/gamedev, Discord, IndieDB）
- 记录开发过程（视频日志是很好的营销素材）

**下一步计划**：
- 持续更新游戏内容
- 移植到Nintendo Switch
- 开始构思第二款游戏`
  },
  {
    id: 'test-reddit-godot-1',
    title: 'Godot 4.3 optimization tips that doubled my FPS',
    title_cn: 'Godot 4.3性能优化技巧让我的游戏帧率翻倍',
    url: 'https://reddit.com/r/godot/comments/test4',
    core_issue: 'Godot引擎性能优化实战经验，从30fps提升到60fps的具体方法',
    key_info: JSON.stringify([
      '使用MultiMeshInstance3D批量渲染节省80% drawcall',
      'Occlusion Culling正确配置提升40% GPU性能',
      'GDScript改用C#后CPU性能提升3倍'
    ]),
    post_type: '教程指南',
    value_assessment: '高',
    subreddit: 'godot',
    score: 5620,
    num_comments: 234,
    detailed_analysis: `## 📋 背景介绍

Godot 4.x在引入Vulkan渲染器后，性能有了显著提升，但不当的使用仍会导致严重的性能问题。本文分享了在开发3D塔防游戏时，将帧率从30fps提升到稳定60fps的完整优化过程。

## 🎯 核心内容

### 性能瓶颈分析

使用Godot内置的Profiler工具定位问题：

**优化前的性能问题**：
- Draw Calls：2800次/帧（远超合理范围）
- CPU使用率：85%（主要耗时在_process函数）
- GPU使用率：60%（填充率不足）
- 内存使用：1.2GB（大量重复资源）

### 优化策略概览

采用"由外到内"的优化思路：
1. 渲染优化（GPU侧）
2. 逻辑优化（CPU侧）
3. 资源优化（内存侧）
4. 代码重构（架构侧）

## 💡 技术/开发细节

### 1. MultiMeshInstance3D批量渲染

**问题**：游戏中有500个相同的敌人单位，每个都是独立的MeshInstance3D节点，导致500次draw call。

**解决方案**：

\`\`\`gdscript
# 创建MultiMesh
var multi_mesh = MultiMesh.new()
multi_mesh.transform_format = MultiMesh.TRANSFORM_3D
multi_mesh.instance_count = 500
multi_mesh.mesh = preload("res://models/enemy.res")

# 批量设置位置
for i in range(500):
    var transform = Transform3D()
    transform.origin = enemy_positions[i]
    multi_mesh.set_instance_transform(i, transform)

# 创建实例
var multi_mesh_instance = MultiMeshInstance3D.new()
multi_mesh_instance.multimesh = multi_mesh
add_child(multi_mesh_instance)
\`\`\`

**效果**：Draw Calls从500降至1，GPU耗时减少80%

### 2. Occlusion Culling配置

Godot 4.3新增的遮挡剔除功能需要正确配置：

\`\`\`gdscript
# 在场景根节点添加OccluderInstance3D
var occluder = OccluderInstance3D.new()
occluder.occluder = BoxOccluder3D.new()
occluder.occluder.size = Vector3(50, 50, 50)

# 标记需要被剔除的对象
for child in get_children():
    if child is MeshInstance3D:
        child.gi_mode = GeometryInstance3D.GI_MODE_STATIC
        child.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON
\`\`\`

**关键点**：
- 大型建筑物设为Occluder
- 小物件设为被剔除对象
- 动态物体不适用于静态剔除

### 3. 从GDScript迁移到C#

性能关键代码用C#重写：

**GDScript版本**（慢）：
\`\`\`gdscript
func _process(delta):
    for enemy in enemies:
        var distance = global_position.distance_to(enemy.global_position)
        if distance < attack_range:
            attack(enemy)
\`\`\`

**C#版本**（快3倍）：
\`\`\`csharp
public override void _Process(double delta)
{
    var playerPos = GlobalPosition;
    foreach (var enemy in enemies)
    {
        float distSq = (playerPos - enemy.GlobalPosition).LengthSquared();
        if (distSq < attackRangeSq) // 避免开方运算
        {
            Attack(enemy);
        }
    }
}
\`\`\`

**优化技巧**：
- 使用LengthSquared()代替Distance()（省去开方）
- 缓存常用变量（避免重复访问属性）
- 使用foreach代替for循环（C#优化更好）

### 4. 纹理和材质优化

**压缩纹理**：
- 使用Basis Universal压缩（VRAM占用减少75%）
- 降低不重要纹理的分辨率
- 合并材质（减少状态切换）

**LOD（细节层次）**：
\`\`\`gdscript
# 根据距离切换模型精度
func _process(delta):
    var distance = camera.global_position.distance_to(global_position)
    if distance > 50:
        mesh = low_poly_mesh
    elif distance > 20:
        mesh = medium_poly_mesh
    else:
        mesh = high_poly_mesh
\`\`\`

### 5. 物理优化

**空间哈希表**：
\`\`\`gdscript
# 使用Grid系统加速碰撞检测
var grid = {}
var cell_size = 10.0

func add_to_grid(obj):
    var cell = Vector2i(obj.position.x / cell_size, obj.position.z / cell_size)
    if not grid.has(cell):
        grid[cell] = []
    grid[cell].append(obj)

func get_nearby_objects(position, radius):
    var results = []
    var cells_to_check = get_cells_in_radius(position, radius)
    for cell in cells_to_check:
        if grid.has(cell):
            results.append_array(grid[cell])
    return results
\`\`\`

## 🔧 实用价值

### 优化成果对比

| 指标 | 优化前 | 优化后 | 提升 |
|------|--------|--------|------|
| FPS | 30 | 60 | +100% |
| Draw Calls | 2800 | 120 | -96% |
| CPU使用率 | 85% | 35% | -59% |
| 内存占用 | 1.2GB | 450MB | -63% |

### 适用场景

这些优化技巧适用于：
- 🎮 3D游戏（特别是大量重复对象的场景）
- 🏗️ 建筑可视化
- 🌍 开放世界游戏
- 📱 移动平台游戏（性能要求更高）

### 常见误区

**❌ 过早优化**：
在原型阶段不要纠结性能，先跑通玩法。

**❌ 盲目优化**：
必须用Profiler定位瓶颈，不要靠猜测。

**❌ 忽视内存**：
Godot的垃圾回收可能导致卡顿，注意对象池管理。

## 🚀 总结与建议

Godot 4.x的性能完全可以满足商业项目需求，关键是掌握正确的优化方法。

**优化顺序建议**：
1. **先解决渲染瓶颈**：通常是最明显的性能杀手
2. **再优化CPU逻辑**：特别是每帧执行的代码
3. **最后优化内存**：避免GC暂停

**工具推荐**：
- Godot内置Profiler（必用）
- RenderDoc（深度GPU分析）
- Tracy Profiler（高级CPU分析）

**学习资源**：
- [Godot官方优化指南](https://docs.godotengine.org/en/stable/tutorials/performance/)
- GDQuest的性能优化视频教程
- r/godot社区的性能讨论主题

**未来改进方向**：
- 实现GPU Instancing（硬件支持）
- 使用ComputeShader处理粒子效果
- 研究Godot 4.4的新特性（AsyncCulling）`
  }
];

async function main() {
  try {
    console.log('🌱 开始插入测试数据...\n');

    // 插入Linuxdo数据
    console.log('📝 插入Linuxdo测试帖子...');
    for (const post of linuxdoPosts) {
      await prisma.posts.upsert({
        where: { id: post.id },
        update: post,
        create: post,
      });
      console.log(`  ✅ ${post.title}`);
    }

    // 插入Reddit数据
    console.log('\n📝 插入Reddit测试帖子...');
    for (const post of redditPosts) {
      await prisma.reddit_posts.upsert({
        where: { id: post.id },
        update: post,
        create: post,
      });
      console.log(`  ✅ ${post.title_cn}`);
    }

    console.log('\n✨ 测试数据插入完成！');
    console.log('\n📊 数据统计：');
    console.log(`  - Linuxdo帖子：${linuxdoPosts.length} 篇`);
    console.log(`  - Reddit帖子：${redditPosts.length} 篇`);
    console.log(`  - 总计：${linuxdoPosts.length + redditPosts.length} 篇`);
    console.log('\n🎉 现在可以访问主页查看效果了！');
    
  } catch (error) {
    console.error('❌ 插入数据失败:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main();

