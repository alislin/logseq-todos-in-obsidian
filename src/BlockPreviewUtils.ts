import { STATUS_ICONS, TodoStatus } from './TodoItem';

const TAB_WIDTH = 2;

export interface BlockMetadata {
    status: string | null;
    scheduled: string | null;
    deadline: string | null;
    priority: string | null;
    contentLines: { text: string; indentDepth: number }[];
}

export interface BlockLocation {
    filePath: string;
    lineNumber: number;
    firstLine: string;
}

function getIndentWidth(indentStr: string): number {
    const tabCount = (indentStr.match(/\t/g) || []).length;
    const spaceCount = indentStr.replace(/\t/g, '').length;
    return tabCount * TAB_WIDTH + spaceCount;
}

function isPropertyLine(line: string): boolean {
    const trimmed = line.trim();
    return /^(SCHEDULED|DEADLINE|id::|:LOGBOOK|:END|CLOCK)/i.test(trimmed);
}

function findBaseIndent(lines: string[]): number {
    for (const line of lines) {
        if (line.trim() === '') continue;
        if (isPropertyLine(line)) continue;
        
        const indentMatch = line.match(/^(\s*)/);
        if (indentMatch) {
            return getIndentWidth(indentMatch[1]);
        }
    }
    return 0;
}

export function parseBlockMetadata(lines: string[]): BlockMetadata {
    let status: string | null = null;
    let scheduled: string | null = null;
    let deadline: string | null = null;
    let priority: string | null = null;
    const contentLines: { text: string; indentDepth: number }[] = [];

    const baseIndent = findBaseIndent(lines);

    for (const line of lines) {
        const trimmed = line.trim();
        
        if (trimmed === '') continue;
        
        if (/^:LOGBOOK:/i.test(trimmed) || /^:END:/i.test(trimmed) || /^CLOCK:/i.test(trimmed)) {
            continue;
        }

        const statusMatch = line.match(/^\s*[-*+]\s*(NOW|DOING|LATER|TODO|DONE|CANCELLED)\s/i) 
            || line.match(/^(NOW|DOING|LATER|TODO|DONE|CANCELLED)\s/i);
        if (statusMatch && !status) {
            status = statusMatch[1].toUpperCase();
        }

        const scheduledMatch = line.match(/SCHEDULED:\s*<([^>]+)>/i);
        if (scheduledMatch && !scheduled) {
            scheduled = scheduledMatch[1];
        }

        const deadlineMatch = line.match(/DEADLINE:\s*<([^>]+)>/i);
        if (deadlineMatch && !deadline) {
            deadline = deadlineMatch[1];
        }

        const priorityMatch = line.match(/#(P[0-2])\b/i);
        if (priorityMatch && !priority) {
            priority = priorityMatch[1].toUpperCase();
        }

        if (/^id::/i.test(trimmed)) continue;
        if (/^SCHEDULED:/i.test(trimmed)) continue;
        if (/^DEADLINE:/i.test(trimmed)) continue;

        const indentMatch = line.match(/^(\s*)/);
        const lineIndent = indentMatch ? getIndentWidth(indentMatch[1]) : 0;
        const indentDepth = Math.max(0, Math.floor((lineIndent - baseIndent) / TAB_WIDTH));

        let cleanLine = line
            .replace(/^(\s*)[-*+]\s*/, '')
            .replace(/^(NOW|DOING|LATER|TODO|DONE|CANCELLED)\s+/i, '')
            .replace(/SCHEDULED:\s*<[^>]+>/gi, '')
            .replace(/DEADLINE:\s*<[^>]+>/gi, '')
            .replace(/#P[0-2]\b/i, '')
            .replace(/id::\s*[a-f0-9-]+/i, '')
            .replace(/\(\([a-f0-9-]+\)\)/g, '')
            .trim();

        if (cleanLine) {
            contentLines.push({ text: cleanLine, indentDepth });
        }
    }

    return { status, scheduled, deadline, priority, contentLines };
}

export function getFileName(path: string): string {
    const parts = path.split('/');
    const fileName = parts[parts.length - 1] || path;
    return fileName.replace(/\.md$/, '');
}

export function createPreviewHtml(
    lines: string[],
    location?: BlockLocation | null
): { headerHtml: string; metaHtml: string } {
    const metadata = parseBlockMetadata(lines);
    
    let headerHtml = '';
    if (location) {
        headerHtml = `<span class="logseq-block-preview-file">📄 ${getFileName(location.filePath)}</span><span class="logseq-block-preview-line">· 第 ${location.lineNumber} 行</span>`;
    } else {
        headerHtml = `<span class="logseq-block-preview-file">📄 预览</span>`;
    }
    
    let metaHtml = '';
    if (metadata.status) {
        const statusClass = `logseq-status-${metadata.status.toLowerCase()}`;
        const icon = STATUS_ICONS[metadata.status as TodoStatus] || '';
        metaHtml += `<span class="logseq-preview-status ${statusClass}">${icon} ${metadata.status}</span>`;
    }
    if (metadata.scheduled) {
        metaHtml += `<span class="logseq-preview-scheduled">📅 ${metadata.scheduled}</span>`;
    }
    if (metadata.deadline) {
        metaHtml += `<span class="logseq-preview-deadline">⏰ ${metadata.deadline}</span>`;
    }
    if (metadata.priority) {
        const priorityClass = `logseq-preview-priority-${metadata.priority.toLowerCase()}`;
        metaHtml += `<span class="logseq-preview-priority ${priorityClass}">#${metadata.priority}</span>`;
    }
    
    return { headerHtml, metaHtml };
}

