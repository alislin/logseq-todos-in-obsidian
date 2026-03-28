declare module '@codemirror/view' {
    export class EditorView {
        state: any;
        visibleRanges: { from: number; to: number }[];
    }
    export class ViewPlugin<T> {
        static fromClass<T>(cls: new (view: EditorView) => T, spec: { decorations: (v: T) => any }): ViewPlugin<T>;
    }
    export class WidgetType {
        constructor();
        toDOM(view: EditorView): HTMLElement;
        eq(other: WidgetType): boolean;
    }
    export class Decoration {
        static replace(spec: { widget?: WidgetType }): any;
        static mark(spec: { class?: string }): any;
        static line(spec: { class?: string }): any;
    }
    export interface DecorationSet {}
    export interface ViewUpdate {
        docChanged: boolean;
        viewportChanged: boolean;
        view: EditorView;
    }
}

declare module '@codemirror/state' {
    export class RangeSetBuilder<T> {
        add(from: number, to: number, value: T): void;
        finish(): any;
    }
    export interface Extension {}
}