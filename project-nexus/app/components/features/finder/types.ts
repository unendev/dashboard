export type FinderDimension = 'TIME' | 'TAGS' | 'THEMES' | 'ORPHANS';

export interface FinderColumnItem {
    id: string;
    label: string;
    count: number;
    hasChildren: boolean;
}

export interface FinderState {
    dimension: FinderDimension;
    path: string[];
    selectedTreasureId: string | null;
}

export interface FinderColumn {
    id: string;
    items: any[];
}
