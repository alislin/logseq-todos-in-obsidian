export class App {
    vault = {
        getAbstractFileByPath: () => null,
        read: async () => '',
        getAllLoadedFiles: () => []
    };
    workspace = {
        getLeaf: () => ({
            openFile: async () => {},
            view: { editor: { setCursor: () => {} } }
        })
    };
}

export class TFile {
    path: string = '';
    name: string = '';
    extension: string = '';
    basename: string = '';
}

export class TFolder {
    path: string = '';
    name: string = '';
    children: any[] = [];
}

export abstract class TAbstractFile {
    path: string = '';
    name: string = '';
}

export class Plugin {
    app: App = new App();
    registerMarkdownPostProcessor() {}
    registerEditorExtension() {}
}

export class MarkdownPostProcessorContext {
    sourcePath: string = '';
}