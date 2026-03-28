import { App, PluginSettingTab, Setting } from 'obsidian';
import { LogseqTodosPlugin } from './main';
import { TodoStatus, STATUS_ICONS, DEFAULT_SETTINGS } from './TodoItem';

export class SettingsTab extends PluginSettingTab {
	private plugin: LogseqTodosPlugin;

	constructor(app: App, plugin: LogseqTodosPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();
		containerEl.createEl('h2', { text: 'Logseq Todos - Settings' });

		this.addPathSettings();
		this.addStatusSettings();
		this.addDisplaySettings();
		this.addRefreshSettings();
	}

	private addPathSettings(): void {
		const { containerEl } = this;
		containerEl.createEl('h3', { text: 'Path Settings' });

		new Setting(containerEl)
			.setName('Logseq Root Path')
			.setDesc('The root directory containing your Logseq data')
			.addText(text => text
				.setPlaceholder('工作日志')
				.setValue(this.plugin.settings.logseqPath)
				.onChange(async (value) => {
					this.plugin.settings.logseqPath = value || DEFAULT_SETTINGS.logseqPath;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Journals Path')
			.setDesc('Relative path to journals directory')
			.addText(text => text
				.setPlaceholder('journals')
				.setValue(this.plugin.settings.journalsPath)
				.onChange(async (value) => {
					this.plugin.settings.journalsPath = value || DEFAULT_SETTINGS.journalsPath;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Pages Path')
			.setDesc('Relative path to pages directory')
			.addText(text => text
				.setPlaceholder('pages')
				.setValue(this.plugin.settings.pagesPath)
				.onChange(async (value) => {
					this.plugin.settings.pagesPath = value || DEFAULT_SETTINGS.pagesPath;
					await this.plugin.saveSettings();
				}));
	}

	private addStatusSettings(): void {
		const { containerEl } = this;
		containerEl.createEl('h3', { text: 'Task Status' });

		const statuses: TodoStatus[] = ['NOW', 'DOING', 'LATER', 'TODO', 'DONE', 'CANCELLED'];

		for (const status of statuses) {
			const icon = STATUS_ICONS[status];
			new Setting(containerEl)
				.setName(`${icon} ${status}`)
				.setDesc(`Show ${status} tasks`)
				.addToggle(toggle => toggle
					.setValue(this.plugin.settings.enabledStatuses.includes(status))
					.onChange(async (value) => {
						if (value) {
							if (!this.plugin.settings.enabledStatuses.includes(status)) {
								this.plugin.settings.enabledStatuses.push(status);
							}
						} else {
							this.plugin.settings.enabledStatuses =
								this.plugin.settings.enabledStatuses.filter((s: TodoStatus) => s !== status);
						}
						await this.plugin.saveSettings();
					}));
		}
	}

	private addDisplaySettings(): void {
		const { containerEl } = this;
		containerEl.createEl('h3', { text: 'Display Settings' });

		new Setting(containerEl)
			.setName('Sort By')
			.addDropdown(dropdown => dropdown
				.addOption('status', 'Status')
				.addOption('date', 'Date')
				.addOption('title', 'Title')
				.setValue(this.plugin.settings.sortBy)
				.onChange(async (value) => {
					this.plugin.settings.sortBy = value as 'status' | 'date' | 'title';
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Show Scheduled Time')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.showScheduled)
				.onChange(async (value) => {
					this.plugin.settings.showScheduled = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Show Priority')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.showPriority)
				.onChange(async (value) => {
					this.plugin.settings.showPriority = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Sidebar Position')
			.addDropdown(dropdown => dropdown
				.addOption('right', 'Right')
				.addOption('left', 'Left')
				.setValue(this.plugin.settings.sidebarPosition)
				.onChange(async (value) => {
					this.plugin.settings.sidebarPosition = value as 'right' | 'left';
					await this.plugin.saveSettings();
				}));
	}

	private addRefreshSettings(): void {
		const { containerEl } = this;
		containerEl.createEl('h3', { text: 'Refresh Settings' });

		new Setting(containerEl)
			.setName('Auto Refresh Interval (seconds)')
			.setDesc('Set to 0 to disable auto refresh')
			.addText(text => text
				.setPlaceholder('30')
				.setValue(String(this.plugin.settings.refreshInterval))
				.onChange(async (value) => {
					const num = parseInt(value, 10);
					this.plugin.settings.refreshInterval = isNaN(num) ? 30 : Math.max(0, num);
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Refresh Now')
			.setDesc('Click to manually refresh the todo list')
			.addButton(button => button
				.setButtonText('Refresh')
				.onClick(async () => {
					await this.plugin.refreshTodos();
				}));
	}
}