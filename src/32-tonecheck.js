/* ==========================================================================
 * 品牌调性约束 Brand Tone Constraint
 *
 * 作用：把「品牌内核」算出来的调性、价值层级、品类禁忌，
 *       变成内容体检的评分基准。同一句文案，不同品牌给出不同结论。
 *
 * 三类检测（全部是确定性规则，不做语义理解）：
 *   ① 调性一致性：6 个表层语言信号 vs 品牌期望区间
 *   ② 价值覆盖  ：文案体现了功能/情感/自我表达哪几层
 *   ③ 品类禁忌  ：与自身定位冲突的硬命中词
 *
 * 设计原则：
 *  - 纯前端做不到"理解含义"，但表层语言特征完全可量化，
 *    而这恰恰是营销人真实会犯的错（写嗨了忘了调性）。
 *  - 期望区间由品牌内核的维度分推导，不是拍脑袋的常量。
 *  - 位置型维度（价格定位）要区分溢价端/性价比端——促销词对前者是灾难，对后者是日常。
 * ========================================================================== */

/* ---------- ① 调性信号：6 个可量化的表层特征 ----------
 * base: 默认期望区间 [lo, hi]
 * push: 品牌维度对该区间的平移权重。delta = (维度分 - 3.0) * weight
 * minMatters: 下限是否有意义。促销词、绝对化用词只约束上限。
 */
var TC_SIGS = [
  { k:'excl', n:'感叹号密度', unit:'/百字', base:[0.3, 2.2], minMatters:true,
    push:{ emotion:0.45, status:-0.45, values:-0.30, sensory:-0.18, service:0.10, speed:0.12 },
    adviceHigh:'感叹号过多，与克制/专业的调性冲突。改为陈述句，用事实与细节制造力量。',
    adviceLow :'语气偏冷，缺少情绪起伏。可适当加入一句带温度的表达。' },

  { k:'emoji', n:'表情符号', unit:'/百字', base:[0, 1.8], minMatters:true,
    push:{ belonging:0.50, emotion:0.35, status:-0.40, service:0.12, func:-0.10 },
    adviceHigh:'表情符号过密，削弱质感。高端/专业调性建议整篇控制在 2 个以内。',
    adviceLow :'亲和力不足，可适度加入 1-2 个表情拉近与读者的距离。' },

  { k:'abs', n:'绝对化用词', unit:'/百字', base:[0, 0.45], minMatters:false,
    push:{ price:-0.22, func:-0.18, values:-0.12, speed:0.15, emotion:0.20 },
    adviceHigh:'绝对化用词（最/第一/顶级/颠覆）过密。既是广告法风险，也与"专业、有据"的调性相悖——换成可验证的具体描述。',
    adviceLow :'' },

  { k:'promo', n:'促销词', unit:'/百字', base:[0, 1.0], minMatters:false,
    /* 位置型维度 price 权重最大：溢价端把容忍压到 0，性价比端大幅放开。
       促销文案里促销词天然密集（一句"限时秒杀"就有 2 个），
       基准给得太紧会把正常的大促文案全判成严重偏离。 */
    push:{ price:-0.90, status:-0.25, values:-0.15, speed:0.20, channel:0.15 },
    adviceHigh:'促销语言（秒杀/折扣/清仓）与你的定位直接冲突。溢价/稀缺型品牌应改用"限定 / 预约 / 专属"这类表达。',
    adviceLow :'' },

  { k:'you', n:'第二人称', unit:'/百字', base:[0.4, 3.0], minMatters:true,
    push:{ service:0.40, speed:0.25, emotion:0.20, status:-0.30, sensory:-0.10 },
    adviceHigh:'对话感过强，缺少距离感。高端定位需要"被仰望"，适当减少直呼"你"。',
    adviceLow :'缺少对话感，读起来像说明书。效率/温度型品牌应多用"你"建立一对一沟通。' },

  { k:'sentlen', n:'平均句长', unit:'字', base:[14, 30], minMatters:true,
    push:{ sensory:2.2, status:1.6, func:1.2, speed:-2.4, channel:-1.2, emotion:-0.8 },
    adviceHigh:'句子偏长，节奏拖沓。效率/便利型品牌应把平均句长压到 20 字以内。',
    adviceLow :'句子过短，显得零碎。体验/高端型品牌需要更完整的句式来承载质感。' }
];

