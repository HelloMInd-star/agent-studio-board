/* ============================================================
 * 决策推演 —— 战略矩阵回答「你在哪」，决策推演回答「会怎样」
 *
 *  ① 盈亏平衡曲线：参数 → 保本点 / 安全边际 / 经营杠杆
 *  ② 敏感性龙卷风：哪个假设错了会毁掉方案
 *  ③ BCG 迁移箭头：快照之间业务位置的真实移动
 *  ④ 决策树与期望值：敢不敢赌 → 算出来；顺带给调研预算定价
 *  ⑤ 学习曲线：累计产量翻倍，成本降到多少；多久追平对手
 *
 * 设计原则（与全产品一致）：
 *   - 只算能算的，不含糊其辞
 *   - 模型假设明确写出，不伪装成精确
 *   - 样本/数据不足时明说，不给假结论
 * ============================================================ */

/* ---------- 数据模型 ---------- */
function sim(){
  if(!state.sim) state.sim = {
    be:{ f:240000, p:39, v:13, q:9000, step:false, cap:5000 },
    tor:{ pct:10 },
    dt:{ cost:200,
         bs:[ {n:'成功',p:40,v:500}, {n:'一般',p:35,v:100}, {n:'失败',p:25,v:-200} ],
         rs:{ on:false, cost:20, imp:30 } },
    lc:{ c1:100, lr:80, n:1000, rival:70, target:0 },
    clock:{ price:3, val:3 },
    curve:{ items:[
      {n:'价格', me:3, ind:4, create:false},
      {n:'功能/性能', me:4, ind:4, create:false},
      {n:'设计/美学', me:4, ind:3, create:false},
      {n:'服务/体验', me:3, ind:3, create:false},
      {n:'渠道便利', me:3, ind:4, create:false},
      {n:'品牌情感', me:4, ind:3, create:false}
    ]},
    cpm:{ ksfs:[
      {n:'产品力', w:30, sc:{me:4, r1:3, r2:4}},
      {n:'品牌力', w:25, sc:{me:3, r1:4, r2:3}},
      {n:'渠道力', w:20, sc:{me:4, r1:4, r2:3}},
      {n:'成本效率', w:15, sc:{me:3, r1:3, r2:4}},
      {n:'服务能力', w:10, sc:{me:4, r1:3, r2:3}}
    ], names:{ me:'我方', r1:'对手 A', r2:'对手 B' }}
  };
  var S = state.sim;
  /* 旧存档兼容补齐 */
  if(!S.be) S.be = { f:240000, p:39, v:13, q:9000, step:false, cap:5000 };
  if(!S.tor) S.tor = { pct:10 };
  if(!S.dt) S.dt = { cost:200, bs:[], rs:{ on:false, cost:20, imp:30 } };
  if(!S.dt.bs || !S.dt.bs.length) S.dt.bs = [ {n:'成功',p:40,v:500}, {n:'一般',p:35,v:100}, {n:'失败',p:25,v:-200} ];
  if(!S.dt.rs) S.dt.rs = { on:false, cost:20, imp:30 };
  if(!S.lc) S.lc = { c1:100, lr:80, n:1000, rival:70, target:0 };
  if(!S.clock) S.clock = { price:3, val:3 };
  if(!S.curve || !S.curve.items || !S.curve.items.length) S.curve = { items:[
      {n:'价格', me:3, ind:4, create:false},
      {n:'功能/性能', me:4, ind:4, create:false},
      {n:'设计/美学', me:4, ind:3, create:false},
      {n:'服务/体验', me:3, ind:3, create:false},
      {n:'渠道便利', me:3, ind:4, create:false},
      {n:'品牌情感', me:4, ind:3, create:false}
    ]};
  if(!S.cpm || !S.cpm.ksfs || !S.cpm.ksfs.length) S.cpm = { ksfs:[
      {n:'产品力', w:30, sc:{me:4, r1:3, r2:4}},
      {n:'品牌力', w:25, sc:{me:3, r1:4, r2:3}},
      {n:'渠道力', w:20, sc:{me:4, r1:4, r2:3}},
      {n:'成本效率', w:15, sc:{me:3, r1:3, r2:4}},
      {n:'服务能力', w:10, sc:{me:4, r1:3, r2:3}}
    ], names:{ me:'我方', r1:'对手 A', r2:'对手 B' }};
  if(!S.cpm.names) S.cpm.names = { me:'我方', r1:'对手 A', r2:'对手 B' };
  return S;
}

/* ---------- ① 盈亏平衡 ---------- */
/* 线性模型：Q* = F / (P − V)
 * 阶梯模型：固定成本随产能台阶跃升 F(Q) = F × ceil(Q / cap)
 * 后者更接近真实（扩产要加设备/加人），但会让「保本点」变成区间而非单点 */
function calcBreakEven(){
  var S = sim(), b = S.be;
  var F = +b.f || 0, P = +b.p || 0, V = +b.v || 0, Q = +b.q || 0;
  var cm = P - V;                       // 单位贡献毛利

  if(cm <= 0){
    return { ok:false, msg:'单位贡献毛利 ≤ 0（单价不高于变动成本），此模型下永远无法保本。' };
  }

  var qStar = F / cm;                   // 保本销量
  var rStar = qStar * P;                // 保本营收
  var margin = Q > 0 ? (Q - qStar) / Q : 0;              // 安全边际
  var profit = cm * Q - F;                                // 预计利润
  var cmr = P > 0 ? cm / P : 0;                           // 贡献毛利率
  var leverage = profit !== 0 ? (cm * Q) / profit : null; // 经营杠杆率

  // 阶梯模式下，实际固定成本取决于预测销量落在第几个产能台阶
  var tiers = 1, fEff = F, qStarStep = qStar;
  if(b.step && +b.cap > 0){
    tiers = Math.ceil(Q / (+b.cap)) || 1;
    fEff = F * tiers;
    qStarStep = fEff / cm;
  }

  return {
    ok:true, F:F, P:P, V:V, Q:Q, cm:cm,
    qStar:qStar, rStar:rStar, margin:margin, profit:profit,
    cmr:cmr, leverage:leverage,
    step:!!b.step, cap:+b.cap || 0, tiers:tiers, fEff:fEff, qStarStep:qStarStep,
    warn: Q > 0 && Q < qStar
  };
}

function svgBreakEven(r){
  if(!r || !r.ok) return '<span class="ph">' + esc(r && r.msg || '填参数后生成曲线') + '</span>';

  var W = 880, H = 460, padL = 78, padR = 34, padT = 58, padB = 62;
  var pw = W - padL - padR, ph = H - padT - padB;

  var qMax = Math.max(r.Q, r.qStar, r.step ? r.qStarStep : 0) * 1.25 || 100;
  var cMax = Math.max(r.P * qMax, r.fEff + r.V * qMax) * 1.05 || 1000;

  var X = function(q){ return padL + q / qMax * pw; };
  var Y = function(c){ return padT + ph - c / cMax * ph; };

  var s = '<svg xmlns="http://www.w3.org/2000/svg" width="' + W + '" height="' + H +
          '" viewBox="0 0 ' + W + ' ' + H + '" font-family="PingFang SC,Microsoft YaHei,sans-serif">';
  s += cxFrame(W, H, '盈亏平衡分析', 'BREAK-EVEN · ' + todayStr());

  // 盈亏区着色
  var y0 = Y(0);
  s += '<rect x="' + X(r.qStar).toFixed(1) + '" y="' + padT + '" width="' +
       Math.max(0, X(qMax) - X(r.qStar)).toFixed(1) + '" height="' + (y0 - padT).toFixed(1) +
       '" fill="' + CX.s + '" fill-opacity="0.07"/>';
  s += '<rect x="' + padL + '" y="' + padT + '" width="' +
       Math.max(0, X(r.qStar) - padL).toFixed(1) + '" height="' + (y0 - padT).toFixed(1) +
       '" fill="' + CX.t + '" fill-opacity="0.06"/>';

  // 网格
  for(var i = 1; i <= 4; i++){
    var gy = padT + ph * i / 5;
    s += '<line x1="' + padL + '" y1="' + gy.toFixed(1) + '" x2="' + (padL + pw) + '" y2="' + gy.toFixed(1) +
         '" stroke="' + CX.line + '" stroke-width="1"/>';
  }

  // 收入线
  s += '<line x1="' + X(0) + '" y1="' + Y(0) + '" x2="' + X(qMax) + '" y2="' + Y(r.P * qMax) +
       '" stroke="' + CX.o + '" stroke-width="2.2"/>';
  // 成本线（线性部分）
  s += '<line x1="' + X(0) + '" y1="' + Y(r.fEff) + '" x2="' + X(qMax) + '" y2="' + Y(r.fEff + r.V * qMax) +
       '" stroke="' + CX.t + '" stroke-width="2.2"/>';

  // 阶梯成本（可选）：固定成本随产能台阶跃升
  if(r.step && r.cap > 0){
    s += '<polyline fill="none" stroke="' + CX.t + '" stroke-width="2.2" stroke-dasharray="5 3" points="';
    var pts = [];
    for(var t = 0; t <= Math.ceil(qMax / r.cap); t++){
      var q1 = t * r.cap, q2 = Math.min((t + 1) * r.cap, qMax);
      if(q1 > qMax) break;
      var ft = r.F * Math.max(1, t);
      var ft2 = r.F * (t + 1);
      pts.push(X(q1).toFixed(1) + ',' + Y(ft + r.V * q1).toFixed(1));
      pts.push(X(q2).toFixed(1) + ',' + Y(ft + r.V * q2).toFixed(1));
      if(t + 1 <= Math.ceil(qMax / r.cap)){
        pts.push(X(q2).toFixed(1) + ',' + Y(ft2 + r.V * q2).toFixed(1));
      }
    }
    s += pts.join(' ') + '"/>';
  }

  // 保本点
  var bx = X(r.step ? r.qStarStep : r.qStar), by = Y(r.P * (r.step ? r.qStarStep : r.qStar));
  s += '<line x1="' + bx.toFixed(1) + '" y1="' + by.toFixed(1) + '" x2="' + bx.toFixed(1) + '" y2="' + y0 +
       '" stroke="' + CX.ink + '" stroke-width="1" stroke-dasharray="3 3"/>';
  s += '<circle cx="' + bx.toFixed(1) + '" cy="' + by.toFixed(1) + '" r="5.5" fill="' + CX.ink + '"/>';
  s += '<text x="' + (bx + 10).toFixed(1) + '" y="' + (by - 8).toFixed(1) + '" font-size="13" font-weight="700" fill="' +
       CX.ink + '">保本 ' + Math.round(r.step ? r.qStarStep : r.qStar).toLocaleString() + ' 件</text>';

  // 预测销量位置
  if(r.Q > 0){
    var qx = X(r.Q);
    s += '<line x1="' + qx.toFixed(1) + '" y1="' + padT + '" x2="' + qx.toFixed(1) + '" y2="' + y0 +
         '" stroke="' + (r.warn ? CX.t : CX.s) + '" stroke-width="1.4" stroke-dasharray="4 3"/>';
    s += '<text x="' + (qx + 6).toFixed(1) + '" y="' + (padT + 14) + '" font-size="12" fill="' +
         (r.warn ? CX.t : CX.s) + '">预测 ' + Math.round(r.Q).toLocaleString() + '</text>';
  }

  // 轴
  s += '<line x1="' + padL + '" y1="' + y0 + '" x2="' + (padL + pw) + '" y2="' + y0 + '" stroke="' + CX.ink + '"/>';
  s += '<line x1="' + padL + '" y1="' + padT + '" x2="' + padL + '" y2="' + y0 + '" stroke="' + CX.ink + '"/>';
  s += '<text x="' + (padL + pw / 2) + '" y="' + (H - 18) + '" font-size="12" fill="' + CX.sub +
       '" text-anchor="middle">销量（件）</text>';
  s += '<text x="16" y="' + (padT + ph / 2) + '" font-size="12" fill="' + CX.sub +
       '" transform="rotate(-90 16 ' + (padT + ph / 2) + ')" text-anchor="middle">金额（元）</text>';

  // 图例
  s += '<g font-size="12">';
  s += '<line x1="' + (padL + pw - 150) + '" y1="' + (padT - 26) + '" x2="' + (padL + pw - 126) + '" y2="' +
       (padT - 26) + '" stroke="' + CX.o + '" stroke-width="2.2"/>';
  s += '<text x="' + (padL + pw - 120) + '" y="' + (padT - 22) + '" fill="' + CX.sub + '">收入</text>';
  s += '<line x1="' + (padL + pw - 80) + '" y1="' + (padT - 26) + '" x2="' + (padL + pw - 56) + '" y2="' +
       (padT - 26) + '" stroke="' + CX.t + '" stroke-width="2.2"/>';
  s += '<text x="' + (padL + pw - 50) + '" y="' + (padT - 22) + '" fill="' + CX.sub + '">总成本</text>';
  s += '</g>';

  s += '</svg>';
  return s;
}

