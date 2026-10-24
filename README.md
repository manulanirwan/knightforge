# KnightForge ♞

A responsive browser chess app built with React, TypeScript, Vite, and chess.js.

## Features

- Legal chess moves, check/checkmate, stalemate and draw detection
- Play locally against another person or against the starter computer opponent
- Move list, undo, new game, board flip and game persistence in this browser
- GitHub Pages deployment workflow

## Development

Requires Node.js 22 or newer.

```sh
npm install
npm run dev
```

Run checks:

```sh
npm run typecheck
npm run build
```

## GitHub Pages

The project is configured for `https://manulanirwan.github.io/knightforge/`. In the repository, open **Settings → Pages** and select **GitHub Actions** as the build and deployment source. Pushes to `main` then trigger the workflow.

## Current engine status

The computer opponent currently uses a small local move-scoring algorithm. It is not Stockfish. A Stockfish WASM engine can be added in a later update after its browser asset paths and license notices are verified.
