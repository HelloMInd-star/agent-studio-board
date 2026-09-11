/* ============================================================
 * 战略矩阵 · 矢量分析层
 *
 * 解决的问题：战略矩阵原本 26KB 里只有 1 张真图（BCG），
 * SWOT 只是四个输入框，TOWS 只是表格。而 SWOT 条目里早就存了
 * 数值(v)、变化(d)、来源(src) 三个字段，却从未被任何可视化使用。
 *
 * 本模块补四件矢量件：
 *   ① 加权 SWOT（A'WOT 简化版）→ 战略态势图 + 权重条
 *   ② TOWS 交叉矩阵（内部×外部，暴露空缺象限）
 *   ③ 快照迁移图（BCG 象限间的箭头）
 *   ④ 态势轨迹（多次快照的战略姿态迁移）
 *
 * 加权口径的重要边界（刻意的设计，不是妥协）：
 *   「权重」是唯一的量化输入。数值字段 v 只用于判断
 *   「这条有没有数据支撑」，不参与求和——因为 87% 和 120万
 *   无法相加，硬加起来只会制造虚假精确感。
 * ============================================================ */

var SV_WEIGHT_DEF = 3;
var SV_WEIGHT_MAX = 5;

var SV_QUAD = {
  SO:{n:'进攻型', icon:'🟢', color:'#047857', tint:'#047857', desc:'内部强 + 外部好'},
  ST:{n:'防御型', icon:'🟡', color:'#b45309', tint:'#b45309', desc:'内部强 + 外部差'},
  WO:{n:'补强型', icon:'🔵', color:'#1d4ed8', tint:'#1d4ed8', desc:'内部弱 + 外部好'},
  WT:{n:'转型型', icon:'🔴', color:'#b91c1c', tint:'#b91c1c', desc:'内部弱 + 外部差'}
};

var SV_KEYS = [
  {k:'s', n:'优势', icon:'💪', color:'#047857'},
  {k:'w', n:'劣势', icon:'🚨', color:'#b45309'},
  {k:'o', n:'机会', icon:'🌟', color:'#1d4ed8'},
  {k:'t', n:'威胁', icon:'⚡', color:'#b91c1c'}
];

/* ---------- 基础计算 ---------- */

/** 读取条目权重，缺省或非法值回落到 3 */
function svW(it){
  var w = parseInt(it && it.w, 10);
  return (w >= 1 && w <= SV_WEIGHT_MAX) ? w : SV_WEIGHT_DEF;
}

/** 取某象限中「有文字」的条目 */
function svItems(swot, k){
  return ((swot && swot[k]) || []).filter(function(x){
    return x && x.t && String(x.t).trim();
  });
}

/** 某象限的加权总分 */
function svSum(swot, k){
  return svItems(swot, k).reduce(function(a, x){ return a + svW(x); }, 0);
}

/**
 * 解析变化方向：+5% → 1；-3% → -1；无法判断 → 0
 *
 * 关键边界：不臆测方向。只取数字的正则会把「下降 12 个点」误读成 +12（上升），
 * 这是语义错误而非格式问题。所以判定优先级：
 *   ① 显式正负号（+5 / -3）——最可信
 *   ② 中文方向词（下降/下滑/跌 → 负；上升/增长/涨 → 正）
 *   ③ 两者都没有 → 0（不知道就是不知道，不猜）
 */
function svTrend(x){
  var d = (x && x.d) ? String(x.d) : '';
  if(!d.trim()) return 0;
  var negWord = /下降|下滑|减少|降低|跌|走低|变差|减弱/.test(d);
  var posWord = /上升|增长|增加|提升|上涨|走高|变好|走强/.test(d);
  var m = d.match(/([+-]?\d+(?:\.\d+)?)/);
  var v = m ? parseFloat(m[1]) : NaN;
  if(isFinite(v) && v !== 0){
    if(/^[+-]/.test(m[1])) return v > 0 ? 1 : -1;   // ① 显式符号
    if(negWord) return -1;                          // ② 中文方向词
    if(posWord) return 1;
    return 0;                                       // ③ 不臆测
  }
  // 没有有效数字：只看方向词
  if(negWord) return -1;
  if(posWord) return 1;
  return 0;
}

/** 象限趋势汇总：{up, down} */
function svTrendOf(swot, k){
  var r = {up:0, down:0};
  svItems(swot, k).forEach(function(x){
    var t = svTrend(x);
    if(t > 0) r.up++;
    else if(t < 0) r.down++;
  });
  return r;
}

/**
 * 加权 SWOT 核心计算
 * inner = (S−W)/(S+W)×100   → 内部态势，−100(全是劣势) ~ +100(全是优势)
 * outer = (O−T)/(O+T)×100   → 外部态势，−100(全是威胁) ~ +100(全是机会)
 * 两者构成战略姿态象限，直接映射回 TOWS 的四种主策略。
 */