/* ---------- ② 敏感性龙卷风 ---------- */
/* 对每个变量做 ±pct% 扰动，看保本销量 Q* 变化幅度，按跨度降序 */
function calcTornado(){
  var S = sim(), b = S.be, pct = (+S.tor.pct || 10) / 100;
  var F = +b.f || 0, P = +b.p || 0, V = +b.v || 0;
  var cm = P - V;
  if(cm <= 0) return null;

  var base = F / cm;
  var vars = [
    { k:'p', n:'单价',        lo:P * (1 - pct), hi:P * (1 + pct) },
    { k:'v', n:'单位变动成本', lo:V * (1 - pct), hi:V * (1 + pct) },
    { k:'f', n:'固定成本',     lo:F * (1 - pct), hi:F * (1 + pct) }
  ];

  var rows = vars.map(function(x){
    var qLo, qHi;
    if(x.k === 'p'){ qLo = F / (x.lo - V); qHi = F / (x.hi - V); }
    else if(x.k === 'v'){ qLo = F / (P - x.lo); qHi = F / (P - x.hi); }
    else { qLo = x.lo / cm; qHi = x.hi / cm; }
    // 保本销量上升 = 更不利
    var dLo = base ? (qLo - base) / base : 0;
    var dHi = base ? (qHi - base) / base : 0;
    return {
      k:x.k, n:x.n,
      dLo:dLo, dHi:dHi,
      span:Math.abs(dHi) + Math.abs(dLo),
      worst:Math.max(dLo, dHi)      // 最不利方向（保本点被推高）
    };
  });

  rows.sort(function(a, c){ return c.span - a.span; });
  return { base:base, pct:(+S.tor.pct || 10), rows:rows };
}

function svgTornado(t){
  if(!t) return '<span class="ph">贡献毛利 ≤ 0，无法做敏感性分析</span>';

  var W = 880, rowH = 46, padL = 130, padR = 40, padT = 58, padB = 54;
  var H = padT + t.rows.length * rowH + padB;
  var pw = W - padL - padR;
  var cx = padL + pw / 2;

  var maxSpan = t.rows.reduce(function(a, r){ return Math.max(a, r.span); }, 0.001);
  var half = pw / 2;

  var s = '<svg xmlns="http://www.w3.org/2000/svg" width="' + W + '" height="' + H +
          '" viewBox="0 0 ' + W + ' ' + H + '" font-family="PingFang SC,Microsoft YaHei,sans-serif">';
  s += cxFrame(W, H, '敏感性分析（龙卷风）', 'TORNADO · 目标：保本销量 Q* · 扰动 ±' + t.pct + '%');

  // 中轴
  s += '<line x1="' + cx + '" y1="' + (padT - 6) + '" x2="' + cx + '" y2="' + (H - padB + 6) +
       '" stroke="' + CX.ink + '" stroke-width="1"/>';
  s += '<text x="' + cx + '" y="' + (padT - 14) + '" font-size="11" fill="' + CX.mute +
       '" text-anchor="middle">基准 ' + Math.round(t.base).toLocaleString() + ' 件</text>';

  t.rows.forEach(function(r, i){
    var y = padT + i * rowH;
    var wLo = Math.abs(r.dLo) / maxSpan * half;
    var wHi = Math.abs(r.dHi) / maxSpan * half;
    var top = r === t.rows[0];

    // 左（变量降 → 保本点变化）
    s += '<rect x="' + (cx - wLo).toFixed(1) + '" y="' + (y + 6) + '" width="' + wLo.toFixed(1) +
         '" height="26" fill="' + CX.o + '" fill-opacity="' + (top ? 0.85 : 0.45) + '"/>';
    // 右（变量升 → 保本点变化）
    s += '<rect x="' + cx + '" y="' + (y + 6) + '" width="' + wHi.toFixed(1) +
         '" height="26" fill="' + CX.t + '" fill-opacity="' + (top ? 0.85 : 0.45) + '"/>';

    s += '<text x="' + (padL - 12) + '" y="' + (y + 24) + '" font-size="13" fill="' + CX.ink +
         '" text-anchor="end" font-weight="' + (top ? 700 : 400) + '">' + esc(r.n) + '</text>';

    // 数值标注（取幅度更大的一侧）
    var showLo = Math.abs(r.dLo) >= Math.abs(r.dHi);
    var lbl = (showLo ? (r.dLo >= 0 ? '+' : '') + (r.dLo * 100).toFixed(1)
                      : (r.dHi >= 0 ? '+' : '') + (r.dHi * 100).toFixed(1)) + '%';
    var lx = showLo ? (cx - wLo - 8) : (cx + wHi + 8);
    s += '<text x="' + lx.toFixed(1) + '" y="' + (y + 24) + '" font-size="12" fill="' + CX.sub +
         '" text-anchor="' + (showLo ? 'end' : 'start') + '">' + lbl + '</text>';
  });

  s += '<text x="' + padL + '" y="' + (H - 20) + '" font-size="11" fill="' + CX.mute +
       '">横条越长 = 该变量对保本点影响越大。最上面一条是你最该去验证的假设。</text>';
  s += '</svg>';
  return s;
}

/* ---------- ③ BCG 迁移箭头 ---------- */
function svgBcgTrack(){
  var mx = state.mx;
  var snaps = (mx && mx.snaps) ? mx.snaps.slice().sort(function(a, c){
    return String(a.date || '').localeCompare(String(c.date || ''));
  }) : [];

  if(snaps.length < 2){
    return '<span class="ph">至少保存 2 个战略快照（在「策略模板 → BCG → 保存快照」），这里会画出业务位置的迁移路径</span>';
  }

  var W = 880, H = 520, padL = 76, padR = 40, padT = 56, padB = 66;
  var pw = W - padL - padR, ph = H - padT - padB;

  // 汇总所有快照中的业务，取坐标范围
  var all = [];
  snaps.forEach(function(sn){
    (sn.bcg || []).forEach(function(r){
      if(r && r.n) all.push({ n:String(r.n).trim(), growth:+r.growth || 0, share:+r.share || 0, d:sn.date });
    });
  });
  if(!all.length) return '<span class="ph">快照里没有 BCG 业务数据</span>';

  var gMax = Math.max.apply(null, all.map(function(a){ return a.growth; }).concat([10])) * 1.15;
  var gMin = Math.min.apply(null, all.map(function(a){ return a.growth; }).concat([0]));
  if(gMax === gMin) gMax = gMin + 10;
  var mMax = Math.max.apply(null, all.map(function(a){ return a.share; }).concat([1.5])) * 1.15;

  var X = function(v){ return padL + Math.max(0, Math.min(mMax, v)) / mMax * pw; };
  var Y = function(v){ return padT + ph - (Math.max(gMin, Math.min(gMax, v)) - gMin) / (gMax - gMin) * ph; };

  var s = '<svg xmlns="http://www.w3.org/2000/svg" width="' + W + '" height="' + H +
          '" viewBox="0 0 ' + W + ' ' + H + '" font-family="PingFang SC,Microsoft YaHei,sans-serif">';
  s += cxFrame(W, H, 'BCG 迁移轨迹', 'MOVEMENT · ' + snaps.length + ' 个快照 · ' + todayStr());

  // 象限参考（用最后一个快照的模式，默认 ratio 阈值 1）
  var last = snaps[snaps.length - 1];
  var mTh = (last.bcgMode === 'pct') ? 50 : 1;
  var gs = all.map(function(a){ return a.growth; }).sort(function(a, b){ return a - b; });
  var gTh = gs[Math.floor(gs.length / 2)] || 10;

  s += '<line x1="' + X(mTh).toFixed(1) + '" y1="' + padT + '" x2="' + X(mTh).toFixed(1) + '" y2="' + (padT + ph) +
       '" stroke="' + CX.line + '" stroke-width="1" stroke-dasharray="4 4"/>';
  s += '<line x1="' + padL + '" y1="' + Y(gTh).toFixed(1) + '" x2="' + (padL + pw) + '" y2="' + Y(gTh).toFixed(1) +
       '" stroke="' + CX.line + '" stroke-width="1" stroke-dasharray="4 4"/>';

  // 按业务名分组，画路径
  var byName = {};
  all.forEach(function(a){
    if(!byName[a.n]) byName[a.n] = [];
    byName[a.n].push(a);
  });

  var colors = [CX.o, CX.s, CX.w, CX.t, CX.brand];
  var ci = 0, legend = [];
  Object.keys(byName).forEach(function(n){
    var pts = byName[n].sort(function(a, c){ return String(a.d).localeCompare(String(c.d)); });
    if(pts.length < 2) return;
    var col = colors[ci % colors.length]; ci++;

    for(var i = 1; i < pts.length; i++){
      var a = pts[i - 1], b2 = pts[i];
      var x1 = X(a.share), y1 = Y(a.growth), x2 = X(b2.share), y2 = Y(b2.growth);
      var dx = x2 - x1, dy = y2 - y1;
      var len = Math.sqrt(dx * dx + dy * dy) || 1;
      var ux = dx / len, uy = dy / len;
      var ex = x2 - ux * 9, ey = y2 - uy * 9;

      s += '<line x1="' + x1.toFixed(1) + '" y1="' + y1.toFixed(1) + '" x2="' + ex.toFixed(1) + '" y2="' + ey.toFixed(1) +
           '" stroke="' + col + '" stroke-width="2"/>';
      // 箭头
      s += '<polygon points="' + x2.toFixed(1) + ',' + y2.toFixed(1) + ' ' +
           (ex - uy * 4).toFixed(1) + ',' + (ey + ux * 4).toFixed(1) + ' ' +
           (ex + uy * 4).toFixed(1) + ',' + (ey - ux * 4).toFixed(1) + '" fill="' + col + '"/>';
    }

    pts.forEach(function(p, idx){
      var x = X(p.share), y = Y(p.growth);
      s += '<circle cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="' + (idx === pts.length - 1 ? 6 : 4) +
           '" fill="' + (idx === pts.length - 1 ? col : CX.paper) + '" stroke="' + col + '" stroke-width="2"/>';
      if(idx === pts.length - 1){
        s += '<text x="' + (x + 10).toFixed(1) + '" y="' + (y + 4).toFixed(1) + '" font-size="12" fill="' +
             CX.ink + '" font-weight="600">' + esc(n) + '</text>';
      }
    });

    // 判定方向
    var f0 = pts[0], f1 = pts[pts.length - 1];
    var better = (f1.share - f0.share), betterG = (f1.growth - f0.growth);
    var verdict = '持平';
    if(better > 0.02 && betterG > 0.02) verdict = '进入更优';
    else if(better < -0.02 && betterG < -0.02) verdict = '恶化';
    else if(better > 0.02) verdict = '份额提升';
    else if(betterG > 0.02) verdict = '增长提速';
    legend.push({ n:n, c:col, v:verdict });
  });

  // 轴
  s += '<line x1="' + padL + '" y1="' + (padT + ph) + '" x2="' + (padL + pw) + '" y2="' + (padT + ph) +
       '" stroke="' + CX.ink + '"/>';
  s += '<line x1="' + padL + '" y1="' + padT + '" x2="' + padL + '" y2="' + (padT + ph) + '" stroke="' + CX.ink + '"/>';
  s += '<text x="' + (padL + pw / 2) + '" y="' + (H - 18) + '" font-size="12" fill="' + CX.sub +
       '" text-anchor="middle">相对份额 →</text>';
  s += '<text x="16" y="' + (padT + ph / 2) + '" font-size="12" fill="' + CX.sub +
       '" transform="rotate(-90 16 ' + (padT + ph / 2) + ')" text-anchor="middle">市场增长率 →</text>';

  // 图例
  var ly = padT + 2;
  legend.forEach(function(l){
    s += '<circle cx="' + (padL + pw - 12) + '" cy="' + (ly + 6) + '" r="4.5" fill="' + l.c + '"/>';
    s += '<text x="' + (padL + pw - 22) + '" y="' + (ly + 10) + '" font-size="11" fill="' + CX.sub +
         '" text-anchor="end">' + esc(l.n) + ' · ' + l.v + '</text>';
    ly += 18;
  });

  s += '</svg>';
  return s;
}

