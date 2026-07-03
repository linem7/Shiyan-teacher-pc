# Backup manifest

## 2026-07-02 — 单文件版本（拆分前快照）

**备份文件**：

1. `teacher-workbench-prototype.pre-split-2026-07-02.html`（项目根目录）— 拆分操作前的完整快照。
2. `_dbg/teacher-workbench-prototype.monolithic-snapshot.html`（`_dbg/` 子目录）— 同上内容的归档副本，方便在拆分后仍可对照原始单文件。

**单文件结构（拆分前）**

文件体积：335 KB（约 4469 行）。

包含 6 个 `.screen` 主屏幕 + 5 个全局抽屉 + 1 个 lessonDataStore：

| # | screen id | 中文名 | 大致行号 |
|---|---|---|---|
| 1 | `#dashboard` | 工作台 | 2110 |
| 2 | `#themes` | 主题列表（已合并详情） | 2204 |
| 3 | `#corpus` | 儿童语料库 | 2384 |
| 4 | `#map` | 主题网络图 | 2442 |
| 5 | `#plans` | 月/周计划 | 2495 |
| 6 | `#review` | 审阅批注 | 3540 |

抽屉与共享资源：

- `monthPlanDrawer` — 提交月计划抽屉
- `guideRefDrawer` — 3-6 岁指南参考抽屉
- `childCorpusDrawer` — 儿童语料库导入抽屉
- `lessonPeek` — 教案预览面板
- `lessonEditorDrawer` — 教案编辑器抽屉
- `lessonDataStore` — 所有教案文章数据（hidden）

**本次已知修复点**（在拆分前已完成）

- 删除多余的 `</div></div></section>`（约 3153–3155 行）— 修复 review 屏被浏览器解析器误挂到 body 的问题。
- `.review-month-panel.active` 改为 `display: block`，修复 grid 子元素被 `display: contents` 塌缩的问题。
- 审阅批注按四类来源（儿童语料库 / 月主题及月计划 / 周主题及周计划 / 教案内容）重组为分类 chunk 布局。

**拆分方案**（执行后请保留本文件作为回溯点）

将拆分为：

```
index.html                    ← 启动/概览页（含 6 屏卡片入口）
assets/
  tokens.css                  ← 设计系统 token
  shared.css                  ← chrome / buttons / badges 等共享样式
  shared.js                   ← 屏幕激活、抽屉交互等共享逻辑
screens/
  dashboard.html
  themes.html
  corpus.html
  map.html
  plans.html
  review.html
```

如果拆分过程出现意外，可直接以 `teacher-workbench-prototype.pre-split-2026-07-02.html` 为基础重启。
