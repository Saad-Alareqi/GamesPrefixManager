import os, glob, re, struct, shutil
import tkinter as tk
from tkinter import ttk, messagebox, simpledialog

games = []
size_cache = {}
BACKUP_DIR = os.path.expanduser("~/Documents/PrefixBackups")
os.makedirs(BACKUP_DIR, exist_ok=True)

# -------------------------
# Helpers
# -------------------------
def get_folder_size(path):
    if path in size_cache:
        return size_cache[path]
    total = 0
    try:
        for root, dirs, files in os.walk(path):
            for f in files:
                fp = os.path.join(root, f)
                if os.path.exists(fp):
                    total += os.path.getsize(fp)
    except:
        total = 0
    size_cache[path] = total
    return total

def format_size(bytes):
    for unit in ["B","KB","MB","GB","TB"]:
        if bytes < 1024:
            return f"{bytes:.1f} {unit}"
        bytes /= 1024
    return f"{bytes:.1f} TB"

# -------------------------
# Steam Libraries
# -------------------------
def get_steam_library_folders():
    folders = []
    internal = os.path.expanduser("~/.local/share/Steam")
    if os.path.exists(internal):
        folders.append(internal)

    sd_root = "/run/media/deck"
    if os.path.exists(sd_root):
        for d in os.listdir(sd_root):
            p = os.path.join(sd_root, d)
            if os.path.isdir(p):
                folders.append(p)

    lib_file = os.path.expanduser("~/.local/share/Steam/steamapps/libraryfolders.vdf")
    if os.path.exists(lib_file):
        try:
            data = open(lib_file, "r", encoding="utf-8", errors="ignore").read()
            matches = re.findall(r'"\d+"\s+"([^"]+)"', data)
            for m in matches:
                if os.path.exists(m) and m not in folders:
                    folders.append(m)
        except:
            pass
    return folders

# -------------------------
# Steam Games
# -------------------------
def parse_steam_games():
    results = []
    for lib in get_steam_library_folders():
        steamapps = os.path.join(lib, "steamapps")
        compat_root = os.path.join(steamapps, "compatdata")
        for manifest in glob.glob(os.path.join(steamapps, "appmanifest_*.acf")):
            try:
                content = open(manifest, "r", encoding="utf-8", errors="ignore").read()
                name = re.search(r'"name"\s+"([^"]+)"', content)
                appid = re.search(r'"appid"\s+"(\d+)"', content)
                installdir = re.search(r'"installdir"\s+"([^"]+)"', content)
                if not name or not appid:
                    continue
                name = name.group(1)
                appid = appid.group(1)
                install_path = os.path.join(steamapps, "common", installdir.group(1)) if installdir else "-"
                prefix = os.path.join(compat_root, appid)
                exists = os.path.lexists(prefix)
                is_link = os.path.islink(prefix)
                status = "Deleted" if not exists else "Symlink" if is_link else "Folder"
                size = format_size(get_folder_size(prefix)) if exists else "-"
                results.append({
                    "name": name,
                    "appid": appid,
                    "type": "Steam",
                    "prefix_path": prefix,
                    "prefix_status": status,
                    "size": size,
                    "install_path": install_path
                })
            except:
                pass
    return results

# -------------------------
# Non-Steam Games
# -------------------------
def parse_nonsteam_shortcuts():
    results = []
    files = glob.glob(os.path.expanduser("~/.local/share/Steam/userdata/*/config/shortcuts.vdf"))
    if not files:
        return results

    data = open(files[0], "rb").read()
    pos = data.find(b'shortcuts\x00') + 10
    while pos < len(data):
        if data[pos] == 0x08: break
        pos = data.find(b'\x00', pos + 1) + 1
        current = {}
        while pos < len(data):
            t = data[pos]
            if t == 0x08:
                pos += 1
                break
            end_k = data.find(b'\x00', pos + 1)
            key = data[pos+1:end_k].decode("utf-8", errors="ignore")
            pos = end_k + 1
            if t == 0x01:
                end_v = data.find(b'\x00', pos)
                current[key] = data[pos:end_v].decode("utf-8", errors="ignore")
                pos = end_v + 1
            elif t == 0x02:
                current[key] = struct.unpack("<I", data[pos:pos+4])[0]
                pos += 4
            else:
                pos += 1
        if "AppName" in current and "appid" in current:
            appid = str(current["appid"])
            prefix = os.path.expanduser(f"~/.local/share/Steam/steamapps/compatdata/{appid}")
            exists = os.path.lexists(prefix)
            is_link = os.path.islink(prefix)
            status = "Deleted" if not exists else "Symlink" if is_link else "Folder"
            size = format_size(get_folder_size(prefix)) if exists else "-"
            results.append({
                "name": current["AppName"],
                "appid": appid,
                "type": "Non-Steam",
                "prefix_path": prefix,
                "prefix_status": status,
                "size": size,
                "install_path": current.get("Exe", "-")
            })
    return results

