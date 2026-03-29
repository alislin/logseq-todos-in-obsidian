export function normalizePath(path: string): string {
    return path.replace(/\\/g, '/').replace(/\/+$/, '').replace(/^\/+/, '');
}

export function isPathInLogseqDirs(filePath: string, logseqPaths: string[]): boolean {
    if (!filePath || logseqPaths.length === 0) {
        return false;
    }

    const normalizedFile = normalizePath(filePath);

    for (const basePath of logseqPaths) {
        if (!basePath) continue;
        
        const normalizedBase = normalizePath(basePath);

        if (normalizedFile === normalizedBase) {
            return true;
        }

        if (normalizedFile.startsWith(normalizedBase + '/')) {
            return true;
        }
    }

    return false;
}

export function parseMultiplePaths(input: string): string[] {
    return input
        .split(/[\n,]+/)
        .map(p => p.trim())
        .filter(p => p.length > 0);
}

export function isValidLogseqContentPath(
    filePath: string,
    logseqPaths: string[],
    journalsPath: string,
    pagesPath: string
): boolean {
    if (!filePath || logseqPaths.length === 0) {
        return false;
    }

    const normalizedFile = normalizePath(filePath);

    for (const basePath of logseqPaths) {
        if (!basePath) continue;
        
        const normalizedBase = normalizePath(basePath);
        const journalsDir = `${normalizedBase}/${journalsPath}`;
        const pagesDir = `${normalizedBase}/${pagesPath}`;

        if (normalizedFile.startsWith(journalsDir + '/') || normalizedFile === journalsDir) {
            return true;
        }

        if (normalizedFile.startsWith(pagesDir + '/') || normalizedFile === pagesDir) {
            return true;
        }
    }

    return false;
}