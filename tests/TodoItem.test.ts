import { describe, it, expect } from 'vitest';
import { 
    TodoStatus, 
    Priority, 
    DEFAULT_SETTINGS, 
    STATUS_ORDER, 
    STATUS_ICONS, 
    STATUS_COLORS 
} from '../src/TodoItem';

describe('TodoItem', () => {
    describe('TodoStatus type', () => {
        it('should have correct status values', () => {
            const validStatuses: TodoStatus[] = ['NOW', 'DOING', 'LATER', 'TODO', 'DONE', 'CANCELLED'];
            expect(validStatuses.length).toBe(6);
        });
    });

    describe('Priority type', () => {
        it('should have correct priority values', () => {
            const validPriorities: Priority[] = ['P0', 'P1', 'P2', null];
            expect(validPriorities.length).toBe(4);
        });
    });

    describe('STATUS_ORDER', () => {
        it('should have NOW as highest priority', () => {
            expect(STATUS_ORDER['NOW']).toBe(0);
        });

        it('should have CANCELLED as lowest priority', () => {
            expect(STATUS_ORDER['CANCELLED']).toBe(5);
        });

        it('should have correct ascending order', () => {
            expect(STATUS_ORDER['NOW']).toBeLessThan(STATUS_ORDER['DOING']);
            expect(STATUS_ORDER['DOING']).toBeLessThan(STATUS_ORDER['LATER']);
            expect(STATUS_ORDER['LATER']).toBeLessThan(STATUS_ORDER['TODO']);
            expect(STATUS_ORDER['TODO']).toBeLessThan(STATUS_ORDER['DONE']);
            expect(STATUS_ORDER['DONE']).toBeLessThan(STATUS_ORDER['CANCELLED']);
        });

        it('should have order for all statuses', () => {
            const statuses: TodoStatus[] = ['NOW', 'DOING', 'LATER', 'TODO', 'DONE', 'CANCELLED'];
            for (const status of statuses) {
                expect(STATUS_ORDER[status]).toBeDefined();
                expect(typeof STATUS_ORDER[status]).toBe('number');
            }
        });
    });

    describe('STATUS_ICONS', () => {
        it('should have icon for all statuses', () => {
            const statuses: TodoStatus[] = ['NOW', 'DOING', 'LATER', 'TODO', 'DONE', 'CANCELLED'];
            for (const status of statuses) {
                expect(STATUS_ICONS[status]).toBeDefined();
                expect(STATUS_ICONS[status].length).toBeGreaterThan(0);
            }
        });

        it('should have unique icons for different statuses', () => {
            const icons = Object.values(STATUS_ICONS);
            const uniqueIcons = new Set(icons);
            expect(uniqueIcons.size).toBe(6);
        });
    });

    describe('STATUS_COLORS', () => {
        it('should have color for all statuses', () => {
            const statuses: TodoStatus[] = ['NOW', 'DOING', 'LATER', 'TODO', 'DONE', 'CANCELLED'];
            for (const status of statuses) {
                expect(STATUS_COLORS[status]).toBeDefined();
                expect(STATUS_COLORS[status].length).toBeGreaterThan(0);
            }
        });

        it('should use CSS variables for colors', () => {
            const statuses: TodoStatus[] = ['NOW', 'DOING', 'LATER', 'TODO', 'DONE', 'CANCELLED'];
            for (const status of statuses) {
                expect(STATUS_COLORS[status]).toContain('var(--logseq');
            }
        });

        it('should have fallback colors', () => {
            expect(STATUS_COLORS['NOW']).toContain('#3b82f6');
            expect(STATUS_COLORS['DONE']).toContain('#22c55e');
            expect(STATUS_COLORS['CANCELLED']).toContain('#ef4444');
        });
    });

    describe('DEFAULT_SETTINGS', () => {
        it('should have valid default values', () => {
            expect(DEFAULT_SETTINGS.logseqPaths).toBeDefined();
            expect(DEFAULT_SETTINGS.journalsPath).toBeDefined();
            expect(DEFAULT_SETTINGS.pagesPath).toBeDefined();
            expect(DEFAULT_SETTINGS.enabledStatuses).toBeDefined();
            expect(DEFAULT_SETTINGS.refreshInterval).toBeDefined();
            expect(DEFAULT_SETTINGS.sortBy).toBeDefined();
            expect(DEFAULT_SETTINGS.showScheduled).toBeDefined();
            expect(DEFAULT_SETTINGS.showPriority).toBeDefined();
            expect(DEFAULT_SETTINGS.sidebarPosition).toBeDefined();
        });

        it('should have valid default logseq path', () => {
            expect(DEFAULT_SETTINGS.logseqPaths).toContain('工作日志');
        });

        it('should have valid default journal and pages paths', () => {
            expect(DEFAULT_SETTINGS.journalsPath).toBe('journals');
            expect(DEFAULT_SETTINGS.pagesPath).toBe('pages');
        });

        it('should have all statuses enabled by default', () => {
            expect(DEFAULT_SETTINGS.enabledStatuses.length).toBe(6);
            const statuses: TodoStatus[] = ['NOW', 'DOING', 'LATER', 'TODO', 'DONE', 'CANCELLED'];
            for (const status of statuses) {
                expect(DEFAULT_SETTINGS.enabledStatuses).toContain(status);
            }
        });

        it('should have valid refresh interval', () => {
            expect(DEFAULT_SETTINGS.refreshInterval).toBe(30);
            expect(DEFAULT_SETTINGS.refreshInterval).toBeGreaterThan(0);
        });

        it('should have valid sort option', () => {
            expect(['status', 'date', 'title']).toContain(DEFAULT_SETTINGS.sortBy);
        });

        it('should show scheduled and priority by default', () => {
            expect(DEFAULT_SETTINGS.showScheduled).toBe(true);
            expect(DEFAULT_SETTINGS.showPriority).toBe(true);
        });

        it('should have valid sidebar position', () => {
            expect(['left', 'right']).toContain(DEFAULT_SETTINGS.sidebarPosition);
            expect(DEFAULT_SETTINGS.sidebarPosition).toBe('right');
        });
    });
});