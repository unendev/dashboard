# ScrollableLayout.tsx UI集成待办事项

## ✅ 已完成
- [x] 添加类型导入 (HeyboxPost, HeyboxReport)
- [x] 添加state (heyboxData, selectedHeyboxDate, availableHeyboxDates)
- [x] 添加日期获取逻辑 (fetch /api/heybox/dates)
- [x] 添加数据获取逻辑 (fetch /api/heybox)
- [x] 修改displayedPosts包含小黑盒数据
- [x] 修改getSourceBadge支持小黑盒

## 📝 待手动添加的UI元素

### 1. 添加小黑盒切换按钮（第365-395行附近）

在现有的Reddit按钮后添加：

```tsx
<button
  onClick={() => setActiveSource('heybox')}
  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
    activeSource === 'heybox'
      ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
      : 'text-white/60 hover:text-white hover:bg-white/5'
  }`}
>
  🎮 小黑盒
</button>
```

### 2. 添加小黑盒日期选择器（第425-454行附近）

在Reddit日期选择后添加：

```tsx
{/* 小黑盒日期选择 */}
{(activeSource === 'all' || activeSource === 'heybox') && (
  <div className="flex items-center gap-2">
    <span className="text-xs text-white/50 flex items-center gap-1">
      <span>🎮</span>
      <span>日期:</span>
    </span>
    <select
      value={selectedHeyboxDate}
      onChange={(e) => setSelectedHeyboxDate(e.target.value)}
      className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-sm text-white
               hover:bg-white/10 hover:border-white/20 focus:outline-none focus:border-purple-500/50
               transition-all cursor-pointer"
    >
      {availableHeyboxDates.length > 0 ? (
        availableHeyboxDates.map(dateObj => (
          <option key={dateObj.date} value={dateObj.date} className="bg-gray-900">
            {formatDateLabel(dateObj.date)} ({dateObj.count}篇)
          </option>
        ))
      ) : (
        <option value={selectedHeyboxDate} className="bg-gray-900">
          {formatDateLabel(selectedHeyboxDate)}
        </option>
      )}
    </select>
  </div>
)}
```

### 3. 在大纲导航添加小黑盒部分（第302行附近，Reddit部分之后）

```tsx
{/* 小黑盒 */}
{(activeSource === 'all' || activeSource === 'heybox') && heyboxData && (
  <div className="mb-6">
    <div 
      onClick={() => scrollToSection('heybox')}
      className={`flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer transition-colors text-sm ${
        activeSection === 'heybox' ? 'bg-purple-500/20 text-purple-400' : 'text-white/70 hover:bg-white/5'
      }`}
    >
      <span className="text-base">🎮</span>
      <span className="font-medium">小黑盒</span>
      <span className="ml-auto text-xs text-white/40">({heyboxData.posts.length})</span>
    </div>
    <div className="ml-6 mt-2 space-y-1">
      {heyboxData.posts.slice(0, 10).map((post, idx) => (
        <div
          key={post.id}
          onClick={() => scrollToSection(`post-heybox-${post.id}`)}
          className="text-xs text-white/50 hover:text-white/80 cursor-pointer truncate 
                   transition-colors py-1 hover:bg-white/5 rounded px-2"
          title={post.title}
        >
          {idx + 1}. {post.title}
        </div>
      ))}
      {heyboxData.posts.length > 10 && (
        <div className="text-xs text-white/30 px-2 py-1">
          还有 {heyboxData.posts.length - 10} 篇...
        </div>
      )}
    </div>
  </div>
)}
```

## 🎯 快速集成方式

由于修改点较多，建议：

1. **方式A：手动添加** - 按照上述位置手动添加代码块
2. **方式B：使用AI辅助** - 提供当前文件让AI一次性生成完整修改
3. **方式C：渐进式测试** - 先添加按钮，测试切换，再添加其他UI

## ✨ 预期效果

完成后，首页应该有：
- ✅ 顶部有"🎮 小黑盒"切换按钮
- ✅ 日期选择器可以切换小黑盒的不同日期数据
- ✅ 左侧大纲导航显示小黑盒帖子列表
- ✅ 卡片网格中显示小黑盒帖子（紫色🎮标识）
- ✅ 点击帖子查看详情和AI分析

## 🔧 后续优化

1. 添加小黑盒特有字段展示（游戏标签、浏览数等）
2. 优化帖子类型的颜色映射（游戏资讯、攻略等）
3. 评论数据展示



