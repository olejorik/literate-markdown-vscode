# Literate.jl Markdown highlighting for VS Code

[Literate.jl](https://github.com/fredrikekre/Literate.jl) turns a Julia script into a document: the
comment lines `# …` become Markdown, the rest becomes code cells. Writing the document as a script
has a real advantage over writing a Quarto (`.qmd`) or Jupyter notebook directly: the whole file is
ordinary Julia, so the Julia language server sees every definition, and the cells can be run from
the editor. The disadvantage is that VS Code shows the text as comments, all in one colour.

This extension makes VS Code highlight the text of such scripts as Markdown, with the grammar of
the Quarto extension, so that it looks as it does in the `.qmd`: headings, lists, emphasis, inline
code, cross-references `@sec-…`, citations, and mathematics `$…$` and `$$…$$`. The code is left as
it is. Two small Julia scripts go with it: one rewrites the `.qmd` each time the script is saved,
so that an open Quarto preview follows the edits; the other rewrites old scripts into the form
described next.

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
one for editing; `literate_blocks.jl` (below) converts the first form into it.

What is highlighted:

- a run of lines `# text` (or a lone `#`) at the start of the line, as one Markdown region; the `#`
  keeps the colour of a comment;
- a block `#=` … `=#` with the delimiters on lines of their own;
- the Quarto header `# --- … # ---` at the top of the file, as a comment.

Lines beginning with `##`, `#|` (cell options), `#md`, `#src`, `#-` and other Literate filters, and
comments that do not start in the first column, are left to the Julia grammar.

## Installation

Requirements: VS Code with the [Julia](https://marketplace.visualstudio.com/items?itemName=julialang.language-julia)
and [Quarto](https://marketplace.visualstudio.com/items?itemName=quarto.quarto) extensions. Without
the Quarto extension the text is highlighted as plain Markdown.

The extension is not on the Marketplace. Clone this repository into the VS Code extensions folder
and restart VS Code:

```powershell
# Windows (PowerShell)
git clone https://github.com/olejorik/literate-markdown-vscode "$env:USERPROFILE\.vscode\extensions\olejorik.literate-markdown"
```

```sh
# Linux, macOS
git clone https://github.com/olejorik/literate-markdown-vscode ~/.vscode/extensions/olejorik.literate-markdown
```

`git pull` in that folder and *Developer: Reload Window* update it. Check with
`code --list-extensions`, which should list `olejorik.literate-markdown`.

**Profiles.** VS Code adds an extension found in the folder only to the default profile. If you
work in another profile, open the Extensions view in it, find "Literate.jl Markdown highlighting"
and choose *Apply Extension to all Profiles* from its context menu (or *Install* in that profile).
`code --list-extensions --profile <name>` shows whether a profile has it.

To see what the grammar has made of a piece of text, place the cursor on it and run
*Developer: Inspect Editor Tokens and Scopes*: the text should carry the scopes `meta.literate…`
and `text.html.quarto`.

The extension also sets one editor default for Julia files: the dashes `–` and `—`, common in the
text, are not boxed as ambiguous Unicode characters (`editor.unicodeHighlight.allowedCharacters`).

## The scripts

The scripts need Julia and Literate.jl. Any environment with Literate will do; a shared one keeps
them independent of the projects they are used in:

```sh
julia --project=@literate -e "using Pkg; Pkg.add(\"Literate\")"
```

### Preview while editing the script: `scripts/literate_watch.jl`

```sh
julia --project=@literate ~/.vscode/extensions/olejorik.literate-markdown/scripts/literate_watch.jl path/to/script.jl [more.jl …]
```

converts each script to `.qmd` next to it (Quarto flavour, without the Literate credit line), and
again each time the script is saved. Open the `.qmd` once and start *Quarto: Preview* on it: the
preview re-renders whenever the `.qmd` changes on disk, so it follows the edits of the script. Do
not edit the `.qmd` meanwhile; it is overwritten at every save. Ctrl+C stops the script;
`--interval=<s>` sets how often the files are checked (default 0.5 s).

It is convenient as a user task (*Tasks: Open User Tasks*), which then runs on the file open in the
editor from any folder (*Tasks: Run Task → JL to QMD: watch*):

```json
{
    "version": "2.0.0",
    "tasks": [
        {
            "label": "JL to QMD: watch",
            "type": "process",
            "command": "julia",
            "args": [
                "--project=@literate",
                "${userHome}/.vscode/extensions/olejorik.literate-markdown/scripts/literate_watch.jl",
                "${file}"
            ],
            "isBackground": true,
            "problemMatcher": [],
            "presentation": { "panel": "dedicated", "reveal": "always", "focus": false }
        }
    ]
}
```

User tasks, like extensions, belong to a profile: add the task in each profile you use.

### Text lines into blocks: `scripts/literate_blocks.jl`

```sh
julia --project=@literate ~/.vscode/extensions/olejorik.literate-markdown/scripts/literate_blocks.jl path/to/script.jl [out.jl]
```

rewrites each run of text lines `# …` (with the empty lines between them) as a block `#=` … `=#`.
The header, the code, the `##` comments and the Literate filters are not changed. Before writing,
the script converts the old and the new file with Literate and compares the two `.qmd`; it writes
the new file only if they are the same. Without `out.jl` the file is rewritten in place, so commit
it first.

## How it works

The extension contains no code, only three TextMate grammars injected into the Julia grammar
(`syntaxes/`):

- `literate-markdown.json` finds the text regions. A run of `# ` lines is treated as a block quote
  is in Markdown: the prefix `#` is consumed at the start of every line, and what follows is
  highlighted by the Quarto grammar (`text.html.quarto`), or by the Markdown grammar of VS Code if
  Quarto is not installed.
- `literate-math-block.json` recognises display mathematics `$$` after the prefix `# ` (the Quarto
  grammar expects `$$` at the start of a line) and `` ```julia `` fences for plain Markdown.
- `literate-math-inline.json` brings inline mathematics into plain Markdown regions. VS Code applies
  its own Markdown mathematics only to Markdown files, not to Markdown embedded in another language.

## Testing

`test/tokenize.js` tokenizes a file with these grammars as VS Code does (with the
[vscode-textmate](https://github.com/microsoft/vscode-textmate) library), using the grammars of the
installed VS Code, Julia and Quarto extensions, and checks the scopes listed in
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
  text. This needs a hover provider in the extension (JavaScript with MathJax).
- **From `.qmd` back to `.jl`.** A conversion of a `.qmd` that has no script into a Literate script,
  and an update of the text blocks of the script when the `.qmd` is edited.

## Licence

MIT, see `LICENSE`.
