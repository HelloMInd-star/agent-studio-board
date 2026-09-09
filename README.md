# Marketing AI Workspace - Y.Mine Agent Studio

> Strategy / Copywriting / Competitor / Ads - 40+ marketing templates and workflow builder
> Runs fully in your browser. No login, no upload, no network.

## 1. What is this

A single-file AI workspace built for marketers. It does NOT call any API.
Instead, it helps you break marketing tasks into structured inputs and
assemble high-quality prompts / strategy docs / execution chains,
which you can copy and paste into any AI platform.

**Positioning**: vertical AI workspace for marketers
**Business model**: engine free forever - paid content packs

## 2. Deploy

Pure static. Zero dependency. Zero build.

### GitHub Pages (recommended)

1. Push all files in this folder to your repo root (or `main` branch)
2. Settings -> Pages -> Source: `main` / `root`
3. Wait 1-2 min, visit `https://<username>.github.io/<repo>/`

### Local preview

Just double click `index.html`.

## 3. Files

| File | Note | Required |
|---|---|---|
| `index.html` | Main app, all logic in this single file | YES |
| `README.md` | This doc | optional |
| `ym-marketing-patch.js` | Positioning patch for the OLD index.html. Do NOT load it if you already use the new index.html | optional |

NOTE: If you want to keep your old index.html and only change positioning,
use the old one plus this line before `</body>`:
`<script src="ym-marketing-patch.js"></script>`
Pick ONE of the two. Do not use both.

## 4. Features

### 6 main tabs

| Tab | Function |
|---|---|
| Marketing Role | 8 marketing presets + structured fields -> prompt |
| Content Factory | 9 platforms, 4 lengths, 5 styles -> batch copy |
| Strategy Templates | 10 frameworks: SWOT / STP / Persona / Competitor / GTM / Message House / Calendar / 4P / PRD / Retro |
| Brand Persona | 16 MBTI types -> brand Tone of Voice guide |
| Marketing Workflow | 6-8 step chain builder, 11 routable nodes, 5 presets |
| Brand Knowledge | 5 preset folders, Markdown docs |

### Core mechanics

- **Brand Memory**: set default role + tone once, auto-injected into every generation
- **Banned Word Scan**: 40+ advertising law extreme words, one-click scan
- **History**: last 50 outputs, click to restore
- **Autosave**: all inputs in localStorage, survives refresh
- **Import / Export**: one-click JSON config


## 4.1 Banned Word Scanner (v2)

Three-level rule engine, NOT a keyword blacklist. A hit does NOT mean illegal.

| Level | Meaning | Action |
|---|---|---|
| RED | Banned by Advertising Law, near no exception | delete or rewrite with verifiable limits |
| YELLOW | Legal depends on evidence (organic / limited-time / 100%) | keep if you have proof |
| BLUE | Platform community rules only | may cause throttling, not illegal |

Built-in: 81 rules (38 red / 25 yellow / 18 blue), each with risk note,
suggested replacement, and legal basis.

Sources: Advertising Law, 2023 SAMR Guidelines on Absolute Terms Enforcement,
Cosmetic Labeling Measures, Drug Advertising Review Standards, platform public rules.


### 4.1.1 Platform-aware filtering

The scanner separates legal rules from platform rules:

- RED / YELLOW (legal) apply on all platforms
- BLUE (platform) only apply to the selected channel

Pick the target channel in Content Factory -> "Scan Platform":
`Xiaohongshu / Douyin / WeChat / Taobao / Bilibili / Zhihu / Weibo`,
or `All platforms` for the strictest pass, or `Follow channel above`
to reuse the platform selected for generation.

Same text, different channel, different result:

```
"加微信，点击有惊喜，好评返现"  -> XHS: 1 blue | Taobao: 2 blue | All: 3 blue
```

**Custom words**: go to Knowledge -> Banned Words folder. Edit with
`## RED` / `## YELLOW` / `## BLUE` sections, one word per line.
Merged automatically on next scan.

Disclaimer: auxiliary reference only, NOT legal advice. Human review required.


## 4.2 Business Chart Cards (new)

7th tab: fill data -> get a chart -> export. Pure hand-written SVG,
zero dependency, no network, no third-party lib.

| Chart | Input | Output |
|---|---|---|
| SWOT 2x2 | 4 text areas, one item per line | 4-quadrant board, color coded |
| Competitor Positioning Map | X/Y axis names + "name,x,y" points | scatter map, 0-10 coords |
| User Persona Card | name / age / job / goals / pains / quote | profile card, 4 color themes |
| Conversion Funnel | "stage,value" lines | funnel with step + overall rate |

Visual style: consulting-firm deck (restrained brand navy, hairline rules,
generous whitespace, English kicker labels + page footer). High-res export.

Export: SVG (editable in Figma/PPT) and PNG (2x resolution).
Data is saved in localStorage like everything else.

Jump button: Strategy tab -> "Chart Card" auto-maps the current
framework to a chart type and prefills the project name.


## 4.3 Content Health Check (6-dimension scoring)

Upgraded from a plain banned-word scan to a 6-dimension score card.
Pure rules, no AI, no network.

| Dimension | Weight | What it checks |
|---|---|---|
| Compliance | 30 | red / yellow / blue word hits |
| Platform fit | 15 | per-platform features (emoji, hashtags, structure) |
| Opening hook | 15 | numbers / question / hook words in first 40 chars |
| CTA | 10 | presence and position of call-to-action |
| Readability | 15 | sentence length, paragraphing, list structure |
| Brand consistency | 15 | USP / audience / brand name present, banned words absent |

