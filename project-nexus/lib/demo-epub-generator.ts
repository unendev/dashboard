/**
 * 示例 EPUB 书籍生成器
 * 用于测试 WebRead 功能，避免消耗 OSS 流量
 */

import JSZip from 'jszip';

export interface DemoBookOptions {
  title?: string;
  author?: string;
  language?: string;
  chapters?: number;
}

/**
 * 生成符合 EPUB 3.0 规范的示例电子书
 */
export async function generateDemoEpub(options: DemoBookOptions = {}): Promise<Blob> {
  const {
    title = '示例电子书 - WebRead 测试',
    author = 'WebRead 系统',
    language = 'zh-CN',
    chapters = 3,
  } = options;

  const zip = new JSZip();

  // 1. mimetype 文件（必须第一个添加，且不压缩）
  zip.file('mimetype', 'application/epub+zip', { compression: 'STORE' });

  // 2. META-INF/container.xml
  const containerXml = `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`;
  zip.file('META-INF/container.xml', containerXml);

  // 3. OEBPS/content.opf（包元数据）
  const contentOpf = generateContentOpf(title, author, language, chapters);
  zip.file('OEBPS/content.opf', contentOpf);

  // 4. OEBPS/toc.ncx（目录）
  const tocNcx = generateTocNcx(title, chapters);
  zip.file('OEBPS/toc.ncx', tocNcx);

  // 5. OEBPS/nav.xhtml（EPUB 3 导航文档）
  const navXhtml = generateNavXhtml(title, chapters);
  zip.file('OEBPS/nav.xhtml', navXhtml);

  // 6. 章节内容
  for (let i = 1; i <= chapters; i++) {
    const chapterHtml = generateChapterHtml(i);
    zip.file(`OEBPS/chapter${i}.xhtml`, chapterHtml);
  }

  // 7. 样式表
  const stylesheet = generateStylesheet();
  zip.file('OEBPS/stylesheet.css', stylesheet);

  // 生成 ZIP（EPUB）
  const blob = await zip.generateAsync({
    type: 'blob',
    mimeType: 'application/epub+zip',
    compression: 'DEFLATE',
    compressionOptions: { level: 9 },
  });

  return blob;
}

/**
 * 生成 content.opf 元数据文件
 */
