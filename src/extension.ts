import * as vscode from 'vscode';
import * as fs from 'fs';
import { completionProvider, getSnippetsFilePath, loadSnippets } from './completionprovider';

export function activate(context: vscode.ExtensionContext) {
	console.log('Congratulations, your extension "snippet-saver" is now active!');
	context.subscriptions.push(completionProvider(context));
	const disposable = vscode.commands.registerCommand('snippet-saver.saveSnippet', async () => {
		const editor = vscode.window.activeTextEditor;
		if (editor) {
			const selection = editor.selection;
			const seletedText = editor.document.getText(selection);
			if (seletedText) {
				const snippetName = await vscode.window.showInputBox({
					prompt: 'Enter snippet name'
				});
				if (snippetName) {
					//save into snippets.json
					const snippetsFilePath = getSnippetsFilePath(context);
					//make storage directory 
					if (!vscode.workspace.workspaceFolders?.[0]) {
						await fs.promises.mkdir(context.globalStorageUri.fsPath, { recursive: true });
					}

					// Add debug logging
					console.log(`Saving snippet to: ${snippetsFilePath}`);

					//json structure of our snippets
					let snippets: {
						[key: string]: string
					} = {};

					try {
						if (fs.existsSync(snippetsFilePath)) {
							const data = await fs.promises.readFile(snippetsFilePath, 'utf-8');
							snippets = JSON.parse(data);
							console.log('Existing snippets loaded');
						}
					} catch (error: any) {
						console.error(`Error reading snippets: ${error.message}`);
						vscode.window.showErrorMessage(`Error reading snippets file: ${error.message}`);
						return;
					}

					if (snippets[snippetName]) {
						const overwrite = await vscode.window.showQuickPick(['Yes', 'No'], {
							placeHolder: `Snippet ${snippetName} already exists. Do you want to overwrite?`
						});
						if (overwrite !== 'Yes') {
							vscode.window.showInformationMessage('Snippet not saved.');
							return;
						}
					}
					snippets[snippetName] = seletedText;
					try {
						await fs.promises.writeFile(snippetsFilePath, JSON.stringify(snippets, null, 4));
						console.log(`Snippet "${snippetName}" saved successfully`);
						vscode.window.showInformationMessage(`Snippet "${snippetName}" saved successfully`);
					} catch (error: any) {
						console.error(`Error writing snippet: ${error.message}`);
						vscode.window.showErrorMessage(`Error writing snippets file: ${error.message}`);
					}
				} else {
					vscode.window.showWarningMessage('No code selected to save as a snippet.');
				}
			}
		}
	});

	context.subscriptions.push(disposable);

	const insertDisposable = vscode.commands.registerCommand('snippet-saver.insertSnippet', async () => {
		const snippets = await loadSnippets(context);
		const snippetNames = Object.keys(snippets);
		if (snippetNames.length === 0) {
			vscode.window.showInformationMessage('No snippets available.');
		}
		//dropdown kind of menu to select name
		const snippetName = await vscode.window.showQuickPick(snippetNames,
			{ placeHolder: 'Select a snippet to insert' }
		);
		//if snippetname is found insert at cursor
		if (snippetName) {
			const editor = vscode.window.activeTextEditor;
			if (editor) {
				editor.insertSnippet(new vscode.SnippetString(snippets[snippetName]));
			}
		}
	});
	context.subscriptions.push(insertDisposable);

	const deleteDisposable = vscode.commands.registerCommand('snippet-saver.deleteSnippet', async () => {
		const snippetsFilePath = getSnippetsFilePath(context);
		let snippets = await loadSnippets(context);
		try {
			const snippetNames = Object.keys(snippets);
			if (snippetNames.length === 0) {
				vscode.window.showInformationMessage('No snippets available.');
			}
			const snippetName = await vscode.window.showQuickPick(snippetNames,
				{ placeHolder: 'Select a snippet to delete' }
			);
			if (snippetName) {
				delete snippets[snippetName];
				try {
					await fs.promises.writeFile(snippetsFilePath, JSON.stringify(snippets, null, 4), 'utf-8');
					vscode.window.showInformationMessage(`Snippet "${snippetName}" has been deleted.`);
				} catch (error: any) {
					vscode.window.showErrorMessage(`Error writing to snippets file: ${error.message}`);
				}
			}
		} catch (error: any) {
			if (error.code !== 'ENOENT') {
				vscode.window.showErrorMessage(`Error reading snippets file: ${error.message}`);
				return;
			}
		}
	});
	context.subscriptions.push(deleteDisposable);
}

// This method is called when your extension is deactivated
export function deactivate() { }