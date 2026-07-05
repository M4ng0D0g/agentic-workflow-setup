# Changelog

本套組遵循 [SemVer](https://semver.org/lang/zh-TW/)。每節寫「對使用者的影響」，不是 commit 清單。

## [0.2.0] - 2026-07-06

### Added
- `setup.mjs`：零依賴 Node 安裝器——偵測平台（.claude/.agents/.gemini）、複製 skills、
  非破壞性合併 MCP 配置（自動填 `MEMORY_FILE_PATH`、Windows 自動加 `cmd /c`）、
  入口檔不存在才建立、寫入 lockfile（版本+檔案 hash）；支援 `--dry-run` / `--uninstall` / `--verify`。
- `scripts/validate.mjs`：frontmatter 合規、SKILL.md ≤120 行、markdown 相對連結存在性檢查（CI 與本地共用）。
- GitHub Actions CI（validate + setup 自測）。
- `templates/AGENTS.md.template`：Codex 等讀 AGENTS.md 的工具用；平台矩陣入 README。
- `evals/scenarios.md`：8 個行為場景（模糊需求→批次提問、二連敗→停手等），供人工或 agent 回歸驗證。
- CONTRIBUTING.md、.gitignore；七個 SKILL.md frontmatter 補 `license` 與 `metadata.version`。

### Changed
- README 安裝節改為腳本安裝為主、手動 `cp` 為備援；平台矩陣加 Codex（借道 `.agents/skills`）。
- MCP_SETUP 加「最後實測可用版本」欄與更新程序（回應 supply-chain/漂移風險）。
- maintenance.md 新增「上游↔專案更新通道」（lockfile 三方合併規則）。

## [0.1.0] - 2026-07-05

初版：7 個模型中立 skills、3 份入口/派工模板、MCP 配置指南、維護協議。
經一輪 fresh-context 對抗審查修復 13 項問題。
