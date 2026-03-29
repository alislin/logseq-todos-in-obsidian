import { describe, it, expect } from 'vitest';
import { normalizePath, isPathInLogseqDirs, parseMultiplePaths, isValidLogseqContentPath } from '../src/PathUtils';

describe('PathUtils', () => {
    describe('normalizePath', () => {
        it('should convert backslashes to forward slashes', () => {
            expect(normalizePath('folder\\subfolder\\file.md')).toBe('folder/subfolder/file.md');
        });

        it('should remove trailing slashes', () => {
            expect(normalizePath('folder/subfolder/')).toBe('folder/subfolder');
        });

        it('should remove leading slashes', () => {
            expect(normalizePath('/folder/subfolder')).toBe('folder/subfolder');
        });

        it('should handle consecutive slashes (only removes leading/trailing)', () => {
            expect(normalizePath('folder//subfolder')).toBe('folder//subfolder');
        });

        it('should handle mixed slashes (backslash to forward slash)', () => {
            expect(normalizePath('folder\\subfolder\\file.md')).toBe('folder/subfolder/file.md');
        });

        it('should handle empty path', () => {
            expect(normalizePath('')).toBe('');
        });

        it('should handle single character path', () => {
            expect(normalizePath('a')).toBe('a');
        });

        it('should preserve relative path structure', () => {
            expect(normalizePath('工作日志/journals/2024_01_15.md')).toBe('工作日志/journals/2024_01_15.md');
        });
    });

    describe('isPathInLogseqDirs', () => {
        it('should return true for exact match', () => {
            expect(isPathInLogseqDirs('工作日志', ['工作日志'])).toBe(true);
        });

        it('should return true for subdirectory', () => {
            expect(isPathInLogseqDirs('工作日志/journals', ['工作日志'])).toBe(true);
        });

        it('should return true for nested file', () => {
            expect(isPathInLogseqDirs('工作日志/journals/2024_01_15.md', ['工作日志'])).toBe(true);
        });

        it('should return false for different directory', () => {
            expect(isPathInLogseqDirs('其他目录/file.md', ['工作日志'])).toBe(false);
        });

        it('should handle multiple logseq paths', () => {
            expect(isPathInLogseqDirs('项目笔记/pages/task.md', ['工作日志', '项目笔记'])).toBe(true);
        });

        it('should return false when no paths provided', () => {
            expect(isPathInLogseqDirs('工作日志/file.md', [])).toBe(false);
        });

        it('should return false for empty file path', () => {
            expect(isPathInLogseqDirs('', ['工作日志'])).toBe(false);
        });

        it('should ignore empty entries in paths array', () => {
            expect(isPathInLogseqDirs('工作日志/file.md', ['', '工作日志'])).toBe(true);
        });

        it('should handle path with different separator style', () => {
            expect(isPathInLogseqDirs('工作日志\\journals\\file.md', ['工作日志'])).toBe(true);
        });

        it('should not match partial directory name', () => {
            expect(isPathInLogseqDirs('工作日志备份/file.md', ['工作日志'])).toBe(false);
        });
    });

    describe('parseMultiplePaths', () => {
        it('should split by newline', () => {
            expect(parseMultiplePaths('工作日志\n项目笔记')).toEqual(['工作日志', '项目笔记']);
        });

        it('should split by comma', () => {
            expect(parseMultiplePaths('工作日志, 项目笔记')).toEqual(['工作日志', '项目笔记']);
        });

        it('should split by comma without space', () => {
            expect(parseMultiplePaths('工作日志,项目笔记')).toEqual(['工作日志', '项目笔记']);
        });

        it('should handle mixed separators', () => {
            expect(parseMultiplePaths('工作日志\n项目笔记, 其他')).toEqual(['工作日志', '项目笔记', '其他']);
        });

        it('should trim whitespace', () => {
            expect(parseMultiplePaths('  工作日志  \n  项目笔记  ')).toEqual(['工作日志', '项目笔记']);
        });

        it('should filter empty entries', () => {
            expect(parseMultiplePaths('工作日志\n\n项目笔记')).toEqual(['工作日志', '项目笔记']);
        });

        it('should handle empty input', () => {
            expect(parseMultiplePaths('')).toEqual([]);
        });

        it('should handle whitespace only input', () => {
            expect(parseMultiplePaths('   \n   ')).toEqual([]);
        });

        it('should handle single path', () => {
            expect(parseMultiplePaths('工作日志')).toEqual(['工作日志']);
        });
    });

    describe('isValidLogseqContentPath', () => {
        const logseqPaths = ['工作日志'];
        const journalsPath = 'journals';
        const pagesPath = 'pages';

        it('should return true for file in journals directory', () => {
            expect(isValidLogseqContentPath('工作日志/journals/2026_03_28.md', logseqPaths, journalsPath, pagesPath)).toBe(true);
        });

        it('should return true for file in pages directory', () => {
            expect(isValidLogseqContentPath('工作日志/pages/task.md', logseqPaths, journalsPath, pagesPath)).toBe(true);
        });

        it('should return true for nested file in journals', () => {
            expect(isValidLogseqContentPath('工作日志/journals/2026/2026_03_28.md', logseqPaths, journalsPath, pagesPath)).toBe(true);
        });

        it('should return false for file in backup directory (logseq/bak)', () => {
            expect(isValidLogseqContentPath('工作日志/logseq/bak/journals/2026_03_27/backup.md', logseqPaths, journalsPath, pagesPath)).toBe(false);
        });

        it('should return false for file in logseq root directory', () => {
            expect(isValidLogseqContentPath('工作日志/logseq/config.edn', logseqPaths, journalsPath, pagesPath)).toBe(false);
        });

        it('should return false for file in root logseq directory', () => {
            expect(isValidLogseqContentPath('工作日志/file.md', logseqPaths, journalsPath, pagesPath)).toBe(false);
        });

        it('should return false for file outside logseq directory', () => {
            expect(isValidLogseqContentPath('其他目录/journals/file.md', logseqPaths, journalsPath, pagesPath)).toBe(false);
        });

        it('should return false for empty file path', () => {
            expect(isValidLogseqContentPath('', logseqPaths, journalsPath, pagesPath)).toBe(false);
        });

        it('should return false for empty logseq paths', () => {
            expect(isValidLogseqContentPath('工作日志/journals/file.md', [], journalsPath, pagesPath)).toBe(false);
        });

        it('should handle multiple logseq paths', () => {
            const multiPaths = ['工作日志', '项目笔记'];
            expect(isValidLogseqContentPath('项目笔记/pages/task.md', multiPaths, journalsPath, pagesPath)).toBe(true);
            expect(isValidLogseqContentPath('项目笔记/logseq/bak/file.md', multiPaths, journalsPath, pagesPath)).toBe(false);
        });

        it('should handle different path separators', () => {
            expect(isValidLogseqContentPath('工作日志\\journals\\2026_03_28.md', logseqPaths, journalsPath, pagesPath)).toBe(true);
        });

        it('should not match partial directory name in journals', () => {
            expect(isValidLogseqContentPath('工作日志/journals_backup/file.md', logseqPaths, journalsPath, pagesPath)).toBe(false);
        });

        it('should not match partial directory name in pages', () => {
            expect(isValidLogseqContentPath('工作日志/pages_backup/file.md', logseqPaths, journalsPath, pagesPath)).toBe(false);
        });
    });
});