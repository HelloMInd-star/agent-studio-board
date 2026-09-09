/* ============================================================
 * 策略计算工具 —— 真·能跑的分析引擎（本地计算，非提示词）
 * 1 竞品对比矩阵   加权排名 + 雷达图 + 机会点/威胁点
 * 2 STP 市场选择   GE 矩阵气泡图 + 投入建议
 * 3 营销日历倒排   节点倒计时 + 倒排任务 + 时间轴
 * 每个工具都暴露 Function Schema，可直接被 Agent 调用
 * ============================================================ */
var TOOL_TYPES = [
  {k:'comp', n:'⚔️ 竞品对比矩阵', d:'加权打分 → 排名 + 机会点识别'},
  {k:'stp',  n:'🎯 STP 市场选择', d:'GE 矩阵 → 投入优先级建议'},
  {k:'cal',  n:'📅 营销日历倒排', d:'节点 → 自动倒排与倒计时'}
];

/* ---------- 通用：解析「名称,数,数…」行 ---------- */
function parseRows(txt){
  return String(txt||'').split('\n').map(function(x){ return x.trim(); })
    .filter(function(x){ return x.length; })
    .map(function(l){ return l.split(/[,，]/).map(function(c){ return c.trim(); }); });
}
function clamp(v, a, b){ return Math.max(a, Math.min(b, v)); }

/* ============================================================
 * 工具 1：竞品对比矩阵
 * ============================================================ */
function calcComp(){
  var dims = parseRows($('#cp_dims').value).map(function(r){
    return {name:r[0]||'维度', w:parseFloat(r[1])||0};
  });
  var rows = parseRows($('#cp_rows').value).map(function(r){
    var vals = r.slice(1).map(function(v){ return clamp(parseFloat(v)||0, 0, 5); });
    return {name:r[0]||'未命名', vals:vals};
  });
  var errs = [];
  if(!dims.length) errs.push('请至少填写 1 个维度');
  if(rows.length < 2) errs.push('请至少填写 2 个竞品（含我方）');
  rows.forEach(function(r){
    if(r.vals.length < dims.length) errs.push('「' + r.name + '」的分数个数（' + r.vals.length + '）少于维度数（' + dims.length + '）');
  });

  var stat = $('#cpStat');
  if(stat) stat.textContent = '已解析 ' + dims.length + ' 个维度 × ' + rows.length + ' 个竞品' + (errs.length ? '　⚠️ ' + errs[0] : '　✅');

  if(errs.length || !dims.length || rows.length < 2) return null;

  var wSum = dims.reduce(function(a,d){ return a + d.w; }, 0) || 1;
  var scored = rows.map(function(r){
    var total = 0;
    dims.forEach(function(d, i){ total += (r.vals[i]||0) * (d.w / wSum); });
    return {name:r.name, vals:r.vals, total:total};
  });
  scored.sort(function(a,b){ return b.total - a.total; });

  // 我方 = 原始数据第一行
  var me = rows[0];
  var rivals = rows.slice(1);

  // 机会点：我方 >=4 且 竞品均分 <=3
  var opps = [], threats = [];
  dims.forEach(function(d, i){
    var myV = me.vals[i]||0;
    var avg = rivals.length ? rivals.reduce(function(a,r){ return a + (r.vals[i]||0); }, 0) / rivals.length : 0;
    var best = rivals.reduce(function(a,r){ return Math.max(a, r.vals[i]||0); }, 0);
    if(myV >= 4 && avg <= 3) opps.push({dim:d.name, my:myV, avg:+avg.toFixed(1), w:d.w});
    if(myV <= 2 && best >= 4) threats.push({dim:d.name, my:myV, best:best, w:d.w});
  });
  opps.sort(function(a,b){ return b.w - a.w; });
  threats.sort(function(a,b){ return b.w - a.w; });

  var svg = svgRadar(dims, rows);
  return {dims:dims, scored:scored, me:me, rivals:rivals, opps:opps, threats:threats, svg:svg};
}

