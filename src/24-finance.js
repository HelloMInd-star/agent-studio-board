/* ============================================================
 * 营销财务测算 —— 四个高频场景，纯手写 SVG，零依赖
 *   1. GMV 拆解（瀑布图）—— 增量归因，不是简单相减
 *   2. LTV / CAC（仪表盘 + 回本周期）
 *   3. 预算分配矩阵（热力图 + 行和校验）
 *   4. 渠道效率雷达（多维归一化）
 * 不做：3D、桑基、树图、甘特、气泡（已有模块覆盖或扭曲数据）
 * ============================================================ */

function fin(){
  if(!state.fin) state.fin = {
    gmv:{pT:'', pC:'', pA:'', pR:'', nT:'', nC:'', nA:'', nR:''},
    ltv:{aov:'', freq:'', life:'', gm:'', cac:'', ret:''},
    budget:{goals:'品牌曝光,销售转化,私域沉淀', rows:'抖音,35,20,15\n小红书,20,30,25\n公众号,10,15,30\n视频号,20,20,20'},
    radar:{dims:'CPM,CPC,CPL,ROI,转化率',
           rows:'抖音,80,60,70,85,75\n小红书,65,75,85,70,80\n公众号,90,80,60,60,65\n视频号,70,70,75,65,70'}
  };
  return state.fin;
}

/* ============================================================
 * 1. GMV 拆解（瀑布图）
 * 核心：多因子增量归因。各因子贡献之和必须等于总增量，
 *      不能简单相减（那会产生无法解释的残差）
 * ============================================================ */