function calcSwotPosture(swot){
  swot = swot || {s:[], w:[], o:[], t:[]};
  var S = svSum(swot, 's'), W = svSum(swot, 'w'),
      O = svSum(swot, 'o'), T = svSum(swot, 't');
  var inner = (S + W) ? (S - W) / (S + W) * 100 : 0;
  var outer = (O + T) ? (O - T) / (O + T) * 100 : 0;
  var quad = inner >= 0 ? (outer >= 0 ? 'SO' : 'ST') : (outer >= 0 ? 'WO' : 'WT');

  // 信念度：离原点越远，判断越明确（最大 √(100²+100²)≈141.4）
  var conv = Math.sqrt(inner * inner + outer * outer) / 141.42;

  // 数据支撑度：有多少条填了数值
  var total = 0, noData = 0, defaultW = 0;
  SV_KEYS.forEach(function(K){
    svItems(swot, K.k).forEach(function(x){
      total++;
      if(!x.v || !String(x.v).trim()) noData++;
      if(!x.w) defaultW++;
    });
  });

  var trend = {};
  SV_KEYS.forEach(function(K){ trend[K.k] = svTrendOf(swot, K.k); });

  return {
    s:S, w:W, o:O, t:T,
    inner:inner, outer:outer,
    quad:quad, conv:conv,
    total:total, noData:noData, defaultW:defaultW,
    trend:trend,
    nS:svItems(swot,'s').length, nW:svItems(swot,'w').length,
    nO:svItems(swot,'o').length, nT:svItems(swot,'t').length
  };
}

/* ---------- TOWS 交叉矩阵 ---------- */

/**
 * 交叉强度用几何平均 √(A×B)：
 * 任一侧为 0 则策略无法成立；且避免「一侧极强、另一侧极弱」
 * 被算术平均掩盖成中等强度。
 */
function calcTowsMatrix(swot){
  var S = svSum(swot,'s'), W = svSum(swot,'w'),
      O = svSum(swot,'o'), T = svSum(swot,'t');
  var cells = [
    {k:'SO', a:'s', b:'o', av:S, bv:O},
    {k:'ST', a:'s', b:'t', av:S, bv:T},
    {k:'WO', a:'w', b:'o', av:W, bv:O},
    {k:'WT', a:'w', b:'t', av:W, bv:T}
  ];
  var maxV = 0;
  cells.forEach(function(c){
    c.strength = (c.av > 0 && c.bv > 0) ? Math.sqrt(c.av * c.bv) : 0;
    c.empty = c.strength === 0;
    if(c.strength > maxV) maxV = c.strength;
  });
  cells.forEach(function(c){
    c.pct = maxV ? c.strength / maxV : 0;
    c.dominant = (!c.empty && maxV > 0 && c.strength >= maxV - 1e-9);
  });

  // 空缺预警：某象限没填，会导致两条策略同时无法推导
  var gaps = [];
  if(!svItems(swot,'w').length) gaps.push('未填<b>劣势</b>：WO 与 WT 无法推导——只列优势不列劣势，等于默认自己没有短板');
  if(!svItems(swot,'t').length) gaps.push('未填<b>威胁</b>：ST 与 WT 无法推导——只看到机会，等于假设环境不会变坏');
  if(!svItems(swot,'s').length) gaps.push('未填<b>优势</b>：SO 与 ST 无法推导');
  if(!svItems(swot,'o').length) gaps.push('未填<b>机会</b>：SO 与 WO 无法推导');

  return {S:S, W:W, O:O, T:T, cells:cells, maxV:maxV, gaps:gaps};
}

/* ---------- SVG 绘制辅助 ---------- */

/** 手绘箭头（不用 marker，避免多图 ID 冲突） */
function svArrow(x1, y1, x2, y2, color, w){
  var dx = x2 - x1, dy = y2 - y1;
  var len = Math.sqrt(dx * dx + dy * dy);
  if(len < 3) return '';
  var a = Math.atan2(dy, dx);
  var hl = 9, ha = 0.42;
  var p1 = (x2 - hl * Math.cos(a - ha)) + ',' + (y2 - hl * Math.sin(a - ha));
  var p2 = (x2 - hl * Math.cos(a + ha)) + ',' + (y2 - hl * Math.sin(a + ha));
  return '<line x1="' + x1.toFixed(1) + '" y1="' + y1.toFixed(1) + '" x2="' + x2.toFixed(1) +
         '" y2="' + y2.toFixed(1) + '" stroke="' + color + '" stroke-width="' + (w || 1.6) +
         '" stroke-linecap="round"/>' +
         '<polygon points="' + x2.toFixed(1) + ',' + y2.toFixed(1) + ' ' + p1 + ' ' + p2 +
         '" fill="' + color + '"/>';
}

/** 态势图坐标系：内部为横轴、外部为纵轴 */
function svPostureXY(inner, outer, cx, cy, R){
  return {
    x: cx + (inner / 100) * R,
    y: cy - (outer / 100) * R
  };
}