function compReport(c){
  var out = '# ⚔️ 竞品对比矩阵 · 分析结论\n\n';
  out += '### 加权总分排名\n\n';
  out += '| 排名 | 对象 | 加权总分 | 分档 |\n|---|---|---|---|\n';
  c.scored.forEach(function(s, i){
    var lv = s.total >= 4 ? '🟢 领先' : s.total >= 3 ? '🔵 平均' : '🔴 落后';
    out += '| ' + (i+1) + ' | ' + (s.name.indexOf('我方') > -1 ? '**' + s.name + '**' : s.name) +
           ' | **' + s.total.toFixed(2) + '** | ' + lv + ' |\n';
  });
  out += '\n';

  out += '### 逐维度得分\n\n';
  out += '| 维度 | 权重 | ' + c.scored.map(function(s){ return s.name; }).join(' | ') + ' |\n|---|---|' + c.scored.map(function(){ return '---'; }).join('|') + '|\n';
  c.dims.forEach(function(d, i){
    out += '| ' + d.name + ' | ' + d.w + '% | ' + c.scored.map(function(s){ return s.vals[i] || 0; }).join(' | ') + ' |\n';
  });
  out += '\n';

  if(c.opps.length){
    out += '### 🔥 机会点（你的差异化切口）\n\n';
    out += '这些维度**你强、对手普遍弱**，是最值得放大的差异点：\n\n';
    c.opps.forEach(function(o){
      out += '- **' + o.dim + '**（权重 ' + o.w + '%）：你 ' + o.my + ' 分，竞品均分 ' + o.avg + ' 分\n';
    });
    out += '\n';
  } else {
    out += '### 🔥 机会点\n\n未发现明显空白点——所有强势维度对手都不弱，建议在权重最高的维度上做单点突破。\n\n';
  }

  if(c.threats.length){
    out += '### ⚠️ 威胁点（会被打的地方）\n\n';
    c.threats.forEach(function(o){
      out += '- **' + o.dim + '**（权重 ' + o.w + '%）：你仅 ' + o.my + ' 分，最强对手 ' + o.best + ' 分\n';
    });
    out += '\n';
  }

  out += '---\n\n**方法说明**：加权总分 = Σ(维度得分 × 权重占比)，得分 1-5 分。\n';
  out += '机会点判定 = 我方 ≥4 且 竞品均分 ≤3；威胁点判定 = 我方 ≤2 且 最强对手 ≥4。\n\n';
  out += '💡 这张表也是 Agent 可调用的确定性函数，点「📐 Function Schema」查看接口定义。';
  return out;
}

/* 雷达图 */
function svgRadar(dims, rows){
  var W = 900, H = 700, top = 122;
  var cx = W/2, cy = top + 250, R = 190;
  var n = dims.length;
  var pal = ['#1e3a8a','#b45309','#047857','#b91c1c','#7c3aed','#0891b2'];
  var s = '<svg xmlns="http://www.w3.org/2000/svg" width="'+W+'" height="'+H+'" viewBox="0 0 '+W+' '+H+'" font-family="PingFang SC,Microsoft YaHei,sans-serif">';
  s += cxFrame(W,H,'竞品对比矩阵','COMPETITIVE MATRIX · '+todayStr());

  var ang = function(i){ return -Math.PI/2 + i * 2*Math.PI/n; };
  var pt = function(i, v){ return [cx + Math.cos(ang(i))*R*(v/5), cy + Math.sin(ang(i))*R*(v/5)]; };

  // 网格
  for(var g=1; g<=5; g++){
    var pts = [];
    for(var i=0;i<n;i++){ var p = pt(i, g); pts.push(p[0].toFixed(1)+','+p[1].toFixed(1)); }
    s += '<polygon points="'+pts.join(' ')+'" fill="none" stroke="'+CX.line+'" stroke-opacity="'+(g===5?0.9:0.4)+'"/>';
  }
  // 轴线与标签
  for(var i=0;i<n;i++){
    var p5 = pt(i, 5);
    s += '<line x1="'+cx+'" y1="'+cy+'" x2="'+p5[0].toFixed(1)+'" y2="'+p5[1].toFixed(1)+'" stroke="'+CX.line+'"/>';
    var lp = pt(i, 6.15);
    var anchor = Math.abs(lp[0]-cx) < 12 ? 'middle' : (lp[0] > cx ? 'start' : 'end');
    s += '<text x="'+lp[0].toFixed(1)+'" y="'+(lp[1]+4).toFixed(1)+'" font-size="13" font-weight="600" fill="'+CX.sub+'" text-anchor="'+anchor+'">'+esc(dims[i].name)+'</text>';
    s += '<text x="'+lp[0].toFixed(1)+'" y="'+(lp[1]+20).toFixed(1)+'" font-size="10.5" fill="'+CX.mute+'" text-anchor="'+anchor+'">'+dims[i].w+'%</text>';
  }
  // 数据多边形
  rows.forEach(function(r, ri){
    var c = pal[ri % pal.length];
    var pts = [];
    for(var i=0;i<n;i++){ var p = pt(i, clamp(r.vals[i]||0,0,5)); pts.push(p[0].toFixed(1)+','+p[1].toFixed(1)); }
    var isMe = ri === 0;
    s += '<polygon points="'+pts.join(' ')+'" fill="'+c+'" fill-opacity="'+(isMe?0.16:0.07)+'" stroke="'+c+'" stroke-width="'+(isMe?2.5:1.3)+'"/>';
    for(var i=0;i<n;i++){
      var p = pt(i, clamp(r.vals[i]||0,0,5));
      s += '<circle cx="'+p[0].toFixed(1)+'" cy="'+p[1].toFixed(1)+'" r="'+(isMe?4:2.5)+'" fill="'+c+'"/>';
    }
  });
  // 图例
  var ly = H - 96;
  rows.forEach(function(r, ri){
    var c = pal[ri % pal.length];
    var x = 48 + ri * 190;
    if(x > W - 160){ x = 48 + (ri % 4) * 190; ly += 0; }
    s += '<rect x="'+x+'" y="'+(H-72)+'" width="14" height="4" fill="'+c+'"/>';
    s += '<text x="'+(x+20)+'" y="'+(H-66)+'" font-size="12.5" fill="'+CX.sub+'">'+esc(r.name)+'</text>';
  });
  s += '</svg>';
  return s;
}

