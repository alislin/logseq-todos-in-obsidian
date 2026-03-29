import { ViewPlugin, Decoration, EditorView, WidgetType, DecorationSet, ViewUpdate } from '@codemirror/view';
import { RangeSetBuilder } from '@codemirror/state';
import { TFile } from 'obsidian';
import { STATUS_ICONS, TodoStatus, LogseqSettings } from './TodoItem';
import { isPathInLogseqDirs } from './PathUtils';
import { BlockIndexManager } from './BlockIndex';
import { createPreviewHtml, BlockLocation } from './BlockPreviewUtils';

let currentFilePath: string = '';
let currentSettings: LogseqSettings | null = null;
let currentBlockIndex: BlockIndexManager | null = null;

export function setCurrentFilePath(path: string): void {
    currentFilePath = path;
}

export function setCurrentSettings(settings: LogseqSettings): void {
    currentSettings = settings;
}

export function setCurrentBlockIndex(index: BlockIndexManager | null): void {
    currentBlockIndex = index;
}

class StatusWidget extends WidgetType {
    private status: TodoStatus;
    private icon: string;

    constructor(status: TodoStatus) {
        super();
        this.status = status;
        this.icon = STATUS_ICONS[status];
    }

    toDOM(view: EditorView): HTMLElement {
        const span = document.createElement('span');
        span.className = `logseq-task-status logseq-status-${this.status.toLowerCase()}`;
        span.textContent = `${this.icon} ${this.status}`;
        return span;
    }

    eq(other: StatusWidget): boolean {
        return this.status === other.status;
    }
}

class ScheduledWidget extends WidgetType {
    private date: string;

    constructor(date: string) {
        super();
        this.date = date;
    }

    toDOM(view: EditorView): HTMLElement {
        const span = document.createElement('span');
        span.className = 'logseq-scheduled';
        span.textContent = this.date;
        return span;
    }

    eq(other: ScheduledWidget): boolean {
        return this.date === other.date;
    }
}

class DeadlineWidget extends WidgetType {
    private date: string;

    constructor(date: string) {
        super();
        this.date = date;
    }

    toDOM(view: EditorView): HTMLElement {
        const span = document.createElement('span');
        span.className = 'logseq-deadline';
        span.textContent = this.date;
        return span;
    }

    eq(other: DeadlineWidget): boolean {
        return this.date === other.date;
    }
}

class BlockRefWidget extends WidgetType {
    private uuid: string;
    private previewEl: HTMLElement | null = null;
    private hideTimeout: number | null = null;

    constructor(uuid: string) {
        super();
        this.uuid = uuid;
    }