/* 绝对化用词词表 */
var TC_ABS = ['最好','最佳','最强','第一','顶级','极致','完美','史上','绝无仅有','唯一',
              '颠覆','革命','国家级','世界级','首选','绝对','100%','全网最低','永久'];

/* 促销词表 */
var TC_PROMO = ['折扣','秒杀','限时','清仓','特价','白菜价','血亏','买一送一','全网最低',
                '骨折价','降价','抢购','手慢无','免费送','亏本','跳楼价','冲量'];

/* ---------- ③ 硬禁忌：与自身定位冲突的营销动作词 ----------
 * when(dims) 决定是否启用该条——禁忌必须和品牌实际定位挂钩，
 * 否则会误伤（瑞幸做促销没错，香奈儿做促销才是灾难）。 */
var TC_HARD = [
  { d:'折扣叫卖',
    kw:['秒杀','折扣','降价','清仓','特价','白菜价','血亏','买一送一','全网最低','骨折价','限时抢','冲鸭','赶紧冲','闭眼入','手慢无'],
    when:function(d){ return (d.status != null && d.status >= 4) || (d.price != null && d.price >= 3.8) || (d.values != null && d.values >= 4); },
    why:'与溢价 / 稀缺定位直接冲突——折扣语言会摧毁价格体系与专属感' },

  { d:'裂变拉新',
    kw:['裂变','拉新','砍一刀','邀请好友得','分享得','助力','组队'],
    when:function(d){ return (d.status != null && d.status >= 4) || (d.belonging != null && d.belonging >= 4); },
    why:'大众裂变会稀释专属感与小众圈层' },

  { d:'慢体验叙事',
    kw:['慢下来','沉浸','坐一下午','细细品味','放缓节奏','留白'],
    when:function(d){ return (d.speed != null && d.speed >= 4) || (d.channel != null && d.channel >= 4.2); },
    why:'与效率 / 便利 / 快取的主张互斥' },

  { d:'参数堆砌',
    kw:['参数','配置','跑分','规格表','毫安','纳米制程','频率'],
    when:function(d){ return (d.sensory != null && d.sensory >= 4) || (d.emotion != null && d.emotion >= 4); },
    why:'体验型 / 情感型品牌讲参数会丢失温度' },

  { d:'过度承诺',
    kw:['根治','永久','彻底解决','永不','100%有效','一次就好','包好'],
    when:function(){ return true; },
    why:'广告法风险，且过度承诺会反噬信任' }
];

/* ==========================================================================
 *  信号采集
 * ========================================================================== */
function tcSignals(txt){
  var L = txt || '';
  var len = L.replace(/\s/g, '').length || 1;
  var per = function(c){ return +(c / len * 100).toFixed(2); };
  var cnt = function(w){ return L.split(w).length - 1; };

  var excl  = (L.match(/[！!]/g) || []).length;
  var emoji = (L.match(/[\uD83C-\uDBFF][\uDC00-\uDFFF]|[\u2600-\u27BF]|[\u2B00-\u2BFF]|[\u2190-\u21FF]/g) || []).length;

  var abs = 0;   TC_ABS.forEach(function(w){ abs += cnt(w); });
  var promo = 0; TC_PROMO.forEach(function(w){ promo += cnt(w); });

  var you = cnt('你') + cnt('您');

  var sents = L.split(/[。！？!?\n；;]/).filter(function(s){ return s.trim().length; });
  var sentlen = sents.length ? +(L.replace(/\s/g, '').length / sents.length).toFixed(1) : 0;

  return {
    len: len,
    excl:{ v:per(excl),  raw:excl  },
    emoji:{ v:per(emoji), raw:emoji },
    abs:{ v:per(abs),    raw:abs,    hits:TC_ABS.filter(function(w){ return cnt(w) > 0; }) },
    promo:{ v:per(promo), raw:promo, hits:TC_PROMO.filter(function(w){ return cnt(w) > 0; }) },
    you:{ v:per(you),    raw:you   },
    sentlen:{ v:sentlen, raw:sentlen }
  };
}

/* 期望区间：由品牌维度分推导 */
function tcExpect(sig, dims){
  var lo = sig.base[0], hi = sig.base[1];
  Object.keys(sig.push || {}).forEach(function(k){
    var v = dims[k];
    if(v == null) return;
    var d = (v - 3.0) * sig.push[k];
    lo += d; hi += d;
  });
  if(lo < 0) lo = 0;
  if(hi < lo + 0.05) hi = lo + 0.05;
  return { lo:+lo.toFixed(2), hi:+hi.toFixed(2) };
}

