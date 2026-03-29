import { vi } from 'vitest';

export class MockTFile {
    path: string;
    name: string;
    extension: string;
    basename: string;
    
    constructor(path: string) {
        this.path = path;
        this.name = path.split('/').pop() || '';
        this.extension = this.name.endsWith('.md') ? 'md' : '';
        this.basename = this.name.replace(/\.[^.]+$/, '');
    }
}

export class MockTFolder {
    path: string;
    name: string;
    children: any[] = [];
    
    constructor(path: string) {
        this.path = path;
        this.name = path.split('/').pop() || '';
    }
}

interface MockFileEntry {
    file: MockTFile | MockTFolder;
    content: string;
}

class MockVault {
    private files: Map<string, MockFileEntry>;
    
    constructor(files: Map<string, MockFileEntry>) {
        this.files = files;
    }
    
    getAbstractFileByPath(path: string): MockTFile | MockTFolder | null {
        const entry = this.files.get(path);
        if (entry) return entry.file;
        
        for (const [filePath, entry] of this.files) {
            if (filePath.startsWith(path + '/') || filePath === path) {
                return new MockTFolder(path);
            }
        }
        
        for (const [filePath] of this.files) {
            if (filePath.startsWith(path + '/')) {
                return new MockTFolder(path);
            }
        }
        
        return null;
    }
    
    async read(file: MockTFile): Promise<string> {
        const entry = this.files.get(file.path);
        return entry?.content || '';
    }
    
    getAllLoadedFiles(): (MockTFile | MockTFolder)[] {
        return Array.from(this.files.values()).map(e => e.file);
    }
}

export function createMockApp(files: Map<string, MockFileEntry> = new Map()) {
    const vault = new MockVault(files);
    return {
        vault,
        workspace: {
            getLeaf: () => ({
                openFile: async () => {},
                view: { editor: { setCursor: () => {} } }
            })
        }
    } as any;
}

export function createMockFileStructure(paths: string[]): Map<string, MockFileEntry> {
    const files = new Map<string, MockFileEntry>();
    
    for (const path of paths) {
        if (path.endsWith('.md')) {
            files.set(path, { file: new MockTFile(path), content: '' });
        } else {
            files.set(path, { file: new MockTFolder(path), content: '' });
        }
        
        const parts = path.split('/');
        for (let i = 1; i < parts.length; i++) {
            const folderPath = parts.slice(0, i).join('/');
            if (!files.has(folderPath)) {
                files.set(folderPath, { file: new MockTFolder(folderPath), content: '' });
            }
        }
    }
    
    return files;
}