/* ---------- ④ 决策树与期望值 ---------- */
/* EV = Σ pᵢ × vᵢ ；净 EV = EV − 投入
 * 信息价值(VOI)：先花一笔调研费，把最好结果的把握提高，看净收益是否划算。
 * 注意：概率是主观估计——这一点不掩饰。工具做的是「把你估的数变成可见后果」，不是预测。 */
function calcDecisionTree(){
  var S = sim(), d = S.dt;
  var cost = +d.cost || 0;
  var bs = (d.bs || []).filter(function(x){ return x && String(x.n || '').trim(); })
            .map(function(x){ return { n:String(x.n).trim(), p:+x.p || 0, v:+x.v || 0 }; });
  if(bs.length < 2) return { ok:false, msg:'至少需要 2 个结果分支（例如 成功 / 一般 / 失败）。' };

  var sumP = bs.reduce(function(a, x){ return a + x.p; }, 0);
  if(sumP <= 0) return { ok:false, msg:'概率之和为 0，请填写各分支概率。' };

  var needNorm = Math.abs(sumP - 100) > 0.01;
  var k = needNorm ? 100 / sumP : 1;
  bs.forEach(function(x){ x.pr = Math.max(0, Math.min(100, x.p * k)) / 100; });

  /* 归一化后再拉平一次，避免浮点误差导致概率和不为 1 */
  var s2 = bs.reduce(function(a, x){ return a + x.pr; }, 0);
  if(s2 > 0) bs.forEach(function(x){ x.pr = x.pr / s2; });

  var ev = bs.reduce(function(a, x){ return a + x.pr * x.v; }, 0);
  var net = ev - cost;

  var best = bs[0], worst = bs[0];
  bs.forEach(function(x){
    if(x.v > best.v) best = x;
    if(x.v < worst.v) worst = x;
  });

  /* 下行风险：只看亏损分支 */
  var down = bs.filter(function(x){ return x.v < 0; });
  var downP = down.reduce(function(a, x){ return a + x.pr; }, 0);
  var downEV = down.reduce(function(a, x){ return a + x.pr * x.v; }, 0);

  var res = {
    ok:true, cost:cost, bs:bs, sumP:sumP, needNorm:needNorm,
    ev:ev, net:net, best:best, worst:worst,
    downP:downP, downEV:downEV,
    go: net > 0,
    voi:null
  };

  /* 信息价值：把收益最高分支的概率提高 imp 个百分点，其余按比例缩减 */
  var rs = d.rs || {};
  if(rs.on){
    var rc = +rs.cost || 0, imp = +rs.imp || 0;
    var bi = 0;
    bs.forEach(function(x, i){ if(x.v > bs[bi].v) bi = i; });
    var tgt = bs[bi];
    var np = Math.max(0, Math.min(1, tgt.pr + imp / 100));
    var rest = 1 - np, base = 1 - tgt.pr;
    var ev2 = np * tgt.v;
    bs.forEach(function(x, i){
      if(i === bi) return;
      ev2 += (base > 0 ? x.pr / base * rest : 0) * x.v;
    });
    res.voi = {
      cost:rc, imp:imp, target:tgt.n,
      p0:tgt.pr, p1:np,
      ev0:ev, ev1:ev2,
      net0:net, net1:ev2 - cost - rc,
      gain:ev2 - ev,
      worth:(ev2 - ev) - rc
    };
  }
  return res;
}

function svgDecisionTree(r){
  if(!r || !r.ok) return '<span class="ph">' + esc(r && r.msg || '填参数后生成决策树') + '</span>';

  var W = 880, padL = 30, padR = 220, padT = 58, padB = 52;
  var rowH = 62, n = r.bs.length;
  var H = padT + n * rowH + padB;
  var x0 = padL + 34;                    // 决策方块中心
  var x1 = W - padR - 40;                // 分支末端
  var cy = padT + (n * rowH) / 2;

  var s = '<svg xmlns="http://www.w3.org/2000/svg" width="' + W + '" height="' + H +
          '" viewBox="0 0 ' + W + ' ' + H + '" font-family="PingFang SC,Microsoft YaHei,sans-serif">';
  s += cxFrame(W, H, '决策树与期望值', 'DECISION TREE · EV ' + r.ev.toFixed(1) +
               ' · 净 ' + (r.net >= 0 ? '+' : '') + r.net.toFixed(1) + (r.needNorm ? '（概率已归一化）' : ''));

  r.bs.forEach(function(b, i){
    var y = padT + i * rowH + rowH / 2;
    /* 分支线 */
    s += '<path d="M ' + x0 + ' ' + cy + ' C ' + (x0 + 70) + ' ' + cy + ' ' + (x1 - 70) + ' ' + y + ' ' + x1 + ' ' + y +
         '" fill="none" stroke="' + (b.v < 0 ? CX.t : CX.o) + '" stroke-width="' +
         (b.pr >= 0.4 ? 2.4 : 1.6) + '"/>';
    /* 概率标签 */
    s += '<text x="' + ((x0 + x1) / 2).toFixed(1) + '" y="' + (y - 12) + '" font-size="12" fill="' + CX.sub +
         '" text-anchor="middle">' + (b.pr * 100).toFixed(1) + '%</text>';
    /* 末端节点 */
    s += '<circle cx="' + x1 + '" cy="' + y + '" r="5" fill="' + (b.v < 0 ? CX.t : CX.o) + '"/>';
    /* 结果说明 */
    s += '<text x="' + (x1 + 14) + '" y="' + (y - 3) + '" font-size="13" font-weight="600" fill="' + CX.ink + '">' +
         esc(b.n) + '</text>';
    s += '<text x="' + (x1 + 14) + '" y="' + (y + 15) + '" font-size="12" fill="' + (b.v < 0 ? CX.t : CX.s) + '">' +
         (b.v >= 0 ? '+' : '') + b.v + ' 万元</text>';
  });

  /* 决策方块 */
  s += '<rect x="' + (x0 - 34) + '" y="' + (cy - 22) + '" width="68" height="44" rx="6" fill="' +
       CX.paper + '" stroke="' + CX.ink + '" stroke-width="1.6"/>';
  s += '<text x="' + x0 + '" y="' + (cy - 3) + '" font-size="12" font-weight="700" fill="' + CX.ink +
       '" text-anchor="middle">投入</text>';
  s += '<text x="' + x0 + '" y="' + (cy + 14) + '" font-size="12" fill="' + CX.sub +
       '" text-anchor="middle">' + r.cost + ' 万</text>';

  /* 底部结论 */
  var verdict = r.go ? '净期望为正' : '净期望为负';
  var vcol = r.go ? CX.s : CX.t;
  s += '<line x1="' + padL + '" y1="' + (H - padB + 6) + '" x2="' + (W - padL) + '" y2="' + (H - padB + 6) +
       '" stroke="' + CX.line + '"/>';
  s += '<text x="' + padL + '" y="' + (H - padB + 28) + '" font-size="12" fill="' + CX.sub + '">EV = ' +
       r.ev.toFixed(1) + ' 万 · 净 EV = </text>';
  s += '<text x="' + (padL + 168) + '" y="' + (H - padB + 28) + '" font-size="12" font-weight="700" fill="' + vcol + '">' +
       (r.net >= 0 ? '+' : '') + r.net.toFixed(1) + ' 万（' + verdict + '）</text>';

  return s + '</svg>';
}

/* ---------- ⑤ 学习曲线 ---------- */
/* C(n) = C₁ × n^b ， b = log₂(学习率)  → 产量每翻一倍，单位成本降到学习率
 * 反解：达到目标成本所需累计产量 n = (目标 / C₁)^(1/b)
 * b < 0（学习率 < 100%），所以 n 随目标降低而指数上升 —— 这正是「追平对手」的代价 */
function calcLearning(){
  var S = sim(), l = S.lc;
  var c1 = +l.c1 || 0;
  var lr = +l.lr || 0;
  var n = Math.max(1, +l.n || 1);
  var rival = +l.rival || 0;
  var target = +l.target || 0;

  if(c1 <= 0) return { ok:false, msg:'请填写首件单位成本。' };
  if(lr <= 0 || lr >= 100) return { ok:false, msg:'学习率必须在 0–100% 之间（现实常见区间 70%–95%）。' };

  var b = Math.log(lr / 100) / Math.log(2);        // 负数
  var cn = c1 * Math.pow(n, b);
  var c2n = c1 * Math.pow(n * 2, b);

  var nTarget = (target > 0 && target < c1) ? Math.pow(target / c1, 1 / b) : null;
  var nRival  = (rival  > 0 && rival  < c1) ? Math.pow(rival  / c1, 1 / b) : null;

  var gap = (rival > 0 && cn > 0) ? (cn - rival) / rival : null;
  var needMore = (nRival !== null) ? Math.max(0, nRival - n) : null;

  var hint = '';
  if(lr < 70) hint = '学习率低于 70% 属极端情况（几乎只有强规模效应的半导体/面板出现过），请确认。';
  else if(lr > 95) hint = '学习率高于 95% 意味着几乎无法通过量产降低成本——软件与定制服务常在此区间。';

  return {
    ok:true, c1:c1, lr:lr, n:n, rival:rival, target:target, b:b,
    cn:cn, c2n:c2n, nTarget:nTarget, nRival:nRival,
    gap:gap, needMore:needMore, hint:hint,
    ahead: gap === null ? null : (gap <= 0)
  };
}

