import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

export function getSnippetsFilePath(context: vscode.ExtensionContext): string {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (workspaceFolder) {
        const vscodeDir = path.join(workspaceFolder.uri.fsPath, '.vscode');
        return path.join(vscodeDir, 'snippets.json');
    }
    return path.join(context.globalStorageUri.fsPath, 'snippets.json');
}

export async function loadSnippets(context: vscode.ExtensionContext): Promise<{ [key: string]: string }> {
    const snippetsFilePath = getSnippetsFilePath(context);
    try {
        if (fs.existsSync(snippetsFilePath)) {
            const data = await fs.promises.readFile(snippetsFilePath, 'utf-8');
            return JSON.parse(data);
        }
    } catch (error) {
        console.error('Error loading snippets:', error);
    }
    return {};
}

export const completionProvider = (context: vscode.ExtensionContext) => vscode.languages.registerCompletionItemProvider(
    { scheme: 'file', pattern: '**/*' },
    {
        async provideCompletionItems(document: vscode.TextDocument, position: vscode.Position) {
            const linePrefix = document.lineAt(position).text.slice(0, position.character);

            console.log('Line prefix:', linePrefix);

            if (!linePrefix.includes('@')) {
                console.log('No @ found');
                return undefined;
            }
            const atIndex = linePrefix.lastIndexOf('@');
            const searchText = linePrefix.slice(atIndex + 1).toLowerCase();

            console.log('Search text:', searchText);

            const snippets = await loadSnippets(context);
            console.log('Loaded snippets:', Object.keys(snippets));

            const completionItems: vscode.CompletionItem[] = [];
            const languageId = document.languageId || 'plaintext';

            for (const [name, code] of Object.entries(snippets)) {
                if (searchText === '' || name.toLowerCase().includes(searchText)) {
                    const item = new vscode.CompletionItem(name, vscode.CompletionItemKind.Snippet);
                    item.insertText = new vscode.SnippetString(code);

                    // Create a preview of the first few lines
                    const previewLines = code.split('\n').slice(0, 5);
                    const preview = previewLines.join('\n');
                    const hasMore = code.split('\n').length > 5;

                    item.detail = `📝 Saved Snippet${hasMore ? ' (truncated)' : ''}`;

                    // Create documentation
                    const markdown = new vscode.MarkdownString();
                    markdown.appendCodeblock(code, languageId);
                    item.documentation = markdown;

                    item.filterText = '@' + name;
                    item.sortText = name;

                    const range = new vscode.Range(
                        new vscode.Position(position.line, atIndex),
                        position
                    );
                    item.range = range;

                    console.log(`Created completion item for: ${name}, has documentation: ${!!item.documentation}`);

                    completionItems.push(item);
                }
            }

            console.log('Completion items:', completionItems.length);
            return completionItems;
        }
    },
    '@'
);