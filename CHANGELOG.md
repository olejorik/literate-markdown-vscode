# Changelog

## 0.3.0 — 2026-10-29

- The watch task also runs `quarto preview` of the `.qmd` (which, unlike the preview of the Quarto
  extension, re-renders when the `.qmd` changes on disk) and opens the page in the Simple Browser
  beside the editor; terminating the task stops both processes. Setting
  `literateMarkdown.quartoExecutable`.

## 0.2.0 — 2026-10-29

- Tasks of type `literate` provided by the extension (`extension.js`), on the open file: watch
  `.jl` → `.qmd`, rewrite text lines into blocks, install Literate.jl. Settings
  `literateMarkdown.juliaProject` (default `@literate`) and `literateMarkdown.juliaExecutable`.
- The scripts say how to install Literate.jl when it is missing; the watcher stops at once on a
  file that does not exist.
- `npm run link` (`tools/link.js`): links the clone into the VS Code extensions folder.
- `.vscode/launch.json`: F5 runs the extension from the clone.

## 0.1.0 — 2026-10-29

- Markdown highlighting of Literate.jl scripts: runs of `# ` lines and `#= … =#` blocks, with the
  Quarto grammar (plain Markdown without the Quarto extension); display and inline mathematics;
  the Quarto header as a comment.
- Dashes `–`, `—` not boxed as ambiguous Unicode characters in Julia files.
- `scripts/literate_watch.jl`: `.jl` → `.qmd` at every save, for Quarto Preview.
- `scripts/literate_blocks.jl`: text lines `# ` into `#= … =#` blocks, written only if Literate
  gives the same `.qmd`.
- `test/tokenize.js`: checks of the scopes on a sample file with vscode-textmate.
