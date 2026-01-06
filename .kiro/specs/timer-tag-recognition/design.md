# 设计文档：Timer标签识别与AI解析功能

## 概述

本设计文档描述了如何修复Timer小部件中的标签识别和应用问题。

### 问题诊断

经过深入分析，发现了以下具体问题：

1. **AI解析器提示词不够清晰**
   - 当用户输入"#个人网站"（仅标签，无任务名）时，AI解析器不知道应该用什么作为任务名
   - 提示词中的规则3"提取标签：将输入中 # 后面的词识别为 instanceTags"不够强调
   - 需要添加明确的规则：当输入仅包含标签时，应该使用分类名

2. **表单模式中的标签处理逻辑有缺陷**
   - 在`handleSubmit`中，当任务名为空时，代码会使用`selectedTags[0]`作为任务名
   - 这导致用户选择的标签被当作任务名传递，而不是作为标签应用
   - 应该改为：当任务名为空时，使用分类名作为任务名，而不是使用标签

3. **标签选择器的UI反馈不清晰**
   - 用户可能不知道选择的标签是否真的被应用了
   - 需要更清晰的UI反馈

### 修复目标

1. **改进AI解析器提示词**：确保AI正确处理仅包含标签的输入
2. **修复表单模式的标签处理**：确保标签不被当作任务名
3. **改进UI反馈**：让用户清楚地看到标签已被选择和应用

## 修复方案

### 修复1：改进AI解析器提示词

**文件**：`project-nexus/app/api/timer-tasks/parse/route.ts`

**问题**：当用户输入"#个人网站"（仅标签）时，AI不知道应该用什么作为任务名

**修复**：
1. 在提示词中添加明确的规则：当输入仅包含标签时，应该使用分类名作为任务名
2. 添加更多示例，展示仅标签输入的处理方式
3. 强调instanceTags中的标签不应该包含#符号

**修改内容**：
```typescript
// 改进的提示词
const prompt = `你是一个专业的任务管理助手。请根据用户的输入，提取任务信息。

候选分类列表（必须从中选择一个最接近的）：
${flatCategories.join('\n')}

解析规则：
1. 识别任务名称：提取核心动作或事物。如果输入仅包含标签（#开头的词），则使用最匹配的分类名作为任务名。
2. 匹配分类路径：分析输入的语义，将其归类到最合适的候选路径中。必须严格返回列表中的字符串。
3. 提取标签：将输入中 # 后面的词识别为 instanceTags。标签中不应该包含 # 符号。

示例：
输入："蓄能" -> { name: "蓄能", categoryPath: "自我复利/身体蓄能", instanceTags: [] }
输入："写代码 #项目Nexus" -> { name: "写代码", categoryPath: "工作/开发", instanceTags: ["项目Nexus"] }
输入："#个人网站" -> { name: "个人网站", categoryPath: "项目/个人网站", instanceTags: ["个人网站"] }
输入："#项目Nexus #前端" -> { name: "项目Nexus", categoryPath: "工作/开发", instanceTags: ["项目Nexus", "前端"] }

用户输入：
"${text}"`;
```

### 修复2：修复表单模式的标签处理逻辑

**文件**：`timer/src/components/features/log/CreateLogFormWithCards.tsx`

**问题**：在`handleSubmit`中，当任务名为空时，代码使用`selectedTags[0]`作为任务名，导致标签被当作任务名

**修复**：
1. 当任务名为空时，使用分类名作为任务名，而不是使用标签
2. 确保标签始终通过`instanceTagNames`参数传递，而不是作为任务名

**修改内容**：
```typescript
const handleSubmit = async () => {
  const lastCategoryName = getLastCategoryName()
  let finalTaskName = taskName.trim()
  
  // 修复：不再使用标签作为任务名
  if (!finalTaskName) {
    finalTaskName = lastCategoryName
  }

  if (!finalTaskName.trim() || !selectedCategory) {
    alert('请输入任务名称并选择分类')
    return
  }

  if (onAddToTimer) {
    setIsLoading(true)
    const tagsString = selectedTags.length > 0 ? selectedTags.join(',') : undefined
    const initialTime = parseTimeInput(timeInput)

    try {
      await onAddToTimer(finalTaskName, selectedCategory, selectedDate || '', initialTime, tagsString)
      setTaskName('')
      setSelectedCategory('')
      setSelectedTags([])
      setTimeInput('')
    } finally {
      setIsLoading(false)
    }
  }
}
```

### 修复3：改进UI反馈

**文件**：`timer/src/components/features/log/CreateLogFormWithCards.tsx`

**问题**：用户可能不知道选择的标签是否真的被应用了

**修复**：
1. 在表单中显示已选择的标签列表
2. 在提交按钮旁显示标签数量
3. 添加更清晰的提示文本

