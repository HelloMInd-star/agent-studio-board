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
    lc:{ c1:100, lr:80, n:1000, rival:70, target:0 }
  };
  var S = state.sim;
  /* 旧存档兼容补齐 */
  if(!S.be) S.be = { f:240000, p:39, v:13, q:9000, step:false, cap:5000 };
  if(!S.tor) S.tor = { pct:10 };
  if(!S.dt) S.dt = { cost:200, bs:[], rs:{ on:false, cost:20, imp:30 } };
  if(!S.dt.bs || !S.dt.bs.length) S.dt.bs = [ {n:'成功',p:40,v:500}, {n:'一般',p:35,v:100}, {n:'失败',p:25,v:-200} ];
  if(!S.dt.rs) S.dt.rs = { on:false, cost:20, imp:30 };
  if(!S.lc) S.lc = { c1:100, lr:80, n:1000, rival:70, target:0 };
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

  renderSimBe();
  renderSimTor();
  renderSimTrack();
  renderSimDt();
  renderSimLc();
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

  md += '\n## 五、模型假设与边界\n\n';
  md += '- 收入与变动成本按线性处理；真实场景可能存在规模效应或阶梯成本（已提供阶梯开关）。\n';
  md += '- 敏感性分析仅测试单变量扰动，未考虑变量之间的联动（如降价可能同时推高销量）。\n';
  md += '- 决策树的概率为主观估计；净期望为正不等于可以承受一次失败。\n';
  md += '- 学习曲线假设成本下降只由累计产量驱动，忽略技术突变与原材料波动。\n';
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
