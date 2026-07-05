#!/usr/bin/env node
// validate.mjs — 套組自檢：frontmatter 合規、行數上限、markdown 相對連結存在性。
// 用法：node scripts/validate.mjs [repo根目錄，預設為本腳本上一層]
// 規則來源：docs/maintenance.md（SKILL.md ≤120 行）與 skills/agent-entry（引用路徑必須存在）。
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(process.argv[2] ?? join(dirname(fileURLToPath(import.meta.url)), ".."));
const errors = [];
const warn = [];

// ---- 1. skills/*/SKILL.md：frontmatter + 行數 ----
const skillsDir = join(ROOT, "skills");
for (const name of readdirSync(skillsDir)) {
  const dir = join(skillsDir, name);
  if (!statSync(dir).isDirectory()) continue;
  const md = join(dir, "SKILL.md");
  if (!existsSync(md)) { errors.push(`skills/${name}/ 缺 SKILL.md`); continue; }
  const text = readFileSync(md, "utf8");
  const lines = text.split(/\r?\n/);

  const fm = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
  if (!fm) { errors.push(`skills/${name}/SKILL.md 缺 YAML frontmatter`); continue; }
  const get = (k) => fm[1].match(new RegExp(`^${k}:\\s*(.+)$`, "m"))?.[1]?.trim();
  const fmName = get("name");
  const desc = get("description");
  if (fmName !== name) errors.push(`skills/${name}: frontmatter name「${fmName}」≠ 目錄名`);
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(fmName ?? "")) errors.push(`skills/${name}: name 非小寫連字號格式`);
  if (!desc || desc.length < 20) errors.push(`skills/${name}: description 缺失或過短（要寫觸發時機）`);
  if (desc && desc.length > 500) warn.push(`skills/${name}: description 超過 500 字元，浪費技能清單 token`);
  if (lines.length > 120) errors.push(`skills/${name}/SKILL.md ${lines.length} 行，超過上限 120（maintenance.md）`);
}

// ---- 2. 全 repo markdown 相對連結/路徑存在性 ----
function* mdFiles(dir) {
  for (const e of readdirSync(dir)) {
    if ([".git", "node_modules"].includes(e)) continue;
    const p = join(dir, e);
    if (statSync(p).isDirectory()) yield* mdFiles(p);
    else if (/\.(md|template)$/.test(e)) yield p;
  }
}
for (const file of mdFiles(ROOT)) {
  const text = readFileSync(file, "utf8");
  const rel = file.slice(ROOT.length + 1).replace(/\\/g, "/");
  for (const m of text.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)) {
    const target = m[1].split("#")[0].trim();
    if (!target || /^(https?|mailto):/.test(target)) continue;
    if (target.includes("<") || target.includes("〔")) continue; // 模板佔位符
    const abs = resolve(dirname(file), target);
    if (!existsSync(abs)) errors.push(`${rel}: 壞連結 → ${target}`);
  }
}

// ---- 3. 範例 JSON 可解析且互相一致（僅套組 repo 本身有 mcp/ 時執行）----
if (existsSync(join(ROOT, "mcp/mcp-config.example.json"))) try {
  const posix = JSON.parse(readFileSync(join(ROOT, "mcp/mcp-config.example.json"), "utf8"));
  const win = JSON.parse(readFileSync(join(ROOT, "mcp/mcp-config.windows.example.json"), "utf8"));
  const keys = (o) => Object.keys(o.mcpServers).sort().join(",");
  if (keys(posix) !== keys(win)) errors.push("mcp 兩份範例的 server 清單不一致");
} catch (e) { errors.push(`mcp 範例 JSON 解析失敗：${e.message}`); }

// ---- 輸出 ----
for (const w of warn) console.log("WARN:", w);
if (errors.length) {
  for (const e of errors) console.error("ERROR:", e);
  console.error(`\n驗證失敗：${errors.length} 個錯誤`);
  process.exit(1);
}
console.log(`驗證通過（${warn.length} 個警告）`);
