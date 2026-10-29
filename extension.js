// Tasks of type "literate" for the scripts in scripts/: they appear in Tasks: Run Task as
// "literate: …" and run on the file open in the editor. Julia is the one of the Julia extension
// (julia.executablePath) unless literateMarkdown.juliaExecutable is set; the scripts run in the
// environment literateMarkdown.juliaProject (default @literate), which needs Literate.jl in it
// ("literate: install Literate.jl" puts it there).
const vscode = require('vscode');
const path = require('path');

const TYPE = 'literate';
const ACTIONS = {
    watch: { name: 'watch .jl → .qmd (for Quarto Preview)', script: 'literate_watch.jl', background: true },
    blocks: { name: 'rewrite text lines into #= =# blocks', script: 'literate_blocks.jl', background: false },
    install: { name: 'install Literate.jl', script: null, background: false },
};

function julia() {
    const own = vscode.workspace.getConfiguration('literateMarkdown');
    return own.get('juliaExecutable') || vscode.workspace.getConfiguration('julia').get('executablePath') || 'julia';
}

function makeTask(definition, scripts, scope) {
    const action = ACTIONS[definition.action];
    if (!action) return undefined;
    const project = `--project=${vscode.workspace.getConfiguration('literateMarkdown').get('juliaProject') || '@literate'}`;
    const args = action.script
        ? [project, path.join(scripts, action.script), '${file}']
        : [project, '-e', 'using Pkg; Pkg.add("Literate")'];
    const task = new vscode.Task(definition, scope || vscode.TaskScope.Workspace, action.name, TYPE,
        new vscode.ProcessExecution(julia(), args), []);
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

module.exports = { activate, deactivate };
