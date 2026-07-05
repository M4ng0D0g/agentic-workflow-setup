#!/usr/bin/env node
// setup.mjs — agentic-workflow-setup 安裝器（零依賴，Node >=18）
//
// 用法： node setup.mjs [--target <專案目錄>] [--platforms claude,agents,gemini]
//                       [--dry-run] [--uninstall] [--verify] [--force]
//
// 行為：
//   detect   偵測目標專案有哪些平台目錄（沒有就依 --platforms 建立；預設 claude,agents）
//   install  複製 skills 與派工模板；入口檔（CLAUDE/AGENTS/GEMINI.md）不存在才從模板建立；
//            MCP 配置做「非破壞性合併」：只補缺少的 server key，絕不覆蓋既有設定；
//            自動填 MEMORY_FILE_PATH（三平台指向同一檔）；Windows 自動包 cmd /c。
//   lockfile 在目標寫 .agentic-workflow.lock.json（套組版本 + 每檔 sha256）。
//            重跑（升級）時：目標檔 hash == lockfile 記錄 → 安全覆蓋新版；
//            hash 不符（專案本地改過）→ 保留並列警告，由人裁決。
//   uninstall 只刪「hash 仍與 lockfile 一致」的檔案；改過的保留；入口檔與 MCP 合併不動（列出提醒）。
//   verify   對已安裝的 skills 跑 frontmatter/行數/連結檢查（同 scripts/validate.mjs 規則）。
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, statSync, rmSync, copyFileSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";

const SRC = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const opt = (name) => { const i = args.indexOf(`--${name}`); return i >= 0 ? (args[i + 1] ?? true) : undefined; };
const flag = (name) => args.includes(`--${name}`);

const TARGET = resolve(String(opt("target") ?? process.cwd()));
const DRY = flag("dry-run");
const VERSION = JSON.parse(readFileSync(join(SRC, "package.json"), "utf8")).version;
const LOCK = join(TARGET, ".agentic-workflow.lock.json");
const IS_WIN = process.platform === "win32";
const sha = (p) => createHash("sha256").update(readFileSync(p)).digest("hex");
const log = (...m) => console.log(DRY ? "[dry-run]" : "[setup]", ...m);

if (TARGET === resolve(SRC)) { console.error("請在目標專案執行，或用 --target 指定（不能裝進套組 repo 自己）。"); process.exit(1); }

// ---------- 平台偵測 ----------
const wanted = String(opt("platforms") ?? "").split(",").filter(Boolean);
const detected = ["claude", "agents", "gemini"].filter((p) =>
  existsSync(join(TARGET, { claude: ".claude", agents: ".agents", gemini: ".gemini" }[p])));
const platforms = wanted.length ? wanted : (detected.length ? detected : ["claude", "agents"]);
log(`目標：${TARGET}`);
log(`平台：${platforms.join(", ")}${detected.length ? `（偵測到：${detected.join(", ")}）` : "（未偵測到既有目錄，將建立）"}`);

// ---------- 安裝計畫 ----------
function* srcFiles(dir, base = dir) {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) yield* srcFiles(p, base);
    else yield p.slice(base.length + 1).replace(/\\/g, "/");
  }
}
const plan = []; // { src, dest }
const addTree = (srcRoot, destRoot) => { for (const rel of srcFiles(srcRoot)) plan.push({ src: join(srcRoot, rel), dest: join(destRoot, rel) }); };
if (platforms.includes("claude")) {
  addTree(join(SRC, "skills"), join(TARGET, ".claude", "skills"));
  plan.push({ src: join(SRC, "templates/delegation-prompts.md"), dest: join(TARGET, ".claude", "docs", "delegation-prompts.md") });
}
if (platforms.includes("agents")) {
  addTree(join(SRC, "skills"), join(TARGET, ".agents", "skills"));
  plan.push({ src: join(SRC, "templates/delegation-prompts.md"), dest: join(TARGET, ".agents", "delegation-prompts.md") });
}
const entries = [];
if (platforms.includes("claude")) entries.push(["templates/CLAUDE.md.template", "CLAUDE.md"]);
if (platforms.includes("agents")) entries.push(["templates/AGENTS.md.template", "AGENTS.md"], ["templates/GEMINI.md.template", "GEMINI.md"]);
if (platforms.includes("gemini") && !platforms.includes("agents")) entries.push(["templates/GEMINI.md.template", "GEMINI.md"]);

