# Y.Mine · 品牌战略到增长的完整决策链

**Define the brand → validate the market → set the strategy → produce the
content → collect the result — entirely in your browser.**

A local-first decision chain for brand and growth: **24 tabs (25 modules)**,
**40 deterministic calculations** (17 of them registered as orchestrable
workflow tools), **70 marketing frameworks** rendered from 25 graphic
skeletons, **5 SVG chart types**. No backend, no tracking, no login.

Live:
- Workspace (the tool): https://hellomind-star.github.io/agent-studio-board/
- Landing (what it does / how to use / roadmap): https://hellomind-star.github.io/agent-studio-board/landing.html
- Manual (33 chapters, each opening with a user-flow strip): https://hellomind-star.github.io/agent-studio-board/manual.html
- Design notes (architecture, decisions, mistakes, known issues): https://hellomind-star.github.io/agent-studio-board/design.html

---

## 1. Why this exists

Most marketing AI tools are wrappers that send your brief, competitor data
and campaign draft to someone else's server. Marketers won't paste that.

This tool runs entirely in the browser. Your data stays in `localStorage`.
Network access is **opt-in** and off by default — if you enable it, requests
go browser -> your chosen vendor directly, never through this site.

---

## 2. Project layout

Development is split into modules; the deployed artifact is a single file.

```
agent-studio-board/
├── build.py                 # merges src/ -> index.html (see list below)
├── index.html               # BUILD OUTPUT (deploy this) — ~820 KB single file
├── landing.html             # product page: what it does / how to use / roadmap
├── manual.html              # user manual: 33 chapters, 22 user-flow strips
├── design.html              # design notes: architecture, decisions, mistakes
├── src/
│   ├── index.template.html  # HTML shell with __CSS__ / __JS__ markers
│   ├── manual.template.html # manual source
│   ├── style.css            # all styles
│   ├── MANIFEST.txt         # module index (regenerate when adding files)
│   └── *.js                 # 43 modules, merged in the order below
└── ym-marketing-patch.js    # optional patch for the legacy version
```

### Build

```bash
python3 build.py           # build
python3 build.py --check   # validate without writing
```

`index.html` is committed so GitHub Pages works without a build step.

**Merge order matters.** `build.py` holds the authoritative list; several
modules must load before `16-boot.js` (which restores state and binds events)
and some depend on others (e.g. `32-tonecheck` after `30-brandcore`,
`28/29-frames*` before `27-toolmap`). The 43 modules by layer:

| Layer | Modules |
|---|---|
| Core & storage | `01-core` state · `02-presets` presets · `03-rules` banned-word library · `04-store` persistence |
| Render & charts | `05-brand` brand memory · `06-render` chips/steps · `07-charts` SVG engine |
| Tools & agent | `08-tools` calculators · `09-agent` export + trace · `10-workspace` intent routing |
| Content | `11-kb` knowledge base · `12-generate` generation · `13-scan` health scoring · `14-feedback` false-positive report |
| Marketing modules | `17-calendar` · `18-synth` · `19-pricing` · `20-market` · `21-hotspot` · `22-research` · `23-strategy` · `24-finance` |
| Entry & knowledge | `25-guide` scenario nav · `26-toolkit` 8 classic frameworks · `27-toolmap` 70-framework map · `28-framesvg` + `29-framecfg` skeleton engine |
| Brand chain | `30-brandcore` · `32-tonecheck` · `33-timeline` · `36-assets` |
| System & insight | `34-settings` · `35-insight` · `37-quarter` |
| Content packs | `38-packs` · `39-packwiz` |
| Bootstrap | `15-bind` event binding · `16-boot` restore + start (**must be last**) |

---

## 3. Feature map

### 3.1 Brand memory (global context)

Seven fields (brand, category, audience, USP, role, tone, banned words)
injected into every generation. Banned words also feed the compliance
scanner, so the two modules are coupled rather than parallel.

### 3.2 Knowledge base

Five preset folders. Documents are injected into generation as reference
material, with scope and count controls — so stored "user voice" actually
shapes the output instead of sitting in a notebook.

### 3.3 Content health check (6 dimensions)

| Dimension | Weight | Checks |
|---|---|---|
| Compliance | 30 | red / yellow / blue word hits |
| Platform fit | 15 | per-platform features (emoji, hashtags, structure) |
| Opening hook | 15 | numbers / question / hook words in first 40 chars |
| CTA | 10 | presence and position |
| Readability | 15 | sentence length, paragraphing, lists |
| Brand consistency | 15 | USP / audience / brand name present, banned words absent |

Total 0-100, grade A-E. Dims below 70% become prioritized fix items.
Score history is kept locally with a sparkline and delta vs last run.

### 3.4 Banned-word library

102 rules in three tiers:

- **red** — prohibited by advertising law, remove or qualify
- **yellow** — legal with evidence, prompted not blocked
- **blue** — platform-sensitive, may cause throttling

Every rule cites its basis. Platform rules are tagged per channel, so
scanning for Xiaohongshu doesn't fire Douyin-specific words.

Deliberately avoids over-blocking: "limited time", "100%", "guaranteed",
"organic" are NOT auto-flagged — they are legal in context. The scanner
says so instead of crying wolf.

### 3.5 Strategy: two modes

- **Prompt mode** — pick a framework, generate a structured prompt
- **Calc mode** — fill data, get a computed answer locally

Three calculators, all deterministic:

| Tool | Input | Output |
|---|---|---|
| Competitor matrix | dimensions + weights + scores 1-5 | weighted ranking, radar SVG, opportunities & threats |
| STP / GE matrix | segments: attractiveness, competitiveness, size | bubble chart, 4-quadrant action advice |
| Marketing calendar | nodes + lead time | timeline SVG, backward-scheduled tasks, countdown |

Opportunity rule: ours >= 4 AND rival average <= 3.
Threat rule: ours <= 2 AND strongest rival >= 4.

### 3.6 Chart engine

Hand-written SVG — no Chart.js, no CDN, nothing loaded at runtime.
Consulting-deck visual style: restrained navy, hairline rules, English
kicker labels, page footer. Export SVG (editable) or PNG (2x).

Five chart types:

| Type | Input |
|---|---|
| SWOT | four text boxes |
| Positioning map | `name,x,y` per line |
| Persona card | structured fields |
| Funnel | `stage,value` per line |
| Mind map | indented text — first line is the root, children by indent |