/** 画态势图底图（四象限底纹 + 轴 + 角标），供 ① ④ 复用 */
function svPostureBase(cx, cy, R, opt){
  opt = opt || {};
  var s = '';
  var Q = [
    {x:cx, y:cy - R, w:R, h:R, c:'#047857', t:'🟢 进攻 SO', tx:cx + R - 8, ty:cy - R + 16, an:'end'},
    {x:cx - R, y:cy - R, w:R, h:R, c:'#1d4ed8', t:'🔵 补强 WO', tx:cx - R + 8, ty:cy - R + 16, an:'start'},
    {x:cx, y:cy, w:R, h:R, c:'#b45309', t:'🟡 防御 ST', tx:cx + R - 8, ty:cy + R - 8, an:'end'},
    {x:cx - R, y:cy, w:R, h:R, c:'#b91c1c', t:'🔴 转型 WT', tx:cx - R + 8, ty:cy + R - 8, an:'start'}
  ];
  Q.forEach(function(q){
    s += '<rect x="' + q.x.toFixed(1) + '" y="' + q.y.toFixed(1) + '" width="' + R.toFixed(1) +
         '" height="' + R.toFixed(1) + '" fill="' + q.c + '" fill-opacity="0.05"/>';
  });
  s += '<rect x="' + (cx - R) + '" y="' + (cy - R) + '" width="' + (R * 2) + '" height="' + (R * 2) +
       '" fill="none" stroke="' + CX.line + '" stroke-width="1"/>';
  s += '<line x1="' + (cx - R) + '" y1="' + cy + '" x2="' + (cx + R) + '" y2="' + cy +
       '" stroke="' + CX.mute + '" stroke-dasharray="4 3"/>';
  s += '<line x1="' + cx + '" y1="' + (cy - R) + '" x2="' + cx + '" y2="' + (cy + R) +
       '" stroke="' + CX.mute + '" stroke-dasharray="4 3"/>';
  if(opt.labels !== false){
    Q.forEach(function(q){
      s += '<text x="' + q.tx + '" y="' + q.ty + '" font-size="10" fill="' + CX.mute +
           '" text-anchor="' + q.an + '">' + q.t + '</text>';
    });
    s += '<text x="' + (cx + R) + '" y="' + (cy + R + 16) + '" font-size="10" fill="' + CX.sub +
         '" text-anchor="end">内部强 →</text>';
    s += '<text x="' + (cx - R) + '" y="' + (cy + R + 16) + '" font-size="10" fill="' + CX.sub +
         '" text-anchor="start">← 内部弱</text>';
    s += '<text x="' + (cx - R - 10) + '" y="' + (cy - R + 4) + '" font-size="10" fill="' + CX.sub +
         '" text-anchor="start" transform="rotate(-90 ' + (cx - R - 10) + ' ' + (cy - R + 4) + ')">外部机会 + →</text>';
  }
  return s;
}

/* ---------- ① 加权 SWOT 矢量图 ---------- */

function svgSwotViz(P){
  var W = 880, H = 366;
  var s = '<svg xmlns="http://www.w3.org/2000/svg" width="' + W + '" height="' + H +
          '" viewBox="0 0 ' + W + ' ' + H + '" font-family="PingFang SC,Microsoft YaHei,sans-serif">';
  s += cxFrame(W, H, '加权 SWOT · 战略态势', "WEIGHTED SWOT · POSTURE MAP · " + todayStr());

  /* --- 左：态势图 --- */
  var cx = 186, cy = 196, R = 140;
  s += svPostureBase(cx, cy, R);

  var pt = svPostureXY(P.inner, P.outer, cx, cy, R);
  var Q = SV_QUAD[P.quad];
  // 从原点到落点的向量线，长度即信念度
  s += '<line x1="' + cx + '" y1="' + cy + '" x2="' + pt.x.toFixed(1) + '" y2="' + pt.y.toFixed(1) +
       '" stroke="' + Q.color + '" stroke-width="2" stroke-dasharray="5 3" opacity="0.55"/>';
  s += '<circle cx="' + pt.x.toFixed(1) + '" cy="' + pt.y.toFixed(1) + '" r="15" fill="' + Q.color +
       '" fill-opacity="0.16"/>';
  s += '<circle cx="' + pt.x.toFixed(1) + '" cy="' + pt.y.toFixed(1) + '" r="7.5" fill="' + Q.color +
       '" stroke="#fff" stroke-width="2"/>';
  var lx = pt.x + (P.inner >= 0 ? 14 : -14), lan = P.inner >= 0 ? 'start' : 'end';
  s += '<text x="' + lx.toFixed(1) + '" y="' + (pt.y - 6).toFixed(1) + '" font-size="12" font-weight="700" fill="' +
       Q.color + '" text-anchor="' + lan + '">' + Q.icon + ' ' + P.quad + ' ' + Q.n + '</text>';
  s += '<text x="' + lx.toFixed(1) + '" y="' + (pt.y + 8).toFixed(1) + '" font-size="9.5" fill="' + CX.mute +
       '" text-anchor="' + lan + '">内部 ' + (P.inner >= 0 ? '+' : '') + P.inner.toFixed(0) +
       ' · 外部 ' + (P.outer >= 0 ? '+' : '') + P.outer.toFixed(0) + '</text>';

  /* --- 右：四条权重条 --- */
  var bx = 400, bw = 380;
  var maxSum = Math.max(P.s, P.w, P.o, P.t, 1);
  var y0 = 92, rh = 62;
  SV_KEYS.forEach(function(K, i){
    var v = P[({s:'s', w:'w', o:'o', t:'t'})[K.k]];
    var y = y0 + i * rh;
    var wpx = Math.max(2, (v / maxSum) * bw);
    s += '<text x="' + bx + '" y="' + (y - 8) + '" font-size="12" font-weight="600" fill="' + K.color +
         '">' + K.icon + ' ' + K.n + '</text>';
    s += '<text x="' + (bx + bw) + '" y="' + (y - 8) + '" font-size="11" fill="' + CX.sub +
         '" text-anchor="end">加权 ' + v + '　' + P['n' + K.k.toUpperCase()] + ' 条</text>';
    s += '<rect x="' + bx + '" y="' + y + '" width="' + bw + '" height="18" rx="9" fill="' + CX.line + '" fill-opacity="0.55"/>';
    s += '<rect x="' + bx + '" y="' + y + '" width="' + wpx.toFixed(1) + '" height="18" rx="9" fill="' +
         K.color + '" fill-opacity="0.85"/>';
    // 趋势箭头
    var tr = P.trend[K.k];
    var tx = bx + 6, ty = y + 34;
    if(tr.up || tr.down){
      s += '<text x="' + tx + '" y="' + ty + '" font-size="10" fill="' + CX.mute + '">趋势：' +
           (tr.up ? '<tspan fill="#047857">' + tr.up + '↑</tspan> ' : '') +
           (tr.down ? '<tspan fill="#b91c1c">' + tr.down + '↓</tspan>' : '') + '</text>';
    }else{
      s += '<text x="' + tx + '" y="' + ty + '" font-size="10" fill="' + CX.mute + '">趋势：未填变化率</text>';
    }
  });

  /* --- 底部净值对比 --- */
  var ny = y0 + 4 * rh + 6;
  s += '<line x1="' + bx + '" y1="' + (ny - 18) + '" x2="' + (bx + bw) + '" y2="' + (ny - 18) +
       '" stroke="' + CX.line + '"/>';
  s += '<text x="' + bx + '" y="' + ny + '" font-size="11" fill="' + CX.ink + '">内部净值：优势 ' + P.s +
       ' − 劣势 ' + P.w + ' = <tspan font-weight="700" fill="' + (P.inner >= 0 ? '#047857' : '#b45309') + '">' +
       (P.inner >= 0 ? '+' : '') + P.inner.toFixed(0) + '</tspan></text>';
  s += '<text x="' + bx + '" y="' + (ny + 18) + '" font-size="11" fill="' + CX.ink + '">外部净值：机会 ' + P.o +
       ' − 威胁 ' + P.t + ' = <tspan font-weight="700" fill="' + (P.outer >= 0 ? '#1d4ed8' : '#b91c1c') + '">' +
       (P.outer >= 0 ? '+' : '') + P.outer.toFixed(0) + '</tspan></text>';

  s += '</svg>';
  return s;
}

