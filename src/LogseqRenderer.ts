import { MarkdownPostProcessor, Plugin, MarkdownPostProcessorContext, TFile } from 'obsidian';
import { STATUS_ICONS, TodoStatus, LogseqSettings } from './TodoItem';
import { createLogseqEditorExtensions, setCurrentSettings, setCurrentBlockIndex } from './EditorExtension';
import { isPathInLogseqDirs } from './PathUtils';
import { BlockIndexManager } from './BlockIndex';

export class LogseqRenderer {
    private plugin: Plugin;
    private getSettings: () => LogseqSettings;
    private blockIndex: BlockIndexManager | null;
    private postProcessors: MarkdownPostProcessor[] = [];
    private editorExtensions: any[] = [];
    private previewPopover: HTMLElement | null = null;

    constructor(plugin: Plugin, getSettings: () => LogseqSettings, blockIndex: BlockIndexManager | null) {
        this.plugin = plugin;
        this.getSettings = getSettings;
        this.blockIndex = blockIndex;
    }

    register(): void {
        this.registerTaskStatusStyles();
        this.updateEditorExtension();
        this.registerTaskStatusProcessor();
        this.registerBlockRefPostProcessor();
        this.registerScheduledPostProcessor();
        this.registerPriorityPostProcessor();
        this.registerTagProcessor();
        this.registerBlockPropertyProcessor();
        this.registerLogbookProcessor();
    }

    updateEditorExtension(): void {
        const settings = this.getSettings();
        setCurrentSettings(settings);
        if (this.blockIndex) {
            setCurrentBlockIndex(this.blockIndex);
        }
        this.editorExtensions = createLogseqEditorExtensions(settings);
        this.plugin.registerEditorExtension(this.editorExtensions);
    }

    unregister(): void {
        this.postProcessors = [];
        this.editorExtensions = [];
        const styleEl = document.getElementById('logseq-todos-styles');
        if (styleEl) {
            styleEl.remove();
        }
    }

    private shouldProcessFile(ctx: MarkdownPostProcessorContext): boolean {
        return isPathInLogseqDirs(ctx.sourcePath, this.getSettings().logseqPaths);
    }

