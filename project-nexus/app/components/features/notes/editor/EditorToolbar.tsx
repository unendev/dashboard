import { Button } from '@/app/components/ui/button'
import { Save, Maximize2 } from 'lucide-react'

interface EditorToolbarProps {
  lastSaved: Date | null;
  isSaving: boolean;
  onFullscreen: () => void;
  onSave: () => void;
}

export function EditorToolbar({
  lastSaved,
  isSaving,
  onFullscreen,
  onSave
}: EditorToolbarProps) {
  return (
    <div className="flex items-center justify-end gap-2 text-sm text-gray-400 my-2 flex-shrink-0 px-2">
      {lastSaved && <span>已保存 {lastSaved.toLocaleTimeString()}</span>}
      {isSaving && <span className="text-blue-400">保存中...</span>}
      <div className="ml-auto flex gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={onFullscreen}
          title="全屏编辑"
        >
          <Maximize2 className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onSave}
          disabled={isSaving}
        >
          <Save className="h-4 w-4 mr-1" />
          {isSaving ? '保存中...' : '保存'}
        </Button>
      </div>
    </div>
  );
}