# -------------------------
# Orphan Prefixes
# -------------------------
def find_orphans(known_ids):
    results = []
    for lib in get_steam_library_folders():
        compat = os.path.join(lib, "steamapps", "compatdata")
        if not os.path.exists(compat):
            continue
        for folder in os.listdir(compat):
            if folder.isdigit() and folder not in known_ids:
                prefix = os.path.join(compat, folder)
                if not os.path.lexists(prefix):
                    continue
                status = "Symlink" if os.path.islink(prefix) else "Folder"
                size = format_size(get_folder_size(prefix))
                results.append({
                    "name": "ORPHAN PREFIX",
                    "appid": folder,
                    "type": "Orphan",
                    "prefix_path": prefix,
                    "prefix_status": status,
                    "size": size,
                    "install_path": "-"
                })
    return results

# -------------------------
# GUI
# -------------------------
def build_gui():
    root = tk.Tk()
    root.title("Steam Deck Prefix Manager PRO")
    try:
        root.attributes("-zoomed", True)
    except:
        root.geometry("1280x800")

    search_var = tk.StringVar()

    topbar = tk.Frame(root)
    topbar.pack(fill="x", padx=8, pady=4)
    tk.Label(topbar, text="Filter:").pack(side="left")
    tk.Entry(topbar, textvariable=search_var, width=40).pack(side="left", padx=6)

    table_frame = tk.Frame(root)
    table_frame.pack(expand=True, fill="both")

    cols = ("Game", "AppID", "Type", "Prefix Status", "Prefix Size", "Install Path")
    tree = ttk.Treeview(table_frame, columns=cols, show="headings", selectmode="extended")
    for col in cols:
        tree.heading(col, text=col)
        tree.column(col, width=320 if col=="Game" else 160)

    vsb = ttk.Scrollbar(table_frame, orient="vertical", command=tree.yview)
    hsb = ttk.Scrollbar(table_frame, orient="horizontal", command=tree.xview)
    tree.configure(yscrollcommand=vsb.set, xscrollcommand=hsb.set)
    tree.grid(row=0, column=0, sticky="nsew")
    vsb.grid(row=0, column=1, sticky="ns")
    hsb.grid(row=1, column=0, sticky="ew")
    table_frame.rowconfigure(0, weight=1)
    table_frame.columnconfigure(0, weight=1)

    # -------------------------
    # Refresh / Filter
    # -------------------------
    def refresh():
        tree.delete(*tree.get_children())
        size_cache.clear()
        steam = parse_steam_games()
        nonsteam = parse_nonsteam_shortcuts()
        known = {g["appid"] for g in steam + nonsteam}
        orphans = find_orphans(known)
        global games
        games = steam + nonsteam + orphans
        apply_filter()

    def apply_filter():
        tree.delete(*tree.get_children())
        q = search_var.get().lower()
        for g in games:
            if q and q not in (g["name"] + g["appid"]).lower():
                continue
            row = tree.insert("", "end", values=(
                g["name"], g["appid"], g["type"],
                g["prefix_status"], g["size"],
                g["install_path"]
            ))
            if g["prefix_status"] == "Deleted":
                tree.item(row, tags=("deleted",))
            elif g["type"] == "Steam":
                tree.item(row, tags=("steam",))
            elif g["type"] == "Non-Steam":
                tree.item(row, tags=("nonsteam",))
            else:
                tree.item(row, tags=("orphan",))
        tree.tag_configure("steam", foreground="black")
        tree.tag_configure("nonsteam", foreground="blue")
        tree.tag_configure("orphan", foreground="purple")
        tree.tag_configure("deleted", background="#FFCCCC")

    # -------------------------
    # Delete + Backup Option
    # -------------------------
    def delete_selected():
        selected = tree.selection()
        if not selected:
            return
        paths = []
        for item in selected:
            appid = tree.item(item, "values")[1]
            match = next((g for g in games if g["appid"] == appid), None)
            if match and os.path.lexists(match["prefix_path"]):
                paths.append(match["prefix_path"])
        if not paths:
            return

        # Ask for deletion method
        choice = messagebox.askyesnocancel(
            "Delete Option",
            f"Delete {len(paths)} prefixes:\nYes → Backup then delete\nNo → Delete without backup\nCancel → Do nothing"
        )
        if choice is None:
            return  # Cancelled
        backup_done = False
        for path in paths:
            try:
                if choice:  # Backup
                    backup = os.path.join(BACKUP_DIR, os.path.basename(path))
                    if os.path.exists(path):
                        shutil.make_archive(backup, "zip", path)
                        backup_done = True
                    if os.path.islink(path):
                        os.unlink(path)
                    else:
                        shutil.rmtree(path)
                else:  # Delete without backup
                    if os.path.islink(path):
                        os.unlink(path)
                    else:
                        shutil.rmtree(path)
            except Exception as e:
                messagebox.showerror("Error", str(e))

        if choice and backup_done:
            messagebox.showinfo("Backup Completed", f"Backup saved in:\n{BACKUP_DIR}")
        refresh()

    # -------------------------
    # Cleanup Orphans (Folders + Symlinks) with Confirmation
    # -------------------------
    def cleanup_orphans():
        orphan_count = sum(1 for g in games if g["type"] == "Orphan" and os.path.lexists(g["prefix_path"]))
        if orphan_count == 0:
            messagebox.showinfo("Cleanup", "No orphan prefixes found.")
            return

        choice = messagebox.askyesnocancel(
            "Cleanup Orphans",
            f"{orphan_count} orphan prefixes found.\nYes → Backup then delete\nNo → Delete without backup\nCancel → Do nothing"
        )
        if choice is None:
            return  # Cancelled
        removed = 0
        backup_done = False
        for g in games:
            if g["type"] == "Orphan" and os.path.lexists(g["prefix_path"]):
                try:
                    if choice:  # Backup then delete
                        backup = os.path.join(BACKUP_DIR, os.path.basename(g["prefix_path"]))
                        if os.path.exists(g["prefix_path"]):
                            shutil.make_archive(backup, "zip", g["prefix_path"])
                            backup_done = True
                    if os.path.islink(g["prefix_path"]):
                        os.unlink(g["prefix_path"])
                    else:
                        shutil.rmtree(g["prefix_path"])
                    removed += 1
                except Exception as e:
                    messagebox.showerror("Error", f"Failed to remove {g['prefix_path']}:\n{e}")
        if choice and backup_done:
            messagebox.showinfo("Backup Completed", f"Backup saved in:\n{BACKUP_DIR}")
        messagebox.showinfo("Cleanup", f"Deleted {removed} orphan prefixes (including symlinks)")
        refresh()

    # -------------------------
    # Controller Navigation
    # -------------------------
    def move_selection(delta):
        items = tree.get_children()
        if not items: return
        sel = tree.selection()
        idx = items.index(sel[0]) if sel else 0
        idx = max(0, min(len(items)-1, idx + delta))
        tree.selection_set(items[idx])
        tree.see(items[idx])

    def on_key(e):
        k = e.keysym
        if k == "Up": move_selection(-1)
        elif k == "Down": move_selection(1)
        elif k == "Prior": move_selection(-10)
        elif k == "Next": move_selection(10)
        elif k in ["Return","space"]: delete_selected()
        elif k in ["x","X"]: refresh()
        elif k in ["y","Y"]: cleanup_orphans()
        elif k == "Escape": root.destroy()
    root.bind("<Key>", on_key)

    # -------------------------
    # Buttons (Deck Style)
    # -------------------------
    btnbar = tk.Frame(root)
    btnbar.pack(fill="x", pady=6)
    tk.Button(btnbar, text="🔄 Refresh (X)", command=refresh).pack(side="left", padx=6)
    tk.Button(btnbar, text="🗑 Delete Selected (A)", command=delete_selected).pack(side="left", padx=6)
    tk.Button(btnbar, text="🧹 Cleanup Orphans (Y)", command=cleanup_orphans).pack(side="left", padx=6)

    # -------------------------
    # Right-click menu
    # -------------------------
    menu = tk.Menu(root, tearoff=0)
    menu.add_command(label="🗑 Delete Prefix", command=delete_selected)
    def right_click(e):
        iid = tree.identify_row(e.y)
        if iid:
            tree.selection_set(iid)
            menu.post(e.x_root, e.y_root)
    tree.bind("<Button-3>", right_click)

    # -------------------------
    # Column Sorting
    # -------------------------
    def sort_column(tree, col, reverse=False):
        data = [(tree.set(k, col), k) for k in tree.get_children('')]
        try:
            data.sort(key=lambda t: float(t[0].replace('B','').replace('KB','').replace('MB','').replace('GB','').replace('TB','')), reverse=reverse)
        except:
            data.sort(key=lambda t: t[0].lower(), reverse=reverse)
        for index, (_, k) in enumerate(data):
            tree.move(k, '', index)
        tree.heading(col, command=lambda: sort_column(tree, col, not reverse))
    for col in cols:
        tree.heading(col, command=lambda c=col: sort_column(tree, c, False))

    search_var.trace_add("write", lambda *a: apply_filter())
    refresh()
    root.mainloop()

if __name__ == "__main__":
    build_gui()