/* ============================================================
 * 工具 2：STP 市场选择（GE 矩阵）
 * ============================================================ */
function calcStp(){
  var rows = parseRows($('#st_rows').value).map(function(r){
    return {
      name: r[0]||'未命名',
      at: clamp(parseFloat(r[1])||0, 0, 5),
      cp: clamp(parseFloat(r[2])||0, 0, 5),
      size: Math.max(1, parseFloat(String(r[3]||'').replace(/[^\d.]/g,'')) || 1)
    };
  });
  var errs = [];
  if(rows.length < 2) errs.push('请至少填写 2 个细分市场');
  var stat = $('#stStat');
  if(stat) stat.textContent = '已解析 ' + rows.length + ' 个细分市场' + (errs.length ? '　⚠️ ' + errs[0] : '　✅');
  if(errs.length) return null;

  var maxSize = rows.reduce(function(a,r){ return Math.max(a, r.size); }, 1);
  rows.forEach(function(r){
    // 优先级 = 吸引力×竞争力 归一化后，按规模加权（规模取对数避免大市场压倒一切）
    var base = (r.at * 0.5 + r.cp * 0.5);
    var scale = Math.log(r.size + 1) / Math.log(maxSize + 1);
    r.score = +(base * (0.6 + 0.4 * scale)).toFixed(2);
    // GE 矩阵四象限建议
    if(r.at >= 3 && r.cp >= 3)      r.act = '🟢 重点投入';
    else if(r.at >= 3 && r.cp < 3)  r.act = '🔵 提升能力 / 找合作';
    else if(r.at < 3 && r.cp >= 3)  r.act = '🟡 维持收割';
    else                            r.act = '🔴 谨慎 / 放弃';
  });
  var ranked = rows.slice().sort(function(a,b){ return b.score - a.score; });
  return {rows:rows, ranked:ranked, maxSize:maxSize, svg:svgGE(rows, maxSize)};
}

function stpReport(c){
  var out = '# 🎯 STP 市场选择 · 分析结论\n\n';
  out += '### 优先级排序\n\n';
  out += '| 排名 | 细分市场 | 吸引力 | 竞争力 | 规模 | 优先级分 | 建议 |\n|---|---|---|---|---|---|---|\n';
  c.ranked.forEach(function(r, i){
    out += '| ' + (i+1) + ' | ' + r.name + ' | ' + r.at + ' | ' + r.cp + ' | ' + r.size + ' | **' + r.score + '** | ' + r.act + ' |\n';
  });
  out += '\n';
  out += '### 逐市场解读\n\n';
  c.ranked.forEach(function(r){
    out += '- **' + r.name + '**：' + r.act + '\n';
    out += '  - 吸引力 ' + r.at + '/5，竞争力 ' + r.cp + '/5，规模 ' + r.size + '\n';
    if(r.at >= 3 && r.cp < 3) out += '  - 市场够好但能力不够，优先补能力或找合作方，不要硬上\n';
    if(r.at < 3 && r.cp >= 3) out += '  - 能力有余但市场天花板低，维持现金流即可，别追加投入\n';
    if(r.at >= 3 && r.cp >= 3) out += '  - 双击区：这里是主战场，资源优先倾斜\n';
    if(r.at < 3 && r.cp < 3) out += '  - 双击劣势：除非有战略理由，否则应收缩\n';
  });
  out += '\n---\n\n**方法说明**：GE 矩阵（吸引力 × 竞争力），气泡大小代表市场规模。\n';
  out += '优先级分 = (吸引力×0.5 + 竞争力×0.5) × (0.6 + 0.4×规模权重)，规模取对数以避免大市场压倒一切。\n\n';
  out += '💡 点「📐 Function Schema」可查看该分析的接口定义。';
  return out;
}

