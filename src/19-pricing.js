/* ============================================================
 * 定价策略 —— 5 种定价法 + 促销折扣测算 + 价格带图
 * 全部为确定性计算：同样的输入永远得到同样的输出
 * ============================================================ */

/* 金额格式化：整数不加小数，小数保留 1 位 */
function money(v){
  if(v === null || v === undefined || isNaN(v)) return '—';
  var n = Math.round(v * 10) / 10;
  return (n % 1 === 0 ? String(n) : n.toFixed(1));
}

/* ---------- 核心计算 ---------- */
function calcPricing(){
  var num = function(id, dft){
    var el = $(id); if(!el) return dft;
    var v = parseFloat(String(el.value).replace(/[^\d.\-]/g, ''));
    return isNaN(v) ? dft : v;
  };

  var cost    = num('#pr_cost', 0);      // 单位变动成本
  var gm      = num('#pr_gm', 50);       // 目标毛利率 %
  var fixed   = num('#pr_fixed', 0);     // 固定成本
  var qty     = num('#pr_qty', 0);       // 预估销量
  var rivalLo = num('#pr_rlo', 0);       // 竞品价格下限
  var rivalHi = num('#pr_rhi', 0);       // 竞品价格上限
  var pos     = $('#pr_pos') ? $('#pr_pos').value : 'mid'; // 定位
  var value   = num('#pr_value', 0);     // 用户感知价值
  var capR    = num('#pr_cap', 60);      // 价值捕获率 %

  var errs = [];
  if(cost <= 0) errs.push('请填写单位变动成本');
  if(rivalLo <= 0 || rivalHi <= 0) errs.push('请填写竞品价格带（下限与上限）');
  if(rivalLo > 0 && rivalHi > 0 && rivalLo > rivalHi) errs.push('竞品价格下限不能高于上限');

  var stat = $('#prStat');
  if(stat) stat.textContent = errs.length ? ('⚠️ ' + errs[0]) : '✅ 参数已就绪';

  if(errs.length) return null;

  gm = Math.max(0, Math.min(95, gm));
  capR = Math.max(10, Math.min(95, capR));

  var rivalAvg = (rivalLo + rivalHi) / 2;
  var posK = {high:1.2, mid:1.0, low:0.85}[pos] || 1.0;

  /* --- 5 种定价法 --- */
  var strategies = [];

  // 1. 成本加成
  var p1 = gm >= 95 ? cost * 10 : cost / (1 - gm / 100);
  strategies.push({
    k:'cost', n:'成本加成', icon:'🧾', price:p1,
    logic:'成本 ÷ (1 − 目标毛利率)',
    desc:'最稳妥，保证毛利率，但忽略竞争与用户感知',
    use:'成本结构清晰、竞争不激烈的品类'
  });

  // 2. 竞品锚定
  var p2 = rivalAvg * posK;
  strategies.push({
    k:'rival', n:'竞品锚定', icon:'⚖️', price:p2,
    logic:'竞品均价 × 定位系数（' + posK + '）',
    desc:'跟随市场，风险低，但容易陷入同质化',
    use:'成熟品类、差异化不大的产品'
  });

  // 3. 价值定价
  var p3 = value > 0 ? value * (capR / 100) : rivalAvg;
  strategies.push({
    k:'value', n:'价值定价', icon:'💎', price:p3,
    logic: value > 0
      ? ('感知价值 × 捕获率（' + capR + '%）')
      : '（未填感知价值，暂用竞品均价替代）',
    desc:'按用户感知价值定价，利润空间最大',
    use:'强品牌、强差异化的产品'
  });

  // 4. 渗透定价
  var p4 = rivalAvg * 0.85;
  strategies.push({
    k:'penetrate', n:'渗透定价', icon:'📉', price:p4,
    logic:'竞品均价 × 0.85',
    desc:'低价换份额，需要销量规模支撑',
    use:'新进入市场、追求快速起量'
  });

  // 5. 撇脂定价
  var p5 = rivalAvg * 1.25;
  strategies.push({
    k:'skim', n:'撇脂定价', icon:'📈', price:p5,
    logic:'竞品均价 × 1.25',
    desc:'高价收割早期用户，后期逐步降价',
    use:'创新品类、有明显先发优势'
  });

  /* --- 每种策略的盈亏平衡销量 --- */
  strategies.forEach(function(s){
    var unit = s.price - cost;
    s.unitMargin = unit;
    s.marginRate = s.price > 0 ? (unit / s.price * 100) : 0;
    s.beQty = unit > 0 ? Math.ceil(fixed / unit) : null;   // 盈亏平衡销量
    s.profit = qty > 0 ? (unit * qty - fixed) : null;      // 预估总利润
  });

  /* --- 建议区间 --- */
  // 原则：不低于成本加成价（保毛利），不显著高于撇脂价（有价无市）
  var lo = Math.max(p1, cost * 1.1);
  var hi = Math.max(lo, Math.min(p5, p3 > 0 ? Math.max(p3, p2) : p2));
  if(hi <= lo) hi = lo * 1.15;

  /* --- 促销折扣测算 --- */
  var base = num('#pr_base', 0) || Math.round(p2);   // 原价，默认取竞品锚定价
  var varC = num('#pr_varc', 0) || cost;             // 促销期单位变动成本
  var disc = num('#pr_disc', 80);                    // 折扣（如 80 = 8折）
  disc = Math.max(1, Math.min(99, disc));

  var promo = [];
  [90, 85, 80, 70, 60].forEach(function(d){
    var np = base * (d / 100);
    var m0 = base - varC;      // 原单件毛利
    var m1 = np - varC;        // 折后单件毛利
    var mult = m1 > 0 ? (m0 / m1) : null;   // 保本需多卖倍数
    promo.push({
      d: d,
      price: np,
      margin: m1,
      mult: mult,
      safe: m1 > 0,
      needPct: mult ? ((mult - 1) * 100) : null
    });
  });

  var curDisc = promo.filter(function(x){ return x.d === disc; })[0] || null;
  if(!curDisc){
    var np0 = base * (disc / 100);
    var mm0 = base - varC, mm1 = np0 - varC;
    curDisc = {
      d: disc, price: np0, margin: mm1,
      mult: mm1 > 0 ? mm0 / mm1 : null,
      safe: mm1 > 0,
      needPct: mm1 > 0 ? ((mm0 / mm1 - 1) * 100) : null
    };
  }

  return {
    cost:cost, gm:gm, fixed:fixed, qty:qty,
    rivalLo:rivalLo, rivalHi:rivalHi, rivalAvg:rivalAvg, pos:pos, posK:posK,
    value:value, capR:capR,
    strategies:strategies,
    lo:lo, hi:hi,
    base:base, varC:varC, disc:disc,
    promo:promo, curDisc:curDisc
  };
}

