import os
import glob
import re
import struct
import shutil
import logging

# Set up logging
logger = logging.getLogger("GamesPrefixManager")

class Plugin:
    games = []
    size_cache = {}
    BACKUP_DIR = os.path.expanduser("~/Documents/PrefixBackups")

    # A normal method. It can be called from JavaScript using call_plugin_function("get_games")
    async def get_games(self):
        self.size_cache = {}
        os.makedirs(self.BACKUP_DIR, exist_ok=True)
        
        steam = self.parse_steam_games()
        nonsteam = self.parse_nonsteam_shortcuts()
        known_ids = {g["appid"] for g in steam + nonsteam}
        orphans = self.find_orphans(known_ids)
        
        self.games = steam + nonsteam + orphans
        return self.games

    async def delete_prefix(self, appid, do_backup):
        match = next((g for g in self.games if g["appid"] == str(appid)), None)
        if not match:
            return False, "Prefix not found in cache"
        
        path = match["prefix_path"]
        if not os.path.lexists(path):
            return False, "Path does not exist"

        try:
            if do_backup:
                os.makedirs(self.BACKUP_DIR, exist_ok=True)
                backup_path = os.path.join(self.BACKUP_DIR, os.path.basename(path))
                if os.path.exists(path):
                    shutil.make_archive(backup_path, "zip", path)
            
            if os.path.islink(path):
                os.unlink(path)
            else:
                shutil.rmtree(path)
            
            return True, "Success"
        except Exception as e:
            logger.error(f"Error deleting prefix: {e}")
            return False, str(e)

    async def cleanup_orphans(self, do_backup):
        orphan_count = sum(1 for g in self.games if g["type"] == "Orphan" and os.path.lexists(g["prefix_path"]))
        if orphan_count == 0:
            return 0, "No orphans found"

        removed = 0
        try:
            if do_backup:
                os.makedirs(self.BACKUP_DIR, exist_ok=True)

            for g in self.games:
                if g["type"] == "Orphan" and os.path.lexists(g["prefix_path"]):
                    path = g["prefix_path"]
                    if do_backup:
                        backup_path = os.path.join(self.BACKUP_DIR, os.path.basename(path))
                        if os.path.exists(path):
                            shutil.make_archive(backup_path, "zip", path)
                    
                    if os.path.islink(path):
                        os.unlink(path)
                    else:
                        shutil.rmtree(path)
                    removed += 1
            
            return removed, "Success"
        except Exception as e:
            logger.error(f"Error cleaning orphans: {e}")
            return removed, str(e)

    # -------------------------
    # Helpers
    # -------------------------
    def get_folder_size(self, path):
        if path in self.size_cache:
            return self.size_cache[path]
        total = 0
        try:
            for root, dirs, files in os.walk(path):
                for f in files:
                    fp = os.path.join(root, f)
                    if os.path.exists(fp):
                        total += os.path.getsize(fp)
        except:
            total = 0
        self.size_cache[path] = total
        return total

    def format_size(self, bytes_val):
        for unit in ["B","KB","MB","GB","TB"]:
            if bytes_val < 1024:
                return f"{bytes_val:.1f} {unit}"
            bytes_val /= 1024
        return f"{bytes_val:.1f} TB"

    def get_steam_library_folders(self):
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
                with open(lib_file, "r", encoding="utf-8", errors="ignore") as f:
                    data = f.read()
                matches = re.findall(r'"\d+"\s+"([^"]+)"', data)
                for m in matches:
                    if os.path.exists(m) and m not in folders:
                        folders.append(m)
            except:
                pass
        return folders

    def parse_steam_games(self):
        results = []
        for lib in self.get_steam_library_folders():
            steamapps = os.path.join(lib, "steamapps")
            compat_root = os.path.join(steamapps, "compatdata")
            
            manifest_pattern = os.path.join(steamapps, "appmanifest_*.acf")
            for manifest in glob.glob(manifest_pattern):
                try:
                    with open(manifest, "r", encoding="utf-8", errors="ignore") as f:
                        content = f.read()
                    name = re.search(r'"name"\s+"([^"]+)"', content)
                    appid = re.search(r'"appid"\s+"(\d+)"', content)
                    installdir = re.search(r'"installdir"\s+"([^"]+)"', content)
                    
                    if not name or not appid:
                        continue
                    
                    name = name.group(1)
                    appid = appid.group(1)
                    # Fixed: handle installdir safely
                    install_path = os.path.join(steamapps, "common", installdir.group(1)) if installdir else "-"
                    prefix = os.path.join(compat_root, appid)
                    
                    exists = os.path.lexists(prefix)
                    is_link = os.path.islink(prefix)
                    status = "Deleted" if not exists else "Symlink" if is_link else "Folder"
                    size = self.format_size(self.get_folder_size(prefix)) if exists else "-"
                    
                    results.append({
                        "name": name,
                        "appid": appid,
                        "type": "Steam",
                        "prefix_path": prefix,
                        "prefix_status": status,
                        "size": size,
                        "install_path": install_path
                    })
                except Exception as e:
                    logger.warning(f"Error parsing manifest {manifest}: {e}")
        return results

    def parse_nonsteam_shortcuts(self):
        results = []
        files = glob.glob(os.path.expanduser("~/.local/share/Steam/userdata/*/config/shortcuts.vdf"))
        if not files:
            return results

        try:
            with open(files[0], "rb") as f:
                data = f.read()
        except:
            return results
            
        pos = data.find(b'shortcuts\x00') + 10
        if pos == 9: # not found (-1 + 10)
            return results

        while pos < len(data):
            if data[pos] == 0x08: break
            try:
                next_null = data.find(b'\x00', pos + 1)
                if next_null == -1: break
                pos = next_null + 1
            
                current = {}
                while pos < len(data):
                    t = data[pos]
                    if t == 0x08:
                        pos += 1
                        break
                    
                    end_k = data.find(b'\x00', pos + 1)
                    if end_k == -1: break
                    key = data[pos+1:end_k].decode("utf-8", errors="ignore")
                    pos = end_k + 1
                    
                    if t == 0x01:
                        end_v = data.find(b'\x00', pos)
                        if end_v == -1: break
                        current[key] = data[pos:end_v].decode("utf-8", errors="ignore")
                        pos = end_v + 1
                    elif t == 0x02:
                        current[key] = struct.unpack("<I", data[pos:pos+4])[0]
                        pos += 4
                    else:
                        pos += 1

                if "AppName" in current and "appid" in current:
                    appid = str(current["appid"])
                    # Non-steam appids in shortcuts.vdf might need conversion 
                    # but the original script assumes simpler handling or these are already the id used for compatdata?
                    # Original script logic: 
                    # appid = str(current["appid"])
                    # prefix = ...compatdata/{appid}
                    # NOTE: calculating Steam Deck/Proton compatible AppID from shortcuts is complex (CRC32 stuff),
                    # but if the user script worked, we stick to it.
                    # Wait, the user script uses `current["appid"]`.
                    
                    prefix = os.path.expanduser(f"~/.local/share/Steam/steamapps/compatdata/{appid}")
                    exists = os.path.lexists(prefix)
                    is_link = os.path.islink(prefix)
                    status = "Deleted" if not exists else "Symlink" if is_link else "Folder"
                    size = self.format_size(self.get_folder_size(prefix)) if exists else "-"
                    
                    results.append({
                        "name": current["AppName"],
                        "appid": appid,
                        "type": "Non-Steam",
                        "prefix_path": prefix,
                        "prefix_status": status,
                        "size": size,
                        "install_path": current.get("Exe", "-")
                    })
            except Exception as e:
                logger.error(f"Error parsing shortcuts: {e}")
                break
                
        return results

    def find_orphans(self, known_ids):
        results = []
        for lib in self.get_steam_library_folders():
            compat = os.path.join(lib, "steamapps", "compatdata")
            if not os.path.exists(compat):
                continue
            for folder in os.listdir(compat):
                if folder.isdigit() and folder not in known_ids:
                    prefix = os.path.join(compat, folder)
                    if not os.path.lexists(prefix):
                        continue
                    status = "Symlink" if os.path.islink(prefix) else "Folder"
                    size = self.format_size(self.get_folder_size(prefix))
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
