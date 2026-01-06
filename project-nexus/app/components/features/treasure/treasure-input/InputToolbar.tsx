import { Button } from '@/app/components/ui/button';
import { Paperclip, Sparkles, Image as ImageIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface InputToolbarProps {
  imagesCount: number;
  charCount: number;
  maxChars: number;
  isSubmitting: boolean;
  canSubmit: boolean;
  onCancel: () => void;
  onSubmit: () => void;
  onFileSelect: () => void;
  showAiToggle?: boolean;
  skipAiTagging?: boolean;
  onToggleAiTagging?: () => void;
}

export function InputToolbar({
  imagesCount,
  charCount,
  maxChars,
  isSubmitting,
  canSubmit,
  onCancel,
  onSubmit,
  onFileSelect,
  showAiToggle = false,
  skipAiTagging = false,
  onToggleAiTagging
}: InputToolbarProps) {
  return (
    <div className="flex items-center justify-between pt-2 border-t border-gray-700">
      <div className="flex items-center gap-4 text-sm text-gray-400">
        <button
          type="button"
          onClick={onFileSelect}
          disabled={imagesCount >= 5}
          className={cn(
            "flex items-center gap-1.5 px-2 py-1 rounded hover:bg-gray-700 transition-colors",
            imagesCount >= 5 ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
          )}
          title="选择图片"
        >
          <ImageIcon className="h-4 w-4" />
          <span className="hidden sm:inline">选择图片</span>
        </button>

        {showAiToggle && onToggleAiTagging && (
          <button
            type="button"
            onClick={onToggleAiTagging}
            className={cn(
              "flex items-center gap-1.5 px-2 py-1 rounded hover:bg-gray-700 transition-colors",
              skipAiTagging && "text-gray-500"
            )}
            title="本次是否启用 AI 打标"
          >
            <Sparkles className="h-4 w-4" />
            <span className="hidden sm:inline">
              AI打标:{skipAiTagging ? '关' : '开'}
            </span>
          </button>
        )}
        
        <span className="flex items-center gap-1">
          <Paperclip className="h-4 w-4" />
          {imagesCount}/5
        </span>
        
        <span className={cn(
          "text-gray-400",
          charCount > maxChars * 0.9 && "text-orange-400 font-medium"
        )}>
          {charCount}/{maxChars}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="ghost"
          onClick={onCancel}
          disabled={isSubmitting}
          className="text-gray-400 hover:text-white hover:bg-gray-800"
        >
          取消
        </Button>
        
        <Button
          onClick={onSubmit}
          disabled={!canSubmit}
          className="bg-blue-600 hover:bg-blue-700 text-white gap-2"
        >
          {isSubmitting ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              <span>创建中...</span>
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" />
              <span>创建宝藏</span>
              <kbd className="hidden sm:inline-block px-1.5 py-0.5 bg-white/20 rounded text-xs ml-1">
                Ctrl+⏎
              </kbd>
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