/* ---------- 促销折扣：核心一行算法（说明用） ---------- */
function promoBreakEven(basePrice, varCost, discPct){
  var np = basePrice * (discPct / 100);
  var m0 = basePrice - varCost;
  var m1 = np - varCost;
  return m1 > 0 ? (m0 / m1) : null;   // 需要多卖的倍数
}

/* ---------- 价格带图 SVG ---------- */
function svgPriceBand(d){
  var W = 880, H = 330;
  var padL = 62, padR = 40, padT = 46, padB = 62;
  var plotW = W - padL - padR;

  // 价格轴范围
  var vals = [d.cost, d.rivalLo, d.rivalHi];
  d.strategies.forEach(function(s){ vals.push(s.price); });
  vals.push(d.lo, d.hi);
  var minV = Math.min.apply(null, vals), maxV = Math.max.apply(null, vals);
  var span = (maxV - minV) || 1;
  minV = Math.max(0, minV - span * 0.14);
  maxV = maxV + span * 0.14;
  span = maxV - minV;

  var X = function(v){ return padL + (v - minV) / span * plotW; };

  var s = '<svg xmlns="http://www.w3.org/2000/svg" width="' + W + '" height="' + H +
          '" viewBox="0 0 ' + W + ' ' + H + '" font-family="PingFang SC,Microsoft YaHei,sans-serif">';
  s += cxFrame(W, H, '定价策略 · 价格带对比', 'PRICING BAND · ' + todayStr());

  var yMid = padT + 96;

  // 价格轴
  s += '<line x1="' + padL + '" y1="' + (padT + 150) + '" x2="' + (W - padR) +
       '" y2="' + (padT + 150) + '" stroke="' + CX.line + '" stroke-width="1"/>';
  // 刻度
  for(var t = 0; t <= 4; t++){
    var v = minV + span * t / 4;
    var x = X(v);
    s += '<line x1="' + x.toFixed(0) + '" y1="' + (padT + 150) + '" x2="' + x.toFixed(0) +
         '" y2="' + (padT + 156) + '" stroke="' + CX.line + '"/>';
    s += '<text x="' + x.toFixed(0) + '" y="' + (padT + 170) + '" font-size="10.5" fill="' +
         CX.mute + '" text-anchor="middle">' + money(v) + '</text>';
  }

  // 竞品价格带（背景矩形）
  var rx1 = X(d.rivalLo), rx2 = X(d.rivalHi);
  s += '<rect x="' + rx1.toFixed(0) + '" y="' + (yMid - 46) + '" width="' + Math.max(6, rx2 - rx1).toFixed(0) +
       '" height="92" fill="' + CX.warn + '" fill-opacity="0.09"/>';
  s += '<text x="' + ((rx1 + rx2) / 2).toFixed(0) + '" y="' + (yMid - 52) +
       '" font-size="10" fill="' + CX.warn + '" text-anchor="middle" letter-spacing="1.2">RIVAL BAND</text>';

  // 建议区间
  var gx1 = X(d.lo), gx2 = X(d.hi);
  s += '<rect x="' + gx1.toFixed(0) + '" y="' + (padT + 120) + '" width="' + Math.max(6, gx2 - gx1).toFixed(0) +
       '" height="30" fill="' + CX.ok + '" fill-opacity="0.18" stroke="' + CX.ok + '" stroke-width="1"/>';
  s += '<text x="' + ((gx1 + gx2) / 2).toFixed(0) + '" y="' + (padT + 140) +
       '" font-size="10" fill="' + CX.ok + '" text-anchor="middle" letter-spacing="1.2">建议区间</text>';

  // 成本线
  var cx0 = X(d.cost);
  s += '<line x1="' + cx0.toFixed(0) + '" y1="' + (yMid - 46) + '" x2="' + cx0.toFixed(0) +
       '" y2="' + (yMid + 46) + '" stroke="' + CX.alert + '" stroke-width="1.6" stroke-dasharray="4 3"/>';
  s += '<text x="' + cx0.toFixed(0) + '" y="' + (yMid + 60) + '" font-size="10" fill="' +
       CX.alert + '" text-anchor="middle">成本 ' + money(d.cost) + '</text>';

  // 5 个策略落点（错开高度避免重叠）
  var colors = ['#1e3a8a', '#1d4ed8', '#047857', '#b45309', '#b91c1c'];
  var ys = [yMid - 26, yMid - 8, yMid + 10, yMid - 17, yMid + 27];
  d.strategies.forEach(function(st, i){
    var x = X(st.price), y = ys[i] || yMid;
    s += '<circle cx="' + x.toFixed(0) + '" cy="' + y + '" r="5.5" fill="' + colors[i % colors.length] + '"/>';
    s += '<line x1="' + x.toFixed(0) + '" y1="' + y + '" x2="' + x.toFixed(0) +
         '" y2="' + (padT + 150) + '" stroke="' + colors[i % colors.length] +
         '" stroke-width="1" stroke-opacity="0.35"/>';
    s += '<text x="' + (x + 9).toFixed(0) + '" y="' + (y + 4) + '" font-size="11" fill="' +
         CX.ink + '">' + esc(st.n) + ' ' + money(st.price) + '</text>';
  });

  // 底部统计
  var be = d.strategies[1].beQty;
  s += '<text x="' + (W - padR) + '" y="' + (H - 44) + '" font-size="11" fill="' + CX.mute +
       '" text-anchor="end">' + d.strategies.length + ' 种策略 · 竞品带 ' + money(d.rivalLo) +
       ' – ' + money(d.rivalHi) + (be ? ' · 盈亏平衡 ' + be + ' 件' : '') + '</text>';

  s += '</svg>';
  return s;
}

