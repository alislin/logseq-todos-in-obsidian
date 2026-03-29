import { App, TFile, TAbstractFile } from 'obsidian';
import { LogseqSettings } from './TodoItem';
import { isPathInLogseqDirs } from './PathUtils';

interface BlockLocation {
    uuid: string;
    filePath: string;
    lineNumber: number;
    firstLine: string;
}

export class BlockIndexManager {
    private app: App;
    private getSettings: () => LogseqSettings;
    
    private index: Map<string, BlockLocation> = new Map();
    private contentCache: Map<string, string[]> = new Map();
    private maxCacheSize: number = 100;
    
    private isIndexed: boolean = false;
    private indexPromise: Promise<void> | null = null;
    
    constructor(app: App, getSettings: () => LogseqSettings) {
        this.app = app;
        this.getSettings = getSettings;
    }
    
    async buildIndex(): Promise<void> {
        if (this.indexPromise) return this.indexPromise;
        
        this.indexPromise = this.doBuildIndex();
        return this.indexPromise;
    }
    
    private async doBuildIndex(): Promise<void> {
        const settings = this.getSettings();
        this.index.clear();
        this.contentCache.clear();
        
        for (const logseqPath of settings.logseqPaths) {
            if (!logseqPath) continue;
            
            const journalsPath = `${logseqPath}/${settings.journalsPath}`;
            const pagesPath = `${logseqPath}/${settings.pagesPath}`;
            
            await this.indexDirectory(journalsPath);
            await this.indexDirectory(pagesPath);
        }
        
        this.isIndexed = true;
    }
    
    private async indexDirectory(basePath: string): Promise<void> {
        const files = await this.getMarkdownFiles(basePath);
        
        for (const file of files) {
            await this.indexFile(file);
        }
    }
    
    private async getMarkdownFiles(basePath: string): Promise<TFile[]> {
        try {
            const folder = this.app.vault.getAbstractFileByPath(basePath);
            if (!folder) return [];
            
            if (folder instanceof TFile) {
                return folder.extension === 'md' ? [folder] : [];
            }
            
            const files: TFile[] = [];
            this.collectFiles(folder, files);
            return files.filter(f => f.extension === 'md');
        } catch {
            return [];
        }
    }
    
    private collectFiles(folder: TAbstractFile, files: TFile[]): void {
        try {
            const children = this.app.vault.getAllLoadedFiles();
            for (const child of children) {
                if (child instanceof TFile && child.extension === 'md') {
                    if (child.path.startsWith(folder.path + '/') || child.path === folder.path) {
                        files.push(child);
                    }
                }
            }
        } catch {
        }
    }
    
    private async indexFile(file: TFile): Promise<void> {
        try {
            const content = await this.app.vault.read(file);
            const lines = content.split('\n');
            
            const uuidPattern = /id::\s*([a-f0-9-]+)/i;
            const blockRefPattern = /\(\(([a-f0-9-]+)\)\)/;
            
            for (let i = 0; i < lines.length; i++) {
                const line = lines[i];
                
                const idMatch = line.match(uuidPattern);
                if (idMatch) {
                    const uuid = idMatch[1];
                    const prevLine = i > 0 ? this.cleanLine(lines[i - 1]) : '';
                    
                    this.index.set(uuid, {
                        uuid,
                        filePath: file.path,
                        lineNumber: i,
                        firstLine: prevLine
                    });
                }
                
                const refMatch = line.match(blockRefPattern);
                if (refMatch) {
                    const uuid = refMatch[1];
                    const cleanedLine = this.cleanLine(line);
                    
                    this.index.set(uuid, {
                        uuid,
                        filePath: file.path,
                        lineNumber: i,
                        firstLine: cleanedLine
                    });
                }
            }
        } catch {
        }
    }
    
    private cleanLine(line: string): string {
        return line
            .replace(/^[-*+]\s*/, '')
            .replace(/^(NOW|DOING|LATER|TODO|DONE|CANCELLED)\s+/i, '')
            .replace(/id::\s*[a-f0-9-]+/i, '')
            .replace(/SCHEDULED:\s*<[^>]+>/gi, '')
            .replace(/DEADLINE:\s*<[^>]+>/gi, '')
            .replace(/\(\([a-f0-9-]+\)\)/g, '')
            .trim();
    }
    
    getLocation(uuid: string): BlockLocation | null {
        return this.index.get(uuid) || null;
    }
    
    async getFullContent(uuid: string): Promise<string[]> {
        if (this.contentCache.has(uuid)) {
            return this.contentCache.get(uuid)!;
        }
        
        const location = this.index.get(uuid);
        if (!location) return [];
        
        const file = this.app.vault.getAbstractFileByPath(location.filePath);
        if (!(file instanceof TFile)) return [];
        
        try {
            const content = await this.app.vault.read(file);
            const lines = content.split('\n');
            
            const idLineIndex = location.lineNumber;
            let startLine = idLineIndex;
            
            if (lines[idLineIndex]?.match(/id::\s*[a-f0-9-]+/i)) {
                startLine = idLineIndex - 1;
            }
            
            if (startLine < 0 || startLine >= lines.length) {
                return [location.firstLine];
            }
            
            const baseIndentMatch = lines[startLine]?.match(/^(\s*)/);
            const baseIndent = baseIndentMatch ? baseIndentMatch[1].length : 0;
            
            let endLine = startLine + 1;
            
            while (endLine < lines.length) {
                const line = lines[endLine];
                const lineIndentMatch = line.match(/^(\s*)/);
                const lineIndent = lineIndentMatch ? lineIndentMatch[1].length : 0;
                
                if (line.trim() === '') {
                    endLine++;
                    continue;
                }
                
                if (lineIndent <= baseIndent) break;
                
                endLine++;
            }
            
            const blockLines: string[] = [];
            for (let i = startLine; i < endLine && i < lines.length; i++) {
                const rawLine = lines[i];
                if (!rawLine.match(/id::\s*[a-f0-9-]+/i)) {
                    blockLines.push(rawLine);
                }
            }
            
            if (blockLines.length === 0) {
                blockLines.push(location.firstLine);
            }
            
            if (this.contentCache.size >= this.maxCacheSize) {
                const firstKey = this.contentCache.keys().next().value;
                if (firstKey) this.contentCache.delete(firstKey);
            }
            this.contentCache.set(uuid, blockLines);
            
            return blockLines;
        } catch {
            return [location.firstLine];
        }
    }
    
    async updateForFile(file: TFile): Promise<void> {
        for (const [uuid, loc] of this.index.entries()) {
            if (loc.filePath === file.path) {
                this.index.delete(uuid);
                this.contentCache.delete(uuid);
            }
        }
        
        if (isPathInLogseqDirs(file.path, this.getSettings().logseqPaths)) {
            await this.indexFile(file);
        }
    }
    
    isReady(): boolean {
        return this.isIndexed;
    }
    
    getIndexSize(): number {
        return this.index.size;
    }
}