function svgLearning(r){
  if(!r || !r.ok) return '<span class="ph">' + esc(r && r.msg || '填参数后生成学习曲线') + '</span>';

  var W = 880, H = 460, padL = 84, padR = 34, padT = 58, padB = 66;
  var pw = W - padL - padR, ph = H - padT - padB;

  /* X 用对数刻度：学习曲线在双对数下是直线，线性刻度下前段会挤成一团 */
  var nMin = 1;
  var nMax = Math.max(r.n * 4, r.nRival || 0, r.nTarget || 0, 100) * 1.6;
  var lx = function(v){ return Math.log(Math.max(nMin, v)) / Math.log(nMax) ; };

  var cMax = r.c1 * 1.1;
  var cMin = Math.min(r.cn, r.rival > 0 ? r.rival : r.cn, r.target > 0 ? r.target : r.cn) * 0.85;

  var X = function(v){ return padL + lx(v) * pw; };
  var Y = function(c){ return padT + ph - (c - cMin) / (cMax - cMin) * ph; };

  var s = '<svg xmlns="http://www.w3.org/2000/svg" width="' + W + '" height="' + H +
          '" viewBox="0 0 ' + W + ' ' + H + '" font-family="PingFang SC,Microsoft YaHei,sans-serif">';
  s += cxFrame(W, H, '学习曲线（经验曲线）', 'LEARNING CURVE · 学习率 ' + r.lr +
               '% · 累计产量翻倍 → 单位成本降至 ' + r.lr + '%');

  /* 网格 */
  for(var i = 1; i <= 4; i++){
    var gy = padT + ph * i / 5;
    s += '<line x1="' + padL + '" y1="' + gy.toFixed(1) + '" x2="' + (padL + pw) + '" y2="' + gy.toFixed(1) +
         '" stroke="' + CX.line + '" stroke-width="1"/>';
  }

  /* 曲线 */
  var pts = [];
  for(var t = 0; t <= 120; t++){
    var nn = Math.pow(nMax, t / 120);
    pts.push(X(nn).toFixed(1) + ',' + Y(r.c1 * Math.pow(nn, r.b)).toFixed(1));
  }
  s += '<polyline fill="none" stroke="' + CX.brand + '" stroke-width="2.4" points="' + pts.join(' ') + '"/>';

  /* 对手成本线 */
  if(r.rival > 0){
    s += '<line x1="' + padL + '" y1="' + Y(r.rival).toFixed(1) + '" x2="' + (padL + pw) + '" y2="' + Y(r.rival).toFixed(1) +
         '" stroke="' + CX.t + '" stroke-width="1.8" stroke-dasharray="6 4"/>';
    s += '<text x="' + (padL + 8) + '" y="' + (Y(r.rival) - 7).toFixed(1) + '" font-size="12" fill="' + CX.t +
         '">对手 ' + r.rival.toFixed(1) + '</text>';
  }
  /* 目标成本线 */
  if(r.target > 0){
    s += '<line x1="' + padL + '" y1="' + Y(r.target).toFixed(1) + '" x2="' + (padL + pw) + '" y2="' + Y(r.target).toFixed(1) +
         '" stroke="' + CX.s + '" stroke-width="1.6" stroke-dasharray="3 3"/>';
    s += '<text x="' + (padL + 8) + '" y="' + (Y(r.target) - 7).toFixed(1) + '" font-size="12" fill="' + CX.s +
         '">目标 ' + r.target.toFixed(1) + '</text>';
  }

  /* 当前位置 */
  var cx0 = X(r.n), cy0 = Y(r.cn);
  s += '<line x1="' + cx0.toFixed(1) + '" y1="' + cy0.toFixed(1) + '" x2="' + cx0.toFixed(1) + '" y2="' + (padT + ph) +
       '" stroke="' + CX.ink + '" stroke-width="1" stroke-dasharray="3 3"/>';
  s += '<circle cx="' + cx0.toFixed(1) + '" cy="' + cy0.toFixed(1) + '" r="6" fill="' + CX.brand + '"/>';
  s += '<text x="' + (cx0 + 10).toFixed(1) + '" y="' + (cy0 - 8).toFixed(1) + '" font-size="12" font-weight="700" fill="' +
       CX.brand + '">当前 ' + Math.round(r.n).toLocaleString() + ' 件 · ' + r.cn.toFixed(1) + '</text>';

  /* 追平点 */
  if(r.nRival !== null && r.nRival <= nMax){
    var rx = X(r.nRival), ry = Y(r.rival);
    s += '<circle cx="' + rx.toFixed(1) + '" cy="' + ry.toFixed(1) + '" r="5" fill="none" stroke="' + CX.t +
         '" stroke-width="2"/>';
    s += '<text x="' + (rx + 8).toFixed(1) + '" y="' + (ry + 16).toFixed(1) + '" font-size="11" fill="' + CX.t +
         '">追平需 ' + Math.round(r.nRival).toLocaleString() + ' 件</text>';
  }

  /* 轴 */
  s += '<line x1="' + padL + '" y1="' + (padT + ph) + '" x2="' + (padL + pw) + '" y2="' + (padT + ph) +
       '" stroke="' + CX.ink + '"/>';
  s += '<line x1="' + padL + '" y1="' + padT + '" x2="' + padL + '" y2="' + (padT + ph) + '" stroke="' + CX.ink + '"/>';
  [1, 10, 100, 1000, 10000, 100000, 1000000].forEach(function(v){
    if(v > nMax) return;
    var x = X(v);
    s += '<text x="' + x.toFixed(1) + '" y="' + (padT + ph + 18) + '" font-size="11" fill="' + CX.mute +
         '" text-anchor="middle">' + (v >= 10000 ? (v / 10000) + '万' : v) + '</text>';
  });
  s += '<text x="' + (padL + pw / 2) + '" y="' + (H - 18) + '" font-size="12" fill="' + CX.sub +
       '" text-anchor="middle">累计产量（对数刻度）</text>';
  s += '<text x="16" y="' + (padT + ph / 2) + '" font-size="12" fill="' + CX.sub +
       '" transform="rotate(-90 16 ' + (padT + ph / 2) + ')" text-anchor="middle">单位成本</text>';

  s += '<text x="' + padL + '" y="' + (H - 36) + '" font-size="11" fill="' + CX.mute +
       '">横轴为对数刻度：每向右一格代表产量 ×10。曲线越陡，规模效应越强。</text>';

  return s + '</svg>';
}

/* ---------- 渲染 ---------- */
function renderSimAll(){
  var S = sim(), b = S.be;
  var setv = function(id, v){ var e = $(id); if(e) e.value = v; };
  setv('#simF', b.f); setv('#simP', b.p); setv('#simV', b.v); setv('#simQ', b.q);
  setv('#simCap', b.cap);
  var st = $('#simStep'); if(st) st.checked = !!b.step;
  var tp = $('#simPct'); if(tp) tp.value = S.tor.pct;

  var ck = $('#ckPrice'), cv = $('#ckVal');
  if(ck) ck.value = S.clock.price;
  if(cv) cv.value = S.clock.val;
  var nm = S.cpm.names || {};
  var n1 = $('#cpmMe'), n2 = $('#cpmR1'), n3 = $('#cpmR2');
  if(n1) n1.value = nm.me || '我方';
  if(n2) n2.value = nm.r1 || '对手 A';
  if(n3) n3.value = nm.r2 || '对手 B';

  renderSimBe();
  renderSimTor();
  renderSimTrack();
  renderSimDt();
  renderSimLc();
  renderSimClock();
  renderSimCurve();
  renderSimCpm();
}

function renderSimBe(){
  var r = calcBreakEven();
  var out = $('#simBeOut');
  if(!r.ok){
    if(out) out.innerHTML = '<div class="warnbox">⚠ ' + esc(r.msg) + '</div>';
    var c0 = $('#simBeChart'); if(c0) c0.innerHTML = '<span class="ph">—</span>';
    return;
  }
  if(out){
    var h = '<div class="kvlist">';
    h += '<div class="kv"><span>保本销量</span><b>' + Math.round(r.qStar).toLocaleString() + ' 件</b></div>';
    h += '<div class="kv"><span>保本营收</span><b>¥' + Math.round(r.rStar).toLocaleString() + '</b></div>';
    h += '<div class="kv"><span>安全边际</span><b class="' + (r.margin < 0 ? 'bad' : (r.margin < 0.15 ? 'warn' : 'good')) +
         '">' + (r.margin * 100).toFixed(1) + '%</b></div>';
    h += '<div class="kv"><span>预计利润</span><b class="' + (r.profit < 0 ? 'bad' : 'good') + '">¥' +
         Math.round(r.profit).toLocaleString() + '</b></div>';
    h += '<div class="kv"><span>贡献毛利率</span><b>' + (r.cmr * 100).toFixed(1) + '%</b></div>';
    h += '<div class="kv"><span>经营杠杆率</span><b>' +
         (r.leverage === null ? '—' : r.leverage.toFixed(2)) + '</b></div>';
    h += '</div>';

    if(r.step){
      h += '<div class="note">阶梯模式：预测销量落在第 <b>' + r.tiers + '</b> 个产能台阶，' +
           '实际固定成本 ¥' + Math.round(r.fEff).toLocaleString() +
           '，保本点升至 <b>' + Math.round(r.qStarStep).toLocaleString() + '</b> 件。</div>';
    }
    if(r.warn){
      h += '<div class="warnbox">⚠ 预测销量低于保本点，此方案在当前参数下会亏损。</div>';
    }
    if(r.leverage !== null && Math.abs(r.leverage) > 3){
      h += '<div class="note">经营杠杆率 ' + r.leverage.toFixed(2) +
           '：销量每波动 10%，利润约波动 ' + Math.abs(r.leverage * 10).toFixed(0) + '%。高杠杆意味着高弹性，也意味着高风险。</div>';
    }
    out.innerHTML = h;
  }
  var c = $('#simBeChart'); if(c) c.innerHTML = svgBreakEven(r);
}

function renderSimTor(){
  var t = calcTornado();
  var out = $('#simTorOut');
  if(!t){
    if(out) out.innerHTML = '<div class="warnbox">⚠ 单位贡献毛利 ≤ 0，无法做敏感性分析。</div>';
    var c0 = $('#simTorChart'); if(c0) c0.innerHTML = '<span class="ph">—</span>';
    return;
  }
  if(out){
    var h = '<div class="note">对三个变量各做 ±' + t.pct + '% 扰动，看<b>保本销量</b>被推动多少。' +
            '最上面一条是最该先去验证的假设——它错了，整个方案的结论就变了。</div>';
    h += '<div class="kvlist">';
    t.rows.forEach(function(r, i){
      h += '<div class="kv"><span>' + (i === 0 ? '🔴 最敏感 · ' : '') + esc(r.n) + '</span><b>跨度 ' +
           (r.span * 100).toFixed(1) + '%</b></div>';
    });
    h += '</div>';
    out.innerHTML = h;
  }
  var c = $('#simTorChart'); if(c) c.innerHTML = svgTornado(t);
}

function renderSimTrack(){
  var c = $('#simTrackChart');
  if(c) c.innerHTML = svgBcgTrack();
}


/* ---------- ④ 渲染：决策树 ---------- */
function dtRowsHtml(){
  var S = sim(), d = S.dt;
  var h = '<div class="dtgrid">';
  h += '<div class="dtgrid__hd"><span>结果</span><span>概率 %</span><span>收益（万元）</span><span></span></div>';
  (d.bs || []).forEach(function(b, i){
    h += '<div class="dtgrid__row">';
    h += '<input class="inp" data-dt="n" data-i="' + i + '" value="' + esc(b.n) + '" placeholder="结果名称">';
    h += '<input class="inp" type="number" step="1" data-dt="p" data-i="' + i + '" value="' + (+b.p || 0) + '">';
    h += '<input class="inp" type="number" step="1" data-dt="v" data-i="' + i + '" value="' + (+b.v || 0) + '" placeholder="可为负">';
    h += '<button class="btn btn--mini" data-dtdel="' + i + '">删除</button>';
    h += '</div>';
  });
  h += '</div>';
  return h;
}

function renderSimDt(){
  var S = sim(), d = S.dt;
  var setv = function(id, v){ var e = $(id); if(e) e.value = v; };
  setv('#dtCost', d.cost);
  var rs = d.rs || {};
  setv('#dtRsCost', rs.cost); setv('#dtRsImp', rs.imp);
  var rsw = $('#dtRsOn'); if(rsw) rsw.checked = !!rs.on;

  var box = $('#dtRows');
  if(box){
    box.innerHTML = dtRowsHtml();
    box.querySelectorAll('[data-dt]').forEach(function(el){
      el.addEventListener('input', dtOnInput);
    });
    box.querySelectorAll('[data-dtdel]').forEach(function(el){
      el.addEventListener('click', function(){
        var i = +el.getAttribute('data-dtdel');
        sim().dt.bs.splice(i, 1);
        save(); renderSimDt();
      });
    });
  }

  var r = calcDecisionTree();
  var out = $('#dtOut'), ch = $('#dtChart');
  if(!r.ok){
    if(out) out.innerHTML = '<div class="warnbox">⚠ ' + esc(r.msg) + '</div>';
    if(ch) ch.innerHTML = '<span class="ph">—</span>';
    return;
  }

  if(out){
    var h = '';
    if(r.needNorm){
      h += '<div class="note">概率之和为 <b>' + r.sumP.toFixed(0) + '%</b>，已自动归一化为 100%。' +
           '（如果你的原始估计是有意为之，请检查是否漏填或重复计算。）</div>';
    }
    h += '<div class="kvlist">';
    h += '<div class="kv"><span>期望值 EV</span><b>' + r.ev.toFixed(1) + ' 万元</b></div>';
    h += '<div class="kv"><span>投入成本</span><b>' + r.cost + ' 万元</b></div>';
    h += '<div class="kv"><span>净期望值</span><b class="' + (r.net > 0 ? 'good' : 'bad') + '">' +
         (r.net >= 0 ? '+' : '') + r.net.toFixed(1) + ' 万元</b></div>';
    h += '<div class="kv"><span>下行概率</span><b>' + (r.downP * 100).toFixed(1) + '%</b></div>';
    h += '<div class="kv"><span>下行期望损失</span><b class="' + (r.downEV < 0 ? 'bad' : '') + '">' +
         r.downEV.toFixed(1) + ' 万元</b></div>';
    h += '</div>';

    h += '<div class="' + (r.go ? 'okbox' : 'warnbox') + '">' +
         (r.go ? '✅ 净期望为正：在<b>你给定的这组概率</b>下，这个赌注值得下。'
               : '⚠ 净期望为负：<b>按你填的概率</b>，这笔投入不划算。') +
         '</div>';

    if(r.downP > 0.2){
      h += '<div class="note">有 <b>' + (r.downP * 100).toFixed(0) +
           '%</b> 的概率落在亏损分支。净期望为正<b>不等于</b>可以承受一次失败——' +
           '如果这笔钱亏不起，就该选更小的投入档位，而不是看 EV 决定。</div>';
    }

    if(r.voi){
      var v = r.voi;
      h += '<div class="note" style="margin-top:10px"><b>信息价值（VOI）</b>：先花 <b>' + v.cost +
           ' 万元</b>做调研，把「' + esc(v.target) + '」的概率从 <b>' + (v.p0 * 100).toFixed(0) +
           '%</b> 提到 <b>' + (v.p1 * 100).toFixed(0) + '%</b>。<br>' +
           'EV 由 ' + v.ev0.toFixed(1) + ' → ' + v.ev1.toFixed(1) + ' 万元（+' + v.gain.toFixed(1) + '），' +
           '扣掉调研费后净收益 ' + (v.worth >= 0 ? '+' : '') + v.worth.toFixed(1) + ' 万元 → ' +
           '<b class="' + (v.worth > 0 ? 'good' : 'bad') + '">' +
           (v.worth > 0 ? '这笔调研值得做' : '这笔调研不值') + '</b>。</div>';
      h += '<div class="note">这就是<b>调研预算的定价依据</b>：不是"要不要做调研"，而是"花多少调研费换多少把握"。</div>';
    }
    out.innerHTML = h;
  }
  if(ch) ch.innerHTML = svgDecisionTree(r);
}