function svgGE(rows, maxSize){
  var W = 900, H = 700, pad = 96, top = 122;
  var pw = W - pad - 56, ph = H - top - 110;
  var X = function(v){ return pad + (v/5) * pw; };
  var Y = function(v){ return top + ph - (v/5) * ph; };
  var s = '<svg xmlns="http://www.w3.org/2000/svg" width="'+W+'" height="'+H+'" viewBox="0 0 '+W+' '+H+'" font-family="PingFang SC,Microsoft YaHei,sans-serif">';
  s += cxFrame(W,H,'STP 市场选择矩阵','GE MATRIX · '+todayStr());

  // 象限底纹
  s += '<rect x="'+X(3)+'" y="'+Y(5)+'" width="'+(X(5)-X(3))+'" height="'+(Y(3)-Y(5))+'" fill="#047857" fill-opacity="0.06"/>';
  s += '<rect x="'+X(0)+'" y="'+Y(5)+'" width="'+(X(3)-X(0))+'" height="'+(Y(3)-Y(5))+'" fill="#b45309" fill-opacity="0.05"/>';
  s += '<rect x="'+X(3)+'" y="'+Y(3)+'" width="'+(X(5)-X(3))+'" height="'+(Y(0)-Y(3))+'" fill="#b45309" fill-opacity="0.05"/>';
  s += '<rect x="'+X(0)+'" y="'+Y(3)+'" width="'+(X(3)-X(0))+'" height="'+(Y(0)-Y(3))+'" fill="#b91c1c" fill-opacity="0.05"/>';

  s += '<rect x="'+pad+'" y="'+Y(5)+'" width="'+pw+'" height="'+ph+'" fill="none" stroke="'+CX.line+'"/>';
  for(var i=1;i<5;i++){
    s += '<line x1="'+X(i)+'" y1="'+Y(5)+'" x2="'+X(i)+'" y2="'+Y(0)+'" stroke="'+CX.line+'" stroke-opacity="0.5"/>';
    s += '<line x1="'+pad+'" y1="'+Y(i)+'" x2="'+(pad+pw)+'" y2="'+Y(i)+'" stroke="'+CX.line+'" stroke-opacity="0.5"/>';
  }
  // 分界（3,3）
  s += '<line x1="'+X(3)+'" y1="'+Y(5)+'" x2="'+X(3)+'" y2="'+Y(0)+'" stroke="'+CX.sub+'" stroke-dasharray="5 4" stroke-opacity="0.7"/>';
  s += '<line x1="'+pad+'" y1="'+Y(3)+'" x2="'+(pad+pw)+'" y2="'+Y(3)+'" stroke="'+CX.sub+'" stroke-dasharray="5 4" stroke-opacity="0.7"/>';

  s += '<line x1="'+pad+'" y1="'+Y(0)+'" x2="'+(pad+pw+16)+'" y2="'+Y(0)+'" stroke="'+CX.sub+'" stroke-width="1.2"/>';
  s += '<line x1="'+pad+'" y1="'+Y(0)+'" x2="'+pad+'" y2="'+(Y(5)-16)+'" stroke="'+CX.sub+'" stroke-width="1.2"/>';
  s += '<text x="'+(pad+pw/2)+'" y="'+(Y(0)+40)+'" font-size="13.5" font-weight="600" fill="'+CX.sub+'" text-anchor="middle">市场吸引力  →</text>';
  s += '<text x="'+(pad-52)+'" y="'+Y(2.5)+'" font-size="13.5" font-weight="600" fill="'+CX.sub+'" text-anchor="middle" transform="rotate(-90 '+(pad-52)+' '+Y(2.5)+')">自身竞争力  →</text>';

  // 象限文字
  s += '<text x="'+(pad+14)+'" y="'+(Y(5)+22)+'" font-size="11" fill="'+CX.mute+'">提升能力 / 找合作</text>';
  s += '<text x="'+(pad+pw-14)+'" y="'+(Y(5)+22)+'" font-size="11" fill="#047857" text-anchor="end">重点投入</text>';
  s += '<text x="'+(pad+14)+'" y="'+(Y(0)-12)+'" font-size="11" fill="'+CX.mute+'">谨慎 / 放弃</text>';
  s += '<text x="'+(pad+pw-14)+'" y="'+(Y(0)-12)+'" font-size="11" fill="'+CX.mute+'" text-anchor="end">维持收割</text>';

  rows.forEach(function(r, i){
    var r0 = 14 + 34 * Math.sqrt(r.size / maxSize);
    var c = (r.at>=3 && r.cp>=3) ? '#047857' : (r.at>=3 || r.cp>=3) ? '#b45309' : '#b91c1c';
    s += '<circle cx="'+X(r.at)+'" cy="'+Y(r.cp)+'" r="'+r0.toFixed(1)+'" fill="'+c+'" fill-opacity="0.18" stroke="'+c+'" stroke-width="1.5"/>';
    s += '<text x="'+X(r.at)+'" y="'+(Y(r.cp)+4)+'" font-size="12.5" font-weight="700" fill="'+CX.ink+'" text-anchor="middle">'+esc(r.name)+'</text>';
    s += '<text x="'+X(r.at)+'" y="'+(Y(r.cp)+r0+18)+'" font-size="10.5" fill="'+CX.mute+'" text-anchor="middle">'+r.at+'/'+r.cp+' · '+r.size+'</text>';
  });
  s += '</svg>';
  return s;
}