/* 单信号判定 */
function tcJudge(sig, val, exp){
  if(val > exp.hi){
    var over = exp.hi > 0 ? (val - exp.hi) / exp.hi : 1;
    return { lv: over >= 0.5 ? 'bad' : 'warn', dir:'high' };
  }
  if(sig.minMatters && val < exp.lo && exp.lo > 0){
    var under = (exp.lo - val) / exp.lo;
    return { lv: under >= 0.5 ? 'warn' : 'ok', dir:'low' };
  }
  return { lv:'ok', dir:'' };
}

/* ==========================================================================
 *  ② 价值覆盖：文案体现了哪几层
 * ========================================================================== */
function tcValueCov(txt, o){
  var L = txt || '';
  if(!L) return null;
  var layers = [
    { k:'功能',     s:o && o.lvFunc },
    { k:'情感',     s:o && o.lvEmo  },
    { k:'自我表达', s:o && o.lvSelf }
  ];
  var out = [];
  layers.forEach(function(l){
    if(!l.s) return;
    var toks = bcTokens(l.s);
    if(!toks.length) return;
    var hit = 0;
    toks.forEach(function(t){ if(L.indexOf(t) > -1) hit++; });
    out.push({ k:l.k, txt:l.s, rate: hit / toks.length, hit:hit, total:toks.length });
  });
  if(!out.length) return null;

  var covered = out.filter(function(x){ return x.rate >= 0.3; });
  return {
    rows: out,
    covered: covered.map(function(x){ return x.k; }),
    miss: out.filter(function(x){ return x.rate < 0.3; }).map(function(x){ return x.k; })
  };
}

/* ==========================================================================
 *  ③ 硬禁忌命中
 * ========================================================================== */
function tcHard(txt, dims){
  var L = txt || '';
  var hits = [];
  TC_HARD.forEach(function(h){
    if(h.when && !h.when(dims || {})) return;
    var got = [];
    h.kw.forEach(function(w){ if(L.indexOf(w) > -1) got.push(w); });
    if(got.length){
      hits.push({ d:h.d, why:h.why, words: got.slice(0, 6) });
    }
  });
  return hits;
}

/* ==========================================================================
 *  主入口
 * ========================================================================== */

/** 取得当前评分别准：返回 {mode, o, cat, dims, srcName} */
function tcBase(){
  var sel = document.getElementById('c_tcbase');
  var mode = sel ? sel.value : 'auto';

  var o = null, srcName = '';
  if(mode === 'off') return { mode:'off', o:null, dims:{}, srcName:'已关闭' };

  if(mode === 'mem'){
    var b = (typeof readBrand === 'function') ? readBrand() : {};
    o = { brand:b.name || '', cat:'', dims:{}, lvFunc:b.usp || '', lvEmo:'', lvSelf:'' };
    srcName = '品牌记忆';
    return { mode:mode, o:o, dims:{}, srcName:srcName };
  }

  /* auto / bc：用品牌内核 */
  o = state.bc;
  if(!o){ return { mode:'none', o:null, dims:{}, srcName:'品牌内核未填写' }; }
  srcName = '品牌内核 · ' + (o.brand || '未命名');

  /* 品类覆盖：允许临时切换基准品类 */
  var catSel = document.getElementById('c_tccat');
  var catKey = (catSel && catSel.value && catSel.value !== '__follow__') ? catSel.value : o.cat;
  var cat = null;
  BC_CATS.forEach(function(c){ if(c.k === catKey) cat = c; });
  if(!cat){ BC_CATS.forEach(function(c){ if(c.k === o.cat) cat = c; }); }
  if(!cat) cat = BC_CATS[0];

  /* 维度分：用户填的优先，缺失的用品类基准补齐 */
  var dims = {};
  BC_DIMS.forEach(function(d){
    var v = (o.dims && o.dims[d.k] != null) ? o.dims[d.k] : (cat.base[d.k] != null ? cat.base[d.k] : 3.0);
    dims[d.k] = +v;
  });

  return { mode:mode, o:o, cat:cat, dims:dims, srcName:srcName };
}