function calcGmv(){
  var G = fin().gmv;
  var num = function(id){ var e=$(id); return e ? (parseFloat(e.value)||0) : 0; };
  var p = {T:num('#g_pT'), C:num('#g_pC'), A:num('#g_pA'), R:num('#g_pR')};
  var n = {T:num('#g_nT'), C:num('#g_nC'), A:num('#g_nA'), R:num('#g_nR')};
  G.pT=p.T; G.pC=p.C; G.pA=p.A; G.pR=p.R;
  G.nT=n.T; G.nC=n.C; G.nA=n.A; G.nR=n.R;
  save();

  var host = $('#gmvOut');
  var gmv = function(x){ return x.T * (x.C/100) * x.A * (1 - x.R/100); };
  var base = gmv(p), now = gmv(n);
  if(!p.T || !n.T){
    if(host) host.innerHTML = '<span class="ph">填写上期与本期的流量、转化率、客单价、退货率</span>';
    var c = $('#gmvChart'); if(c) c.innerHTML = '<span class="ph">—</span>';
    return null;
  }

  /* --- 归因算法：逐因子替换法（sequential replacement）---
   * 按 流量 → 转化率 → 客单价 → 退货率 的顺序，
   * 每次只把一个因子从上期换成本期，其余保持上期值。
   * 贡献 = 替换后的 GMV - 替换前的 GMV
   * 这样四个因子贡献之和 ≡ 总增量，无残差。
   */
  var steps = [];
  var cur = {T:p.T, C:p.C, A:p.A, R:p.R};
  var prevVal = base;
  var order = [
    {k:'T', n:'流量',   fmt:function(d){ return fmtInt(d); }},
    {k:'C', n:'转化率', fmt:function(d){ return d.toFixed(2) + 'pp'; }},
    {k:'A', n:'客单价', fmt:function(d){ return '¥' + d.toFixed(1); }},
    /* 退货率：正常显示数值（上升是负向，但贡献列已带符号，这里不重复加负号） */
    {k:'R', n:'退货率', fmt:function(d){ return d.toFixed(2) + 'pp'; }}
  ];
  order.forEach(function(o){
    cur[o.k] = n[o.k];
    var v = gmv(cur);
    var d = v - prevVal;
    steps.push({
      n:o.n, d:d, val:v,
      detail:o.k === 'C' || o.k === 'R'
        ? (o.fmt(p[o.k]) + ' → ' + o.fmt(n[o.k]))
        : (o.fmt(p[o.k]) + ' → ' + o.fmt(n[o.k])),
      sign:d >= 0 ? '+' : ''
    });
    prevVal = v;
  });

  var total = now - base;
  var sumD = steps.reduce(function(a,s){ return a + s.d; }, 0);
  var resid = total - sumD;   // 理论上应为 0，用于自检

  /* 图 */
  var c2 = $('#gmvChart');
  if(c2) c2.innerHTML = svgWaterfall(base, steps, now);

  /* 文字 */
  var o = [];
  o.push('### 📊 GMV 增量拆解');
  o.push('');
  o.push('> 上期 **' + fmtMoney(base) + '**　→　本期 **' + fmtMoney(now) +
         '**　（' + (total >= 0 ? '+' : '') + fmtMoney(total) + '）');
  o.push('');
  o.push('| 因子 | 变化 | 对 GMV 贡献 | 占比 |');
  o.push('|---|---|---|---|');
  steps.forEach(function(s){
    var pct = total !== 0 ? (s.d / total * 100) : 0;
    o.push('| ' + s.n + ' | ' + s.detail + ' | **' + (s.d >= 0 ? '+' : '') + fmtMoney(s.d) +
           '** | ' + pct.toFixed(0) + '% |');
  });
  o.push('| **合计** | — | **' + (total >= 0 ? '+' : '') + fmtMoney(total) + '** | 100% |');
  o.push('');
  o.push('### 归因说明');
  o.push('');
  o.push('采用**逐因子替换法**：按 流量 → 转化率 → 客单价 → 退货率 的顺序，');
  o.push('每次只替换一个因子，贡献 = 替换后 GMV − 替换前 GMV。');
  o.push('这样各因子贡献之和 **恒等于** 总增量，不产生无法解释的残差。');
  o.push('');
  if(Math.abs(resid) > 0.01){
    o.push('> ⚠️ 自检发现残差 ' + resid.toFixed(2) + '，请检查输入。');
  }
  /* 结论 */
  var sorted = steps.slice().sort(function(a,b){ return Math.abs(b.d) - Math.abs(a.d); });
  var top = sorted[0];
  o.push('### 结论');
  o.push('');
  if(total === 0){
    o.push('本期 GMV 与上期持平。');
  } else {
    o.push('- **主要驱动**：' + top.n + '（贡献 ' + (top.d >= 0 ? '+' : '') + fmtMoney(top.d) +
           '，占总增量 ' + (Math.abs(total) > 0 ? (top.d/total*100).toFixed(0) : '0') + '%）');
    var neg = steps.filter(function(s){ return s.d < 0; });
    if(neg.length){
      o.push('- **拖累项**：' + neg.map(function(s){
        return s.n + '（' + fmtMoney(s.d) + '）';
      }).join('、') + ' → 需优先排查');
    } else {
      o.push('- 无拖累项，四个因子均为正向贡献。');
    }
    o.push('- **下一步**：' + (top.n === '流量' ? '流量是主因，检查是投放加大还是自然流量增长，判断可持续性' :
           top.n === '转化率' ? '转化率是主因，值得沉淀为可复用方法论（话术/详情页/人群）' :
           top.n === '客单价' ? '客单价是主因，检查是涨价还是结构升级（高价品占比提升更健康）' :
           '退货率是主因，需排查商品质量/描述一致性/物流'));
  }
  if(host) host.innerHTML = mdLite(o.join('\n'));
  return {base:base, now:now, total:total, steps:steps};
}

