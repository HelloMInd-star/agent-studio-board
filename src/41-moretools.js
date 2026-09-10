/* ============================================================
 * 41-moretools.js —— 扩充可编排工具集（14 → 17）
 *
 * 为什么补这三项（roadmap 上原本标着「规划中」）：
 *   可编排工具越多，工作流越能少依赖人工粘贴。但每加一个都必须是
 *   「能算的」而不是「让 AI 自由发挥的」，否则违背整个产品的原则。
 *
 * 本次新增：
 *   25  A/B 标题评分      score_title_variants
 *   26  品牌资产台账审计   audit_brand_assets
 *   27  品牌轨迹洞察      analyze_brand_timeline
 *
 * 注册方式：写 LOCAL_TOOLS[索引] + TOOLS.push + LOCAL_STEP_RUNNERS[key]。
 * 索引必须与 TOOLS 数组下标一一对应，否则会出现
 * 「选 A 却执行 B」的静默错误（历史上踩过，见 10-workspace.js 注释）。
 *
 * 依赖：13-scan（scoreContent 可选）、32-tonecheck（tcAnalyze 可选）
 *       33-timeline（tlCollect）、35-insight（ins*）、36-assets（asState 等）
 * ============================================================ */

/* ============================================================
 * ① A/B 标题评分
 * ------------------------------------------------------------
 * 输入：当前预览区（#preview）里的多行文本，每行一个候选标题。
 *      与 scan / tonecheck 保持同一取数口径——不新增输入框。
 *
 * 评分信号（全部可量化，不含语义理解）：
 *   长度   理想 12–22 字；过短信息不足，过长被平台折叠
 *   数字   含阿拉伯数字，具体感更强
 *   悬念   疑问/反转词，制造信息缺口
 *   强调   1 个感叹号加分，3 个以上转为叫卖感
 *   绝对化 最/第一/顶级… —— 既不可信，又是违禁词高危区
 *   促销词 秒杀/免费/限时… —— 与溢价定位天然冲突
 *   调性   若已填品牌内核，用 tcAnalyze 复核是否跑偏
 *
 * 边界：这是「表层特征打分」，不是「哪个标题会火」。
 *      真实点击率只有投放后才知道，工具只负责把明显的坑挑出来。
 * ============================================================ */
var TITLE_ABS_WORDS = ['最好','最佳','最强','第一','顶级','绝对','唯一','100%','全网','史上','万能','永久'];
var TITLE_HYPE_WORDS = ['秒杀','清仓','亏本','免费送','仅限今天','最后一天','不买后悔','抓紧'];
var TITLE_HOOK_WORDS = ['为什么','居然','竟然','原来','没想到','才发现','秘密','真相','竟然','凭什么','到底','如何'];

function titleSignals(t){
  var s = String(t || '').trim();
  var n = s.replace(/\s/g, '').length;
  var r = {len:n, num:0, hook:0, emph:0, abs:[], hype:[], emoji:0, score:0, tips:[]};

  /* 基准分 30：标题本身存在即可得，其余信号在此基础上加减，
     这样「没有明显优点也没有硬伤」的标题落在 50 上下，符合直觉。 */
  r.score = 30;

  /* 长度 */
  if(n >= 12 && n <= 22){ r.score += 20; }
  else if((n >= 8 && n < 12) || (n > 22 && n <= 28)){ r.score += 10; r.tips.push(n < 12 ? '偏短，信息量可能不足' : '偏长，部分平台会折叠'); }
  else if(n < 8){ r.score -= 15; r.tips.push('太短，读者看不出讲什么'); }
  else { r.score -= 5; r.tips.push('过长，建议压到 22 字以内'); }

  /* 数字 */
  var nums = s.match(/[0-9]+/g);
  if(nums){ r.num = nums.length; r.score += 12; }
  else r.tips.push('没有数字，具体感偏弱（如「5 个方法」）');

  /* 悬念 */
  var hooks = TITLE_HOOK_WORDS.filter(function(w){ return s.indexOf(w) > -1; });
  var hasQ = /[？?]/.test(s);
  if(hooks.length || hasQ){
    r.hook = hooks.length + (hasQ ? 1 : 0);
    r.score += 15;
  }

  /* 强调（感叹号） */
  var bangs = (s.match(/[!！]/g) || []).length;
  r.emph = bangs;
  if(bangs === 1) r.score += 6;
  else if(bangs === 2) r.score += 3;
  else if(bangs >= 3){ r.score -= 12; r.tips.push('感叹号过多（' + bangs + ' 个），有叫卖感'); }

  /* emoji */
  var emo = s.match(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu);
  r.emoji = emo ? emo.length : 0;
  if(r.emoji >= 1 && r.emoji <= 2) r.score += 5;
  else if(r.emoji > 3) { r.score -= 5; r.tips.push('emoji 过多（' + r.emoji + ' 个），显得杂乱'); }

  /* 绝对化词 */
  r.abs = TITLE_ABS_WORDS.filter(function(w){ return s.indexOf(w) > -1; });
  if(r.abs.length){
    r.score -= 12;
    r.tips.push('绝对化用词「' + r.abs.join('、') + '」：既不可信，也容易命中广告法违禁词');
  }

  /* 促销硬词 */
  r.hype = TITLE_HYPE_WORDS.filter(function(w){ return s.indexOf(w) > -1; });
  if(r.hype.length){
    r.score -= 15;
    r.tips.push('促销硬词「' + r.hype.join('、') + '」：与溢价定位冲突，且降低质感');
  }

  return r;
}

