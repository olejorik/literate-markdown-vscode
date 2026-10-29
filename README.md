# Literate.jl Markdown highlighting for VS Code

[Literate.jl](https://github.com/fredrikekre/Literate.jl) turns a Julia script into a document: the
comment lines `# …` become Markdown, the rest becomes code cells. Writing the document as a script
has a real advantage over writing a Quarto (`.qmd`) or Jupyter notebook directly: the whole file is
ordinary Julia, so the Julia language server sees every definition, and the cells can be run from
the editor. The disadvantage is that VS Code shows the text as comments, all in one colour.

This extension makes VS Code highlight the text of such scripts as Markdown, with the grammar of
the Quarto extension, so that it looks as it does in the `.qmd`: headings, lists, emphasis, inline
code, cross-references `@sec-…`, citations, and mathematics `$…$` and `$$…$$`. The code is left as
it is. It also provides tasks for two small Julia scripts: one rewrites the `.qmd` each time the
script is saved, so that an open Quarto preview follows the edits; the other rewrites old scripts
into the form described next.

## Two ways to write the text

Literate takes as Markdown both a run of lines beginning with `# ` and a block comment whose
delimiters `#=` and `=#` stand on lines of their own. Both are highlighted:

```julia
# ## Introduction
#
# A phase-diversity sensor records $K$ images (@sec-model).

using LinearAlgebra
f(x) = x^2        ## a comment in the code: `##`, as Literate requires

#=
## The example

A block needs no prefix on its lines, so a paragraph can be typed, wrapped and reflowed as in any
Markdown file:

$$
s_k = |\mathcal F[P_k]|^2 .
$$
=#
```

For Julia the block is a comment, so the file still runs. The block form is the more convenient
one for editing; the task "rewrite text lines into blocks" (below) converts the first form into it.

What is highlighted:

- a run of lines `# text` (or a lone `#`) at the start of the line, as one Markdown region; the `#`
  keeps the colour of a comment;
- a block `#=` … `=#` with the delimiters on lines of their own;
- the Quarto header `# --- … # ---` at the top of the file, as a comment.

Lines beginning with `##`, `#|` (cell options), `#md`, `#src`, `#-` and other Literate filters, and
comments that do not start in the first column, are left to the Julia grammar.

## Installation

Requirements: VS Code with the [Julia](https://marketplace.visualstudio.com/items?itemName=julialang.language-julia)
and [Quarto](https://marketplace.visualstudio.com/items?itemName=quarto.quarto) extensions; for the
tasks, Julia. Without the Quarto extension the text is highlighted as plain Markdown.

The extension is not on the Marketplace. Clone the repository wherever you keep your projects and
link it into the VS Code extensions folder:

```sh
git clone https://github.com/olejorik/literate-markdown-vscode
cd literate-markdown-vscode
npm run link
```

`npm run link` (it needs Node.js) makes `~/.vscode/extensions/olejorik.literate-markdown` a link to
the clone: a junction on Windows, a symbolic link elsewhere. Without Node.js the link can be made
by hand:

```powershell
# Windows (PowerShell), from the clone
New-Item -ItemType Junction -Path "$env:USERPROFILE\.vscode\extensions\olejorik.literate-markdown" -Target (Get-Location)
```

```sh
# Linux, macOS, from the clone
ln -s "$PWD" ~/.vscode/extensions/olejorik.literate-markdown
```

Then restart VS Code. `git pull` in the clone and *Developer: Reload Window* update the extension.

Check with `code --list-extensions`, which should list `olejorik.literate-markdown`. VS Code does
not always record a folder put into the extensions folder by hand; if the extension is not listed
after a restart, add an entry for it to `~/.vscode/extensions/extensions.json`, following the
entries already there (`identifier.id` `olejorik.literate-markdown`, `version`, `location`,
`relativeLocation`).

**Profiles.** Each VS Code profile has its own list of extensions, and a linked extension is added
only to the default one. In another profile open the Extensions view, find "Literate.jl Markdown
highlighting" and choose *Apply Extension to all Profiles* from its context menu; failing that, add
the same entry to the `extensions.json` of the profile (`<user data>/User/profiles/<id>/`; the ids
are in `<user data>/User/globalStorage/storage.json`, key `userDataProfiles`). Check with
`code --list-extensions --profile <name>`.

To see what the grammar has made of a piece of text, place the cursor on it and run
*Developer: Inspect Editor Tokens and Scopes*: the text should carry the scopes `meta.literate…`
and `text.html.quarto`.

The extension also sets one editor default for Julia files: the dashes `–` and `—`, common in the
text, are not boxed as ambiguous Unicode characters (`editor.unicodeHighlight.allowedCharacters`).

## Tasks

*Tasks: Run Task → literate* lists three tasks, which act on the file open in the editor:

| Task | What it does |
|---|---|
| `literate: watch .jl → .qmd (for Quarto Preview)` | converts the script to `.qmd` next to it, and again at every save |
| `literate: rewrite text lines into #= =# blocks` | rewrites the text lines `# …` of the script as blocks |
| `literate: install Literate.jl` | adds Literate.jl to the environment of the tasks |

The tasks run Julia in a separate environment, `@literate` by default, so that they do not depend on
the project they are used in; run "install Literate.jl" once. Two settings change this:
`literateMarkdown.juliaProject` (the environment, given to `--project`) and
`literateMarkdown.juliaExecutable` (Julia itself; by default `julia.executablePath` of the Julia
extension, or `julia` on the PATH).

A task can also be put into `tasks.json`, for example to give it a key binding:

```json
{ "label": "preview the script", "type": "literate", "action": "watch" }
```

(`action` is `watch`, `blocks` or `install`.)

### Preview while editing the script

Run `literate: watch .jl → .qmd` on the script, open the `.qmd` once and start *Quarto: Preview* on
it. The preview re-renders whenever the `.qmd` changes on disk, so it follows the edits of the
script. Do not edit the `.qmd` meanwhile: it is overwritten at every save. Stop the task with
*Tasks: Terminate Task*. From a terminal the same is

```sh
julia --project=@literate scripts/literate_watch.jl path/to/script.jl [more.jl …]
```

with `--interval=<s>` for how often the files are checked (default 0.5 s). The `.qmd` is written in
the Quarto flavour of Literate, without the Literate credit line.

### Text lines into blocks

`literate: rewrite text lines into #= =# blocks` rewrites each run of text lines `# …` (with the
empty lines between them) as a block `#=` … `=#`. The header, the code, the `##` comments and the
Literate filters are not changed. Before writing, the script converts the old and the new file with
Literate and compares the two `.qmd`; it writes the new file only if they are the same. The file is
rewritten in place, so commit it first. From a terminal:

```sh
julia --project=@literate scripts/literate_blocks.jl path/to/script.jl [out.jl]
```

## How it works

The highlighting is done by three TextMate grammars injected into the Julia grammar (`syntaxes/`):

- `literate-markdown.json` finds the text regions. A run of `# ` lines is treated as a block quote
  is in Markdown: the prefix `#` is consumed at the start of every line, and what follows is
  highlighted by the Quarto grammar (`text.html.quarto`), or by the Markdown grammar of VS Code if
  Quarto is not installed.
- `literate-math-block.json` recognises display mathematics `$$` at the start of a line or after the
  prefix `# ` (the Quarto grammar expects it at the start of a line), and `` ```julia `` fences for
  plain Markdown.
- `literate-math-inline.json` brings inline mathematics into plain Markdown regions. VS Code applies
  its own Markdown mathematics only to Markdown files, not to Markdown embedded in another language.

`extension.js` provides the tasks: it knows where the extension is installed and so where the
scripts are (`scripts/`).

## Development

- Edit in the clone. With the link in place, *Developer: Reload Window* loads the edits.
- F5 in the clone (`.vscode/launch.json`) opens a second window of VS Code with the extension loaded
  from the clone; Ctrl+R there reloads it. This is the way to debug `extension.js`.
- `test/tokenize.js` tokenizes a file with these grammars as VS Code does (with the
  [vscode-textmate](https://github.com/microsoft/vscode-textmate) library), using the grammars of
  the installed VS Code, Julia and Quarto extensions, and checks the scopes listed in
  `test/expected.json` for `test/sample.jl`:

  ```sh
  npm install
  npm test                                   # 24 of 24 checks passed
  node test/tokenize.js some.jl --print      # the scopes of every token of a file
  ```

  VS Code is looked for in the usual places; set `VSCODE_APP` to its `resources/app` folder and
  `VSCODE_EXTENSIONS` to the extensions folder if it is elsewhere.

## Not done yet

- **Formulas on hover.** In a `.qmd` the Quarto extension shows a rendered formula when the mouse
  rests on it; in a `.jl` the hover comes from the Julia language server, which shows nothing for
  text. This needs a hover provider in `extension.js` (with MathJax).
- **From `.qmd` back to `.jl`.** A conversion of a `.qmd` that has no script into a Literate script,
  and an update of the text blocks of the script when the `.qmd` is edited.

## Licence

MIT, see `LICENSE`.
