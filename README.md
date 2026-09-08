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
