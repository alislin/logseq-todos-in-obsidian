import { App, ItemView, WorkspaceLeaf, debounce, TFile } from 'obsidian';
import { LogseqTodosPlugin } from './main';
import { TodoItem, TodoStatus, STATUS_ICONS, STATUS_COLORS, STATUS_ORDER } from './TodoItem';
import { LogseqParser } from './LogseqParser';

export const VIEW_TYPE_LOGSEQ_TODOS = 'logseq-todos-view';

export class TodoView extends ItemView {
	private plugin: LogseqTodosPlugin;
	private parser: LogseqParser;
	private todos: TodoItem[] = [];
	private searchInput: HTMLInputElement | null = null;
	private refreshButton: HTMLElement | null = null;
	private statusGroups: Map<TodoStatus, TodoItem[]> = new Map();
	private filterStatuses: Set<TodoStatus> = new Set();

	constructor(leaf: WorkspaceLeaf, plugin: LogseqTodosPlugin) {
		super(leaf);
		this.plugin = plugin;
		this.parser = new LogseqParser(this.app, this.plugin.settings);
		this.filterStatuses = new Set(this.plugin.settings.enabledStatuses);
	}

	getViewType(): string {
		return VIEW_TYPE_LOGSEQ_TODOS;
	}

	getDisplayText(): string {
		return 'Logseq Todos';
	}

	async onOpen(): Promise<void> {
		this.render();
		await this.loadTodos();
	}

	async onClose(): Promise<void> {
		this.contentEl.empty();
	}

	private render(): void {
		const container = this.containerEl.children[1] as HTMLElement;
		container.empty();
		container.classList.add('logseq-todos-container');

		this.renderHeader(container);
		this.renderSearchBar(container);
		this.renderContent(container);
	}

	private renderHeader(container: HTMLElement): void {
		const header = container.createDiv('logseq-todos-header');
		header.createEl('h2', { text: 'Logseq Todos' });

		this.refreshButton = header.createEl('button', {
			cls: 'logseq-todos-refresh-btn'
		});
		this.refreshButton.innerHTML = '↻';
		this.refreshButton.addEventListener('click', async () => {
			await this.loadTodos();
		});
	}

	private renderSearchBar(container: HTMLElement): void {
		const searchBar = container.createDiv('logseq-todos-search');
		this.searchInput = searchBar.createEl('input', {
			type: 'text',
			placeholder: 'Search todos...',
			cls: 'logseq-todos-search-input'
		});
		this.searchInput.addEventListener('input', debounce(() => {
			this.renderTodoList();
		}, 200));
	}

	private renderContent(container: HTMLElement): void {
		const content = container.createDiv('logseq-todos-content');

		const statusBar = content.createDiv('logseq-todos-status-bar');
		this.renderStatusFilters(statusBar);

		this.renderTodoList();
	}

	private renderStatusFilters(container: HTMLElement): void {
		const allStatuses: TodoStatus[] = ['NOW', 'DOING', 'LATER', 'TODO', 'DONE', 'CANCELLED'];

		for (const status of allStatuses) {
			if (!this.plugin.settings.enabledStatuses.includes(status)) continue;

			const btn = container.createEl('button', {
				cls: `logseq-todos-filter-btn ${this.filterStatuses.has(status) ? 'active' : ''}`,
				attr: { 'data-status': status }
			});
			btn.style.setProperty('--status-color', STATUS_COLORS[status]);
			btn.textContent = `${STATUS_ICONS[status]} ${status}`;
			btn.addEventListener('click', () => {
				if (this.filterStatuses.has(status)) {
					this.filterStatuses.delete(status);
				} else {
					this.filterStatuses.add(status);
				}
				btn.classList.toggle('active');
				this.renderTodoList();
			});
		}
	}

	private renderTodoList(): void {
		const content = this.containerEl.children[1].querySelector('.logseq-todos-content');
		if (!content) return;

		let listContainer = content.querySelector('.logseq-todos-list');
		if (!listContainer) {
			listContainer = content.createDiv('logseq-todos-list');
		} else {
			listContainer.empty();
		}

		const searchTerm = this.searchInput?.value?.toLowerCase() || '';
		let filteredTodos = this.todos.filter(todo => {
			if (!this.filterStatuses.has(todo.status)) return false;
			if (searchTerm && !todo.content.toLowerCase().includes(searchTerm)) return false;
			return true;
		});

		this.statusGroups = this.parser.groupByStatus(filteredTodos);

		const sortedStatuses = this.plugin.settings.enabledStatuses
			.filter((s): s is TodoStatus => this.filterStatuses.has(s))
			.sort((a, b) => STATUS_ORDER[a] - STATUS_ORDER[b]);

		for (const status of sortedStatuses) {
			const items = this.statusGroups.get(status) || [];
			if (items.length === 0) continue;

			const groupEl = this.renderStatusGroup(listContainer as HTMLElement, status, items);
			(listContainer as HTMLElement).appendChild(groupEl);
		}

		if ((listContainer as HTMLElement).children.length === 0) {
			(listContainer as HTMLElement).createEl('div', {
				text: 'No todos found',
				cls: 'logseq-todos-empty'
			});
		}
	}