/* ============================================================
 * 工具 3：营销日历倒排
 * ============================================================ */
var CAL_NODES = [
  {n:'元旦', md:'01-01'}, {n:'年货节', md:'01-20'}, {n:'情人节', md:'02-14'},
  {n:'春节（农历）', md:'02-17'}, {n:'妇女节', md:'03-08'}, {n:'五一', md:'05-01'},
  {n:'母亲节', md:'05-10'}, {n:'618 大促', md:'06-18'}, {n:'818 大促', md:'08-18'},
  {n:'七夕（农历）', md:'08-19'}, {n:'开学季', md:'09-01'}, {n:'99 大促', md:'09-09'},
  {n:'中秋（农历）', md:'09-25'}, {n:'国庆', md:'10-01'}, {n:'双 11', md:'11-11'},
  {n:'双 12', md:'12-12'}, {n:'圣诞', md:'12-25'}
];
function todayYMD(){
  var d = new Date();
  return {y:d.getFullYear(), m:d.getMonth()+1, d:d.getDate()};
}
function calcCal(){
  var y = todayYMD().y;
  var picked = [];
  var sel = $('#cal_pick');
  if(sel){ [].forEach.call(sel.options, function(o){ if(o.selected) picked.push(o.value); }); }
  var nodes = picked.map(function(v){
    var hit = CAL_NODES.filter(function(x){ return x.n === v; })[0];
    return hit ? {n:hit.n, md:hit.md} : null;
  }).filter(Boolean);
  parseRows($('#cal_custom').value).forEach(function(r){
    if(r[0] && r[1]) nodes.push({n:r[0], md:r[1]});
  });
  if(!nodes.length) return null;
  var lead = parseInt(($('#cal_lead')||{value:'30'}).value, 10) || 30;

  var t = new Date(); t.setHours(0,0,0,0);
  nodes.forEach(function(nd){
    var mmdd = String(nd.md).split('-');
    var m = parseInt(mmdd[0],10), d = parseInt(mmdd[1],10);
    var dt = new Date(y, (m||1)-1, d||1);
    if(dt < t) dt = new Date(y+1, (m||1)-1, d||1);
    nd.date = dt;
    nd.days = Math.round((dt - t) / 86400000);
    nd.tasks = [
      {t:'D-' + lead,     d:'选题与卖点确定、目标与预算锁定'},
      {t:'D-' + Math.round(lead*0.7), d:'素材筹备、达人/资源对接'},
      {t:'D-' + Math.round(lead*0.45), d:'内容制作与一审、落地页就绪'},
      {t:'D-7',           d:'预热发布、社群/私域蓄水'},
      {t:'D-1',           d:'冲刺检查：库存、链接、客服话术'},
      {t:'D 日',          d:'正式上线，实时监控数据'},
      {t:'D+7',           d:'复盘：达成率、归因、沉淀进知识库'}
    ];
    nd.tasks.forEach(function(x){ x.days = nd.days - (parseInt(String(x.t).replace(/[^0-9]/g,''),10) || 0); });
  });
  nodes.sort(function(a,b){ return a.date - b.date; });
  return {nodes:nodes, year:y, lead:lead, svg:svgCal(nodes, y)};
}

