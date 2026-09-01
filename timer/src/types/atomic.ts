export interface AtomicItem {
  id: string;
  rawText: string;
  title: string;
  tags: string[];          // e.g. ["#dev", "#bug"]
  obsidianLinks: string[]; // e.g. ["架构设计", "Daily/2026-08-31"]
  estimateMinutes?: number;// e.g. 25 from ~25m or 60 from ~1h
  completed: boolean;
  createdAt: number;
  completedAt?: number;
}

export type AtomicListType = 'pool' | 'now' | 'next';

export interface AtomicWorkspaceData {
  version: number;
  pool: AtomicItem[];
  nowFocus: AtomicItem | null;
  nextQueue: AtomicItem[];
  completedArchive?: AtomicItem[];
  obsidianVault: string;
}
