# Rewrite the text of a Literate.jl script from lines `# text` into blocks `#=` … `=#`, so that it
# can be edited as plain Markdown (Literate turns such a block, with `#=` and `=#` on lines of
# their own, into the same Markdown). A run of lines `# …` / `#`, with empty lines between them,
# becomes one block; the `# ---` header at the top, code, `##` comments and the line filters
# (`#md`, `#src`, …) stay as they are. The script then converts the old and the new file with
# Literate (Quarto flavour) and writes the new file only if both give the same .qmd:
#
#     julia --project=@literate scripts/literate_blocks.jl path/to/script.jl [out.jl]
#
# Without `out.jl` the file is rewritten in place (commit it first, to keep the old version).
using Literate, Logging
length(ARGS) in (1, 2) || (println("usage: julia --project=@literate literate_blocks.jl <in.jl> [out.jl]"); exit(1))
src = ARGS[1]
out = length(ARGS) == 2 ? ARGS[2] : src
text = read(src, String)
nl = occursin("\r\n", text) ? "\r\n" : "\n"
lines = split(chomp(replace(text, "\r\n" => "\n")), "\n")

isprose(l) = l == "#" || startswith(l, "# ")
unprefix(l) = rstrip(l == "#" ? "" : l[3:end])
isdelim(l) = occursin(r"^(#=+|=+#)\s*$", l)

new = String[]
i = 1
if !isempty(lines) && rstrip(lines[1]) == "# ---"   # the header goes as it is
    h = findnext(l -> rstrip(l) == "# ---", lines, 2)
    h === nothing && error("the header of $src is not closed")
    append!(new, lines[1:h])
    i = h + 1
end
while i <= length(lines)
    if !isprose(lines[i])
        push!(new, lines[i]); global i += 1
        continue
    end
    ## the run: prose lines, with the empty lines between them (not the ones after the last)
    j = i
    k = i
    while k <= length(lines) && (isprose(lines[k]) || isempty(strip(lines[k])))
        isprose(lines[k]) && (j = k)
        k += 1
    end
    body = unprefix.(lines[i:j])
    if any(isdelim, body)                  # a line `=#` in the text would end the block: leave the run
        append!(new, lines[i:j])
    else
        push!(new, "#=", body..., "=#")
    end
    global i = j + 1
end
converted = join(new, nl) * nl

# the same .qmd from both?
qmd(code) = mktempdir() do d
    f = joinpath(d, basename(src))
    write(f, code)
    with_logger(NullLogger()) do
        read(Literate.markdown(f, d; flavor=Literate.QuartoFlavor(), credit=false), String)
    end
end
a, b = qmd(text), qmd(converted)
if a != b
    la, lb = split(a, "\n"), split(b, "\n")
    n = something(findfirst(k -> k > length(lb) || la[k] != lb[k], eachindex(la)), length(la) + 1)
    println("not written: the .qmd differs from line $n\n  old: ", get(la, n, "<end>"), "\n  new: ", get(lb, n, "<end>"))
    exit(1)
end
write(out, converted)
println(out, ": ", count(==("#="), new), " text block(s); the .qmd is unchanged")