/* ---------- ⑤ 渲染：学习曲线 ---------- */
function renderSimLc(){
  var S = sim(), l = S.lc;
  var setv = function(id, v){ var e = $(id); if(e) e.value = v; };
  setv('#lcC1', l.c1); setv('#lcLr', l.lr); setv('#lcN', l.n);
  setv('#lcRival', l.rival); setv('#lcTarget', l.target);

  var r = calcLearning();
  var out = $('#lcOut'), ch = $('#lcChart');
  if(!r.ok){
    if(out) out.innerHTML = '<div class="warnbox">⚠ ' + esc(r.msg) + '</div>';
    if(ch) ch.innerHTML = '<span class="ph">—</span>';
    return;
  }

  if(out){
    var h = '<div class="kvlist">';
    h += '<div class="kv"><span>当前单位成本</span><b>' + r.cn.toFixed(2) + '</b></div>';
    h += '<div class="kv"><span>产量翻倍后</span><b>' + r.c2n.toFixed(2) +
         '（降至 ' + (r.c2n / r.cn * 100).toFixed(1) + '%）</b></div>';
    if(r.rival > 0){
      h += '<div class="kv"><span>与对手差距</span><b class="' + (r.gap <= 0 ? 'good' : 'bad') + '">' +
           (r.gap >= 0 ? '高 ' : '低 ') + Math.abs(r.gap * 100).toFixed(1) + '%</b></div>';
    }
    if(r.nRival !== null){
      h += '<div class="kv"><span>追平对手需累计</span><b>' + Math.round(r.nRival).toLocaleString() + ' 件</b></div>';
      if(r.needMore > 0){
        h += '<div class="kv"><span>还需再生产</span><b class="bad">' + Math.round(r.needMore).toLocaleString() +
             ' 件</b></div>';
      }
    }
    if(r.nTarget !== null){
      h += '<div class="kv"><span>达到目标成本需累计</span><b>' + Math.round(r.nTarget).toLocaleString() + ' 件</b></div>';
    }
    h += '</div>';

    if(r.gap !== null && r.gap > 0){
      h += '<div class="warnbox">⚠ 你比对手成本高 <b>' + (r.gap * 100).toFixed(0) +
           '%</b>。打价格战前先算清楚：需要再生产 <b>' + Math.round(Math.max(0, r.needMore)).toLocaleString() +
           '</b> 件才能追平——这段时间你撑得住吗？</div>';
    } else if(r.gap !== null){
      h += '<div class="okbox">✅ 你的单位成本已低于对手，价格战对你有利。</div>';
    }
    if(r.hint) h += '<div class="note">💡 ' + esc(r.hint) + '</div>';
    h += '<div class="note">模型边界：学习曲线假设<b>成本下降只由累计产量驱动</b>，' +
         '忽略了技术突变、原材料价格波动、工艺换代。它回答"按当前效率继续下去会怎样"，不是预测。</div>';
    out.innerHTML = h;
  }
  if(ch) ch.innerHTML = svgLearning(r);
}

/* ---------- 交互 ---------- */
function simOnInput(){
  var S = sim();
  var g = function(id){ var e = $(id); return e ? e.value : ''; };
  S.be.f = +g('#simF') || 0;
  S.be.p = +g('#simP') || 0;
  S.be.v = +g('#simV') || 0;
  S.be.q = +g('#simQ') || 0;
  S.be.cap = +g('#simCap') || 0;
  var st = $('#simStep'); S.be.step = st ? !!st.checked : false;
  var tp = $('#simPct'); S.tor.pct = +g('#simPct') || 10;
  save();
  renderSimBe();
  renderSimTor();
}

function simExport(){
  var r = calcBreakEven(), t = calcTornado();
  var md = '# 决策推演报告\n\n生成日期：' + todayStr() + '\n\n';
  md += '## 一、盈亏平衡\n\n';
  if(r.ok){
    md += '- 固定成本：¥' + r.F.toLocaleString() + '\n';
    md += '- 单价：¥' + r.P + ' / 单位变动成本：¥' + r.V + '\n';
    md += '- 单位贡献毛利：¥' + r.cm.toFixed(2) + '（贡献毛利率 ' + (r.cmr * 100).toFixed(1) + '%）\n';
    md += '- **保本销量：' + Math.round(r.qStar).toLocaleString() + ' 件**（保本营收 ¥' + Math.round(r.rStar).toLocaleString() + '）\n';
    md += '- 预测销量：' + Math.round(r.Q).toLocaleString() + ' 件\n';
    md += '- 安全边际：' + (r.margin * 100).toFixed(1) + '%\n';
    md += '- 预计利润：¥' + Math.round(r.profit).toLocaleString() + '\n';
    md += '- 经营杠杆率：' + (r.leverage === null ? '—' : r.leverage.toFixed(2)) + '\n';
    if(r.step) md += '- 阶梯模式：第 ' + r.tiers + ' 个产能台阶，保本点 ' + Math.round(r.qStarStep).toLocaleString() + ' 件\n';
    if(r.warn) md += '\n> ⚠ 预测销量低于保本点，当前参数下会亏损。\n';
  } else {
    md += r.msg + '\n';
  }
  md += '\n## 二、敏感性分析\n\n';
  if(t){
    md += '扰动幅度 ±' + t.pct + '%，目标变量：保本销量（基准 ' + Math.round(t.base).toLocaleString() + ' 件）\n\n';
    md += '| 变量 | 降低 ' + t.pct + '% | 提高 ' + t.pct + '% | 影响跨度 |\n|---|---|---|---|\n';
    t.rows.forEach(function(x){
      md += '| ' + x.n + ' | ' + (x.dLo * 100).toFixed(1) + '% | ' + (x.dHi * 100).toFixed(1) + '% | ' +
             (x.span * 100).toFixed(1) + '% |\n';
    });
    md += '\n最敏感变量：**' + t.rows[0].n + '**——优先验证它。\n';
  }
  md += '\n## 三、决策树与期望值\n\n';
  var dt = calcDecisionTree();
  if(dt.ok){
    md += '- 投入成本：' + dt.cost + ' 万元\n';
    if(dt.needNorm) md += '- 原始概率之和 ' + dt.sumP.toFixed(0) + '%，已归一化为 100%\n';
    md += '\n| 结果 | 概率 | 收益（万元） |\n|---|---|---|\n';
    dt.bs.forEach(function(x){
      md += '| ' + x.n + ' | ' + (x.pr * 100).toFixed(1) + '% | ' + x.v + ' |\n';
    });
    md += '\n- **期望值 EV：' + dt.ev.toFixed(1) + ' 万元**\n';
    md += '- **净期望值：' + (dt.net >= 0 ? '+' : '') + dt.net.toFixed(1) + ' 万元** → ' +
          (dt.go ? '值得投入' : '不划算') + '\n';
    md += '- 下行概率：' + (dt.downP * 100).toFixed(1) + '%，下行期望损失 ' + dt.downEV.toFixed(1) + ' 万元\n';
    if(dt.voi){
      var v = dt.voi;
      md += '\n**信息价值（VOI）**：先花 ' + v.cost + ' 万元调研，把「' + v.target + '」的概率从 ' +
            (v.p0 * 100).toFixed(0) + '% 提到 ' + (v.p1 * 100).toFixed(0) + '%。\n';
      md += 'EV 由 ' + v.ev0.toFixed(1) + ' → ' + v.ev1.toFixed(1) + ' 万元，扣除调研费后净收益 ' +
            (v.worth >= 0 ? '+' : '') + v.worth.toFixed(1) + ' 万元 → ' +
            (v.worth > 0 ? '这笔调研值得做' : '这笔调研不值') + '。\n';
    }
    md += '\n> 概率为你自行估计的主观值。本报告不预测未来，只呈现这组假设的后果。\n';
  } else {
    md += dt.msg + '\n';
  }

  md += '\n## 四、学习曲线\n\n';
  var lc = calcLearning();
  if(lc.ok){
    md += '- 首件单位成本：' + lc.c1 + ' · 学习率：' + lc.lr + '%\n';
    md += '- 当前累计产量：' + Math.round(lc.n).toLocaleString() + ' 件 → 单位成本 ' + lc.cn.toFixed(2) + '\n';
    md += '- 产量翻倍后：' + lc.c2n.toFixed(2) + '（降至 ' + (lc.c2n / lc.cn * 100).toFixed(1) + '%）\n';
    if(lc.rival > 0){
      md += '- 与对手差距：' + (lc.gap >= 0 ? '高 ' : '低 ') + Math.abs(lc.gap * 100).toFixed(1) + '%\n';
      if(lc.nRival !== null){
        md += '- **追平对手需累计 ' + Math.round(lc.nRival).toLocaleString() + ' 件**' +
              (lc.needMore > 0 ? '，还需再生产 ' + Math.round(lc.needMore).toLocaleString() + ' 件' : '') + '\n';
      }
    }
    if(lc.nTarget !== null) md += '- 达到目标成本需累计 ' + Math.round(lc.nTarget).toLocaleString() + ' 件\n';
    if(lc.hint) md += '\n> ' + lc.hint + '\n';
  } else {
    md += lc.msg + '\n';
  }

  md += '\n## 五、战略钟定位\n\n';
  var ck = calcStratClock();
  if(ck.ok){
    md += '- 价格水平：' + ck.price + ' / 5 · 感知价值：' + ck.val + ' / 5\n';
    md += '- **落点：位置 ' + ck.pos + ' · ' + ck.posName + '**\n';
    md += '- 判读：' + ck.posDesc + '\n';
    if(ck.basePrice != null){
      md += '- 与「' + ck.cat + '」品类基准（' + ck.basePrice.toFixed(1) + '）偏离 ' +
            (ck.dev >= 0 ? '+' : '') + ck.dev.toFixed(1) + '\n';
    }
    (ck.warns || []).forEach(function(w){
      md += '\n> **' + w.t + '**：' + w.d + '\n';
    });
  } else {
    md += ck.msg + '\n';
  }

  md += '\n## 六、价值曲线\n\n';
  var vc = calcValueCurve();
  if(vc.ok){
    md += '**差异度：' + vc.diff.toFixed(2) + ' / 5**\n\n';
    md += '| 竞争要素 | 我方 | 行业均值 | 偏离 |\n|---|---|---|---|\n';
    vc.rows.forEach(function(x){
      md += '| ' + x.n + (x.create ? '（创造）' : '') + ' | ' + x.me + ' | ' + x.ind + ' | ' +
            (x.d > 0 ? '+' : '') + x.d + ' |\n';
    });
    md += '\n**判读**：' + vc.verdict + '\n\n';
    md += '**蓝海四问**\n\n';
    md += '- 剔除：' + (vc.eliminate.length ? vc.eliminate.map(function(x){ return x.n; }).join('、') : '未识别') + '\n';
    md += '- 减少：' + (vc.reduce.length ? vc.reduce.map(function(x){ return x.n; }).join('、') : '未识别') + '\n';
    md += '- 提升：' + (vc.raise.length ? vc.raise.map(function(x){ return x.n; }).join('、') : '无') + '\n';
    md += '- 创造：' + (vc.create.length ? vc.create.map(function(x){ return x.n; }).join('、') : '未标记') + '\n';
  } else {
    md += vc.msg + '\n';
  }

  md += '\n## 七、竞争态势矩阵（CPM）\n\n';
  var cpm = calcCpm();
  if(cpm.ok){
    md += '- 我方加权总分：**' + cpm.meTotal.toFixed(2) + ' / 5**（第 ' + cpm.myRank + ' 位 / 共 ' + cpm.rank.length + ' 家）\n';
    md += '- 领先者：' + cpm.lead.name + '（' + cpm.lead.total.toFixed(2) + '）\n\n';
    md += '| 关键成功因素 | 权重 | ' + cpm.names.me + ' | ' + cpm.names.r1 + ' | ' + cpm.names.r2 + ' |\n|---|---|---|---|---|\n';
    cpm.rows.forEach(function(x){
      md += '| ' + x.n + ' | ' + (x.w * 100).toFixed(0) + '% | ' + x.sc.me + ' | ' + x.sc.r1 + ' | ' + x.sc.r2 + ' |\n';
    });
    if(cpm.gaps.length){
      md += '\n**短板（按加权影响排序）**\n\n';
      cpm.gaps.slice(0, 4).forEach(function(g){
        md += '- ' + g.n + '：我方 ' + g.me + '，最优 ' + g.best + '（差 ' + g.gap.toFixed(0) + '）\n';
      });
    }
    md += '\n> 权重已归一化（原始合计 ' + cpm.wSum.toFixed(0) + '）。打分为主观评估，价值在于把分歧摊开，不在于精确。\n';
  } else {
    md += cpm.msg + '\n';
  }

  md += '\n## 八、模型假设与边界\n\n';
  md += '- 收入与变动成本按线性处理；真实场景可能存在规模效应或阶梯成本（已提供阶梯开关）。\n';
  md += '- 敏感性分析仅测试单变量扰动，未考虑变量之间的联动（如降价可能同时推高销量）。\n';
  md += '- 决策树的概率为主观估计；净期望为正不等于可以承受一次失败。\n';
  md += '- 学习曲线假设成本下降只由累计产量驱动，忽略技术突变与原材料波动。\n';
  md += '- 战略钟的价格与感知价值为主观打分；与品类基准的偏离只提示张力，不判定对错。\n';
  md += '- 价值曲线的「行业均值」由你估计；差异度衡量的是曲线形状，不等于竞争力本身。\n';
  md += '- CPM 的关键成功因素与打分均为主观设定，结论强度取决于这些因素是否真的决定成败。\n';
  md += '- 所有数字取决于你填入的估算值，**本报告不预测未来，只呈现假设的后果**。\n';

  downloadFile('决策推演报告_' + todayStr() + '.md', md, 'text/markdown');
  toast('已导出决策推演报告');
}

