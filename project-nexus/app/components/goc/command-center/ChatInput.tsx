"use client";

import { Bot, Paperclip, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useOssUpload } from "@/app/hooks/useOssUpload";
import { useState, useRef } from "react";

interface ChatInputProps {
  inputRef: React.RefObject<HTMLInputElement | null>;
  onSendMessage: (text: string, attachments: string[]) => void;
  isLoading: boolean;
  aiModeEnabled: boolean;
  setAiModeEnabled: (enabled: boolean) => void;
}

export const ChatInput = ({
  onSendMessage,
  isLoading,
  aiModeEnabled,
  setAiModeEnabled
}: ChatInputProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [attachments, setAttachments] = useState<string[]>([]);
  const { upload, isUploading } = useOssUpload();

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      try {
        const { signedUrl } = await upload(file);
        if (signedUrl) {
          setAttachments(prev => [...prev, signedUrl]);
        }
      } catch (error) {
        console.error("Upload failed", error);
      }
      // Reset input
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (isUploading) return;

    const text = inputRef.current?.value || '';
    if (!text.trim() && attachments.length === 0) return;

    onSendMessage(text, attachments);

    // Clear state
    if (inputRef.current) inputRef.current.value = '';
    setAttachments([]);
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };
  return (
    <div className="p-4 border-t border-zinc-800 bg-[#0a0a0a]">
      {/* Image Previews */}
      {attachments.length > 0 && (
        <div className="flex gap-3 mb-3 overflow-x-auto pb-1 scrollbar-hide">
          {attachments.map((url, i) => (
            <div key={i} className="relative group shrink-0 animate-in fade-in zoom-in duration-200">
              <img src={url} alt="preview" className="h-20 w-20 object-cover rounded-lg border border-zinc-700/50 shadow-xl" />
              <button
                onClick={() => removeAttachment(i)}
                className="absolute -top-2 -right-2 bg-zinc-900/90 hover:bg-red-500 text-white rounded-full p-1 shadow-xl border border-zinc-700 transition-all"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex gap-2 relative items-end">
        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          accept="image/*"
          onChange={handleFileSelect}
        />

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isLoading || isUploading}
          className="p-3 rounded bg-zinc-800 border border-zinc-700 text-zinc-400 hover:text-zinc-200 transition-colors disabled:opacity-50"
        >
          {isUploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Paperclip className="w-5 h-5" />}
        </button>

        <input
          ref={inputRef}
          placeholder={aiModeEnabled ? "向 AI 发送指令..." : "群聊消息... (@AI 可触发 AI)"}
          className="flex-1 bg-zinc-900 border border-zinc-700 rounded p-3 text-zinc-100 focus:outline-none focus:border-cyan-500 transition-colors placeholder:text-zinc-600"
          disabled={isLoading}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSubmit();
            }
          }}
          onPaste={async (e) => {
            const items = e.clipboardData?.items;
            if (!items) return;

            for (let i = 0; i < items.length; i++) {
              if (items[i].type.indexOf('image') !== -1) {
                const file = items[i].getAsFile();
                if (file) {
                  try {
                    const { signedUrl } = await upload(file);
                    if (signedUrl) {
                      setAttachments(prev => [...prev, signedUrl]);
                    }
                  } catch (error) {
                    console.error("Paste upload failed", error);
                  }
                }
              }
            }
          }}
        />

        {/* AI 模式切换按钮 */}
        <button
          type="button"
          onClick={() => setAiModeEnabled(!aiModeEnabled)}
          className={cn(
            "h-[46px] w-[46px] flex items-center justify-center rounded font-bold transition-all border text-xs shrink-0",
            aiModeEnabled
              ? "bg-cyan-900/80 border-cyan-600 text-cyan-100"
              : "bg-zinc-800 border-zinc-700 text-zinc-500 hover:text-zinc-300"
          )}
          title={aiModeEnabled ? "AI 模式：所有消息发给 AI" : "聊天模式：普通群聊"}
        >
          <Bot className={cn("w-5 h-5", aiModeEnabled && "text-cyan-400")} />
        </button>

        <button
          type="submit"
          disabled={isLoading || isUploading}
          className="h-[46px] bg-cyan-900 hover:bg-cyan-800 text-cyan-100 px-6 rounded font-bold transition-colors border border-cyan-700 disabled:opacity-50 shrink-0"
        >
          {isLoading ? '...' : 'SEND'}
        </button>
      </form>
    </div>
  );
};
