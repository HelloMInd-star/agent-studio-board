# Y.Mine · 品牌战略到增长的完整决策链

**Define the brand → validate the market → set the strategy → collect the
result — entirely in your browser.**

A local-first decision chain for brand and growth: 19 modules, 21
deterministic analysis functions, 70 marketing frameworks. No backend, no
tracking, no login.

Live:
- Landing (what it does / how to use / roadmap): https://hellomind-star.github.io/agent-studio-board/landing.html
- Workspace (the tool): https://hellomind-star.github.io/agent-studio-board/

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
├── build.py                 # merges src/ -> index.html
├── index.html               # BUILD OUTPUT (deploy this)
├── src/
│   ├── index.template.html  # HTML shell with __CSS__ / __JS__ markers
│   ├── style.css            # all styles
│   ├── 01-core.js           # state definition
│   ├── 02-presets.js        # role / strategy / MBTI / workflow presets
│   ├── 03-rules.js          # banned-word rule library (102 rules)
│   ├── 04-store.js          # persistence, import/export
│   ├── 05-brand.js          # brand memory + knowledge-base injection
│   ├── 06-render.js         # chips, workflow steps, dataflow diagram
│   ├── 07-charts.js         # hand-written SVG chart engine
│   ├── 08-tools.js          # deterministic analysis tools
│   ├── 09-agent.js          # agent export (JSON/Coze/Dify) + trace
│   ├── 10-workspace.js      # agent workspace: intent routing + doc blocks
│   ├── 11-kb.js             # knowledge base rendering
│   ├── 12-generate.js       # generation logic
│   ├── 13-scan.js           # 6-dimension content health scoring
│   ├── 14-feedback.js       # false-positive reporting
│   ├── 15-bind.js           # event binding
│   └── 16-boot.js           # restore + bootstrap
└── ym-marketing-patch.js    # optional patch for the legacy version
```

### Build

```bash
python3 build.py           # build
python3 build.py --check   # validate without writing
```

`index.html` is committed so GitHub Pages works without a build step.

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

Five local functions are registered as callable tools, so a step can
execute deterministically instead of asking an LLM:

- `analyze_competitor_matrix`
- `evaluate_market_segments`
- `plan_marketing_calendar`
- `check_content_health`
- `generate_mind_map`
- `synthesize_marketing_plan`
- `calculate_pricing_strategy`
- `evaluate_regional_markets`
- `decide_hotspot_follow`
- `build_research_plan`
- `analyze_strategy_matrix`
- `calc_marketing_finance`
- `generate_mind_map`
- `synthesize_marketing_plan`
- `calculate_pricing_strategy`
- `evaluate_regional_markets`
- `decide_hotspot_follow`
- `build_research_plan`
- `analyze_strategy_matrix`
- `calc_marketing_finance`

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

### 3.9 Frame skeleton engine (70 diagrams from 24 skeletons)

The tool map lists 70 classic marketing frameworks. Naively that would mean
70 hand-written SVG renderers. It does not: **marketing frameworks collapse
into ~24 graphic structures**.

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

### 3.9b Brand Core (brandcore)

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

### 3.12 Brand timeline (timeline)

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

---

### 3.13 System settings (settings)

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

### 3.10 Information architecture


21 tabs are grouped by **task**, not by when they were built:

```
入口     guide
想清楚   hotspot · research · strat · tkm · toolmap · persona
算出来   strategy · pricing · market · fin
做出来   role · content · chart
串起来   flow · agent · cal · synth
存下来   kb · timeline · settings
```

The group labels double as a recommended path: figure out *what* to do,
compute *whether* it works, produce the content, wire it together, then
keep the output. `guide` is the default landing tab for the same reason —
20 tabs with no entry point is a list, not a workflow.

The manual mirrors this: each of the 22 module chapters opens with a
**user flow strip** (`input → steps → output`) plus a note on what to do
before and after, so a chapter answers "when do I open this" rather than
just "what does this do".

---

## 4. Data

Everything lives in `localStorage` under `ym_studio_v1`. Clearing browser
data wipes it — use "Export config" to back up.

Network, when enabled, sends prompts to the vendor you chose. This site has
no server and sees nothing.

---

## 5. Disclaimer

The banned-word library is a review aid, not legal advice. A hit does not
mean something is illegal. Platform rules change often — verify against the
current official source before publishing.
