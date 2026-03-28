export type TodoStatus = 'NOW' | 'DOING' | 'LATER' | 'TODO' | 'DONE' | 'CANCELLED';

export type Priority = 'P0' | 'P1' | 'P2' | null;

export interface TodoItem {
	id: string;
	content: string;
	status: TodoStatus;
	priority: Priority;
	pageName: string;
	filePath: string;
	lineNumber: number;
	journalDate: string | null;
	scheduled: string | null;
	deadline: string | null;
	tags: string[];
	blockRefs: string[];
	children: TodoItem[];
	parent: TodoItem | null;
}

export interface LogseqSettings {
	logseqPath: string;
	journalsPath: string;
	pagesPath: string;
	enabledStatuses: TodoStatus[];
	refreshInterval: number;
	sortBy: 'status' | 'date' | 'title';
	showScheduled: boolean;
	showPriority: boolean;
	sidebarPosition: 'right' | 'left';
}

export const DEFAULT_SETTINGS: LogseqSettings = {
	logseqPath: '工作日志',
	journalsPath: 'journals',
	pagesPath: 'pages',
	enabledStatuses: ['NOW', 'DOING', 'LATER', 'TODO', 'DONE', 'CANCELLED'],
	refreshInterval: 30,
	sortBy: 'status',
	showScheduled: true,
	showPriority: true,
	sidebarPosition: 'right'
};

export const STATUS_ORDER: Record<TodoStatus, number> = {
	'NOW': 0,
	'DOING': 1,
	'LATER': 2,
	'TODO': 3,
	'DONE': 4,
	'CANCELLED': 5
};

export const STATUS_ICONS: Record<TodoStatus, string> = {
	'NOW': '🔨',
	'DOING': '🔄',
	'LATER': '📅',
	'TODO': '📋',
	'DONE': '✅',
	'CANCELLED': '❌'
};

export const STATUS_COLORS: Record<TodoStatus, string> = {
	'NOW': 'var(--logseq-now-color, #3b82f6)',
	'DOING': 'var(--logseq-doing-color, #eab308)',
	'LATER': 'var(--logseq-later-color, #f97316)',
	'TODO': 'var(--logseq-todo-color, #6b7280)',
	'DONE': 'var(--logseq-done-color, #22c55e)',
	'CANCELLED': 'var(--logseq-cancelled-color, #ef4444)'
};