/** 态势图下方的诊断文字（HTML） */
function svPostureNote(P){
  var Q = SV_QUAD[P.quad];
  var o = [];
  o.push('<div class="svnote">');
  o.push('<div class="svnote__row"><b>主导策略</b><span style="color:' + Q.color + '">' + Q.icon + ' ' +
         P.quad + ' ' + Q.n + '　' + Q.desc + '</span></div>');
  var convTxt = P.conv >= 0.6 ? '判断明确' : (P.conv >= 0.3 ? '中等' : '接近均势，结论不稳定');
  o.push('<div class="svnote__row"><b>信念度</b><span>' + (P.conv * 100).toFixed(0) + '%（' + convTxt + '）</span></div>');
  if(P.total){
    o.push('<div class="svnote__row"><b>数据支撑</b><span>' + (P.total - P.noData) + '/' + P.total +
           ' 条有数值；' + (P.noData ? '<span style="color:var(--warn)">' + P.noData + ' 条纯主观</span>' : '全部有据') +
           '</span></div>');
  }
  if(P.defaultW && P.total){
    o.push('<div class="svnote__row"><b>权重提示</b><span style="color:var(--warn)">' + P.defaultW +
           '/' + P.total + ' 条未调整权重（默认 3），此时加权结果等于按条数计数——调权重才有意义</span></div>');
  }
  o.push('</div>');
  return o.join('');
}

/* ---------- ② TOWS 交叉矩阵 ---------- */