/** 核心分析 */
function tcAnalyze(txt){
  var base = tcBase();
  if(base.mode === 'off' || !base.o) return null;

  var sg = tcSignals(txt);
  var sigRows = [];
  TC_SIGS.forEach(function(sig){
    var cell = sg[sig.k];
    var val = cell.v;
    var exp = tcExpect(sig, base.dims);
    var j = tcJudge(sig, val, exp);
    sigRows.push({
      k:sig.k, n:sig.n, unit:sig.unit, v:val, raw:cell.raw,
      lo:exp.lo, hi:exp.hi, lv:j.lv, dir:j.dir,
      advice: j.dir === 'high' ? sig.adviceHigh : sig.adviceLow,
      hits: cell.hits || []
    });
  });

  var cov  = tcValueCov(txt, base.o);
  var hard = tcHard(txt, base.dims);

  var bad  = sigRows.filter(function(r){ return r.lv === 'bad'; }).length
           + hard.length * 2;
  var warn = sigRows.filter(function(r){ return r.lv === 'warn'; }).length
           + (cov && cov.miss.length ? 1 : 0);

  /* 调性得分：25 分制（与体检六维并行，不占用原有 100 分） */
  var score = 25 - bad * 5 - warn * 2;
  if(score < 0) score = 0;

  return {
    base:base, sigRows:sigRows, cov:cov, hard:hard, sig:sg,
    score:score, bad:bad, warn:warn
  };
}

/* ==========================================================================
 *  报告（Markdown，追加在体检报告尾部）
 * ========================================================================== */
function tcReport(r){
  if(!r) return '';
  var L = { ok:'✅', warn:'⚠️', bad:'🛑' };
  var m = '\n---\n\n## 🎭 品牌调性约束\n\n';
  m += '**基准来源**：' + r.base.srcName;
  if(r.base.cat) m += '　**品类**：' + r.base.cat.n;
  m += '　**调性得分**：' + r.score + ' / 25\n\n';
  m += '> 同一句文案，不同品牌会得到不同结论。以下判定基于你在「品牌内核」中定义的调性与禁忌。\n\n';

  /* ① 调性一致性 */
  m += '### ① 调性一致性（6 项表层信号）\n\n';
  m += '| 信号 | 实测 | 期望区间 | 判定 |\n|---|---|---|---|\n';
  r.sigRows.forEach(function(x){
    var flag = x.lv === 'ok' ? '✅ 符合' : (L[x.lv] + ' ' + (x.dir === 'high' ? '偏高' : '偏少'));
    m += '| ' + x.n + ' | **' + x.v + '** ' + x.unit + ' | ' + x.lo + ' ~ ' + x.hi +
         ' | ' + flag + ' |\n';
  });
  m += '\n';

  var probs = r.sigRows.filter(function(x){ return x.lv !== 'ok'; });
  if(probs.length){
    m += '**需要调整**：\n\n';
    probs.forEach(function(x){
      m += '- ' + L[x.lv] + ' **' + x.n + '**：实测 ' + x.v + ' ' + x.unit +
           '（期望 ' + x.lo + ' ~ ' + x.hi + '）\n';
      if(x.advice) m += '  - ' + x.advice + '\n';
      if(x.hits && x.hits.length) m += '  - 命中词：' + x.hits.slice(0,5).join('、') + '\n';
    });
    m += '\n';
  } else {
    m += '✅ 六项信号全部落在品牌期望区间内。\n\n';
  }

  /* ② 价值覆盖 */
  if(r.cov){
    m += '### ② 价值覆盖\n\n';
    r.cov.rows.forEach(function(x){
      var pct = Math.round(x.rate * 100);
      var flag = x.rate >= 0.3 ? '✅' : '⚠️';
      m += '- ' + flag + ' **' + x.k + '层**（' + pct + '% 覆盖）：' + x.txt + '\n';
    });
    if(r.cov.miss.length){
      m += '\n⚠️ 文案未体现：' + r.cov.miss.join(' / ') +
           '。只停留在功能层，会丢掉品牌内核里定义的上层价值。\n';
    } else {
      m += '\n✅ 品牌内核定义的价值层级均有体现。\n';
    }
    m += '\n';
  }

  /* ③ 禁忌 */
  m += '### ③ 定位禁忌\n\n';
  if(r.hard.length){
    r.hard.forEach(function(h){
      m += '🛑 **' + h.d + '** —— 命中：' + h.words.join('、') + '\n';
      m += '  - ' + h.why + '\n';
    });
    m += '\n';
  } else {
    m += '✅ 未命中与当前定位冲突的禁忌表达。\n\n';
  }

  if(r.base.cat && r.base.cat.taboo && r.base.cat.taboo.length){
    m += '<details><summary>' + r.base.cat.em + ' ' + r.base.cat.n + ' 品类禁忌（自查清单）</summary>\n\n';
    r.base.cat.taboo.forEach(function(t){ m += '- ' + t + '\n'; });
    m += '\n</details>\n\n';
  }

  return m;
}

