/* ============================================================
 * 决策推演 —— 战略矩阵回答「你在哪」，决策推演回答「会怎样」
 *
 *  ① 盈亏平衡曲线：参数 → 保本点 / 安全边际 / 经营杠杆
 *  ② 敏感性龙卷风：哪个假设错了会毁掉方案
 *  ③ BCG 迁移箭头：快照之间业务位置的真实移动
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
    tor:{ pct:10 }
  };
  return state.sim;
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
  md += '\n## 三、模型假设与边界\n\n';
  md += '- 收入与变动成本按线性处理；真实场景可能存在规模效应或阶梯成本（已提供阶梯开关）。\n';
  md += '- 敏感性分析仅测试单变量扰动，未考虑变量之间的联动（如降价可能同时推高销量）。\n';
  md += '- 所有数字取决于你填入的估算值，**本报告不预测未来，只呈现假设的后果**。\n';

  downloadFile('决策推演报告_' + todayStr() + '.md', md, 'text/markdown');
  toast('已导出决策推演报告');
}

/* ---------- 注册到全局（供 HTML 内联调用） ---------- */
window.renderSimAll = renderSimAll;
window.simOnInput = simOnInput;
window.simExport = simExport;
