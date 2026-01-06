

export type TagNode = {
    id: string;
    label: string;
    children: Map<string, TagNode>;
    treasures: string[]; // IDs
    count: number;
};

export type TimeNode = {
    id: string; // "2024", "2024-03"
    label: string;
    type: 'YEAR' | 'MONTH';
    children: Map<string, TimeNode>;
    treasures: string[];
    count: number;
};

export const buildTagHierarchy = (treasures: any[], includeLegacy: boolean = true): Map<string, TagNode> => {
    const rootParams = new Map<string, TagNode>();

    treasures.forEach(t => {
        if (!t.tags || t.tags.length === 0) return;

        t.tags.forEach((tagPath: string) => {
            // Filter Legacy Logic:
            // If includeLegacy is false, we ONLY show tags starting with #领域 or #概念
            if (!includeLegacy) {
                if (!tagPath.startsWith('#领域/') && !tagPath.startsWith('#概念/')) {
                    return;
                }
            }

            const parts = tagPath.split('/');

            // Upsert Root
            const rootLabel = parts[0];
            if (!rootParams.has(rootLabel)) {
                rootParams.set(rootLabel, {
                    id: rootLabel,
                    label: rootLabel,
                    children: new Map(),
                    treasures: [],
                    count: 0
                });
            }

            let currentNode = rootParams.get(rootLabel)!;
            currentNode.count++;
            if (parts.length === 1) currentNode.treasures.push(t.id);

            // Traverse children
            for (let i = 1; i < parts.length; i++) {
                const part = parts[i];
                const currentPath = parts.slice(0, i + 1).join('/');

                if (!currentNode.children.has(part)) {
                    currentNode.children.set(part, {
                        id: part,
                        label: part,
                        children: new Map(),
                        treasures: [],
                        count: 0
                    });
                }
                currentNode = currentNode.children.get(part)!;
                currentNode.count++;
                if (i === parts.length - 1) currentNode.treasures.push(t.id);
            }
        });
    });

    return rootParams;
};

export const buildTimeHierarchy = (treasures: any[]): Map<string, TimeNode> => {
    const rootYears = new Map<string, TimeNode>();

    treasures.forEach(t => {
        const d = new Date(t.createdAt);
        if (isNaN(d.getTime())) return;

        const year = d.getFullYear().toString();
        const month = (d.getMonth() + 1).toString().padStart(2, '0');
        const monthKey = `${year}-${month}`;

        if (!rootYears.has(year)) {
            rootYears.set(year, {
                id: year,
                label: `${year}年`,
                type: 'YEAR',
                children: new Map(),
                treasures: [],
                count: 0
            });
        }

        const yearNode = rootYears.get(year)!;
        yearNode.count++;

        if (!yearNode.children.has(monthKey)) {
            yearNode.children.set(monthKey, {
                id: monthKey,
                label: `${month}月`,
                type: 'MONTH',
                children: new Map(),
                treasures: [],
                count: 0
            })
        }

        const monthNode = yearNode.children.get(monthKey)!;
        monthNode.count++;
        monthNode.treasures.push(t.id);
    });

    return rootYears;
}

export const buildThemeHierarchy = (treasures: any[]): Map<string, TagNode> => {
    // Similar to Tags but flat or simple hierarchy for Themes
    // Flatten logic for now
    const rootThemes = new Map<string, TagNode>();

    treasures.forEach(t => {
        let themes: string[] = [];
        if (Array.isArray(t.theme)) themes = t.theme;
        else if (typeof t.theme === 'string') themes = [t.theme];
        else themes = ['默认'];

        themes.forEach(theme => {
            if (!rootThemes.has(theme)) {
                rootThemes.set(theme, {
                    id: theme,
                    label: theme,
                    children: new Map(), // Themes usually flat, but structure kept for consistency
                    treasures: [],
                    count: 0
                });
            }
            const node = rootThemes.get(theme)!;
            node.count++;
            node.treasures.push(t.id);
        });
    });

    return rootThemes;
};