function dtOnInput(){
  var S = sim(), d = S.dt;
  var g = function(id){ var e = $(id); return e ? e.value : ''; };
  d.cost = +g('#dtCost') || 0;
  var rows = document.querySelectorAll('#dtRows [data-dt]');
  rows.forEach(function(el){
    var i = +el.getAttribute('data-i'), k = el.getAttribute('data-dt');
    if(!d.bs[i]) d.bs[i] = { n:'', p:0, v:0 };
    d.bs[i][k] = (k === 'n') ? el.value : (+el.value || 0);
  });
  var rs = d.rs || (d.rs = {});
  rs.cost = +g('#dtRsCost') || 0;
  rs.imp = +g('#dtRsImp') || 0;
  var sw = $('#dtRsOn'); rs.on = sw ? !!sw.checked : false;
  save();
  renderSimDt();
}

function dtAddBranch(){
  var d = sim().dt;
  if(d.bs.length >= 5){ toast('最多 5 个结果分支'); return; }
  d.bs.push({ n:'新结果', p:0, v:0 });
  save(); renderSimDt();
}

function lcOnInput(){
  var l = sim().lc;
  var g = function(id){ var e = $(id); return e ? e.value : ''; };
  l.c1 = +g('#lcC1') || 0;
  l.lr = +g('#lcLr') || 0;
  l.n = +g('#lcN') || 1;
  l.rival = +g('#lcRival') || 0;
  l.target = +g('#lcTarget') || 0;
  save();
  renderSimLc();
}

/* ---------- 注册到全局（供 HTML 内联调用） ---------- */
window.renderSimAll = renderSimAll;
window.simOnInput = simOnInput;
window.simExport = simExport;
window.dtOnInput = dtOnInput;
window.dtAddBranch = dtAddBranch;
window.lcOnInput = lcOnInput;
window.calcDecisionTree = calcDecisionTree;
window.calcLearning = calcLearning;
window.calcBreakEven = calcBreakEven;
window.calcTornado = calcTornado;

/* ============================================================
 * 第三批：定位与对比
 *  ⑥ 战略钟（Bowman）：价格 × 感知价值 → 8 个位置，并做自洽性检查
 *  ⑦ 价值曲线：你 vs 行业均值，算差异度 + 蓝海四问
 *  ⑧ CPM 竞争态势矩阵：关键成功因素加权打分 → 综合分与短板
 * ============================================================ */

/* ---------- ⑥ 战略钟 ---------- */
/* Bowman 战略钟 8 个位置。角度用数学角（0=右，逆时针为正），
 * 顺时针依次为 混合→差异化→集中差异化→提价标准品→高价低值→标准价低值→无虚饰→低价 */
var SIM_CLOCK = [
  { k:3, n:'混合（超值）',       deg:-45, lv:'ok',   d:'低价 + 高感知价值。以性价比抢份额，需要成本结构支撑。' },
  { k:4, n:'差异化',             deg:0,   lv:'ok',   d:'中高价格 + 高感知价值。靠可感知的差异点支撑溢价。' },
  { k:5, n:'集中差异化',         deg:45,  lv:'ok',   d:'高价格 + 高感知价值。窄人群深耕，需要强品牌资产托底。' },
  { k:6, n:'提价 / 标准品',      deg:90,  lv:'warn', d:'价格高于价值。除非有垄断或转换成本，否则份额会流失。' },
  { k:7, n:'高价低值（自杀区）', deg:135, lv:'bad',  d:'卖得贵又没东西。这条路上没有幸存者。' },
  { k:8, n:'标准价低值',         deg:180, lv:'bad',  d:'按行业价卖，却给得比同行少。用户会慢慢走掉。' },
  { k:1, n:'无虚饰（极简低价）', deg:225, lv:'ok',   d:'低价 + 低附加值。可行，但只在对价格极度敏感的细分市场。' },
  { k:2, n:'低价战略',           deg:270, lv:'ok',   d:'低价 + 中等价值。靠规模和效率赚钱，不是靠差异化。' }
];

/* 价格 / 感知价值（均 1-5）→ 战略钟位置 */
function simClockPos(price, val){
  var p = +price, v = +val;
  if(p <= 2.5 && v <= 2.5) return 1;   /* 无虚饰 */
  if(p <= 2.5 && v <  3.5) return 2;   /* 低价 */
  if(p <= 2.5)             return 3;   /* 低价高值 → 混合/超值 */
  if(p <= 3.5 && v >= 3.5) return 3;   /* 混合 */
  if(p <= 3.5 && v >  2.5) return 4;   /* 中价中高值 → 差异化（弱） */
  if(p <= 3.5)             return 8;   /* 标准价低值 */
  if(v >= 3.5)             return (p >= 4.5 ? 5 : 4);  /* 差异化 / 集中差异化 */
  if(v >  2.5)             return 6;   /* 提价标准品 */
  return 7;                            /* 高价低值 */
}

/* 自洽性检查：把落点与品牌内核的品类基准对照
 * 工具不替你判断对错，只提示「这里存在张力」并说明依据 */
function calcStratClock(){
  var S = sim(), c = S.clock;
  var price = +c.price || 0, val = +c.val || 0;
  if(!price || !val) return { ok:false, msg:'请填写价格水平与感知价值（1-5）。' };

  var posK = simClockPos(price, val);
  var pos = null;
  SIM_CLOCK.forEach(function(x){ if(x.k === posK) pos = x; });

  var r = { ok:true, price:price, val:val, pos:posK, posName:pos.n, posDesc:pos.d, lv:pos.lv, warns:[] };

  /* 接品牌内核：品类价格基准 vs 你的落点 */
  var cat = null, catName = '';
  if(state.bc && state.bc.cat){
    if(typeof BC_CATS !== 'undefined'){
      BC_CATS.forEach(function(x){ if(x.k === state.bc.cat){ cat = x; catName = x.n; } });
    }
  }
  if(cat){
    r.cat = catName;
    var bp = (cat.base && cat.base.price != null) ? cat.base.price : null;
    if(bp != null){
      r.basePrice = bp;
      var d = price - bp;
      r.dev = d;
      /* 偏离 ≥ 1.5 视为明显张力；方向不同，风险也不同 */
      if(Math.abs(d) >= 1.5){
        r.warns.push({
          lv: d < 0 ? 'warn' : 'warn',
          t:'与「' + catName + '」的价格基准存在张力',
          d:'该品类基准价位约 ' + bp.toFixed(1) + '，你的落点是 ' + price.toFixed(1) +
            '（' + (d < 0 ? '低' : '高') + ' ' + Math.abs(d).toFixed(1) + '）。' +
            (d < 0 ? '低于品类基准通常要靠模式创新（如取消中间环节）支撑，否则会被解读为"便宜没好货"。'
                   : '高于品类基准需要极强的品牌资产或独占资源支撑，否则份额会掉。')
        });
      }
    }
    /* 品类禁忌提示：高价/低价策略常踩的坑 */
    if(cat.taboo && cat.taboo.length){
      r.taboo = cat.taboo.slice(0, 3);
    }
  }

  /* 危险区硬提示 */
  if(pos.lv === 'bad'){
    r.warns.unshift({ lv:'bad', t:'落在「' + pos.n + '」', d:pos.d + ' 这是战略钟里两个已知会失效的位置——不是"很难"，是"没有幸存者"。' });
  } else if(pos.lv === 'warn'){
    r.warns.unshift({ lv:'warn', t:'落在「' + pos.n + '」', d:pos.d });
  }
  return r;
}

function svgStratClock(r){
  if(!r || !r.ok) return '<span class="ph">' + esc(r && r.msg || '填参数后生成战略钟') + '</span>';
  var W = 620, H = 520, cx = W/2, cy = H/2 - 6, R = 168;
  var h = '<svg viewBox="0 0 ' + W + ' ' + H + '" class="chartsvg" role="img" aria-label="战略钟">';
  h += '<defs>';
  ['ok:#0f9d58','warn:#e8a33d','bad:#d64545'].forEach(function(x){
    h += '<marker id="ck_' + x.split(':')[0] + '" markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto"><circle cx="4" cy="4" r="3" fill="' + x.split(':')[1] + '"/></marker>';
  });
  h += '</defs>';

  /* 钟面环 + 象限底纹 */
  h += '<circle cx="' + cx + '" cy="' + cy + '" r="' + R + '" fill="none" stroke="var(--line)" stroke-width="1.5"/>';
  h += '<circle cx="' + cx + '" cy="' + cy + '" r="' + (R*0.55) + '" fill="none" stroke="var(--line)" stroke-width="1" stroke-dasharray="3 4"/>';
  h += '<line x1="' + (cx-R) + '" y1="' + cy + '" x2="' + (cx+R) + '" y2="' + cy + '" stroke="var(--line)" stroke-width="1"/>';
  h += '<line x1="' + cx + '" y1="' + (cy-R) + '" x2="' + cx + '" y2="' + (cy+R) + '" stroke="var(--line)" stroke-width="1"/>';
  h += '<text x="' + (cx+R+10) + '" y="' + (cy+4) + '" font-size="11" fill="var(--soft)">感知价值 →</text>';
  h += '<text x="' + cx + '" y="' + (cy-R-10) + '" font-size="11" fill="var(--soft)" text-anchor="middle">价格 ↑</text>';

  /* 8 个位置 */
  var cur = null;
  SIM_CLOCK.forEach(function(p){
    var a = p.deg * Math.PI / 180;
    var x = cx + Math.cos(a) * R, y = cy - Math.sin(a) * R;
    var isCur = (p.k === r.pos);
    if(isCur) cur = { x:x, y:y, p:p };
    h += '<circle cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="' + (isCur ? 13 : 7) + '" fill="' +
         (isCur ? 'var(--brand)' : 'var(--card)') + '" stroke="' +
         (isCur ? 'var(--brand)' : 'var(--line-strong)') + '" stroke-width="' + (isCur ? 2.5 : 1.5) + '"/>';
    h += '<text x="' + x.toFixed(1) + '" y="' + (y+4).toFixed(1) + '" font-size="11" font-weight="' +
         (isCur ? 700 : 500) + '" fill="' + (isCur ? '#fff' : 'var(--fg)') + '" text-anchor="middle">' + p.k + '</text>';
    /* 标签外推 */
    var lx = cx + Math.cos(a) * (R + 34), ly = cy - Math.sin(a) * (R + 34);
    var anc = (Math.cos(a) > 0.3 ? 'start' : (Math.cos(a) < -0.3 ? 'end' : 'middle'));
    h += '<text x="' + lx.toFixed(1) + '" y="' + (ly+4).toFixed(1) + '" font-size="11" fill="var(--fg)" text-anchor="' + anc + '">' + esc(p.n) + '</text>';
  });

  /* 当前落点：按 price/val 映射到钟面内部 */
  var px = cx + ((r.val - 3) / 2) * (R * 0.88);
  var py = cy - ((r.price - 3) / 2) * (R * 0.88);
  h += '<line x1="' + cx + '" y1="' + cy + '" x2="' + px.toFixed(1) + '" y2="' + py.toFixed(1) +
       '" stroke="var(--brand)" stroke-width="1.5" stroke-dasharray="4 3"/>';
  h += '<circle cx="' + px.toFixed(1) + '" cy="' + py.toFixed(1) + '" r="6" fill="var(--brand)" stroke="#fff" stroke-width="2"/>';

  h += '<text x="' + cx + '" y="' + (H-14) + '" font-size="12" fill="var(--soft)" text-anchor="middle">' +
       '当前落点：位置 ' + r.pos + ' · ' + esc(r.posName) + '（价格 ' + r.price + ' / 价值 ' + r.val + '）</text>';
  h += '</svg>';
  return h;
}

