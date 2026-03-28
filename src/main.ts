import { App, Plugin, WorkspaceLeaf, setIcon, PluginManifest, TFile } from 'obsidian';
import { LogseqSettings, DEFAULT_SETTINGS } from './TodoItem';
import { TodoView, VIEW_TYPE_LOGSEQ_TODOS } from './TodoView';
import { LogseqRenderer } from './LogseqRenderer';
import { SettingsTab } from './SettingsTab';
import { setCurrentFilePath, setCurrentBlockIndex } from './EditorExtension';
import { BlockIndexManager } from './BlockIndex';

export class LogseqTodosPlugin extends Plugin {
	public settings: LogseqSettings;
	private todoView: TodoView | null = null;
	private renderer: LogseqRenderer | null = null;
	private blockIndex: BlockIndexManager | null = null;
	private refreshInterval: ReturnType<typeof setInterval> | null = null;

	constructor(app: App, manifest: PluginManifest) {
		super(app, manifest);
		this.settings = { ...DEFAULT_SETTINGS };
	}

	async onload(): Promise<void> {
		console.log('Logseq Todos plugin loading...');

		await this.loadSettings();

		this.blockIndex = new BlockIndexManager(this.app, () => this.settings);
		this.blockIndex.buildIndex().then(() => {
			console.log('Block index built:', this.blockIndex?.getIndexSize(), 'blocks');
			setCurrentBlockIndex(this.blockIndex);
		});

		this.registerEvent(this.app.vault.on('create', (file) => {
			if (file instanceof TFile && file.extension === 'md') {
				this.blockIndex?.updateForFile(file);
			}
		}));

		this.registerEvent(this.app.vault.on('modify', (file) => {
			if (file instanceof TFile && file.extension === 'md') {
				this.blockIndex?.updateForFile(file);
			}
		}));

		this.registerEvent(this.app.vault.on('delete', (file) => {
			if (file instanceof TFile && file.extension === 'md') {
				this.blockIndex?.updateForFile(file);
			}
		}));

		this.renderer = new LogseqRenderer(this, () => this.settings, this.blockIndex);
		this.renderer.register();

		this.addRibbonIcon('list-todo', 'Logseq Todos', async () => {
			await this.toggleView();
		});

		this.addCommand({
			id: 'toggle-logseq-todos',
			name: 'Toggle Logseq Todos View',
			callback: async () => {
				await this.toggleView();
			}
		});

		this.addCommand({
			id: 'refresh-logseq-todos',
			name: 'Refresh Logseq Todos',
			callback: async () => {
				await this.refreshTodos();
			}
		});

		this.registerView(
			VIEW_TYPE_LOGSEQ_TODOS,
			(leaf) => {
				this.todoView = new TodoView(leaf, this);
				return this.todoView;
			}
		);

		this.addSettingTab(new SettingsTab(this.app, this));

		this.setupAutoRefresh();

		this.registerEvent(this.app.workspace.on('file-open', (file) => {
			if (file) {
				setCurrentFilePath(file.path);
			} else {
				setCurrentFilePath('');
			}
		}));

		console.log('Logseq Todos plugin loaded successfully');
	}

	onunload(): void {
		console.log('Logseq Todos plugin unloading...');

		if (this.refreshInterval) {
			window.clearInterval(this.refreshInterval);
			this.refreshInterval = null;
		}

		if (this.renderer) {
			this.renderer.unregister();
			this.renderer = null;
		}

		this.todoView = null;
		this.blockIndex = null;
		console.log('Logseq Todos plugin unloaded');
	}

	async loadSettings(): Promise<void> {
		try {
			const loaded = await this.loadData();
			if (loaded) {
				if ((loaded as any).logseqPath && !loaded.logseqPaths) {
					this.settings = {
						...DEFAULT_SETTINGS,
						...loaded,
						logseqPaths: [(loaded as any).logseqPath]
					};
				} else {
					this.settings = {
						...DEFAULT_SETTINGS,
						...loaded
					};
				}
			}
		} catch (error) {
			console.error('Failed to load settings:', error);
			this.settings = { ...DEFAULT_SETTINGS };
		}
	}

	async saveSettings(): Promise<void> {
		try {
			await this.saveData(this.settings);
			this.setupAutoRefresh();

			if (this.todoView) {
				await this.todoView.refresh();
			}

			if (this.renderer) {
				this.renderer.updateEditorExtension();
			}

			if (this.blockIndex) {
				await this.blockIndex.buildIndex();
			}
		} catch (error) {
			console.error('Failed to save settings:', error);
		}
	}

	private setupAutoRefresh(): void {
		if (this.refreshInterval) {
			window.clearInterval(this.refreshInterval);
		}

		if (this.settings.refreshInterval > 0) {
			const intervalMs = this.settings.refreshInterval * 1000;
			this.refreshInterval = window.setInterval(() => {
				this.refreshTodos();
			}, intervalMs);
		}
	}

	async toggleView(): Promise<void> {
		const { workspace } = this.app;
		const leaves = workspace.getLeavesOfType(VIEW_TYPE_LOGSEQ_TODOS);

		if (leaves.length > 0) {
			workspace.detachLeavesOfType(VIEW_TYPE_LOGSEQ_TODOS);
			return;
		}

		const newLeaf = workspace.getLeaf(true);

		await newLeaf.setViewState({
			type: VIEW_TYPE_LOGSEQ_TODOS,
			active: true
		});

		workspace.revealLeaf(newLeaf);

		setTimeout(() => {
			if (this.todoView) {
				this.todoView.loadTodos();
			}
		}, 100);
	}

	async refreshTodos(): Promise<void> {
		if (this.todoView) {
			await this.todoView.refresh();
		}
	}
}

export default LogseqTodosPlugin;