/* 瀑布图 */
function svgWaterfall(base, steps, now){
  var W = 880, H = 430;
  var padL = 70, padR = 30, padT = 58, padB = 76;
  var pw = W - padL - padR, ph = H - padT - padB;
  var items = [{n:'上期', v:base, type:'total'}];
  steps.forEach(function(s){ items.push({n:s.n, v:s.d, type:(s.d>=0?'up':'down')}); });
  items.push({n:'本期', v:now, type:'total'});

  var maxV = 0, minV = 0, run = 0;
  items.forEach(function(it){
    if(it.type === 'total'){ run = it.v; }
    else { var a = run, b = run + it.v; run = b; maxV = Math.max(maxV, a, b); minV = Math.min(minV, a, b); }
    maxV = Math.max(maxV, it.v, run);
  });
  maxV = Math.max(maxV, now, base) * 1.12 || 1;
  minV = Math.min(minV, 0);
  var rng = maxV - minV || 1;
  var Y = function(v){ return padT + ph - (v - minV) / rng * ph; };

  var s = '<svg xmlns="http://www.w3.org/2000/svg" width="'+W+'" height="'+H+'" viewBox="0 0 '+W+' '+H+'" font-family="PingFang SC,Microsoft YaHei,sans-serif">';
  s += cxFrame(W, H, 'GMV 增量拆解', 'WATERFALL · ' + todayStr());

  var bw = pw / items.length * 0.55;
  var cx = function(i){ return padL + pw / items.length * (i + 0.5); };
  var run2 = 0;

  // 零线
  s += '<line x1="'+padL+'" y1="'+Y(0).toFixed(0)+'" x2="'+(padL+pw)+'" y2="'+Y(0).toFixed(0)+'" stroke="'+CX.line+'"/>';

  items.forEach(function(it, i){
    var x = cx(i) - bw/2;
    if(it.type === 'total'){
      var y0 = Y(0), y1 = Y(it.v);
      var yt = Math.min(y0,y1), hh = Math.abs(y1-y0);
      s += '<rect x="'+x.toFixed(0)+'" y="'+yt.toFixed(0)+'" width="'+bw.toFixed(0)+'" height="'+hh.toFixed(0)+'" fill="'+CX.brand+'" rx="2"/>';
      s += '<text x="'+cx(i).toFixed(0)+'" y="'+(yt-8).toFixed(0)+'" font-size="11" fill="'+CX.ink+'" text-anchor="middle" font-weight="700">'+fmtMoney(it.v)+'</text>';
      run2 = it.v;
    } else {
      var a = run2, b = run2 + it.v;
      var ya = Y(a), yb = Y(b);
      var yt2 = Math.min(ya,yb), hh2 = Math.max(Math.abs(yb-ya), 2);
      var col = it.v >= 0 ? CX.s : CX.t;
      s += '<rect x="'+x.toFixed(0)+'" y="'+yt2.toFixed(0)+'" width="'+bw.toFixed(0)+'" height="'+hh2.toFixed(0)+'" fill="'+col+'" fill-opacity="0.82" rx="2"/>';
      // 连接线
      if(i > 0){
        s += '<line x1="'+(cx(i-1)+bw/2).toFixed(0)+'" y1="'+ya.toFixed(0)+'" x2="'+x.toFixed(0)+'" y2="'+ya.toFixed(0)+'" stroke="'+CX.mute+'" stroke-dasharray="3 2"/>';
      }
      s += '<text x="'+cx(i).toFixed(0)+'" y="'+(it.v>=0?yt2-8:yt2+hh2+15).toFixed(0)+'" font-size="10.5" fill="'+col+'" text-anchor="middle" font-weight="600">'+(it.v>=0?'+':'')+fmtMoney(it.v)+'</text>';
      run2 = b;
    }
    s += '<text x="'+cx(i).toFixed(0)+'" y="'+(H-46)+'" font-size="11" fill="'+CX.sub+'" text-anchor="middle">'+esc(it.n)+'</text>';
  });
  s += '<text x="'+(W-padR)+'" y="'+(H-22)+'" font-size="10" fill="'+CX.mute+'" text-anchor="end">逐因子替换法 · 各因子贡献之和 = 总增量</text>';
  s += '</svg>';
  return s;
}

/* ============================================================
 * 2. LTV / CAC
 * ============================================================ */