/* 取候选标题：预览区按行拆分，去空行、去 markdown 标记行 */
function titleCandidates(){
  var pv = $('#preview');
  var txt = pv ? (pv.textContent || '') : '';
  if(!txt || txt.indexOf('请填写字段') > -1) return [];
  /* 只剥离真正的列表标记（- / * / • / 1. / 1、 / 1)）与 Markdown 标题号。
     注意：不能把行首的裸数字一起吃掉——「5 个技巧」里的 5 是标题的一部分，
     也是后面「含数字」信号的依据，吃掉会导致评分失真。 */
  return txt.split('\n').map(function(x){
    return x.replace(/^\s*-+\s*/, '')
            .replace(/^\s*[*•]\s*/, '')
            .replace(/^\s*\d+[.、)]\s+/, '')
            .replace(/^\s*#{1,6}\s*/, '')
            .trim();
  }).filter(function(x){ return x && x.length >= 2; }).slice(0, 20);
}

function scoreTitles(){
  var list = titleCandidates();
  if(!list.length) return null;
  /* 品牌基准（可缺省） */
  var base = null;
  try{
    if(typeof tcAnalyze === 'function'){
      var probe = tcAnalyze(list[0]);
      if(probe && probe.base) base = probe.base;
    }
  }catch(e){ base = null; }

  var rows = list.map(function(t){
    var r = titleSignals(t);
    r.t = t;
    r.tone = null;
    if(base && typeof tcAnalyze === 'function'){
      try{
        var tc = tcAnalyze(t);
        if(tc){
          r.tone = tc.score;
          if(tc.score >= 20) r.score += 10;
          else if(tc.score >= 15) r.score += 5;
          else if(tc.score < 10){ r.score -= 10; r.tips.push('与品牌调性不符（调性 ' + tc.score + '/25）'); }
          if(tc.hard && tc.hard.length){
            r.score -= 10;
            r.tips.push('命中品类禁忌：' + tc.hard.map(function(h){ return h.d; }).join('；'));
          }
        }
      }catch(e){ /* 调性检查失败不影响基础评分 */ }
    }
    r.score = Math.max(0, Math.min(100, r.score));
    return r;
  });
  rows.sort(function(a, b){ return b.score - a.score; });
  return {rows: rows, base: base};
}

function titleReport(){
  var R = scoreTitles();
  if(!R) return '（请先在内容工厂生成或粘贴候选标题，每行一个，最多 20 条）';
  var out = '# 🅰️ A/B 标题评分（' + R.rows.length + ' 条候选）\n\n';
  if(R.base) out += '**调性基准**：' + R.base.srcName + '（已计入评分）\n\n';
  else out += '**调性基准**：未启用（在「🏛️ 品牌内核」填好后自动计入）\n\n';

  out += '| 排名 | 标题 | 得分 | 主要问题 |\n|---|---|---|---|\n';
  R.rows.forEach(function(r, i){
    out += '| ' + (i + 1) + ' | ' + r.t.slice(0, 40) + ' | **' + r.score + '** | ' +
           (r.tips.length ? r.tips.slice(0, 2).join('；') : '无明显问题') + ' |\n';
  });

  var top = R.rows.slice(0, 3);
  out += '\n### 建议优先测试\n\n';
  top.forEach(function(r, i){
    out += (i + 1) + '. **' + r.t + '**（' + r.score + ' 分）\n';
  });

  var bad = R.rows.filter(function(r){ return r.score < 50; });
  if(bad.length){
    out += '\n### 建议修改或直接淘汰（<50 分，共 ' + bad.length + ' 条）\n\n';
    bad.slice(0, 3).forEach(function(r){
      out += '- ' + r.t + ' —— ' + (r.tips[0] || '综合评分偏低') + '\n';
    });
  }
  out += '\n*表层特征打分，用于淘汰明显有坑的标题；真实点击率需投放验证。*';
  return out;
}