    toDOM(view: EditorView): HTMLElement {
        const span = document.createElement('span');
        span.className = 'logseq-block-ref';
        span.dataset.uuid = this.uuid;
        
        if (currentBlockIndex) {
            const location = currentBlockIndex.getLocation(this.uuid);
            if (location && location.firstLine) {
                span.textContent = location.firstLine.length > 50 
                    ? location.firstLine.slice(0, 50) + '...' 
                    : location.firstLine;
            } else {
                span.textContent = this.uuid.slice(0, 6);
            }
        } else {
            span.textContent = this.uuid.slice(0, 6);
        }
        
        span.title = '点击跳转到块';
        
        span.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.jumpToBlock(view);
        });
        
        span.addEventListener('mouseenter', (e) => {
            this.showPreview(e, view);
        });
        
        span.addEventListener('mouseleave', () => {
            this.scheduleHide();
        });
        
        return span;
    }

    private async jumpToBlock(view: EditorView): Promise<void> {
        if (!currentBlockIndex) return;
        
        const location = currentBlockIndex.getLocation(this.uuid);
        if (!location) {
            console.log('Block not found:', this.uuid);
            return;
        }
        
        try {
            const app = (currentBlockIndex as any).app;
            if (!app) return;
            
            const file = app.vault.getAbstractFileByPath(location.filePath);
            if (!(file instanceof TFile)) return;
            
            const leaf = app.workspace.getLeaf('tab');
            await leaf.openFile(file);
            
            const editor = leaf.view?.editor;
            if (editor) {
                const targetLine = Math.max(0, location.lineNumber - 1);
                editor.setCursor({ line: targetLine, ch: 0 });
                editor.scrollIntoView({ from: { line: targetLine, ch: 0 }, to: { line: targetLine + 5, ch: 0 } });
            }
        } catch (err) {
            console.error('Failed to jump to block:', err);
        }
    }

    private showPreview(e: MouseEvent, view: EditorView): void {
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
        
        const header = document.createElement('div');
        header.className = 'logseq-block-preview-header';
        header.innerHTML = `<span class="logseq-block-preview-file">📄 加载中...</span>`;
        preview.appendChild(header);
        
        const contentContainer = document.createElement('div');
        contentContainer.className = 'logseq-block-preview-content';
        contentContainer.innerHTML = `<div class="logseq-block-preview-loading">加载中...</div>`;
        preview.appendChild(contentContainer);
        
        document.body.appendChild(preview);
        this.previewEl = preview;
        
        preview.addEventListener('mouseenter', () => {
            this.cancelHide();
        });
        
        preview.addEventListener('mouseleave', () => {
            this.scheduleHide();
        });
        
        if (!currentBlockIndex) return;
        
        const location = currentBlockIndex.getLocation(this.uuid);
        if (location) {
            header.innerHTML = `<span class="logseq-block-preview-file">📄 ${location.filePath.split('/').pop()?.replace('.md', '') || location.filePath}</span><span class="logseq-block-preview-line">· 行 ${location.lineNumber}</span>`;
        }
        
        currentBlockIndex.getFullContent(this.uuid).then((lines) => {
            if (!this.previewEl) return;
            
            if (lines.length === 0) {
                contentContainer.innerHTML = `<div class="logseq-block-preview-loading">${location?.firstLine || '未找到块内容'}</div>`;
                return;
            }
            
            const blockLocation: BlockLocation | undefined = location ? {
                filePath: location.filePath,
                lineNumber: location.lineNumber,
                firstLine: location.firstLine
            } : undefined;
            
            const { headerHtml, metaHtml, contentHtml } = createPreviewHtml(lines, blockLocation);
            
            if (headerHtml) {
                header.innerHTML = headerHtml;
            }
            
            if (metaHtml) {
                const metaEl = document.createElement('div');
                metaEl.className = 'logseq-block-preview-meta';
                metaEl.innerHTML = metaHtml;
                
                const existingHeader = this.previewEl.querySelector('.logseq-block-preview-header');
                if (existingHeader) {
                    existingHeader.after(metaEl);
                }
            }
            
            contentContainer.innerHTML = contentHtml || `<div class="logseq-block-preview-loading">${location?.firstLine || '无内容'}</div>`;
        });
    }

    private scheduleHide(): void {
        this.cancelHide();
        this.hideTimeout = window.setTimeout(() => {
            this.hidePreview();
        }, 150);
    }

    private cancelHide(): void {
        if (this.hideTimeout) {
            window.clearTimeout(this.hideTimeout);
            this.hideTimeout = null;
        }
    }

    private hidePreview(): void {
        this.cancelHide();
        if (this.previewEl) {
            this.previewEl.remove();
            this.previewEl = null;
        }
    }

    eq(other: BlockRefWidget): boolean {
        return this.uuid === other.uuid;
    }
}

class PriorityWidget extends WidgetType {
    private priority: string;

    constructor(priority: string) {
        super();
        this.priority = priority;
    }

    toDOM(view: EditorView): HTMLElement {
        const span = document.createElement('span');
        span.className = `logseq-priority-${this.priority.toLowerCase()}`;
        span.textContent = `#${this.priority}`;
        return span;
    }

