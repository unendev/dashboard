'use client'
// components/LogCategorySelector.tsx
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card'; // 假设你有一个Card组件库
import { Button } from '@/app/components/ui/button'; // 假设你有一个Button组件库
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/app/components/ui/dialog'; // 假设你有一个Dialog组件库
import { Input } from '@/app/components/ui/input'; // 假设你有一个Input组件库
import { Textarea } from '@/app/components/ui/textarea'; // 假设你有一个Textarea组件库
// TODO: 确认Button组件的variant属性是否正确识别



interface Category {
  category: string;
  subcategories: string[];
}

interface LogCategorySelectorProps {
  onLogSaved?: () => void; // 添加一个新的 prop
}

const LogCategorySelector: React.FC<LogCategorySelectorProps> = ({ onLogSaved }) => { // 接收 prop
  const [categories, setCategories] = useState<Category[]>([]);
  const [showDialog, setShowDialog] = useState(false);
  const [selectedLog, setSelectedLog] = useState<{ category: string; subcategory: string; content: string }> ({
    category: '',
    subcategory: '',
    content: '',
  });


  useEffect(() => {
    // 异步加载分类数据
    const loadCategories = async () => {
      try {
        const response = await fetch('/api/log-categories'); // 创建一个API路由来读取json文件
        const data = await response.json();
        setCategories(data);
      } catch (error) {
        console.error('Failed to load categories:', error);
      }
    };
    loadCategories();
  }, []);

  const handleSubcategoryClick = (category: string, subcategory: string) => {
    setSelectedLog({ category, subcategory, content: '' });
    setShowDialog(true);
  };

  const handleLogSubmit = async () => {
    try {
      const response = await fetch('/api/logs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(selectedLog),
      });

      if (!response.ok) {
        throw new Error('Failed to save log');
      }

      const result = await response.json();
      console.log('日志保存成功:', result);

      setShowDialog(false);
      setSelectedLog({ category: '', subcategory: '', content: '' }); // 重置
      if (onLogSaved) {
        onLogSaved();
      }
    } catch (error) {
      console.error('保存日志失败:', error);
      // TODO: 可以显示一个错误提示给用户
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {categories.map((cat) => (
        <Card key={cat.category} className="shadow-md">
          <CardHeader>
            <CardTitle>{cat.category}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {cat.subcategories.map((subcat) => (
                <Button
                  key={subcat}
                  variant="ghost"
                  className="w-full justify-start"
                  onClick={() => handleSubcategoryClick(cat.category, subcat)}
                >
                  {subcat}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>记录事项</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="category" className="text-right">
                分类
              </label>
              <Input
                id="category"
                defaultValue={selectedLog.category}
                readOnly
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="subcategory" className="text-right">
                子分类
              </label>
              <Input
                id="subcategory"
                defaultValue={selectedLog.subcategory}
                readOnly
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="content" className="text-right">
                内容
              </label>
              <Textarea
                id="content"
                value={selectedLog.content}
                onChange={(e) => setSelectedLog({ ...selectedLog, content: e.target.value })}
                className="col-span-3"
                placeholder="请输入事项内容"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" onClick={handleLogSubmit}>
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LogCategorySelector;