The mind map parses indentation into a tree (no JSON, no drag-and-drop),
lays it out with post-order x-positioning so parents center on their
children, and renders with the same frame as the other four.

### 3.7 Workflow orchestration

Steps carry: instruction, executor, input refs (`{{var}}`), output var,
on-error policy, quality gate. A live dataflow diagram validates variable
references and flags undefined or duplicated names.

Export to three formats:

| Format | Mapping |
|---|---|
| Standard Agent JSON | `executor:{type:function\|llm}`, `variables`, `on_error`, `quality_gate` |
| Coze workflow | start/llm/plugin/end nodes + edges |
| Dify DSL | `type:tool` vs `type:llm`, `error_strategy` mapping |

Fourteen local functions are registered as callable tools, so a step can
execute deterministically instead of asking an LLM:

| Index | Function | Module |
|---|---|---|
| 11 | `analyze_competitor_matrix` | 竞品对比矩阵 |
| 12 | `evaluate_market_segments` | STP 市场选择 |
| 13 | `plan_marketing_calendar` | 营销日历倒排 |
| 14 | `check_content_health` | 内容体检评分 |
| 15 | `generate_mind_map` | 思维导图 |
| 16 | `synthesize_marketing_plan` | 方案合成 |
| 17 | `calculate_pricing_strategy` | 定价策略 |
| 18 | `evaluate_regional_markets` | 区域市场 |
| 19 | `decide_hotspot_follow` | 热点决策 |
| 20 | `build_research_plan` | 调研方案 |
| 21 | `analyze_strategy_matrix` | 战略矩阵 |
| 22 | `calc_marketing_finance` | 财务测算 |
| 23 | `analyze_brand_core` | 品牌内核诊断 |
| 24 | `check_brand_tone` | 品牌调性约束 |

**Index alignment matters.** The workflow step stores `tool` as an index into
the `TOOLS` dropdown, and `LOCAL_TOOLS[i]` resolves it. Indices 18–22 were
previously defined only in `LOCAL_TOOLS` and absent from the dropdown, so
those five were unselectable, and the two appended entries (brandcore,
tonecheck) landed on 18/19 — silently dispatching **region** and **hotspot**
instead. Fixed by declaring all fourteen in `TOOLS` up front; a test asserts
11–24 resolve both ways.

**Trace**: record each step's real output with status and notes, export as
Markdown. Shows a workflow was executed, not just designed.

### 3.8 Agent workspace

Left: conversation. Right: editable document.

Free text is routed to a tool and actually executed. Replies are tagged
`executed local function` / `prompt` / `network` — no pretending.

Missing data runs on **sample data**, explicitly marked, so you see the
output shape before swapping in real numbers.

Document blocks are editable, reorderable, deletable, exportable. Any
block can be referenced back into the chat as context.

**Network is opt-in.** Paste your own API key (DeepSeek / Moonshot / GLM /
custom). Browser -> vendor directly. Subject to vendor CORS — the UI says
so rather than faking success.

---

### 3.9 Frame skeleton engine (70 diagrams from 25 skeletons)

The tool map lists 70 classic marketing frameworks. Naively that would mean
70 hand-written SVG renderers. It does not: **marketing frameworks collapse
into **25 graphic structures**.

```
quad2  grid3  radar  quadbubble  pyramid  funnel  journey  hex6
gauge  ring   scatter  curve     area     sankey  heat     cycle
bars   diamond  flow  cards      waterfall  gantt  matrix  cloud  treemap
```

Each framework is then just `skeleton type + labels`:

```js
'S-02': {s:'radar', t:'五边形雷达图',
         l:['供应商议价','购买者议价','新进入者','替代品','同业竞争']}
```

Two things this buys:

- **70 diagrams, ~750 lines of engine code** instead of 70 bespoke renderers
- Every card has real content — including the 39 frameworks *not* built as
  tools, which show a **structure diagram** plus `看什么 / 输出什么 / 常见误用`

These are **structure diagrams, not data charts**: they show what the
framework looks like and what goes in each cell. Real numbers come from the
actual tool modules. Export replaces CSS variables with computed colours so
the `.svg` renders standalone.

---

### 3.10 Brand Core (brandcore)

Replaces the old "Brand Personality" tab, which was a cocktail-flavoured
prompt wrapper with no computation at all (it carried `flavor` / `abv`
fields left over from a drinks project — deleted).

Three layers, defined top-down:

```
1 文化内核    Mission / Vision / Values
2 价值层级    functional → emotional → self-expressive  (must abstract upward)
3 人格调性    Tone of Voice   ← MBTI is now a *reverse* entry point
+ 商业模式    revenue model + monetization tactics (consistency check only)
```

**Position-type vs intensity-type dimensions.** `价格定位` has no
"better" direction — high = premium end, low = value end. Treating it as
intensity-type produces nonsense ("your price competitiveness is weak"
about Starbucks). Main-field detection therefore uses **absolute scores
(>= 4.0)**, not ratio-over-benchmark: luxury benchmarks are already 4.5,
so a 1.3x rule would demand 5.85/5 and flag every luxury brand as
"no main field" — which is exactly what the first implementation did.
Differentiation is measured separately, as **absolute deviation >= 0.5**.

**Five deterministic checks**

| Check | Rule |
|---|---|
| 主战场 | count of dims scored >= 4.0 (2-5 healthy) |
| 记忆点 | dims deviating >= 0.5 from category benchmark |
| 撕裂 | claim keywords vs actual dimension investment |
| 抽象度 | token overlap between adjacent value layers (>= 0.3 = restating) |
| 变现冲突 | monetization tactic × dimension, only when that dim is a real focus (ratio > 1.0) |

Validated against four real cases — Starbucks, Luckin, Chanel, Dior all
score >= 90 with 0 blockers; a deliberately torn case (luxury +
high-frequency discounting) scores 46 with 2 high-severity conflicts.

Benchmarks are **experience-based reference values, not a database** —
stated on the UI and adjustable.

### 3.11 Brand tone constraint (tonecheck)

This is the seam that turns "a brand module next to a content module" into
an actual chain: **what Brand Core computes becomes the scoring baseline for
content review**. Same copy, different brand, different verdict.

Three deterministic checks (no semantic understanding claimed — these are
surface language features, which is exactly where marketers slip):