    eq(other: PriorityWidget): boolean {
        return this.priority === other.priority;
    }
}

class TagWidget extends WidgetType {
    private tag: string;

    constructor(tag: string) {
        super();
        this.tag = tag;
    }

    toDOM(view: EditorView): HTMLElement {
        const span = document.createElement('span');
        span.className = 'logseq-tag';
        span.textContent = `#${this.tag}`;
        return span;
    }

    eq(other: TagWidget): boolean {
        return this.tag === other.tag;
    }
}

interface ClockEntry {
    start: string;
    end: string;
    duration: string;
}

interface DecorationInfo {
    from: number;
    to: number;
    widget: WidgetType;
}

interface LogbookRange {
    from: number;
    to: number;
}

class ClockEntryWidget extends WidgetType {
    private entry: ClockEntry;

    constructor(entry: ClockEntry) {
        super();
        this.entry = entry;
    }

    toDOM(view: EditorView): HTMLElement {
        const container = document.createElement('span');
        container.className = 'logseq-logbook-entry';
        
        const startSpan = document.createElement('span');
        startSpan.className = 'logseq-logbook-time';
        startSpan.textContent = this.formatDateTime(this.entry.start);
        
        const arrowSpan = document.createElement('span');
        arrowSpan.className = 'logseq-logbook-arrow';
        arrowSpan.textContent = ' → ';
        
        const endSpan = document.createElement('span');
        endSpan.className = 'logseq-logbook-time';
        endSpan.textContent = this.formatDateTime(this.entry.end);
        
        const durationSpan = document.createElement('span');
        durationSpan.className = 'logseq-logbook-duration';
        durationSpan.textContent = ` (${this.entry.duration})`;
        
        container.appendChild(startSpan);
        container.appendChild(arrowSpan);
        container.appendChild(endSpan);
        container.appendChild(durationSpan);
        
        return container;
    }

    private formatDateTime(dateTime: string): string {
        const match = dateTime.match(/(\d{4})-(\d{2})-(\d{2})\s+\w+\s+(\d{2}:\d{2}:\d{2})/);
        if (match) {
            return `${match[2]}-${match[3]} ${match[4].slice(0, 5)}`;
        }
        return dateTime;
    }

    eq(other: ClockEntryWidget): boolean {
        return this.entry.start === other.entry.start &&
               this.entry.end === other.entry.end &&
               this.entry.duration === other.entry.duration;
    }
}

class HiddenWidget extends WidgetType {
    toDOM(view: EditorView): HTMLElement {
        const span = document.createElement('span');
        span.className = 'logseq-logbook-hidden';
        span.style.display = 'none';
        return span;
    }

    eq(other: HiddenWidget): boolean {
        return true;
    }
}

class PropertyWidget extends WidgetType {
    private name: string;
    private value: string;

    constructor(name: string, value: string) {
        super();
        this.name = name;
        this.value = value;
    }

    toDOM(view: EditorView): HTMLElement {
        const span = document.createElement('span');
        span.className = 'logseq-property';
        
        const nameSpan = document.createElement('span');
        nameSpan.className = 'logseq-property-name';
        nameSpan.textContent = `${this.name}:`;
        
        span.appendChild(nameSpan);
        span.appendChild(document.createTextNode(' '));
        span.appendChild(document.createTextNode(this.value));
        
        return span;
    }

    eq(other: PropertyWidget): boolean {
        return this.name === other.name && this.value === other.value;
    }
}

