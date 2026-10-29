# Changelog

## 0.1.0 — 2026-10-29

- Markdown highlighting of Literate.jl scripts: runs of `# ` lines and `#= … =#` blocks, with the
  Quarto grammar (plain Markdown without the Quarto extension); display and inline mathematics;
  the Quarto header as a comment.
- Dashes `–`, `—` not boxed as ambiguous Unicode characters in Julia files.
- `scripts/literate_watch.jl`: `.jl` → `.qmd` at every save, for Quarto Preview.
- `scripts/literate_blocks.jl`: text lines `# ` into `#= … =#` blocks, written only if Literate
  gives the same `.qmd`.
- `test/tokenize.js`: checks of the scopes on a sample file with vscode-textmate.