| # | Check | How |
|---|---|---|
| ① | Tone consistency | 6 signals (exclamation density, emoji, absolutist words, promo words, 2nd person, avg sentence length) vs a **brand-derived expected range** |
| ② | Value-layer coverage | does the copy touch the functional / emotional / self-expression layers defined in Brand Core |
| ③ | Positioning taboos | hard-hit marketing action words, gated by the brand's own dimension scores |

The expected range is **derived, not hardcoded**. Each signal declares how
brand dimensions shift its acceptable band:

```js
{ k:'promo', n:'促销词', base:[0, 1.0],
  push:{ price:-0.90, status:-0.25, values:-0.15, speed:0.20, channel:0.15 } }
```

`price` is a **positional** dimension (high = premium, low = value-for-money
— neither is better). So promo language gets near-zero tolerance at the
premium end and a wide band at the value end. Verified:

| Copy | Brand | Result |
|---|---|---|
| "限时秒杀！全场最低价！赶紧冲！！！" | 香奈儿 (luxury, premium) | 🛑 **0/25**, hits 「折扣叫卖」taboo |
| same text | 瑞幸 (coffee, value-for-money) | ⚠️ **11/25**, no taboo hit — direction matches, only too shouty |
| normal promo copy | 瑞幸 | ✅ **21/25** (not a false positive) |
| house-tone copy | 香奈儿 | ✅ **23/25** |

The point is not "which brand is better" — it is that **a tool with no brand
baseline scores both of them identically**, which is the actual bug.

Baseline injection supports both modes: auto-read from Brand Core, or
manually switch (10 categories, or fall back to brand memory, or turn it
off). Registered as `check_brand_tone` (21st function) and routed from chat
via the `tonecheck` intent.

---

### 3.12 Information architecture


**23 tabs** are grouped by **task**, not by when they were built:

```
入口     guide                                                    (1)
想清楚   hotspot · research · strat · tkm · toolmap · persona      (6)
算出来   strategy · pricing · market · fin                         (4)
做出来   role · content · chart                                    (3)
串起来   flow · agent · cal · synth · packs                        (5)
存下来   kb · assets · timeline · settings                         (4)
```

A 24th capability — **brand tone constraint** — is not a tab: it is embedded
in the content module, where it scores generated copy against the brand
baseline computed by Brand Core.

The group labels double as a recommended path: figure out *what* to do,
compute *whether* it works, produce the content, wire it together, then
keep the output. `guide` is the default landing tab for the same reason —
23 tabs with no entry point is a list, not a workflow.

