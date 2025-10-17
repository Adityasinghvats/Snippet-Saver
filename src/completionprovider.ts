import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

export function getSnippetsFilePath(context: vscode.ExtensionContext): string {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (workspaceFolder) {
        const vscodeDir = path.join(workspaceFolder.uri.fsPath, '.vscode');
        // Create .vscode directory if it doesn't exist
        if (!fs.existsSync(vscodeDir)) {
            fs.mkdirSync(vscodeDir, { recursive: true });
        }
        return path.join(vscodeDir, 'snippets.json');
    }
    return path.join(context.globalStorageUri.fsPath, 'snippets.json');
}

export async function loadSnippets(context: vscode.ExtensionContext): Promise<{ [key: string]: string }> {
    const snippetsFilePath = getSnippetsFilePath(context);
    try {
        if (fs.existsSync(snippetsFilePath)) {
            const data = await fs.promises.readFile(snippetsFilePath, 'utf-8');
            const parsed = JSON.parse(data);
            return parsed;
        } else {
            console.log('Snippets file does not exist:', snippetsFilePath);
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
            // Check if line contains @ before the cursor
            if (!linePrefix.includes('@')) {
                console.log('No @ found in line prefix');
                return undefined;
            }

            const atIndex = linePrefix.lastIndexOf('@');
            const searchText = linePrefix.slice(atIndex + 1).toLowerCase();

            const snippets = await loadSnippets(context);

            if (Object.keys(snippets).length === 0) {
                console.log('No snippets available');
                return undefined;
            }

            const completionItems: vscode.CompletionItem[] = [];
            const languageId = document.languageId || 'plaintext';

            for (const [name, code] of Object.entries(snippets)) {
                // Filter based on search text
                if (searchText === '' || name.toLowerCase().includes(searchText)) {
                    const item = new vscode.CompletionItem(name, vscode.CompletionItemKind.Snippet);

                    // Clean up the code (replace \r\n with actual line breaks)
                    const cleanCode = code.replace(/\\r\\n/g, '\n').replace(/\\n/g, '\n');
                    item.insertText = new vscode.SnippetString(cleanCode);

                    // Calculate snippet statistics
                    const lineCount = cleanCode.split('\n').length;
                    const charCount = cleanCode.length;

                    item.detail = `📝 Saved Snippet (${lineCount} lines, ${charCount} chars)`;

                    // Create comprehensive documentation
                    const markdown = new vscode.MarkdownString();
                    markdown.isTrusted = true;
                    markdown.supportHtml = true;

                    // Add title
                    markdown.appendMarkdown(`### Snippet: \`${name}\`\n\n`);

                    // Add metadata
                    markdown.appendMarkdown(`**Lines:** ${lineCount} | **Characters:** ${charCount}\n\n`);

                    // Add code preview with proper syntax highlighting
                    markdown.appendMarkdown(`**Preview:**\n\n`);
                    markdown.appendCodeblock(cleanCode, languageId);

                    item.documentation = markdown;

                    item.filterText = '@' + name;
                    item.sortText = name;

                    // Calculate the range to replace (from @ to cursor)
                    const range = new vscode.Range(
                        new vscode.Position(position.line, atIndex),
                        position
                    );
                    item.range = range;
                    completionItems.push(item);
                }
            }
            return completionItems;
        }
    },
    '@' // Trigger completion when @ is typed
);