function svgTowsMatrix(M){
  var W = 880, H = 392;
  var padL = 104, padR = 24, padT = 62, padB = 44;
  var cw = (W - padL - padR) / 2, ch = (H - padT - padB) / 2;

  var s = '<svg xmlns="http://www.w3.org/2000/svg" width="' + W + '" height="' + H +
          '" viewBox="0 0 ' + W + ' ' + H + '" font-family="PingFang SC,Microsoft YaHei,sans-serif">';
  s += cxFrame(W, H, 'TOWS 交叉矩阵', 'INTERNAL × EXTERNAL · WEIGHTED STRENGTH');

  // 列表头
  s += '<text x="' + (padL + cw / 2) + '" y="' + (padT - 14) + '" font-size="12" font-weight="600" fill="#1d4ed8" text-anchor="middle">🌟 外部机会</text>';
  s += '<text x="' + (padL + cw + cw / 2) + '" y="' + (padT - 14) + '" font-size="12" font-weight="600" fill="#b91c1c" text-anchor="middle">⚡ 外部威胁</text>';
  // 行表头
  var rl = [
    {y:padT + ch / 2, t:'💪 内部优势', c:'#047857'},
    {y:padT + ch + ch / 2, t:'🚨 内部劣势', c:'#b45309'}
  ];
  rl.forEach(function(r){
    s += '<text x="' + (padL - 14) + '" y="' + (r.y + 4) + '" font-size="12" font-weight="600" fill="' +
         r.c + '" text-anchor="end">' + r.t + '</text>';
  });

  var pos = {SO:[0,0], ST:[1,0], WO:[0,1], WT:[1,1]};
  M.cells.forEach(function(c){
    var p = pos[c.k];
    if(!p) return;
    var x = padL + p[0] * cw, y = padT + p[1] * ch;
    var Q = SV_QUAD[c.k];
    var inset = 8;
    var ix = x + inset, iy = y + inset, iw = cw - inset * 2 - 8, ih = ch - inset * 2 - 8;

    s += '<rect x="' + ix + '" y="' + iy + '" width="' + iw + '" height="' + ih + '" rx="12" fill="' +
         Q.tint + '" fill-opacity="' + (c.empty ? 0.03 : 0.06) + '" stroke="' +
         (c.empty ? CX.mute : Q.color) + '" stroke-width="' + (c.dominant ? 2 : 1) +
         '"' + (c.empty ? ' stroke-dasharray="6 4"' : '') + '/>';

    s += '<text x="' + (ix + 14) + '" y="' + (iy + 24) + '" font-size="13" font-weight="700" fill="' +
         (c.empty ? CX.mute : Q.color) + '">' + Q.icon + ' ' + c.k + ' ' + Q.n + '</text>';

    if(c.empty){
      s += '<text x="' + (ix + iw / 2) + '" y="' + (iy + ih / 2 + 6) + '" font-size="12" fill="' + CX.mute +
           '" text-anchor="middle">空缺 · 无法推导</text>';
    }else{
      s += '<text x="' + (ix + 14) + '" y="' + (iy + 52) + '" font-size="20" font-weight="700" fill="' +
           Q.color + '">' + c.strength.toFixed(1) + '</text>';
      s += '<text x="' + (ix + 14 + 46) + '" y="' + (iy + 52) + '" font-size="10" fill="' + CX.mute +
           '">交叉强度 √(A×B)</text>';
      // 强度条
      var bw2 = iw - 28;
      s += '<rect x="' + (ix + 14) + '" y="' + (iy + 62) + '" width="' + bw2 + '" height="8" rx="4" fill="' +
           CX.line + '" fill-opacity="0.6"/>';
      s += '<rect x="' + (ix + 14) + '" y="' + (iy + 62) + '" width="' + Math.max(3, c.pct * bw2).toFixed(1) +
           '" height="8" rx="4" fill="' + Q.color + '" fill-opacity="0.8"/>';
      s += '<text x="' + (ix + 14) + '" y="' + (iy + 88) + '" font-size="10.5" fill="' + CX.sub +
           '">内部 ' + c.av + ' × 外部 ' + c.bv + '</text>';
      if(c.dominant){
        s += '<rect x="' + (ix + iw - 52) + '" y="' + (iy + 12) + '" width="42" height="18" rx="9" fill="' +
             Q.color + '" fill-opacity="0.9"/>';
        s += '<text x="' + (ix + iw - 31) + '" y="' + (iy + 25) + '" font-size="10" fill="#fff" text-anchor="middle" font-weight="600">主导</text>';
      }
    }
  });

  s += '<text x="' + padL + '" y="' + (H - 16) + '" font-size="10" fill="' + CX.mute +
       '">交叉强度 = √(内部加权分 × 外部加权分)：任一侧为 0 则策略不成立，且避免「一侧极强另一侧极弱」被误判为中等</text>';
  s += '</svg>';
  return s;
}

/* ---------- ③ 快照迁移图（BCG 象限间箭头） ---------- */

