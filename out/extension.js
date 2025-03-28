"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
const vscode = __importStar(require("vscode"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
// create directory exists
function ensureDirectoryExistence(filePath) {
    const dirname = path.dirname(filePath);
    if (!fs.existsSync(dirname)) {
        fs.mkdirSync(dirname, { recursive: true });
    }
}
function activate(context) {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) {
        vscode.window.showErrorMessage("No workspace folder found.");
        return;
    }
    const workspaceRoot = workspaceFolders[0].uri.fsPath;
    const commentStorePath = path.join(workspaceRoot, ".annotations");
    if (!fs.existsSync(commentStorePath)) {
        fs.mkdirSync(commentStorePath); //.annotations
    }
    // [Save Comments]
    const saveCommentsCommand = vscode.commands.registerCommand("extension.saveComments", () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage("No active editor found.");
            return;
        }
        const document = editor.document;
        const filePath = document.uri.fsPath;
        const fileContent = document.getText();
        const commentRegex = /\/\/.*|\/\*[\s\S]*?\*\/|<!--[\s\S]*?-->/g;
        const comments = [];
        let match;
        while ((match = commentRegex.exec(fileContent)) !== null) {
            const position = document.positionAt(match.index);
            comments.push({
                text: match[0],
                line: position.line,
                column: position.character,
            });
        }
        // File path
        const relativePath = path.relative(workspaceRoot, filePath);
        const commentFilePath = path.join(commentStorePath, `${relativePath}.json`);
        // is path exists
        ensureDirectoryExistence(commentFilePath);
        // Save
        const commentData = {
            comments: comments,
            filePath: relativePath,
        };
        fs.writeFileSync(commentFilePath, JSON.stringify(commentData, null, 2));
        // Remove comments and update the document
        const uncommentedCode = fileContent.replace(commentRegex, "");
        const edit = new vscode.WorkspaceEdit();
        const fullRange = new vscode.Range(document.positionAt(0), document.positionAt(fileContent.length));
        edit.replace(document.uri, fullRange, uncommentedCode);
        vscode.workspace.applyEdit(edit);
        vscode.window.showInformationMessage("Comments saved locally.");
    });
    // [Restore Comments]
    const restoreCommentsCommand = vscode.commands.registerCommand("extension.restoreComments", () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage("No active editor found.");
            return;
        }
        const document = editor.document;
        const filePath = document.uri.fsPath;
        // file path
        const relativePath = path.relative(workspaceRoot, filePath);
        const commentFilePath = path.join(commentStorePath, `${relativePath}.json`);
        // is file exists
        if (!fs.existsSync(commentFilePath)) {
            vscode.window.showErrorMessage("No comments found for this file.");
            return;
        }
        // Read the comment file and parse it
        const commentData = JSON.parse(fs.readFileSync(commentFilePath, "utf-8"));
        const comments = commentData.comments;
        const fileContent = document.getText();
        const edit = new vscode.WorkspaceEdit();
        // Insert line
        for (const comment of comments) {
            const position = new vscode.Position(comment.line, comment.column);
            edit.insert(document.uri, position, comment.text);
        }
        vscode.workspace.applyEdit(edit);
        vscode.window.showInformationMessage("Comments restored.");
    });
    context.subscriptions.push(saveCommentsCommand, restoreCommentsCommand);
}
//# sourceMappingURL=extension.js.map