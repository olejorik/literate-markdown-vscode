// Tokenizes a Julia file with the grammars of this extension, as VS Code does (vscode-textmate),
// and checks the scopes listed in test/expected.json. Needs `npm install` in the extension folder,
// VS Code (its built-in Markdown grammars) and the Julia and Quarto extensions.
//
//     node test/tokenize.js test/sample.jl            check test/expected.json
//     node test/tokenize.js some.jl --print           print the tokens of every line
//
// VS Code is looked for in the usual places; set VSCODE_APP to its resources/app folder and
// VSCODE_EXTENSIONS to the extensions folder (default ~/.vscode/extensions) otherwise.
const fs = require('fs'), path = require('path'), os = require('os');
const vsctm = require('vscode-textmate'), onig = require('vscode-oniguruma');

function vscodeApp() {
    if (process.env.VSCODE_APP) return process.env.VSCODE_APP;
    const roots = [
        path.join(process.env.LOCALAPPDATA || '', 'Programs', 'Microsoft VS Code'),
        'C:/Program Files/Microsoft VS Code',
        '/usr/share/code', '/opt/visual-studio-code',
        '/Applications/Visual Studio Code.app/Contents/Resources',
    ];
    for (const r of roots) {
        if (!fs.existsSync(r)) continue;
        if (fs.existsSync(path.join(r, 'resources', 'app'))) return path.join(r, 'resources', 'app');
        if (fs.existsSync(path.join(r, 'app'))) return path.join(r, 'app');
        // Windows user installs keep resources/ in a folder named by the commit hash
        for (const d of fs.readdirSync(r))
            if (fs.existsSync(path.join(r, d, 'resources', 'app'))) return path.join(r, d, 'resources', 'app');
    }
    throw new Error('VS Code not found: set VSCODE_APP to its resources/app folder');
}
function extension(prefix) {
    const dir = process.env.VSCODE_EXTENSIONS || path.join(os.homedir(), '.vscode', 'extensions');
    const d = fs.readdirSync(dir).filter(n => n.startsWith(prefix)).sort().pop();
    if (!d) throw new Error(`extension ${prefix}* not found in ${dir}`);
    return path.join(dir, d);
}

const app = path.join(vscodeApp(), 'extensions'), julia = extension('julialang.language-julia-');
const quarto = extension('quarto.quarto-'), own = path.join(__dirname, '..', 'syntaxes');
const files = {
    'source.julia': path.join(julia, 'syntaxes', 'julia_vscode.json'),
    'markdown.julia.codeblock': path.join(julia, 'syntaxes', 'juliacodeblock.json'),
    'text.html.quarto': path.join(quarto, 'syntaxes', 'quarto.tmLanguage'),
    'text.html.markdown': path.join(app, 'markdown-basics', 'syntaxes', 'markdown.tmLanguage.json'),
    'text.html.markdown.math': path.join(app, 'markdown-math', 'syntaxes', 'md-math.tmLanguage.json'),
    'markdown.math.inline': path.join(app, 'markdown-math', 'syntaxes', 'md-math-inline.tmLanguage.json'),
    'markdown.math.block': path.join(app, 'markdown-math', 'syntaxes', 'md-math-block.tmLanguage.json'),
    'markdown.literate.julia': path.join(own, 'literate-markdown.json'),
    'markdown.literate.math.inline.julia': path.join(own, 'literate-math-inline.json'),
    'markdown.literate.math.block.julia': path.join(own, 'literate-math-block.json'),
};
const injections = ['markdown.literate.julia', 'markdown.literate.math.inline.julia', 'markdown.literate.math.block.julia'];

const wasm = fs.readFileSync(require.resolve('vscode-oniguruma/release/onig.wasm')).buffer;
const onigLib = onig.loadWASM(wasm).then(() => ({
    createOnigScanner: p => new onig.OnigScanner(p), createOnigString: s => new onig.OnigString(s) }));
const registry = new vsctm.Registry({
    onigLib,
    loadGrammar: async s => files[s] && fs.existsSync(files[s])
        ? vsctm.parseRawGrammar(fs.readFileSync(files[s], 'utf8'), files[s]) : null,
    getInjections: s => s === 'source.julia' ? injections : [],
});

async function tokenize(file) {
    const g = await registry.loadGrammar('source.julia');
    let state = vsctm.INITIAL;
    return fs.readFileSync(file, 'utf8').split(/\r?\n/).map(line => {
        const r = g.tokenizeLine(line, state); state = r.ruleStack;
        return { line, tokens: r.tokens.map(t => ({ text: line.substring(t.startIndex, t.endIndex), scopes: t.scopes.slice(1) })) };
    });
}

(async () => {
    const file = process.argv[2];
    if (!file) { console.log('usage: node test/tokenize.js <file.jl> [--print]'); process.exit(1); }
    const lines = await tokenize(file);
    if (process.argv.includes('--print')) {
        for (const { line, tokens } of lines) {
            console.log('|' + line);
            for (const t of tokens) if (t.text.trim()) console.log('    ' + JSON.stringify(t.text).padEnd(26) + t.scopes.join(' '));
        }
        return;
    }
    // expected.json: [{ "line": <1-based line>, "text": <token text>, "scope": <scope it must have, or "!scope" it must not> }]
    const expected = JSON.parse(fs.readFileSync(path.join(__dirname, 'expected.json'), 'utf8'));
    let failed = 0;
    for (const e of expected) {
        const t = lines[e.line - 1].tokens.find(t => t.text === e.text);
        const neg = e.scope.startsWith('!'), scope = neg ? e.scope.slice(1) : e.scope;
        const has = t && t.scopes.some(s => s === scope || s.startsWith(scope + '.'));
        if (!t || has === neg) {
            failed++;
            console.log(`FAIL line ${e.line} ${JSON.stringify(e.text)}: ${e.scope}; got ${t ? t.scopes.join(' ') : 'no such token'}`);
        }
    }
    console.log(`${expected.length - failed} of ${expected.length} checks passed`);
    process.exit(failed ? 1 : 0);
})();