function svgSnapShift(snap, cur, mode, gTh, mTh){
  var W = 880, H = 470;
  var padL = 76, padR = 40, padT = 62, padB = 70;
  var pw = W - padL - padR, ph = H - padT - padB;

  var oldRows = (snap.bcg || []).filter(function(r){ return r && r.n && String(r.n).trim(); });
  var newRows = (cur || []).filter(function(r){ return r && r.n && String(r.n).trim(); });
  if(!oldRows.length && !newRows.length) return '';

  var all = oldRows.concat(newRows);
  var gMin = Math.min.apply(null, all.map(function(r){ return r.growth; }).concat([0]));
  var gMax = Math.max.apply(null, all.map(function(r){ return r.growth; }).concat([gTh])) * 1.15 || 10;
  if(gMax === gMin) gMax = gMin + 10;
  var mMax = mode === 'ratio'
    ? Math.max.apply(null, all.map(function(r){ return r.share; }).concat([mTh, 1.5])) * 1.15
    : 100;
  var mMin = 0;

  var X = function(v){ return padL + (Math.max(mMin, Math.min(mMax, v)) - mMin) / (mMax - mMin) * pw; };
  var Y = function(v){ return padT + ph - (Math.max(gMin, Math.min(gMax, v)) - gMin) / (gMax - gMin) * ph; };
  var quadOf = function(r, th){
    var hiG = r.growth >= th, hiM = r.share >= mTh;
    return hiG ? (hiM ? 'star' : 'question') : (hiM ? 'cash' : 'dog');
  };
  var QN = {star:{n:'明星', c:'#1d4ed8'}, question:{n:'问题儿童', c:'#b45309'},
            cash:{n:'现金牛', c:'#047857'}, dog:{n:'瘦狗', c:'#b91c1c'}};
  var RANK = {dog:0, cash:1, question:2, star:3};

  var s = '<svg xmlns="http://www.w3.org/2000/svg" width="' + W + '" height="' + H +
          '" viewBox="0 0 ' + W + ' ' + H + '" font-family="PingFang SC,Microsoft YaHei,sans-serif">';
  s += cxFrame(W, H, '业务线迁移：' + snap.name, 'SNAPSHOT SHIFT · ' + snap.date + ' → 当前');

  var xm = X(mTh), ym = Y(gTh);
  var QB = [
    {x:padL, y:padT, w:xm-padL, h:ym-padT, c:'#b45309'},
    {x:xm, y:padT, w:padL+pw-xm, h:ym-padT, c:'#1d4ed8'},
    {x:padL, y:ym, w:xm-padL, h:padT+ph-ym, c:'#b91c1c'},
    {x:xm, y:ym, w:padL+pw-xm, h:padT+ph-ym, c:'#047857'}
  ];
  QB.forEach(function(q){
    s += '<rect x="' + q.x.toFixed(0) + '" y="' + q.y.toFixed(0) + '" width="' + Math.max(0,q.w).toFixed(0) +
         '" height="' + Math.max(0,q.h).toFixed(0) + '" fill="' + q.c + '" fill-opacity="0.05"/>';
  });
  s += '<line x1="' + padL + '" y1="' + (padT+ph) + '" x2="' + (padL+pw) + '" y2="' + (padT+ph) + '" stroke="' + CX.line + '"/>';
  s += '<line x1="' + padL + '" y1="' + padT + '" x2="' + padL + '" y2="' + (padT+ph) + '" stroke="' + CX.line + '"/>';
  s += '<line x1="' + xm.toFixed(0) + '" y1="' + padT + '" x2="' + xm.toFixed(0) + '" y2="' + (padT+ph) + '" stroke="' + CX.mute + '" stroke-dasharray="4 3"/>';
  s += '<line x1="' + padL + '" y1="' + ym.toFixed(0) + '" x2="' + (padL+pw) + '" y2="' + ym.toFixed(0) + '" stroke="' + CX.mute + '" stroke-dasharray="4 3"/>';
  [[padL+8, padT+16, '❓ 问题儿童', 'start'], [padL+pw-8, padT+16, '⭐ 明星', 'end'],
   [padL+8, padT+ph-8, '🐕 瘦狗', 'start'], [padL+pw-8, padT+ph-8, '🐄 现金牛', 'end']].forEach(function(l){
    s += '<text x="' + l[0] + '" y="' + l[1] + '" font-size="10" fill="' + CX.mute + '" text-anchor="' + l[3] + '">' + l[2] + '</text>';
  });

  var sgArr = (snap.bcg || []).map(function(r){ return r.growth; }).sort(function(a,b){ return a-b; });
  var sgTh = sgArr.length ? (sgArr[Math.floor(sgArr.length/2)] || gTh) : gTh;

  var better = 0, worse = 0, same = 0, added = 0, gone = 0;
  var byName = {};
  newRows.forEach(function(r){ byName[String(r.n).trim()] = r; });
  var oldByName = {};
  oldRows.forEach(function(r){ oldByName[String(r.n).trim()] = r; });

  oldRows.forEach(function(r){
    var key = String(r.n).trim();
    var nr = byName[key];
    var x1 = X(r.share), y1 = Y(r.growth);
    if(!nr){
      gone++;
      s += '<circle cx="' + x1.toFixed(0) + '" cy="' + y1.toFixed(0) + '" r="7" fill="none" stroke="' +
           CX.mute + '" stroke-width="1.5" stroke-dasharray="3 2"/>';
      s += '<text x="' + x1.toFixed(0) + '" y="' + (y1 - 12).toFixed(0) + '" font-size="9" fill="' + CX.mute +
           '" text-anchor="middle">' + esc(key.slice(0,6)) + '（已移除）</text>';
      return;
    }
    var x2 = X(nr.share), y2 = Y(nr.growth);
    var q1 = quadOf(r, sgTh), q2 = quadOf(nr, gTh);
    var d = RANK[q2] - RANK[q1];
    var col = d > 0 ? '#047857' : (d < 0 ? '#b91c1c' : CX.mute);
    if(d > 0) better++; else if(d < 0) worse++; else same++;

    s += '<circle cx="' + x1.toFixed(0) + '" cy="' + y1.toFixed(0) + '" r="5" fill="#fff" stroke="' +
         CX.mute + '" stroke-width="1.5"/>';
    s += svArrow(x1, y1, x2, y2, col, d === 0 ? 1.4 : 2);
    s += '<circle cx="' + x2.toFixed(0) + '" cy="' + y2.toFixed(0) + '" r="9" fill="' +
         (d === 0 ? CX.mute : col) + '" fill-opacity="0.85" stroke="#fff" stroke-width="1.5"/>';
    s += '<text x="' + x2.toFixed(0) + '" y="' + (y2 - 14).toFixed(0) + '" font-size="10" font-weight="600" fill="' +
         CX.ink + '" text-anchor="middle">' + esc(key.slice(0,6)) + '</text>';
  });
  newRows.forEach(function(r){
    var key = String(r.n).trim();
    if(oldByName[key]) return;
    added++;
    var x = X(r.share), y = Y(r.growth);
    s += '<circle cx="' + x.toFixed(0) + '" cy="' + y.toFixed(0) + '" r="9" fill="#1d4ed8" fill-opacity="0.8" stroke="#fff" stroke-width="1.5"/>';
    s += '<text x="' + x.toFixed(0) + '" y="' + (y - 14).toFixed(0) + '" font-size="10" font-weight="600" fill="' +
         CX.ink + '" text-anchor="middle">' + esc(key.slice(0,6)) + '（新增）</text>';
  });

  var ly = H - 26;
  s += '<text x="' + padL + '" y="' + ly + '" font-size="10.5" fill="' + CX.ink + '">迁移：' +
       '<tspan fill="#047857">' + better + ' 更优</tspan> · ' +
       '<tspan fill="#b91c1c">' + worse + ' 恶化</tspan> · ' +
       '<tspan fill="' + CX.sub + '">' + same + ' 持平</tspan> · ' +
       '<tspan fill="#1d4ed8">' + added + ' 新增</tspan> · ' +
       '<tspan fill="' + CX.mute + '">' + gone + ' 移除</tspan>' +
       '　（虚线圈=快照位置，实心=当前，箭头方向即迁移路径）</text>';
  s += '</svg>';
  return s;
}