	private renderStatusGroup(container: HTMLElement, status: TodoStatus, items: TodoItem[]): HTMLElement {
		const group = container.createDiv('logseq-todos-group');
		group.style.setProperty('--status-color', STATUS_COLORS[status]);

		const header = group.createDiv('logseq-todos-group-header');
		const icon = header.createSpan('logseq-todos-group-icon');
		icon.textContent = STATUS_ICONS[status];
		
		const title = header.createSpan('logseq-todos-group-title');
		title.textContent = status;
		
		const count = header.createSpan('logseq-todos-group-count');
		count.textContent = `(${items.length})`;

		const list = group.createDiv('logseq-todos-group-items');
		for (const todo of items) {
			const itemEl = this.renderTodoItem(list, todo);
			list.appendChild(itemEl);
		}

		return group;
	}

	private renderTodoItem(container: HTMLElement, todo: TodoItem): HTMLElement {
		const item = container.createDiv('logseq-todos-item');
		item.dataset.id = todo.id;

		const meta = item.createDiv('logseq-todos-item-meta');

		if (todo.journalDate) {
			const dateSpan = meta.createSpan('logseq-todos-item-date');
			dateSpan.textContent = todo.journalDate;
		} else {
			const pageSpan = meta.createSpan('logseq-todos-item-page');
			pageSpan.textContent = todo.pageName;
		}

		const content = item.createDiv('logseq-todos-item-content');

		const statusBadge = content.createSpan('logseq-todos-item-status');
		statusBadge.style.color = STATUS_COLORS[todo.status];
		statusBadge.textContent = STATUS_ICONS[todo.status];

		const textSpan = content.createSpan('logseq-todos-item-text');
		textSpan.textContent = todo.content;

		if (this.plugin.settings.showPriority && todo.priority) {
			const prioritySpan = content.createSpan('logseq-todos-item-priority');
			prioritySpan.textContent = `#${todo.priority}`;
			prioritySpan.className = `logseq-priority-${todo.priority.toLowerCase()}`;
		}

		if (todo.tags.length > 0) {
			const tagsSpan = content.createSpan('logseq-todos-item-tags');
			for (const tag of todo.tags.slice(0, 3)) {
				const tagSpan = tagsSpan.createSpan('logseq-todos-item-tag');
				tagSpan.textContent = `#${tag}`;
			}
		}

		if (this.plugin.settings.showScheduled && (todo.scheduled || todo.deadline)) {
			const timeSpan = item.createDiv('logseq-todos-item-time');
			if (todo.scheduled) {
				const scheduledSpan = timeSpan.createSpan('logseq-todos-item-scheduled');
				scheduledSpan.textContent = `📅 ${todo.scheduled}`;
			}
			if (todo.deadline) {
				const deadlineSpan = timeSpan.createSpan('logseq-todos-item-deadline');
				deadlineSpan.textContent = `⏰ ${todo.deadline}`;
			}
		}

		item.addEventListener('click', async () => {
			await this.navigateToTodo(todo);
		});

		return item;
	}

	private async navigateToTodo(todo: TodoItem): Promise<void> {
		const file = this.app.vault.getAbstractFileByPath(todo.filePath);
		if (file instanceof TFile) {
			const leaf = this.app.workspace.getLeaf('tab');
			await leaf.openFile(file);
		}
	}

	async loadTodos(): Promise<void> {
		if (this.refreshButton) {
			this.refreshButton.classList.add('loading');
		}

		try {
			this.parser = new LogseqParser(this.app, this.plugin.settings);
			this.todos = await this.parser.parseAllTodos();
			this.renderTodoList();
		} catch (error) {
			console.error('Failed to load todos:', error);
		} finally {
			if (this.refreshButton) {
				this.refreshButton.classList.remove('loading');
			}
		}
	}

	async refresh(): Promise<void> {
		await this.loadTodos();
	}
}