import { MarkdownPostProcessor, Plugin } from 'obsidian';

export class LogseqRenderer {
	private plugin: Plugin;
	private postProcessors: MarkdownPostProcessor[] = [];

	constructor(plugin: Plugin) {
		this.plugin = plugin;
	}

	register(): void {
		this.registerTaskMarkerStyles();
		this.registerBlockRefPostProcessor();
		this.registerScheduledPostProcessor();
		this.registerPriorityPostProcessor();
	}

	unregister(): void {
		this.postProcessors = [];
	}

	private registerTaskMarkerStyles(): void {
		let styleEl = document.getElementById('logseq-todos-styles') as HTMLStyleElement;
		if (!styleEl) {
			styleEl = document.createElement('style');
			styleEl.id = 'logseq-todos-styles';
			document.head.appendChild(styleEl);
		}
		styleEl.textContent = this.getStyles();
	}

	private getStyles(): string {
		return `
			.logseq-scheduled {
				font-style: italic;
				color: #8b5cf6;
			}
			.logseq-deadline {
				font-style: italic;
				color: #dc2626;
			}
			.logseq-priority-p0 {
				background-color: rgba(239, 68, 68, 0.2);
				color: #ef4444;
				font-weight: 600;
				padding: 1px 4px;
				border-radius: 3px;
			}
			.logseq-priority-p1 {
				background-color: rgba(249, 115, 22, 0.2);
				color: #f97316;
				font-weight: 600;
				padding: 1px 4px;
				border-radius: 3px;
			}
			.logseq-priority-p2 {
				background-color: rgba(59, 130, 246, 0.2);
				color: #3b82f6;
				font-weight: 600;
				padding: 1px 4px;
				border-radius: 3px;
			}
			.logseq-block-ref {
				background-color: rgba(139, 92, 246, 0.1);
				color: #8b5cf6;
				padding: 1px 4px;
				border-radius: 3px;
				cursor: pointer;
			}
			.logseq-block-ref:hover {
				background-color: rgba(139, 92, 246, 0.2);
			}
			.logseq-tag {
				background-color: rgba(59, 130, 246, 0.1);
				color: #3b82f6;
				padding: 1px 4px;
				border-radius: 3px;
			}
		`;
	}

	private registerBlockRefPostProcessor(): void {
		const processor: MarkdownPostProcessor = (el: HTMLElement) => {
			this.processBlockRefs(el);
		};

		this.postProcessors.push(processor);
		this.plugin.registerMarkdownPostProcessor(processor);
	}

	private registerScheduledPostProcessor(): void {
		const processor: MarkdownPostProcessor = (el: HTMLElement) => {
			this.processScheduledAndDeadline(el);
		};

		this.postProcessors.push(processor);
		this.plugin.registerMarkdownPostProcessor(processor);
	}

	private registerPriorityPostProcessor(): void {
		const processor: MarkdownPostProcessor = (el: HTMLElement) => {
			this.processPriorities(el);
		};

		this.postProcessors.push(processor);
		this.plugin.registerMarkdownPostProcessor(processor);
	}

	private processBlockRefs(container: HTMLElement): void {
		const walker = document.createTreeWalker(
			container,
			NodeFilter.SHOW_TEXT,
			null
		);

		const textNodes: Text[] = [];
		let node: Text | null;
		while ((node = walker.nextNode() as Text)) {
			if (node.textContent?.includes('((') && node.textContent.includes('))')) {
				textNodes.push(node);
			}
		}

		for (const textNode of textNodes) {
			const text = textNode.textContent || '';
			const blockRefRegex = /\(\(([a-f0-9-]+)\)\)/g;
			let match;
			const parts: (string | HTMLElement)[] = [];
			let lastIndex = 0;

			while ((match = blockRefRegex.exec(text)) !== null) {
				if (match.index > lastIndex) {
					parts.push(text.slice(lastIndex, match.index));
				}

				const uuid = match[1];
				const span = document.createElement('span');
				span.className = 'logseq-block-ref';
				span.textContent = '🔗';
				span.title = `Block: ${uuid}`;
				span.dataset.uuid = uuid;
				span.addEventListener('click', () => {
					console.log('Navigate to block:', uuid);
				});
				parts.push(span);
				lastIndex = match.index + match[0].length;
			}

			if (lastIndex < text.length) {
				parts.push(text.slice(lastIndex));
			}

			if (parts.length > 1) {
				const parent = textNode.parentNode;
				if (parent) {
					const fragment = document.createDocumentFragment();
					for (const part of parts) {
						if (typeof part === 'string') {
							fragment.appendChild(document.createTextNode(part));
						} else {
							fragment.appendChild(part);
						}
					}
					parent.replaceChild(fragment, textNode);
				}
			}
		}
	}

	private processScheduledAndDeadline(container: HTMLElement): void {
		const walker = document.createTreeWalker(
			container,
			NodeFilter.SHOW_TEXT,
			null
		);

		const textNodes: Text[] = [];
		let node: Text | null;
		while ((node = walker.nextNode() as Text)) {
			const text = node.textContent || '';
			if (/SCHEDULED:\s*</i.test(text) || /DEADLINE:\s*</i.test(text)) {
				textNodes.push(node);
			}
		}

		for (const textNode of textNodes) {
			const text = textNode.textContent || '';

			let result = text.replace(/SCHEDULED:\s*<([^>]+)>/gi, (match) => {
				return `<span class="logseq-scheduled">${match}</span>`;
			});

			result = result.replace(/DEADLINE:\s*<([^>]+)>/gi, (match) => {
				return `<span class="logseq-deadline">${match}</span>`;
			});

			if (result !== text) {
				const parent = textNode.parentNode;
				if (parent) {
					const span = document.createElement('span');
					span.innerHTML = result;
					parent.replaceChild(span, textNode);
				}
			}
		}
	}

	private processPriorities(container: HTMLElement): void {
		const walker = document.createTreeWalker(
			container,
			NodeFilter.SHOW_TEXT,
			null
		);

		const textNodes: Text[] = [];
		let node: Text | null;
		while ((node = walker.nextNode() as Text)) {
			const text = node.textContent || '';
			if (/#P[0-2]\b/.test(text)) {
				textNodes.push(node);
			}
		}

		for (const textNode of textNodes) {
			const text = textNode.textContent || '';

			const result = text.replace(/#(P[0-2])\b/g, (match, priority) => {
				const p = priority.toLowerCase();
				return `<span class="logseq-priority-${p}">${match}</span>`;
			});

			if (result !== text) {
				const parent = textNode.parentNode;
				if (parent) {
					const span = document.createElement('span');
					span.innerHTML = result;
					parent.replaceChild(span, textNode);
				}
			}
		}
	}
}