/* ---------- ④ 态势轨迹（多次快照） ---------- */

function svgPostureTrack(pts){
  var W = 880, H = 400;
  var cx = 210, cy = 200, R = 148;
  var s = '<svg xmlns="http://www.w3.org/2000/svg" width="' + W + '" height="' + H +
          '" viewBox="0 0 ' + W + ' ' + H + '" font-family="PingFang SC,Microsoft YaHei,sans-serif">';
  s += cxFrame(W, H, '战略姿态迁移轨迹', 'POSTURE TRACK · SNAPSHOTS → NOW');
  s += svPostureBase(cx, cy, R);

  var XY = pts.map(function(p){ return svPostureXY(p.inner, p.outer, cx, cy, R); });

  // 连线
  for(var i = 1; i < XY.length; i++){
    var a = XY[i-1], b = XY[i];
    var p0 = pts[i-1], p1 = pts[i];
    var better = (RANKQ(p1.quad) >= RANKQ(p0.quad));
    var col = better ? '#047857' : '#b91c1c';
    // 缩短端点，避免压住圆点
    var dx = b.x - a.x, dy = b.y - a.y, L = Math.sqrt(dx*dx + dy*dy) || 1;
    var ux = dx / L, uy = dy / L, gap = 9;
    s += svArrow(a.x + ux*gap, a.y + uy*gap, b.x - ux*gap, b.y - uy*gap, col, 1.8);
  }
  // 点
  pts.forEach(function(p, i){
    var q = XY[i];
    var Q = SV_QUAD[p.quad];
    var isCur = !!p.current;
    s += '<circle cx="' + q.x.toFixed(1) + '" cy="' + q.y.toFixed(1) + '" r="' + (isCur ? 11 : 7.5) +
         '" fill="' + Q.color + '" fill-opacity="' + (isCur ? 0.95 : 0.55) + '" stroke="' +
         (isCur ? '#fff' : Q.color) + '" stroke-width="' + (isCur ? 2.5 : 1.2) + '"/>';
    if(isCur){
      s += '<circle cx="' + q.x.toFixed(1) + '" cy="' + q.y.toFixed(1) + '" r="17" fill="none" stroke="' +
           Q.color + '" stroke-width="1.5" stroke-dasharray="3 2" opacity="0.6"/>';
    }
    s += '<text x="' + q.x.toFixed(1) + '" y="' + (q.y - (isCur ? 22 : 15)).toFixed(1) +
         '" font-size="9.5" fill="' + CX.ink + '" text-anchor="middle" font-weight="600">' +
         esc((p.label || '').slice(0, 8)) + '</text>';
  });

  // 右侧图例
  var lx = 430, ly = 96;
  s += '<text x="' + lx + '" y="' + (ly - 22) + '" font-size="12" font-weight="600" fill="' + CX.ink +
       '">时间顺序</text>';
  pts.slice().reverse().forEach(function(p, idx){
    var y = ly + idx * 30;
    var Q = SV_QUAD[p.quad];
    var row = pts.length - 1 - idx;
    s += '<circle cx="' + (lx + 7) + '" cy="' + (y - 4) + '" r="6" fill="' + Q.color +
         '" fill-opacity="' + (p.current ? 0.95 : 0.5) + '"/>';
    s += '<text x="' + (lx + 20) + '" y="' + y + '" font-size="11" fill="' + CX.ink + '">' +
         esc((p.label || '').slice(0, 14)) + '</text>';
    s += '<text x="' + (lx + 150) + '" y="' + y + '" font-size="10.5" fill="' + Q.color + '">' +
         p.quad + ' ' + Q.n + '</text>';
    s += '<text x="' + (lx + 250) + '" y="' + y + '" font-size="10" fill="' + CX.mute + '">内部 ' +
         (p.inner >= 0 ? '+' : '') + p.inner.toFixed(0) + ' / 外部 ' + (p.outer >= 0 ? '+' : '') +
         p.outer.toFixed(0) + '</text>';
    if(row === pts.length - 1){
      s += '<text x="' + (lx + 380) + '" y="' + y + '" font-size="9.5" fill="' + CX.sub + '">当前</text>';
    }
  });
  s += '<text x="' + lx + '" y="' + (H - 24) + '" font-size="10" fill="' + CX.mute +
       '">绿箭头=象限改善，红箭头=恶化。轨迹越靠右上越好；反复穿越中心线说明战略摇摆。</text>';
  s += '</svg>';
  return s;
}

/** 象限优劣排序，用于判断轨迹方向 */
function RANKQ(q){
  return {WT:0, ST:1, WO:2, SO:3}[q] || 0;
}

/* ---------- 渲染入口 ---------- */

function renderSwotViz(){
  var host = $('#smSwotViz'); if(!host) return;
  var P = calcSwotPosture(sm().swot);
  if(!P.total){
    host.innerHTML = '<span class="ph">在四个象限各填至少一条，这里会生成加权态势图</span>';
    var sum = $('#smSwotSum'); if(sum) sum.textContent = '';
    return;
  }
  host.innerHTML = svgSwotViz(P) + svPostureNote(P);
  var sum = $('#smSwotSum');
  if(sum){
    var Q = SV_QUAD[P.quad];
    sum.textContent = Q.icon + ' ' + P.quad + ' ' + Q.n + '　加权 S' + P.s + '/W' + P.w + '/O' + P.o + '/T' + P.t;
  }
}

