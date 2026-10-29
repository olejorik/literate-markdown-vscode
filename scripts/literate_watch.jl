# Convert Literate.jl scripts to .qmd (Quarto flavour, without the Literate credit line) next to
# them each time one of them is saved. An open Quarto Preview of the .qmd re-renders by itself when
# the .qmd changes on disk, so the text can be edited in the .jl and read in the preview. Leave it
# running in a terminal (Ctrl+C stops it), or run the task "literate: watch .jl → .qmd" of the
# extension on the open file:
#
#     julia --project=@literate scripts/literate_watch.jl path/to/script.jl [more.jl …]
#
# then open the .qmd once and start Quarto: Preview on it. The .qmd is overwritten at every save of
# the .jl: do not edit it. `--interval=<s>` sets how often the files are checked (default 0.5 s).
# `@literate` is a shared Julia environment with Literate in it; any environment with it will do.
Base.find_package("Literate") === nothing && (println("""Literate.jl is not in the environment \
    $(Base.active_project()): run the task "literate: install Literate.jl", or \
    julia --project=@literate -e 'using Pkg; Pkg.add("Literate")'"""); exit(1))
using Literate, Dates
i = findfirst(a -> startswith(a, "--interval="), ARGS)
interval = i === nothing ? 0.5 : parse(Float64, split(ARGS[i], "=")[2])
files = abspath.(filter(a -> !startswith(a, "--"), ARGS))
isempty(files) && (println("usage: julia --project=@literate literate_watch.jl <script.jl …>"); exit(1))
missing_files = filter(!isfile, files)
isempty(missing_files) || (println("no such file: ", join(missing_files, ", ")); exit(1))

function convert(f)
    try
        qmd = Literate.markdown(f, dirname(f); flavor=Literate.QuartoFlavor(), credit=false)
        println(Dates.format(now(), "HH:MM:SS"), "  ", qmd)
    catch e
        println(Dates.format(now(), "HH:MM:SS"), "  failed: ", f, "\n", sprint(showerror, e))
    end
    flush(stdout)
end

# convert once at the start, then whenever a file's modification time changes
seen = Dict(f => mtime(f) for f in files)
foreach(convert, files)
println("watching ", length(files), " file(s), Ctrl+C to stop")
while true
    sleep(interval)
    for f in files
        t = mtime(f)
        t != seen[f] && t > 0 && (seen[f] = t; convert(f))
    end
end
