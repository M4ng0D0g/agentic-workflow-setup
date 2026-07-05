# MCP 配置指南（純語言場景補強）

三個免 API key、npx 可跑的 server，補低階模型在研究/規劃/純文字任務的短板。

**版本策略**：`npx -y` 拉最新版（換取零維護），代價是 supply-chain 風險與行為漂移。
管理方式：下表「最後實測可用版本」欄記錄已知良好版本；若某 server 更新後行為異常，
把 args 中的套件名釘到該欄版本（例 `@modelcontextprotocol/server-memory@2026.7.4`）即回滾。
更新程序：`npm view <套件> version` 看新版 → 換一台/一個專案先試 → 正常再更新此表。

| server | 最後實測可用版本（2026-07-05，`npm view`＋實連） |
| --- | --- |
| `@modelcontextprotocol/server-sequential-thinking` | 2025.12.18（07-05 已滾至 2026.7.4，僅驗證存在） |
| `@modelcontextprotocol/server-memory` | 2026.1.26（07-05 已滾至 2026.7.4，僅驗證存在） |
| `@upstash/context7-mcp` | 3.2.2 |

## 需求 → server 對照

| 需求 | server | 用法判準 |
| --- | --- | --- |
| 多步推理留痕（規劃、除錯假設樹） | sequential-thinking | 只給多步題用；單步答案用它是浪費 |
| 跨 session 事實記憶（知識圖譜） | memory | 只記跨 session 仍為真的事實（裁決結論、環境事實）；不記任務中間狀態、不記 repo 已有的東西 |
| 外部庫**當前版本**文件查詢 | context7 | 寫依賴外部庫的代碼前查它，不要憑訓練記憶寫 API |

刻意不含：網頁搜尋/抓取與檔案存取（主流 agent CLI 都內建）、需 API key 的服務。

## 各平台配置位置（內容同一份；POSIX 見 mcp-config.example.json，Windows 見 mcp-config.windows.example.json——差別只在 `cmd /c` 包裝）

| 平台 | 位置 |
| --- | --- |
| Claude Code（專案共用） | `<專案>/.mcp.json` |
| Gemini CLI | `<專案>/.gemini/settings.json` |
| Antigravity（workspace） | `<專案>/.agents/mcp_config.json`；GUI：agent 面板「…」→ Manage MCP Servers → View raw config（來源：[官方 MCP 文件](https://antigravity.google/docs/mcp)，2026-07 查證） |
| Antigravity（全域） | `~/.gemini/config/mcp_config.json`（來源同上）；全域 skills 則放 `~/.gemini/config/skills/`（外部實測 2026-07-06 稱三種 flavor 通用，本套組未自行驗證），注意與 Gemini CLI 的 `~/.gemini/skills/` 不同 |

**同一專案配多平台時，各份內容保持一致；memory 的 `MEMORY_FILE_PATH` 指到同一個檔**，
三邊 agent 就共用同一份記憶。

## Windows 陷阱（實測）

1. `"command": "npx"` 直接寫會啟動失敗，必須包 cmd：
   `"command": "cmd", "args": ["/c", "npx", "-y", "<套件>"]`
2. 機器可能只有 `py` launcher 沒有 `python3`；且 Microsoft Store 的假 `python` alias
   會騙過存在性檢查——腳本偵測 Python 要用「實際執行 `-c "pass"`」而不是 `command -v`。

## 安裝與填充

用 repo 根目錄的 `setup.mjs` 安裝：它做非破壞性合併（只補缺少的 server key）、
依 OS 自動選 `cmd /c` 包裝、並把 `MEMORY_FILE_PATH` 自動填為
`<專案>/.agents/mcp-memory.json`（多平台指向同一檔）。手動安裝才需要自己改佔位符。
裝完健康檢查：在對應 CLI 開新 session，確認三個 server 的工具出現在工具清單
（例如 `sequentialthinking`、`search_nodes`、`resolve-library-id`）。

## 運行紀律（寫給 agent）

- 首次啟動經 npx 下載需網路；失敗重試一次，連續兩次失敗改用內建能力並回報，不要重試循環。
- MCP 查到的結果仍要驗證：context7 給的用法寫進代碼後照樣要跑測試。
- memory 讀到的記憶是「寫入當時為真」，涉及路徑先驗證仍存在再引用。
