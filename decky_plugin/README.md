# Games Prefix Manager (Decky Plugin)

This is a Decky Loader plugin converted from the standalone python script. It allows you to manage Proton prefixes (compatdata) for Steam and Non-Steam games, including finding and deleting orphan prefixes.

## Features
- List all Steam and Non-Steam game prefixes, and their sizes.
- Identify orphan prefixes (folders in compatdata that don't belong to any installed game).
- Batch delete prefixes.
- Clean up all orphans in one click.
- Option to backup prefixes before deletion (saved to `~/Documents/PrefixBackups`).

## Installation

### Prerequisites
- [Decky Loader](https://github.com/SteamDeckHomebrew/decky-loader) installed on your Steam Deck.
- Node.js and pnpm (for building).

### Build
1. Open a terminal in this directory.
2. Install dependencies:
   ```bash
   pnpm install
   ```
   (if you don't have pnpm, use `npm install` but Decky recommends pnpm)
3. Build the plugin:
   ```bash
   npm run build
   ```
   This will create a `dist` folder and a `zip` file.

### deploy
Copy the `games-prefix-manager` folder (or the build output) to `~/homebrew/plugins/` on your Steam Deck.
Or use the CLI if you have it set up.

## Development
- `main.py`: Backend logic (Python).
- `src/index.tsx`: Frontend UI (React/TypeScript).

## Note
This plugin manages files in `~/.local/share/Steam/steamapps/compatdata`. Use with caution. Always backup if unsure.
