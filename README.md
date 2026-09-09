# Y.Mine · Marketing AI Workspace

A local-first marketing AI workspace: chat, deterministic analysis tools,
strategy charts, workflow orchestration, and agent export — all in one
static page. No backend, no tracking, no login.

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
- `generate_mind_map`
- `synthesize_marketing_plan`
- `calculate_pricing_strategy`
- `evaluate_regional_markets`

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
