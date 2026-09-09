/* ============================================================
 * 框架结构示意图引擎 —— 24 种骨架覆盖 70 个营销框架
 *
 * 关键设计：营销框架看似有 70 个，图形结构其实只有 24 种。
 *   quad2 / grid3 / radar / quadbubble / pyramid / funnel / journey
 *   hex6 / gauge / ring / scatter / curve / sankey / heat / cycle
 *   bars / diamond / flow / cards / waterfall / gantt / matrix
 *   cloud / treemap
 * 每个框架只需给出「骨架类型 + 标签」，即可生成结构示意图。
 *
 * 定位：这是「结构示意图」——展示这个框架长什么样、每格填什么，
 *      不需要用户填数据，70 个全部能立刻显示。
 *      真正要算的数据图，请点「前往该模块」用真工具。
 *
 * 全部使用 CSS 变量着色，自动适配浅色/深色主题。
 * ============================================================ */

var FW = 620, FH = 300;

function fesc(s){
  return String(s == null ? '' : s)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
/* 标签截断：顶点/格子空间有限 */
function fcut(s, n){
  s = String(s == null ? '' : s);
  return s.length > n ? s.slice(0, n - 1) + '…' : s;
}

var C_LINE = 'var(--line-strong)';
var C_TX   = 'var(--text)';
var C_TX2  = 'var(--text-2)';
var C_TX3  = 'var(--text-3)';
var C_BR   = 'var(--brand)';
var C_SOFT = 'var(--brand-soft)';
var C_OK   = 'var(--ok)';
var C_WARN = 'var(--warn)';
var C_ALT  = 'var(--alert)';

function fTxt(x, y, s, o){
  o = o || {};
  return '<text x="' + x + '" y="' + y + '" fill="' + (o.c || C_TX2) + '"' +
    ' font-size="' + (o.fs || 12) + '"' +
    (o.anchor ? ' text-anchor="' + o.anchor + '"' : '') +
    (o.w ? ' font-weight="' + o.w + '"' : '') +
    ' font-family="var(--font-body)">' + fesc(s) + '</text>';
}
function fRect(x, y, w, h, o){
  o = o || {};
  return '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '"' +
    ' rx="' + (o.r == null ? 6 : o.r) + '"' +
    ' fill="' + (o.f || 'none') + '" stroke="' + (o.s || C_LINE) + '"' +
    ' stroke-width="' + (o.sw || 1) + '"' +
    (o.op ? ' opacity="' + o.op + '"' : '') + '/>';
}
function fLine(x1, y1, x2, y2, o){
  o = o || {};
  return '<line x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 + '"' +
    ' stroke="' + (o.c || C_LINE) + '" stroke-width="' + (o.sw || 1) + '"' +
    (o.d ? ' stroke-dasharray="' + o.d + '"' : '') + '/>';
}
function fCirc(x, y, r, o){
  o = o || {};
  return '<circle cx="' + x + '" cy="' + y + '" r="' + r + '"' +
    ' fill="' + (o.f || C_SOFT) + '" stroke="' + (o.s || C_BR) + '"' +
    ' stroke-width="' + (o.sw || 1) + '"' +
    (o.op ? ' opacity="' + o.op + '"' : '') + '/>';
}
function fPoly(pts, o){
  o = o || {};
  return '<polygon points="' + pts + '" fill="' + (o.f || 'none') + '"' +
    ' stroke="' + (o.s || C_LINE) + '" stroke-width="' + (o.sw || 1) + '"' +
    (o.op ? ' opacity="' + o.op + '"' : '') + '/>';
}
function fPath(d, o){
  o = o || {};
  return '<path d="' + d + '" fill="' + (o.f || 'none') + '"' +
    ' stroke="' + (o.s || C_LINE) + '" stroke-width="' + (o.sw || 1) + '"' +
    (o.op ? ' opacity="' + o.op + '"' : '') + '/>';
}
function fWrap(inner){
  return '<svg viewBox="0 0 ' + FW + ' ' + FH + '" xmlns="http://www.w3.org/2000/svg"' +
    ' style="width:100%;height:auto;display:block" role="img">' + inner + '</svg>';
}

/* ---------- 1. 四象限 ---------- */
function skQuad2(l){
  var s = '';
  var x0 = 60, y0 = 30, w = 500, h = 220;
  var cw = w / 2, ch = h / 2;
  var qs = [C_SOFT, C_SOFT, C_SOFT, C_SOFT];
  var pos = [[x0, y0], [x0 + cw, y0], [x0, y0 + ch], [x0 + cw, y0 + ch]];
  for(var i = 0; i < 4; i++){
    s += fRect(pos[i][0] + 3, pos[i][1] + 3, cw - 6, ch - 6, {f: qs[i], s: C_LINE});
    s += fTxt(pos[i][0] + cw / 2, pos[i][1] + ch / 2 + 4, fcut(l[i] || '', 14),
      {anchor: 'middle', fs: 13, w: 600, c: C_TX});
  }
  /* 十字轴 */
  s += fLine(x0 + cw, y0 - 12, x0 + cw, y0 + h + 12, {c: C_TX3, sw: 1.5});
  s += fLine(x0 - 12, y0 + ch, x0 + w + 12, y0 + ch, {c: C_TX3, sw: 1.5});
  return fWrap(s);
}

/* ---------- 2. 九宫格 ---------- */
function skGrid3(l){
  var s = '';
  var x0 = 70, y0 = 24, w = 480, h = 216;
  var cw = w / 3, ch = h / 3;
  var tone = [[0.30, 0.30, 0.18], [0.18, 0.12, 0.08], [0.12, 0.08, 0.05]];
  for(var r = 0; r < 3; r++){
    for(var c = 0; c < 3; c++){
      var i = r * 3 + c;
      var x = x0 + c * cw, y = y0 + r * ch;
      s += fRect(x + 3, y + 3, cw - 6, ch - 6,
        {f: C_BR, op: tone[r][c], s: C_LINE});
      s += fTxt(x + cw / 2, y + ch / 2 + 4, fcut(l[i] || '', 6),
        {anchor: 'middle', fs: 11, c: C_TX});
    }
  }
  s += fTxt(x0 - 12, y0 + ch / 2 + 4, '高', {anchor: 'end', fs: 11, c: C_TX3});
  s += fTxt(x0 - 12, y0 + ch + ch / 2 + 4, '中', {anchor: 'end', fs: 11, c: C_TX3});
  s += fTxt(x0 - 12, y0 + ch * 2 + ch / 2 + 4, '低', {anchor: 'end', fs: 11, c: C_TX3});
  s += fTxt(x0 + w + 12, y0 - 8, '行业吸引力 →', {anchor: 'end', fs: 11, c: C_TX3});
  s += fTxt(x0 + w + 12, y0 + h + 18, '← 业务竞争力', {anchor: 'end', fs: 11, c: C_TX3});
  return fWrap(s);
}

/* ---------- 3. 雷达图（n 轴） ---------- */
function skRadar(l){
  var n = Math.max(3, Math.min(l.length, 8));
  var cx = 310, cy = 148, R = 100;
  var s = '';
  var i, ang, x, y;
  /* 网格 */
  for(var g = 1; g <= 3; g++){
    var rr = R * g / 3, pts = '';
    for(i = 0; i < n; i++){
      ang = -Math.PI / 2 + i * 2 * Math.PI / n;
      x = cx + rr * Math.cos(ang); y = cy + rr * Math.sin(ang);
      pts += x.toFixed(1) + ',' + y.toFixed(1) + ' ';
    }
    s += fPoly(pts.trim(), {s: C_LINE, sw: 1});
  }
  /* 轴线 + 数据多边形（示意） */
  var dpts = '';
  for(i = 0; i < n; i++){
    ang = -Math.PI / 2 + i * 2 * Math.PI / n;
    s += fLine(cx, cy, cx + R * Math.cos(ang), cy + R * Math.sin(ang), {c: C_LINE, sw: 1});
    var rv = R * (0.45 + 0.4 * ((i * 7) % 5) / 5);
    dpts += (cx + rv * Math.cos(ang)).toFixed(1) + ',' + (cy + rv * Math.sin(ang)).toFixed(1) + ' ';
  }
  s += fPoly(dpts.trim(), {f: C_SOFT, s: C_BR, sw: 2});
  /* 标签 */
  for(i = 0; i < n; i++){
    ang = -Math.PI / 2 + i * 2 * Math.PI / n;
    x = cx + (R + 26) * Math.cos(ang); y = cy + (R + 22) * Math.sin(ang);
    var an = Math.abs(Math.cos(ang)) < 0.3 ? 'middle' : (Math.cos(ang) > 0 ? 'start' : 'end');
    s += fTxt(x, y + 4, fcut(l[i] || '', 7), {anchor: an, fs: 11, c: C_TX});
  }
  return fWrap(s);
}

/* ---------- 4. 四象限气泡 ---------- */
function skQuadBubble(l){
  var s = skQuad2(l).replace('</svg>', '');
  var x0 = 60, y0 = 30, w = 500, h = 220, cw = w / 2, ch = h / 2;
  var r = [26, 16, 34, 12];
  var cen = [[x0 + cw / 2, y0 + ch / 2 + 22], [x0 + cw + cw / 2, y0 + ch / 2 + 22],
             [x0 + cw / 2, y0 + ch + ch / 2 + 22], [x0 + cw + cw / 2, y0 + ch + ch / 2 + 22]];
  for(var i = 0; i < 4; i++){
    s += fCirc(cen[i][0], cen[i][1], r[i], {f: C_BR, op: 0.22, s: C_BR, sw: 1.5});
  }
  /* 轴说明 */
  s += fTxt(x0 + w + 16, y0 + h + 34, '相对份额 →', {anchor: 'end', fs: 11, c: C_TX3});
  s += fTxt(x0 - 16, y0 + 4, '↑ 增长率', {anchor: 'end', fs: 11, c: C_TX3});
  return s + '</svg>';
}

/* ---------- 5. 金字塔 ---------- */
function skPyramid(l){
  var n = Math.max(2, Math.min(l.length, 6));
  var s = '';
  var topW = 120, botW = 440, H = 216, cx = 310, y0 = 34;
  var lh = H / n;
  for(var i = 0; i < n; i++){
    var t = i / n, t2 = (i + 1) / n;
    var w1 = topW + (botW - topW) * t, w2 = topW + (botW - topW) * t2;
    var y1 = y0 + lh * i, y2 = y0 + lh * (i + 1);
    var pts = (cx - w1 / 2) + ',' + y1 + ' ' + (cx + w1 / 2) + ',' + y1 + ' ' +
              (cx + w2 / 2) + ',' + y2 + ' ' + (cx - w2 / 2) + ',' + y2;
    s += fPoly(pts, {f: C_BR, op: (0.10 + 0.13 * i), s: C_LINE, sw: 1});
    s += fTxt(cx, y1 + lh / 2 + 4, fcut(l[i] || '', 12),
      {anchor: 'middle', fs: 12, c: C_TX, w: 600});
  }
  s += fTxt(cx, y0 + H + 26, '↑ 顶层：用户关系 / ↓ 底层：产品属性',
    {anchor: 'middle', fs: 11, c: C_TX3});
  return fWrap(s);
}

/* ---------- 6. 漏斗 ---------- */
function skFunnel(l){
  var n = Math.max(2, Math.min(l.length, 6));
  var s = '';
  var topW = 420, botW = 130, H = 210, cx = 310, y0 = 36;
  var lh = H / n;
  for(var i = 0; i < n; i++){
    var w1 = topW - (topW - botW) * i / n, w2 = topW - (topW - botW) * (i + 1) / n;
    var y1 = y0 + lh * i, y2 = y0 + lh * (i + 1);
    var pts = (cx - w1 / 2) + ',' + y1 + ' ' + (cx + w1 / 2) + ',' + y1 + ' ' +
              (cx + w2 / 2) + ',' + y2 + ' ' + (cx - w2 / 2) + ',' + y2;
    s += fPoly(pts, {f: C_BR, op: (0.10 + 0.14 * i), s: C_LINE, sw: 1});
    s += fTxt(cx, y1 + lh / 2 + 4, fcut(l[i] || '', 16),
      {anchor: 'middle', fs: 12, c: C_TX, w: 600});
  }
  s += fTxt(cx, y0 + H + 26, '每层收窄 = 该环节流失',
    {anchor: 'middle', fs: 11, c: C_TX3});
  return fWrap(s);
}

/* ---------- 7. 用户旅程（时间线 + 情绪曲线） ---------- */
function skJourney(l){
  var n = Math.max(3, Math.min(l.length, 7));
  var s = '';
  var x0 = 60, x1 = 560, yb = 220, yt = 70;
  var step = n > 1 ? (x1 - x0) / (n - 1) : 0;
  /* 情绪曲线（示意：中间低） */
  var emo = [], i;
  for(i = 0; i < n; i++){
    var v = 0.5 + 0.34 * Math.sin(i * 1.5 + 0.6);
    emo.push(Math.max(0.12, Math.min(0.92, v)));
  }
  var d = '', pts = [];
  for(i = 0; i < n; i++){
    var px = x0 + step * i, py = yb - (yb - yt) * emo[i];
    pts.push([px, py]);
    d += (i === 0 ? 'M' : 'L') + px.toFixed(1) + ' ' + py.toFixed(1) + ' ';
  }
  /* 基线 */
  s += fLine(x0, yb, x1, yb, {c: C_LINE, sw: 1});
  /* 面积 */
  s += fPath(d + 'L' + x1 + ' ' + yb + ' L' + x0 + ' ' + yb + ' Z',
    {f: C_BR, op: 0.10});
  s += fPath(d, {s: C_BR, sw: 2});
  for(i = 0; i < n; i++){
    s += fCirc(pts[i][0], pts[i][1], 4.5, {f: C_BR, s: C_BR, sw: 1.5});
    s += fLine(pts[i][0], yb, pts[i][0], yb + 6, {c: C_TX3, sw: 1});
    s += fTxt(pts[i][0], yb + 24, fcut(l[i] || '', 5),
      {anchor: 'middle', fs: 11, c: C_TX});
  }
  s += fTxt(x0 - 14, yt + 6, '情绪高', {anchor: 'end', fs: 11, c: C_TX3});
  s += fTxt(x0 - 14, yb, '情绪低', {anchor: 'end', fs: 11, c: C_TX3});
  s += fTxt(x0 - 14, (yt + yb) / 2, '情绪', {anchor: 'end', fs: 11, c: C_TX3});
  return fWrap(s);
}

/* ---------- 8. 六宫格 ---------- */
function skHex6(l){
  var s = '';
  var x0 = 70, y0 = 40, w = 480, h = 200;
  var cw = w / 3, ch = h / 2;
  for(var i = 0; i < 6; i++){
    var c = i % 3, r = Math.floor(i / 3);
    var x = x0 + c * cw, y = y0 + r * ch;
    s += fRect(x + 4, y + 4, cw - 8, ch - 8, {f: C_SOFT, s: C_LINE});
    s += fTxt(x + cw / 2, y + ch / 2 + 4, fcut(l[i] || '', 8),
      {anchor: 'middle', fs: 12, c: C_TX, w: 600});
  }
  s += fTxt(310, y0 - 14, '用户视角的六个维度',
    {anchor: 'middle', fs: 11, c: C_TX3});
  return fWrap(s);
}

/* ---------- 9. 仪表盘 ---------- */
function skGauge(l){
  var n = Math.max(1, Math.min(l.length, 4));
  var s = '';
  var totalW = 500, gap = 14;
  var gw = (totalW - gap * (n - 1)) / n;
  var x0 = (FW - totalW) / 2;
  for(var i = 0; i < n; i++){
    var cx = x0 + gw * i + gw / 2, cy = 150, R = Math.min(gw / 2 - 6, 62);
    /* 底弧 */
    s += fPath('M' + (cx - R) + ' ' + cy + ' A' + R + ' ' + R + ' 0 0 1 ' + (cx + R) + ' ' + cy,
      {s: C_LINE, sw: 10, f: 'none'});
    /* 值弧 */
    var frac = 0.42 + 0.18 * i;
    var ang = Math.PI * (1 - frac);
    var ex = cx + R * Math.cos(ang), ey = cy - R * Math.sin(ang);
    s += fPath('M' + (cx - R) + ' ' + cy + ' A' + R + ' ' + R + ' 0 0 1 ' +
      ex.toFixed(1) + ' ' + ey.toFixed(1), {s: C_BR, sw: 10, f: 'none'});
    /* 指针 */
    s += fLine(cx, cy, ex, ey, {c: C_TX, sw: 2});
    s += fCirc(cx, cy, 4, {f: C_TX, s: C_TX});
    s += fTxt(cx, cy + 26, Math.round(frac * 100) + '%',
      {anchor: 'middle', fs: 13, c: C_TX, w: 600});
    s += fTxt(cx, cy + R + 34, fcut(l[i] || '', 8),
      {anchor: 'middle', fs: 11, c: C_TX});
  }
  return fWrap(s);
}

/* ---------- 10. 环形图 ---------- */
function skRing(l){
  var n = Math.max(2, Math.min(l.length, 6));
  var s = '';
  var cx = 190, cy = 150, R = 92, r = 54;
  var frac = [], i, tot = 0;
  for(i = 0; i < n; i++){ frac.push(1 / n - i * 0.02 + 0.03); tot += frac[i]; }
  var a0 = -Math.PI / 2;
  for(i = 0; i < n; i++){
    var a1 = a0 + 2 * Math.PI * frac[i] / tot;
    var lg = (a1 - a0) > Math.PI ? 1 : 0;
    var p0x = cx + R * Math.cos(a0), p0y = cy + R * Math.sin(a0);
    var p1x = cx + R * Math.cos(a1), p1y = cy + R * Math.sin(a1);
    var q1x = cx + r * Math.cos(a1), q1y = cy + r * Math.sin(a1);
    var q0x = cx + r * Math.cos(a0), q0y = cy + r * Math.sin(a0);
    s += fPath('M' + p0x.toFixed(1) + ' ' + p0y.toFixed(1) +
      ' A' + R + ' ' + R + ' 0 ' + lg + ' 1 ' + p1x.toFixed(1) + ' ' + p1y.toFixed(1) +
      ' L' + q1x.toFixed(1) + ' ' + q1y.toFixed(1) +
      ' A' + r + ' ' + r + ' 0 ' + lg + ' 0 ' + q0x.toFixed(1) + ' ' + q0y.toFixed(1) + ' Z',
      {f: C_BR, op: (0.14 + 0.12 * i), s: C_LINE, sw: 1});
    var am = (a0 + a1) / 2;
    s += fTxt(cx + (r + R) / 2 * Math.cos(am), cy + (r + R) / 2 * Math.sin(am) + 4,
      Math.round(frac[i] / tot * 100) + '%', {anchor: 'middle', fs: 11, c: C_TX});
    a0 = a1;
  }
  /* 图例 */
  for(i = 0; i < n; i++){
    var ly = 76 + i * 30;
    s += fRect(360, ly - 9, 12, 12, {f: C_BR, op: (0.14 + 0.12 * i), s: C_LINE, r: 3});
    s += fTxt(380, ly + 1, fcut(l[i] || '', 12), {fs: 12, c: C_TX});
  }
  return fWrap(s);
}

/* ---------- 11. 散点图 ---------- */
function skScatter(l){
  var s = '';
  var x0 = 90, y0 = 40, w = 420, h = 190;
  s += fRect(x0, y0, w, h, {f: 'none', s: C_LINE});
  /* 十字轴 */
  s += fLine(x0 + w / 2, y0, x0 + w / 2, y0 + h, {c: C_LINE, d: '4 4'});
  s += fLine(x0, y0 + h / 2, x0 + w, y0 + h / 2, {c: C_LINE, d: '4 4'});
  /* 轴端标签 [上,右,下,左] */
  s += fTxt(x0 + w / 2, y0 - 12, fcut(l[0] || '', 8), {anchor: 'middle', fs: 11, c: C_TX3});
  s += fTxt(x0 + w + 12, y0 + h / 2 + 4, fcut(l[1] || '', 8), {fs: 11, c: C_TX3});
  s += fTxt(x0 + w / 2, y0 + h + 22, fcut(l[2] || '', 8), {anchor: 'middle', fs: 11, c: C_TX3});
  s += fTxt(x0 - 12, y0 + h / 2 + 4, fcut(l[3] || '', 8), {anchor: 'end', fs: 11, c: C_TX3});
  /* 散点（含我方大点） */
  var pt = [[0.28, 0.30], [0.62, 0.48], [0.44, 0.72], [0.78, 0.26], [0.20, 0.62]];
  var nm = (l[4] || l[3] || '');
  for(var i = 0; i < pt.length; i++){
    var px = x0 + w * pt[i][0], py = y0 + h * pt[i][1];
    var me = (i === 0);
    s += fCirc(px, py, me ? 11 : 7,
      {f: me ? C_BR : C_BR, op: me ? 0.55 : 0.20, s: me ? C_BR : C_BR, sw: me ? 2 : 1.2});
  }
  s += fCirc(x0 + w * 0.28, y0 + h * 0.30, 3, {f: C_TX, s: 'none'});
  s += fTxt(x0 + w * 0.28 + 16, y0 + h * 0.30 - 6, '我方', {fs: 11, c: C_TX, w: 600});
  return fWrap(s);
}

/* ---------- 12. 折线 / 面积 ---------- */
function skCurve(l, area){
  var n = Math.max(3, Math.min(l.length, 8));
  var s = '';
  var x0 = 70, y0 = 40, w = 470, h = 180;
  s += fLine(x0, y0, x0, y0 + h, {c: C_LINE, sw: 1.5});
  s += fLine(x0, y0 + h, x0 + w, y0 + h, {c: C_LINE, sw: 1.5});
  var step = n > 1 ? w / (n - 1) : w;
  var d = '', i, px, py, pt = [];
  for(i = 0; i < n; i++){
    var v = 0.30 + 0.42 * ((i * 3) % 5) / 5 + 0.12 * Math.sin(i);
    v = Math.max(0.08, Math.min(0.94, v));
    px = x0 + step * i; py = y0 + h - h * v;
    pt.push([px, py]);
    d += (i === 0 ? 'M' : 'L') + px.toFixed(1) + ' ' + py.toFixed(1) + ' ';
  }
  if(area) s += fPath(d + 'L' + (x0 + w) + ' ' + (y0 + h) + ' L' + x0 + ' ' + (y0 + h) + ' Z',
    {f: C_BR, op: 0.12});
  s += fPath(d, {s: C_BR, sw: 2});
  for(i = 0; i < n; i++){
    s += fCirc(pt[i][0], pt[i][1], 4, {f: C_BR, s: C_BR, sw: 1.5});
    s += fTxt(pt[i][0], y0 + h + 20, fcut(l[i] || '', 6),
      {anchor: 'middle', fs: 11, c: C_TX});
  }
  return fWrap(s);
}

/* ---------- 13. 桑基 / 流程带 ---------- */
function skSankey(l){
  var n = Math.max(3, Math.min(l.length, 6));
  var s = '';
  var x0 = 50, w = 520, yc = 150;
  var step = n > 1 ? w / (n - 1) : w;
  var H = 150;
  for(var i = 0; i < n - 1; i++){
    var h1 = H * (1 - i * 0.17), h2 = H * (1 - (i + 1) * 0.17);
    var xa = x0 + step * i, xb = x0 + step * (i + 1);
    s += fPath('M' + xa + ' ' + (yc - h1 / 2) +
      ' C' + (xa + step / 2) + ' ' + (yc - h1 / 2) + ' ' +
      (xa + step / 2) + ' ' + (yc - h2 / 2) + ' ' + xb + ' ' + (yc - h2 / 2) +
      ' L' + xb + ' ' + (yc + h2 / 2) +
      ' C' + (xa + step / 2) + ' ' + (yc + h2 / 2) + ' ' +
      (xa + step / 2) + ' ' + (yc + h1 / 2) + ' ' + xa + ' ' + (yc + h1 / 2) + ' Z',
      {f: C_BR, op: (0.10 + 0.08 * i), s: C_LINE, sw: 1});
  }
  for(i = 0; i < n; i++){
    var hx = H * (1 - i * 0.17);
    var px = x0 + step * i;
    s += fRect(px - 2, yc - hx / 2, 4, hx, {f: C_BR, s: 'none', r: 2, op: 0.7});
    s += fTxt(px, yc + H / 2 + 30, fcut(l[i] || '', 6),
      {anchor: 'middle', fs: 11, c: C_TX});
  }
  s += fTxt(310, 46, '带宽 = 该环节留存人数；收窄 = 流失',
    {anchor: 'middle', fs: 11, c: C_TX3});
  return fWrap(s);
}

/* ---------- 14. 热力矩阵 ---------- */
function skHeat(l){
  var n = Math.max(2, Math.min(l.length, 7));
  var s = '';
  var cols = 4;
  var x0 = 70, y0 = 50, cw = 110, rh = 40, rows = 4;
  var i, r, c;
  for(r = 0; r < rows; r++){
    for(c = 0; c < cols; c++){
      var v = ((r * 3 + c * 5) % 10) / 10;
      var x = x0 + c * cw, y = y0 + r * rh;
      s += fRect(x + 2, y + 2, cw - 4, rh - 4,
        {f: C_BR, op: (0.06 + v * 0.42), s: C_LINE, r: 4});
      s += fTxt(x + cw / 2, y + rh / 2 + 4, Math.round(v * 100) + '%',
        {anchor: 'middle', fs: 11, c: C_TX});
    }
  }
  for(i = 0; i < Math.min(n, cols); i++){
    s += fTxt(x0 + i * cw + cw / 2, y0 - 12, fcut(l[i] || '', 5),
      {anchor: 'middle', fs: 11, c: C_TX3});
  }
  s += fTxt(x0 - 12, y0 + rh / 2 + 4, '渠道/分组', {anchor: 'end', fs: 11, c: C_TX3});
  s += fTxt(310, y0 + rows * rh + 26, '颜色越深 = 数值越大',
    {anchor: 'middle', fs: 11, c: C_TX3});
  return fWrap(s);
}

/* ---------- 15. 循环图 ---------- */
function skCycle(l){
  var n = Math.max(3, Math.min(l.length, 6));
  var s = '';
  var cx = 310, cy = 150, R = 96;
  /* 圆环 */
  s += fCirc(cx, cy, R, {f: 'none', s: C_LINE, sw: 22});
  for(var i = 0; i < n; i++){
    var a0 = -Math.PI / 2 + i * 2 * Math.PI / n;
    var a1 = -Math.PI / 2 + (i + 1) * 2 * Math.PI / n;
    var lg = (a1 - a0) > Math.PI ? 1 : 0;
    s += fPath('M' + (cx + R * Math.cos(a0)).toFixed(1) + ' ' + (cy + R * Math.sin(a0)).toFixed(1) +
      ' A' + R + ' ' + R + ' 0 ' + lg + ' 1 ' +
      (cx + R * Math.cos(a1 - 0.06)).toFixed(1) + ' ' + (cy + R * Math.sin(a1 - 0.06)).toFixed(1),
      {s: C_BR, sw: 22, op: (0.18 + 0.14 * i)});
    var am = (a0 + a1) / 2;
    var lx = cx + (R + 52) * Math.cos(am), ly = cy + (R + 42) * Math.sin(am);
    var an = Math.abs(Math.cos(am)) < 0.3 ? 'middle' : (Math.cos(am) > 0 ? 'start' : 'end');
    s += fTxt(lx, ly + 4, fcut(l[i] || '', 8), {anchor: an, fs: 11, c: C_TX});
  }
  s += fTxt(cx, cy + 4, '循环', {anchor: 'middle', fs: 13, c: C_TX, w: 600});
  return fWrap(s);
}

/* ---------- 16. 对比柱状 ---------- */
function skBars(l){
  var n = Math.max(2, Math.min(l.length, 6));
  var s = '';
  var x0 = 80, y0 = 40, w = 460, h = 180, bw = w / n;
  s += fLine(x0, y0, x0, y0 + h, {c: C_LINE, sw: 1.5});
  s += fLine(x0, y0 + h, x0 + w, y0 + h, {c: C_LINE, sw: 1.5});
  var vals = [];
  for(var i = 0; i < n; i++){
    vals.push(0.35 + 0.45 * ((i * 5) % 4) / 4);
  }
  for(i = 0; i < n; i++){
    var bh = h * vals[i];
    var x = x0 + bw * i + bw * 0.22;
    var bwid = bw * 0.56;
    s += fRect(x, y0 + h - bh, bwid, bh,
      {f: C_BR, op: (0.20 + 0.14 * i), s: C_BR, sw: 1, r: 4});
    s += fTxt(x + bwid / 2, y0 + h - bh - 8, Math.round(vals[i] * 100),
      {anchor: 'middle', fs: 11, c: C_TX, w: 600});
    s += fTxt(x0 + bw * i + bw / 2, y0 + h + 20, fcut(l[i] || '', 8),
      {anchor: 'middle', fs: 11, c: C_TX});
  }
  return fWrap(s);
}

/* ---------- 17. 菱形（钻石模型） ---------- */
function skDiamond(l){
  var s = '';
  var cx = 310, cy = 150, rx = 150, ry = 100;
  var pts = cx + ',' + (cy - ry) + ' ' + (cx + rx) + ',' + cy + ' ' +
            cx + ',' + (cy + ry) + ' ' + (cx - rx) + ',' + cy;
  s += fPoly(pts, {f: C_SOFT, s: C_BR, sw: 2});
  s += fTxt(cx, cy - ry - 14, fcut(l[0] || '', 10), {anchor: 'middle', fs: 12, c: C_TX, w: 600});
  s += fTxt(cx + rx + 12, cy + 4, fcut(l[1] || '', 10), {fs: 12, c: C_TX, w: 600});
  s += fTxt(cx, cy + ry + 26, fcut(l[2] || '', 10), {anchor: 'middle', fs: 12, c: C_TX, w: 600});
  s += fTxt(cx - rx - 12, cy + 4, fcut(l[3] || '', 10), {anchor: 'end', fs: 12, c: C_TX, w: 600});
  s += fTxt(cx, cy + 4, '国家/区域\n竞争优势', {anchor: 'middle', fs: 11, c: C_TX3});
  return fWrap(s);
}

/* ---------- 18. 流程图（价值链） ---------- */
function skFlow(l){
  var n = Math.max(3, Math.min(l.length, 6));
  var s = '';
  var bw = 86, bh = 54, y = 150, gap = 12;
  var totalW = n * bw + (n - 1) * gap;
  var x0 = (FW - totalW) / 2;
  /* 支持活动（上方） */
  s += fRect(x0, y - 92, totalW, 40, {f: C_SOFT, s: C_LINE, r: 6});
  s += fTxt(x0 + totalW / 2, y - 92 + 25, '支持活动：采购 / 技术 / 人力 / 基础设施',
    {anchor: 'middle', fs: 11, c: C_TX2});
  for(var i = 0; i < n; i++){
    var x = x0 + i * (bw + gap);
    s += fRect(x, y - bh / 2, bw, bh, {f: C_BR, op: (0.10 + 0.10 * i), s: C_BR, sw: 1.2, r: 6});
    s += fTxt(x + bw / 2, y + 4, fcut(l[i] || '', 5),
      {anchor: 'middle', fs: 12, c: C_TX, w: 600});
    if(i < n - 1){
      s += fPath('M' + (x + bw + 2) + ' ' + y + ' L' + (x + bw + gap - 2) + ' ' + y,
        {s: C_TX3, sw: 1.5});
      s += fPath('M' + (x + bw + gap - 8) + ' ' + (y - 4) + ' L' + (x + bw + gap - 2) + ' ' + y +
        ' L' + (x + bw + gap - 8) + ' ' + (y + 4), {s: C_TX3, sw: 1.5});
    }
  }
  s += fTxt(310, y + bh / 2 + 30, '主活动流转方向 →　（每环节标注成本占比 / 利润贡献）',
    {anchor: 'middle', fs: 11, c: C_TX3});
  return fWrap(s);
}

/* ---------- 19. 卡片组 ---------- */
function skCards(l){
  var n = Math.max(2, Math.min(l.length, 5));
  var s = '';
  var cw = 112, ch = 150, gap = 14;
  var totalW = n * cw + (n - 1) * gap;
  var x0 = (FW - totalW) / 2, y0 = 66;
  for(var i = 0; i < n; i++){
    var x = x0 + i * (cw + gap);
    s += fRect(x, y0, cw, ch, {f: C_SOFT, s: C_LINE, r: 10});
    s += fRect(x, y0, cw, 26, {f: C_BR, op: (0.16 + 0.10 * i), s: C_LINE, r: 10});
    s += fTxt(x + cw / 2, y0 + 18, fcut(l[i] || '', 6),
      {anchor: 'middle', fs: 12, c: C_TX, w: 600});
    /* 内容占位线 */
    for(var k = 0; k < 4; k++){
      s += fRect(x + 12, y0 + 42 + k * 18, cw - 24 - (k % 2) * 22, 7,
        {f: C_LINE, s: 'none', r: 3, op: 0.7});
    }
  }
  return fWrap(s);
}

/* ---------- 20. 瀑布图 ---------- */
function skWaterfall(l){
  var n = Math.max(3, Math.min(l.length, 7));
  var s = '';
  var x0 = 60, y0 = 40, w = 500, h = 180;
  s += fLine(x0, y0 + h, x0 + w, y0 + h, {c: C_LINE, sw: 1.5});
  var bw = w / n, base = 0.30, acc = 0.30;
  for(var i = 0; i < n; i++){
    var delta = (i === 0 || i === n - 1) ? 0 : (0.16 - (i % 3) * 0.07);
    var yTop, hh, isTotal = (i === 0 || i === n - 1);
    if(isTotal){
      acc = base + (i === 0 ? 0 : 0.24);
      yTop = y0 + h - h * acc; hh = h * acc;
    } else {
      yTop = delta >= 0 ? (y0 + h - h * (acc + delta)) : (y0 + h - h * acc);
      hh = h * Math.abs(delta);
      acc += delta;
    }
    var x = x0 + bw * i + bw * 0.18;
    var bwid = bw * 0.64;
    s += fRect(x, yTop, bwid, Math.max(2, hh),
      {f: isTotal ? C_TX2 : (delta >= 0 ? C_OK : C_ALT),
       op: isTotal ? 0.30 : 0.24, s: C_LINE, sw: 1, r: 3});
    if(!isTotal){
      s += fTxt(x + bwid / 2, yTop - 6, (delta >= 0 ? '+' : '') + Math.round(delta * 100),
        {anchor: 'middle', fs: 10, c: delta >= 0 ? C_OK : C_ALT, w: 600});
    }
    s += fTxt(x0 + bw * i + bw / 2, y0 + h + 20, fcut(l[i] || '', 6),
      {anchor: 'middle', fs: 11, c: C_TX});
    /* 连接线 */
    if(i < n - 1){
      s += fLine(x + bwid, yTop, x0 + bw * (i + 1) + bw * 0.18, yTop,
        {c: C_LINE, d: '3 3'});
    }
  }
  return fWrap(s);
}

/* ---------- 21. 甘特图 ---------- */
function skGantt(l){
  var n = Math.max(3, Math.min(l.length, 6));
  var s = '';
  var x0 = 110, y0 = 56, w = 450, rh = 34;
  /* 时间刻度 */
  var weeks = 6;
  for(var k = 0; k <= weeks; k++){
    var gx = x0 + w * k / weeks;
    s += fLine(gx, y0 - 8, gx, y0 + n * rh + 6, {c: C_LINE, sw: 1});
    s += fTxt(gx, y0 - 14, 'W' + (k + 1), {anchor: 'middle', fs: 10, c: C_TX3});
  }
  for(var i = 0; i < n; i++){
    var y = y0 + i * rh;
    s += fTxt(x0 - 12, y + rh / 2 + 4, fcut(l[i] || '', 6),
      {anchor: 'end', fs: 11, c: C_TX});
    var st = (i * 1.1) % (weeks - 2), len = 1.4 + (i % 3) * 0.7;
    var bx = x0 + w * st / weeks, bwid = w * len / weeks;
    s += fRect(bx, y + 5, bwid, rh - 12,
      {f: C_BR, op: (0.16 + 0.12 * i), s: C_BR, sw: 1, r: 5});
  }
  s += fTxt(310, y0 + n * rh + 30, '横条 = 排期跨度；可拖宽调整',
    {anchor: 'middle', fs: 11, c: C_TX3});
  return fWrap(s);
}

/* ---------- 22. 对比矩阵 ---------- */
function skMatrix(l){
  var n = Math.max(3, Math.min(l.length, 6));
  var s = '';
  var x0 = 60, y0 = 50, cw = 96, rh = 38, rows = 4;
  var r, c;
  /* 表头 */
  s += fRect(x0, y0, cw, rh, {f: C_BR, op: 0.16, s: C_LINE, r: 4});
  s += fTxt(x0 + cw / 2, y0 + rh / 2 + 4, '维度',
    {anchor: 'middle', fs: 11, c: C_TX, w: 600});
  for(c = 0; c < n; c++){
    var hx = x0 + cw * (c + 1);
    s += fRect(hx, y0, cw, rh, {f: C_BR, op: 0.16, s: C_LINE, r: 4});
    s += fTxt(hx + cw / 2, y0 + rh / 2 + 4, fcut(l[c] || '', 5),
      {anchor: 'middle', fs: 11, c: C_TX, w: 600});
  }
  /* 行 */
  for(r = 0; r < rows; r++){
    var y = y0 + rh * (r + 1);
    s += fRect(x0, y, cw, rh, {f: C_SOFT, s: C_LINE, r: 4});
    s += fTxt(x0 + cw / 2, y + rh / 2 + 4, r === 0 ? '我方' : ('竞品' + r),
      {anchor: 'middle', fs: 11, c: C_TX});
    for(c = 0; c < n; c++){
      var cx2 = x0 + cw * (c + 1);
      var v = ((r * 4 + c * 3) % 5) + 1;
      s += fRect(cx2, y, cw, rh, {f: C_BR, op: (v / 5 * 0.34), s: C_LINE, r: 4});
      s += fTxt(cx2 + cw / 2, y + rh / 2 + 4, v + ' 分',
        {anchor: 'middle', fs: 11, c: C_TX});
    }
  }
  s += fTxt(310, y0 + rh * (rows + 1) + 26, '打分后自动算加权总分与机会点',
    {anchor: 'middle', fs: 11, c: C_TX3});
  return fWrap(s);
}

/* ---------- 23. 词云 ---------- */
function skCloud(l){
  var n = Math.max(4, Math.min(l.length, 10));
  var s = '';
  var pos = [[110, 90], [260, 70], [410, 96], [520, 150], [180, 160],
             [330, 150], [450, 210], [150, 225], [300, 250], [520, 60]];
  var fsArr = [26, 20, 30, 16, 22, 18, 24, 15, 19, 14];
  var opArr = [0.85, 0.55, 0.95, 0.40, 0.65, 0.50, 0.75, 0.38, 0.58, 0.34];
  for(var i = 0; i < n; i++){
    s += fTxt(pos[i][0], pos[i][1], fcut(l[i] || '', 5), {
      anchor: 'middle', fs: fsArr[i], c: C_BR, w: 700
    }).replace('fill="var(--brand)"', 'fill="var(--brand)" opacity="' + opArr[i] + '"');
  }
  s += fTxt(310, 285, '字号 = 搜索量 / 权重',
    {anchor: 'middle', fs: 11, c: C_TX3});
  return fWrap(s);
}

/* ---------- 24. 树图 ---------- */
function skTreemap(l){
  var n = Math.max(3, Math.min(l.length, 6));
  var s = '';
  var x0 = 60, y0 = 40, w = 500, h = 210;
  /* 简化：第一行两块，其余按行铺 */
  var boxes = [];
  if(n >= 2){
    boxes.push([x0, y0, w * 0.52, h * 0.56]);
    boxes.push([x0 + w * 0.52, y0, w * 0.48, h * 0.56]);
    var rest = n - 2;
    if(rest > 0){
      var rw = w / rest, ry = y0 + h * 0.56, rh2 = h * 0.44;
      for(var k = 0; k < rest; k++){
        boxes.push([x0 + rw * k, ry, rw, rh2]);
      }
    }
  } else {
    boxes.push([x0, y0, w, h]);
  }
  for(var i = 0; i < boxes.length && i < n; i++){
    var b = boxes[i];
    s += fRect(b[0] + 3, b[1] + 3, b[2] - 6, b[3] - 6,
      {f: C_BR, op: (0.12 + 0.13 * i), s: C_LINE, r: 6});
    s += fTxt(b[0] + b[2] / 2, b[1] + b[3] / 2 + 4, fcut(l[i] || '', 6),
      {anchor: 'middle', fs: 13, c: C_TX, w: 600});
  }
  return fWrap(s);
}

/* ============================================================
 * 骨架分发表
 * ============================================================ */
var SKEL = {
  quad2:    function(l){ return skQuad2(l); },
  grid3:    function(l){ return skGrid3(l); },
  radar:    function(l){ return skRadar(l); },
  quadbubble:function(l){ return skQuadBubble(l); },
  pyramid:  function(l){ return skPyramid(l); },
  funnel:   function(l){ return skFunnel(l); },
  journey:  function(l){ return skJourney(l); },
  hex6:     function(l){ return skHex6(l); },
  gauge:    function(l){ return skGauge(l); },
  ring:     function(l){ return skRing(l); },
  scatter:  function(l){ return skScatter(l); },
  curve:    function(l){ return skCurve(l, false); },
  area:     function(l){ return skCurve(l, true); },
  sankey:   function(l){ return skSankey(l); },
  heat:     function(l){ return skHeat(l); },
  cycle:    function(l){ return skCycle(l); },
  bars:     function(l){ return skBars(l); },
  diamond:  function(l){ return skDiamond(l); },
  flow:     function(l){ return skFlow(l); },
  cards:    function(l){ return skCards(l); },
  waterfall:function(l){ return skWaterfall(l); },
  gantt:    function(l){ return skGantt(l); },
  matrix:   function(l){ return skMatrix(l); },
  cloud:    function(l){ return skCloud(l); },
  treemap:  function(l){ return skTreemap(l); }
};

/* 生成某框架的示意图；没有配置则返回空串 */
function frameSVG(id){
  var f = FRAME_FIG[id];
  if(!f || !f.s || !SKEL[f.s]) return '';
  try{
    return SKEL[f.s](f.l || []);
  }catch(e){
    return '';
  }
}
/* 该框架的图示形态名称（用于图注） */
function frameFigName(id){
  var f = FRAME_FIG[id];
  return f ? (f.t || '') : '';
}
