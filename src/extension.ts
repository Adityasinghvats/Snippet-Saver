import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from "path";

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "snippet-saver" is now active!');
	
	const disposable = vscode.commands.registerCommand('snippet-saver.saveSnippet', async () => {
		// The code you place here will be executed every time your command is executed
		// Display a message box to the user
		vscode.window.showInformationMessage('Hello World from snippet-saver!');
		const editor = vscode.window.activeTextEditor;
		if(editor){
			const selection = editor.selection;
			const seletedText = editor.document.getText(selection);
			if(seletedText){
				const snippetName = await vscode.window.showInputBox({
					prompt: 'Enter snippet name'
				});
				if (snippetName){
					//save into snippets.json
				    const snippetsFilePath = path.join(context.globalStorageUri.fsPath, 'snippets.json');
					//make storage directory 
					await fs.promises.mkdir(context.globalStorageUri.fsPath, {recursive: true});
					
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
					
					if(snippets[snippetName]){
						const overwrite = await vscode.window.showQuickPick(['Yes', 'No'], {
							placeHolder: `Snippet ${snippetName} already exists. Do you want to overwrite?`
						});
						if(overwrite !== 'Yes'){
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
				}else{
					vscode.window.showWarningMessage('No code selected to save as a snippet.');
				}
			}
		}
	});

	context.subscriptions.push(disposable);

	const insertDisposable = vscode.commands.registerCommand('snippet-saver.insertSnippet', async() => {
		const snippetsFilePath = path.join(context.globalStorageUri.fsPath, 'snippets.json');
		let snippets: {
			[key: string]: string
		} = {};
		// get the data from user/appdata/vscode/saverprofile/snippets.json and parse into an object like snippets
		try {
			const data = await fs.promises.readFile(snippetsFilePath, 'utf-8');
			snippets = JSON.parse(data);
		} catch (error: any) {
			if (error.code !== 'ENOENT') {
					vscode.window.showErrorMessage(`Error reading snippets file: ${error.message}`);
					return;
				}
		}
		//get name of all keys ie name given by me during saving
		const snippetNames = Object.keys(snippets);
		if(snippetNames.length === 0){
			vscode.window.showInformationMessage('No snippets available.');
		}
		//dropdown kind of mwnu to select name
		const snippetName = await vscode.window.showQuickPick(snippetNames, 
			{ placeHolder: 'Select a snippet to insert' }
		);
		//if snippetname is found insert at cursor
		if(snippetName){
			const editor = vscode.window.activeTextEditor;
			if(editor){
				editor.insertSnippet(new vscode.SnippetString(snippets[snippetName]));
			}
		}
	});
	context.subscriptions.push(insertDisposable);

	const deleteDisposable = vscode.commands.registerCommand('snippet-saver.deleteSnippet', async() => {
		const snippetsFilePath = path.join(context.globalStorageUri.fsPath, 'snippets.json');
		let snippets: {
			[key: string]: string
		} = {};

		try {
			const data = await fs.promises.readFile(snippetsFilePath, 'utf-8');
			snippets = JSON.parse(data);
			const snippetNames = Object.keys(snippets);
		    if(snippetNames.length === 0){
			    vscode.window.showInformationMessage('No snippets available.');
		    }
		    const snippetName = await vscode.window.showQuickPick(snippetNames, 
			    { placeHolder: 'Select a snippet to delete' }
		    );
		    if(snippetName){
				delete snippets[snippetName];
				try {
					await fs.promises.writeFile(snippetsFilePath, JSON.stringify(snippets, null, 4), 'utf-8');
					vscode.window.showInformationMessage(`Snippet "${snippetName}" has been deleted.`);
				} catch (error:any) {
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
export function deactivate() {}