The landing page and the manual mirror this exact grouping (they were
re-aligned in v38 after the card order had drifted to "whichever round it
was built in", which put the entry point 16th). The manual's 33 chapters
open with a **user flow strip** (`input → steps → output`) plus a note on
what to do before and after, so a chapter answers "when do I open this"
rather than just "what does this do".

---

### 3.13 Brand timeline (timeline)

Seven kinds of records already existed in the product, but each was buried
inside its own module — nobody could see the whole picture:

| # | source | stored as | time format |
|---|---|---|---|
| 1 | marketing actions | `state.cal.events` | `YYYY-MM-DD` |
| 2 | competitor moves | `state.rivals[].events` | `YYYY-MM-DD` |
| 3 | content scores | `state.scores[].d` | `YYYY/M/D H:M:S` |
| 4 | strategy snapshots | `state.mx.snaps[].date` | `YYYY-MM-DD` |
| 5 | workflow runs | `state.trace{}.at` | ISO `YYYY-MM-DDTHH:MM:SS` |
| 6 | generation history | `state.history[].d` | `YYYY/M/D H:M:S` |
| 7 | chat | `state.chat[].at` | **time only** `HH:MM:SS` |

The hard part is not rendering — it is that these use **four different time
formats**, so `tlDay()` normalises all of them to `YYYY-MM-DD`.

One case cannot be fixed, and is therefore not faked: chat messages were
historically stored with `HH:MM:SS` only, so their date is unrecoverable.
`pushMsg()` now also writes a `d` field (new records are correct), but old
records have no date — the timeline marks them **"date unknown"** and sorts
them last, instead of pretending they happened today.

Read-only by design: it changes no existing data structure. Export to Markdown.

#### Traceability (batch 2)
The timeline only *aggregates*; the real detail lives in each module. So every
record is clickable and **jumps back to its source**. Calendar actions carry an
`id`, so those are located precisely — the calendar opens with that exact
event's edit dialog. Other types can only jump to module level, because their
records have no stable id. That limit is shown as-is rather than papered over.

#### Insights and export (batch 3)

Four deterministic aggregations over the same record set — no new data, no
guessing:

| card | what is computed | guard |
|---|---|---|
| 30-day activity | per-day record counts, mini bar chart | empty state when no records |
| content quality | least-squares slope over `state.scores` | **n < 5 → "insufficient sample"**, no trend claimed |
| execution rate | `done / total`, overdue = unfinished past planned date | n/a when no events |
| follow-up gaps | days since last record per type vs threshold | thresholds are heuristics, disclosed in UI |

The sample-size guard matters: a regression over 3 points produces a number,
but not a *conclusion*. The module shows the latest score and refuses to
describe a trend until enough observations exist.

**Calendar export** implements two RFC-ish details that are easy to get wrong:

- iCal `DTEND` is **exclusive** for all-day events. A single-day event on
  `09-04` must emit `DTEND;VALUE=DATE:20260905`; a range ending `09-08` emits
  `20260909`. Getting this wrong shifts every event by a day.
- RFC 5545 requires lines ≤ 75 octets; longer ones are folded with CRLF and
  the continuation starts with a space. Chinese counts as 3 bytes, so the
  folder measures UTF-8 bytes and folds at 70 to leave margin.

CSV export prepends a UTF-8 BOM (`\uFEFF`) — without it Excel renders Chinese
as mojibake. Fields containing `,` `"` or newlines are quoted and inner quotes
doubled.

---

### 3.14 System settings (settings)

All state lives in `localStorage`. There is `save()` / `load()` but — before
this module — **no backup export at all**. Clear the browser cache once and the
brand core, competitor dossiers, research plans and strategy snapshots are gone.

That is a contradiction sitting right next to the privacy promise:

| | |
|---|---|
| data never leaves the browser | good — nothing leaks |
| but there is no backup either | bad — losing it means losing it for good |

So local backup export is not an extra feature; it is the **required
counterpart** of the privacy claim. Without it, "never leaves your browser"
silently degrades into "gone forever".

Six groups, deliberately nothing more:

| Group | Contents |
|---|---|
| 💾 Data & backup | full JSON export / restore / clear, storage usage **breakdown** |
| 🎨 Appearance | light / dark (two-way sync with the topbar toggle) |
| 🏛️ Brand baseline | which brand the tone check scores against |
| 🚀 Startup | which tab opens by default |
| 🔒 Network | online toggle, off by default |
| ℹ️ About | positioning, runtime, storage |

Deliberately **not** built: accounts, cloud sync, i18n, custom shortcuts, a
plugin marketplace. Each either needs a backend (breaking the privacy promise)
or is something nobody would actually use.

#### Storage: a breakdown, not a "x / 5 MB" bar

The first version showed a single bar against the ~5 MB `localStorage` cap.
**That bar is dead on arrival.** Measured: filling every module with realistic
content lands around **475 KB — under 10 %** of the cap, so the bar sits at
1–2 % forever and the amber(50 %)/red(80 %) thresholds can never fire.

What actually blows the cap is a *single* behaviour: pasting hundreds of long
documents into the knowledge base — which is the one place with no cap and the
highest paste frequency. A single total bar cannot show *which* item grew.

So it now renders a **per-category breakdown**, with percentages computed
*between categories* (not against 5 MB) so the bars actually differentiate:

| Category | Capped? |
|---|---|
| 📚 Knowledge base | ❌ no (**the real risk**) |
| 💬 Workspace blocks | ❌ no |
| 🩺 Content scores | ✅ 100 entries |
| 🏛️ Strategy & dossiers | — |
| 🗂️ Other (chat / calendar / workflow / trace) | ✅ chat 60, history 50 |

Warnings use **absolute thresholds** instead of a percentage of 5 MB:
total > 512 KB → export; total > 1 MB (~250k chars) → export *and* clean;
knowledge base > 50 docs or > 2 MB → clean up; any single doc > 100 KB → split.

**Byte counting:** UTF-16 (2 bytes/char), which is what `localStorage` actually
uses. The earlier `Blob.size` version counted UTF-8 and **over-reported Chinese
text by ~50 %**.

#### Knowledge base soft cap

Soft = inform, never block:

- Saving a doc over **50 000 chars** (~100 KB) → confirm dialog stating the size
  and suggesting a split, but saving still proceeds if confirmed
- Total over **50 docs or 2 MB** → one-time toast (not repeated per save)
- A persistent "N docs · X KB" line under the doc list, amber when over

The stance is *informed consent*, not prohibition: users may store long material,
they just get to know what it costs.

---

### 3.15 Brand asset ledger (assets)

Registers **what brand assets exist and what state they are in** — Logo
versions, material progress, and colour/type specifications.

Deliberately **not** a design tool: no Logo drawing, no layout, no image editor.
A design surface would either drag in heavy dependencies (destroying the
zero-dependency single-file property) or end up a toy. What brand owners
actually lack is not another canvas but *which materials exist, who owns them,
whether they are approved, and whether the spec can be handed over in one click*.

| Interface | Purpose |
|---|---|
| Brand spec (Markdown) | Hand to designers / suppliers: colours, type, usage bans, Logo ledger, material list |
| Material CSV | Open in Excel as a progress sheet (UTF-8 BOM) |
| Export JSON | Backup, or restore on another device |
| Import JSON | Restore a ledger (overwrites; confirm first) |

**Colour reading and its limit.** A hex value is converted to HSL and given a
character reading (warm · high saturation · high lightness → energetic,
promotional). If **Brand Core** is filled in, the top-scoring positioning
dimension is used to hint whether the colour matches.

This is flagged in the UI as *empirical consensus, not exact science*.
Colour psychology cannot be verified the way LTV can, so the tool says
"there may be tension here" and never "you are wrong".

---

### 3.16 Calendar quarter view (quarter)

Month view shows **density**; quarter view shows **rhythm**. Three months side
by side make it visible at a glance whether three Q4 campaigns collide, or
where the gaps are.

- Span events appear on every covered day, with `↳` on continuation days
  (same logic as month view)
- Max 2 events per cell, overflow shown as `+N`; click an event to edit,
  click blank space to create
- Prev/next quarter rolls over the year automatically
- Switching back to month view lands on the corresponding month **within the
  quarter you were browsing**, so browsing context is not lost

---

### 3.17 Content packs (packs)

Productisation, not new capability. The four packs existed before as
workflow presets buried in a dropdown, while the landing page showed four
cards reading "coming soon" — the thing was built, but the door said closed.

| Pack | Steps | Local |
|---|---|---|
| 📕 小红书爆款 | 6 | 4 (`brandcore` → `scan` → `tonecheck` → `cal`) |
| ⚔️ 竞品情报 | 5 | 2 (`comp`, `mx`) |
| 🏷️ 品牌策略 | 5 | 3 (`brandcore`, `stp`, `mx`) |
| 📈 投放复盘 | 6 | 3 (`fin`, `scan`, `cal`) |

**Local-first re-orchestration.** The original presets were almost entirely
LLM steps — the 小红书 pack had *zero* local functions, meaning every step
required a manual round-trip to another AI platform. Re-sequenced so each
pack carries 2–4 genuinely executable steps, which is also what makes the
result page's charts possible.

**Where the visualisation comes from.** LLM output is free text and cannot
be structured, so charts are built from exactly two real sources: step
completion state, and the numbers returned by local functions
(`bcAnalyze().score`, `scoreContent().total`, `calcLtv().ratio`, …). Free
text is never dressed up as a chart.

**Execution reuse.** `pkRunLocal` calls the existing `runLocalStep` with a
throwaway container and reads back the textarea, so the 14-ish function
branches exist in exactly one place and cannot drift apart. `scan` and
`tonecheck` need a text argument, so those call `scoreContent` / `tcAnalyze`
directly with the previous step's output.

**Verified end to end.** Running 小红书 with a luxury brand profile and a
hard-sell draft (`限时秒杀！全场最低价！赶紧冲！！！`) yields: brand
health 90/100, content score 64/100, **tone 0/25** — the same copy scored
against a value brand passes. The brand→copy constraint holds through the
pack pipeline.


### 3.18 Pack wizard: standalone window + rule-based intake (packwiz)

**Three-stage full-screen modal.** Opening a pack no longer dumps six steps
into the page. A full-screen window carries a stage indicator
(`1 采集 → 2 执行 → 3 成果`):

1. **Intake** — three conversational questions (brand baseline / goal /
   hard limits). Answers are injected into every downstream prompt.
2. **Execution** — ⚡ steps run locally; 🤖 steps ship a copyable prompt.
3. **Result** — completion ring, metric cards, step distribution, Markdown export.

Collected context is shown as a bar at the top of the execution stage with an
inline "修改" shortcut back to stage 1.

**Off-topic detection is rule-based — no LLM.** Zero network, zero tokens,
no hallucination. Four checks, each with a specific anti-false-positive
fix:

| Check | Naive version would… | Actual rule |
|---|---|---|
| Empty / emoji-only / <2 chars | pass on symbols | rejected up front |
| Interrogative | flag *any* trailing `？` | **length豁免**: only <15 chars counts as a question |
| Blacklist | one global word list | **per-field** lists — mentioning "竞品" while answering "行业" is fine |
| Max length | none | 40–80 chars depending on field |

The length exemption matters: `我们的目标人群是 25-35 岁都市白领？` is a
valid answer with a trailing question mark. A naive regex rejects it.

**Tolerance.** Two consecutive off-topic hits surface "也可以直接跳过";
every skippable field keeps a permanent skip exit. A wrong judgement must be
escapable, not a dead end.

**Boundary: rules govern intake, not paste-back.** The checker serves
"ask one question, expect one short answer" (stage 1). It is deliberately
*not* applied to execution-stage paste boxes, where users return 300+
characters of LLM prose — interrogative/blacklist heuristics are meaningless
there. Those steps instead get a copyable prompt (pre-filled with the
collected brand/goal/limits) plus a live character counter that warns below
30 chars.

**Landing cards are now real entries.** The four home-page cards previously
read 即将推出 while the packs were already runnable. They now carry
`data-pack` and open the corresponding pack directly.

**Explicitly not built: LLM intent classification.** A second design (send
the answer to a model, let it reply `ok` / `off_topic`) was considered and
deferred. Rules already cover this intake surface, and a model call would
add latency, token cost and a new failure mode for no measurable gain. It
becomes worth revisiting only if real answers start getting rejected.

---

### 3.19 Design notes (`design.html`)

A standalone 12-chapter document, opened from the top bar of every page:

| Chapter | Contents |
|---|---|
| 1 | One-line positioning, and how "brand → growth" decomposes |
| 2 | Verified numbers — every count with how it was measured |
| 3 | Boundaries: 7 things deliberately not built, 4 that were re-framed |
| 4 | Six-layer architecture, plus an honest answer to "is this an agent?" |
| 5 | The 46 source files grouped by layer |
| 6 | Core algorithms (positional dimensions, the tone-0 case, sample-size guards) |
| 7 | All 23 tabs / 6 groups |
| 8 | Data design (`localStorage` shape, per-module keys) |
| 9 | Design decisions (e.g. why 70 frameworks need only 25 skeletons) |
| 10 | **Mistakes made and how they happened** |
| 11 | Known issues and what is deferred |
| 12 | Interview talking points and how to handle two hard questions |

Chapter 10 is the one worth reading if you read only one: it records bugs
that shipped — an inline `onclick` that could never resolve inside the IIFE,
a workflow dropdown whose index silently dispatched the *wrong* function, a
storage bar that could never fire, a colour rule whose threshold disagreed
with its own definition, and a "done" report that described work that did
not exist. Each entry names the cause, not just the fix.

---

### 3.20 Calendar week / day / board views (`40-calview.js`)

Three views that were on the roadmap as "in progress" and are now done.
Each answers a question the month and quarter views cannot:

| View | Question it answers |
|---|---|
| Week | What is my load this week — which day is overloaded, which is empty |
| Day | What exactly should I push today |
| Board | Where is work stuck (todo / doing / done / delayed) |

Design constraints, same as `37-quarter.js`:

- Reads `state.cal.events` only; no new data structure.
- Span events (`date` → `dateEnd`) appear on every covered day, with a
  `↳` continuation marker, identical across all five views.
- Board cards advance status with `▶` (todo → doing → done), and overdue
  items are flagged when `date < today` and status is not done.
- `40-calview.js` *takes over* `calApplyView` / `calStep` by saving the
  previous implementation and calling it for the month/quarter cases,
  rather than copying that logic — so the two files cannot drift apart.

### 3.21 Three more orchestrable tools (`41-moretools.js`)

`runLocalStep` used to be a single `if/else` chain in `10-workspace.js`.
Every new tool meant editing that file — and new tools often depend on
modules loaded *later* (assets, insight), which the chain could not see.
It now ends with a registry lookup:

```js
var LOCAL_STEP_RUNNERS = {};
// ...
else if (s.local.key && LOCAL_STEP_RUNNERS[s.local.key]) {
  out = LOCAL_STEP_RUNNERS[s.local.key]();
}
```

A module registers itself with `LOCAL_TOOLS[i]`, `TOOLS.push(...)`, and
`LOCAL_STEP_RUNNERS[key]`. The index must match the `TOOLS` array position —
an off-by-one here silently dispatches the *wrong* function, which is a bug
this project has already shipped once (see chapter 10 of `design.html`).

Added: `score_title_variants` (25), `audit_brand_assets` (26),
`analyze_brand_timeline` (27).

**Title scoring is deliberately shallow.** It scores surface features —
length, digits, hook words, exclamation density, absolute claims, promo
hard-sell words, emoji count, plus a brand-tone cross-check when Brand Core
is filled. It does not predict click-through; only a live test can. The
report says so, and the score is framed as "eliminate the obvious duds",
not "pick the winner".

---

### 3.22 Hotspot decision: five gates (`21-hotspot.js`, `43-hotpool.js`)

Rewritten from **weighted scoring to five gates**.

Hotspot chasing is a **negatively skewed** decision: upside is bounded (a
burst of impressions), downside is not (a brand incident is not reversible).
The expected value can be positive while a single tail event erases ten wins.
Scoring it produces false precision that hides tail risk. The original five
dimensions are demoted to background context and no longer produce a total.

| Gate | Question | Mechanism |
|---|---|---|
| 1 Red line | May we touch it at all | 🔴 veto · 🟡 downgrade · 🟢 proceed |
| 2 Brand fit | Does it match our values | reads category taboos from Brand Core |
| 3 Lag vs window | Can we still make it | `remaining − lag − ramp = effective` |
| 4 Posture | How hard to participate | silence → light → rewrite → heavy → reverse |
| 5 Pre-mortem | If it fails, why | 7-item checklist (Gary Klein) |

**Gate 3 is the only one that actually computes.** Most hotspots are not
"should not chase" but "too late" — everyone debates *whether* while nobody
calculates how long the material takes. Lag supports serial (sum) or parallel
(max). A negative result reads **"you cannot participate"**, not
"consider waiting". This turns "feels rushed" into "short by 6 hours".

**Reverse angles are gated to 🟢 only.** Deconstructing the mainstream
narrative is the strongest differentiator and the fastest way to cause
offence on a sensitive topic. With 🟡/🔴 they are not offered at all.

**Ceilings are absolute.** No promotion rule may cross them: red line →
silence; 🟡 → light at most; taboo conflict → light at most; effective
window ≤ 0 → silence; relevance or fit ≤ 2 → light at most; and **reverse is
never auto-recommended** (it appears only as a comparison row). Verified by a
180-combination invariant sweep.

**Entry: predictable hotspot pool (40 nodes).** Breaking hotspots cannot be
discovered without scraping, which breaks zero-dependency — and by the time
you notice, evaluate, and ship, the window has closed. Predictable nodes are
known a year ahead, so they can be *prepared for*, which is exactly what the
calendar, workflow and content packs are for. Lunar dates reuse `LUNAR_FEST`
from `17-calendar` rather than a second table. Nodes are auto-bucketed by days
remaining (live / prepare / future / archived-to-next-year) and each carries
"how it is usually won" plus "how it usually backfires".

**Exit: decision log with follow-up (V46).** Picking an action writes to
`state.hs.log` — topic, verdict, posture and chosen action. `hsFillResult()`
later records what actually happened and a one-line retrospective. Below 5
filled records the log **refuses to report a pattern** — the same
insufficient-sample rule used by the content-quality trend, because a
3-point "we are good at X" is noise dressed as insight. At 5 or more it
summarises which actions have actually been taken. Log entries surface as an
8th kind (🔥 hotspot tracking) on the Brand timeline, so a decision and its
outcome stay on one trail — the only place in the product where a decision
record and its result sit together. From any non-red verdict you can open a
content pack with the hotspot carried in as context.

### 3.23 Decision simulation (`44-sim.js`)

The strategy matrix answers *where you are*. This module answers *what happens if*.

| Block | Formula | What it actually tells you |
|---|---|---|
| Break-even | `Q* = F / (P − V)` | Break-even volume, **safety margin**, **operating leverage** (= contribution / profit: a leverage of 4.33 means a 10% volume swing moves profit ~43%) |
| Tornado | ±10% per variable on `Q*` | Which assumption, if wrong, kills the plan — the longest bar is the one to validate first |
| BCG movement | snapshot diff | Arrows between saved snapshots, with direction verdicts |

Two boundaries are enforced in code and stated in the export:

- **Linear by default, stepped as an option.** Real fixed costs jump when you add capacity. A `step` toggle raises fixed cost per capacity tier, which pushes the break-even point far to the right.
- **Contribution margin ≤ 0 returns `ok:false` with a message**, not a meaningless number.

The Markdown export closes with an explicit disclaimer: *this report does not predict the future, it shows the consequences of your assumptions.*

#### Batch 2: decision tree and learning curve

Two more blocks, both answering questions the matrix cannot:

| Block | Formula | What it actually tells you |
|---|---|---|
| Decision tree | `EV = Σ pᵢ × vᵢ`, net `= EV − cost` | Whether the bet is worth taking **under the probabilities you supplied** |
| Value of information | `VOI = (EV_after − EV_before) − research cost` | How much a research budget is worth — the pricing basis for spending on validation |
| Learning curve | `C(n) = C₁ × n^b`, `b = log₂(learning rate)` | How many more units you must build to match a rival, and whether you can survive that long |

**Decision tree.** Probabilities are subjective and the UI says so. The tool
does not predict outcomes; it turns your estimates into visible consequences.
Probabilities that do not sum to 100% are normalised with a visible note, and
**downside probability is reported separately** — net EV being positive does
not mean you can survive one failure, so the module says that explicitly when
downside probability exceeds 20%.

**Value of information** is the part worth pointing at in an interview: it
reframes "should we research this?" into "how much confidence does this
budget buy, and is that worth more than it costs?" — which connects directly
to the assumption evidence chain in the research module.

#### Batch 3: positioning and comparison

Three blocks that move the module from "what happens if" to "where should we
be, and are we actually different":

| Block | Input | What it actually tells you |
|---|---|---|
| Strategy clock | price (1-5) × perceived value (1-5) | Which of Bowman's **8 positions** you occupy — two of which are known to fail |
| Value curve | per-factor: you vs industry average | **Divergence score** plus the four actions framework (eliminate / reduce / raise / create) |
| CPM matrix | KSF × weight × per-player score | Weighted total, rank, and **shortfalls sorted by weighted impact** |

**Strategy clock.** Two of the eight positions — *high price / low value* and
*standard price / low value* — are not "hard", they have no survivors. Those
two return a `bad`-level warning rather than a neutral description. When
Brand Core data exists, the landing point is checked against the category's
baseline price; a deviation of 1.5 or more raises a tension note, and the
category taboos are surfaced alongside. The note says *there is tension*, not
*you are wrong* — the tool has no standing to make that call.

**Value curve.** The four actions are **mutually exclusive**: a factor marked
*create* is not also listed under *raise*, otherwise the same factor appears
twice and reads as a counting error. A curve that merely cuts without raising
anything is downgraded with an explicit message — that is cost-cutting, not
differentiation. Divergence near zero is `bad`: if the two lines overlap,
customers cannot say why they would pick you, and only price remains
comparable.

**CPM.** Weights are normalised, so they need not sum to 100. Scores are
clamped to 0–5. Shortfalls are ordered by `gap × weight`, not by raw gap,
because a 2-point deficit on a 50%-weight factor matters more than a
3-point deficit on a 5%-weight one.

None of the three are registered as orchestrable workflow tools: they are
interactive fill-in instruments whose output only makes sense with a table of
user-supplied rows, unlike the text-report tools that a workflow step can
call in one shot. This is why the count is **36 calculations but 17
orchestrable**.

**Learning curve.** Verified invariant: doubling cumulative output must drop
unit cost to exactly the learning rate (tested for 70/75/85/90/95%). The
useful output is not the curve but the inverse — `n = (target/C₁)^(1/b)` —
which answers *how many more units until we match them*. When you are behind,
the module states the gap and the remaining volume, then asks the question
that actually decides a price war: **can you survive that long?**

Both blocks state their boundaries in the UI and the export: the decision
tree assumes subjective probabilities, the learning curve assumes cost falls
only from cumulative volume (ignoring process leaps and material shifts).

### 3.24 Encoding and line endings (`.gitattributes`, `build.py`)

The whole pipeline is UTF-8 end to end, and this is now **enforced rather
than assumed**.

| Layer | Guarantee |
|---|---|
| Sources (`src/*`) | UTF-8, no BOM, LF only |
| `build.py` | reads and writes explicit `encoding='utf-8'`, `newline='\n'` |
| `index.html` / `landing.html` / `manual.html` / `design.html` | UTF-8, no BOM, LF only, `charset="UTF-8"` declared |
| CSV export | `\uFEFF` BOM prepended so Excel does not mojibake Chinese |
| SVG / Markdown export | `;charset=utf-8` on the Blob MIME type |
| localStorage accounting | counted as **UTF-16** (2 bytes per BMP char), not UTF-8 |

Two guards were added:

**`.gitattributes`** pins `eol=lf` for text and `binary` for archives and
fonts. Without it, a Windows checkout with `core.autocrlf=true` rewrites
every text file on every `git add`, which floods the terminal with
`warning: LF will be replaced by CRLF` and needlessly rewrites the 1 MB
`index.html` on each commit. Verified with `git check-attr`: `.js` reports
`text: set, eol: lf`, `.zip` reports `binary: set`.

**`build.py`** now fails the build if the output is not valid UTF-8, starts
with a BOM (which would invalidate `<!DOCTYPE>`), contains CRLF or a stray
CR, or lacks the `charset="UTF-8"` declaration. Encoding bugs are cheap to
prevent and confusing to debug later, so this is checked at build time
rather than discovered in a browser.

If you cloned before this file existed, renormalise once:

```bash
git add --renormalize .
```

---

### 3.25 Strategy matrix: weighted SWOT and vector layer (`45-stratviz.js`)

The strategy tab used to hold **one** real chart in 26 KB — the BCG matrix.
SWOT was four input boxes and TOWS was a table, even though every SWOT item
had already been storing `v` (value), `d` (change) and `src` (source) fields
that nothing ever read.

`45-stratviz.js` adds four vector pieces and, more importantly, makes SWOT
**computable**:

| Piece | What it answers |
|---|---|
| Weighted SWOT (A'WOT, simplified) | Which quadrant dominates — not "what did we list" |
| TOWS cross matrix | Which of the four strategies is actually available, and which is missing |
| Snapshot shift | How each business line moved between BCG quadrants |
| Posture track | Whether the strategy is converging or oscillating |

**How the weighting works.** Each item carries a weight of 1–5 (default 3).
Per quadrant the weighted sum feeds two net scores:

```
inner = (S − W) / (S + W) × 100     −100 = all weakness, +100 = all strength
outer = (O − T) / (O + T) × 100     −100 = all threats,  +100 = all opportunity
```

Those two numbers place the brand on a **posture map** whose four quadrants
map straight back onto TOWS: internal-strong/external-good is `SO` (attack),
internal-weak/external-good is `WO` (reinforce), and so on. So the weighted
SWOT does not just describe the situation — it tells you which TOWS strategy
should lead.

TOWS cell strength uses the **geometric mean** `√(A × B)`, not the arithmetic
one: if either side is empty the strategy cannot exist at all, and an
arithmetic mean would dress up "one side huge, the other nearly empty" as a
respectable middle score.

**The deliberate boundary.** Weight is the *only* quantified input. The `v`
field is used solely to flag whether an item has data behind it — it never
enters a sum, because `87%` and `¥1.2M` cannot be added. Summing them would
manufacture precision the user does not have. The UI states this, and warns
when every item still sits at the default weight (at which point weighting
degenerates into a plain item count).

Two further honesty guards:

- Change direction is parsed with **explicit signs first, Chinese direction
  words second, and "unknown" otherwise**. A naive number-only regex reads
  `下降 12 个点` ("down 12 points") as *+12* — an increase. That is a semantic
  error, not a formatting one, and it is caught by a test.
- The UI refuses to infer a direction from a bare `5%`.

---

### 3.26 Competitor move intelligence (`46-rivalintel.js`)

Competitor events were the **only time-series competitive data** in the whole
product — eight kinds of moves (launch / price / promo / channel / spokes /
funding / content / other), each with a date. They were used for exactly one
thing: printing them in reverse-chronological order. A spreadsheet, not an
intelligence tool.

`46-rivalintel.js` recognises six patterns from the events already recorded:

| Signal | Trigger |
|---|---|
| 💰 Price war | ≥2 real price cuts in 90 days, or ≥3 price/promo moves combined |
| 📣 Voice squeeze | ≥3 content/spokesperson moves in 30 days |
| 🆕 Product acceleration | ≥3 launches in 180 days **with shrinking intervals** |
| 🏬 Channel push | ≥2 channel moves in 90 days |
| 💼 Capital injection | ≥1 funding/M&A move in 365 days |
| 🌙 Silence | Newest move ≥90 days old |

**Not prediction.** It reports "the recorded data shows pattern X", never
"they will do Y next".

**Three deliberate boundaries:**

1. **Insufficient sample never yields a strong claim.** Two launches give you
   one interval and no baseline — so the signal fires as *low confidence* with
   "moves present, rhythm unclear", instead of claiming acceleration. Low
   confidence signals are excluded from the "most urgent" list.
2. **Every signal is falsifiable.** Each one lists the exact events that
   triggered it (date + type + text), so the user can overrule it. A verdict
   you cannot argue with has no value.
3. **Two guards against false alarms.** Promotions alone are not a price war
   (two sales campaigns are just business as usual — a real price cut, or
   unusual frequency, is required). And a *slowing* competitor raises no
   alarm: them decelerating is good news for you, not a warning.

`riSvgTimeline()` additionally plots the last 180 days as a per-competitor
row with type-coloured dots, so rhythm reads as *shape* — something a table
cannot show.

---

### 3.27 Pricing: elasticity realism and WTP hand-off (`19-pricing.js`, `22-research.js`)

Two gaps closed in the pricing module.

**Discount realism.** The promo table always computed the break-even multiple
("8折 needs +35% volume") but stopped at the number, leaving the user to
guess whether +35% is plausible. `judgeElasticity(mult, discPct, catKey)`
converts that into a required price elasticity:

```
|E| = (required volume increase) ÷ (price reduction)
```

and compares it against a per-category experience band (`ELAS_CAT`, nine
categories from 奢侈品 0.2–0.8 to 生鲜 2.0–4.0), tagging each level
`ok` / `stretch` / `unlikely`. Three points are deliberate:

- The bands are **textbook magnitude, not measurements of your product**. The
  report says so in as many words. It answers "is this ask absurd", never
  "this is your elasticity" — real elasticity needs your own price–volume
  history regressed.
- When the discounted price breaks unit variable cost, the tag is
  `impossible`, not a large number. Selling more then **widens** the loss; no
  elasticity rescues it, and printing one would be misleading.
- The category selector defaults to 通用 so nothing changes for existing users.

**Five methods, three algorithms.** 渗透 (×0.85) and 撇脂 (×1.25) are the
competitor-anchoring method at two fixed coefficients — the first is
identical to anchoring with 性价比 positioning, the second within 4% of
anchoring with 高端 positioning. Rather than quietly claiming five
independent methods, each now carries a `dup` note and the report adds an
inline disclosure. They are kept because the names are what people say.

**WTP hand-off.** `calcWTP()` in the research module now persists its
conclusions to `state.research.wtpRes` (revenue-maximising price, 50%
acceptance price, Van Westendorp optimal point and acceptable band). Pricing
renders a hand-off bar with one-click 带入 into 用户感知价值. Previously the
two modules were severed: research could compute the optimal price and pricing
still asked you to type a perceived value from memory.

### 3.28 Content factory: platform knowledge and generation-side injection (`47-platform.js`, `12-generate.js`)

The content generator used to emit this line:

> 平台：小红书（严格遵守该平台的调性、排版习惯与禁忌）

which was empty — the tool had no idea what that tone, layout or those taboos
were, so it handed the sentence to an external model and let the model guess.
The structure advice that followed was a generic three-paragraph shape
identical for every platform.

`47-platform.js` makes the missing knowledge explicit for 7 platforms
(小红书 / 抖音口播 / 公众号 / B站 / 知乎 / 微博 / 电商详情页): tone, opening
hook, a platform-specific structure, formatting rules, and platform taboos.
Generation now injects four layers, all from assets that already existed but
were never wired to generation:

1. **Platform knowledge** — structure, formatting, and the *real meaning of
   the requested length*.
2. **Category taboos** — from `BC_CATS.taboo` in the brand core.
3. **Brand tone → wording instructions** — from the brand core's dimensions.
4. **Platform-filtered banned words** — from `WORD_RULES`.

**The length band is where platforms differ most.** The same `800 字` means
standard long-form on 小红书, roughly 2.5–3 minutes of spoken script on 抖音,
a short article on 公众号, and is already over-long on 微博. One shared
length dropdown for all platforms was wrong; each platform now says what the
number actually implies.

**A bug found while building this.** `pfWordRisks()` originally kept only
`red`/`yellow` (legal-tier) words. Checking the data showed that every
platform-specific entry is `blue` (platform rule — 小红书's 私信我 / 加微信,
抖音's 点小黄车 / 手慢无), while `red`/`yellow` are legal and platform-agnostic.
Filtering to `red`/`yellow` therefore returned *zero* platform-specific words
and defeated the point. Ordering is now platform-specific first, then
red → yellow → blue, and the prompt labels each tier (red = illegal, blue =
not illegal but will get you throttled).

**Boundaries.** The seven profiles are editorial knowledge, not a substitute
for reading each platform's current rules — platforms change them often. The
injection is toggleable (`c_inject`), and the preview panel shows exactly what
will be injected rather than doing it invisibly.

---

## 4. Data

Everything lives in `localStorage` under `ym_studio_v1`. Clearing browser
data wipes it — use **System settings → export backup** for a full JSON copy.

Network, when enabled, sends prompts to the vendor you chose. This site has
no server and sees nothing.

---

## 5. Numbers

Every figure below was counted from source, not estimated. This section is
the single source of truth — if you add a module, update it here and in the
landing page together.

| Figure | Value | How it was counted |
|---|---|---|
| Tabs | **24** | unique `data-tab` values in `src/index.template.html` |
| Groups | **6** | unique `data-group` values |
| Modules | **25** | 24 tabs + brand tone constraint (embedded, not a tab) |
| Deterministic calculations | **40** | 31 `calc*` functions + 9 non-`calc` cores (`analyzeBrandCore`, `bcAnalyze`, `scoreContent`, `tcAnalyze`, `scoreTitles`, `auditAssetsCalc`, `analyzeTimelineCalc`, `riScanRival`, `judgeElasticity`) |
| Orchestrable in workflows | **17** | `LOCAL_TOOLS` indices 11–27 |
| Source files | **46** | `src/*.js`, merged by `build.py` |
| Platforms in content factory | **7** | `PLATFORMS` in `src/47-platform.js` — each with tone / structure / length-band / taboos |
| Frameworks mapped | **70** | `src/27-toolmap.js` — 27 done / 4 planned / 39 reference-only |
| Graphic skeletons | **25** | distinct `s:` values in `src/29-framecfg.js` |
| Chart types | **5** | `CHART_TYPES` in `src/07-charts.js` |
| Manual chapters | **35** | `<h2>` in `manual.html` (22 carry a user-flow strip) |
| Deployed artifact | **~1.0 MB** | `index.html`, single file, zero runtime dependencies |

Two of these are worth defending explicitly:

- **17 orchestrable, not 40.** Twenty-three calculations are called directly by
  their own module but were never registered as workflow tools. Two kinds:
  text-report tools that a workflow step could call (registering them is
  mechanical; no workflow has needed them yet), and interactive fill-in
  instruments — the strategy clock, value curve and CPM — whose output only
  makes sense with a table of user-supplied rows, so a single workflow step
  cannot invoke them meaningfully.
- **39 of 70 frameworks are reference-only.** They render a structure
  diagram and a `看什么 / 输出什么 / 常见误用` card rather than a calculator.
  That is a deliberate trade: a 39-item placeholder grid would be worse than
  honest reference content.

---

## 6. Disclaimer

The banned-word library is a review aid, not legal advice. A hit does not
mean something is illegal. Platform rules change often — verify against the
current official source before publishing. Category benchmarks in Brand Core
are experience-based reference values, not measurements from any dataset.

