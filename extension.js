// Tasks of type "literate" for the scripts in scripts/: they appear in Tasks: Run Task as
// "literate: …" and run on the file open in the editor. Julia is the one of the Julia extension
// (julia.executablePath) unless literateMarkdown.juliaExecutable is set; the scripts run in the
// environment literateMarkdown.juliaProject (default @literate), which needs Literate.jl in it
// ("literate: install Literate.jl" puts it there).
//
// "watch" runs two processes: the watcher (scripts/literate_watch.jl), which rewrites the .qmd at
// every save of the .jl, and `quarto preview` of the .qmd, whose page is opened in the Simple
// Browser beside the editor. The preview of the Quarto extension cannot be used for this: it runs
// `quarto preview --no-watch-inputs` and re-renders only when the .qmd is saved in the editor, while
// this one re-renders whenever the .qmd changes on disk.
const vscode = require('vscode');
const path = require('path');
const fs = require('fs');
const cp = require('child_process');

const TYPE = 'literate';
const ACTIONS = {
    watch: { name: 'watch .jl → .qmd with Quarto preview', background: true },
    blocks: { name: 'rewrite text lines into #= =# blocks', script: 'literate_blocks.jl', background: false },
    install: { name: 'install Literate.jl', background: false },
};

const config = () => vscode.workspace.getConfiguration('literateMarkdown');
const julia = () => config().get('juliaExecutable') || vscode.workspace.getConfiguration('julia').get('executablePath') || 'julia';
const quarto = () => config().get('quartoExecutable') || vscode.workspace.getConfiguration('quarto').get('path') || 'quarto';
const project = () => `--project=${config().get('juliaProject') || '@literate'}`;

// kills a process with its children (quarto preview starts a Julia server of its own)
function killTree(p) {
    if (!p || p.exitCode !== null) return;
    if (process.platform === 'win32') cp.spawn('taskkill', ['/pid', String(p.pid), '/T', '/F']);
    else try { process.kill(-p.pid); } catch (e) { p.kill(); }
}

class WatchTerminal {
    constructor(file, scripts) {
        this.file = file;
        this.scripts = scripts;
        this.writeEmitter = new vscode.EventEmitter();
        this.closeEmitter = new vscode.EventEmitter();
        this.onDidWrite = this.writeEmitter.event;
        this.onDidClose = this.closeEmitter.event;
        this.closing = false;
    }

    write(text) { this.writeEmitter.fire(text.replace(/\r?\n/g, '\r\n')); }

    open() {
        if (!this.file || !/\.jl$/i.test(this.file)) {
            this.write('literate: open a Literate.jl script (.jl) in the editor first\n');
            this.closeEmitter.fire(1);
            return;
        }
        const qmd = this.file.replace(/\.jl$/i, '.qmd');
        const start = Date.now();
        this.watcher = this.spawn('literate', julia(), [project(), path.join(this.scripts, 'literate_watch.jl'), this.file]);
        // quarto preview once the watcher has written the .qmd
        this.poll = setInterval(() => {
            if (fs.existsSync(qmd) && fs.statSync(qmd).mtimeMs >= start - 1000) {
                clearInterval(this.poll);
                this.startQuarto(qmd);
            }
        }, 300);
    }

    startQuarto(qmd) {
        let output = '';
        this.quarto = this.spawn('quarto', quarto(), ['preview', qmd, '--no-browser'], text => {
            if (this.opened) return;
            output += text;
            const m = output.match(/Browse at (https?:\/\/\S+)/);
            if (!m) return;
            this.opened = true;
            const uri = vscode.Uri.parse(m[1]);
            vscode.commands.executeCommand('simpleBrowser.api.open', uri, { viewColumn: vscode.ViewColumn.Beside, preserveFocus: true })
                .then(undefined, () => vscode.env.openExternal(uri));
        });
    }

    spawn(label, command, args, onText) {
        const p = cp.spawn(command, args, { cwd: path.dirname(this.file), detached: process.platform !== 'win32' });
        const out = data => { const text = data.toString(); if (onText) onText(text); this.write(text); };
        p.stdout.on('data', out);
        p.stderr.on('data', out);
        p.on('error', e => this.write(`${label}: ${e.message}\n`));
        p.on('exit', code => {
            if (this.closing) return;
            this.write(`${label} stopped (exit code ${code})\n`);
            this.close();
        });
        return p;
    }

    handleInput(data) { if (data === '\x03') this.close(); }   // Ctrl+C

    close() {
        if (this.closing) return;
        this.closing = true;
        clearInterval(this.poll);
        killTree(this.watcher);
        killTree(this.quarto);
        this.closeEmitter.fire(0);
    }
}

function makeTask(definition, scripts, scope) {
    const action = ACTIONS[definition.action];
    if (!action) return undefined;
    let execution;
    if (definition.action === 'watch')
        execution = new vscode.CustomExecution(async () =>
            new WatchTerminal(vscode.window.activeTextEditor && vscode.window.activeTextEditor.document.uri.fsPath, scripts));
    else if (action.script)
        execution = new vscode.ProcessExecution(julia(), [project(), path.join(scripts, action.script), '${file}']);
    else
        execution = new vscode.ProcessExecution(julia(), [project(), '-e', 'using Pkg; Pkg.add("Literate")']);
    const task = new vscode.Task(definition, scope || vscode.TaskScope.Workspace, action.name, TYPE, execution, []);
    task.isBackground = action.background;
    task.presentationOptions = { reveal: vscode.TaskRevealKind.Always, panel: vscode.TaskPanelKind.Dedicated, focus: false };
    return task;
}

function activate(context) {
    const scripts = path.join(context.extensionPath, 'scripts');
    context.subscriptions.push(vscode.tasks.registerTaskProvider(TYPE, {
        provideTasks: () => Object.keys(ACTIONS).map(action => makeTask({ type: TYPE, action }, scripts)),
        // a task of this type written in tasks.json, e.g. { "type": "literate", "action": "watch" }
        resolveTask: task => makeTask(task.definition, scripts, task.scope),
    }));
}

function deactivate() {}

module.exports = { activate, deactivate, WatchTerminal };