function renderTowsViz(){
  var host = $('#smTowsViz'); if(!host) return;
  var M = calcTowsMatrix(sm().swot);
  if(!M.S && !M.W && !M.O && !M.T){
    host.innerHTML = '';
    return;
  }
  var h = svgTowsMatrix(M);
  if(M.gaps.length){
    h += '<div class="svnote svnote--warn">' + M.gaps.map(function(g){
      return '<div class="svnote__row"><b>空缺</b><span>' + g + '</span></div>';
    }).join('') + '</div>';
  }
  host.innerHTML = h;
}

function renderSnapTrack(){
  var host = $('#smSnapTrack'); if(!host) return;
  var S = sm();
  var snaps = S.snaps || [];
  var cur = calcSwotPosture(S.swot);
  if(!cur.total && !snaps.length){ host.innerHTML = ''; return; }

  var pts = snaps.map(function(sn){
    var p = calcSwotPosture(sn.swot);
    return {label:sn.name, date:sn.date, inner:p.inner, outer:p.outer, quad:p.quad, current:false};
  });
  if(cur.total){
    pts.push({label:'当前', date:'', inner:cur.inner, outer:cur.outer, quad:cur.quad, current:true});
  }
  if(pts.length < 2){
    host.innerHTML = '<span class="ph">保存 2 个以上快照后，这里会画出战略姿态的迁移轨迹</span>';
    return;
  }
  host.innerHTML = svgPostureTrack(pts);
}

/** 快照对比时，在快照卡片里画 BCG 迁移图 */
function renderSnapShift(i){
  var host = $('#smBcgTrack'); if(!host) return;
  var S = sm();
  var sn = S.snaps[i]; if(!sn){ host.innerHTML = ''; return; }
  var cur = S.bcg || [];
  var gs = cur.map(function(r){ return r.growth; }).sort(function(a,b){ return a-b; });
  var gTh = gs.length ? (gs[Math.floor(gs.length/2)] || 10) : 10;
  var svg = svgSnapShift(sn, cur, S.bcgMode, gTh, (S.bcgMode === 'ratio' ? 1 : 50));
  host.innerHTML = svg || '<span class="ph">快照与当前都没有业务线数据，无法画迁移图</span>';
}

/* ---------- 视图切换绑定（编辑 ↔ 矢量图） ---------- */

function svBindToggles(){
  var box = $('#smSwotToggle'); if(!box) return;
  [].forEach.call(box.querySelectorAll('[data-svswot]'), function(b){
    b.onclick = function(){
      var v = b.getAttribute('data-svswot');
      [].forEach.call(box.querySelectorAll('[data-svswot]'), function(x){
        x.classList.toggle('is-on', x === b);
      });
      var grid = $('#smSwot'), viz = $('#smSwotViz');
      if(grid) grid.hidden = (v !== 'edit');
      if(viz) viz.hidden = (v !== 'viz');
      if(v === 'viz') renderSwotViz();
    };
  });
}

/* ---------- 导出：把加权结论写进战略报告 ---------- */

function svExportBlock(){
  var P = calcSwotPosture(sm().swot);
  if(!P.total) return [];
  var Q = SV_QUAD[P.quad];
  var M = calcTowsMatrix(sm().swot);
  var o = [];
  o.push('### ⚖️ 加权 SWOT 与战略态势');
  o.push('');
  o.push('> 口径：每条按 **权重 1-5** 计入所属象限（默认 3）。数值字段只判断「有无数据支撑」，不参与求和——87% 与 120万 无法相加。');
  o.push('');
  o.push('| 象限 | 条目数 | 加权分 |');
  o.push('|---|---|---|');
  SV_KEYS.forEach(function(K){
    o.push('| ' + K.icon + ' ' + K.n + ' | ' + P['n' + K.k.toUpperCase()] + ' | **' + P[K.k === 't' ? 't' : K.k] + '** |');
  });
  o.push('');
  o.push('- **内部净值**（优势−劣势）：**' + (P.inner >= 0 ? '+' : '') + P.inner.toFixed(0) + '**（−100 全是劣势，+100 全是优势）');
  o.push('- **外部净值**（机会−威胁）：**' + (P.outer >= 0 ? '+' : '') + P.outer.toFixed(0) + '**');
  o.push('- **主导策略**：' + Q.icon + ' **' + P.quad + ' ' + Q.n + '**（' + Q.desc + '），信念度 ' + (P.conv * 100).toFixed(0) + '%');
  if(P.noData) o.push('- ⚠️ ' + P.noData + '/' + P.total + ' 条未填数值，属于主观判断，建议补数据后再定策略');
  if(P.defaultW) o.push('- ⚠️ ' + P.defaultW + '/' + P.total + ' 条未调整权重（全部默认 3），此时加权等价于按条数计数');
  o.push('');
  o.push('**TOWS 交叉强度**：');
  o.push('');
  o.push('| 策略 | 内部 × 外部 | 强度 | 状态 |');
  o.push('|---|---|---|---|');
  M.cells.forEach(function(c){
    o.push('| ' + c.k + ' ' + SV_QUAD[c.k].n + ' | ' + c.av + ' × ' + c.bv + ' | **' +
           (c.empty ? '—' : c.strength.toFixed(1)) + '** | ' +
           (c.empty ? '空缺' : (c.dominant ? '主导' : '可用')) + ' |');
  });
  o.push('');
  return o;
}
