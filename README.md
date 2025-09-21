# Graph Manipulator

A small Preact+Vite JS app for visualizing and manipulating port-style graph
diagrams. It provides an editable canvas, KaTeX rendering, and a few example
graph viewers to explore different layouts and interactions.

Port graphs are not very common (some actual theory on them can be found in
[Seven Sketches in Compositionality](https://arxiv.org/abs/1803.05316) in
section 5.2.2), but they are useful for representing various mathematical
objects like classical graphs, flow networks, and knot diagrams.

## Quick start

Requirements: Node.js or Bun. To run with npm, replace `bun` with `npm` in the
commands below.

Install and run the dev server:

1. Install dependencies:

    ```
    bun install
    ```

2. Start the dev server:

    ```
    bun run dev
    ```

Build for production:

    ```
    bun run build
    ```

Preview the production build:

    ```
    bun run preview
    ```

## Features

- Interactive port-graph editor and viewers

- KaTeX support for math rendering

- Various graph viewers: Basic, FlowGraph, KnotLink