/* ---------- ⑦ 价值曲线 ---------- */
/* 蓝海战略的核心工具。重点不是画图，是回答四问：
 *   剔除 / 减少 / 提升 / 创造
 * 差异度过低 = 你跟行业长一样 = 红海里的价格战 */
function calcValueCurve(){
  var S = sim(), items = (S.curve && S.curve.items) ? S.curve.items : [];
  var valid = items.filter(function(x){ return x && x.n; });
  if(valid.length < 2) return { ok:false, msg:'至少需要 2 个竞争要素才能画曲线。' };

  var rows = valid.map(function(x){
    var me = Math.max(0, Math.min(5, +x.me || 0));
    var ind = Math.max(0, Math.min(5, +x.ind || 0));
    return { n:x.n, me:me, ind:ind, d:me - ind, create:!!x.create };
  });

  /* 差异度：平均绝对偏离（0-5）。低于 0.6 视为与行业雷同 */
  var sum = 0;
  rows.forEach(function(r){ sum += Math.abs(r.d); });
  var diff = sum / rows.length;

  /* 蓝海四问：四项互斥——已标记为「创造」的不再重复计入「提升」，
   * 否则同一要素会同时出现在两栏，读起来像数错了 */
  var create    = rows.filter(function(r){ return r.create; });
  var eliminate = rows.filter(function(r){ return !r.create && r.d <= -1.5; });
  var reduce    = rows.filter(function(r){ return !r.create && r.d <= -0.5 && r.d > -1.5; });
  var raise     = rows.filter(function(r){ return !r.create && r.d >= 1.0; });

  var verdict, lv;
  if(diff < 0.4){ verdict = '你的曲线与行业几乎重合——客户看不出选你的理由，只剩价格可比。'; lv = 'bad'; }
  else if(diff < 0.8){ verdict = '差异偏弱。有区别，但还没到能支撑溢价的程度。'; lv = 'warn'; }
  else if(diff < 1.5){ verdict = '差异清晰。你有明确的取舍，客户能说出"为什么选你"。'; lv = 'ok'; }
  else { verdict = '差异极大。要么你真的重构了价值，要么你放弃了行业公认的必备项——请核对「剔除/减少」里有没有错删刚需。'; lv = 'warn'; }

  /* 一致性：是否有"提升"项（没有提升只有削减 = 单纯降配，不是战略） */
  if(raise.length === 0 && diff >= 0.8){
    verdict += ' ⚠ 但你没有任何「远高于行业」的要素——只削减不强化，那是降配不是差异化。';
    if(lv === 'ok') lv = 'warn';
  }

  return {
    ok:true, rows:rows, diff:diff, verdict:verdict, lv:lv,
    eliminate:eliminate, reduce:reduce, raise:raise, create:create
  };
}

function svgValueCurve(r){
  if(!r || !r.ok) return '<span class="ph">' + esc(r && r.msg || '填要素后生成价值曲线') + '</span>';
  var n = r.rows.length;
  var W = 880, H = 420, padL = 92, padR = 150, padT = 46, padB = 58;
  var pw = W - padL - padR, ph = H - padT - padB;
  var stepX = n > 1 ? pw / (n - 1) : 0;
  var Y = function(v){ return padT + ph - (v / 5) * ph; };

  var h = '<svg viewBox="0 0 ' + W + ' ' + H + '" class="chartsvg" role="img" aria-label="价值曲线">';
  /* 网格 */
  for(var v = 0; v <= 5; v++){
    var y = Y(v);
    h += '<line x1="' + padL + '" y1="' + y.toFixed(1) + '" x2="' + (padL+pw) + '" y2="' + y.toFixed(1) +
         '" stroke="var(--line)" stroke-width="1"' + (v === 0 ? '' : ' stroke-dasharray="3 4"') + '/>';
    h += '<text x="' + (padL-10) + '" y="' + (y+4).toFixed(1) + '" font-size="11" fill="var(--soft)" text-anchor="end">' + v + '</text>';
  }
  /* 两条折线 */
  var ptsMe = '', ptsInd = '';
  r.rows.forEach(function(x, i){
    var px = padL + i * stepX;
    ptsMe  += (i ? ' ' : '') + px.toFixed(1) + ',' + Y(x.me).toFixed(1);
    ptsInd += (i ? ' ' : '') + px.toFixed(1) + ',' + Y(x.ind).toFixed(1);
  });
  h += '<polyline points="' + ptsInd + '" fill="none" stroke="var(--soft)" stroke-width="2" stroke-dasharray="6 4"/>';
  h += '<polyline points="' + ptsMe + '" fill="none" stroke="var(--brand)" stroke-width="2.5"/>';
  /* 点 + 要素名 */
  r.rows.forEach(function(x, i){
    var px = padL + i * stepX;
    h += '<circle cx="' + px.toFixed(1) + '" cy="' + Y(x.ind).toFixed(1) + '" r="3.5" fill="var(--soft)"/>';
    h += '<circle cx="' + px.toFixed(1) + '" cy="' + Y(x.me).toFixed(1) + '" r="5" fill="var(--brand)"/>';
    h += '<text x="' + px.toFixed(1) + '" y="' + (H-30) + '" font-size="11.5" fill="var(--fg)" text-anchor="middle">' + esc(x.n) + '</text>';
    if(x.create){
      h += '<text x="' + px.toFixed(1) + '" y="' + (H-14) + '" font-size="10.5" fill="#0f9d58" text-anchor="middle">＋ 创造</text>';
    }
  });
  /* 图例 */
  var lx = padL + pw + 18;
  h += '<line x1="' + lx + '" y1="' + (padT+14) + '" x2="' + (lx+22) + '" y2="' + (padT+14) + '" stroke="var(--brand)" stroke-width="2.5"/>';
  h += '<text x="' + (lx+28) + '" y="' + (padT+18) + '" font-size="11.5" fill="var(--fg)">我方</text>';
  h += '<line x1="' + lx + '" y1="' + (padT+36) + '" x2="' + (lx+22) + '" y2="' + (padT+36) + '" stroke="var(--soft)" stroke-width="2" stroke-dasharray="6 4"/>';
  h += '<text x="' + (lx+28) + '" y="' + (padT+40) + '" font-size="11.5" fill="var(--fg)">行业均值</text>';
  h += '<text x="' + lx + '" y="' + (padT+70) + '" font-size="11.5" fill="var(--soft)">差异度</text>';
  h += '<text x="' + lx + '" y="' + (padT+90) + '" font-size="19" font-weight="700" fill="var(--brand)">' + r.diff.toFixed(2) + '</text>';
  h += '</svg>';
  return h;
}

/* ---------- ⑧ CPM 竞争态势矩阵 ---------- */
/* 关键成功因素 × 权重 × 各家打分 → 加权总分。
 * 权重会归一化，所以你不必凑够 100 */
function calcCpm(){
  var S = sim(), c = S.cpm || {};
  var ksfs = (c.ksfs || []).filter(function(x){ return x && x.n; });
  var names = c.names || { me:'我方', r1:'对手 A', r2:'对手 B' };
  var keys = ['me','r1','r2'];
  if(ksfs.length < 2) return { ok:false, msg:'至少需要 2 个关键成功因素。' };

  var wSum = 0;
  ksfs.forEach(function(k){ wSum += Math.max(0, +k.w || 0); });
  if(wSum <= 0) return { ok:false, msg:'权重之和必须大于 0。' };

  var totals = { me:0, r1:0, r2:0 };
  var rows = ksfs.map(function(k){
    var w = Math.max(0, +k.w || 0) / wSum;      /* 归一化权重 */
    var sc = {};
    keys.forEach(function(key){
      var v = (k.sc && k.sc[key] != null) ? Math.max(0, Math.min(5, +k.sc[key])) : 0;
      sc[key] = v;
      totals[key] += w * v;
    });
    return { n:k.n, w:w, wRaw:+k.w || 0, sc:sc };
  });

  /* 排名 */
  var rank = keys.map(function(key){
    return { key:key, name:names[key] || key, total:totals[key] };
  }).sort(function(a, b){ return b.total - a.total; });

  /* 我方短板：落后于最高分的要素 */
  var gaps = rows.map(function(r){
    var best = 0;
    keys.forEach(function(k){ if(r.sc[k] > best) best = r.sc[k]; });
    return { n:r.n, me:r.sc.me, best:best, gap:r.sc.me - best, w:r.w };
  }).filter(function(g){ return g.gap < 0; })
    .sort(function(a, b){ return (a.gap * a.w) - (b.gap * b.w); });

  var myRank = 1;
  rank.forEach(function(x, i){ if(x.key === 'me') myRank = i + 1; });

  return {
    ok:true, rows:rows, totals:totals, rank:rank, gaps:gaps,
    names:names, myRank:myRank, wSum:wSum,
    lead: rank[0], meTotal: totals.me
  };
}

function svgCpm(r){
  if(!r || !r.ok) return '<span class="ph">' + esc(r && r.msg || '填 KSF 后生成对比') + '</span>';
  var W = 880, H = 120 + r.rank.length * 54, padL = 96, padR = 60, padT = 34;
  var pw = W - padL - padR;
  var maxT = 5;
  var h = '<svg viewBox="0 0 ' + W + ' ' + H + '" class="chartsvg" role="img" aria-label="CPM 竞争态势矩阵">';
  r.rank.forEach(function(x, i){
    var y = padT + i * 54;
    var w = (x.total / maxT) * pw;
    var isMe = (x.key === 'me');
    h += '<text x="' + (padL-12) + '" y="' + (y+20) + '" font-size="12.5" fill="var(--fg)" text-anchor="end" font-weight="' +
         (isMe ? 700 : 400) + '">' + esc(x.name) + '</text>';
    h += '<rect x="' + padL + '" y="' + y + '" width="' + pw + '" height="30" rx="6" fill="var(--soft-bg)"/>';
    h += '<rect x="' + padL + '" y="' + y + '" width="' + Math.max(2, w).toFixed(1) + '" height="30" rx="6" fill="' +
         (isMe ? 'var(--brand)' : 'var(--soft)') + '"/>';
    h += '<text x="' + (padL + Math.max(2, w) + 10).toFixed(1) + '" y="' + (y+20) + '" font-size="13" font-weight="700" fill="var(--fg)">' +
         x.total.toFixed(2) + '</text>';
  });
  h += '<text x="' + padL + '" y="' + (H-12) + '" font-size="11" fill="var(--soft)">满分 5.00 · 权重已归一化（原权重合计 ' +
       r.wSum.toFixed(0) + '）</text>';
  h += '</svg>';
  return h;
}

