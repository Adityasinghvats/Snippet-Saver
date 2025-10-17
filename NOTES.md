- Test

```bash
code --install-extension snippet-saver-0.0.1.vsix
```

- Deploy

```bash
npm install -g @vscode/vsce
vsce login adityasinghvats
vsce package
vsce publish
```
