import { App, TFile, TAbstractFile } from 'obsidian';
import {
	TodoItem,
	TodoStatus,
	Priority,
	STATUS_ORDER,
	LogseqSettings
} from './TodoItem';

export class LogseqParser {
	private app: App;
	private settings: LogseqSettings;

	private taskPattern = /^([-*]\s*)(NOW|DOING|LATER|TODO|DONE|CANCELLED)\s+(.+)$/im;
	private idPattern = /id::\s*([^\s]+)/;
	private scheduledPattern = /SCHEDULED:\s*<([^>]+)>/i;
	private deadlinePattern = /DEADLINE:\s*<([^>]+)>/i;
	private priorityPattern = /#(P[0-2])\b/;
	private tagPattern = /#([^\s#]+)/g;
	private blockRefPattern = /\(\(([a-f0-9-]+)\)\)/g;
	private journalDatePattern = /^(\d{4})_(\d{2})_(\d{2})\.md$/;

	constructor(app: App, settings: LogseqSettings) {
		this.app = app;
		this.settings = settings;
	}

	async parseAllTodos(): Promise<TodoItem[]> {
		const allTodos: TodoItem[] = [];

		const journalsPath = `${this.settings.logseqPath}/${this.settings.journalsPath}`;
		const pagesPath = `${this.settings.logseqPath}/${this.settings.pagesPath}`;

		const journalFiles = await this.getMarkdownFiles(journalsPath);
		for (const file of journalFiles) {
			const todos = await this.parseFile(file, journalsPath);
			allTodos.push(...todos);
		}

		const pageFiles = await this.getMarkdownFiles(pagesPath);
		for (const file of pageFiles) {
			const todos = await this.parseFile(file, pagesPath);
			allTodos.push(...todos);
		}

		return this.filterAndSort(allTodos);
	}

	private async getMarkdownFiles(basePath: string): Promise<TFile[]> {
		try {
			const folder = this.app.vault.getAbstractFileByPath(basePath);
			if (!folder) {
				return [];
			}
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
			// Ignore permission errors
		}
	}

	private async parseFile(file: TFile, basePath: string): Promise<TodoItem[]> {
		try {
			const content = await this.app.vault.read(file);
			const lines = content.split('\n');
			const todos: TodoItem[] = [];

			const pageName = this.extractPageName(file.path, basePath);
			const journalDate = this.extractJournalDate(file.name);

			for (let i = 0; i < lines.length; i++) {
				const line = lines[i];
				const todo = this.parseLine(line, file.path, i + 1, pageName, journalDate);
				if (todo) {
					todos.push(todo);
				}
			}

			return todos;
		} catch {
			return [];
		}
	}

	private parseLine(
		line: string,
		filePath: string,
		lineNumber: number,
		pageName: string,
		journalDate: string | null
	): TodoItem | null {
		const match = line.match(this.taskPattern);
		if (!match) return null;

		const [, bullet, statusStr, restContent] = match;
		const status = statusStr.toUpperCase() as TodoStatus;
		const content = restContent.trim();

		const idMatch = content.match(this.idPattern);
		const id = idMatch ? idMatch[1] : this.generateId(filePath, lineNumber);

		const scheduled = this.extractFirst(content, this.scheduledPattern);
		const deadline = this.extractFirst(content, this.deadlinePattern);
		const priority = this.extractPriority(content);

		const tags = this.extractTags(content);
		const blockRefs = this.extractBlockRefs(content);

		const rawContent = content
			.replace(this.idPattern, '')
			.replace(this.scheduledPattern, '')
			.replace(this.deadlinePattern, '')
			.replace(this.blockRefPattern, '')
			.trim();

		return {
			id,
			content: rawContent,
			status,
			priority,
			pageName,
			filePath,
			lineNumber,
			journalDate,
			scheduled,
			deadline,
			tags,
			blockRefs,
			children: [],
			parent: null
		};
	}

	private extractFirst(content: string, pattern: RegExp): string | null {
		const match = content.match(pattern);
		return match ? match[1].trim() : null;
	}

	private extractPriority(content: string): Priority {
		const match = content.match(this.priorityPattern);
		return match ? (match[1] as Priority) : null;
	}

	private extractTags(content: string): string[] {
		const tags: string[] = [];
		const pattern = new RegExp(this.tagPattern.source, 'g');
		let match;
		while ((match = pattern.exec(content)) !== null) {
			const tag = match[1];
			if (!tag.startsWith('P') || !/^P[0-2]$/.test(tag)) {
				tags.push(tag);
			}
		}
		return [...new Set(tags)];
	}

	private extractBlockRefs(content: string): string[] {
		const refs: string[] = [];
		let match;
		while ((match = this.blockRefPattern.exec(content)) !== null) {
			refs.push(match[1]);
		}
		return refs;
	}

	private extractPageName(filePath: string, basePath: string): string {
		const relative = filePath.replace(basePath + '/', '').replace('.md', '');
		return relative.replace(/^\d{4}_\d{2}_\d{2}\//, '');
	}

	private extractJournalDate(fileName: string): string | null {
		const match = fileName.match(this.journalDatePattern);
		if (match) {
			return `${match[1]}-${match[2]}-${match[3]}`;
		}
		return null;
	}

	private generateId(filePath: string, lineNumber: number): string {
		return `${filePath}:${lineNumber}`.split('').reduce((a, b) => {
			a = ((a << 5) - a) + b.charCodeAt(0);
			return a & a;
		}, 0).toString(16);
	}

	private filterAndSort(todos: TodoItem[]): TodoItem[] {
		let filtered = todos.filter(t => this.settings.enabledStatuses.includes(t.status));

		filtered.sort((a, b) => {
			if (this.settings.sortBy === 'status') {
				const statusDiff = STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
				if (statusDiff !== 0) return statusDiff;
			}

			if (this.settings.sortBy === 'date' && a.journalDate && b.journalDate) {
				const dateDiff = a.journalDate.localeCompare(b.journalDate);
				if (dateDiff !== 0) return dateDiff;
			}

			return a.content.localeCompare(b.content);
		});

		return filtered;
	}

	buildTree(todos: TodoItem[]): TodoItem[] {
		const itemMap = new Map<string, TodoItem>();
		const rootItems: TodoItem[] = [];

		for (const todo of todos) {
			itemMap.set(todo.id, { ...todo, children: [], parent: null });
		}

		for (const todo of todos) {
			const item = itemMap.get(todo.id)!;
			const parentLine = todo.lineNumber - 1;

			if (parentLine > 0) {
				const parentItem = todos.find(t =>
					t.filePath === todo.filePath &&
					t.lineNumber < todo.lineNumber &&
					t.lineNumber === parentLine
				);

				if (parentItem && itemMap.has(parentItem.id)) {
					const parent = itemMap.get(parentItem.id)!;
					item.parent = parent;
					parent.children.push(item);
				} else {
					rootItems.push(item);
				}
			} else {
				rootItems.push(item);
			}
		}

		return rootItems;
	}

	groupByStatus(todos: TodoItem[]): Map<TodoStatus, TodoItem[]> {
		const groups = new Map<TodoStatus, TodoItem[]>();

		for (const status of this.settings.enabledStatuses) {
			groups.set(status, []);
		}

		for (const todo of todos) {
			const list = groups.get(todo.status);
			if (list) {
				list.push(todo);
			}
		}

		return groups;
	}
}