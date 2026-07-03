#!/usr/bin/env node
/**
 * Compose standalone per-screen HTML files from the monolithic teacher-workbench-prototype.html.
 *
 * Each output file is fully self-contained: shared chrome (sidebar/topbar) duplicated,
 * full original CSS + JS included inline, screen-specific body extracted from source.
 * Cross-screen navigation rewritten to <a href="screens/foo.html">.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'teacher-workbench-prototype.html');
const ASSETS_DIR = path.join(ROOT, 'assets');
const SCREENS_DIR = path.join(ROOT, 'screens');
const TOKENS_LINK = '../assets/tokens.css';
const SHARED_CSS_LINK = '../assets/shared.css';
const SHARED_JS_LINK = '../assets/shared.js';

const html = fs.readFileSync(SRC, 'utf8');

// Extract <style> body (between <style> and </style>)
const styleMatch = html.match(/<style>([\s\S]*?)<\/style>/);
const cssFull = styleMatch ? styleMatch[1] : '';

// Extract <script> body
const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>/);
const jsFull = scriptMatch ? scriptMatch[1] : '';

// Helper: extract <section class="screen" id="X">...</section> with depth tracking,
// so nested <section class="annotation-category"> blocks are not chopped off.
function extractSection(id) {
  const startRegex = new RegExp(`<section class="screen[^>]*id="${id}"`, 'm');
  const startMatch = html.match(startRegex);
  if (!startMatch) return '';
  const startIndex = startMatch.index;
  // Walk forward from after the opening tag, tracking <section> nesting
  let depth = 1;
  let i = startIndex + startMatch[0].length;
  while (i < html.length && depth > 0) {
    const nextOpen = html.indexOf('<section', i);
    const nextClose = html.indexOf('</section>', i);
    if (nextClose === -1) return '';
    if (nextOpen !== -1 && nextOpen < nextClose) {
      depth++;
      i = nextOpen + 8;
    } else {
      depth--;
      i = nextClose + '</section>'.length;
    }
  }
  if (depth !== 0) return '';
  return html.slice(startIndex, i);
}

// Sidebar HTML — current link has class "active"
function makeSidebar(activeId) {
  const items = [
    { id: 'dashboard', label: '工作台', meta: '1' },
    { id: 'themes', label: '主题列表', meta: '2' },
    { id: 'corpus', label: '儿童语料库', meta: '3' },
    { id: 'map', label: '主题网络图', meta: '4' },
    { id: 'plans', label: '月/周计划', meta: '5' },
    { id: 'review', label: '审阅批注', meta: '7' },
  ];
  const links = items.map(it => {
    const isActive = it.id === activeId;
    const href = it.id === 'dashboard' ? '../index.html' : `${it.id}.html`;
    return `<a class="nav-btn${isActive ? ' active' : ''}" href="${href}">${it.label} <span class="meta">${it.meta}</span></a>`;
  }).join('\n        ');
  return `<aside class="sidebar" id="sidebar">
    <div class="brand">
      <div class="brand-mark">探</div>
      <div>
        <div>主题探究工作台</div>
        <div class="meta">中一班 · 2026 春</div>
      </div>
    </div>
    <nav class="nav-list" id="nav">
        ${links}
    </nav>
    <div class="sidebar-foot">
      <div class="mono">状态机 draft → submitted → reviewing → approved / returned</div>
    </div>
  </aside>`;
}

function makeTopbar() {
  return `<header class="topbar">
      <button aria-label="打开导航" class="btn mobile-menu" id="menuBtn">菜单</button>
      <input class="search" placeholder="检索主题、儿童语料、计划或批注" type="search" />
      <div class="row-between">
        <span class="badge badge-dot success">当前主题进行中</span>
        <button class="btn btn-primary btn-small" data-open-drawer="">新增语料</button>
      </div>
    </header>`;
}

// Rewrite data-screen / data-screen-link navigation in screen body and JS:
// - data-screen="foo" with a non-empty value inside a screen:
//   we'll convert at HTML-wrap time using URL mapping.
// Strategy: in each output, we don't include cross-screen buttons — they navigate via plain anchors.
// But the source uses `data-screen-link` and `[data-screen]` JS handlers.
// For minimal risk we leave the JS intact (it can no-op when those screens aren't present).
// Instead we leave buttons intact — they become harmless dead when those screens don't exist.

function rewriteButtons(body) {
  // Convert `data-screen-link="themes"` etc. to anchor attributes
  // Placeholders — we'll keep as-is; the screens live in this file, and `data-screen-link`
  // to another screen won't work. We'll convert these to anchors at the end.
  // For now, return body unchanged; cross-screen nav will need manual replacement later.
  return body;
}

function composeScreen(id, title, drawerHTML = '') {
  const sectionBody = extractSection(id);
  if (!sectionBody) {
    throw new Error(`No section found for id=${id}`);
  }
  // Add .active class to the section so it shows (overrides shared .screen { display: none })
  const activeSectionBody = sectionBody.replace('<section class="screen', '<section class="screen active');
  const sidebar = makeSidebar(id);
  const topbar = makeTopbar();
  const navScript = `
  // 移动端菜单
  var sidebar = document.querySelector('#sidebar');
  var menuBtn = document.getElementById('menuBtn');
  if (menuBtn) {
    menuBtn.addEventListener('click', function () { sidebar.classList.toggle('open'); });
  }
  document.addEventListener('click', function (event) {
    if (!event.target.closest('#sidebar') && !event.target.closest('#menuBtn')) {
      sidebar.classList.remove('open');
    }
  });
`;

  // Rewrite cross-screen buttons in body to plain anchors
  // data-screen-link="themes" -> <a href="themes.html">
  // data-screen="themes" inside button -> <a href="themes.html">
  // data-plan-link / data-review-link stay — they're handled by JS within plans.html/review.html
  let rewrittenBody = activeSectionBody
    // Convert buttons with data-screen-link to anchors
    .replace(/<button\s+([^>]*?)data-screen-link="([\w-]+)"([^>]*)>([\s\S]*?)<\/button>/g,
      (m, pre, screenId, post, content) => {
        const href = screenId === 'dashboard' ? '../index.html' : `${screenId}.html`;
        return `<a class="btn ${pre.replace(/class="[^"]*"/g, (c) => {
          const inner = c.slice(7, -1);
          return inner ? `class="${inner} btn"` : 'class="btn"';
        })} ${post}" href="${href}">${content}</a>`;
      })
    // Same for data-screen on button
    .replace(/<button\s+([^>]*?)data-screen="([\w-]+)"([^>]*)>([\s\S]*?)<\/button>/g,
      (m, pre, screenId, post, content) => {
        const href = screenId === 'dashboard' ? '../index.html' : `${screenId}.html`;
        return `<a class="btn ${pre} ${post}" href="${href}">${content}</a>`;
      });

  // Remove remaining JS handlers from buttons that have data-screen-link
  // (we already converted them to anchors)

  const drawerBlock = drawerHTML ? `\n${drawerHTML}\n` : '';

  const pageHeadTitle = `<div class="page-head">
<div><div class="eyebrow">Workbench</div><h1>${title}</h1></div>
</div>`;

  return `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8" />
<title>${title} · 主题探究教师工作台</title>
<meta name="viewport" content="width=device-width, initial-scale=1" />
<link rel="stylesheet" href="${TOKENS_LINK}" />
<link rel="stylesheet" href="${SHARED_CSS_LINK}" />
<style>
${cssFull}
</style>
</head>
<body>
<div class="app-shell">
${sidebar}
<main class="main">
${topbar}
<div class="content">
${rewrittenBody}
</div>
</main>
</div>
${drawerBlock}
<div aria-hidden="true" class="toast" id="toast"></div>
<script src="${SHARED_JS_LINK}"></script>
<script>
${navScript}
${jsFull}
</script>
</body>
</html>
`;
}

const screens = [
  { id: 'dashboard', title: '工作台', drawer: '' },
  { id: 'themes', title: '主题列表', drawer: '' },
  { id: 'corpus', title: '儿童语料库', drawer: '' },
  { id: 'map', title: '主题网络图', drawer: '' },
  { id: 'plans', title: '月/周计划', drawer: '' },
  { id: 'review', title: '审阅批注', drawer: '' },
];

// Utterance drawer is global; provide to screens that reference data-open-drawer
const utteranceDrawerHTML = `<div aria-hidden="true" class="drawer" id="drawer">
<div class="drawer-panel">
<div class="row-between">
<div><div class="eyebrow">New utterance</div><h2>新增儿童语料</h2></div>
<button class="btn btn-small" id="closeDrawer">关闭</button>
</div>
<div class="stack">
<div class="field">
<label for="childName">孩子姓名</label>
<select id="childName">
<option>孩子1</option>
<option>孩子2</option>
<option>孩子3</option>
<option value="custom">手动输入</option>
</select>
</div>
<div class="field" hidden="" id="customChildField">
<label for="customChildName">真实姓名或临时称呼</label>
<input id="customChildName" placeholder="老师记得时再填写"/>
</div>
<div class="field">
<label for="utteranceText">原话</label>
<textarea id="utteranceText" placeholder="听到孩子说的原话，或贴一段录音文字稿。"></textarea>
</div>
<div class="field">
<label>话语标签</label>
<div class="tag-picker" id="tagPicker"></div>
<div class="field" style="margin-top: var(--space-2);">
<input id="newTagInput" placeholder="新建标签，例如：屋顶 / 邻里关系 / 美感"/>
</div>
</div>
</div>
<div class="row-between" style="margin-top: var(--space-5);">
<button class="btn" id="closeDrawer2">取消</button>
<button class="btn btn-primary" id="saveUtterance">保存语料</button>
</div>
</div>
</div>`;

// Screens with global drawer trigger
const drawerScreens = new Set(['dashboard', 'corpus', 'map', 'themes']);

screens.forEach(s => {
  const drawer = drawerScreens.has(s.id) ? utteranceDrawerHTML : '';
  const out = composeScreen(s.id, s.title, drawer);
  const outPath = path.join(SCREENS_DIR, `${s.id}.html`);
  fs.writeFileSync(outPath, out);
  console.log(`Wrote ${outPath} (${out.length} bytes)`);
});