    private registerTaskStatusStyles(): void {
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
            .logseq-task-status {
                display: inline-flex;
                align-items: center;
                gap: 4px;
                padding: 2px 8px;
                border-radius: 4px;
                font-size: 0.85em;
                font-weight: 600;
                margin-right: 4px;
            }
            .logseq-status-now {
                background-color: rgba(59, 130, 246, 0.15);
                color: #3b82f6;
                border: 1px solid rgba(59, 130, 246, 0.3);
            }
            .logseq-status-doing {
                background-color: rgba(234, 179, 8, 0.15);
                color: #eab308;
                border: 1px solid rgba(234, 179, 8, 0.3);
            }
            .logseq-status-later {
                background-color: rgba(249, 115, 22, 0.15);
                color: #f97316;
                border: 1px solid rgba(249, 115, 22, 0.3);
            }
            .logseq-status-todo {
                background-color: rgba(107, 114, 128, 0.15);
                color: #6b7280;
                border: 1px solid rgba(107, 114, 128, 0.3);
            }
            .logseq-status-done {
                background-color: rgba(34, 197, 94, 0.15);
                color: #22c55e;
                border: 1px solid rgba(34, 197, 94, 0.3);
            }
            .logseq-status-cancelled {
                background-color: rgba(239, 68, 68, 0.15);
                color: #ef4444;
                border: 1px solid rgba(239, 68, 68, 0.3);
                text-decoration: line-through;
            }
            .logseq-scheduled {
                font-style: italic;
                color: #8b5cf6;
                background-color: rgba(139, 92, 246, 0.1);
                padding: 1px 6px;
                border-radius: 3px;
                font-size: 0.9em;
            }
            .logseq-scheduled::before {
                content: "📅 ";
            }
            .logseq-deadline {
                font-style: italic;
                color: #dc2626;
                background-color: rgba(220, 38, 38, 0.1);
                padding: 1px 6px;
                border-radius: 3px;
                font-size: 0.9em;
            }
            .logseq-deadline::before {
                content: "⏰ ";
            }
            .logseq-priority-p0 {
                background-color: rgba(239, 68, 68, 0.2);
                color: #ef4444;
                font-weight: 600;
                padding: 1px 6px;
                border-radius: 3px;
                font-size: 0.85em;
            }
            .logseq-priority-p1 {
                background-color: rgba(249, 115, 22, 0.2);
                color: #f97316;
                font-weight: 600;
                padding: 1px 6px;
                border-radius: 3px;
                font-size: 0.85em;
            }
            .logseq-priority-p2 {
                background-color: rgba(59, 130, 246, 0.2);
                color: #3b82f6;
                font-weight: 600;
                padding: 1px 6px;
                border-radius: 3px;
                font-size: 0.85em;
            }
            .logseq-block-ref {
                background-color: rgba(139, 92, 246, 0.1);
                color: #8b5cf6;
                padding: 1px 6px;
                border-radius: 3px;
                cursor: pointer;
                font-size: 0.85em;
            }
            .logseq-block-ref:hover {
                background-color: rgba(139, 92, 246, 0.25);
            }
            .logseq-block-ref::before {
                content: "🔗";
                margin-right: 2px;
            }
            .logseq-tag {
                background-color: rgba(59, 130, 246, 0.1);
                color: #3b82f6;
                padding: 1px 6px;
                border-radius: 3px;
                font-size: 0.9em;
                cursor: pointer;
            }
            .logseq-tag:hover {
                background-color: rgba(59, 130, 246, 0.2);
            }
            .logseq-property {
                color: var(--text-muted, #6b7280);
                font-size: 0.8em;
                opacity: 0.7;
            }
            .logseq-property-name {
                color: var(--text-faint, #9ca3af);
                font-weight: 500;
            }
            .logseq-logbook-container {
                display: inline-flex;
                flex-direction: column;
                gap: 2px;
                background: var(--background-secondary, rgba(0, 0, 0, 0.05));
                border-radius: 4px;
                padding: 4px 8px;
                font-size: 0.85em;
                margin: 2px 0;
            }
            .logseq-logbook-entry {
                display: flex;
                align-items: center;
                gap: 4px;
                color: var(--text-muted, #6b7280);
                padding: 0 !important;
                margin: 0 !important;
                font-size: 0.85em;
                white-space: nowrap;
            }
            .logseq-logbook-hidden {
                display: none !important;
            }
            .HyperMD-list-line:has(.logseq-logbook-hidden) {
                display: none !important;
                height: 0 !important;
                margin: 0 !important;
                padding: 0 !important;
                line-height: 0 !important;
                visibility: hidden !important;
            }
            .HyperMD-list-line .logseq-logbook-entry {
                display: inline-flex !important;
                padding: 2px 8px !important;
                margin: 0 !important;
                background: var(--background-secondary) !important;
                border-radius: 4px !important;
                line-height: 1 !important;
                vertical-align: baseline !important;
            }
            .HyperMD-list-line .cm-widgetBuffer {
                height: 0 !important;
            }
            .logseq-logbook-time {
                font-size: 0.9em;
            }
            .logseq-logbook-arrow {
                color: var(--text-faint, #9ca3af);
            }
            .logseq-logbook-duration {
                font-weight: 600;
                color: var(--text-accent, #8b5cf6);
            }
            .logseq-task-line {
                position: relative;
            }
            .logseq-task-content {
                margin-left: 4px;
            }
        `;
    }

    private registerTaskStatusProcessor(): void {
        const processor: MarkdownPostProcessor = (el: HTMLElement, ctx: MarkdownPostProcessorContext) => {
            if (!this.shouldProcessFile(ctx)) return;
            this.processTaskStatus(el);
        };

        this.postProcessors.push(processor);
        this.plugin.registerMarkdownPostProcessor(processor);
    }

    private processTaskStatus(container: HTMLElement): void {
        const listItems = container.querySelectorAll('li');

        listItems.forEach((li) => {
            const textNodes: Text[] = [];
            const walker = document.createTreeWalker(li, NodeFilter.SHOW_TEXT, null);
            let node: Text | null;
            while ((node = walker.nextNode() as Text)) {
                if (node.parentElement?.closest('code, pre')) continue;
                textNodes.push(node);
            }

            for (const textNode of textNodes) {
                const text = textNode.textContent || '';
                const statusPattern = /^(NOW|DOING|LATER|TODO|DONE|CANCELLED)\s+/i;
                const match = text.match(statusPattern);

                if (match) {
                    const status = match[1].toUpperCase() as TodoStatus;
                    const restText = text.slice(match[0].length);

                    const statusSpan = document.createElement('span');
                    statusSpan.className = `logseq-task-status logseq-status-${status.toLowerCase()}`;
                    statusSpan.textContent = `${STATUS_ICONS[status]} ${status}`;

                    const parent = textNode.parentNode;
                    if (parent) {
                        const fragment = document.createDocumentFragment();
                        fragment.appendChild(statusSpan);
                        if (restText) {
                            fragment.appendChild(document.createTextNode(restText));
                        }
                        parent.replaceChild(fragment, textNode);
                    }
                }
            }
        });
    }

    private registerBlockRefPostProcessor(): void {
        const processor: MarkdownPostProcessor = (el: HTMLElement, ctx: MarkdownPostProcessorContext) => {
            if (!this.shouldProcessFile(ctx)) return;
            this.processBlockRefs(el);
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
            if (node.parentElement?.closest('code, pre')) continue;
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
                span.dataset.uuid = uuid;
                
                if (this.blockIndex) {
                    const location = this.blockIndex.getLocation(uuid);
                    if (location && location.firstLine) {
                        span.textContent = location.firstLine.length > 50
                            ? location.firstLine.slice(0, 50) + '...'
                            : location.firstLine;
                    } else {
                        span.textContent = uuid.slice(0, 6);
                    }
                } else {
                    span.textContent = uuid.slice(0, 6);
                }
                
                span.title = '点击跳转到块';
                
                span.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    this.jumpToBlock(uuid);
                });
                
                span.addEventListener('mouseenter', (e) => {
                    this.showPreview(e, uuid);
                });
                
                span.addEventListener('mouseleave', () => {
                    this.hidePreview();
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

    private async jumpToBlock(uuid: string): Promise<void> {
        if (!this.blockIndex) return;
        
        const location = this.blockIndex.getLocation(uuid);
        if (!location) {
            console.log('Block not found:', uuid);
            return;
        }
        
        try {
            const file = this.plugin.app.vault.getAbstractFileByPath(location.filePath);
            if (!(file instanceof TFile)) return;
            
            const leaf = this.plugin.app.workspace.getLeaf('tab');
            await leaf.openFile(file);
            
            const view = leaf.view as any;
            if (view && view.editor) {
                const targetLine = Math.max(0, location.lineNumber - 1);
                view.editor.setCursor({ line: targetLine, ch: 0 });
            }
        } catch (err) {
            console.error('Failed to jump to block:', err);
        }
    }

    private showPreview(e: MouseEvent, uuid: string): void {
        this.hidePreview();
        
        const preview = document.createElement('div');
        preview.className = 'logseq-block-preview';
        
        const rect = (e.target as HTMLElement).getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        
        let left = rect.left;
        let top = rect.bottom + 5;
        
        if (left + 420 > viewportWidth) {
            left = viewportWidth - 420;
        }
        if (top + 220 > viewportHeight) {
            top = rect.top - 220;
        }
        
        preview.style.left = `${Math.max(10, left)}px`;
        preview.style.top = `${Math.max(10, top)}px`;
        preview.style.position = 'fixed';
        preview.style.zIndex = '1000';
        
        preview.textContent = '加载中...';
        document.body.appendChild(preview);
        this.previewPopover = preview;
        
        if (this.blockIndex) {
            this.blockIndex.getFullContent(uuid).then((lines) => {
                if (this.previewPopover && lines.length > 0) {
                    this.previewPopover.innerHTML = lines
                        .slice(0, 10)
                        .map(l => `<div>${l}</div>`)
                        .join('');
                } else if (this.previewPopover) {
                    const location = this.blockIndex?.getLocation(uuid);
                    if (location && location.firstLine) {
                        this.previewPopover.textContent = location.firstLine;
                    } else {
                        this.previewPopover.textContent = '未找到块内容';
                    }
                }
            });
        }
    }

    private hidePreview(): void {
        if (this.previewPopover) {
            this.previewPopover.remove();
            this.previewPopover = null;
        }
    }

    private registerScheduledPostProcessor(): void {
        const processor: MarkdownPostProcessor = (el: HTMLElement, ctx: MarkdownPostProcessorContext) => {
            if (!this.shouldProcessFile(ctx)) return;
            this.processScheduledAndDeadline(el);
        };

        this.postProcessors.push(processor);
        this.plugin.registerMarkdownPostProcessor(processor);
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
            if (node.parentElement?.closest('code, pre')) continue;
            const text = node.textContent || '';
            if (/SCHEDULED:\s*</i.test(text) || /DEADLINE:\s*</i.test(text)) {
                textNodes.push(node);
            }
        }

        for (const textNode of textNodes) {
            const text = textNode.textContent || '';

            let result = text.replace(/SCHEDULED:\s*<([^>]+)>/gi, (match, date) => {
                const span = document.createElement('span');
                span.className = 'logseq-scheduled';
                span.textContent = date;
                return span.outerHTML;
            });

            result = result.replace(/DEADLINE:\s*<([^>]+)>/gi, (match, date) => {
                const span = document.createElement('span');
                span.className = 'logseq-deadline';
                span.textContent = date;
                return span.outerHTML;
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

    private registerPriorityPostProcessor(): void {
        const processor: MarkdownPostProcessor = (el: HTMLElement, ctx: MarkdownPostProcessorContext) => {
            if (!this.shouldProcessFile(ctx)) return;
            this.processPriorities(el);
        };

        this.postProcessors.push(processor);
        this.plugin.registerMarkdownPostProcessor(processor);
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
            if (node.parentElement?.closest('code, pre')) continue;
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

    private registerTagProcessor(): void {
        const processor: MarkdownPostProcessor = (el: HTMLElement, ctx: MarkdownPostProcessorContext) => {
            if (!this.shouldProcessFile(ctx)) return;
            this.processTags(el);
        };

        this.postProcessors.push(processor);
        this.plugin.registerMarkdownPostProcessor(processor);
    }

    private processTags(container: HTMLElement): void {
        const walker = document.createTreeWalker(
            container,
            NodeFilter.SHOW_TEXT,
            null
        );

        const textNodes: Text[] = [];
        let node: Text | null;
        while ((node = walker.nextNode() as Text)) {
            if (node.parentElement?.closest('code, pre, a')) continue;
            const text = node.textContent || '';
            if (/(?<![a-zA-Z0-9])#[a-zA-Z0-9_\u4e00-\u9fa5]+/.test(text)) {
                textNodes.push(node);
            }
        }

        for (const textNode of textNodes) {
            const text = textNode.textContent || '';

            const result = text.replace(
                /(?<![a-zA-Z0-9])(#[a-zA-Z0-9_\u4e00-\u9fa5]+)/g,
                (match) => {
                    if (/^#P[0-2]$/i.test(match)) {
                        return match;
                    }
                    return `<span class="logseq-tag">${match}</span>`;
                }
            );

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

    private registerBlockPropertyProcessor(): void {
        const processor: MarkdownPostProcessor = (el: HTMLElement, ctx: MarkdownPostProcessorContext) => {
            if (!this.shouldProcessFile(ctx)) return;
            this.processBlockProperties(el);
        };

        this.postProcessors.push(processor);
        this.plugin.registerMarkdownPostProcessor(processor);
    }

    private processBlockProperties(container: HTMLElement): void {
        const walker = document.createTreeWalker(
            container,
            NodeFilter.SHOW_TEXT,
            null
        );

        const textNodes: Text[] = [];
        let node: Text | null;
        while ((node = walker.nextNode() as Text)) {
            if (node.parentElement?.closest('code, pre')) continue;
            const text = node.textContent || '';
            if (/^\s*(id|SCHEDULED|DEADLINE)::/i.test(text)) {
                textNodes.push(node);
            }
        }

        for (const textNode of textNodes) {
            const text = textNode.textContent || '';
            const parent = textNode.parentNode;
            if (!parent) continue;

            const propertyMatch = text.match(/^\s*(id)::\s*(.+)$/i);
            if (propertyMatch) {
                const span = document.createElement('span');
                span.className = 'logseq-property';
                span.innerHTML = `<span class="logseq-property-name">${propertyMatch[1]}:</span> ${propertyMatch[2]}`;
                parent.replaceChild(span, textNode);
            }
        }
    }

    private registerLogbookProcessor(): void {
        const processor: MarkdownPostProcessor = (el: HTMLElement, ctx: MarkdownPostProcessorContext) => {
            if (!this.shouldProcessFile(ctx)) return;
            this.processLogbook(el);
        };

        this.postProcessors.push(processor);
        this.plugin.registerMarkdownPostProcessor(processor);
    }

    private processLogbook(container: HTMLElement): void {
        const logbookBlocks = container.querySelectorAll('p, li, div');

        logbookBlocks.forEach((block) => {
            const text = block.textContent || '';
            if (text.includes(':LOGBOOK:') && text.includes(':END:')) {
                const html = block.innerHTML;
                const clockRegex = /CLOCK:\s*\[([^\]]+)\]--\[([^\]]+)\]\s*=>\s*(\d+:\d+:\d+)/g;
                const entries: { start: string; end: string; duration: string }[] = [];
                
                let clockMatch;
                while ((clockMatch = clockRegex.exec(text)) !== null) {
                    entries.push({
                        start: clockMatch[1],
                        end: clockMatch[2],
                        duration: clockMatch[3].trim()
                    });
                }
                
                if (entries.length > 0) {
                    const logbookPattern = /:LOGBOOK:[\s\S]*?:END:/g;
                    const newHtml = html.replace(logbookPattern, () => {
                        const container = document.createElement('span');
                        container.className = 'logseq-logbook-container';
                        
                        for (const entry of entries) {
                            const entrySpan = document.createElement('span');
                            entrySpan.className = 'logseq-logbook-entry';
                            
                            const startSpan = document.createElement('span');
                            startSpan.className = 'logseq-logbook-time';
                            startSpan.textContent = this.formatDateTime(entry.start);
                            
                            const arrowSpan = document.createElement('span');
                            arrowSpan.className = 'logseq-logbook-arrow';
                            arrowSpan.textContent = ' → ';
                            
                            const endSpan = document.createElement('span');
                            endSpan.className = 'logseq-logbook-time';
                            endSpan.textContent = this.formatDateTime(entry.end);
                            
                            const durationSpan = document.createElement('span');
                            durationSpan.className = 'logseq-logbook-duration';
                            durationSpan.textContent = ` (${entry.duration})`;
                            
                            entrySpan.appendChild(startSpan);
                            entrySpan.appendChild(arrowSpan);
                            entrySpan.appendChild(endSpan);
                            entrySpan.appendChild(durationSpan);
                            
                            container.appendChild(entrySpan);
                        }
                        
                        return container.outerHTML;
                    });
                    
                    if (newHtml !== html) {
                        block.innerHTML = newHtml;
                    }
                }
            }
        });
    }

    private formatDateTime(dateTime: string): string {
        const match = dateTime.match(/(\d{4})-(\d{2})-(\d{2})\s+\w+\s+(\d{2}:\d{2}:\d{2})/);
        if (match) {
            return `${match[2]}-${match[3]} ${match[4].slice(0, 5)}`;
        }
        return dateTime;
    }
}