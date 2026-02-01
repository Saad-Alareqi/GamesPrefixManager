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
} from "decky-frontend-lib";
import { VFC, useState, useEffect, useMemo } from "react";
import { FaTrash, FaSync, FaBroom, FaBoxOpen } from "react-icons/fa";

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
        <ModalRoot onCancel={closeModal} onEscap={closeModal}>
            <div style={{ padding: "20px" }}>
                <h3 style={{ marginBottom: "10px" }}>{title}</h3>
                <p style={{ marginBottom: "20px", whiteSpace: "pre-wrap" }}>{message}</p>
                <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
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
                        style={{ backgroundColor: "#d93025" }} // Red-ish
                    >
                        Delete (No Backup)
                    </DialogButton>
                    <DialogButton onClick={closeModal}>Cancel</DialogButton>
                </div>
            </div>
        </ModalRoot>
    );
};

const GameManager: VFC<{ serverAPI: ServerAPI }> = ({ serverAPI }) => {
    const [games, setGames] = useState<GameData[]>([]);
    const [filter, setFilter] = useState("");
    const [loading, setLoading] = useState(false);
    const [selected, setSelected] = useState<Set<string>>(new Set());

    const fetchGames = async () => {
        setLoading(true);
        try {
            const res = await serverAPI.callPluginMethod("get_games", {});
            if (res.result) {
                setGames(res.result as GameData[]);
            } else if (Array.isArray(res)) {
                setGames(res); // Should be this based on python return
            }
            setSelected(new Set());
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchGames();
    }, []);

    const filteredGames = useMemo(() => {
        if (!filter) return games;
        const lower = filter.toLowerCase();
        return games.filter(
            (g) =>
                g.name.toLowerCase().includes(lower) || g.appid.includes(lower)
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
                    // Loop delete
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
                    const res = await serverAPI.callPluginMethod("delete_prefix", {
                        appid: game.appid,
                        do_backup: backup,
                    });
                    setLoading(false);
                    await fetchGames();
                    console.log(res);
                }}
            />
        );
    };

    const handleCleanupOrphans = () => {
        const orphanCount = games.filter(
            (g) => g.type === "Orphan" && g.prefix_status !== "Deleted"
        ).length;
        if (orphanCount === 0) {
            return;
        }

        showModal(
            <ConfirmModal
                title="Cleanup Orphans"
                message={`Found ${orphanCount} orphan prefixes. Clean them up?`}
                closeModal={() => { }}
                onConfirm={async (backup) => {
                    setLoading(true);
                    const res = await serverAPI.callPluginMethod("cleanup_orphans", {
                        do_backup: backup,
                    });
                    setLoading(false);
                    await fetchGames();
                }}
            />
        );
    };

    return (
        <PanelSection title="Prefix Manager">
            <PanelSectionRow>
                <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                    <TextField
                        label="Filter"
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                    />
                    <ButtonItem layout="icon-only" onClick={fetchGames} disabled={loading}>
                        <FaSync />
                    </ButtonItem>
                    <ButtonItem
                        layout="icon-only"
                        onClick={handleBatchDelete}
                        disabled={loading || selected.size === 0}
                    >
                        <FaTrash />
                    </ButtonItem>
                    <ButtonItem
                        layout="icon-only"
                        onClick={handleCleanupOrphans}
                        disabled={loading}
                    >
                        <FaBroom />
                    </ButtonItem>
                </div>
            </PanelSectionRow>

            {loading && <PanelSectionRow>Loading...</PanelSectionRow>}

            <div style={{ marginTop: "10px" }}>
                {filteredGames.slice(0, 100).map((game) => (
                    <PanelSectionRow key={game.appid}>
                        <div
                            style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                width: "100%",
                                opacity: game.prefix_status === "Deleted" ? 0.5 : 1
                            }}
                            onClick={() => toggleSelection(game.appid)}
                        >
                            <div style={{ marginRight: "10px" }}>
                                <div style={{
                                    width: "16px", height: "16px",
                                    border: "1px solid currentColor",
                                    background: selected.has(game.appid) ? "currentColor" : "transparent"
                                }} />
                            </div>
                            <div style={{ flex: 1, marginRight: "10px" }}>
                                <div style={{ fontWeight: "bold" }}>{game.name}</div>
                                <div style={{ fontSize: "0.8em", opacity: 0.7 }}>
                                    {game.type} | {game.appid} | {game.size}
                                </div>
                                {game.prefix_status === "Deleted" && (
                                    <div style={{ color: "red", fontSize: "0.8em" }}>Deleted</div>
                                )}
                            </div>
                            <div onClick={(e) => e.stopPropagation()}>
                                <ButtonItem
                                    layout="icon-only"
                                    onClick={() => handleDelete(game)}
                                    disabled={game.prefix_status === "Deleted"}
                                >
                                    <FaTrash />
                                </ButtonItem>
                            </div>
                        </div>
                    </PanelSectionRow>
                ))}
            </div>
        </PanelSection>
    );
};

export default definePlugin((serverAPI: ServerAPI) => {
    return {
        title: <div className={staticClasses.Title}>Games Prefix Manager</div>,
        content: <GameManager serverAPI={serverAPI} />,
        icon: <FaBoxOpen />,
        onDismount() { },
    };
});
