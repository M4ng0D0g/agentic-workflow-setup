# Agentic Workflow Setup

一套可攜的 AI Agent 工作制度套組。把「昂貴高階模型的一次性判斷力」蒸餾成固定規範，
讓任何低階模型（Sonnet / Haiku / Gemini 等）接手專案時：**不浪費 token、不進幻覺、
懂得問人、照統一架構做事**。

主要目標平台：**Claude Code**。次要：**Antigravity / Gemini CLI**（技能格式同構，皆為
`<skill-name>/SKILL.md` + YAML frontmatter）。

## 設計哲學（一段講完）

強模型的正確用法是產出「策略」而不是「答案」：planner–executor 分工、規則寫成可機械檢查的
判準與正反例、產出自帶驗收標準、驗證永遠由 fresh context 執行。本套組就是那份被蒸餾出來的
持久資產——低階模型不需要變聰明，只需要照著跑並誠實回報哪裡跑不通。

## 安裝

**Claude Code（專案級）**
```bash
# 在你的專案根目錄
cp -r <本repo>/skills/* .claude/skills/
cp <本repo>/templates/CLAUDE.md.template ./CLAUDE.md   # 沒有 CLAUDE.md 時；已有則手動合併路由表
```

**Antigravity / Gemini**
```bash
cp -r <本repo>/skills/* .agents/skills/
cp <本repo>/templates/GEMINI.md.template ./GEMINI.md
```

**MCP（可選，純語言場景補強）**：見 [mcp/MCP_SETUP.md](mcp/MCP_SETUP.md)。

## 內容地圖

| 路徑 | 內容 | 讀者 |
| --- | --- | --- |
| `skills/agent-entry/` | **唯一入口**：角色判定、任務分型路由、硬規則 | 所有 agent，開工必讀 |
| `skills/work-protocol/` | 執行紀律：回報合約、重試上限、反幻覺檢查表、token 經濟 | 所有 agent |
| `skills/human-intent/` | 人類語意理解與提問紀律＋**人類側工作規範** | 所有 agent + 人類 |
| `skills/task-planning/` | 計畫類任務：計畫書結構、驗收條件寫法、核准閘門 | 規劃時 |
| `skills/task-development/` | 開發類任務：畫面/資料/網路分層架構、設計模式統一、代碼紀律 | 寫代碼時 |
| `skills/task-delivery/` | 產出類任務：docs、架構圖（mermaid）、版本控管、交付格式 | 收尾時 |
| `skills/model-dispatch/` | 指揮側：模型階梯、升降級、派工三件套、驗證不自驗 | 有 subagent 能力的主模型 |
| `templates/` | CLAUDE.md / GEMINI.md 專案入口模板、派工 prompt 填空模板 | 裝機時 |
| `mcp/` | 三平台 MCP 配置範例與教程（Windows 陷阱含 `cmd /c`） | 裝機時 |
| `docs/maintenance.md` | 制度維護協議：誰能改什麼、教訓寫回哪、膨脹上限 | 想改規則的 agent |

## 三條不可簡化的底線（其餘都可因地制宜）

1. **完成＝證據**：能貼出測試輸出原文/exit code/來源引用才叫完成，「應該可以」不是完成。
2. **驗證不自驗**：驗收由 fresh-context agent 做，prompt 不夾帶實作者結論，問「找出問題」不問「確認沒問題」。
3. **查不到就標註**：「未查證」三個字永遠比編造便宜。

## 出處

由 Claude Fable 5 於 2026-07-05 一次性建立（planner–executor 蒸餾實驗的產物），
規則源自真實專案（Planist）中經兩輪對抗審查修正的制度。License: MIT。