function calcLtv(){
  var L = fin().ltv;
  var num = function(id){ var e=$(id); return e ? (parseFloat(e.value)||0) : 0; };
  L.aov = num('#l_aov'); L.freq = num('#l_freq'); L.life = num('#l_life');
  L.gm = num('#l_gm');   L.cac = num('#l_cac');   L.ret = num('#l_ret');
  save();

  var host = $('#ltvOut');
  if(!L.aov || !L.cac){
    if(host) host.innerHTML = '<span class="ph">填写客单价与获客成本后自动计算</span>';
    var c = $('#ltvGauge'); if(c) c.innerHTML = '<span class="ph">—</span>';
    return null;
  }
  /* LTV = 客单价 × 年复购次数 × 生命周期(年) × 毛利率
   * 用毛利率而非营收，是因为行业惯例以毛利口径衡量回收能力
   */
  var gmRate = L.gm ? (L.gm/100) : 0.5;
  var ltv = L.aov * (L.freq || 1) * (L.life || 1) * gmRate;
  var ratio = ltv / L.cac;
  // 回本周期（月）：单客月毛利 = 客单×复购/12×毛利率
  var monthProfit = L.aov * (L.freq || 1) / 12 * gmRate;
  var payback = monthProfit > 0 ? (L.cac / monthProfit) : Infinity;
  // 存续期判断
  var lifeM = (L.life || 1) * 12;

  var o = [];
  o.push('### 💰 LTV / CAC 测算');
  o.push('');
  o.push('| 指标 | 数值 | 说明 |');
  o.push('|---|---|---|');
  o.push('| 客单价 | ¥' + L.aov + ' | — |');
  o.push('| 年复购次数 | ' + (L.freq||1) + ' 次 | — |');
  o.push('| 生命周期 | ' + (L.life||1) + ' 年 | — |');
  o.push('| 毛利率 | ' + (L.gm||50) + '% | 未填按 50% 计 |');
  o.push('| **LTV（毛利口径）** | **¥' + ltv.toFixed(0) + '** | 客单 × 复购 × 年限 × 毛利率 |');
  o.push('| **CAC** | **¥' + L.cac + '** | — |');
  o.push('| **LTV / CAC** | **' + ratio.toFixed(2) + '** | ' + ltvVerdict(ratio).t + ' |');
  o.push('| 回本周期 | ' + (payback === Infinity ? '—' : payback.toFixed(1) + ' 个月') +
         ' | ' + (payback <= lifeM ? '✅ 短于生命周期' : '⚠️ 长于生命周期') + ' |');
  o.push('');
  o.push('### 判定');
  o.push('');
  var v = ltvVerdict(ratio);
  o.push('- **' + v.t + '**：' + v.d);
  if(payback !== Infinity && payback > lifeM){
    o.push('- ⚠️ **回本周期 ' + payback.toFixed(1) + ' 个月 > 生命周期 ' + lifeM +
           ' 个月**：用户在回本前就流失了，这个模型不成立');
  }
  if(L.ret){
    o.push('- 留存率 ' + L.ret + '%（已记录，可用于更精细的留存曲线测算）');
  }
  o.push('');
  o.push('> 口径说明：LTV 采用**毛利口径**（× 毛利率），因为判断获客是否划算应看能回收多少毛利。');
  o.push('> 若你的行业惯例用营收口径，把毛利率填 100% 即可。');
  if(host) host.innerHTML = mdLite(o.join('\n'));

  var c3 = $('#ltvGauge');
  if(c3) c3.innerHTML = svgGauge(ratio, ltv, L.cac);
  return {ltv:ltv, cac:L.cac, ratio:ratio, payback:payback};
}

function ltvVerdict(r){
  if(r < 1)  return {t:'🔴 严重失衡（<1）', d:'获客成本高于用户终身价值，每获一客净亏钱。必须立刻降 CAC 或提 LTV，否则规模越大亏损越大。'};
  if(r < 3)  return {t:'🟡 偏低（1-3）', d:'能回本但余量薄，抗风险能力弱。行业普遍认为 3 是健康线。'};
  if(r < 5)  return {t:'🟢 健康（3-5）', d:'获客效率良好，可适度加大投放规模。'};
  return {t:'🟢 优秀（>5）', d:'获客效率很高，通常意味着 **投放不足** —— 建议加大预算抢占份额，而不是继续优化效率。'};
}