// ---------- uninstall ----------
if (flag("uninstall")) {
  if (!existsSync(LOCK)) { console.error("找不到 lockfile，無法安全移除。"); process.exit(1); }
  const lock = JSON.parse(readFileSync(LOCK, "utf8"));
  let removed = 0, kept = 0;
  for (const [rel, hash] of Object.entries(lock.files)) {
    const p = join(TARGET, rel);
    if (!existsSync(p)) continue;
    if (sha(p) === hash) { if (!DRY) rmSync(p); removed++; }
    else { console.warn(`保留（本地已修改）：${rel}`); kept++; }
  }
  if (!DRY) rmSync(LOCK);
  log(`移除 ${removed} 檔，保留 ${kept} 檔（本地修改）。入口檔與 MCP 合併項未動，需要時手動清理。`);
  process.exit(0);
}

// ---------- install ----------
const oldLock = existsSync(LOCK) ? JSON.parse(readFileSync(LOCK, "utf8")) : null;
const newFiles = {};
let copied = 0, skippedLocal = 0;
for (const { src, dest } of plan) {
  const rel = dest.slice(TARGET.length + 1).replace(/\\/g, "/");
  const srcHash = sha(src);
  if (existsSync(dest)) {
    const destHash = sha(dest);
    const known = oldLock?.files?.[rel];
    if (destHash === srcHash) { newFiles[rel] = srcHash; continue; }               // 已是最新
    if (known && destHash !== known && !flag("force")) {                           // 本地改過 → 保留
      console.warn(`保留本地修改（--force 可覆蓋）：${rel}`);
      newFiles[rel] = destHash; skippedLocal++; continue;
    }
  }
  if (!DRY) { mkdirSync(dirname(dest), { recursive: true }); copyFileSync(src, dest); }
  newFiles[rel] = srcHash; copied++;
}
for (const [tpl, name] of entries) {
  const dest = join(TARGET, name);
  if (existsSync(dest)) continue; // 入口檔永不覆蓋
  if (!DRY) copyFileSync(join(SRC, tpl), dest);
  log(`建立入口檔 ${name}（從模板，請填〈〉佔位符）`);
}

// ---------- MCP 非破壞性合併 ----------
const memPath = join(TARGET, ".agents", "mcp-memory.json").replace(/\//g, IS_WIN ? "\\" : "/");
const baseCfg = JSON.parse(readFileSync(join(SRC, IS_WIN ? "mcp/mcp-config.windows.example.json" : "mcp/mcp-config.example.json"), "utf8"));
baseCfg.mcpServers.memory.env.MEMORY_FILE_PATH = memPath;
const mcpTargets = [];
if (platforms.includes("claude")) mcpTargets.push(join(TARGET, ".mcp.json"));
if (platforms.includes("agents")) mcpTargets.push(join(TARGET, ".agents", "mcp_config.json"));
if (platforms.includes("gemini")) mcpTargets.push(join(TARGET, ".gemini", "settings.json"));
for (const cfgPath of mcpTargets) {
  let cfg = {};
  if (existsSync(cfgPath)) { try { cfg = JSON.parse(readFileSync(cfgPath, "utf8")); } catch { console.warn(`略過（JSON 解析失敗，不動它）：${cfgPath}`); continue; } }
  cfg.mcpServers ??= {};
  let added = 0;
  for (const [k, v] of Object.entries(baseCfg.mcpServers)) if (!cfg.mcpServers[k]) { cfg.mcpServers[k] = v; added++; }
  if (added && !DRY) { mkdirSync(dirname(cfgPath), { recursive: true }); writeFileSync(cfgPath, JSON.stringify(cfg, null, 2) + "\n"); }
  log(`MCP ${cfgPath.slice(TARGET.length + 1)}：補 ${added} 個 server（既有設定未動）`);
}

if (!DRY) writeFileSync(LOCK, JSON.stringify({ version: VERSION, installedAt: new Date().toISOString(), files: newFiles }, null, 2) + "\n");
log(`完成：複製 ${copied} 檔、保留本地修改 ${skippedLocal} 檔、lockfile v${VERSION}。`);

// ---------- verify ----------
if (flag("verify")) {
  const { spawnSync } = await import("node:child_process");
  for (const p of platforms.filter((x) => x !== "gemini")) {
    const dir = join(TARGET, p === "claude" ? ".claude" : ".agents");
    const r = spawnSync(process.execPath, [join(SRC, "scripts/validate.mjs"), dir], { encoding: "utf8" });
    console.log(`--- verify ${dir} ---\n${r.stdout}${r.stderr}`);
    if (r.status !== 0) process.exitCode = 1;
  }
}