function calReport(c){
  var out = '# 📅 营销日历倒排 · 分析结论\n\n';
  out += '基准日期：' + todayStr() + '　｜　筹备周期：D-' + c.lead + '\n\n';
  out += '### 节点一览\n\n';
  out += '| 节点 | 日期 | 倒计时 | 状态 |\n|---|---|---|---|\n';
  c.nodes.forEach(function(nd){
    var st = nd.days <= 0 ? '🔴 已过/今日' : nd.days <= c.lead ? '🟠 筹备中' : nd.days <= 60 ? '🔵 待启动' : '⚪ 未开始';
    out += '| ' + nd.n + ' | ' + (nd.date.getMonth()+1) + '月' + nd.date.getDate() + '日 | ' + nd.days + ' 天 | ' + st + ' |\n';
  });
  out += '\n';
  c.nodes.slice(0, 4).forEach(function(nd){
    out += '### ' + nd.n + '（' + (nd.date.getMonth()+1) + '/' + nd.date.getDate() + '，还有 ' + nd.days + ' 天）\n\n';
    nd.tasks.forEach(function(x){ out += '- **' + x.t + '**　' + x.d + '　（距今 ' + x.days + ' 天）\n'; });
    out += '\n';
  });
  out += '---\n\n**说明**：农历节点（春节/七夕/中秋）按 2026 年公历日期，跨年使用请手动校正。\n';
  out += '已过去的节点自动顺延到下一年。\n\n';
  out += '💡 把倒排结果存进知识库，下次同类节点可直接复用。';
  return out;
}

function svgCal(nodes, y){
  var W = 940, pad = 56, top = 122;
  var H = Math.max(420, top + 150 + nodes.length * 58);
  var pw = W - pad*2;
  var s = '<svg xmlns="http://www.w3.org/2000/svg" width="'+W+'" height="'+H+'" viewBox="0 0 '+W+' '+H+'" font-family="PingFang SC,Microsoft YaHei,sans-serif">';
  s += cxFrame(W,H,'营销日历 · 节点倒排','MARKETING CALENDAR '+y+' · '+todayStr());

  // 月份轴
  var X = function(d){ return pad + ((d.getMonth() + d.getDate()/31) / 12) * pw; };
  var MON = ['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月'];
  s += '<line x1="'+pad+'" y1="'+(top+58)+'" x2="'+(pad+pw)+'" y2="'+(top+58)+'" stroke="'+CX.line+'"/>';
  for(var m=0;m<12;m++){
    var x = pad + (m/12)*pw;
    s += '<line x1="'+x+'" y1="'+(top+52)+'" x2="'+x+'" y2="'+(top+64)+'" stroke="'+CX.line+'"/>';
    s += '<text x="'+(x + pw/24)+'" y="'+(top+80)+'" font-size="11" fill="'+CX.mute+'" text-anchor="middle">'+MON[m]+'</text>';
  }

  nodes.forEach(function(nd, i){
    var yy = top + 130 + i*58;
    var nx = X(nd.date);
    var leadDays = 30;
    var sx = X(new Date(nd.date.getTime() - leadDays*86400000));
    var c = nd.days <= 0 ? '#b91c1c' : nd.days <= leadDays ? '#b45309' : '#1e3a8a';
    // 筹备条
    s += '<rect x="'+sx.toFixed(1)+'" y="'+(yy-11)+'" width="'+Math.max(6,(nx-sx)).toFixed(1)+'" height="22" rx="3" fill="'+c+'" fill-opacity="0.14"/>';
    s += '<rect x="'+sx.toFixed(1)+'" y="'+(yy-11)+'" width="3" height="22" fill="'+c+'" fill-opacity="0.5"/>';
    // 节点点
    s += '<circle cx="'+nx.toFixed(1)+'" cy="'+yy+'" r="7" fill="'+c+'"/>';
    s += '<circle cx="'+nx.toFixed(1)+'" cy="'+yy+'" r="7" fill="none" stroke="#fff" stroke-width="2"/>';
    // 标签
    var lx = nx + 14;
    var anchor = 'start';
    if(lx > W - 190){ lx = nx - 14; anchor = 'end'; }
    s += '<text x="'+lx.toFixed(1)+'" y="'+(yy+5)+'" font-size="13.5" font-weight="700" fill="'+CX.ink+'" text-anchor="'+anchor+'">'+esc(nd.n)+'</text>';
    s += '<text x="'+lx.toFixed(1)+'" y="'+(yy-8)+'" font-size="11" fill="'+CX.mute+'" text-anchor="'+anchor+'">'+(nd.date.getMonth()+1)+'/'+nd.date.getDate()+' · 还有 '+nd.days+' 天</text>';
  });
  s += '<text x="'+pad+'" y="'+(H-64)+'" font-size="11" fill="'+CX.mute+'">浅色条 = 前 30 天筹备期　·　实心点 = 节点当日</text>';
  s += '</svg>';
  return s;
}