/* 仪表盘 */
function svgGauge(ratio, ltv, cac){
  var W = 620, H = 340;
  var cx0 = W/2, cy0 = 208, R = 132;
  var s = '<svg xmlns="http://www.w3.org/2000/svg" width="'+W+'" height="'+H+'" viewBox="0 0 '+W+' '+H+'" font-family="PingFang SC,Microsoft YaHei,sans-serif">';
  s += cxFrame(W, H, 'LTV / CAC 健康度', 'UNIT ECONOMICS · ' + todayStr());

  var maxR = 8;
  var ang = function(v){ var r = Math.min(v, maxR); return Math.PI * (1 - r/maxR); };
  var P = function(v, rr){
    var a = ang(v);
    return [cx0 + Math.cos(a) * (rr||R), cy0 - Math.sin(a) * (rr||R)];
  };
  // 轨道
  var p0 = P(0), p1 = P(maxR);
  s += '<path d="M '+p0[0].toFixed(0)+' '+p0[1].toFixed(0)+' A '+R+' '+R+' 0 0 1 '+p1[0].toFixed(0)+' '+p1[1].toFixed(0)+
       '" fill="none" stroke="'+CX.line+'" stroke-width="22" stroke-linecap="round"/>';
  // 分区参考：<1 红, 1-3 黄, 3-5 绿, >5 深绿
  var segs = [[0,1,CX.t],[1,3,CX.w],[3,5,CX.s],[5,maxR,'#065f46']];
  segs.forEach(function(g){
    var a = P(g[0]), b = P(g[1]);
    s += '<path d="M '+a[0].toFixed(0)+' '+a[1].toFixed(0)+' A '+R+' '+R+' 0 0 1 '+b[0].toFixed(0)+' '+b[1].toFixed(0)+
         '" fill="none" stroke="'+g[2]+'" stroke-width="22" stroke-opacity="0.22"/>';
  });
  // 实际值
  var pv = P(ratio);
  s += '<path d="M '+p0[0].toFixed(0)+' '+p0[1].toFixed(0)+' A '+R+' '+R+' 0 0 1 '+pv[0].toFixed(0)+' '+pv[1].toFixed(0)+
       '" fill="none" stroke="'+(ratio<1?CX.t:ratio<3?CX.w:CX.s)+'" stroke-width="22" stroke-linecap="round"/>';
  // 指针
  var pn = P(ratio, R-16);
  s += '<line x1="'+cx0+'" y1="'+cy0+'" x2="'+pn[0].toFixed(0)+'" y2="'+pn[1].toFixed(0)+'" stroke="'+CX.ink+'" stroke-width="2.5"/>';
  s += '<circle cx="'+cx0+'" cy="'+cy0+'" r="7" fill="'+CX.ink+'"/>';

  // 数值
  s += '<text x="'+cx0+'" y="'+(cy0-30)+'" font-size="42" font-weight="700" fill="'+CX.ink+'" text-anchor="middle">'+ratio.toFixed(2)+'</text>';
  s += '<text x="'+cx0+'" y="'+(cy0-8)+'" font-size="12" fill="'+CX.mute+'" text-anchor="middle">LTV / CAC</text>';
  // 刻度
  [0,1,3,5,8].forEach(function(v){
    var a = P(v, R+18);
    s += '<text x="'+a[0].toFixed(0)+'" y="'+(a[1]+4).toFixed(0)+'" font-size="10" fill="'+CX.mute+'" text-anchor="middle">'+v+'</text>';
  });
  // 底部指标
  s += '<text x="'+(cx0-90)+'" y="278" font-size="11" fill="'+CX.mute+'" text-anchor="middle">LTV ¥'+ltv.toFixed(0)+'</text>';
  s += '<text x="'+(cx0+90)+'" y="278" font-size="11" fill="'+CX.mute+'" text-anchor="middle">CAC ¥'+cac+'</text>';
  s += '<text x="'+cx0+'" y="302" font-size="10" fill="'+CX.mute+'" text-anchor="middle">健康线 3.0　·　毛利口径</text>';
  s += '</svg>';
  return s;
}

/* ============================================================
 * 3. 预算分配矩阵（热力图 + 行和校验）
 * ============================================================ */
