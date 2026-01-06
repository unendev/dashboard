'use client'

import { useState } from 'react'
import { createLog } from '@/app/actions'
import { getBeijingTime } from '@/lib/utils'

// 移除未使用的 Quest 接口

// 日志分类相关类型定义
interface LogActivity {
  name: string;
  duration: string;
}

interface LogSubCategory {
  name: string;
  activities: LogActivity[];
}

interface LogCategory {
  name: string;
  subCategories: LogSubCategory[];
}

// 移除空接口，不需要 props 类型定义

// 初始预设一个分类、一个子分类、一个活动，方便快速记录
const initialPresetCategories = [
  {
    name: '', // 默认分类名为空，用户可以直接填写
    subCategories: [
      {
        name: '', // 默认子分类名为空
        activities: [
          { name: '', duration: '' }, // 默认一个活动
        ],
      },
    ],
  },
];

export default function CreateLogForm(/* { activeQuests }: CreateLogFormProps */) {
  const [isLoading, setIsLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'basic' | 'activities'>('basic')
  // 移除 useSearchParams 以避免 Suspense 边界问题
  // const searchParams = useSearchParams()
  // const urlCategory = searchParams.get('category')
  // const urlSubcategory = searchParams.get('subcategory')

  const [categories, setCategories] = useState<LogCategory[]>(initialPresetCategories);

  // 移除了 URL 参数依赖的 useEffect 以避免 Suspense 问题

  // 处理分类、子分类、活动名称和时长的改变
  const handleCategoryChange = (catIndex: number, newName: string) => {
    const newCategories = [...categories];
    newCategories[catIndex].name = newName;
    setCategories(newCategories);
  };

  const handleSubCategoryChange = (catIndex: number, subCatIndex: number, newName: string) => {
    const newCategories = [...categories];
    newCategories[catIndex].subCategories[subCatIndex].name = newName;
    setCategories(newCategories);
  };

  const handleActivityChange = (catIndex: number, subCatIndex: number, activityIndex: number, field: keyof LogActivity, value: string) => {
    const newCategories = [...categories];
    newCategories[catIndex].subCategories[subCatIndex].activities[activityIndex][field] = value;
    setCategories(newCategories);
  };

  // 添加新的分类
  const addCategory = () => {
    setCategories([...categories, { name: '', subCategories: [] }]);
  };

  // 添加新的子分类
  const addSubCategory = (catIndex: number) => {
    const newCategories = [...categories];
    newCategories[catIndex].subCategories.push({ name: '', activities: [] });
    setCategories(newCategories);
  };

  // 添加新的活动
  const addActivity = (catIndex: number, subCatIndex: number) => {
    const newCategories = [...categories];
    newCategories[catIndex].subCategories[subCatIndex].activities.push({ name: '', duration: '' });
    setCategories(newCategories);
  };

  // 移除分类
  const removeCategory = (catIndex: number) => {
    setCategories(categories.filter((_, i) => i !== catIndex));
  };

  // 移除子分类
  const removeSubCategory = (catIndex: number, subCatIndex: number) => {
    const newCategories = [...categories];
    newCategories[catIndex].subCategories = newCategories[catIndex].subCategories.filter((_, i) => i !== subCatIndex);
    setCategories(newCategories);
  };

  // 移除活动
  const removeActivity = (catIndex: number, subCatIndex: number, activityIndex: number) => {
    const newCategories = [...categories];
    newCategories[catIndex].subCategories[subCatIndex].activities = newCategories[catIndex].subCategories[subCatIndex].activities.filter((_, i) => i !== activityIndex);
    setCategories(newCategories);
  };

  const handleSubmit = async (formData: FormData) => {
    setIsLoading(true)
    try {
      formData.append('categories', JSON.stringify(categories));
      // 使用北京时间
      const beijingTime = getBeijingTime();
      formData.append('timestamp', beijingTime.toISOString());
      await createLog(formData)
      const form = document.getElementById('log-form') as HTMLFormElement
      form?.reset()
      setCategories(initialPresetCategories); // Reset categories state to initial simplified preset
    } catch (error) {
      console.error('创建日志失败:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="w-full max-w-none">
      {/* 移动端标签页导航 */}
      <div className="md:hidden mb-6">
        <div className="flex bg-gray-100 rounded-lg p-1">
          <button
            type="button"
            onClick={() => setActiveTab('basic')}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'basic'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            基本信息
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('activities')}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'activities'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            活动记录
          </button>
        </div>
      </div>

      <form id="log-form" action={handleSubmit} className="space-y-6">
        {/* PC端：左右分栏布局，移动端：标签页内容 */}
        <div className="md:grid md:grid-cols-2 md:gap-8">
          {/* 左侧：基本信息 */}
          <div className={`space-y-6 ${activeTab === 'basic' ? 'block' : 'hidden md:block'}`}>
            <div>
              <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-2">
                日志内容 (可选)
              </label>
              <textarea
                id="content"
                name="content"
                rows={6}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                placeholder="记录今天做了什么，有什么收获或感受..."
              />
            </div>

            <div>
              <label htmlFor="questId" className="block text-sm font-medium text-gray-700 mb-2">
                关联任务
              </label>
              <select
                id="questId"
                name="questId"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">无关联任务</option>
                {/* activeQuests.map((quest) => ( */}
                  {/* <option key={quest.id} value={quest.id}> */}
                    {/* {quest.title} */}
                  {/* </option> */}
                {/* ))} */}
              </select>
            </div>
          </div>

          {/* 右侧：活动记录 */}
          <div className={`space-y-6 ${activeTab === 'activities' ? 'block' : 'hidden md:block'}`}>
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-800">记录活动</h3>
              {categories.map((category, catIndex) => (
                <div key={catIndex} className="space-y-3 p-4 border border-gray-200 rounded-lg bg-gray-50 relative group">
                  <button 
                    type="button" 
                    onClick={() => removeCategory(catIndex)} 
                    className="absolute top-2 right-2 p-1 text-red-500 hover:text-red-700 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    ✕
                  </button>
                  <input
                    type="text"
                    value={category.name}
                    onChange={(e) => handleCategoryChange(catIndex, e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-md font-medium bg-white"
                    placeholder="分类名称 (例如：价值产出)"
                  />

                  {category.subCategories.map((subCategory: LogSubCategory, subCatIndex: number) => (
                    <div key={subCatIndex} className="space-y-2 pl-4 border-l-2 border-blue-200 relative group">
                      <button 
                        type="button" 
                        onClick={() => removeSubCategory(catIndex, subCatIndex)} 
                        className="absolute top-0 right-0 p-1 text-red-500 hover:text-red-700 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        ✕
                      </button>
                      <input
                        type="text"
                        value={subCategory.name}
                        onChange={(e) => handleSubCategoryChange(catIndex, subCatIndex, e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white"
                        placeholder="子分类名称 (例如：核心工作)"
                      />

                      {subCategory.activities.map((activity: LogActivity, activityIndex: number) => (
                        <div key={activityIndex} className="flex gap-2 items-center relative group">
                          <button 
                            type="button" 
                            onClick={() => removeActivity(catIndex, subCatIndex, activityIndex)} 
                            className="absolute top-0 right-0 p-1 text-red-500 hover:text-red-700 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            ✕
                          </button>
                          <input
                            type="text"
                            value={activity.name}
                            onChange={(e) => handleActivityChange(catIndex, subCatIndex, activityIndex, 'name', e.target.value)}
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white"
                            placeholder="具体事务 (例如：项目A)"
                          />
                          <input
                            type="text"
                            value={activity.duration}
                            onChange={(e) => handleActivityChange(catIndex, subCatIndex, activityIndex, 'duration', e.target.value)}
                            className="w-20 md:w-24 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white"
                            placeholder="耗时"
                          />
                        </div>
                      ))}
                      <button 
                        type="button" 
                        onClick={() => addActivity(catIndex, subCatIndex)} 
                        className="mt-2 w-full bg-gray-200 hover:bg-gray-300 text-gray-800 py-1 px-3 rounded-md text-sm transition-colors"
                      >
                        + 添加事务
                      </button>
                    </div>
                  ))}
                  <button 
                    type="button" 
                    onClick={() => addSubCategory(catIndex)} 
                    className="mt-2 w-full bg-gray-200 hover:bg-gray-300 text-gray-800 py-1 px-3 rounded-md text-sm transition-colors"
                  >
                    + 添加子分类
                  </button>
                </div>
              ))}
              <button 
                type="button" 
                onClick={addCategory} 
                className="w-full bg-blue-500/10 text-blue-400 py-2 px-4 rounded-md font-medium hover:bg-blue-500/20 transition-colors"
              >
                + 添加分类
              </button>
            </div>
          </div>
        </div>

        {/* 提交按钮 */}
        <div className="pt-6 border-t border-gray-200">
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-blue-500 hover:bg-blue-600 text-white py-3 px-4 rounded-md font-medium disabled:opacity-50 transition-colors"
          >
            {isLoading ? '保存中...' : '保存日志'}
          </button>
        </div>
      </form>
    </div>
  )
}


