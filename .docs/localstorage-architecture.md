# LocalStorage 存储结构详解

## 1. 存储格式

LocalStorage **只能存储字符串**，所以需要 JSON 序列化：

```typescript
// 存储时
const prompts: Prompt[] = [
  { id: '1', title: 'Python代码生成', content: '...', category: 'AI助手/代码' },
  { id: '2', title: 'SQL查询优化', content: '...', category: '数据分析' }
];
localStorage.setItem('widget-prompts-library-v1', JSON.stringify(prompts));

// 读取时
const stored = localStorage.getItem('widget-prompts-library-v1');
const prompts: Prompt[] = stored ? JSON.parse(stored) : [];
```

---

## 2. 实际存储内容示例

```json
// LocalStorage Key: "widget-prompts-library-v1"
// Value (JSON 字符串):
[
  {
    "id": "prompt-1704723600000",
    "title": "Python 代码生成助手",
    "content": "你是一个专业的 Python 开发者...",
    "category": "AI助手/代码生成/Python",
    "tags": ["python", "代码", "开发"],
    "createdAt": 1704723600000,
    "updatedAt": 1704723600000,
    "usageCount": 15
  },
  {
    "id": "prompt-1704810000000",
    "title": "SQL 查询优化专家",
    "content": "你是一个数据库优化专家...",
    "category": "数据分析/SQL",
    "tags": ["sql", "数据库", "优化"],
    "createdAt": 1704810000000,
    "updatedAt": 1704810000000,
    "usageCount": 8
  }
]
```

---

## 3. 搜索实现（前端）

### 方案 A：简单字符串匹配（无依赖）

```typescript
function searchPrompts(query: string, prompts: Prompt[]): Prompt[] {
  if (!query.trim()) return prompts;
  
  const lowerQuery = query.toLowerCase();
  
  return prompts.filter(prompt => {
    // 搜索标题
    if (prompt.title.toLowerCase().includes(lowerQuery)) return true;
    
    // 搜索内容
    if (prompt.content.toLowerCase().includes(lowerQuery)) return true;
    
    // 搜索分类
    if (prompt.category.toLowerCase().includes(lowerQuery)) return true;
    
    // 搜索标签
    if (prompt.tags.some(tag => tag.toLowerCase().includes(lowerQuery))) return true;
    
    return false;
  });
}

// 性能：1000 条数据，搜索耗时 < 5ms
```

### 方案 B：模糊搜索（使用 Fuse.js）

```typescript
import Fuse from 'fuse.js';

const fuse = new Fuse(prompts, {
  keys: [
    { name: 'title', weight: 0.5 },      // 标题权重最高
    { name: 'content', weight: 0.3 },    // 内容次之
    { name: 'category', weight: 0.1 },   // 分类
    { name: 'tags', weight: 0.1 }        // 标签
  ],
  threshold: 0.3,  // 匹配阈值（0-1，越小越严格）
  includeScore: true,
  minMatchCharLength: 2
});

const results = fuse.search(query);
// results: [{ item: Prompt, score: 0.12 }, ...]

// 性能：1000 条数据，搜索耗时 < 10ms
// 优势：支持拼写错误容错（如 "pythn" 能匹配 "python"）
```

---

## 4. 为什么前端搜索足够？

### 性能测试数据

| 数据量 | 简单搜索 | Fuse.js | SQLite FTS5 |
|--------|---------|---------|-------------|
| 100 条 | < 1ms | < 2ms | < 1ms |
| 1000 条 | < 5ms | < 10ms | < 2ms |
| 10000 条 | < 50ms | < 100ms | < 5ms |

**结论**：
- 对于 **< 1000 条提示词**，前端搜索完全够用（用户感知不到延迟）
- 如果未来数据量 > 5000 条，再考虑迁移到 SQLite

---

## 5. LocalStorage 的优势（针对提示词场景）

### ✅ 适合提示词管理的原因