/* ==========================================================================
 *  侧边卡片渲染（体检面板内的实时基准提示）
 * ========================================================================== */
function tcRenderBase(){
  var host = document.getElementById('tcBaseInfo');
  if(!host) return;
  var base = tcBase();
  if(base.mode === 'off'){ host.innerHTML = '<span class="hint">调性约束已关闭</span>'; return; }
  if(base.mode === 'none'){
    host.innerHTML = '<span class="hint">尚未填写「🏛️ 品牌内核」，调性约束暂不可用。' +
                     '<a href="#" data-go="brandcore">前往填写 →</a></span>';
    return;
  }
  var h = '';
  h += '<b>' + base.srcName + '</b>';
  if(base.cat) h += ' · ' + base.cat.em + base.cat.n;
  if(base.mode === 'mem'){
    h += '<div class="hint" style="margin-top:4px">品牌记忆只提供卖点/人群匹配，' +
         '不做调性区间判定。要启用完整约束请在「品牌内核」填维度分。</div>';
  } else {
    var tops = [];
    BC_DIMS.forEach(function(d){
      if(base.dims[d.k] >= 4.0) tops.push(d.n);
    });
    if(tops.length) h += '<div class="hint" style="margin-top:4px">投入重心：' + tops.join(' / ') + '</div>';
  }
  host.innerHTML = h;
}

/* ==========================================================================
 *  下拉初始化
 * ========================================================================== */
function tcInitSelects(){
  var catSel = document.getElementById('c_tccat');
  if(catSel && catSel.options.length <= 1){
    BC_CATS.forEach(function(c){
      var op = document.createElement('option');
      op.value = c.k; op.textContent = c.em + ' ' + c.n;
      catSel.appendChild(op);
    });
  }
  tcRenderBase();
}

/* ==========================================================================
 *  Agent 可调用函数
 * ========================================================================== */
var TC_FN = {
  name:'check_brand_tone',
  description:'按品牌内核定义的调性、价值层级与定位禁忌，检查一段文案是否偏离。' +
              '同一句文案对不同品牌会给出不同结论。返回调性得分与具体偏离项。',
  parameters:{
    type:'object',
    properties:{
      text:{ type:'string', description:'待检查的文案正文' },
      category:{ type:'string', description:'可选，临时覆盖品类基准（如 luxury / cafe / fmcg）' }
    },
    required:['text']
  }
};

function tcFnCall(args){
  var txt = (args && args.text) || '';
  if(!txt) return { error:'缺少 text 参数' };
  var catSel = document.getElementById('c_tccat');
  if(args && args.category && catSel){ catSel.value = args.category; }

  var r = tcAnalyze(txt);
  if(!r) return { error:'品牌内核未填写，或调性约束已关闭' };

  return {
    source: r.base.srcName,
    category: r.base.cat ? r.base.cat.n : '',
    tone_score: r.score + '/25',
    signals: r.sigRows.map(function(x){
      return { name:x.n, value:x.v + x.unit, expect:x.lo + '~' + x.hi, level:x.lv };
    }),
    value_layers_covered: r.cov ? r.cov.covered : [],
    value_layers_missing: r.cov ? r.cov.miss : [],
    taboo_hits: r.hard.map(function(h){ return h.d + '：' + h.words.join('、'); }),
    report: tcReport(r)
  };
}

/* ==========================================================================
 *  注册为本地确定性函数（Agent 工作流可调用）
 * ========================================================================== */
if(typeof LOCAL_TOOLS !== 'undefined'){
  LOCAL_TOOLS[24] = { key:'tonecheck', name:'check_brand_tone', label:'品牌调性约束检查' };
  if(typeof TOOLS !== 'undefined' && TOOLS.indexOf('⚡ 品牌调性(本地函数)') < 0){
    TOOLS.push('⚡ 品牌调性(本地函数)');
  }
}
