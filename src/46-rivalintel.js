/* ============================================================
 * 竞品动态 · 情报信号识别
 *
 * 解决的问题：竞品动态时间线录了 8 类事件（新品/价格/促销/渠道/
 * 代言/融资/内容/其他）带日期，但这些数据只被用来「倒序显示」——
 * 一个电子表格，不是情报工具。全项目唯一的时序竞争数据被浪费了。
 *
 * 本模块只做一件事：从已有事件里识别 6 类模式信号。
 *   ① 价格战     连续降价/频繁促销
 *   ② 声量挤压   密集投放内容或代言
 *   ③ 产品加速   新品节奏加快
 *   ④ 渠道扩张   渠道动作密集
 *   ⑤ 资本注入   融资/并购（有钱了，可能打补贴战）
 *   ⑥ 沉默期     长期无动作
 *
 * 三条刻意的边界（不是妥协）：
 *   A. 不预测未来。只说「按已录数据，它呈现出 X 模式」，
 *      不说「它下一步会 Y」。
 *   B. 样本不足标注低置信，且不进「最紧迫」汇总。
 *      1 条事件推不出「节奏」，把噪声当洞察比没有洞察更危险。
 *   C. 每条信号必须给出触发依据（哪几条事件），
 *      让用户能自己推翻结论——不可反驳的结论没有价值。
 * ============================================================ */

var RI_NOW = null;   // 测试可注入固定时间

/* ---------- 信号定义 ---------- */
/* win: 观察窗口（天）；min: 触发条数；conf: 需要的最少事件总数（低于则低置信） */
var RI_SIGS = [
  {
    k:'price_war', n:'价格战', icon:'💰', level:'high',
    types:['price','promo'], win:90, min:2, minEv:2,
    why:'它在 90 天内反复动价或促销。价格战的特点是收益有上限、损伤无下限——跟进前先确认自己的成本结构是否真的更优。',
    act:'不要第一时间跟降。要么用价值锚定守住价格带，要么在它打不到的细分上做文章。正面拼价通常只有它赢。'
  },
  {
    k:'voice', n:'声量挤压', icon:'📣', level:'mid',
    types:['content','spoke'], win:30, min:3, minEv:3,
    why:'它在一个月内密集投放内容或签约代言，正在抢声量份额。你不出现的场合，会被默认成它主场。',
    act:'评估自己在同一渠道的声量占比。若已被压制，优先补「存在感」而非「转化率」——用户看不见你，转化无从谈起。'
  },
  {
    k:'accel', n:'产品加速', icon:'🆕', level:'high',
    types:['launch'], win:180, min:2, minEv:2, needAccel:true,
    why:'它的新品节奏在加快（最近一次间隔短于上一次）。这意味着你的差异化窗口正在关闭。',
    act:'要么加速自己的迭代跟上，要么转守一个它顾不上的细分。最糟的是按原节奏慢慢来。'
  },
  {
    k:'channel', n:'渠道扩张', icon:'🏬', level:'mid',
    types:['channel'], win:90, min:2, minEv:2,
    why:'它在密集铺渠道，通常意味着它认为现有渠道已见顶，正在向你的腹地下沉。',
    act:'核查你的优势渠道是否已被它进入。若已进入，考虑把资源转向它暂时铺不到的场景或区域。'
  },
  {
    k:'capital', n:'资本注入', icon:'💼', level:'high',
    types:['fund'], win:365, min:1, minEv:1,
    why:'它拿到了钱（或完成了并购）。资本到位后最常见的动作是补贴换份额，此时它的亏损承受力远高于你。',
    act:'避免在它有钱的窗口里打消耗战。把钱花在能沉淀成品牌资产的地方，而不是跟它对烧流量。'
  },
  {
    k:'silence', n:'沉默期', icon:'🌙', level:'low',
    types:[], win:0, min:0, minEv:2, silenceDays:90,
    why:'它已经超过 90 天没有新动作。这可能是两件完全相反的事：在憋一个大招，或者已经收缩放弃。',
    act:'不要猜。去查它最近的招聘、供应链、社媒活跃度——这些信号比「没发新品」更能说明它在干什么。'
  }
];

