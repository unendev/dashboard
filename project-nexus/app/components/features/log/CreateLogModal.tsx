'use client'

import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/app/components/ui/dialog';
import CreateLogFormWithCards from './CreateLogFormWithCards';

interface CreateLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogSaved?: () => void;
  onAddToTimer?: (taskName: string, categoryPath: string, date: string, initialTime?: number, instanceTagNames?: string) => Promise<void>;
  initialCategory?: string; // 初始分类路径（用于复制任务）
  selectedDate?: string;
}

const CreateLogModal: React.FC<CreateLogModalProps> = ({ 
  isOpen, 
  onClose, 
  onLogSaved, 
  onAddToTimer,
  initialCategory,
  selectedDate
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[95vw] max-w-4xl md:w-auto max-h-[95vh] md:max-h-[90vh] overflow-y-auto mx-auto px-3 md:px-6 py-4 md:py-6">
        <DialogHeader>
          <DialogTitle className="text-lg md:text-xl font-semibold flex items-center gap-2">
            📝 创建事物
          </DialogTitle>
        </DialogHeader>
        <div className="mt-3 md:mt-4 pb-4">
          <CreateLogFormWithCards 
            onLogSaved={onLogSaved}
            onAddToTimer={onAddToTimer}
            initialCategory={initialCategory}
            selectedDate={selectedDate}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CreateLogModal;
