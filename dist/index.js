(function (deckyFrontendLib, React) {
    'use strict';

    function _interopDefaultLegacy (e) { return e && typeof e === 'object' && 'default' in e ? e : { 'default': e }; }

    var React__default = /*#__PURE__*/_interopDefaultLegacy(React);

    const ConfirmModal = ({ title, message, onConfirm, closeModal }) => {
        return (React__default["default"].createElement(deckyFrontendLib.ModalRoot, { onCancel: closeModal },
            React__default["default"].createElement("div", { style: { padding: "20px" } },
                React__default["default"].createElement("h3", { style: { marginBottom: "10px" } }, title),
                React__default["default"].createElement("p", { style: { marginBottom: "20px", whiteSpace: "pre-wrap" } }, message),
                React__default["default"].createElement(deckyFrontendLib.Focusable, { style: { display: "flex", flexDirection: "row", gap: "10px", justifyContent: "flex-end" }, "flow-children": "row" },
                    React__default["default"].createElement(deckyFrontendLib.DialogButton, { onClick: () => {
                            onConfirm(true);
                            closeModal();
                        } }, "Backup & Delete"),
                    React__default["default"].createElement(deckyFrontendLib.DialogButton, { onClick: () => {
                            onConfirm(false);
                            closeModal();
                        } }, "Delete (No Backup)"),
                    React__default["default"].createElement(deckyFrontendLib.DialogButton, { onClick: closeModal }, "Cancel")))));
    };
    const PrefixManagerModal = ({ serverAPI, closeModal }) => {
        const [games, setGames] = React.useState([]);
        const [filter, setFilter] = React.useState("");
        const [loading, setLoading] = React.useState(false);
        const [selected, setSelected] = React.useState(new Set());
        const fetchGames = async () => {
            setLoading(true);
            try {
                const res = await serverAPI.callPluginMethod("get_games", {});
                console.log("get_games response:", res);
                if (res.result && Array.isArray(res.result)) {
                    setGames(res.result);
                }
                else if (Array.isArray(res)) {
                    setGames(res);
                }
                else {
                    setGames([]);
                }
                setSelected(new Set());
            }
            catch (e) {
                console.error("fetchGames error:", e);
                setGames([]);
            }
            finally {
                setLoading(false);
            }
        };
        React.useEffect(() => {
            fetchGames();
        }, []);
        const filteredGames = React.useMemo(() => {
            if (!Array.isArray(games))
                return [];
            if (!filter)
                return games;
            const lower = filter.toLowerCase();
            return games.filter((g) => (g.name || "").toLowerCase().includes(lower) || (g.appid || "").includes(lower));
        }, [games, filter]);
        const toggleSelection = (appid) => {
            const newSet = new Set(selected);
            if (newSet.has(appid)) {
                newSet.delete(appid);
            }
            else {
                newSet.add(appid);
            }
            setSelected(newSet);
        };
        const handleBatchDelete = () => {
            const toDelete = games.filter((g) => selected.has(g.appid));
            if (toDelete.length === 0)
                return;
            deckyFrontendLib.showModal(React__default["default"].createElement(ConfirmModal, { title: "Delete Selected", message: `Delete ${toDelete.length} prefixes?\n\n${toDelete.map((g) => g.name).slice(0, 5).join("\n")}${toDelete.length > 5 ? "\n..." : ""}`, closeModal: () => { }, onConfirm: async (backup) => {
                    setLoading(true);
                    for (const game of toDelete) {
                        await serverAPI.callPluginMethod("delete_prefix", {
                            appid: game.appid,
                            do_backup: backup,
                        });
                    }
                    setLoading(false);
                    await fetchGames();
                } }));
        };
        const handleDelete = (game) => {
            deckyFrontendLib.showModal(React__default["default"].createElement(ConfirmModal, { title: "Delete Prefix", message: `Delete prefix for ${game.name} (AppID: ${game.appid})?\nSize: ${game.size}\nStatus: ${game.prefix_status}`, closeModal: () => { }, onConfirm: async (backup) => {
                    setLoading(true);
                    await serverAPI.callPluginMethod("delete_prefix", {
                        appid: game.appid,
                        do_backup: backup,
                    });
                    setLoading(false);
                    await fetchGames();
                } }));
        };
        const handleCleanupOrphans = () => {
            const orphanCount = games.filter((g) => g.type === "Orphan" && g.prefix_status !== "Deleted").length;
            if (orphanCount === 0)
                return;
            deckyFrontendLib.showModal(React__default["default"].createElement(ConfirmModal, { title: "Cleanup Orphans", message: `Found ${orphanCount} orphan prefixes. Clean them up?`, closeModal: () => { }, onConfirm: async (backup) => {
                    setLoading(true);
                    await serverAPI.callPluginMethod("cleanup_orphans", {
                        do_backup: backup,
                    });
                    setLoading(false);
                    await fetchGames();
                } }));
        };
        return (React__default["default"].createElement(deckyFrontendLib.ModalRoot, { onCancel: closeModal },
            React__default["default"].createElement("div", { style: { width: "100%", height: "100%", padding: "0", display: "flex", flexDirection: "column", overflow: "hidden" } },
                React__default["default"].createElement("div", { style: { padding: "20px 20px 0 20px", display: "flex", flexDirection: "column", gap: "10px" } },
                    React__default["default"].createElement(deckyFrontendLib.Focusable, { style: { display: "flex", flexDirection: "row", justifyContent: "space-between", alignItems: "center" }, "flow-children": "row" },
                        React__default["default"].createElement("h3", { style: { margin: 0 } }, "Prefix Manager"),
                        React__default["default"].createElement(deckyFrontendLib.DialogButton, { style: { width: "40px", padding: "10px" }, onClick: closeModal }, "X")),
                    React__default["default"].createElement("div", null,
                        React__default["default"].createElement(deckyFrontendLib.TextField, { label: "Filter Games", value: filter, onChange: (e) => setFilter(e.target.value) })),
                    React__default["default"].createElement(deckyFrontendLib.Focusable, { style: { display: "flex", flexDirection: "row", gap: "10px" }, "flow-children": "row" },
                        React__default["default"].createElement(deckyFrontendLib.DialogButton, { onClick: fetchGames, disabled: loading, style: { flex: 1, minWidth: "0" } }, "Refresh"),
                        React__default["default"].createElement(deckyFrontendLib.DialogButton, { onClick: handleBatchDelete, disabled: loading || selected.size === 0, style: { flex: 1, minWidth: "0" } }, "Delete Selected"),
                        React__default["default"].createElement(deckyFrontendLib.DialogButton, { onClick: handleCleanupOrphans, disabled: loading, style: { flex: 1, minWidth: "0" } }, "Clean Orphans"))),
                loading && React__default["default"].createElement("div", { style: { textAlign: "center", padding: "10px" } }, "Loading..."),
                React__default["default"].createElement("div", { style: { flex: 1, overflowY: "auto", marginTop: "15px", padding: "0 20px 20px 20px" } },
                    filteredGames.length === 0 && !loading && React__default["default"].createElement("div", { style: { padding: "20px", textAlign: "center", border: "1px solid #444", borderRadius: "4px" } }, "No games found."),
                    React__default["default"].createElement("div", { style: { display: "flex", flexDirection: "column", gap: "10px" } }, filteredGames.slice(0, 100).map((game) => (React__default["default"].createElement("div", { key: game.appid, style: {
                            display: "flex",
                            flexDirection: "row",
                            alignItems: "center",
                            padding: "12px",
                            backgroundColor: selected.has(game.appid) ? "#3A3A3A" : "#1a1a1a",
                            border: "1px solid #333",
                            borderRadius: "4px",
                            opacity: game.prefix_status === "Deleted" ? 0.5 : 1
                        }, onClick: () => toggleSelection(game.appid) },
                        React__default["default"].createElement("div", { style: { marginRight: "15px", display: "flex", alignItems: "center" } },
                            React__default["default"].createElement("div", { style: {
                                    width: "24px", height: "24px",
                                    border: "2px solid #888",
                                    borderRadius: "4px",
                                    backgroundColor: selected.has(game.appid) ? "#fff" : "transparent"
                                } })),
                        React__default["default"].createElement("div", { style: { flex: 1, overflow: "hidden", marginRight: "10px" } },
                            React__default["default"].createElement("div", { style: { fontWeight: "bold", fontSize: "1.1em", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" } }, game.name),
                            React__default["default"].createElement("div", { style: { fontSize: "0.9em", opacity: 0.7, marginTop: "4px" } },
                                game.type,
                                " | ID: ",
                                game.appid,
                                " | ",
                                game.size,
                                " | ",
                                game.prefix_status)),
                        React__default["default"].createElement(deckyFrontendLib.DialogButton, { style: { width: "auto", padding: "8px 16px" }, onClick: (e) => { e.stopPropagation(); handleDelete(game); }, disabled: game.prefix_status === "Deleted" }, "Del")))))))));
    };
    const FolderCogIcon = () => {
        return (React__default["default"].createElement("svg", { viewBox: "0 0 24 24", fill: "currentColor", width: "1em", height: "1em" },
            React__default["default"].createElement("path", { d: "M20 6h-8l-2-2H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm0 12H4V8h16v10zM12 12c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm4 0c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm-8 0c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2z" })));
    };
    const GameManager = ({ serverAPI }) => {
        return (React__default["default"].createElement(deckyFrontendLib.PanelSection, { title: "Prefix Manager" },
            React__default["default"].createElement(deckyFrontendLib.PanelSectionRow, null,
                React__default["default"].createElement("div", { style: { fontSize: "0.9em", color: "#ddd", padding: "0 10px 10px 10px", lineHeight: "1.4em" } },
                    React__default["default"].createElement("p", null, "Use this tool to manage Game Prefixes (CompatData)."),
                    React__default["default"].createElement("ul", { style: { paddingLeft: "20px", marginTop: "5px" } },
                        React__default["default"].createElement("li", null,
                            React__default["default"].createElement("strong", null, "Refresh:"),
                            " Scan for all game prefixes and orphans."),
                        React__default["default"].createElement("li", null,
                            React__default["default"].createElement("strong", null, "Clean Orphans:"),
                            " Automatically find and delete prefixes for uninstalled games."),
                        React__default["default"].createElement("li", null,
                            React__default["default"].createElement("strong", null, "Delete Selected:"),
                            " Manually select and remove prefixes.")),
                    React__default["default"].createElement("p", { style: { marginTop: "10px", fontStyle: "italic", fontSize: "0.8em" } }, "Note: You can choose to backup prefixes before deletion."),
                    React__default["default"].createElement("p", { style: { marginTop: "10px", fontStyle: "bold", color: "red", fontSize: "0.8em" } }, "Warning: I'm not responsible for any data loss. or mistakenly deleting your prefixes folders."))),
            React__default["default"].createElement(deckyFrontendLib.PanelSectionRow, null,
                React__default["default"].createElement(deckyFrontendLib.ButtonItem, { layout: "below", onClick: () => {
                        deckyFrontendLib.showModal(React__default["default"].createElement(PrefixManagerModal, { serverAPI: serverAPI }));
                    } }, "Open Prefix Manager Window"))));
    };
    var index = deckyFrontendLib.definePlugin((serverAPI) => {
        return {
            title: React__default["default"].createElement("div", { className: deckyFrontendLib.staticClasses.Title }, "Games Prefix Manager"),
            content: React__default["default"].createElement(GameManager, { serverAPI: serverAPI }),
            icon: React__default["default"].createElement(FolderCogIcon, null),
            onDismount() { },
        };
    });

    return index;

})(DFL, SP_REACT);