function calcBudget(){
  var B = fin().budget;
  B.goals = ($('#b_goals') && $('#b_goals').value) || B.goals;
  B.rows  = ($('#b_rows')  && $('#b_rows').value)  || B.rows;
  save();
  var goals = B.goals.split(/[,，]/).map(function(x){ return x.trim(); }).filter(Boolean);
  var rows = parseRows(B.rows).map(function(r){
    return {n:r[0]||'', vals:goals.map(function(_, i){ return parseFloat(r[i+1]) || 0; })};
  }).filter(function(r){ return r.n; });

  var host = $('#budgetOut');
  if(!goals.length || !rows.length){
    if(host) host.innerHTML = '<span class="ph">填写目标列与渠道行</span>';
    var c = $('#budgetChart'); if(c) c.innerHTML = '<span class="ph">—</span>';
    return null;
  }
  // 校验：每行合计应为 100%
  var warns = [];
  rows.forEach(function(r){
    var sum = r.vals.reduce(function(a,b){ return a+b; }, 0);
    r.sum = sum;
    if(Math.abs(sum - 100) > 0.5) warns.push(r.n + ' 合计 ' + sum.toFixed(0) + '%');
  });

  var o = [];
  o.push('### 🧮 预算分配矩阵');
  o.push('');
  o.push('| 渠道 ＼ 目标 |' + goals.map(function(g){ return ' ' + g + ' |'; }).join('') + ' 合计 |');
  o.push('|---|' + goals.map(function(){ return '---|'; }).join('') + '---|');
  rows.forEach(function(r){
    var bad = Math.abs(r.sum - 100) > 0.5;
    o.push('| **' + r.n + '** |' + r.vals.map(function(v){ return ' ' + v + '% |'; }).join('') +
           ' ' + (bad ? '⚠️ ' : '✅ ') + r.sum.toFixed(0) + '% |');
  });
  o.push('');
  if(warns.length){
    o.push('> ⚠️ 以下渠道合计不为 100%：' + warns.join('、'));
  } else {
    o.push('> ✅ 所有渠道合计均为 100%。');
  }
  o.push('');
  /* 目标维度汇总：看出钱主要流向哪个目标 */
  var colSum = goals.map(function(_, i){
    return rows.reduce(function(a,r){ return a + r.vals[i]; }, 0);
  });
  var colAvg = colSum.map(function(v){ return v / rows.length; });
  o.push('**各目标平均占比**：');
  o.push('');
  goals.forEach(function(g, i){
    o.push('- ' + g + '：**' + colAvg[i].toFixed(1) + '%**');
  });
  var maxI = colAvg.indexOf(Math.max.apply(null, colAvg));
  var minI = colAvg.indexOf(Math.min.apply(null, colAvg));
  o.push('');
  o.push('> 资源最集中在「' + goals[maxI] + '」，最弱的是「' + goals[minI] + '」。');
  o.push('> 检查是否与当前阶段目标一致——成长期通常应偏销售转化，成熟期才加大品牌曝光。');

  if(host) host.innerHTML = mdLite(o.join('\n'));
  var c2 = $('#budgetChart');
  if(c2) c2.innerHTML = svgHeat(rows, goals);
  return {rows:rows, goals:goals, colAvg:colAvg};
}

/* 热力图 */
function svgHeat(rows, goals){
  var W = 880, H = 180 + rows.length * 46;
  var padL = 128, padT = 56, cw = (W - padL - 40) / goals.length, ch = 40;
  var s = '<svg xmlns="http://www.w3.org/2000/svg" width="'+W+'" height="'+H+'" viewBox="0 0 '+W+' '+H+'" font-family="PingFang SC,Microsoft YaHei,sans-serif">';
  s += cxFrame(W, H, '预算分配热力矩阵', 'BUDGET ALLOCATION · ' + todayStr());
  // 表头
  goals.forEach(function(g, i){
    s += '<text x="'+(padL + cw*i + cw/2).toFixed(0)+'" y="'+(padT+22)+'" font-size="12" fill="'+CX.sub+'" text-anchor="middle" font-weight="600">'+esc(g)+'</text>';
  });
  var maxV = 0;
  rows.forEach(function(r){ r.vals.forEach(function(v){ maxV = Math.max(maxV, v); }); });
  maxV = maxV || 1;
  rows.forEach(function(r, ri){
    var y = padT + 40 + ri * (ch + 6);
    s += '<text x="'+(padL-12)+'" y="'+(y+ch/2+4)+'" font-size="12.5" fill="'+CX.ink+'" text-anchor="end" font-weight="600">'+esc(r.n)+'</text>';
    r.vals.forEach(function(v, ci){
      var x = padL + cw * ci;
      var op = 0.08 + (v / maxV) * 0.72;
      s += '<rect x="'+x.toFixed(0)+'" y="'+y+'" width="'+(cw-6).toFixed(0)+'" height="'+ch+'" fill="'+CX.brand+'" fill-opacity="'+op.toFixed(2)+'" rx="4"/>';
      s += '<text x="'+(x+(cw-6)/2).toFixed(0)+'" y="'+(y+ch/2+4)+'" font-size="12" fill="'+(op>0.45?'#ffffff':CX.ink)+'" text-anchor="middle" font-weight="600">'+v+'%</text>';
    });
    // 合计
    var sx = padL + cw * goals.length;
    var bad = Math.abs(r.sum - 100) > 0.5;
    s += '<text x="'+(sx+8)+'" y="'+(y+ch/2+4)+'" font-size="11" fill="'+(bad?CX.t:CX.s)+'" font-weight="600">'+(bad?'⚠️ ':'✅ ')+r.sum.toFixed(0)+'%</text>';
  });
  s += '<text x="'+(W-40)+'" y="'+(H-16)+'" font-size="10" fill="'+CX.mute+'" text-anchor="end">颜色越深占比越高　·　每行合计应为 100%</text>';
  s += '</svg>';
  return s;
}

