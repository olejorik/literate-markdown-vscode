// Links this folder into the VS Code extensions folder, so that VS Code loads the extension from
// the working copy: a junction on Windows, a symbolic link elsewhere. Edits then take effect after
// Developer: Reload Window. Run from the repository: `npm run link`. An existing link is replaced;
// an ordinary folder of the same name is left alone. VSCODE_EXTENSIONS overrides the extensions
// folder (default ~/.vscode/extensions).
const fs = require('fs'), path = require('path'), os = require('os');

const root = path.resolve(__dirname, '..');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const id = `${manifest.publisher}.${manifest.name}`;
const dir = process.env.VSCODE_EXTENSIONS || path.join(os.homedir(), '.vscode', 'extensions');
const link = path.join(dir, id);

let stat = null;
try { stat = fs.lstatSync(link); } catch (e) { /* not there yet */ }
if (stat && !stat.isSymbolicLink()) {
    console.log(`${link} exists and is not a link: remove or rename it first`);
    process.exit(1);
}
if (stat) fs.unlinkSync(link);
fs.mkdirSync(dir, { recursive: true });
fs.symlinkSync(root, link, process.platform === 'win32' ? 'junction' : 'dir');
console.log(`${link} → ${root}`);
console.log(`Restart VS Code; \`code --list-extensions\` should list ${id}. For other profiles see README.md.`);