/* ---------- 渲染 ---------- */
var lastPricing = null;
var lastPricingSvg = '';

function renderPricing(){
  var d = calcPricing();
  lastPricing = d;
  if(!d){
    lastPricingSvg = '';
    var w = $('#prChart');
    if(w) w.innerHTML = '<span class="ph">填写参数后点「⚡ 计算定价」</span>';
    var pv = $('#prPreview');
    if(pv) pv.innerHTML = '<span class="ph">⚠️ 请补全参数后计算</span>';
    return;
  }

  // 图
  lastPricingSvg = svgPriceBand(d);
  var wc = $('#prChart');
  if(wc) wc.innerHTML = lastPricingSvg;

  // 文字报告
  var out = [];
  out.push('# 💰 定价策略分析');
  out.push('');
  out.push('**成本基础**：单位变动成本 ' + money(d.cost) +
           '　|　固定成本 ' + money(d.fixed) +
           '　|　目标毛利率 ' + d.gm + '%');
  out.push('');
  out.push('**竞品价格带**：' + money(d.rivalLo) + ' – ' + money(d.rivalHi) +
           '（均价 ' + money(d.rivalAvg) + '）');
  out.push('');
  out.push('---');
  out.push('');
  out.push('## 一、五种定价法对比');
  out.push('');
  out.push('| 策略 | 建议价格 | 单件毛利 | 毛利率 | 盈亏平衡销量 | 预估总利润 |');
  out.push('|---|---|---|---|---|---|');
  d.strategies.forEach(function(s){
    out.push('| ' + s.icon + ' ' + s.n + ' | **' + money(s.price) + '** | ' +
             money(s.unitMargin) + ' | ' + s.marginRate.toFixed(1) + '% | ' +
             (s.beQty !== null ? s.beQty + ' 件' : '—') + ' | ' +
             (s.profit !== null ? money(s.profit) : '—') + ' |');
  });
  out.push('');
  out.push('### 各策略逻辑与适用');
  out.push('');
  d.strategies.forEach(function(s){
    out.push('- **' + s.icon + ' ' + s.n + '**：' + s.logic + '　→　' + s.desc + '　*适合：' + s.use + '*');
  });
  out.push('');
  out.push('## 二、建议价格区间');
  out.push('');
  out.push('> **' + money(d.lo) + ' – ' + money(d.hi) + '**');
  out.push('>');
  out.push('> 下限取成本加成价（保证目标毛利率），上限参考撇脂价与感知价值（避免有价无市）。');
  out.push('');

  out.push('## 三、促销折扣测算');
  out.push('');
  out.push('原价 **' + money(d.base) + '**，促销期单位变动成本 ' + money(d.varC) + '。');
  out.push('');
  out.push('| 折扣 | 折后价 | 单件毛利 | 保本需多卖 | 判断 |');
  out.push('|---|---|---|---|---|');
  d.promo.forEach(function(p){
    out.push('| ' + (p.d / 10).toFixed(1) + ' 折 | ' + money(p.price) + ' | ' + money(p.margin) + ' | ' +
             (p.mult ? ('×' + p.mult.toFixed(2) + '（+' + p.needPct.toFixed(0) + '%）') : '—') + ' | ' +
             (p.safe ? '✅ 可行' : '❌ 击穿成本') + ' |');
  });
  out.push('');
  if(d.curDisc){
    var cd = d.curDisc;
    out.push('### 当前设定：' + (d.disc / 10).toFixed(1) + ' 折');
    out.push('');
    if(cd.safe){
      out.push('折后价 **' + money(cd.price) + '**，单件毛利从 ' + money(d.base - d.varC) +
               ' 降到 **' + money(cd.margin) + '**。');
      out.push('');
      out.push('**需要多卖 ' + cd.mult.toFixed(2) + ' 倍（即销量 +' + cd.needPct.toFixed(0) +
               '%）才能保住总毛利。**');
      out.push('');
      out.push(cd.needPct > 100
        ? '⚠️ 需要销量翻倍以上，风险很高。建议缩短促销周期，或用满减替代直接降价。'
        : cd.needPct > 50
          ? '⚠️ 需要显著增量，务必确认流量与库存能支撑。'
          : '✅ 增量要求温和，属于可控范围。');
    } else {
      out.push('❌ **折后价 ' + money(cd.price) + ' 已低于单位变动成本 ' + money(d.varC) +
               '，每卖一件亏一件。**');
    }
  }
  out.push('');
  out.push('---');
  out.push('');
  out.push('*盈亏平衡销量 = 固定成本 ÷（单价 − 单位变动成本）*　·　' +
           '*保本倍数 =（原价 − 变动成本）÷（折后价 − 变动成本）*');
  out.push('');
  out.push('*本测算基于你填写的成本与竞品数据，未考虑品牌溢价、渠道加价与心理价位，仅供参考。*');

  var pv2 = $('#prPreview');
  if(pv2) pv2.innerHTML = mdLite(out.join('\n'));
}

/* ---------- 导出 ---------- */
function exportPricingSvg(){
  if(!lastPricingSvg){ toast('请先计算定价'); return; }
  downloadFile('价格带图_' + ymd(new Date()) + '.svg', lastPricingSvg, 'image/svg+xml');
}

/* ---------- 填入示例 ---------- */
function demoPricing(){
  var set = function(id, v){ var e = $(id); if(e) e.value = v; };
  set('#pr_cost', '30');
  set('#pr_gm', '55');
  set('#pr_fixed', '120000');
  set('#pr_qty', '8000');
  set('#pr_rlo', '88');
  set('#pr_rhi', '168');
  set('#pr_value', '260');
  set('#pr_cap', '60');
  set('#pr_pos', 'mid');
  set('#pr_base', '128');
  set('#pr_varc', '30');
  set('#pr_disc', '80');
  renderPricing();
  toast('已填入示例：成本 30，竞品带 88–168');
}
