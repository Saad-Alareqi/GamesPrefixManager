# Games Prefix Manager (Decky Plugin)

This is a Decky Loader plugin converted from my standalone python script. It allows you to manage Proton prefixes (compatdata) for Steam and Non-Steam games, including finding and deleting orphan prefixes.

## Features
- List all Steam and Non-Steam game prefixes, and their sizes.
- Identify orphan prefixes (folders in compatdata that don't belong to any installed game).
- Batch delete prefixes.
- Clean up all orphans in one click.
- Option to backup prefixes before deletion (saved to `~/Documents/PrefixBackups`).

## Installation
Install it via https://plugins.deckbrew.xyz/

## Note
This plugin manages files in `~/.local/share/Steam/steamapps/compatdata`. Use with caution. Always backup if unsure.