/* 颜色不内联：交给 CSS 的 .risig__lv--high/mid/low，深色档另有定义。
   内联写死色值在深色主题下对比度会不够。 */
var RI_LEVEL = {
  high:{k:'high', n:'高优先', icon:'🔴'},
  mid: {k:'mid',  n:'需关注', icon:'🟡'},
  low: {k:'low',  n:'观察',   icon:'🔵'}
};

/* ---------- 日期工具 ---------- */

/** 解析 'YYYY-MM-DD' → Date；非法返回 null */
function riDate(s){
  if(!s) return null;
  var m = String(s).match(/(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if(!m) return null;
  var d = new Date(+m[1], +m[2] - 1, +m[3]);
  return isNaN(d.getTime()) ? null : d;
}

/** 距今多少天；非法日期返回 null；未来日期归 0 */
function riAgo(s, now){
  var d = riDate(s);
  if(!d) return null;
  return Math.max(0, Math.floor((now.getTime() - d.getTime()) / 86400000));
}

/* ---------- 核心：扫描单个竞品 ---------- */

/**
 * @returns {{
 *   name, evTotal, evValid, badDate,
 *   n30, n90, n180, prev90, accelRatio, accelTag,
 *   sigs:[{key,name,icon,level,why,act,conf,evidence:[]}],
 *   sampleLow:boolean
 * }}
 */
function riScanRival(r, now){
  now = now || RI_NOW || new Date();
  var evs = (r && r.events) || [];

  var parsed = [], badDate = 0;
  evs.forEach(function(e){
    var ago = riAgo(e.date, now);
    if(ago === null){ badDate++; return; }
    parsed.push({date:e.date, type:e.type || 'other', text:e.text || '', ago:ago});
  });
  parsed.sort(function(a, b){ return a.ago - b.ago; });   // 近的在前

  var inWin = function(types, win){
    return parsed.filter(function(e){
      return e.ago <= win && (types.length === 0 || types.indexOf(e.type) > -1);
    });
  };

  var n30  = inWin([], 30).length;
  var n90  = inWin([], 90).length;
  var n180 = inWin([], 180).length;
  var prev90 = parsed.filter(function(e){ return e.ago > 90 && e.ago <= 180; }).length;

  /* 加速度：近 90 天 vs 前 90 天 */
  var accelRatio = null, accelTag = '';
  if(n90 > 0 && prev90 === 0){ accelRatio = Infinity; accelTag = '从无到有'; }
  else if(prev90 > 0){
    accelRatio = n90 / prev90;
    if(accelRatio > 1.5)      accelTag = '加速';
    else if(accelRatio < 0.5) accelTag = '减速';
    else                      accelTag = '平稳';
  } else { accelTag = '无动作'; }

  var sigs = [];
  RI_SIGS.forEach(function(S){
    var hit = null;
    var forceLow = false;   /* 触发了但证据不足以做强判断 */

    if(S.k === 'silence'){
      /* 沉默：需要有过记录，且最近一条超过阈值 */
      if(parsed.length > 0 && parsed[0].ago >= S.silenceDays){
        hit = {ev:[parsed[0]], note:'最近一条距今 ' + parsed[0].ago + ' 天'};
      }
    } else {
      var got = inWin(S.types, S.win);
      if(S.k === 'price_war'){
        /* 价格战要求至少 1 条真降价（price），否则两次促销活动也会被算成价格战——
           而促销是常态，不构成战争。 */
        var realPrice = got.filter(function(e){ return e.type === 'price'; });
        var isWar = realPrice.length >= 2 || got.length >= 3;
        if(isWar) hit = {ev:got.slice(0, 4), note:'窗口内 ' + got.length + ' 次（含真降价 ' + realPrice.length + ' 次）'};
      } else if(S.k === 'accel'){
        /* 产品加速：需要比较「最近间隔」与「更早间隔」，所以至少要 3 次新品。
           只有 2 次时能算出 1 个间隔，但没有比较基准——
           此时给出「有动作但节奏不明」的低置信信号，不谎称加速。 */
        if(got.length >= S.min){
          var gaps = [];
          for(var i = 0; i < got.length - 1; i++) gaps.push(got[i + 1].ago - got[i].ago);
          /* gaps[0] 是最近两次的间隔，末位是最早那段的间隔 */
          var speeding = gaps.length >= 2 && gaps[0] < gaps[gaps.length - 1];
          /* 明确减速（近段间隔显著长于早段）不该报成「加速」——
             对手慢下来对你有利，那是好消息不是警报。 */
          var slowing  = gaps.length >= 2 && gaps[0] > gaps[gaps.length - 1] * 1.5;
          if(speeding){
            hit = {ev:got.slice(0, 4),
                   note:'最近间隔 ' + gaps[0] + ' 天 < 更早 ' + gaps[gaps.length - 1] + ' 天'};
          } else if(slowing){
            hit = null;
          } else if(got.length >= 2){
            hit = {ev:got.slice(0, 4),
                   note:'共 ' + got.length + ' 次新品，仅 ' + gaps.length + ' 个间隔，不足以判断节奏'};
            forceLow = true;
          }
        }
      } else if(got.length >= S.min){
        hit = {ev:got.slice(0, 4), note:'窗口内 ' + got.length + ' 次'};
      }
    }

    if(!hit) return;

    /* 置信：事件总数低于阈值 → 低置信（样本不足，不进最紧迫汇总） */
    var conf = (forceLow || parsed.length < S.minEv) ? 'low' : 'high';
    if(S.k === 'silence' && parsed.length < 2) conf = 'low';

    sigs.push({
      key:S.k, name:S.n, icon:S.icon, level:S.level,
      why:S.why, act:S.act, conf:conf, note:hit.note,
      evidence:hit.ev.map(function(e){
        return {date:e.date, type:e.type, text:e.text, ago:e.ago};
      })
    });
  });

  /* 排序：高优先在前 */
  var order = {high:0, mid:1, low:2};
  sigs.sort(function(a, b){
    if(order[a.level] !== order[b.level]) return order[a.level] - order[b.level];
    return a.key < b.key ? -1 : 1;
  });

  return {
    name:(r && r.name) || '未命名',
    threat:(r && r.threat) || 'mid',
    evTotal:evs.length, evValid:parsed.length, badDate:badDate,
    n30:n30, n90:n90, n180:n180, prev90:prev90,
    accelRatio:accelRatio, accelTag:accelTag,
    sigs:sigs,
    sampleLow:parsed.length < 2
  };
}

/** 扫描全部竞品 */
function riScanAll(){
  var rs = state.rivals || [];
  return rs.map(function(r){ return riScanRival(r); });
}

/** 汇总：全市场最紧迫（只取高置信） */
function riTopSignals(scans, limit){
  limit = limit || 3;
  var out = [];
  scans.forEach(function(s){
    s.sigs.forEach(function(g){
      if(g.conf === 'low') return;          // 边界 B：低置信不进汇总
      out.push({rival:s.name, threat:s.threat, sig:g});
    });
  });
  var order = {high:0, mid:1, low:2};
  out.sort(function(a, b){
    var d = order[a.sig.level] - order[b.sig.level];
    if(d) return d;
    return a.rival < b.rival ? -1 : 1;
  });
  return out.slice(0, limit);
}

/* ---------- 类型名 ---------- */
function riTypeName(k){
  var t = RIVAL_TYPES.filter(function(x){ return x.k === k; })[0];
  return t ? (t.icon + ' ' + t.n) : '📌 其他';
}

/* ---------- SVG：竞争活跃度时间线 ---------- */

/**
 * 横轴 = 最近 180 天，每个竞品一行，事件点按类型着色。
 * 用途不是好看，是让「谁在什么时候密集动作」一眼可见——
 * 表格里看不出的节奏，在时间轴上是形状。
 */
var RI_TYPE_COLOR = {
  launch:'#047857', price:'#b91c1c', promo:'#b45309', channel:'#1d4ed8',
  spoke:'#7c3aed', fund:'#0f766e', content:'#c2410c', other:'#94a3b8'
};

function riSvgTimeline(scans, days){
  days = days || 180;
  var W = 880, padL = 118, padR = 74, rowH = 40, padT = 52, padB = 40;
  var rows = (scans || []).filter(function(s){ return s.evTotal > 0; });
  if(!rows.length) return '';

  var H = padT + rows.length * rowH + padB;
  var x0 = padL, x1 = W - padR;
  var xOf = function(ago){ return x1 - (Math.min(ago, days) / days) * (x1 - x0); };
  var T2 = C_TX2, T3 = C_TX3, LN = C_LINE;

  var p = [];

  /* 标题 */
  p.push(fTxt(14, 24, '竞品动态活跃度时间线', {fs:13, w:600, c:C_TX}));
  p.push(fTxt(14, 40, '最近 ' + days + ' 天　·　越靠右＝越近　·　' + todayStr(), {fs:10, c:T3}));

  /* 月份网格 */
  for(var g = 0; g <= days; g += 30){
    var gx = xOf(g);
    p.push(fLine(gx, padT - 14, gx, H - padB + 6, {c:LN, sw:1}));
    p.push(fTxt(gx, H - padB + 22, (g === 0 ? '今天' : '-' + g + '天'),
      {fs:10, c:T3, anchor:'middle'}));
  }

  /* 列名 */
  p.push(fTxt(padL - 10, H - padB + 22, '竞品', {fs:10, c:T3, anchor:'end'}));

  rows.forEach(function(s, i){
    var y = padT + i * rowH + rowH / 2;
    var nm = s.name.length > 8 ? s.name.slice(0, 8) + '\u2026' : s.name;
    p.push(fTxt(padL - 10, y + 4, nm, {fs:11.5, c:C_TX, anchor:'end'}));
    p.push(fLine(x0, y, x1, y, {c:LN, sw:1}));

    if(s.evValid === 0){
      p.push(fTxt((x0 + x1) / 2, y + 4,
        s.evTotal ? '日期格式无法解析（应为 YYYY-MM-DD）' : '暂无动态记录',
        {fs:10.5, c:T3, anchor:'middle'}));
      return;
    }

    /* 事件点：同一天多条时上下微移，避免完全重叠 */
    var rival = (state.rivals || []).filter(function(r){ return r.name === s.name; })[0];
    var used = {};
    (rival.events || []).forEach(function(e){
      var ago = riAgo(e.date, RI_NOW || new Date());
      if(ago === null) return;
      var cx = xOf(ago);
      var k = Math.round(cx);
      used[k] = (used[k] || 0) + 1;
      var dy = used[k] > 1 ? ((used[k] % 2) ? -7 : 7) : 0;
      p.push(fCirc(cx, y + dy, 4.2, {
        f:(RI_TYPE_COLOR[e.type] || RI_TYPE_COLOR.other), s:'none', sw:0, op:.9
      }));
    });

    /* 活跃度尾标 */
    p.push(fTxt(x1 + 8, y + 4, '90d ' + s.n90, {fs:9.5, c:T3}));
  });

  /* 图例 */
  var lx = padL, ly = H - 8;
  var legend = ['launch', 'price', 'promo', 'channel', 'content', 'fund'];
  var off = 0;
  legend.forEach(function(k){
    var t = RIVAL_TYPES.filter(function(x){ return x.k === k; })[0];
    var nm = t ? t.n : k;
    p.push(fCirc(lx + off + 4, ly - 4, 3.6, {f:RI_TYPE_COLOR[k], s:'none', sw:0}));
    p.push(fTxt(lx + off + 11, ly, nm, {fs:9.5, c:T3}));
    off += 11 + nm.length * 9.5 + 14;
  });

  return '<svg viewBox="0 0 ' + W + ' ' + H + '" xmlns="http://www.w3.org/2000/svg"' +
    ' style="width:100%;height:auto;display:block" role="img">' + p.join('') + '</svg>';
}

/* ---------- 渲染：信号面板 ---------- */

function riRender(){
  var host = $('#riSigs');
  var stat = $('#riStat');
  var chart = $('#riChart');
  var rs = state.rivals || [];

  if(!rs.length){
    if(host) host.innerHTML = '<span class="ph">还没有竞品档案。先点上方「➕ 新建档案」或「📋 填入示例」。</span>';
    if(stat) stat.textContent = '暂无';
    if(chart) chart.innerHTML = '<span class="ph">录入竞品动态后生成时间线</span>';
    return;
  }

  var scans = riScanAll();
  var totalSig = scans.reduce(function(a, s){ return a + s.sigs.length; }, 0);
  var hiSig = scans.reduce(function(a, s){
    return a + s.sigs.filter(function(g){ return g.level === 'high' && g.conf === 'high'; }).length;
  }, 0);
  var lowConf = scans.reduce(function(a, s){
    return a + s.sigs.filter(function(g){ return g.conf === 'low'; }).length;
  }, 0);
  var noEv = scans.filter(function(s){ return s.evValid === 0; }).length;

  if(stat){
    stat.textContent = totalSig ? (totalSig + ' 条信号' + (hiSig ? '　🔴 ' + hiSig + ' 高优先' : ''))
                                : '未识别到信号';
  }

  var html = [];

  /* ① 全市场最紧迫 */
  var tops = riTopSignals(scans, 3);
  if(tops.length){
    html.push('<div class="ritop">');
    html.push('<div class="ritop__hd">🎯 最紧迫（已排除低置信信号）</div>');
    tops.forEach(function(t){
      var L = RI_LEVEL[t.sig.level];
      html.push('<div class="ritop__row">' +
        '<span class="risig__lv risig__lv--' + L.k + '">' + L.icon + ' ' + L.n + '</span>' +
        '<b>' + esc(t.rival) + '</b>' +
        '<span class="ritop__s">' + t.sig.icon + ' ' + esc(t.sig.name) + '</span>' +
        '<span class="ritop__n">' + esc(t.sig.note || '') + '</span>' +
      '</div>');
    });
    html.push('</div>');
  }

  /* ② 逐竞品信号 */
  scans.forEach(function(s){
    html.push('<div class="riblk">');
    html.push('<div class="riblk__hd">' +
      '<span class="riblk__n">' + esc(s.name) + '</span>' +
      '<span class="riblk__m">' +
        '30天 ' + s.n30 + ' · 90天 ' + s.n90 + ' · 180天 ' + s.n180 +
        '　<span class="riblk__ac">节奏：' + esc(s.accelTag) + '</span>' +
      '</span>' +
    '</div>');

    if(s.badDate){
      html.push('<div class="riwarn">⚠️ ' + s.badDate + ' 条动态日期无法解析，未参与识别（应为 YYYY-MM-DD）</div>');
    }
    if(s.sampleLow && s.sigs.length){
      html.push('<div class="riwarn">⚠️ 仅 ' + s.evValid + ' 条有效动态，节奏类信号属低置信——样本不足时工具不做强判断</div>');
    }

    if(!s.sigs.length){
      html.push('<div class="riblk__none">' +
        (s.evValid === 0 ? '暂无动态记录，无法识别模式' : '已录 ' + s.evValid + ' 条动态，但未达到任何模式的触发阈值') +
      '</div>');
    } else {
      s.sigs.forEach(function(g){
        var L = RI_LEVEL[g.level];
        html.push('<div class="risig' + (g.conf === 'low' ? ' risig--low' : '') + '">');
        html.push('<div class="risig__hd">' +
          '<span class="risig__i">' + g.icon + '</span>' +
          '<span class="risig__n">' + esc(g.name) + '</span>' +
          '<span class="risig__lv risig__lv--' + L.k + '">' + L.icon + ' ' + L.n + '</span>' +
          (g.conf === 'low' ? '<span class="risig__cf">低置信</span>' : '') +
          '<span class="risig__note">' + esc(g.note || '') + '</span>' +
        '</div>');
        if(g.evidence.length){
          html.push('<div class="risig__ev">');
          g.evidence.forEach(function(e){
            html.push('<div class="risig__evrow">' +
              '<span class="risig__d">' + esc(e.date) + '</span>' +
              '<span class="risig__t">' + esc(riTypeName(e.type)) + '</span>' +
              '<span class="risig__x">' + (e.text ? esc(e.text) : '<i>（无描述）</i>') + '</span>' +
            '</div>');
          });
          html.push('</div>');
        }
        html.push('<div class="risig__why"><b>说明</b>：' + esc(g.why) + '</div>');
        html.push('<div class="risig__act"><b>建议</b>：' + esc(g.act) + '</div>');
        html.push('</div>');
      });
    }
    html.push('</div>');
  });

  /* ③ 全局提示 */
  if(noEv){
    html.push('<p class="hint">💡 ' + noEv + ' 个竞品还没有动态记录。这个模块<b>只分析你录入的数据</b>，不抓取、不预测——没录就没有信号，这是边界不是缺陷。</p>');
  }
  if(lowConf){
    html.push('<p class="hint">💡 有 ' + lowConf + ' 条信号标为<b>低置信</b>（触发但样本不足），已排除在「最紧迫」之外。样本少时把噪声当洞察，比没有洞察更危险。</p>');
  }

  if(host) host.innerHTML = html.join('');

  var svg = riSvgTimeline(scans, 180);
  if(chart) chart.innerHTML = svg || '<span class="ph">暂无可绘制的动态数据</span>';
}

/* ---------- 导出：写入竞品情报台账 ---------- */

/** 单个竞品的信号段（供 20-market.js 的 exportRivals 调用） */
function riExportBlock(r){
  if(typeof riScanRival !== 'function') return [];
  var s = riScanRival(r);
  var o = [];
  o.push('**活跃度**：30 天 ' + s.n30 + ' 次 · 90 天 ' + s.n90 + ' 次 · 180 天 ' + s.n180 +
         ' 次　**节奏**：' + s.accelTag);
  if(!s.sigs.length){
    o.push('');
    o.push('_未识别到模式信号' + (s.evValid ? '（已录 ' + s.evValid + ' 条，未达触发阈值）' : '（无动态记录）') + '_');
    return o;
  }
  o.push('');
  o.push('| 信号 | 级别 | 置信 | 依据 |');
  o.push('|---|---|---|---|');
  s.sigs.forEach(function(g){
    o.push('| ' + g.icon + ' ' + g.name + ' | ' + RI_LEVEL[g.level].n + ' | ' +
           (g.conf === 'low' ? '低' : '高') + ' | ' + (g.note || '') + ' |');
  });
  o.push('');
  s.sigs.forEach(function(g){
    o.push('- **' + g.icon + ' ' + g.name + '**：' + g.why);
    o.push('  - 建议：' + g.act);
  });
  return o;
}

function riExportMd(){
  var rs = state.rivals || [];
  if(!rs.length){ toast('暂无竞品档案'); return; }
  var scans = riScanAll();
  var tops = riTopSignals(scans, 5);
  var o = [];
  o.push('# 📡 竞品动态情报信号');
  o.push('');
  o.push('> 生成于 ' + new Date().toLocaleString('zh-CN') + '　·　共 ' + scans.length + ' 个竞品');
  o.push('>');
  o.push('> 本分析<b>只基于人工录入的动态记录</b>，不抓取、不预测。它回答「已录数据呈现出什么模式」，不回答「对手下一步会做什么」。');
  o.push('');
  if(tops.length){
    o.push('## 🎯 最紧迫');
    o.push('');
    tops.forEach(function(t, i){
      o.push((i + 1) + '. **' + t.rival + '**　' + t.sig.icon + ' ' + t.sig.name +
             '（' + RI_LEVEL[t.sig.level].n + '）　_' + (t.sig.note || '') + '_');
    });
    o.push('');
  } else {
    o.push('## 🎯 最紧迫');
    o.push('');
    o.push('_暂无高置信信号。_');
    o.push('');
  }
  scans.forEach(function(s){
    o.push('## ' + s.name);
    o.push('');
    riExportBlock((state.rivals || []).filter(function(r){ return r.name === s.name; })[0] || {name:s.name})
      .forEach(function(x){ o.push(x); });
    o.push('');
  });
  o.push('---');
  o.push('');
  o.push('> 边界说明：信号是<b>模式提示</b>，不是预测。低置信信号（样本不足）不进「最紧迫」。');
  downloadFile('竞品动态情报信号_' + ymd(new Date()) + '.md', o.join('\n'), 'text/markdown');
}
