import { ViewPlugin, Decoration, EditorView, WidgetType, DecorationSet, ViewUpdate } from '@codemirror/view';
import { RangeSetBuilder } from '@codemirror/state';
import { STATUS_ICONS, TodoStatus, LogseqSettings } from './TodoItem';
import { isPathInLogseqDirs } from './PathUtils';

let currentFilePath: string = '';
let currentSettings: LogseqSettings | null = null;

export function setCurrentFilePath(path: string): void {
    currentFilePath = path;
}

export function setCurrentSettings(settings: LogseqSettings): void {
    currentSettings = settings;
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

    constructor(uuid: string) {
        super();
        this.uuid = uuid;
    }

    toDOM(view: EditorView): HTMLElement {
        const span = document.createElement('span');
        span.className = 'logseq-block-ref';
        span.textContent = this.uuid.slice(0, 6);
        span.title = `Block: ${this.uuid}`;
        return span;
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
            
            const statusRegex = /^(\s*)([-*+])\s+(NOW|DOING|LATER|TODO|DONE|CANCELLED)\s+/i;
            const scheduledRegex = /SCHEDULED:\s*<([^>]+)>/gi;
            const deadlineRegex = /DEADLINE:\s*<([^>]+)>/gi;
            const priorityRegex = /#(P[0-2])\b/gi;
            const blockRefRegex = /\(\(([a-f0-9-]+)\)\)/g;

            const doc = view.state.doc;
            const visibleRanges = view.visibleRanges || [{ from: 0, to: doc.length }];
            
            for (const { from, to } of visibleRanges) {
                const text = doc.sliceString(from, to);
                let currentPos = from;
                
                for (const line of text.split('\n')) {
                    const lineStart = currentPos;
                    const lineLength = line.length;
                    
                    const bulletMatch = line.match(statusRegex);
                    if (bulletMatch) {
                        const indent = bulletMatch[1].length;
                        const status = bulletMatch[3].toUpperCase() as TodoStatus;
                        
                        const statusFrom = lineStart + indent + bulletMatch[2].length + 1;
                        const statusTo = statusFrom + bulletMatch[3].length + 1;
                        
                        builder.add(
                            statusFrom,
                            statusTo,
                            Decoration.replace({
                                widget: new StatusWidget(status)
                            })
                        );
                    }
                    
                    this.processMatches(builder, lineStart, line, scheduledRegex, (date: string) => 
                        new ScheduledWidget(date)
                    );
                    
                    this.processMatches(builder, lineStart, line, deadlineRegex, (date: string) => 
                        new DeadlineWidget(date)
                    );
                    
                    this.processMatches(builder, lineStart, line, priorityRegex, (priority: string) => 
                        new PriorityWidget(priority)
                    );
                    
                    this.processMatches(builder, lineStart, line, blockRefRegex, (uuid: string) => 
                        new BlockRefWidget(uuid)
                    );
                    
                    this.processTags(builder, lineStart, line);
                    
                    currentPos += lineLength + 1;
                }
            }

            return builder.finish();
        }

        private processMatches(
            builder: RangeSetBuilder<Decoration>,
            lineStart: number,
            text: string,
            regex: RegExp,
            createWidget: (match: string) => WidgetType
        ): void {
            const pattern = new RegExp(regex.source, 'gi');
            let match;
            while ((match = pattern.exec(text)) !== null) {
                const matchFrom = lineStart + match.index;
                const matchTo = matchFrom + match[0].length;
                
                builder.add(
                    matchFrom,
                    matchTo,
                    Decoration.replace({
                        widget: createWidget(match[1])
                    })
                );
            }
        }

        private processTags(
            builder: RangeSetBuilder<Decoration>,
            lineStart: number,
            text: string
        ): void {
            const tagRegex = /(?<![a-zA-Z0-9])#([a-zA-Z0-9_\u4e00-\u9fa5]+)/g;
            const pattern = new RegExp(tagRegex.source, 'g');
            let match;
            
            while ((match = pattern.exec(text)) !== null) {
                const tag = match[1];
                if (/^P[0-2]$/i.test(tag)) continue;
                
                const tagFrom = lineStart + match.index;
                const tagTo = tagFrom + match[0].length;
                
                builder.add(
                    tagFrom,
                    tagTo,
                    Decoration.replace({
                        widget: new TagWidget(tag)
                    })
                );
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