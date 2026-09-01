import React, { useState } from 'react';
import { X, Save, FolderOpen, HelpCircle } from 'lucide-react';

interface ObsidianVaultModalProps {
  isOpen: boolean;
  currentVault: string;
  onClose: () => void;
  onSave: (vault: string) => void;
}

export const ObsidianVaultModal: React.FC<ObsidianVaultModalProps> = ({
  isOpen,
  currentVault,
  onClose,
  onSave,
}) => {
  const [vaultName, setVaultName] = useState(currentVault);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(vaultName.trim());
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-[#1a1a1e] border border-zinc-700 rounded-xl shadow-2xl p-4 flex flex-col gap-3">
        <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
          <div className="flex items-center gap-2 text-purple-400">
            <FolderOpen size={16} />
            <h3 className="text-xs font-bold text-white">配置 Obsidian Vault</h3>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-white transition-colors"
          >
            <X size={14} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-medium text-zinc-300">
              Obsidian 仓库名称 (Vault Name)
            </label>
            <input
              type="text"
              value={vaultName}
              onChange={(e) => setVaultName(e.target.value)}
              placeholder="例如: novel 或 D:\HaveToTool\obsidianRoom\novel"
              className="bg-[#121215] border border-zinc-700 rounded-lg px-3 py-1.5 text-xs text-white placeholder-zinc-600 outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500/30"
              autoFocus
            />
            <p className="text-[10px] text-zinc-500 flex items-start gap-1 mt-1 leading-normal">
              <HelpCircle size={12} className="shrink-0 mt-0.5" />
              <span>已默认配置为用户的 <strong>novel</strong> 知识库。支持填入仓库名称或绝对路径目录。</span>
            </p>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
            >
              取消
            </button>
            <button
              type="submit"
              className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-purple-600 hover:bg-purple-500 text-white flex items-center gap-1 shadow-md shadow-purple-950 transition-all"
            >
              <Save size={12} />
              <span>保存配置</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
