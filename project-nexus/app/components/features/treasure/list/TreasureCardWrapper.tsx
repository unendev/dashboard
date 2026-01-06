'use client'

import { TwitterStyleCard } from '../../widgets/TwitterStyleCard'

const CATEGORY_MAP: Record<string, { emoji: string, label: string }> = {
  'Life': { emoji: '🌱', label: '生活' },
  'Knowledge': { emoji: '📚', label: '知识' },
  'Thought': { emoji: '💭', label: '思考' },
  'Root': { emoji: '🌳', label: '根源' }
};

interface TreasureCardWrapperProps {
  treasure: any;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}

export function TreasureCardWrapper({
  treasure,
  onEdit,
  onDelete
}: TreasureCardWrapperProps) {
  // 提取主要分类
  const getPrimaryCategories = () => {
    let categories: string[] = [];
    if (treasure.theme && Array.isArray(treasure.theme)) {
      categories = treasure.theme
        .map((t: string) => t.charAt(0).toUpperCase() + t.slice(1))
        .filter((t: string) => CATEGORY_MAP[t]);
    }
    if (categories.length === 0) {
      const found = treasure.tags.find((tag: string) => CATEGORY_MAP[tag]);
      if (found) categories = [found];
    }
    return categories;
  };

  const primaryCategories = getPrimaryCategories();
  const firstCategory = primaryCategories[0] ? CATEGORY_MAP[primaryCategories[0]] : null;
  const labels = primaryCategories.map(cat => CATEGORY_MAP[cat]?.label || cat).join(' / ');

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-2 px-1">
        <div className="w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center bg-white/5 border border-white/10">
          {firstCategory ? (
            <span className="text-xl">{firstCategory.emoji}</span>
          ) : (
            <span className="text-white font-semibold text-sm">{treasure.title.charAt(0).toUpperCase()}</span>
          )}
        </div>
        <div className="flex flex-col min-w-0">
          <span className="text-sm font-medium text-white/90 truncate">
            {labels || '未分类'}
          </span>
          <span className="text-xs text-white/40">{new Date(treasure.createdAt).toLocaleString()}</span>
        </div>
      </div>
      <TwitterStyleCard
        treasure={treasure}
        onEdit={onEdit}
        onDelete={onDelete}
        hideCategoryAvatar={true}
      />
    </div>
  );
}