**修改内容**：
```typescript
// 在表单中添加标签显示
{selectedTags.length > 0 && (
  <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
    <p className="text-xs font-semibold text-emerald-400 mb-2">已选择的标签：</p>
    <div className="flex flex-wrap gap-2">
      {selectedTags.map(tag => (
        <span key={tag} className="px-2 py-1 bg-emerald-500/20 text-emerald-300 text-xs rounded">
          {tag.replace(/^#/, '')}
        </span>
      ))}
    </div>
  </div>
)}
```

## 正确性属性

一个属性是一个特征或行为，应该在系统的所有有效执行中保持真实——本质上是关于系统应该做什么的形式化陈述。属性充当人类可读规范和机器可验证正确性保证之间的桥梁。

### 属性1：AI解析器标签提取
**验证需求 1.1, 4.1, 4.4**

对于任何包含#符号的输入文本，AI解析器应该将#后面的词识别为instanceTags数组中的元素（不包含#符号）。

**形式化**：
```
对于任何输入文本 text，如果 text 包含 #tag1 #tag2 等标签，
则 parse(text).instanceTags 应该包含 ["tag1", "tag2", ...]
```

### 属性2：AI解析器任务名提取
**验证需求 1.3, 4.3**

对于任何包含任务名和标签的输入，AI解析器应该将非#开头的部分识别为任务名。

**形式化**：
```
对于任何输入文本 text = "任务名 #tag1 #tag2"，
则 parse(text).name 应该等于 "任务名"（去除前后空格）
```

### 属性3：标签不作为任务名
**验证需求 1.4, 4.2**

当输入仅包含标签（如"#个人网站"）时，AI解析器应该使用分类名作为任务名，而不是使用标签作为任务名。

**形式化**：
```
对于任何输入文本 text = "#tag"，
则 parse(text).name 不应该包含 "#" 符号
且 parse(text).instanceTags 应该包含 "tag"
```

### 属性4：标签转换为逗号分隔字符串
**验证需求 1.2, 2.2, 3.3**

当AI解析器返回instanceTags数组或用户选择标签时，系统应该将其转换为逗号分隔的字符串格式。

**形式化**：
```
对于任何标签数组 tags = ["tag1", "tag2", "tag3"]，
则 tagsToString(tags) 应该等于 "tag1,tag2,tag3"
且 stringToTags(tagsToString(tags)) 应该等于 tags（往返属性）
```

### 属性5：表单标签选择
**验证需求 2.1, 2.2**

当用户在表单中选择标签时，这些标签应该被添加到selectedTags数组中，并在提交时转换为instanceTagNames字符串。

**形式化**：
```
对于任何用户选择的标签集合 selectedTags，
当提交表单时，instanceTagNames 应该等于 selectedTags.join(',')
```

### 属性6：表单模式不使用标签作为任务名
**验证需求 2.2**

当用户在表单模式中选择标签但不输入任务名时，系统应该使用分类名作为任务名，而不是使用标签。

**形式化**：
```
对于任何表单提交，如果 taskName 为空且 selectedTags 不为空，
则 finalTaskName 应该等于 lastCategoryName，而不是 selectedTags[0]
```

### 属性7：API调用一致性
**验证需求 3.1, 3.2**

Timer和Nexus应该调用相同的AI解析API，并接收相同格式的响应。

**形式化**：
```
对于任何输入文本 text，
Timer 调用 /api/timer-tasks/parse(text) 的响应
应该与 Nexus 调用相同API的响应格式相同
```

## 测试策略

### 单元测试

1. **标签转换函数**
   - 测试数组转字符串：`["tag1", "tag2"]` → `"tag1,tag2"`
   - 测试字符串转数组：`"tag1,tag2"` → `["tag1", "tag2"]`
   - 测试边界情况：空数组、单个标签、特殊字符

2. **时长解析函数**
   - 测试纯数字：`"90"` → `5400`（秒）
   - 测试小时分钟：`"1h30m"` → `5400`
   - 测试边界情况：`"0"`, `"24h"`, 无效输入

### 属性基础测试

使用fast-check库进行属性基础测试（PBT）：

1. **属性1：AI解析器标签提取**
   - 生成包含随机#标签的输入
   - 验证返回的instanceTags包含所有标签
   - 最少100次迭代

2. **属性3：标签不作为任务名**
   - 生成仅包含#标签的输入
   - 验证返回的name不包含#符号
   - 最少100次迭代

3. **属性4：标签转换往返**
   - 生成随机标签数组
   - 验证转换后再转回得到原始数组
   - 最少100次迭代

4. **属性6：表单模式不使用标签作为任务名**
   - 模拟用户选择标签但不输入任务名
   - 验证最终任务名是分类名而不是标签
   - 最少100次迭代