/* ============================================================
 * 4. 渠道效率雷达
 * ============================================================ */
function calcRadar(){
  var R = fin().radar;
  R.dims = ($('#r_dims') && $('#r_dims').value) || R.dims;
  R.rows = ($('#r_rows') && $('#r_rows').value) || R.rows;
  save();
  var dims = R.dims.split(/[,，]/).map(function(x){ return x.trim(); }).filter(Boolean);
  var rows = parseRows(R.rows).map(function(r){
    return {n:r[0]||'', vals:dims.map(function(_, i){ return parseFloat(r[i+1]) || 0; })};
  }).filter(function(r){ return r.n; });

  var host = $('#radarOut');
  if(dims.length < 3 || !rows.length){
    if(host) host.innerHTML = '<span class="ph">至少 3 个维度、1 个渠道</span>';
    var c = $('#radarChart'); if(c) c.innerHTML = '<span class="ph">—</span>';
    return null;
  }
  // 归一化：0-100 直接视为分数；若某列含成本类（CPM/CPC/CPL），分越低越好
  var lowerBetter = function(d){ return /cpm|cpc|cpl|成本|cost|cpa/i.test(d); };
  var colMax = dims.map(function(_, i){
    return rows.reduce(function(a,r){ return Math.max(a, r.vals[i]); }, 0) || 1;
  });
  rows.forEach(function(r){
    r.norm = r.vals.map(function(v, i){
      var x = v / colMax[i] * 100;
      return lowerBetter(dims[i]) ? (100 - x) : x;   // 成本类反向
    });
    r.avg = r.norm.reduce(function(a,b){ return a+b; }, 0) / r.norm.length;
  });
  var ranked = rows.slice().sort(function(a,b){ return b.avg - a.avg; });

  var o = [];
  o.push('### 📡 渠道效率雷达');
  o.push('');
  o.push('> 各维度已归一化为 0-100 分。成本类维度（CPM/CPC/CPL）**反向计分**——数值越低得分越高。');
  o.push('');
  o.push('| 排名 | 渠道 |' + dims.map(function(d){ return ' ' + d + ' |'; }).join('') + ' 综合 |');
  o.push('|---|---|' + dims.map(function(d){
    return (lowerBetter(d) ? ' 低优 |' : '---|');
  }).join('') + '---|');
  ranked.forEach(function(r, i){
    o.push('| ' + (i+1) + ' | **' + r.n + '** |' +
      r.vals.map(function(v, k){
        return ' ' + v + '（' + r.norm[k].toFixed(0) + '） |';
      }).join('') + ' **' + r.avg.toFixed(1) + '** |');
  });
  o.push('');
  var best = ranked[0], worst = ranked[ranked.length-1];
  o.push('### 结论');
  o.push('');
  o.push('- **综合最优**：' + best.n + '（' + best.avg.toFixed(1) + ' 分）');
  var bestD = 0, bk = 0;
  best.norm.forEach(function(v, i){ if(v > bestD){ bestD = v; bk = i; } });
  o.push('  - 强在「' + dims[bk] + '」，建议把更多预算挪到这里');
  if(ranked.length > 1){
    o.push('- **综合最弱**：' + worst.n + '（' + worst.avg.toFixed(1) + ' 分）');
    var wD = 100, wk = 0;
    worst.norm.forEach(function(v, i){ if(v < wD){ wD = v; wk = i; } });
    o.push('  - 弱在「' + dims[wk] + '」，若非战略必守可考虑缩减');
  }
  o.push('');
  o.push('> ⚠️ 归一化是**相对排名**，只说明谁比谁好，不代表绝对效率达标。');

  if(host) host.innerHTML = mdLite(o.join('\n'));
  var c2 = $('#radarChart');
  if(c2) c2.innerHTML = svgRadar(rows, dims);
  return {rows:rows, dims:dims, ranked:ranked};
}

