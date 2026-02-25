import {
    definePlugin,
    ServerAPI,
    staticClasses,
    PanelSection,
    PanelSectionRow,
    ButtonItem,
    TextField,
    DialogButton,
    Navigation,
    showModal,
    ModalRoot,
    Focusable,
} from "decky-frontend-lib";
import React, { VFC, useState, useEffect, useMemo } from "react";

interface GameData {
    name: string;
    appid: string;
    type: "Steam" | "Non-Steam" | "Orphan";
    prefix_path: string;
    prefix_status: string;
    size: string;
    install_path: string;
}

const ConfirmModal: VFC<{
    title: string;
    message: string;
    onConfirm: (backup: boolean) => void;
    closeModal: () => void;
}> = ({ title, message, onConfirm, closeModal }) => {
    return (
        <ModalRoot onCancel={closeModal}>
            <div style={{ padding: "20px" }}>
                <h3 style={{ marginBottom: "10px" }}>{title}</h3>
                <p style={{ marginBottom: "20px", whiteSpace: "pre-wrap" }}>{message}</p>
                <Focusable style={{ display: "flex", flexDirection: "row", gap: "10px", justifyContent: "flex-end" }} flow-children="row">
                    <DialogButton
                        onClick={() => {
                            onConfirm(true);
                            closeModal();
                        }}
                    >
                        Backup & Delete
                    </DialogButton>
                    <DialogButton
                        onClick={() => {
                            onConfirm(false);
                            closeModal();
                        }}
                    >
                        Delete (No Backup)
                    </DialogButton>
                    <DialogButton onClick={closeModal}>Cancel</DialogButton>
                </Focusable>
            </div>
        </ModalRoot>
    );
};