/* ---------- ⑥ 渲染：战略钟 ---------- */
function renderSimClock(){
  var r = calcStratClock();
  var out = $('#simClockOut');
  if(!r.ok){
    if(out) out.innerHTML = '<span class="ph">' + esc(r.msg) + '</span>';
    var c0 = $('#simClockChart'); if(c0) c0.innerHTML = '<span class="ph">—</span>';
    return;
  }
  if(out){
    var h = '<div class="kvlist">';
    h += '<div class="kv"><span>落点位置</span><b class="' + (r.lv === 'bad' ? 'bad' : (r.lv === 'warn' ? 'warn' : 'good')) +
         '">位置 ' + r.pos + ' · ' + esc(r.posName) + '</b></div>';
    h += '<div class="kv"><span>价格水平 / 感知价值</span><b>' + r.price.toFixed(1) + ' / ' + r.val.toFixed(1) + '</b></div>';
    if(r.basePrice != null){
      h += '<div class="kv"><span>' + esc(r.cat) + ' 品类基准价位</span><b>' + r.basePrice.toFixed(1) +
           '（偏离 ' + (r.dev >= 0 ? '+' : '') + r.dev.toFixed(1) + '）</b></div>';
    }
    h += '</div>';

    h += '<div class="' + (r.lv === 'bad' ? 'warnbox' : 'note') + '">' + esc(r.posDesc) + '</div>';

    (r.warns || []).forEach(function(w){
      h += '<div class="' + (w.lv === 'bad' ? 'warnbox' : 'note') + '"><b>' + esc(w.t) + '</b><br>' + esc(w.d) + '</div>';
    });

    if(r.taboo && r.taboo.length){
      h += '<div class="note"><b>「' + esc(r.cat) + '」的品类禁忌（来自品牌内核）</b><br>' +
           r.taboo.map(function(t){ return '· ' + esc(t); }).join('<br>') + '</div>';
    }
    if(!r.cat){
      h += '<div class="note">未检测到品牌内核数据。填过「🏛️ 品牌内核」后，这里会把你的落点与品类基准做自洽性检查。</div>';
    }
    out.innerHTML = h;
  }
  var c = $('#simClockChart'); if(c) c.innerHTML = svgStratClock(r);
}

function clockOnInput(){
  var S = sim();
  var p = $('#ckPrice'), v = $('#ckVal');
  if(p) S.clock.price = Math.max(1, Math.min(5, +p.value || 3));
  if(v) S.clock.val   = Math.max(1, Math.min(5, +v.value || 3));
  save();
  renderSimClock();
}

/* ---------- ⑦ 渲染：价值曲线 ---------- */
function vcRowsHtml(){
  var S = sim(), items = S.curve.items || [];
  var h = '<div class="vcgrid">';
  h += '<div class="vcgrid__hd"><span>竞争要素</span><span>我方（0-5）</span><span>行业均值（0-5）</span><span>行业从未提供</span><span></span></div>';
  items.forEach(function(x, i){
    h += '<div class="vcgrid__row">';
    h += '<input class="inp" data-vc="n" data-i="' + i + '" value="' + esc(x.n) + '" placeholder="例：售后服务">';
    h += '<input class="inp" type="number" step="1" min="0" max="5" data-vc="me" data-i="' + i + '" value="' + (+x.me || 0) + '">';
    h += '<input class="inp" type="number" step="1" min="0" max="5" data-vc="ind" data-i="' + i + '" value="' + (+x.ind || 0) + '">';
    h += '<label style="display:flex;align-items:center;justify-content:center"><input type="checkbox" data-vc="create" data-i="' + i + '"' + (x.create ? ' checked' : '') + '></label>';
    h += '<button class="btn btn--mini" data-vcdel="' + i + '">删除</button>';
    h += '</div>';
  });
  h += '</div>';
  return h;
}

function renderSimCurve(){
  var S = sim();
  var box = $('#vcRows');
  if(box){
    box.innerHTML = vcRowsHtml();
    box.querySelectorAll('[data-vc]').forEach(function(el){
      el.addEventListener(el.type === 'checkbox' ? 'change' : 'input', vcOnInput);
    });
    box.querySelectorAll('[data-vcdel]').forEach(function(el){
      el.addEventListener('click', function(){ vcDelItem(+el.getAttribute('data-vcdel')); });
    });
  }
  var r = calcValueCurve();
  var out = $('#simCurveOut');
  if(!r.ok){
    if(out) out.innerHTML = '<span class="ph">' + esc(r.msg) + '</span>';
    var c0 = $('#simCurveChart'); if(c0) c0.innerHTML = '<span class="ph">—</span>';
    return;
  }
  if(out){
    var h = '<div class="kvlist">';
    h += '<div class="kv"><span>差异度</span><b class="' + (r.lv === 'bad' ? 'bad' : (r.lv === 'warn' ? 'warn' : 'good')) +
         '">' + r.diff.toFixed(2) + ' / 5</b></div>';
    h += '<div class="kv"><span>远高于行业</span><b>' + r.raise.length + ' 项</b></div>';
    h += '<div class="kv"><span>远低于行业</span><b>' + r.eliminate.length + ' 项</b></div>';
    h += '</div>';
    h += '<div class="' + (r.lv === 'bad' ? 'warnbox' : 'note') + '"><b>判读</b><br>' + esc(r.verdict) + '</div>';

    /* 蓝海四问 */
    var q = '';
    q += '<div class="note"><b>蓝海四问</b><br>';
    q += '<b>剔除</b>（应彻底取消）：' + (r.eliminate.length ? r.eliminate.map(function(x){ return esc(x.n); }).join('、') : '未识别') + '<br>';
    q += '<b>减少</b>（应远低于行业）：' + (r.reduce.length ? r.reduce.map(function(x){ return esc(x.n); }).join('、') : '未识别') + '<br>';
    q += '<b>提升</b>（应远高于行业）：' + (r.raise.length ? r.raise.map(function(x){ return esc(x.n); }).join('、') : '<span class="bad">无</span>') + '<br>';
    q += '<b>创造</b>（行业从未提供）：' + (r.create.length ? r.create.map(function(x){ return esc(x.n); }).join('、') : '未标记') ;
    q += '</div>';
    out.innerHTML = h + q;
  }
  var c = $('#simCurveChart'); if(c) c.innerHTML = svgValueCurve(r);
}

function vcOnInput(){
  var S = sim();
  var els = document.querySelectorAll('[data-vc]');
  for(var i = 0; i < els.length; i++){
    var e = els[i], idx = +e.getAttribute('data-i'), f = e.getAttribute('data-vc');
    if(!S.curve.items[idx]) continue;
    if(f === 'create') S.curve.items[idx].create = !!e.checked;
    else if(f === 'me' || f === 'ind') S.curve.items[idx][f] = Math.max(0, Math.min(5, +e.value || 0));
    else S.curve.items[idx][f] = e.value;
  }
  save();
  renderSimCurve();
}

function vcAddItem(){
  var S = sim();
  if(S.curve.items.length >= 10){ toast('最多 10 个竞争要素'); return; }
  S.curve.items.push({ n:'新要素', me:3, ind:3, create:false });
  save();
  renderSimCurve();
}

function vcDelItem(i){
  var S = sim();
  S.curve.items.splice(i, 1);
  save();
  renderSimCurve();
}

/* ---------- ⑧ 渲染：CPM ---------- */
function cpmRowsHtml(){
  var S = sim(), c = S.cpm, ksfs = c.ksfs || [], nm = c.names || {};
  var h = '<div class="cpmgrid">';
  h += '<div class="cpmgrid__hd"><span>关键成功因素</span><span>权重</span><span>' + esc(nm.me || '我方') +
       '</span><span>' + esc(nm.r1 || '对手 A') + '</span><span>' + esc(nm.r2 || '对手 B') + '</span><span></span></div>';
  ksfs.forEach(function(x, i){
    h += '<div class="cpmgrid__row">';
    h += '<input class="inp" data-cpm="n" data-i="' + i + '" value="' + esc(x.n) + '" placeholder="例：供应链效率">';
    h += '<input class="inp" type="number" step="1" min="0" data-cpm="w" data-i="' + i + '" value="' + (+x.w || 0) + '">';
    ['me','r1','r2'].forEach(function(k){
      h += '<input class="inp" type="number" step="1" min="0" max="5" data-cpm="sc_' + k + '" data-i="' + i + '" value="' +
           ((x.sc && x.sc[k] != null) ? +x.sc[k] : 0) + '">';
    });
    h += '<button class="btn btn--mini" data-cpmdel="' + i + '">删除</button>';
    h += '</div>';
  });
  h += '</div>';
  return h;
}

function renderSimCpm(){
  var S = sim();
  var box = $('#cpmRows');
  if(box){
    box.innerHTML = cpmRowsHtml();
    box.querySelectorAll('[data-cpm]').forEach(function(el){
      el.addEventListener('input', cpmOnInput);
    });
    box.querySelectorAll('[data-cpmdel]').forEach(function(el){
      el.addEventListener('click', function(){ cpmDelKsf(+el.getAttribute('data-cpmdel')); });
    });
  }
  var r = calcCpm();
  var out = $('#simCpmOut');
  if(!r.ok){
    if(out) out.innerHTML = '<span class="ph">' + esc(r.msg) + '</span>';
    var c0 = $('#simCpmChart'); if(c0) c0.innerHTML = '<span class="ph">—</span>';
    return;
  }
  if(out){
    var h = '<div class="kvlist">';
    h += '<div class="kv"><span>我方加权总分</span><b class="' + (r.myRank === 1 ? 'good' : 'warn') + '">' +
         r.meTotal.toFixed(2) + ' / 5</b></div>';
    h += '<div class="kv"><span>排名</span><b>第 ' + r.myRank + ' 位 / 共 ' + r.rank.length + ' 家</b></div>';
    h += '<div class="kv"><span>领先者</span><b>' + esc(r.lead.name) + '（' + r.lead.total.toFixed(2) + '）</b></div>';
    h += '</div>';

    if(r.gaps.length){
      h += '<div class="note"><b>短板（按加权影响排序）</b><br>';
      r.gaps.slice(0, 4).forEach(function(g){
        h += '· <b>' + esc(g.n) + '</b>：我方 ' + g.me + '，最优 ' + g.best + '（差 ' + g.gap.toFixed(0) +
             '，权重 ' + (g.w * 100).toFixed(0) + '%）<br>';
      });
      h += '</div>';
    } else {
      h += '<div class="note">你在所有要素上都不低于对手——请核对打分是不是过于乐观。</div>';
    }
    h += '<div class="note">权重已归一化（原始合计 ' + r.wSum.toFixed(0) + '），所以不必凑够 100。' +
         '打分 1-5 为主观评估，价值在于<b>把分歧摊开</b>，不在于精确。</div>';
    out.innerHTML = h;
  }
  var c = $('#simCpmChart'); if(c) c.innerHTML = svgCpm(r);
}

function cpmOnInput(){
  var S = sim();
  var nm = ['cpmMe','cpmR1','cpmR2'];
  ['me','r1','r2'].forEach(function(k, i){
    var e = $('#' + nm[i]);
    if(e) S.cpm.names[k] = e.value || (k === 'me' ? '我方' : '对手 ' + String.fromCharCode(65 + i - 1));
  });
  var els = document.querySelectorAll('[data-cpm]');
  for(var i = 0; i < els.length; i++){
    var e = els[i], idx = +e.getAttribute('data-i'), f = e.getAttribute('data-cpm');
    if(!S.cpm.ksfs[idx]) continue;
    if(f.indexOf('sc_') === 0){
      if(!S.cpm.ksfs[idx].sc) S.cpm.ksfs[idx].sc = {};
      S.cpm.ksfs[idx].sc[f.slice(3)] = Math.max(0, Math.min(5, +e.value || 0));
    } else if(f === 'w'){
      S.cpm.ksfs[idx].w = Math.max(0, +e.value || 0);
    } else {
      S.cpm.ksfs[idx][f] = e.value;
    }
  }
  save();
  renderSimCpm();
}

function cpmAddKsf(){
  var S = sim();
  if(S.cpm.ksfs.length >= 10){ toast('最多 10 个关键成功因素'); return; }
  S.cpm.ksfs.push({ n:'新因素', w:10, sc:{ me:3, r1:3, r2:3 } });
  save();
  renderSimCpm();
}

function cpmDelKsf(i){
  var S = sim();
  S.cpm.ksfs.splice(i, 1);
  save();
  renderSimCpm();
}
