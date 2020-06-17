'use strict';

// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as path from 'path';

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
 
     class HTMLDocumentContentProvider implements vscode.TextDocumentContentProvider {
        private _onDidChange: vscode.EventEmitter<vscode.Uri>;
 
         constructor() {
             this._onDidChange = new vscode.EventEmitter<vscode.Uri>();
         }

         public provideTextDocumentContent(uri: vscode.Uri): string {
            if (vscode.window.activeTextEditor === undefined) {
                vscode.window.showErrorMessage(
                    'Cannot show hexdump because there is no active text editor.');
                return '';
            }

            let sourceText: string = vscode.window.activeTextEditor.document.getText();
            let hexadecimal: Array<string> = [];
            for (let i=0; i<sourceText.length; i++) {
                if (sourceText[i].charCodeAt(0) > 255) {
                    let encoded = encodeURI(sourceText[i]);
                    let splited = encoded.split('%');
                    for (let c in splited) {
                        if (splited[c].length < 1) {
                            continue;
                        }
                        hexadecimal[hexadecimal.length] = (
                            '00' + parseInt(splited[c], 16)
                                .toString(16)
                                .toLowerCase()
                        ).slice(-2);
                    }
                } else {
                    hexadecimal[hexadecimal.length] = (
                        '00' + sourceText[i]
                            .charCodeAt(0)
                            .toString(16)
                            .toLowerCase()
                    ).slice(-2);
                }
            }

            let cells = hexadecimal.length + (16 - hexadecimal.length % 16);
            let dumpedHtml:string = '';
            for (let i=0; i<cells; i=i+2) {
                if (i % 16 === 0) {
                    dumpedHtml += '<tr><th>'
                      + ('00000000' + i.toString(16)).slice(-8)
                      + ':</th>';
                }
                dumpedHtml += '<td><code>'
                    + ((i+0 < hexadecimal.length) ? hexadecimal[i+0] : '&nbsp;')
                    + ((i+1 < hexadecimal.length) ? hexadecimal[i+1] : '&nbsp;')
                    + '</code></td>';
                if (i % 16 === 1) {
                    dumpedHtml += '</tr>';
                }
            }
            return '<table>' + dumpedHtml + '</table>';
        }

        get onDidChange(): vscode.Event<vscode.Uri> {
            return this._onDidChange.event;
        }
        public update(uri: vscode.Uri) {
            this._onDidChange.fire(uri);
        }

    }

    let previewUri = vscode.Uri.parse('HTMLPreview://authority/preview');
    let htdocProvider = new HTMLDocumentContentProvider();
    let panel_obj:vscode.WebviewPanel;

    let d1 = vscode.workspace.registerTextDocumentContentProvider(
        'HTMLPreview',
        htdocProvider
    );

    let d2 = vscode.commands.registerCommand('extension.dumpBinary', () => {
        if (vscode.window.activeTextEditor === undefined) {
            vscode.window.showErrorMessage(
                'Cannot show hexdump because there is no active text editor.');
            return;
        }
        let e:vscode.TextEditor = vscode.window.activeTextEditor;
        panel_obj = vscode.window.createWebviewPanel('vscode-language-review', `Hexdump of ${path.basename(e.document.fileName)}`, vscode.ViewColumn.Two);
        panel_obj.webview.html = htdocProvider.provideTextDocumentContent(previewUri);
    });

    let d3 = vscode.workspace.onDidChangeTextDocument((e: vscode.TextDocumentChangeEvent) => {
        if (vscode.window.activeTextEditor !== undefined
         && e.document === vscode.window.activeTextEditor.document) {
            htdocProvider.update(previewUri);
        }
        panel_obj.webview.html = htdocProvider.provideTextDocumentContent(previewUri);
    });
    
    // Add to a list of disposables which are disposed when this extension is deactivated.
    // この拡張機能が非アクティブ化されたときに破棄される使い捨てのリストに追加します。
    context.subscriptions.push(d1,d2, d3);
}

// this method is called when your extension is deactivated
export function deactivate() {
}