function generateContentOpf(title: string, author: string, language: string, chapters: number): string {
  const timestamp = new Date().toISOString();
  const uuid = `urn:uuid:${generateUUID()}`;

  const manifestItems = [];
  const spineItems = [];

  // 添加导航和样式表
  manifestItems.push('<item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>');
  manifestItems.push('<item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>');
  manifestItems.push('<item id="css" href="stylesheet.css" media-type="text/css"/>');

  // 添加章节
  for (let i = 1; i <= chapters; i++) {
    manifestItems.push(`<item id="chapter${i}" href="chapter${i}.xhtml" media-type="application/xhtml+xml"/>`);
    spineItems.push(`<itemref idref="chapter${i}"/>`);
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="uid" xml:lang="${language}">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="uid">${uuid}</dc:identifier>
    <dc:title>${escapeXml(title)}</dc:title>
    <dc:creator>${escapeXml(author)}</dc:creator>
    <dc:language>${language}</dc:language>
    <dc:date>${timestamp}</dc:date>
    <meta property="dcterms:modified">${timestamp}</meta>
    <dc:description>这是一本由 WebRead 系统自动生成的示例电子书，用于测试阅读功能。</dc:description>
  </metadata>
  <manifest>
    ${manifestItems.join('\n    ')}
  </manifest>
  <spine toc="ncx">
    ${spineItems.join('\n    ')}
  </spine>
</package>`;
}

/**
 * 生成 toc.ncx 目录文件（EPUB 2 兼容）
 */
function generateTocNcx(title: string, chapters: number): string {
  const navPoints = [];
  for (let i = 1; i <= chapters; i++) {
    navPoints.push(`
    <navPoint id="chapter${i}" playOrder="${i}">
      <navLabel>
        <text>第 ${i} 章</text>
      </navLabel>
      <content src="chapter${i}.xhtml"/>
    </navPoint>`);
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">
  <head>
    <meta name="dtb:uid" content="urn:uuid:${generateUUID()}"/>
    <meta name="dtb:depth" content="1"/>
    <meta name="dtb:totalPageCount" content="0"/>
    <meta name="dtb:maxPageNumber" content="0"/>
  </head>
  <docTitle>
    <text>${escapeXml(title)}</text>
  </docTitle>
  <navMap>
    ${navPoints.join('\n')}
  </navMap>
</ncx>`;
}

/**
 * 生成 nav.xhtml 导航文档（EPUB 3）
 */
function generateNavXhtml(title: string, chapters: number): string {
  const navItems = [];
  for (let i = 1; i <= chapters; i++) {
    navItems.push(`      <li><a href="chapter${i}.xhtml">第 ${i} 章</a></li>`);
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="zh-CN">
<head>
  <meta charset="UTF-8"/>
  <title>目录 - ${escapeXml(title)}</title>
  <link rel="stylesheet" type="text/css" href="stylesheet.css"/>
</head>
<body>
  <nav epub:type="toc" id="toc">
    <h1>目录</h1>
    <ol>
${navItems.join('\n')}
    </ol>
  </nav>
</body>
</html>`;
}

/**
 * 生成章节内容
 */
function generateChapterHtml(chapterNum: number): string {
  const chapterTitles = [
    '开始阅读',
    '功能测试',
    '完美结束',
  ];
  
  const chapterContents = [
    // 第一章
    `
    <p class="intro">欢迎使用 WebRead 智能阅读系统！这是一本自动生成的示例电子书，用于测试各项阅读功能。</p>
    
    <h2>什么是 WebRead？</h2>
    <p>WebRead 是一个现代化的在线阅读平台，支持 EPUB 格式的电子书阅读。它提供了以下核心功能：</p>
    <ul>
      <li><strong>智能缓存：</strong>使用 IndexedDB 技术，首次下载后即可离线阅读</li>
      <li><strong>阅读进度：</strong>自动保存阅读位置，随时继续阅读</li>
      <li><strong>AI 翻译：</strong>选中文本即可获得智能翻译和解释</li>
      <li><strong>个性化设置：</strong>字体大小、行距、主题等可自由调整</li>
    </ul>
    
    <h2>测试说明</h2>
    <p>本书共有三章内容，每章都包含了不同的测试元素：</p>
    <ol>
      <li>第一章：基础文本和排版测试</li>
      <li>第二章：功能性测试内容</li>
      <li>第三章：完整性验证</li>
    </ol>
    
    <blockquote>
      <p>"优秀的阅读体验来自于对细节的极致追求。"</p>
      <footer>—— WebRead 设计理念</footer>
    </blockquote>
    
    <p>现在，让我们开始探索 WebRead 的各项功能吧！</p>
    `,
    
    // 第二章
    `
    <p class="intro">在这一章中，我们将测试阅读器的各项核心功能。</p>
    
    <h2>翻页功能测试</h2>
    <p>您可以通过以下方式翻页：</p>
    <ul>
      <li>点击页面左右两侧（左侧上一页，右侧下一页）</li>
      <li>使用键盘方向键（←→ 或 ↑↓）</li>
      <li>使用 WASD 键（游戏玩家的福音）</li>
      <li>使用鼠标滚轮</li>
    </ul>
    
    <h2>样式调整测试</h2>
    <p>请尝试调整以下设置，观察效果：</p>
    <ol>
      <li><strong>字体大小：</strong>使用顶部的 A+ / A- 按钮</li>
      <li><strong>主题切换：</strong>日间、夜间、护眼三种模式</li>
      <li><strong>行间距：</strong>在设置面板中调整</li>
    </ol>
    
    <h2>AI 功能测试</h2>
    <p>选中任意一段文字，会弹出 AI 翻译窗口。您可以尝试以下操作：</p>
    <blockquote>
      <p>This is a test paragraph for AI translation feature. Try to select this text and see what happens!</p>
    </blockquote>
    
    <h2>进度保存测试</h2>
    <p>当您阅读到这里时，系统已经自动保存了您的阅读进度。您可以关闭本页面，稍后重新打开，会自动跳转到上次阅读的位置。</p>
    
    <p>这一段文字特意添加了一些内容，以确保翻页功能能够正常工作。Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.</p>
    
    <h2>缓存测试</h2>
    <p>首次打开本书时，系统会自动将其缓存到浏览器本地。您可以通过以下步骤验证：</p>
    <ol>
      <li>打开浏览器开发者工具（F12）</li>
      <li>切换到 Network 标签</li>
      <li>关闭并重新打开本书</li>
      <li>观察是否有新的网络请求</li>
    </ol>
    <p>如果缓存正常工作，重新打开时应该看不到下载 EPUB 文件的请求。</p>
    `,
    
    // 第三章
    `
    <p class="intro">恭喜您完成了所有功能测试！让我们做一个完整性验证。</p>
    
    <h2>功能清单</h2>
    <p>请确认以下功能都已正常工作：</p>
    
    <h3>✅ 基础功能</h3>
    <ul>
      <li>书籍列表显示正常</li>
      <li>点击书籍可以打开阅读器</li>
      <li>页面排版美观清晰</li>
      <li>翻页流畅无卡顿</li>
    </ul>
    
    <h3>✅ 缓存功能</h3>
    <ul>
      <li>首次打开自动缓存</li>
      <li>重新打开无需下载</li>
      <li>缓存管理界面可用</li>
      <li>可以手动清除缓存</li>
    </ul>
    
    <h3>✅ 阅读体验</h3>
    <ul>
      <li>进度自动保存</li>
      <li>重新打开恢复位置</li>
      <li>字体大小可调</li>
      <li>主题切换正常</li>
      <li>行间距可调整</li>
    </ul>
    
    <h3>✅ 高级功能</h3>
    <ul>
      <li>AI 翻译可用</li>
      <li>文本选择正常</li>
      <li>笔记功能正常</li>
    </ul>
    
    <h2>性能指标</h2>
    <table>
      <thead>
        <tr>
          <th>指标</th>
          <th>目标值</th>
          <th>说明</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>首次加载</td>
          <td>&lt; 2s</td>
          <td>包含下载和渲染时间</td>
        </tr>
        <tr>
          <td>缓存加载</td>
          <td>&lt; 500ms</td>
          <td>从 IndexedDB 读取</td>
        </tr>
        <tr>
          <td>翻页响应</td>
          <td>&lt; 100ms</td>
          <td>用户感知流畅</td>
        </tr>
        <tr>
          <td>缓存容量</td>
          <td>200 MB</td>
          <td>约 40-100 本书</td>
        </tr>
      </tbody>
    </table>
    
    <h2>技术架构</h2>
    <p>WebRead 采用以下技术栈构建：</p>
    <ul>
      <li><strong>前端框架：</strong>Next.js + React</li>
      <li><strong>EPUB 渲染：</strong>EPUB.js</li>
      <li><strong>本地缓存：</strong>IndexedDB API</li>
      <li><strong>样式方案：</strong>Tailwind CSS</li>
      <li><strong>AI 能力：</strong>DeepSeek API</li>
    </ul>
    
    <h2>下一步</h2>
    <p>如果您是开发者，可以尝试：</p>
    <ol>
      <li>上传真实的 EPUB 文件进行测试</li>
      <li>检查 IndexedDB 中的缓存数据</li>
      <li>测试网络断开后的离线阅读</li>
      <li>验证多本书籍的 LRU 清理机制</li>
    </ol>
    
    <blockquote>
      <p>感谢您使用 WebRead！如有任何问题或建议，欢迎反馈。</p>
    </blockquote>
    
    <p class="text-center"><strong>—— 全书完 ——</strong></p>
    `,
  ];

  const title = chapterTitles[chapterNum - 1] || `第 ${chapterNum} 章`;
  const content = chapterContents[chapterNum - 1] || '<p>章节内容</p>';

  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xml:lang="zh-CN">
<head>
  <meta charset="UTF-8"/>
  <title>第 ${chapterNum} 章 - ${title}</title>
  <link rel="stylesheet" type="text/css" href="stylesheet.css"/>
</head>
<body>
  <div class="chapter">
    <h1 class="chapter-title">第 ${chapterNum} 章：${title}</h1>
    ${content}
  </div>
</body>
</html>`;
}

/**
 * 生成样式表
 */
function generateStylesheet(): string {
  return `/* WebRead 示例电子书样式 */

body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif;
  line-height: 1.8;
  padding: 2rem;
  max-width: 40rem;
  margin: 0 auto;
}

h1, h2, h3, h4, h5, h6 {
  font-weight: 600;
  line-height: 1.3;
  margin-top: 2rem;
  margin-bottom: 1rem;
  color: #1a1a1a;
}

h1 {
  font-size: 2rem;
  text-align: center;
  margin-bottom: 2rem;
  padding-bottom: 1rem;
  border-bottom: 2px solid #e5e7eb;
}

h2 {
  font-size: 1.5rem;
  margin-top: 2.5rem;
}

h3 {
  font-size: 1.25rem;
}

p {
  margin: 1rem 0;
  text-align: justify;
}

p.intro {
  font-size: 1.1rem;
  font-weight: 500;
  color: #4b5563;
  margin: 2rem 0;
}

p.text-center {
  text-align: center;
}

ul, ol {
  margin: 1rem 0;
  padding-left: 2rem;
}

li {
  margin: 0.5rem 0;
}

blockquote {
  margin: 2rem 0;
  padding: 1rem 1.5rem;
  background-color: #f9fafb;
  border-left: 4px solid #3b82f6;
  font-style: italic;
}

blockquote p {
  margin: 0.5rem 0;
}

blockquote footer {
  margin-top: 0.5rem;
  font-size: 0.9rem;
  color: #6b7280;
  font-style: normal;
}

table {
  width: 100%;
  border-collapse: collapse;
  margin: 2rem 0;
}

thead {
  background-color: #f3f4f6;
}

th, td {
  padding: 0.75rem;
  text-align: left;
  border: 1px solid #e5e7eb;
}

th {
  font-weight: 600;
  color: #374151;
}

strong {
  font-weight: 600;
  color: #1f2937;
}

.chapter {
  padding: 1rem 0;
}

.chapter-title {
  color: #1e40af;
}

/* 响应式设计 */
@media (max-width: 768px) {
  body {
    padding: 1rem;
  }
  
  h1 {
    font-size: 1.5rem;
  }
  
  h2 {
    font-size: 1.25rem;
  }
}
`;
}

/**
 * 生成简单的 UUID
 */
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * XML 转义
 */
function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