/* 雷达图 */
function svgRadar(rows, dims){
  var W = 760, H = 560;
  var cx0 = W/2, cy0 = 300, R = 172;
  var n = dims.length;
  var s = '<svg xmlns="http://www.w3.org/2000/svg" width="'+W+'" height="'+H+'" viewBox="0 0 '+W+' '+H+'" font-family="PingFang SC,Microsoft YaHei,sans-serif">';
  s += cxFrame(W, H, '渠道效率雷达', 'CHANNEL RADAR · ' + todayStr());
  var COLORS = ['#1e3a8a','#047857','#b45309','#7c3aed','#0891b2','#be123c'];
  var ang = function(i){ return -Math.PI/2 + i * 2*Math.PI/n; };
  var P = function(i, r){ return [cx0 + Math.cos(ang(i))*r, cy0 + Math.sin(ang(i))*r]; };

  // 网格
  [0.25,0.5,0.75,1].forEach(function(f){
    var pts = [];
    for(var i=0;i<n;i++){ var p = P(i, R*f); pts.push(p[0].toFixed(0)+','+p[1].toFixed(0)); }
    s += '<polygon points="'+pts.join(' ')+'" fill="none" stroke="'+CX.line+'" stroke-width="1"/>';
  });
  for(var i=0;i<n;i++){
    var p = P(i, R);
    s += '<line x1="'+cx0+'" y1="'+cy0+'" x2="'+p[0].toFixed(0)+'" y2="'+p[1].toFixed(0)+'" stroke="'+CX.line+'"/>';
    var lp = P(i, R+26);
    s += '<text x="'+lp[0].toFixed(0)+'" y="'+(lp[1]+4).toFixed(0)+'" font-size="11.5" fill="'+CX.sub+'" text-anchor="middle" font-weight="600">'+esc(dims[i])+'</text>';
  }
  // 数据
  rows.forEach(function(r, ri){
    var pts = [];
    r.norm.forEach(function(v, i){
      var p = P(i, R * (v/100));
      pts.push(p[0].toFixed(0)+','+p[1].toFixed(0));
    });
    var col = COLORS[ri % COLORS.length];
    s += '<polygon points="'+pts.join(' ')+'" fill="'+col+'" fill-opacity="0.13" stroke="'+col+'" stroke-width="2"/>';
    r.norm.forEach(function(v, i){
      var p = P(i, R * (v/100));
      s += '<circle cx="'+p[0].toFixed(0)+'" cy="'+p[1].toFixed(0)+'" r="3.5" fill="'+col+'"/>';
    });
    // 图例
    var ly = 116 + ri * 20;
    s += '<rect x="'+(W-186)+'" y="'+(ly-9)+'" width="11" height="11" rx="2" fill="'+col+'"/>';
    s += '<text x="'+(W-170)+'" y="'+ly+'" font-size="11" fill="'+CX.sub+'">'+esc(r.n)+'　'+r.avg.toFixed(1)+'</text>';
  });
  s += '<text x="'+cx0+'" y="'+(H-20)+'" font-size="10" fill="'+CX.mute+'" text-anchor="middle">成本类维度已反向计分 · 越靠外越好</text>';
  s += '</svg>';
  return s;
}

/* ---------- 示例 ---------- */
function demoGmv(){
  var set = function(id, v){ var e=$(id); if(e) e.value = v; };
  set('#g_pT','120000'); set('#g_pC','2.20'); set('#g_pA','268'); set('#g_pR','8');
  set('#g_nT','138000'); set('#g_nC','2.45'); set('#g_nA','279'); set('#g_nR','9.2');
  calcGmv(); toast('已填入示例：GMV 增长拆解');
}
function demoLtv(){
  var set = function(id, v){ var e=$(id); if(e) e.value = v; };
  set('#l_aov','268'); set('#l_freq','2.4'); set('#l_life','2');
  set('#l_gm','62');   set('#l_cac','186');  set('#l_ret','35');
  calcLtv(); toast('已填入示例：LTV/CAC');
}

function fmtInt(v){
  if(Math.abs(v) >= 10000) return (v/10000).toFixed(1) + '万';
  return String(Math.round(v));
}
