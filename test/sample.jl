# ---
# title: "A sample"
# engine: julia
# ---

# ## Introduction
#
# The Cramér–Rao bound answers all three [1–3], see @sec-bound and `code`;
# $2\pi$ mrad, **bold**.
#
# - first item;
# - second $\approx 6.3$ mrad.
#
# $$
# \sigma = 1
# $$

using LinearAlgebra
f(x) = x^2   ## a code comment
#| fig-cap: "A caption"
#md # filtered line
#=
## The example

A block with $K$ images (@sec-fisher), *italic*.
# a Markdown heading, not a Julia comment

$$
\alpha = 1
$$
=#
g(y) = 2y