/* ============================================================
 * Function Schema —— 让分析工具可被 Agent 调用
 * ============================================================ */
function toolSchema(k){
  var sch = {
    comp:{name:'analyze_competitor_matrix',
      description:'输入竞品在各维度的打分与权重，输出加权排名、机会点与威胁点。用于竞品对比分析。',
      parameters:{type:'object', properties:{
        dimensions:{type:'array', description:'评估维度', items:{type:'object', properties:{name:{type:'string'},weight:{type:'number',description:'权重百分比'}},required:['name','weight']}},
        competitors:{type:'array', description:'竞品及其在各维度的得分(1-5)，第一项视为我方', items:{type:'object', properties:{name:{type:'string'},scores:{type:'array',items:{type:'number'}}},required:['name','scores']}}
      }, required:['dimensions','competitors']},
      returns:{ranking:'按加权总分降序', opportunities:'我方≥4且竞品均分≤3的维度', threats:'我方≤2且最强对手≥4的维度'}},
    stp:{name:'evaluate_market_segments',
      description:'用 GE 矩阵评估多个细分市场，输出优先级排序与投入建议。用于 STP 市场选择。',
      parameters:{type:'object', properties:{
        segments:{type:'array', items:{type:'object', properties:{
          name:{type:'string'}, attractiveness:{type:'number',description:'市场吸引力1-5'},
          competitiveness:{type:'number',description:'自身竞争力1-5'}, size:{type:'number',description:'市场规模'}},required:['name','attractiveness','competitiveness','size']}}
      }, required:['segments']},
      returns:{ranked:'按优先级分降序', action:'重点投入/提升能力/维持收割/谨慎或放弃'}},
    cal:{name:'plan_marketing_calendar',
      description:'根据营销节点自动倒排筹备任务并计算倒计时。用于营销日历排期。',
      parameters:{type:'object', properties:{
        nodes:{type:'array', items:{type:'object', properties:{name:{type:'string'},date:{type:'string',description:'MM-DD'}}},required:['name','date']},
        lead_days:{type:'number', description:'筹备周期天数，默认30'}
      }, required:['nodes']},
      returns:{nodes:'按日期升序，每个含 days_remaining 与 tasks 倒排列表'}}
  };
  var o = sch[k] || sch.comp;
  return '# Function Schema · ' + o.name + '\n\n```json\n' + JSON.stringify({
    type:'function', function:{
      name:o.name, description:o.description, parameters:o.parameters
    }, returns:o.returns
  }, null, 2) + '\n```\n\n**用途**：这个 schema 描述了一个确定性函数 —— 同样的输入永远得到同样的输出，\n'
    + '不依赖 LLM 的自由发挥。Agent 负责决定「什么时候调用它」，函数负责保证「算出来的结果可靠」。\n\n'
    + '在当前页面，这个函数由本地 JS 直接执行；接入 Agent 后，它可以作为一个 tool 被模型调用。';
}