const PrefixManagerModal: VFC<{ serverAPI: ServerAPI; closeModal?: () => void }> = ({ serverAPI, closeModal }) => {
    const [games, setGames] = useState<GameData[]>([]);
    const [filter, setFilter] = useState("");
    const [loading, setLoading] = useState(false);
    const [selected, setSelected] = useState<Set<string>>(new Set());

    const fetchGames = async () => {
        setLoading(true);
        try {
            const res = await serverAPI.callPluginMethod("get_games", {});
            console.log("get_games response:", res);
            if (res.result && Array.isArray(res.result)) {
                setGames(res.result as GameData[]);
            } else if (Array.isArray(res)) {
                setGames(res);
            } else {
                setGames([]);
            }
            setSelected(new Set());
        } catch (e) {
            console.error("fetchGames error:", e);
            setGames([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchGames();
    }, []);

    const filteredGames = useMemo(() => {
        if (!Array.isArray(games)) return [];
        if (!filter) return games;
        const lower = filter.toLowerCase();
        return games.filter(
            (g) =>
                (g.name || "").toLowerCase().includes(lower) || (g.appid || "").includes(lower)
        );
    }, [games, filter]);

    const toggleSelection = (appid: string) => {
        const newSet = new Set(selected);
        if (newSet.has(appid)) {
            newSet.delete(appid);
        } else {
            newSet.add(appid);
        }
        setSelected(newSet);
    };

    const handleBatchDelete = () => {
        const toDelete = games.filter((g: GameData) => selected.has(g.appid));
        if (toDelete.length === 0) return;

        showModal(
            <ConfirmModal
                title="Delete Selected"
                message={`Delete ${toDelete.length} prefixes?\n\n${toDelete.map((g: GameData) => g.name).slice(0, 5).join("\n")}${toDelete.length > 5 ? "\n..." : ""}`}
                closeModal={() => { }}
                onConfirm={async (backup: boolean) => {
                    setLoading(true);
                    for (const game of toDelete) {
                        await serverAPI.callPluginMethod("delete_prefix", {
                            appid: game.appid,
                            do_backup: backup,
                        });
                    }
                    setLoading(false);
                    await fetchGames();
                }}
            />
        );
    };

    const handleDelete = (game: GameData) => {
        showModal(
            <ConfirmModal
                title="Delete Prefix"
                message={`Delete prefix for ${game.name} (AppID: ${game.appid})?\nSize: ${game.size}\nStatus: ${game.prefix_status}`}
                closeModal={() => { }}
                onConfirm={async (backup) => {
                    setLoading(true);
                    await serverAPI.callPluginMethod("delete_prefix", {
                        appid: game.appid,
                        do_backup: backup,
                    });
                    setLoading(false);
                    await fetchGames();
                }}
            />
        );
    };

    const handleCleanupOrphans = () => {
        const orphanCount = games.filter(
            (g) => g.type === "Orphan" && g.prefix_status !== "Deleted"
        ).length;
        if (orphanCount === 0) return;

        showModal(
            <ConfirmModal
                title="Cleanup Orphans"
                message={`Found ${orphanCount} orphan prefixes. Clean them up?`}
                closeModal={() => { }}
                onConfirm={async (backup) => {
                    setLoading(true);
                    await serverAPI.callPluginMethod("cleanup_orphans", {
                        do_backup: backup,
                    });
                    setLoading(false);
                    await fetchGames();
                }}
            />
        );
    };

    return (
        <ModalRoot onCancel={closeModal}>
            <div style={{ width: "100%", height: "100%", padding: "0", display: "flex", flexDirection: "column", overflow: "hidden" }}>

                { }
                <div style={{ padding: "20px 20px 0 20px", display: "flex", flexDirection: "column", gap: "10px" }}>

                    { }
                    <Focusable style={{ display: "flex", flexDirection: "row", justifyContent: "space-between", alignItems: "center" }} flow-children="row">
                        <h3 style={{ margin: 0 }}>Prefix Manager</h3>
                        <DialogButton style={{ width: "40px", padding: "10px" }} onClick={closeModal}>X</DialogButton>
                    </Focusable>

                    { }
                    <div>
                        <TextField
                            label="Filter Games"
                            value={filter}
                            onChange={(e) => setFilter(e.target.value)}
                        />
                    </div>

                    { }
                    <Focusable style={{ display: "flex", flexDirection: "row", gap: "10px" }} flow-children="row">
                        <DialogButton onClick={fetchGames} disabled={loading} style={{ flex: 1, minWidth: "0" }}>
                            Refresh
                        </DialogButton>
                        <DialogButton
                            onClick={handleBatchDelete}
                            disabled={loading || selected.size === 0}
                            style={{ flex: 1, minWidth: "0" }}
                        >
                            Delete Selected
                        </DialogButton>
                        <DialogButton
                            onClick={handleCleanupOrphans}
                            disabled={loading}
                            style={{ flex: 1, minWidth: "0" }}
                        >
                            Clean Orphans
                        </DialogButton>
                    </Focusable>
                </div>

                {loading && <div style={{ textAlign: "center", padding: "10px" }}>Loading...</div>}

                { }
                <div style={{ flex: 1, overflowY: "auto", marginTop: "15px", padding: "0 20px 20px 20px" }}>
                    {filteredGames.length === 0 && !loading && <div style={{ padding: "20px", textAlign: "center", border: "1px solid #444", borderRadius: "4px" }}>No games found.</div>}

                    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                        {filteredGames.slice(0, 100).map((game) => (
                            <div
                                key={game.appid}
                                style={{
                                    display: "flex",
                                    flexDirection: "row",
                                    alignItems: "center",
                                    padding: "12px",
                                    backgroundColor: selected.has(game.appid) ? "#3A3A3A" : "#1a1a1a",
                                    border: "1px solid #333",
                                    borderRadius: "4px",
                                    opacity: game.prefix_status === "Deleted" ? 0.5 : 1
                                }}
                                onClick={() => toggleSelection(game.appid)}
                            >
                                <div style={{ marginRight: "15px", display: "flex", alignItems: "center" }}>
                                    <div style={{
                                        width: "24px", height: "24px",
                                        border: "2px solid #888",
                                        borderRadius: "4px",
                                        backgroundColor: selected.has(game.appid) ? "#fff" : "transparent"
                                    }} />
                                </div>
                                <div style={{ flex: 1, overflow: "hidden", marginRight: "10px" }}>
                                    <div style={{ fontWeight: "bold", fontSize: "1.1em", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                        {game.name}
                                    </div>
                                    <div style={{ fontSize: "0.9em", opacity: 0.7, marginTop: "4px" }}>
                                        {game.type} | ID: {game.appid} | {game.size} | {game.prefix_status}
                                    </div>
                                </div>
                                <DialogButton
                                    style={{ width: "auto", padding: "8px 16px" }}
                                    onClick={(e) => { e.stopPropagation(); handleDelete(game); }}
                                    disabled={game.prefix_status === "Deleted"}
                                >
                                    Del
                                </DialogButton>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </ModalRoot >
    );
};

const FolderCogIcon: VFC<{}> = () => {
    return (
        <svg viewBox="0 0 24 24" fill="currentColor" width="1em" height="1em">
            <path d="M20 6h-8l-2-2H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm0 12H4V8h16v10zM12 12c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm4 0c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm-8 0c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2z" />
        </svg>
    );
};

const GameManager: VFC<{ serverAPI: ServerAPI }> = ({ serverAPI }) => {
    return (
        <PanelSection title="Prefix Manager">
            <PanelSectionRow>
                <div style={{ fontSize: "0.9em", color: "#ddd", padding: "0 10px 10px 10px", lineHeight: "1.4em" }}>
                    <p>Use this tool to manage Game Prefixes (CompatData).</p>
                    <ul style={{ paddingLeft: "20px", marginTop: "5px" }}>
                        <li><strong>Refresh:</strong> Scan for all game prefixes and orphans.</li>
                        <li><strong>Clean Orphans:</strong> Automatically find and delete prefixes for uninstalled games.</li>
                        <li><strong>Delete Selected:</strong> Manually select and remove prefixes.</li>
                    </ul>
                    <p style={{ marginTop: "10px", fontStyle: "italic", fontSize: "0.8em" }}>Note: You can choose to backup prefixes before deletion.</p>
                    <p style={{ marginTop: "10px", fontStyle: "bold", color: "red", fontSize: "0.8em" }}>Warning: I'm not responsible for any data loss. or mistakenly deleting your prefixes folders.</p>
                </div>
            </PanelSectionRow>
            <PanelSectionRow>
                <ButtonItem
                    layout="below"
                    onClick={() => {
                        showModal(<PrefixManagerModal serverAPI={serverAPI} />);
                    }}
                >
                    Open Prefix Manager Window
                </ButtonItem>
            </PanelSectionRow>
        </PanelSection>
    );
};

export default definePlugin((serverAPI: ServerAPI) => {
    return {
        title: <div className={staticClasses.Title}>Games Prefix Manager</div>,
        content: <GameManager serverAPI={serverAPI} />,
        icon: <FolderCogIcon />,
        onDismount() { },
    };
});