function createDecorationsPlugin() {
    return class {
        decorations: DecorationSet;

        constructor(view: EditorView) {
            this.decorations = this.buildDecorations(view);
        }

        update(update: ViewUpdate): void {
            if (update.docChanged || update.viewportChanged) {
                this.decorations = this.buildDecorations(update.view);
            }
        }

        destroy(): void {}

        private buildDecorations(view: EditorView): DecorationSet {
            const builder = new RangeSetBuilder<Decoration>();
            
            const settings = currentSettings;
            if (!settings) {
                return builder.finish();
            }
            
            if (!isPathInLogseqDirs(currentFilePath, settings.logseqPaths)) {
                return builder.finish();
            }
            
            const doc = view.state.doc;
            const visibleRanges = view.visibleRanges || [{ from: 0, to: doc.length }];
            
            const allLines: string[] = [];
            const allLineStarts: number[] = [];
            
            for (const { from, to } of visibleRanges) {
                const text = doc.sliceString(from, to);
                let currentPos = from;
                
                for (const line of text.split('\n')) {
                    allLines.push(line);
                    allLineStarts.push(currentPos);
                    currentPos += line.length + 1;
                }
            }
            
            const decorations: DecorationInfo[] = [];
            const logbookRanges: LogbookRange[] = [];
            
            this.collectLogbookDecorations(decorations, logbookRanges, allLines, allLineStarts);
            
            for (let i = 0; i < allLines.length; i++) {
                const line = allLines[i];
                const lineStart = allLineStarts[i];
                const lineEnd = lineStart + line.length;
                
                if (this.isInLogbookRange(lineStart, lineEnd, logbookRanges)) {
                    continue;
                }
                
                this.collectStatusDecorations(decorations, line, lineStart);
                this.collectMatches(decorations, line, lineStart, /SCHEDULED:\s*<([^>]+)>/gi, (date: string) => new ScheduledWidget(date));
                this.collectMatches(decorations, line, lineStart, /DEADLINE:\s*<([^>]+)>/gi, (date: string) => new DeadlineWidget(date));
                this.collectMatches(decorations, line, lineStart, /#(P[0-2])\b/gi, (priority: string) => new PriorityWidget(priority));
                this.collectMatches(decorations, line, lineStart, /\(\(([a-f0-9-]+)\)\)/g, (uuid: string) => new BlockRefWidget(uuid));
                this.collectTagDecorations(decorations, line, lineStart);
                this.collectPropertyDecorations(decorations, line, lineStart);
            }
            
            decorations.sort((a, b) => a.from - b.from);
            
            for (const dec of decorations) {
                builder.add(dec.from, dec.to, Decoration.replace({ widget: dec.widget }));
            }

            return builder.finish();
        }

        private isInLogbookRange(from: number, to: number, ranges: LogbookRange[]): boolean {
            for (const range of ranges) {
                if (from >= range.from && to <= range.to) {
                    return true;
                }
            }
            return false;
        }

        private collectLogbookDecorations(
            decorations: DecorationInfo[],
            logbookRanges: LogbookRange[],
            lines: string[],
            lineStarts: number[]
        ): void {
            const logbookStartRegex = /^(\s*):LOGBOOK:/;
            const logbookEndRegex = /^(\s*):END:/;
            const clockRegex = /^(\s*)CLOCK:\s*\[([^\]]+)\]--\[([^\]]+)\]\s*=>\s*(\d+:\d+:\d+)/;
            
            let i = 0;
            while (i < lines.length) {
                const logbookMatch = lines[i].match(logbookStartRegex);
                if (logbookMatch) {
                    const indentLength = logbookMatch[1].length;
                    const lineFrom = lineStarts[i] + indentLength;
                    const lineTo = lineStarts[i] + lines[i].length;
                    
                    decorations.push({
                        from: lineFrom,
                        to: lineTo,
                        widget: new HiddenWidget()
                    });
                    logbookRanges.push({ from: lineFrom, to: lineTo });
                    i++;
                    
                    while (i < lines.length && !logbookEndRegex.test(lines[i])) {
                        const clockMatch = lines[i].match(clockRegex);
                        if (clockMatch) {
                            const clockIndentLength = clockMatch[1].length;
                            const entryLineFrom = lineStarts[i] + clockIndentLength;
                            const entryLineTo = lineStarts[i] + lines[i].length;
                            
                            decorations.push({
                                from: entryLineFrom,
                                to: entryLineTo,
                                widget: new ClockEntryWidget({
                                    start: clockMatch[2],
                                    end: clockMatch[3],
                                    duration: clockMatch[4].trim()
                                })
                            });
                            logbookRanges.push({ from: entryLineFrom, to: entryLineTo });
                        }
                        i++;
                    }
                    
                    const endMatch = lines[i]?.match(logbookEndRegex);
                    if (i < lines.length && endMatch) {
                        const endIndentLength = endMatch[1].length;
                        const endLineFrom = lineStarts[i] + endIndentLength;
                        const endLineTo = lineStarts[i] + lines[i].length;
                        
                        decorations.push({
                            from: endLineFrom,
                            to: endLineTo,
                            widget: new HiddenWidget()
                        });
                        logbookRanges.push({ from: endLineFrom, to: endLineTo });
                        i++;
                    }
                } else {
                    i++;
                }
            }
        }

        private collectStatusDecorations(
            decorations: DecorationInfo[],
            line: string,
            lineStart: number
        ): void {
            const statusRegex = /^(\s*)([-*+])\s+(NOW|DOING|LATER|TODO|DONE|CANCELLED)\s+/i;
            const bulletMatch = line.match(statusRegex);
            
            if (bulletMatch) {
                const indent = bulletMatch[1].length;
                const status = bulletMatch[3].toUpperCase() as TodoStatus;
                
                const statusFrom = lineStart + indent + bulletMatch[2].length + 1;
                const statusTo = statusFrom + bulletMatch[3].length + 1;
                
                decorations.push({
                    from: statusFrom,
                    to: statusTo,
                    widget: new StatusWidget(status)
                });
            }
        }

        private collectMatches(
            decorations: DecorationInfo[],
            line: string,
            lineStart: number,
            regex: RegExp,
            createWidget: (match: string) => WidgetType
        ): void {
            const pattern = new RegExp(regex.source, 'gi');
            let match;
            
            while ((match = pattern.exec(line)) !== null) {
                const matchFrom = lineStart + match.index;
                const matchTo = matchFrom + match[0].length;
                
                decorations.push({
                    from: matchFrom,
                    to: matchTo,
                    widget: createWidget(match[1])
                });
            }
        }

        private collectTagDecorations(
            decorations: DecorationInfo[],
            line: string,
            lineStart: number
        ): void {
            const tagRegex = /(?<![a-zA-Z0-9])#([a-zA-Z0-9_\u4e00-\u9fa5]+)/g;
            const pattern = new RegExp(tagRegex.source, 'g');
            let match;
            
            while ((match = pattern.exec(line)) !== null) {
                const tag = match[1];
                if (/^P[0-2]$/i.test(tag)) continue;
                
                const tagFrom = lineStart + match.index;
                const tagTo = tagFrom + match[0].length;
                
                decorations.push({
                    from: tagFrom,
                    to: tagTo,
                    widget: new TagWidget(tag)
                });
            }
        }

        private collectPropertyDecorations(
            decorations: DecorationInfo[],
            line: string,
            lineStart: number
        ): void {
            const propertyRegex = /^(\s*)(id)::\s*(.+)$/i;
            const match = line.match(propertyRegex);
            
            if (match) {
                const indentLength = match[1].length;
                const propertyFrom = lineStart + indentLength;
                const propertyTo = lineStart + line.length;
                
                decorations.push({
                    from: propertyFrom,
                    to: propertyTo,
                    widget: new PropertyWidget(match[2], match[3])
                });
            }
        }
    };
}

export function createLogseqEditorPlugin(settings: LogseqSettings) {
    setCurrentSettings(settings);
    return ViewPlugin.fromClass(createDecorationsPlugin(), {
        decorations: (v: any) => v.decorations
    });
}

export function createLogseqEditorExtensions(settings: LogseqSettings) {
    return [createLogseqEditorPlugin(settings)];
}