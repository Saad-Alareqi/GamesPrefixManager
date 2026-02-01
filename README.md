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

### Build Environment

You can build this plugin on **Windows**, **Ubuntu**, or directly on the **Steam Deck**.

#### Option A: Building on Windows (Recommended since you are already here)
1. Install [Node.js](https://nodejs.org/).
2. Open a command prompt/terminal in this folder.
3. Install dependencies: `npm install`
4. Build: `npm run build`
5. The output zip will be in the `dist` folder. Transfer this zip or folder to your Deck.

#### Option B: Building on Steam Deck
Yes, you can build directly on the Deck!
1. Switch to **Desktop Mode**.
2. Open the terminal (Konsole).
3. You need Node.js. The easiest way without unlocking the filesystem is using **nvm**:
   ```bash
   curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
   source ~/.bashrc
   nvm install node
   ```
4. Clone or copy these files to your Deck.
5. Ran `npm install` and `npm run build` inside the directory.

#### Option C: Ubuntu
Same as Windows/Deck. Just ensure `node` and `npm` are installed (`sudo apt install nodejs npm`).

### Deploy
Copy the `dist` folder (rename it to `games-prefix-manager` if needed) to:
`/home/deck/homebrew/plugins/games-prefix-manager`
Restart your Steam Deck (or the Decky Loader service).

## Development
- `main.py`: Backend logic (Python).
- `src/index.tsx`: Frontend UI (React/TypeScript).

## Note
This plugin manages files in `~/.local/share/Steam/steamapps/compatdata`. Use with caution. Always backup if unsure.