Total 0-100, grade A-E. Weak dims (<70%) are listed as prioritized
fix items with concrete suggestions.

**Score history (memory)**: every check is recorded with timestamp,
platform and per-dimension breakdown. Right panel shows a 12-run sparkline
plus delta vs last run. "History" button prints the full log with an
overall first -> latest progression. Stored in localStorage.


## 4.4 False-positive reporting

The 102-rule library will make mistakes. A "Report issue" button next to
the health check opens a dialog that pre-fills a feedback payload:

- feedback type (false positive / missed word / wrong level / bad suggestion)
- the flagged word, picked from the current scan result
- current level + the rule's own reasoning
- surrounding context from the user's text
- the user's own explanation
- current score

Output is plain text the user copies and sends manually (WeChat / email /
form). **Nothing is auto-uploaded** - this keeps the no-network promise
while still collecting the signal that matters most.

Also works without a prior scan, for reporting missed words.


## 4.5 Strategy analysis tools (actually compute, not prompt)

The Strategy tab has two modes:

- **Prompt mode** - pick a framework, generate a prompt for your AI
- **Calc mode** - fill data, get a computed conclusion + chart locally

Three calculators, all deterministic (same input = same output, no LLM):

| Tool | Input | Computation | Output |
|---|---|---|---|
| Competitor matrix | dimensions w/ weights + per-competitor scores 1-5 | weighted total, ranking | ranking table, radar SVG, opportunity & threat detection |
| STP / GE matrix | segments: attractiveness, competitiveness, size | priority = base x log-scale size weight | bubble chart, 4-quadrant action advice |
| Marketing calendar | nodes + lead time | date math, countdown | timeline SVG, backward-scheduled task list |

Opportunity rule: our score >= 4 AND rival average <= 3.
Threat rule: our score <= 2 AND strongest rival >= 4.

Each tool exposes a **Function Schema** button that prints a JSON
function definition - the same computation callable by an agent as a
tool. This is the bridge between "a calculator" and "an agent skill".


## 4.6 Agent export + execution trace

The workflow builder now emits importable agent definitions instead of
just Markdown. Three formats:

| Format | File | Mapping |
|---|---|---|
| Standard Agent JSON | `agent-*.json` | steps with `executor:{type:function|llm}`, `variables` from `output_var`, `on_error`, `quality_gate` |
| Coze workflow | `coze-workflow-*.json` | start/llm/plugin/end nodes + edges |
| Dify DSL | `dify-dsl-*.yml.json` | `type:tool` vs `type:llm` nodes, `error_strategy` mapping |

Local deterministic functions are registered as callable tools
(`analyze_competitor_matrix`, `evaluate_market_segments`,
`plan_marketing_calendar`, `check_content_health`) and can be selected
as a step's executor, so a step runs locally instead of via an LLM.

**Trace**: record the real output of each step (run local tools inline,
or paste results manually) with status and notes. Export as Markdown —
this shows a workflow was actually executed, not just designed.


## 4.7 Agent workspace (chat + document)

8th tab. Two panes: conversation on the left, editable document on the right.

**Intent routing** - free text is matched to a tool and actually executed:

| You say | Routes to | Result |
|---|---|---|
| "competitor analysis" | `analyze_competitor_matrix` | real weighted ranking |
| "which market" / "STP" | `evaluate_market_segments` | real GE matrix |
| "how to schedule 618" | `plan_marketing_calendar` | real countdown |
| "score this copy" | `check_content_health` | real 6-dim score |
| "draw a SWOT" | chart engine | real SVG |
| "write xiaohongshu copy" | prompt generator | prompt to copy out |

Each reply is tagged: `executed local function` vs `prompt (needs an AI)`
vs `network`. No pretending.

If data is missing, it runs on **sample data** and marks the result
explicitly, so you see the output shape first, then swap in real numbers.

**Document blocks** (Feishu-style): every result lands as an editable
block — rename, edit inline, reorder, delete, export. Any block can be
referenced into the chat as context (the "quote into conversation" flow).
Export whole workspace as Markdown or JSON.

**Network is opt-in and off by default.** A `network settings` dialog
lets you paste your own API key (DeepSeek / Moonshot / GLM / custom).
Key stays in localStorage; requests go browser -> vendor directly, never
through this site. Browsers are subject to vendor CORS policy, so this
may fail — the UI says so instead of faking success.

## 5. Data

- Stored in browser localStorage, key `ym_studio_v1`
- **Clearing browser data wipes it** - use Export Config to back up
- Never uploaded. Not synced across browsers (import JSON manually)

## 6. TODO (by priority)

- [ ] **P0** Expand banned word lib to 2000+, split by platform (Xiaohongshu / Douyin / Ecom)
- [ ] **P0** Content pack payment and delivery (Aifadian / Gumroad)
- [ ] **P1** Knowledge base bulk import (CSV / JSON)
- [ ] **P1** Marketing calendar visualization
- [ ] **P2** Multi-brand profile switch
- [ ] **P2** Export workflow to Coze / Dify JSON

## 7. Dev notes

All state lives in the `state` object. All generators are at the bottom of `<script>`.

- Add preset role: edit `PRESETS`
- Add strategy framework: edit `STRATS` + `stratOutline()`
- Add workflow preset: edit `FLOW_PRESETS`
- Add banned words: edit `BAN_WORDS`
- Change colors: edit `--brand` / `--brand2` in `:root`

## 8. License

Copyright (c) Y.Mine. Engine is free to use. Content packs are copyrighted.