/* ============================================================
 * ② 品牌资产台账审计
 * ============================================================ */
function auditAssetsCalc(){
  var a = (typeof asState === 'function') ? asState() : (state.assets || {});
  var logos = a.logos || [], mats = a.materials || [], colors = a.colors || {};
  var todayS = ymd(today0());

  var logoCur = logos.filter(function(x){ return x.st === 'cur'; });
  var matBy = {design:0, review:0, done:0, archived:0};
  mats.forEach(function(m){ var s = m.st || 'design'; if(matBy[s] != null) matBy[s]++; });
  var overdue = mats.filter(function(m){
    return m.due && m.due < todayS && m.st !== 'done' && m.st !== 'archived';
  });

  /* 完备度：五要素加权 */
  var parts = [
    {k:'Logo 在用版本', ok: logoCur.length > 0, w:30},
    {k:'物料已定稿',   ok: matBy.done > 0,       w:25},
    {k:'主色已定义',   ok: !!colors.main,        w:20},
    {k:'字体已定义',   ok: !!a.fonts,            w:10},
    {k:'使用规范',     ok: !!a.norm,             w:15}
  ];
  var got = 0;
  parts.forEach(function(p){ if(p.ok) got += p.w; });

  /* 色值与调性 */
  var hsl = colors.main ? hexToHsl(colors.main) : null;
  var hint = (hsl && typeof colorToneHint === 'function') ? colorToneHint(hsl) : null;

  return {
    logoTotal: logos.length, logoCur: logoCur.length,
    matTotal: mats.length, matBy: matBy, overdue: overdue,
    colors: colors, fonts: a.fonts || '', norm: a.norm || '',
    parts: parts, ready: got, hsl: hsl, hint: hint
  };
}

function auditAssetsReport(){
  var A = auditAssetsCalc();
  var out = '# 🎨 品牌资产台账审计\n\n';
  out += '**完备度** ' + A.ready + '/100\n\n';
  A.parts.forEach(function(p){
    out += '- ' + (p.ok ? '✅' : '⬜') + ' ' + p.k + '（' + p.w + ' 分）\n';
  });

  out += '\n### Logo\n\n';
  out += '共 ' + A.logoTotal + ' 个版本，其中在用 ' + A.logoCur + ' 个。\n';
  if(A.logoCur === 0 && A.logoTotal > 0) out += '\n⚠️ 没有标记「在用」版本，团队容易拿错图。\n';
  if(A.logoCur > 1) out += '\n⚠️ 有 ' + A.logoCur + ' 个版本同时标记为「在用」，建议只保留一个，其余标为历史版本。\n';

  out += '\n### 物料\n\n';
  out += '共 ' + A.matTotal + ' 项：设计中 ' + A.matBy.design + ' · 待审核 ' + A.matBy.review +
         ' · 已定稿 ' + A.matBy.done + ' · 已归档 ' + A.matBy.archived + '\n';
  if(A.overdue.length){
    out += '\n🔴 **已逾期未定稿 ' + A.overdue.length + ' 项**：\n';
    A.overdue.slice(0, 5).forEach(function(m){
      out += '- ' + m.name + '（' + m.type + '，应完成 ' + m.due + '）\n';
    });
  }

  out += '\n### 色值\n\n';
  if(A.hsl){
    out += '主色 ' + A.colors.main + ' → H ' + Math.round(A.hsl.h) + '° / S ' +
           Math.round(A.hsl.s) + '% / L ' + Math.round(A.hsl.l) + '%\n';
    if(A.hint && A.hint.txt){
      out += '\n' + (A.hint.ok ? '✅ ' : '⚠️ ') + A.hint.txt + '\n';
      out += '*色彩与定位的关联为经验共识，非精确科学，仅供参考。*\n';
    }
  } else {
    out += '未设置主色。填一个 HEX（如 #4f46e5）后可自动换算 HSL 并检查与定位的匹配度。\n';
  }
  return out;
}

