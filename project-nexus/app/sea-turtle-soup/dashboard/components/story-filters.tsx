'use client';

import { Input } from '@/app/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select';

interface StoryFiltersProps {
  onFilterChange: (filters: {
    search?: string;
    theme?: string;
    status?: string;
  }) => void;
}

export default function StoryFilters({ onFilterChange }: StoryFiltersProps) {
  return (
    <div className="card-mystery p-4 rounded-lg flex flex-col sm:flex-row gap-4">
      <Input
        placeholder="按标题搜索..."
        className="w-full sm:flex-1 input-mystery"
        onChange={(e) => onFilterChange({ search: e.target.value })}
      />
      <div className="flex gap-4">
        <Select onValueChange={(value) => onFilterChange({ theme: value })}>
          <SelectTrigger className="w-full sm:w-[180px] input-mystery">
            <SelectValue placeholder="筛选主题" />
          </SelectTrigger>
          <SelectContent className="card-mystery">
            <SelectItem value="all">所有主题</SelectItem>
            <SelectItem value="怪谈">怪谈</SelectItem>
            <SelectItem value="悬疑">悬疑</SelectItem>
            <SelectItem value="日常">日常</SelectItem>
            <SelectItem value="其他">其他</SelectItem>
          </SelectContent>
        </Select>
        <Select onValueChange={(value) => onFilterChange({ status: value })}>
          <SelectTrigger className="w-full sm:w-[180px] input-mystery">
            <SelectValue placeholder="筛选状态" />
          </SelectTrigger>
          <SelectContent className="card-mystery">
            <SelectItem value="all">所有状态</SelectItem>
            <SelectItem value="unplayed">未玩</SelectItem>
            <SelectItem value="completed">已完成</SelectItem>
            <SelectItem value="favorited">已收藏</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