/* ---------- 工具：运行 / 渲染 / 导出 ---------- */
var lastToolSvg = '';
var lastCalRes = null;   // 最近一次日历倒排结果，供「存入日历」使用
function runTool(){
  var k = state.tool.type;
  var res = null, report = '';
  if(k === 'comp'){ res = calcComp(); if(res) report = compReport(res); }
  else if(k === 'stp'){ res = calcStp(); if(res) report = stpReport(res); }
  else { res = calcCal(); if(res) report = calReport(res); }

  if(!res){
    lastCalRes = null;
    var ti2 = $('#btnToolToCal'); if(ti2) ti2.style.display = 'none';
    setPreview('# ⚠️ 数据不足\n\n请先填好数据（或点「📋 填入示例」看看格式），再运行分析。\n\n' +
      (k==='comp' ? '需要：至少 1 个维度 + 至少 2 个竞品，每个竞品的分数个数要与维度数一致。\n'
      : k==='stp' ? '需要：至少 2 个细分市场，每行格式为「名称,吸引力,竞争力,规模」。\n'
      : '需要：至少选择 1 个节点，或填写自定义节点。\n'));
    toast('数据不足，请先填写'); return;
  }
  lastToolSvg = res.svg;
  lastCalRes = (k === 'cal') ? res : null;
  var ti = $('#btnToolToCal');
  if(ti) ti.style.display = (k === 'cal') ? '' : 'none';
  $('#toolChartWrap').innerHTML = res.svg;
  setPreview(report);
  pushHistory('分析 · ' + (TOOL_TYPES.filter(function(x){return x.k===k;})[0]||{}).n, report);
  saveToolData();
  toast('分析完成');
}
function saveToolData(){
  var t = state.tool;
  if(t.type==='comp'){ t.comp = {dims:$('#cp_dims').value, rows:$('#cp_rows').value}; }
  if(t.type==='stp'){ t.stp = {rows:$('#st_rows').value}; }
  if(t.type==='cal'){
    var picked = [];
    var sel = $('#cal_pick');
    if(sel){ [].forEach.call(sel.options, function(o){ if(o.selected) picked.push(o.value); }); }
    t.cal = {picked:picked, custom:$('#cal_custom').value, lead:$('#cal_lead').value};
  }
  save();
}
function restoreTool(){
  var t = state.tool;
  $('#cp_dims').value = t.comp.dims || '';
  $('#cp_rows').value = t.comp.rows || '';
  $('#st_rows').value = t.stp.rows || '';
  var sel = $('#cal_pick');
  if(sel){
    sel.innerHTML = '';
    CAL_NODES.forEach(function(n){
      var o = document.createElement('option');
      o.value = n.n; o.textContent = n.n + '　（' + n.md.replace('-','/') + '）';
      if((t.cal.picked||[]).indexOf(n.n) > -1) o.selected = true;
      sel.appendChild(o);
    });
  }
  $('#cal_custom').value = t.cal.custom || '';
  $('#cal_lead').value = t.cal.lead || '30';
  showToolForm();
}
function showToolForm(){
  var k = state.tool.type;
  $('#tfComp').style.display = k==='comp' ? '' : 'none';
  $('#tfStp').style.display  = k==='stp'  ? '' : 'none';
  $('#tfCal').style.display  = k==='cal'  ? '' : 'none';
}
function renderToolChips(){
  var host = $('#toolChips'); if(!host) return;
  host.innerHTML = '';
  TOOL_TYPES.forEach(function(t){
    var b = document.createElement('button');
    b.className = 'chip' + (state.tool.type === t.k ? ' is-on' : '');
    b.textContent = t.n; b.title = t.d;
    b.onclick = function(){
      saveToolData(); state.tool.type = t.k; restoreTool(); renderToolChips();
      $('#toolChartWrap').innerHTML = '<div class="chartph">👈 数据已切换，点「⚡ 运行分析」</div>';
      save();
    };
    host.appendChild(b);
  });
}
function renderStratMode(){
  var host = $('#stratMode'); if(!host) return;
  host.innerHTML = '';
  [{k:'prompt', n:'📝 提示词模式'}, {k:'calc', n:'🧮 计算模式'}].forEach(function(m){
    var b = document.createElement('button');
    b.className = 'chip' + (state.stratMode === m.k ? ' is-on' : '');
    b.textContent = m.n;
    b.onclick = function(){
      state.stratMode = m.k;
      $('#stratPromptMode').style.display = m.k==='prompt' ? '' : 'none';
      $('#stratCalcMode').style.display   = m.k==='calc'   ? '' : 'none';
      renderStratMode(); save();
    };
    host.appendChild(b);
  });
}
var TOOL_DEMO = {
  comp:{dims:'价格力,30\n产品功能,25\n渠道覆盖,20\n内容营销,15\n品牌口碑,10',
        rows:'我方,4,3,2,5,3\n竞品A,5,4,4,3,5\n竞品B,3,2,3,2,2\n竞品C,4,4,2,3,4'},
  stp:{rows:'一线白领,5,4,800\n下沉新中产,4,2,1200\n学生群体,3,5,300\n高端小众,2,4,120\n银发人群,2,2,500\n小微商家,4,3,450'},
  cal:{custom:'品牌周年庆,10-24\n新品首发,04-08'}
};