/* ============================================================
 * ③ 品牌轨迹洞察
 * ============================================================ */
function analyzeTimelineCalc(){
  var all = (typeof tlCollect === 'function') ? tlCollect() : [];
  return {
    all: all,
    act: (typeof insActivity === 'function') ? insActivity(all) : null,
    sc:  (typeof insScoreTrend === 'function') ? insScoreTrend() : null,
    cs:  (typeof insCalStat === 'function') ? insCalStat() : null,
    gaps:(typeof insGaps === 'function') ? insGaps(all) : null,
    sp:  (typeof insSpread === 'function') ? insSpread(all) : null
  };
}

function analyzeTimelineReport(){
  var R = analyzeTimelineCalc();
  var out = '# 🕐 品牌轨迹洞察\n\n';
  var sp = R.sp || {total:0};
  if(!sp.total){
    return out + '暂无记录。用一段时间（生成内容、排期、记竞品动态）后，这里会给出节奏与趋势。';
  }
  out += '**记录总数** ' + sp.total + ' 条\n\n';

  if(R.act){
    out += '### 最近 30 天活跃度\n\n';
    out += '新增 ' + R.act.total + ' 条，分布在 ' + R.act.active + ' 天（30 天中）。\n';
    if(sp.top) out += '最多的一类：' + sp.top.em + ' ' + sp.top.n + ' ' + sp.top.c + ' 条。\n';
    out += '\n';
  }

  if(R.sc && R.sc.n){
    out += '### 内容质量趋势\n\n';
    out += '样本 ' + R.sc.n + ' 条　均值 ' + R.sc.avg + '　最新 ' + R.sc.last + '\n';
    out += '趋势：**' + R.sc.dirTxt + '**（斜率 ' + R.sc.slope.toFixed(2) + '）\n';
    if(!R.sc.halfOk) out += '\n*样本不足 10 条，暂不做前后半段对比，避免得出假结论。*\n';
    else out += '\n前段均值 ' + R.sc.earlyAvg + ' → 后段均值 ' + R.sc.recentAvg + '\n';
    out += '\n';
  }

  if(R.cs && R.cs.total){
    out += '### 执行完成率\n\n';
    out += '共 ' + R.cs.total + ' 个动作，已完成 ' + R.cs.by.done + '（**' + R.cs.rate + '%**）' +
           '　进行中 ' + R.cs.by.doing + '　待开始 ' + R.cs.by.todo + '　已延期 ' + R.cs.by.delayed + '\n';
    if(R.cs.overdue.length){
      out += '\n🔴 逾期未完成 ' + R.cs.overdue.length + ' 项：' +
             R.cs.overdue.slice(0, 3).map(function(e){ return e.title; }).join('、') + '\n';
    }
    out += '\n';
  }

  if(R.gaps && R.gaps.length){
    out += '### 该补记录了\n\n';
    R.gaps.slice(0, 4).forEach(function(g){
      out += '- ' + g.em + ' ' + g.n + '：距上次 ' + g.days + ' 天\n';
    });
  }
  return out;
}

/* ============================================================
 * 注册：索引必须落在 TOOLS 数组末尾，与 LOCAL_TOOLS 一一对应
 * ============================================================ */
(function(){
  if(typeof LOCAL_TOOLS === 'undefined' || typeof TOOLS === 'undefined') return;

  var idx = TOOLS.length;   // 25
  LOCAL_TOOLS[idx]     = {key:'titles',   name:'score_title_variants',   label:'A/B 标题评分'};
  TOOLS.push('⚡ A/B标题评分(本地函数)');

  idx = TOOLS.length;       // 26
  LOCAL_TOOLS[idx]     = {key:'assets',   name:'audit_brand_assets',     label:'品牌资产台账审计'};
  TOOLS.push('⚡ 资产台账审计(本地函数)');

  idx = TOOLS.length;       // 27
  LOCAL_TOOLS[idx]     = {key:'insight',  name:'analyze_brand_timeline', label:'品牌轨迹洞察'};
  TOOLS.push('⚡ 轨迹洞察(本地函数)');

  if(typeof LOCAL_STEP_RUNNERS !== 'undefined'){
    LOCAL_STEP_RUNNERS['titles']  = titleReport;
    LOCAL_STEP_RUNNERS['assets']  = auditAssetsReport;
    LOCAL_STEP_RUNNERS['insight'] = analyzeTimelineReport;
  }
})();
