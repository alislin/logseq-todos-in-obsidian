import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { BlockIndexManager } from '../src/BlockIndex';
import { DEFAULT_SETTINGS } from '../src/TodoItem';
import { App, TFile, TFolder, TAbstractFile } from 'obsidian';

describe('BlockIndexManager', () => {
    describe('cleanLine', () => {
        let blockIndex: BlockIndexManager;
        const mockApp = { vault: {} } as unknown as App;
        
        beforeEach(() => {
            blockIndex = new BlockIndexManager(mockApp, () => DEFAULT_SETTINGS);
        });

        it('should clean dash prefix', () => {
            expect(blockIndex.cleanLine('- TODO 任务')).toBe('任务');
        });

        it('should clean asterisk prefix', () => {
            expect(blockIndex.cleanLine('* DOING 任务')).toBe('任务');
        });

        it('should clean plus prefix', () => {
            expect(blockIndex.cleanLine('+ LATER 任务')).toBe('任务');
        });

        it('should clean NOW status', () => {
            expect(blockIndex.cleanLine('NOW 任务内容')).toBe('任务内容');
        });

        it('should clean DOING status', () => {
            expect(blockIndex.cleanLine('DOING 任务内容')).toBe('任务内容');
        });

        it('should clean lowercase status', () => {
            expect(blockIndex.cleanLine('todo 任务内容')).toBe('任务内容');
        });

        it('should clean id:: attribute', () => {
            expect(blockIndex.cleanLine('id:: abc123-def456')).toBe('');
        });

        it('should clean SCHEDULED', () => {
            expect(blockIndex.cleanLine('SCHEDULED: <2026-03-28 Sat>')).toBe('');
        });

        it('should clean DEADLINE', () => {
            expect(blockIndex.cleanLine('DEADLINE: <2026-03-30 Sun>')).toBe('');
        });

        it('should clean block reference', () => {
            expect(blockIndex.cleanLine('((abc123-def456))')).toBe('');
        });

        it('should clean multiple block references', () => {
            expect(blockIndex.cleanLine('((uuid1)) ((uuid2)) 文本')).toBe('文本');
        });

        it('should clean combined task line', () => {
            const input = '- TODO 任务 #P1 SCHEDULED: <2026-03-28 Sat> id:: abc123';
            expect(blockIndex.cleanLine(input)).toBe('任务 #P1');
        });

        it('should preserve plain text', () => {
            expect(blockIndex.cleanLine('普通文本内容')).toBe('普通文本内容');
        });

        it('should preserve tags', () => {
            expect(blockIndex.cleanLine('任务 #项目A #重要')).toBe('任务 #项目A #重要');
        });

        it('should handle empty input', () => {
            expect(blockIndex.cleanLine('')).toBe('');
        });
    });

    describe('UUID pattern in cleanLine', () => {
        let blockIndex: BlockIndexManager;
        const mockApp = { vault: {} } as unknown as App;
        
        beforeEach(() => {
            blockIndex = new BlockIndexManager(mockApp, () => DEFAULT_SETTINGS);
        });

        it('should match standard UUID format in block ref', () => {
            expect(blockIndex.cleanLine('((69c64ebc-2e04-42a8-8d17-3964b78b9dac))')).toBe('');
        });

        it('should match short UUID in block ref', () => {
            expect(blockIndex.cleanLine('((abc123))')).toBe('');
        });

        it('should match alphanumeric UUID in block ref', () => {
            expect(blockIndex.cleanLine('((uuid-001))')).toBe('');
        });

        it('should match standard UUID in id::', () => {
            expect(blockIndex.cleanLine('id:: 69c64ebc-2e04-42a8-8d17-3964b78b9dac')).toBe('');
        });

        it('should match short UUID in id::', () => {
            expect(blockIndex.cleanLine('id:: abc123')).toBe('');
        });

        it('should match alphanumeric UUID in id::', () => {
            expect(blockIndex.cleanLine('id:: uuid-001')).toBe('');
        });
    });

    describe('getLocation and getIndexSize', () => {
        it('should return null for non-existent uuid', () => {
            const mockApp = { vault: {} } as unknown as App;
            const blockIndex = new BlockIndexManager(mockApp, () => DEFAULT_SETTINGS);
            
            expect(blockIndex.getLocation('non-existent-uuid')).toBeNull();
        });

        it('should return 0 for empty index', () => {
            const mockApp = { vault: {} } as unknown as App;
            const blockIndex = new BlockIndexManager(mockApp, () => DEFAULT_SETTINGS);
            
            expect(blockIndex.getIndexSize()).toBe(0);
        });
    });

    describe('isReady', () => {
        it('should return false before buildIndex', () => {
            const mockApp = { vault: {} } as unknown as App;
            const blockIndex = new BlockIndexManager(mockApp, () => DEFAULT_SETTINGS);
            
            expect(blockIndex.isReady()).toBe(false);
        });
    });

    describe('buildIndex deduplication', () => {
        it('should reuse existing index promise', async () => {
            const getAbstractFileByPath = vi.fn(() => null);
            const getAllLoadedFiles = vi.fn(() => []);
            
            const mockApp = {
                vault: {
                    getAbstractFileByPath,
                    getAllLoadedFiles,
                    read: vi.fn()
                }
            } as unknown as App;
            
            const blockIndex = new BlockIndexManager(mockApp, () => DEFAULT_SETTINGS);
            
            const promise1 = blockIndex.buildIndex();
            const promise2 = blockIndex.buildIndex();
            
            await promise1;
            await promise2;
            
            expect(getAbstractFileByPath).toHaveBeenCalledTimes(2);
            expect(blockIndex.isReady()).toBe(true);
        });
    });

    describe('updateForFile path validation logic', () => {
        it('should use isValidLogseqContentPath for validation - journals accepted', async () => {
            const readMock = vi.fn(() => Promise.resolve('- TODO 任务\n  id:: test-uuid'));
            
            const mockApp = {
                vault: {
                    read: readMock,
                    getAbstractFileByPath: vi.fn(() => null),
                    getAllLoadedFiles: vi.fn(() => [])
                }
            } as unknown as App;
            
            const settings = {
                ...DEFAULT_SETTINGS,
                logseqPaths: ['工作日志'],
                journalsPath: 'journals',
                pagesPath: 'pages'
            };
            
            const blockIndex = new BlockIndexManager(mockApp, () => settings);
            await blockIndex.buildIndex();
            
            const mockFile = Object.assign(new TFile(), {
                path: '工作日志/journals/2026_03_28.md',
                extension: 'md',
                basename: '2026_03_28',
                name: '2026_03_28.md'
            });
            
            await blockIndex.updateForFile(mockFile);
            
            expect(readMock).toHaveBeenCalled();
        });

        it('should use isValidLogseqContentPath for validation - backup rejected', async () => {
            const readMock = vi.fn(() => Promise.resolve('- TODO 备份任务\n  id:: backup-uuid'));
            
            const mockApp = {
                vault: {
                    read: readMock,
                    getAbstractFileByPath: vi.fn(() => null),
                    getAllLoadedFiles: vi.fn(() => [])
                }
            } as unknown as App;
            
            const settings = {
                ...DEFAULT_SETTINGS,
                logseqPaths: ['工作日志'],
                journalsPath: 'journals',
                pagesPath: 'pages'
            };
            
            const blockIndex = new BlockIndexManager(mockApp, () => settings);
            await blockIndex.buildIndex();
            
            const mockFile = Object.assign(new TFile(), {
                path: '工作日志/logseq/bak/journals/2026_03_27/backup.md',
                extension: 'md',
                basename: 'backup',
                name: 'backup.md'
            });
            
            await blockIndex.updateForFile(mockFile);
            
            expect(readMock).not.toHaveBeenCalled();
            expect(blockIndex.getIndexSize()).toBe(0);
        });
    });

});

class MockTFile extends TFile {
    constructor(path: string) {
        super();
        this.path = path;
        this.extension = 'md';
        this.basename = path.split('/').pop()?.replace('.md', '') || '';
        this.name = path.split('/').pop() || '';
    }
}