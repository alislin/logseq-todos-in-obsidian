import { describe, it, expect } from 'vitest';
import { LogseqParser } from '../src/LogseqParser';
import { DEFAULT_SETTINGS, TodoStatus, TodoItem } from '../src/TodoItem';

function createMockTodo(overrides: Partial<TodoItem> = {}): TodoItem {
    return {
        id: 'test-id',
        content: 'Test task',
        status: 'NOW',
        priority: null,
        pageName: 'test',
        filePath: 'test.md',
        lineNumber: 1,
        journalDate: null,
        scheduled: null,
        deadline: null,
        tags: [],
        blockRefs: [],
        children: [],
        parent: null,
        ...overrides
    };
}

describe('LogseqParser', () => {
    const createParser = () => {
        return new LogseqParser({} as any, DEFAULT_SETTINGS);
    };

    describe('groupByStatus', () => {
        it('should group todos by status', () => {
            const parser = createParser();
            const todos: TodoItem[] = [
                createMockTodo({ id: '1', status: 'NOW', content: 'Task 1' }),
                createMockTodo({ id: '2', status: 'DOING', content: 'Task 2' }),
                createMockTodo({ id: '3', status: 'NOW', content: 'Task 3' }),
                createMockTodo({ id: '4', status: 'LATER', content: 'Task 4' })
            ];
            
            const groups = parser.groupByStatus(todos);
            
            expect(groups.get('NOW')?.length).toBe(2);
            expect(groups.get('DOING')?.length).toBe(1);
            expect(groups.get('LATER')?.length).toBe(1);
        });

        it('should create empty groups for statuses without tasks', () => {
            const parser = createParser();
            const todos: TodoItem[] = [
                createMockTodo({ status: 'NOW' })
            ];
            
            const groups = parser.groupByStatus(todos);
            
            expect(groups.get('DOING')?.length).toBe(0);
            expect(groups.get('TODO')?.length).toBe(0);
        });

        it('should respect enabled statuses in groups', () => {
            const parser = new LogseqParser({} as any, {
                ...DEFAULT_SETTINGS,
                enabledStatuses: ['NOW', 'DONE']
            });
            
            const todos: TodoItem[] = [
                createMockTodo({ status: 'NOW' }),
                createMockTodo({ status: 'DONE' })
            ];
            
            const groups = parser.groupByStatus(todos);
            
            expect(groups.has('NOW')).toBe(true);
            expect(groups.has('DONE')).toBe(true);
            expect(groups.has('DOING')).toBe(false);
        });
    });

    describe('buildTree', () => {
        it('should build flat list when no hierarchy', () => {
            const parser = createParser();
            const todos: TodoItem[] = [
                createMockTodo({ id: 'id1', content: 'Task 1', lineNumber: 1, filePath: 'test.md' }),
                createMockTodo({ id: 'id2', content: 'Task 2', lineNumber: 3, filePath: 'test.md' }),
                createMockTodo({ id: 'id3', content: 'Task 3', lineNumber: 5, filePath: 'test.md' })
            ];
            
            const tree = parser.buildTree(todos);
            
            expect(tree.length).toBe(3);
        });

        it('should handle empty todos', () => {
            const parser = createParser();
            const tree = parser.buildTree([]);
            expect(tree.length).toBe(0);
        });

        it('should preserve todo properties in tree', () => {
            const parser = createParser();
            const todos: TodoItem[] = [
                createMockTodo({ id: 'id1', content: 'Task 1', status: 'NOW', priority: 'P0' })
            ];
            
            const tree = parser.buildTree(todos);
            
            expect(tree[0].content).toBe('Task 1');
            expect(tree[0].status).toBe('NOW');
            expect(tree[0].priority).toBe('P0');
        });
    });

    describe('parseLine regex patterns', () => {
        it('should match NOW status', () => {
            const pattern = /^([-*]\s*)(NOW|DOING|LATER|TODO|DONE|CANCELLED)\s+(.+)$/im;
            const match = '- NOW Task content'.match(pattern);
            expect(match).not.toBeNull();
            expect(match?.[2]).toBe('NOW');
        });

        it('should match DOING status with asterisk', () => {
            const pattern = /^([-*]\s*)(NOW|DOING|LATER|TODO|DONE|CANCELLED)\s+(.+)$/im;
            const match = '* DOING Task content'.match(pattern);
            expect(match).not.toBeNull();
            expect(match?.[2]).toBe('DOING');
        });

        it('should match lowercase status', () => {
            const pattern = /^([-*]\s*)(NOW|DOING|LATER|TODO|DONE|CANCELLED)\s+(.+)$/im;
            const match = '- later Task content'.match(pattern);
            expect(match).not.toBeNull();
            expect(match?.[2].toUpperCase()).toBe('LATER');
        });

        it('should extract priority from content', () => {
            const pattern = /#(P[0-2])\b/;
            const match = 'Task content #P0'.match(pattern);
            expect(match).not.toBeNull();
            expect(match?.[1]).toBe('P0');
        });

        it('should extract scheduled date', () => {
            const pattern = /SCHEDULED:\s*<([^>]+)>/i;
            const match = 'Task SCHEDULED: <2024-01-15 Mon>'.match(pattern);
            expect(match).not.toBeNull();
            expect(match?.[1]).toBe('2024-01-15 Mon');
        });

        it('should extract deadline date', () => {
            const pattern = /DEADLINE:\s*<([^>]+)>/i;
            const match = 'Task DEADLINE: <2024-01-20 Sat>'.match(pattern);
            expect(match).not.toBeNull();
            expect(match?.[1]).toBe('2024-01-20 Sat');
        });

        it('should extract block references', () => {
            const pattern = /\(\(([a-f0-9-]+)\)\)/g;
            const text = 'Task ((abc123-def456)) and ((789abc-def))';
            const refs: string[] = [];
            let match;
            while ((match = pattern.exec(text)) !== null) {
                refs.push(match[1]);
            }
            expect(refs).toEqual(['abc123-def456', '789abc-def']);
        });

        it('should extract journal date from filename', () => {
            const pattern = /^(\d{4})_(\d{2})_(\d{2})\.md$/;
            const match = '2024_01_15.md'.match(pattern);
            expect(match).not.toBeNull();
            expect(`${match?.[1]}-${match?.[2]}-${match?.[3]}`).toBe('2024-01-15');
        });

        it('should not match non-journal filename', () => {
            const pattern = /^(\d{4})_(\d{2})_(\d{2})\.md$/;
            const match = 'project.md'.match(pattern);
            expect(match).toBeNull();
        });
    });
});