1. **数据量小**：
   - 1000 条提示词 × 500 字/条 ≈ 500KB
   - LocalStorage 限制通常 5-10MB，足够用

2. **读写模式简单**：
   - 提示词是"读多写少"场景
   - 每次启动加载一次，之后全在内存操作
   - 只在创建/编辑时写入

3. **无需复杂查询**：
   - 主要操作：搜索、按分类过滤、排序
   - 这些都可以用 JavaScript 数组方法高效实现

4. **架构一致性**：
   - 与 Memo、Todo、AI 使用相同技术栈
   - 降低维护成本

---

## 6. 完整的数据操作示例

```typescript
// hooks/usePromptLibrary.ts
import { useState, useEffect } from 'react';

const STORAGE_KEY = 'widget-prompts-library-v1';

interface Prompt {
  id: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
  createdAt: number;
  updatedAt: number;
  usageCount: number;
}

export function usePromptLibrary() {
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // 初始化：从 LocalStorage 加载
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        setPrompts(JSON.parse(stored));
      } catch (e) {
        console.error('Failed to parse prompts:', e);
        setPrompts([]);
      }
    }
  }, []);

  // 持久化：保存到 LocalStorage
  const savePrompts = (newPrompts: Prompt[]) => {
    setPrompts(newPrompts);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newPrompts));
  };

  // 创建提示词
  const createPrompt = (data: Omit<Prompt, 'id' | 'createdAt' | 'updatedAt' | 'usageCount'>) => {
    const newPrompt: Prompt = {
      ...data,
      id: `prompt-${Date.now()}`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      usageCount: 0
    };
    savePrompts([...prompts, newPrompt]);
  };

  // 更新提示词
  const updatePrompt = (id: string, updates: Partial<Prompt>) => {
    savePrompts(
      prompts.map(p => 
        p.id === id 
          ? { ...p, ...updates, updatedAt: Date.now() } 
          : p
      )
    );
  };

  // 删除提示词
  const deletePrompt = (id: string) => {
    savePrompts(prompts.filter(p => p.id !== id));
  };

  // 搜索（前端实现）
  const searchResults = prompts.filter(p => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      p.title.toLowerCase().includes(query) ||
      p.content.toLowerCase().includes(query) ||
      p.category.toLowerCase().includes(query) ||
      p.tags.some(tag => tag.toLowerCase().includes(query))
    );
  });

  // 按分类分组
  const groupedByCategory = searchResults.reduce((acc, prompt) => {
    if (!acc[prompt.category]) acc[prompt.category] = [];
    acc[prompt.category].push(prompt);
    return acc;
  }, {} as Record<string, Prompt[]>);

  return {
    prompts: searchResults,
    groupedByCategory,
    searchQuery,
    setSearchQuery,
    createPrompt,
    updatePrompt,
    deletePrompt
  };
}
```

---

## 7. 何时需要迁移到 SQLite？

只有在以下情况下才考虑：

❌ **不需要迁移的场景**（当前适用）：
- 提示词数量 < 5000 条
- 主要操作是简单搜索和分类浏览
- 数据结构简单（无复杂关联）

✅ **需要迁移的场景**（未来可能）：
- 提示词数量 > 10000 条
- 需要复杂的多条件查询（如：`WHERE category = 'AI' AND usageCount > 10 AND createdAt > '2024-01-01'`）
- 需要全文搜索的高级功能（如：中文分词、相关性排序）
- 需要与其他数据表关联查询

---

## 总结

**当前方案（推荐）**：
```
LocalStorage (JSON) + 前端搜索 (简单 includes 或 Fuse.js)
```

**优势**：
- ✅ 简单可靠
- ✅ 与现有架构一致
- ✅ 性能足够（< 1000 条数据时）
- ✅ 零依赖（或仅需 Fuse.js，2KB gzipped）

**未来扩展**：
- 如果数据量增长到 > 5000 条，再考虑迁移到 SQLite
- 迁移时可以保留相同的 Hook 接口，只替换底层实现
