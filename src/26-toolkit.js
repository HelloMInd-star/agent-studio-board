/* ============================================================
 * 经典营销工具箱 —— 8 个咨询级框架，全部可算 + 出图
 *   1. 波特五力    行业吸引力判断
 *   2. PEST       宏观环境扫描
 *   3. 安索夫矩阵  增长策略选择
 *   4. GE-McKinsey 业务组合九宫格
 *   5. 价值链分析  成本/利润优化
 *   6. 用户旅程地图 体验优化
 *   7. OGSM       战略落地执行
 *   8. 感知地图    品牌定位
 * 所有图表手写 SVG，零依赖
 * ============================================================ */

function tk(){
  if(!state.tk) state.tk = {
    five:{rows:'供应商议价能力,6\n购买者议价能力,7\n新进入者威胁,5\n替代品威胁,4\n同业竞争程度,8'},
    pest:{rows:'政治政策,新广告法趋严,威胁,4\n经济环境,消费降级客单下滑,威胁,3\n社会文化,成分党崛起,机会,5\n技术趋势,AI 内容生产降本,机会,4'},
    ansoff:{rows:'市场渗透,提升复购频次,8,3\n市场开发,下沉渠道拓展,6,5\n产品开发,推出子品牌,7,6\n多元化,跨界联名,5,8'},
    ge:{rows:'直播电商,5,4,800\n私域会员,4,4,400\n线下经销,2,3,600\n跨境业务,5,2,200'},
    vc:{rows:'供应链管理,18,12\n生产制造,25,20\n市场营销,35,12\n销售渠道,12,28\n售后服务,10,28'},
    cj:{rows:'认知,刷到种草笔记,3,信息太杂记不住\n考虑,对比成分表,2,参数看不懂\n决策,犹豫价格,2,不知值不值\n购买,下单支付,4,流程繁琐\n使用,开箱体验,5,包装难拆\n推荐,分享返现,4,没有分享动力'},
    ogsm:{o:'成为细分品类第一',g:'Q4 GMV 破 5000 万',s:'抖音+小红书双平台投放',m:'ROI≥3，CPL≤50'},
    pm:{x:'年轻 ↔ 传统', y:'高端 ↔ 平价',
        rows:'我方,7,6\n竞品A,3,8\n竞品B,8,3\n竞品C,5,5'}
  };
  return state.tk;
}

/* 通用：读 textarea / input */
function tkv(id, fb){ var e=$(id); return e ? (e.value||'') : (fb||''); }
function tkn(v, fb){ var n = parseFloat(v); return isNaN(n) ? (fb||0) : n; }

/* ============================================================
 * 1. 波特五力
 * ============================================================ */
function calcFive(){
  var T = tk().five;
  T.rows = tkv('#k5_rows', T.rows); save();
  var rows = parseRows(T.rows).map(function(r){
    return {n:r[0]||'', v:Math.max(1,Math.min(10, tkn(r[1],5)))};
  }).filter(function(r){ return r.n; });

  var host = $('#k5Out'), ch = $('#k5Chart');
  if(rows.length < 2){
    if(host) host.innerHTML = '<span class="ph">至少填 2 个维度</span>';
    if(ch) ch.innerHTML = '<span class="ph">—</span>'; return null;
  }
  var avg = rows.reduce(function(a,r){ return a + r.v; }, 0) / rows.length;
  /* 行业吸引力 = 100 - 威胁总分占比。五力越高（威胁越大）吸引力越低 */
  var attract = 100 - (avg / 10 * 100);
  var sorted = rows.slice().sort(function(a,b){ return b.v - a.v; });

  var o = [];
  o.push('### ⚔️ 波特五力分析');
  o.push('');
  o.push('| 竞争力量 | 威胁强度 | 分级 |');
  o.push('|---|---|---|');
  rows.forEach(function(r){
    o.push('| ' + r.n + ' | ' + r.v + ' / 10 | ' + fiveTag(r.v) + ' |');
  });
  o.push('| **行业吸引力** | — | **' + attract.toFixed(0) + ' / 100** |');
  o.push('');
  o.push('### 结论');
  o.push('');
  o.push('- **最大威胁**：' + sorted[0].n + '（' + sorted[0].v + '/10）——' + fiveAdvice(sorted[0]));
  o.push('- **最弱环节**：' + sorted[sorted.length-1].n + '（' + sorted[sorted.length-1].v + '/10）');
  o.push('');
  if(attract >= 60){
    o.push('> 🟢 **行业吸引力较高（' + attract.toFixed(0) + '）**：五力整体温和，存在进入或加注空间。');
    o.push('> 但仍需确认：吸引力高往往意味着已有玩家过得不错，进入壁垒在哪？');
  } else if(attract >= 40){
    o.push('> 🟡 **行业吸引力中等（' + attract.toFixed(0) + '）**：进得去但赚得辛苦。');
    o.push('> 建议：要么找到结构性优势（成本/渠道/技术），要么放弃正面竞争。');
  } else {
    o.push('> 🔴 **行业吸引力低（' + attract.toFixed(0) + '）**：五力全面高压，利润空间被挤压。');
    o.push('> 典型红海特征。除非有颠覆性差异化，否则不建议重资产进入。');
  }
  if(host) host.innerHTML = mdLite(o.join('\n'));
  if(ch) ch.innerHTML = svgFive(rows, attract);
  return {rows:rows, attract:attract};
}
function fiveTag(v){
  if(v >= 8) return '🔴 高压';
  if(v >= 6) return '🟠 偏高';
  if(v >= 4) return '🟡 中等';
  return '🟢 温和';
}
function fiveAdvice(r){
  if(r.v >= 8){
    if(r.n.indexOf('供应商') >= 0) return '上游集中度过高，需考虑自建或多元采购';
    if(r.n.indexOf('购买者') >= 0) return '客户议价强，需靠品牌/转换成本锁定';
    if(r.n.indexOf('新进入') >= 0) return '进入门槛低，优势会被快速复制';
    if(r.n.indexOf('替代') >= 0) return '替代品多，需持续证明不可替代性';
    return '同业竞争激烈，价格战风险高，必须找到非价格维度';
  }
  return '当前压力可控，但需持续监控';
}

/* 五边形雷达 */
function svgFive(rows, attract){
  var W = 700, H = 470, cx0 = W/2, cy0 = 258, R = 150;
  var n = rows.length;
  var s = '<svg xmlns="http://www.w3.org/2000/svg" width="'+W+'" height="'+H+'" viewBox="0 0 '+W+' '+H+'" font-family="PingFang SC,Microsoft YaHei,sans-serif">';
  s += cxFrame(W, H, '波特五力 · 行业吸引力', 'FIVE FORCES · ' + todayStr());
  var ang = function(i){ return -Math.PI/2 + i * 2*Math.PI/n; };
  var P = function(i, r){ return [cx0 + Math.cos(ang(i))*r, cy0 + Math.sin(ang(i))*r]; };

  [0.25,0.5,0.75,1].forEach(function(f){
    var pts = [];
    for(var i=0;i<n;i++){ var p = P(i, R*f); pts.push(p[0].toFixed(0)+','+p[1].toFixed(0)); }
    s += '<polygon points="'+pts.join(' ')+'" fill="none" stroke="'+CX.line+'"/>';
  });
  for(var i=0;i<n;i++){
    var p = P(i, R);
    s += '<line x1="'+cx0+'" y1="'+cy0+'" x2="'+p[0].toFixed(0)+'" y2="'+p[1].toFixed(0)+'" stroke="'+CX.line+'"/>';
  }
  /* 数据多边形：分数越高=威胁越大=向外 */
  var pts = [];
  rows.forEach(function(r, i){
    var p = P(i, R * (r.v/10));
    pts.push(p[0].toFixed(0)+','+p[1].toFixed(0));
  });
  s += '<polygon points="'+pts.join(' ')+'" fill="'+CX.t+'" fill-opacity="0.18" stroke="'+CX.t+'" stroke-width="2"/>';
  rows.forEach(function(r, i){
    var p = P(i, R * (r.v/10));
    s += '<circle cx="'+p[0].toFixed(0)+'" cy="'+p[1].toFixed(0)+'" r="4" fill="'+CX.t+'"/>';
    var lp = P(i, R+30);
    var anchor = Math.abs(lp[0]-cx0) < 12 ? 'middle' : (lp[0] > cx0 ? 'start' : 'end');
    s += '<text x="'+lp[0].toFixed(0)+'" y="'+(lp[1]+4).toFixed(0)+'" font-size="11" fill="'+CX.sub+'" text-anchor="'+anchor+'" font-weight="600">'+esc(r.n)+'</text>';
    s += '<text x="'+lp[0].toFixed(0)+'" y="'+(lp[1]+18).toFixed(0)+'" font-size="10" fill="'+CX.mute+'" text-anchor="'+anchor+'">'+r.v+'/10</text>';
  });
  /* 中心：行业吸引力 */
  s += '<circle cx="'+cx0+'" cy="'+cy0+'" r="34" fill="'+CX.soft+'"/>';
  s += '<text x="'+cx0+'" y="'+(cy0-2)+'" font-size="21" font-weight="700" fill="'+CX.ink+'" text-anchor="middle">'+attract.toFixed(0)+'</text>';
  s += '<text x="'+cx0+'" y="'+(cy0+14)+'" font-size="9" fill="'+CX.mute+'" text-anchor="middle">吸引力</text>';
  s += '<text x="'+cx0+'" y="'+(H-18)+'" font-size="10" fill="'+CX.mute+'" text-anchor="middle">越向外 = 威胁越大　·　吸引力 = 100 − 五力均值×10</text>';
  s += '</svg>';
  return s;
}

/* ============================================================
 * 2. PEST 宏观环境
 * ============================================================ */
function calcPest(){
  var T = tk().pest;
  T.rows = tkv('#kp_rows', T.rows); save();
  var rows = parseRows(T.rows).map(function(r){
    return {d:r[0]||'', txt:r[1]||'', kind:(r[2]||'').indexOf('机')>=0?'机会':'威胁', v:Math.max(1,Math.min(5,tkn(r[3],3)))};
  }).filter(function(r){ return r.d; });

  var host = $('#kpOut'), ch = $('#kpChart');
  if(!rows.length){
    if(host) host.innerHTML = '<span class="ph">填写维度 / 内容 / 机会或威胁 / 强度</span>';
    if(ch) ch.innerHTML = '<span class="ph">—</span>'; return null;
  }
  var opp = rows.filter(function(r){ return r.kind === '机会'; });
  var thr = rows.filter(function(r){ return r.kind === '威胁'; });
  var oppS = opp.reduce(function(a,r){ return a + r.v; }, 0);
  var thrS = thr.reduce(function(a,r){ return a + r.v; }, 0);
  var net = oppS - thrS;

  var o = [];
  o.push('### 🏛️ PEST 宏观环境扫描');
  o.push('');
  o.push('| 维度 | 内容 | 性质 | 强度 |');
  o.push('|---|---|---|---|');
  rows.forEach(function(r){
    o.push('| ' + r.d + ' | ' + r.txt + ' | ' + (r.kind==='机会'?'🟢 机会':'🔴 威胁') + ' | ' + r.v + '/5 |');
  });
  o.push('');
  o.push('**机会总强度 ' + oppS + '　vs　威胁总强度 ' + thrS + '**　→　净环境分 **' +
         (net >= 0 ? '+' : '') + net + '**');
  o.push('');
  o.push('### 结论');
  o.push('');
  if(net > 3){
    o.push('> 🟢 **宏观环境顺风（+' + net + '）**：机会显著强于威胁，是扩张窗口期。');
    o.push('> 但注意：顺风时最容易盲目乐观，别把环境红利当成自己的能力。');
  } else if(net >= -3){
    o.push('> 🟡 **宏观环境中性（' + net + '）**：机会与威胁大致抵消。');
    o.push('> 关键看你能不能抓住那几条机会——环境不帮忙时，执行力决定一切。');
  } else {
    o.push('> 🔴 **宏观环境逆风（' + net + '）**：威胁显著强于机会。');
    o.push('> 建议收缩战线、保现金流，等环境转向或找到对抗威胁的打法。');
  }
  o.push('');
  o.push('> 用法提醒：PEST 只扫**外部**，SWOT 才是内外结合。');
  o.push('> 常见误用是把 PEST 写成新闻剪报——每格堆事实却不写"对我们的具体影响是什么"。');
  if(host) host.innerHTML = mdLite(o.join('\n'));
  if(ch) ch.innerHTML = svgPest(rows, oppS, thrS);
  return {rows:rows, oppS:oppS, thrS:thrS, net:net};
}

/* PEST 四象限 */
function svgPest(rows, oppS, thrS){
  var W = 780, H = 430;
  var s = '<svg xmlns="http://www.w3.org/2000/svg" width="'+W+'" height="'+H+'" viewBox="0 0 '+W+' '+H+'" font-family="PingFang SC,Microsoft YaHei,sans-serif">';
  s += cxFrame(W, H, 'PEST 宏观环境扫描', 'MACRO SCAN · ' + todayStr());

  var dims = ['政治政策','经济环境','社会文化','技术趋势'];
  var cw = (W - 96) / 4, cy0 = 138;
  dims.forEach(function(d, i){
    var x = 48 + cw * i;
    var mine = rows.filter(function(r){ return r.d.indexOf(d.slice(0,2)) >= 0 || d.indexOf(r.d.slice(0,2)) >= 0; });
    var oN = mine.filter(function(r){ return r.kind === '机会'; }).length;
    var tN = mine.filter(function(r){ return r.kind === '威胁'; }).length;
    var col = oN > tN ? CX.s : (tN > oN ? CX.t : CX.mute);
    s += '<rect x="'+(x+5)+'" y="'+cy0+'" width="'+(cw-10)+'" height="150" fill="'+CX.paper+'" stroke="'+col+'" stroke-width="1.5" rx="9"/>';
    s += '<rect x="'+(x+5)+'" y="'+cy0+'" width="'+(cw-10)+'" height="4" fill="'+col+'" rx="2"/>';
    s += '<text x="'+(x+cw/2)+'" y="'+(cy0+30)+'" font-size="13.5" fill="'+CX.ink+'" text-anchor="middle" font-weight="700">'+esc(d.slice(0,2))+'</text>';
    s += '<text x="'+(x+cw/2)+'" y="'+(cy0+48)+'" font-size="10" fill="'+CX.mute+'" text-anchor="middle">'+esc(d.slice(2))+'</text>';
    var yy = cy0 + 72;
    mine.slice(0, 3).forEach(function(r){
      var tag = r.kind === '机会' ? '🟢' : '🔴';
      var txt = r.txt.length > 9 ? r.txt.slice(0,9) + '…' : r.txt;
      s += '<text x="'+(x+16)+'" y="'+yy+'" font-size="10.5" fill="'+CX.sub+'">'+tag+' '+esc(txt)+'</text>';
      yy += 18;
    });
    if(!mine.length){
      s += '<text x="'+(x+cw/2)+'" y="'+yy+'" font-size="10" fill="'+CX.mute+'" text-anchor="middle">未填写</text>';
    }
  });
  /* 底部天平 */
  var bw = 240, bx = W/2 - bw/2, by = 320;
  var tot = Math.max(oppS + thrS, 1);
  var ow = bw * (oppS / tot), tw = bw * (thrS / tot);
  s += '<text x="48" y="'+(by-8)+'" font-size="11" fill="'+CX.sub+'" font-weight="600">机会 / 威胁 强度对比</text>';
  s += '<rect x="'+bx+'" y="'+by+'" width="'+bw+'" height="26" fill="'+CX.soft+'" rx="6"/>';
  s += '<rect x="'+bx+'" y="'+by+'" width="'+ow.toFixed(0)+'" height="26" fill="'+CX.s+'" rx="6"/>';
  s += '<rect x="'+(bx+ow).toFixed(0)+'" y="'+by+'" width="'+tw.toFixed(0)+'" height="26" fill="'+CX.t+'" rx="6"/>';
  if(ow > 42) s += '<text x="'+(bx+ow/2).toFixed(0)+'" y="'+(by+17)+'" font-size="11.5" fill="#fff" text-anchor="middle" font-weight="700">机会 '+oppS+'</text>';
  if(tw > 42) s += '<text x="'+(bx+ow+tw/2).toFixed(0)+'" y="'+(by+17)+'" font-size="11.5" fill="#fff" text-anchor="middle" font-weight="700">威胁 '+thrS+'</text>';
  s += '<text x="'+cx_(W)+'" y="'+(H-18)+'" font-size="10" fill="'+CX.mute+'" text-anchor="middle">PEST 只扫外部　·　需与 SWOT 配合完成内外结合</text>';
  s += '</svg>';
  return s;
}
function cx_(W){ return W/2; }

/* ============================================================
 * 3. 安索夫矩阵
 * ============================================================ */
function calcAnsoff(){
  var T = tk().ansoff;
  T.rows = tkv('#ka_rows', T.rows); save();
  var rows = parseRows(T.rows).map(function(r){
    return {q:r[0]||'', s:r[1]||'', gain:Math.max(1,Math.min(10,tkn(r[2],5))), risk:Math.max(1,Math.min(10,tkn(r[3],5)))};
  }).filter(function(r){ return r.q; });

  var host = $('#kaOut'), ch = $('#kaChart');
  if(!rows.length){
    if(host) host.innerHTML = '<span class="ph">填写象限 / 策略 / 预期收益 / 风险</span>';
    if(ch) ch.innerHTML = '<span class="ph">—</span>'; return null;
  }
  /* 性价比 = 收益 / 风险 */
  rows.forEach(function(r){ r.ratio = r.gain / r.risk; });
  var ranked = rows.slice().sort(function(a,b){ return b.ratio - a.ratio; });

  var o = [];
  o.push('### 🚀 安索夫增长矩阵');
  o.push('');
  o.push('| 象限 | 策略 | 预期收益 | 风险 | 性价比 |');
  o.push('|---|---|---|---|---|');
  rows.forEach(function(r){
    o.push('| ' + r.q + ' | ' + r.s + ' | ' + r.gain + '/10 | ' + r.risk + '/10 | **' + r.ratio.toFixed(2) + '** |');
  });
  o.push('');
  o.push('### 建议执行顺序');
  o.push('');
  ranked.forEach(function(r, i){
    o.push((i+1) + '. **' + r.q + '**（性价比 ' + r.ratio.toFixed(2) + '）——' + ansoffAdvice(r));
  });
  o.push('');
  o.push('> 性价比 = 预期收益 ÷ 风险。**不是越高越好**——');
  o.push('> 市场渗透性价比通常最高（低风险），但天花板也最低；');
  o.push('> 多元化性价比最低，却是唯一可能打开第二曲线的选项。');
  o.push('> 建议：**先做高性价比保生存，再拿一部分资源赌高收益**。');
  if(host) host.innerHTML = mdLite(o.join('\n'));
  if(ch) ch.innerHTML = svgAnsoff(rows, ranked);
  return {rows:rows, ranked:ranked};
}
function ansoffAdvice(r){
  if(r.q.indexOf('渗透') >= 0) return '守住基本盘，靠复购与提频稳现金流，是所有增长的地基';
  if(r.q.indexOf('市场开发') >= 0) return '把验证过的产品卖到新人群/新区域，风险可控';
  if(r.q.indexOf('产品开发') >= 0) return '给现有客群上新，需确认研发与供应链跟得上';
  return '高风险高不确定，只在主业稳固且有明确协同时才动';
}

/* 2x2 矩阵 */
function svgAnsoff(rows, ranked){
  var W = 760, H = 520;
  var s = '<svg xmlns="http://www.w3.org/2000/svg" width="'+W+'" height="'+H+'" viewBox="0 0 '+W+' '+H+'" font-family="PingFang SC,Microsoft YaHei,sans-serif">';
  s += cxFrame(W, H, '安索夫增长矩阵', 'ANSOFF MATRIX · ' + todayStr());

  var padL = 108, padT = 118, cw = 264, chh = 152;
  var cells = [
    {n:'市场渗透', c:CX.s,  bg:CX.sBg},
    {n:'市场开发', c:CX.o,  bg:CX.oBg},
    {n:'产品开发', c:CX.w,  bg:CX.wBg},
    {n:'多元化',   c:CX.t,  bg:CX.tBg}
  ];
  var pos = [[0,0],[1,0],[0,1],[1,1]];
  cells.forEach(function(c, i){
    var x = padL + pos[i][0] * cw, y = padT + pos[i][1] * chh;
    var mine = rows.filter(function(r){ return r.q.indexOf(c.n.slice(0,2)) >= 0; })[0];
    s += '<rect x="'+x+'" y="'+y+'" width="'+cw+'" height="'+chh+'" fill="'+c.bg+'" stroke="'+c.c+'" stroke-width="1.5" rx="8"/>';
    s += '<text x="'+(x+14)+'" y="'+(y+24)+'" font-size="13" fill="'+c.c+'" font-weight="700">'+esc(c.n)+'</text>';
    if(mine){
      s += '<text x="'+(x+14)+'" y="'+(y+46)+'" font-size="10.5" fill="'+CX.sub+'">策略：'+esc(mine.s.length>16?mine.s.slice(0,16)+'…':mine.s)+'</text>';
      s += '<text x="'+(x+14)+'" y="'+(y+68)+'" font-size="10.5" fill="'+CX.sub+'">收益 '+mine.gain+'/10　风险 '+mine.risk+'/10</text>';
      s += '<text x="'+(x+14)+'" y="'+(y+90)+'" font-size="15" fill="'+c.c+'" font-weight="700">性价比 '+mine.ratio.toFixed(2)+'</text>';
      /* 风险条 */
      s += '<rect x="'+(x+14)+'" y="'+(y+104)+'" width="'+(cw-28)+'" height="7" fill="'+CX.paper+'" stroke="'+CX.line+'" rx="3"/>';
      s += '<rect x="'+(x+14)+'" y="'+(y+104)+'" width="'+((cw-28)*mine.risk/10).toFixed(0)+'" height="7" fill="'+c.c+'" rx="3"/>';
      s += '<text x="'+(x+14)+'" y="'+(y+128)+'" font-size="9" fill="'+CX.mute+'">风险条</text>';
    } else {
      s += '<text x="'+(x+14)+'" y="'+(y+48)+'" font-size="10.5" fill="'+CX.mute+'">未填写</text>';
    }
  });
  /* 轴标签 */
  s += '<text x="'+(padL-14)+'" y="'+(padT-30)+'" font-size="11" fill="'+CX.mute+'" text-anchor="end">产品 →</text>';
  s += '<text x="'+(padL+cw*2+14)+'" y="'+(padT+chh+70)+'" font-size="11" fill="'+CX.mute+'">市场 →</text>';
  s += '<text x="'+(padL-14)+'" y="'+(padT+30)+'" font-size="10.5" fill="'+CX.sub+'" text-anchor="end">现有产品</text>';
  s += '<text x="'+(padL-14)+'" y="'+(padT+chh+30)+'" font-size="10.5" fill="'+CX.sub+'" text-anchor="end">新产品</text>';
  s += '<text x="'+(padL+50)+'" y="'+(padT-14)+'" font-size="10.5" fill="'+CX.sub+'">现有市场</text>';
  s += '<text x="'+(padL+cw+50)+'" y="'+(padT-14)+'" font-size="10.5" fill="'+CX.sub+'">新市场</text>';
  /* 执行顺序 */
  var oy = padT + chh*2 + 34;
  s += '<text x="48" y="'+oy+'" font-size="11.5" fill="'+CX.sub+'" font-weight="600">建议执行顺序：</text>';
  ranked.slice(0,4).forEach(function(r, i){
    s += '<text x="'+(48+i*172)+'" y="'+(oy+22)+'" font-size="10.5" fill="'+CX.sub+'">'+(i+1)+'. '+esc(r.q)+' ('+r.ratio.toFixed(2)+')</text>';
  });
  s += '</svg>';
  return s;
}

/* ============================================================
 * 4. GE-McKinsey 九宫格
 * ============================================================ */
function calcGE(){
  var T = tk().ge;
  T.rows = tkv('#kg_rows', T.rows); save();
  var rows = parseRows(T.rows).map(function(r){
    return {n:r[0]||'', a:Math.max(1,Math.min(5,tkn(r[1],3))), c:Math.max(1,Math.min(5,tkn(r[2],3))), size:tkn(r[3],0)};
  }).filter(function(r){ return r.n; });

  var host = $('#kgOut'), ch = $('#kgChart');
  if(!rows.length){
    if(host) host.innerHTML = '<span class="ph">填写业务 / 吸引力 / 竞争力 / 规模</span>';
    if(ch) ch.innerHTML = '<span class="ph">—</span>'; return null;
  }
  rows.forEach(function(r){
    var gi = r.a >= 4 ? 0 : (r.a >= 2.5 ? 1 : 2);   // 0高 1中 2低
    var ci = r.c >= 4 ? 0 : (r.c >= 2.5 ? 1 : 2);
    r.gi = gi; r.ci = ci;
    r.act = geAct(gi, ci);
    r.score = (r.a * 0.5 + r.c * 0.5) * 2;
  });
  var ranked = rows.slice().sort(function(a,b){ return b.score - a.score; });

  var o = [];
  o.push('### 🎯 GE-McKinsey 业务组合矩阵');
  o.push('');
  o.push('| 业务 | 行业吸引力 | 业务竞争力 | 落格 | 建议 |');
  o.push('|---|---|---|---|---|');
  rows.forEach(function(r){
    o.push('| **' + r.n + '** | ' + r.a + '/5 | ' + r.c + '/5 | ' + geCell(r.gi, r.ci) + ' | ' + r.act + ' |');
  });
  o.push('');
  o.push('### 九宫格规则');
  o.push('');
  o.push('| | 竞争力高 | 竞争力中 | 竞争力低 |');
  o.push('|---|---|---|---|');
  o.push('| **吸引力高** | 投资增长 | 投资增长 | 选择性投资 |');
  o.push('| **吸引力中** | 选择性投资 | 维持/收割 | 收割/退出 |');
  o.push('| **吸引力低** | 维持/收割 | 收割/退出 | 收割/退出 |');
  o.push('');
  o.push('> 相比 BCG 只用「增长率 + 份额」两个维度，GE 矩阵用**综合吸引力**替代单一增长率，');
  o.push('> 判断更稳，也更接近咨询公司的实际做法。');
  if(host) host.innerHTML = mdLite(o.join('\n'));
  if(ch) ch.innerHTML = svgGE9(rows);
  return {rows:rows, ranked:ranked};
}
function geAct(gi, ci){
  var m = [
    ['🟢 投资增长','🟢 投资增长','🟡 选择性投资'],
    ['🟡 选择性投资','🔵 维持/收割','🔴 收割/退出'],
    ['🔵 维持/收割','🔴 收割/退出','🔴 收割/退出']
  ];
  return m[gi][ci];
}
function geCell(gi, ci){
  var g = gi === 0 ? '高' : (gi === 1 ? '中' : '低');
  var c = ci === 0 ? '高' : (ci === 1 ? '中' : '低');
  return g + '吸引力 / ' + c + '竞争力';
}

/* 3x3 九宫格 */
function svgGE9(rows){
  var W = 780, H = 560;
  var s = '<svg xmlns="http://www.w3.org/2000/svg" width="'+W+'" height="'+H+'" viewBox="0 0 '+W+' '+H+'" font-family="PingFang SC,Microsoft YaHei,sans-serif">';
  s += cxFrame(W, H, 'GE-McKinsey 业务组合', 'NINE-BOX MATRIX · ' + todayStr());

  var padL = 118, padT = 116, cw = 200, chh = 128;
  var COLORS = [[CX.sBg, CX.s], [CX.wBg, CX.w], [CX.tBg, CX.t]];
  var ACT = [['投资增长','投资增长','选择性投资'],['选择性投资','维持/收割','收割/退出'],['维持/收割','收割/退出','收割/退出']];

  for(var gi=0; gi<3; gi++){
    for(var ci=0; ci<3; ci++){
      var x = padL + ci * cw, y = padT + gi * chh;
      var mine = rows.filter(function(r){ return r.gi === gi && r.ci === ci; });
      s += '<rect x="'+x+'" y="'+y+'" width="'+cw+'" height="'+chh+'" fill="'+COLORS[gi][0]+'" stroke="'+COLORS[gi][1]+'" stroke-width="1.2" rx="6" stroke-opacity="'+(mine.length?0.9:0.25)+'" fill-opacity="'+(mine.length?0.95:0.35)+'"/>';
      s += '<text x="'+(x+10)+'" y="'+(y+18)+'" font-size="9.5" fill="'+COLORS[gi][1]+'" font-weight="600">'+ACT[gi][ci]+'</text>';
      mine.forEach(function(r, k){
        var by = y + 38 + k * 26;
        var maxR = rows.reduce(function(a,b){ return Math.max(a,b.size); }, 0) || 1;
        var rr = 4 + (r.size / maxR) * 6;
        s += '<circle x="'+(x+18)+'" cx="'+(x+18)+'" cy="'+(by-4)+'" r="'+rr.toFixed(1)+'" fill="'+COLORS[gi][1]+'" fill-opacity="0.65"/>';
        s += '<text x="'+(x+34)+'" y="'+by+'" font-size="11" fill="'+CX.ink+'" font-weight="600">'+esc(r.n)+'</text>';
      });
    }
  }
  s += '<text x="'+(padL-14)+'" y="'+(padT-16)+'" font-size="11" fill="'+CX.mute+'" text-anchor="end">行业吸引力 ↑</text>';
  [['高',0],['中',1],['低',2]].forEach(function(g){
    s += '<text x="'+(padL-14)+'" y="'+(padT+g[1]*chh+chh/2+4)+'" font-size="11" fill="'+CX.sub+'" text-anchor="end">'+g[0]+'</text>';
  });
  [['高',0],['中',1],['低',2]].forEach(function(c){
    s += '<text x="'+(padL+c[1]*cw+cw/2)+'" y="'+(padT+chh*3+22)+'" font-size="11" fill="'+CX.sub+'" text-anchor="middle">'+c[0]+'</text>';
  });
  s += '<text x="'+(padL+cw*1.5)+'" y="'+(padT+chh*3+46)+'" font-size="11" fill="'+CX.mute+'" text-anchor="middle">业务竞争力 →</text>';
  s += '<text x="'+(W/2)+'" y="'+(H-18)+'" font-size="10" fill="'+CX.mute+'" text-anchor="middle">气泡大小 = 业务规模　·　比 BCG 更精细：用综合吸引力替代单一增长率</text>';
  s += '</svg>';
  return s;
}

/* ============================================================
 * 5. 价值链分析
 * ============================================================ */
function calcVC(){
  var T = tk().vc;
  T.rows = tkv('#kv_rows', T.rows); save();
  var rows = parseRows(T.rows).map(function(r){
    return {n:r[0]||'', cost:tkn(r[1],0), profit:tkn(r[2],0)};
  }).filter(function(r){ return r.n; });

  var host = $('#kvOut'), ch = $('#kvChart');
  if(!rows.length){
    if(host) host.innerHTML = '<span class="ph">填写环节 / 成本占比 / 利润贡献</span>';
    if(ch) ch.innerHTML = '<span class="ph">—</span>'; return null;
  }
  var sumC = rows.reduce(function(a,r){ return a + r.cost; }, 0);
  var sumP = rows.reduce(function(a,r){ return a + r.profit; }, 0);
  rows.forEach(function(r){
    /* 效率比 = 利润贡献 / 成本占比。>1 说明该环节创造的利润超过它消耗的成本 */
    r.eff = r.cost > 0 ? (r.profit / r.cost) : 0;
    r.flag = r.eff < 0.5 ? 'low' : (r.eff >= 1.2 ? 'high' : 'mid');
  });
  var bad = rows.filter(function(r){ return r.flag === 'low'; });
  var good = rows.filter(function(r){ return r.flag === 'high'; });

  var o = [];
  o.push('### 🔗 价值链分析');
  o.push('');
  o.push('| 环节 | 成本占比 | 利润贡献 | 效率比 | 判定 |');
  o.push('|---|---|---|---|---|');
  rows.forEach(function(r){
    o.push('| ' + r.n + ' | ' + r.cost + '% | ' + r.profit + '% | **' + r.eff.toFixed(2) + '** | ' +
      (r.flag === 'low' ? '⚠️ 低效' : (r.flag === 'high' ? '✅ 高效' : '🔵 正常')) + ' |');
  });
  o.push('| **合计** | **' + sumC.toFixed(0) + '%** | **' + sumP.toFixed(0) + '%** | — | — |');
  o.push('');
  if(Math.abs(sumC - 100) > 1){
    o.push('> ⚠️ 成本占比合计 ' + sumC.toFixed(0) + '%，应为 100%。请检查。');
  }
  o.push('### 诊断');
  o.push('');
  if(bad.length){
    o.push('**⚠️ 低效环节（成本占比高但利润贡献低）：**');
    o.push('');
    bad.forEach(function(r){
      o.push('- **' + r.n + '**：吃 ' + r.cost + '% 成本，只贡献 ' + r.profit + '% 利润（效率比 ' + r.eff.toFixed(2) + '）');
      o.push('  - 这是**降本增效的第一优先项**——要么压缩投入，要么重构做法');
    });
    o.push('');
  }
  if(good.length){
    o.push('**✅ 高效环节：**');
    o.push('');
    good.forEach(function(r){
      o.push('- **' + r.n + '**：效率比 ' + r.eff.toFixed(2) + '，这是你的**价值引擎**，应该加大投入');
    });
    o.push('');
  }
  o.push('> 效率比 = 利润贡献 ÷ 成本占比。**&lt;0.5 低效，&gt;1.2 高效**。');
  o.push('> 常见误区：一刀切砍成本。低效环节该砍，高效环节反而该加——');
  o.push('> 平均分配预算是最容易犯的错。');
  if(host) host.innerHTML = mdLite(o.join('\n'));
  if(ch) ch.innerHTML = svgVC(rows);
  return {rows:rows, bad:bad, good:good};
}

/* 价值链流程图 + 对比条 */
function svgVC(rows){
  var W = 820, H = 250 + rows.length * 44;
  var s = '<svg xmlns="http://www.w3.org/2000/svg" width="'+W+'" height="'+H+'" viewBox="0 0 '+W+' '+H+'" font-family="PingFang SC,Microsoft YaHei,sans-serif">';
  s += cxFrame(W, H, '价值链成本 / 利润分析', 'VALUE CHAIN · ' + todayStr());

  var padL = 130, padT = 112, bw = W - padL - 190;
  var maxV = Math.max(rows.reduce(function(a,r){ return Math.max(a,r.cost,r.profit); }, 0), 1);

  /* 图例 */
  s += '<rect x="'+(W-176)+'" y="76" width="10" height="10" fill="'+CX.w+'"/>';
  s += '<text x="'+(W-162)+'" y="85" font-size="10" fill="'+CX.sub+'">成本占比</text>';
  s += '<rect x="'+(W-96)+'" y="76" width="10" height="10" fill="'+CX.s+'"/>';
  s += '<text x="'+(W-82)+'" y="85" font-size="10" fill="'+CX.sub+'">利润贡献</text>';

  rows.forEach(function(r, i){
    var y = padT + i * 44;
    s += '<text x="'+(padL-12)+'" y="'+(y+18)+'" font-size="11.5" fill="'+CX.ink+'" text-anchor="end" font-weight="600">'+esc(r.n)+'</text>';
    /* 成本条 */
    s += '<rect x="'+padL+'" y="'+y+'" width="'+bw+'" height="15" fill="'+CX.soft+'" rx="3"/>';
    s += '<rect x="'+padL+'" y="'+y+'" width="'+(bw*r.cost/maxV).toFixed(0)+'" height="15" fill="'+CX.w+'" fill-opacity="0.75" rx="3"/>';
    /* 利润条 */
    s += '<rect x="'+padL+'" y="'+(y+18)+'" width="'+bw+'" height="15" fill="'+CX.soft+'" rx="3"/>';
    s += '<rect x="'+padL+'" y="'+(y+18)+'" width="'+(bw*r.profit/maxV).toFixed(0)+'" height="15" fill="'+CX.s+'" fill-opacity="0.75" rx="3"/>';
    /* 效率标签 */
    var col = r.flag === 'low' ? CX.t : (r.flag === 'high' ? CX.s : CX.mute);
    var tag = r.flag === 'low' ? '⚠️ 低效' : (r.flag === 'high' ? '✅ 高效' : '正常');
    s += '<text x="'+(padL+bw+14)+'" y="'+(y+22)+'" font-size="11" fill="'+col+'" font-weight="600">'+tag+' '+r.eff.toFixed(2)+'</text>';
  });
  s += '<text x="'+(W/2)+'" y="'+(H-18)+'" font-size="10" fill="'+CX.mute+'" text-anchor="middle">效率比 = 利润贡献 ÷ 成本占比　·　&lt;0.5 低效（降本优先）　&gt;1.2 高效（应加大投入）</text>';
  s += '</svg>';
  return s;
}

/* ============================================================
 * 6. 用户旅程地图
 * ============================================================ */
function calcCJ(){
  var T = tk().cj;
  T.rows = tkv('#kj_rows', T.rows); save();
  var rows = parseRows(T.rows).map(function(r){
    return {s:r[0]||'', act:r[1]||'', emo:Math.max(1,Math.min(5,tkn(r[2],3))), pain:r[3]||''};
  }).filter(function(r){ return r.s; });

  var host = $('#kjOut'), ch = $('#kjChart');
  if(rows.length < 2){
    if(host) host.innerHTML = '<span class="ph">至少填 2 个阶段</span>';
    if(ch) ch.innerHTML = '<span class="ph">—</span>'; return null;
  }
  var avg = rows.reduce(function(a,r){ return a + r.emo; }, 0) / rows.length;
  var low = rows.slice().sort(function(a,b){ return a.emo - b.emo; })[0];
  var pains = rows.filter(function(r){ return r.pain; });

  var o = [];
  o.push('### 🚶 用户旅程地图');
  o.push('');
  o.push('| 阶段 | 用户行为 | 情绪 | 痛点 |');
  o.push('|---|---|---|---|');
  rows.forEach(function(r){
    o.push('| **' + r.s + '** | ' + r.act + ' | ' + '●'.repeat(r.emo) + '○'.repeat(5-r.emo) + ' ' + r.emo + '/5 | ' + (r.pain || '—') + ' |');
  });
  o.push('');
  o.push('平均情绪分 **' + avg.toFixed(1) + ' / 5**');
  o.push('');
  o.push('### 诊断');
  o.push('');
  o.push('- **情绪低谷**：' + low.s + '（' + low.emo + '/5）——' +
         (low.pain ? '痛点：「' + low.pain + '」' : '未填痛点，建议补充'));
  o.push('  - 这是**体验优化的突破口**：用户在这里最容易流失');
  if(avg < 3){
    o.push('- ⚠️ 整体情绪偏低（' + avg.toFixed(1) + '）：旅程摩擦过大，需系统性重构而非局部修补');
  } else if(avg < 3.8){
    o.push('- 🟡 整体情绪中等（' + avg.toFixed(1) + '）：有明确短板，优先修情绪低谷那一步');
  } else {
    o.push('- 🟢 整体情绪良好（' + avg.toFixed(1) + '）：重点是把高分环节固化成可复用体验');
  }
  if(pains.length){
    o.push('');
    o.push('**痛点清单（' + pains.length + ' 条）：**');
    o.push('');
    pains.forEach(function(r){
      o.push('- ' + r.s + '：' + r.pain);
    });
  }
  o.push('');
  o.push('> 每阶段可对应不同营销动作：认知阶段靠内容种草，决策阶段靠信任背书，');
  o.push('> 推荐阶段靠激励设计。**别用同一套内容打全流程**。');
  if(host) host.innerHTML = mdLite(o.join('\n'));
  if(ch) ch.innerHTML = svgCJ(rows);
  return {rows:rows, avg:avg, low:low};
}

/* 情绪曲线 */
function svgCJ(rows){
  var W = 840, H = 440;
  var s = '<svg xmlns="http://www.w3.org/2000/svg" width="'+W+'" height="'+H+'" viewBox="0 0 '+W+' '+H+'" font-family="PingFang SC,Microsoft YaHei,sans-serif">';
  s += cxFrame(W, H, '用户旅程情绪曲线', 'CUSTOMER JOURNEY · ' + todayStr());

  var padL = 68, padR = 40, padT = 130, padB = 96;
  var pw = W - padL - padR, ph = H - padT - padB;
  var Y = function(v){ return padT + ph - ((v - 1) / 4) * ph; };
  var X = function(i){ return padL + pw / Math.max(rows.length - 1, 1) * i; };

  /* 网格与刻度 */
  [1,2,3,4,5].forEach(function(v){
    s += '<line x1="'+padL+'" y1="'+Y(v).toFixed(0)+'" x2="'+(padL+pw)+'" y2="'+Y(v).toFixed(0)+'" stroke="'+CX.line+'"/>';
    s += '<text x="'+(padL-12)+'" y="'+(Y(v)+4).toFixed(0)+'" font-size="10" fill="'+CX.mute+'" text-anchor="end">'+v+'</text>';
  });
  /* 情绪区间色带 */
  s += '<rect x="'+padL+'" y="'+Y(3.8).toFixed(0)+'" width="'+pw+'" height="'+(Y(5)-Y(3.8)).toFixed(0)+'" fill="'+CX.s+'" fill-opacity="0.05"/>';
  s += '<rect x="'+padL+'" y="'+Y(1).toFixed(0)+'" width="'+pw+'" height="'+(Y(3)-Y(1)).toFixed(0)+'" fill="'+CX.t+'" fill-opacity="0.05"/>';

  /* 折线 */
  var pts = rows.map(function(r, i){ return X(i).toFixed(0) + ',' + Y(r.emo).toFixed(0); });
  s += '<polyline points="'+pts.join(' ')+'" fill="none" stroke="'+CX.brand+'" stroke-width="2.5" stroke-linejoin="round"/>';

  rows.forEach(function(r, i){
    var col = r.emo <= 2 ? CX.t : (r.emo >= 4 ? CX.s : CX.w);
    s += '<circle cx="'+X(i).toFixed(0)+'" cy="'+Y(r.emo).toFixed(0)+'" r="7" fill="'+col+'"/>';
    s += '<text x="'+X(i).toFixed(0)+'" y="'+(Y(r.emo)-14).toFixed(0)+'" font-size="11" fill="'+col+'" text-anchor="middle" font-weight="700">'+r.emo+'</text>';
    /* 阶段名 */
    s += '<text x="'+X(i).toFixed(0)+'" y="'+(padT+ph+24)+'" font-size="11.5" fill="'+CX.ink+'" text-anchor="middle" font-weight="600">'+esc(r.s)+'</text>';
    /* 行为 */
    var act = r.act.length > 8 ? r.act.slice(0,8) + '…' : r.act;
    s += '<text x="'+X(i).toFixed(0)+'" y="'+(padT+ph+42)+'" font-size="9.5" fill="'+CX.mute+'" text-anchor="middle">'+esc(act)+'</text>';
    /* 痛点 */
    if(r.pain){
      var pn = r.pain.length > 10 ? r.pain.slice(0,10) + '…' : r.pain;
      s += '<text x="'+X(i).toFixed(0)+'" y="'+(padT+ph+60)+'" font-size="9.5" fill="'+CX.t+'" text-anchor="middle">⚠ '+esc(pn)+'</text>';
    }
  });
  s += '<text x="48" y="'+(padT-14)+'" font-size="10" fill="'+CX.mute+'">情绪分 ↑</text>';
  s += '<text x="'+(W/2)+'" y="'+(H-16)+'" font-size="10" fill="'+CX.mute+'" text-anchor="middle">● 为情绪得分　·　红点 ≤2 为体验低谷，优先优化</text>';
  s += '</svg>';
  return s;
}

/* ============================================================
 * 7. OGSM
 * ============================================================ */
function calcOGSM(){
  var T = tk().ogsm;
  T.o = tkv('#ko_o', T.o); T.g = tkv('#ko_g', T.g);
  T.s = tkv('#ko_s', T.s); T.m = tkv('#ko_m', T.m);
  save();
  var host = $('#koOut'), ch = $('#koChart');
  if(!T.o && !T.g){
    if(host) host.innerHTML = '<span class="ph">至少填写终极目标与具体目标</span>';
    if(ch) ch.innerHTML = '<span class="ph">—</span>'; return null;
  }
  /* 完整性检查：四层是否对齐 */
  var miss = [];
  if(!T.o) miss.push('Objective');
  if(!T.g) miss.push('Goals');
  if(!T.s) miss.push('Strategies');
  if(!T.m) miss.push('Measures');
  /* 可量化检查：Goals 与 Measures 应含数字 */
  var hasNum = function(t){ return /[0-9]/.test(t || ''); };
  var warn = [];
  if(T.g && !hasNum(T.g)) warn.push('Goals 未含数字，「Q4 GMV 破 5000 万」比「提升业绩」可执行得多');
  if(T.m && !hasNum(T.m)) warn.push('Measures 未含数字，无法判断是否达成');

  var o = [];
  o.push('### 📋 OGSM 战略落地拆解');
  o.push('');
  o.push('| 层级 | 内容 | 作用 |');
  o.push('|---|---|---|');
  o.push('| **O** 终极目标 | ' + (T.o||'—') + ' | 方向，不一定要量化 |');
  o.push('| **G** 具体目标 | ' + (T.g||'—') + ' | 必须可量化 |');
  o.push('| **S** 策略 | ' + (T.s||'—') + ' | 怎么做，有限几条 |');
  o.push('| **M** 衡量 | ' + (T.m||'—') + ' | 如何判断达成 |');
  o.push('');
  if(miss.length){
    o.push('> ⚠️ 未填写：' + miss.join('、') + '。OGSM 的价值在四层对齐，缺一层就断链。');
    o.push('');
  }
  if(warn.length){
    o.push('### 可执行性检查');
    o.push('');
    warn.forEach(function(w){ o.push('- ⚠️ ' + w); });
    o.push('');
  }
  o.push('### 为什么用 OGSM');
  o.push('');
  o.push('大多数战略落不了地，不是因为方向错，而是**停在 O 和 G，没有 S 和 M**。');
  o.push('OGSM 的强制性在于：每一层都必须能被下一层翻译——');
  o.push('');
  o.push('- O → G：把愿景翻译成数字');
  o.push('- G → S：把数字翻译成做法');
  o.push('- S → M：把做法翻译成可追踪的指标');
  o.push('');
  o.push('> 检验方法：**把 M 遮住，问团队"做到什么算成功"**——答不上来就是断链了。');
  if(host) host.innerHTML = mdLite(o.join('\n'));
  if(ch) ch.innerHTML = svgOGSM(T);
  return {o:T.o, g:T.g, s:T.s, m:T.m};
}

/* 四层瀑布 */
function svgOGSM(T){
  var W = 780, H = 466;
  var s = '<svg xmlns="http://www.w3.org/2000/svg" width="'+W+'" height="'+H+'" viewBox="0 0 '+W+' '+H+'" font-family="PingFang SC,Microsoft YaHei,sans-serif">';
  s += cxFrame(W, H, 'OGSM 战略拆解', 'OBJECTIVE · GOAL · STRATEGY · MEASURE');

  var layers = [
    {k:'O', n:'终极目标', t:T.o, c:CX.brand, w:0.72},
    {k:'G', n:'具体目标', t:T.g, c:CX.o,     w:0.82},
    {k:'S', n:'策略',     t:T.s, c:CX.s,     w:0.9},
    {k:'M', n:'衡量',     t:T.m, c:CX.w,     w:1.0}
  ];
  var y0 = 128, lh = 72;
  layers.forEach(function(L, i){
    var w = (W - 96) * L.w, x = (W - w) / 2, y = y0 + i * lh;
    s += '<rect x="'+x.toFixed(0)+'" y="'+y+'" width="'+w.toFixed(0)+'" height="56" fill="'+L.c+'" fill-opacity="0.09" stroke="'+L.c+'" stroke-width="1.3" rx="8"/>';
    s += '<rect x="'+x.toFixed(0)+'" y="'+y+'" width="4" height="56" fill="'+L.c+'" rx="2"/>';
    s += '<text x="'+(x+18)+'" y="'+(y+23)+'" font-size="12" fill="'+L.c+'" font-weight="700">'+L.k+'　'+L.n+'</text>';
    var txt = (L.t || '（未填写）');
    if(txt.length > 30) txt = txt.slice(0, 30) + '…';
    s += '<text x="'+(x+18)+'" y="'+(y+43)+'" font-size="12.5" fill="'+CX.ink+'">'+esc(txt)+'</text>';
    if(i < 3){
      s += '<path d="M '+(W/2)+' '+(y+60)+' L '+(W/2)+' '+(y+70)+'" stroke="'+CX.mute+'" marker-end="url(#ogArrow)"/>';
    }
  });
  s += '<defs><marker id="ogArrow" markerWidth="7" markerHeight="7" refX="3.5" refY="3.5" orient="auto"><path d="M0,0 L7,3.5 L0,7 z" fill="'+CX.mute+'"/></marker></defs>';
  s += '<text x="'+(W/2)+'" y="'+(H-18)+'" font-size="10" fill="'+CX.mute+'" text-anchor="middle">逐层翻译：愿景 → 数字 → 做法 → 可追踪指标　·　缺任一层即断链</text>';
  s += '</svg>';
  return s;
}

/* ============================================================
 * 8. 感知地图（品牌定位）
 * ============================================================ */
function calcPM(){
  var T = tk().pm;
  T.x = tkv('#km_x', T.x); T.y = tkv('#km_y', T.y);
  T.rows = tkv('#km_rows', T.rows); save();
  var rows = parseRows(T.rows).map(function(r){
    return {n:r[0]||'', x:Math.max(0,Math.min(10,tkn(r[1],5))), y:Math.max(0,Math.min(10,tkn(r[2],5)))};
  }).filter(function(r){ return r.n; });

  var host = $('#kmOut'), ch = $('#kmChart');
  if(rows.length < 2){
    if(host) host.innerHTML = '<span class="ph">至少填 2 个品牌</span>';
    if(ch) ch.innerHTML = '<span class="ph">—</span>'; return null;
  }
  /* 空白区识别：把图分 3x3，找无品牌的格子 */
  var grid = {};
  rows.forEach(function(r){
    var gx = Math.min(2, Math.floor(r.x / 3.34));
    var gy = Math.min(2, Math.floor(r.y / 3.34));
    grid[gx + ',' + gy] = (grid[gx + ',' + gy] || 0) + 1;
  });
  var empty = [];
  for(var i=0;i<3;i++) for(var j=0;j<3;j++){
    if(!grid[i + ',' + j]) empty.push({x:i, y:j});
  }
  var me = rows.filter(function(r){ return r.n.indexOf('我方') >= 0 || r.n.indexOf('我们') >= 0; })[0] || rows[0];

  var o = [];
  o.push('### 🗺️ 感知地图');
  o.push('');
  o.push('X 轴：' + T.x + '　|　Y 轴：' + T.y);
  o.push('');
  o.push('| 品牌 | X | Y |');
  o.push('|---|---|---|');
  rows.forEach(function(r){
    var isMe = (r === me);
    var nm = isMe ? (r.n.indexOf('我方') >= 0 || r.n.indexOf('我们') >= 0 ? r.n : r.n + '（我方）') : r.n;
    o.push('| ' + (isMe ? '**' + nm + '**' : nm) + ' | ' + r.x + ' | ' + r.y + ' |');
  });
  o.push('');
  o.push('### 定位诊断');
  o.push('');
  o.push('- **我方位置**：' + me.n + '（' + me.x + ', ' + me.y + '）');
  /* 最近竞品 */
  var others = rows.filter(function(r){ return r !== me; });
  if(others.length){
    var near = others.slice().sort(function(a,b){
      var da = Math.pow(a.x-me.x,2) + Math.pow(a.y-me.y,2);
      var db = Math.pow(b.x-me.x,2) + Math.pow(b.y-me.y,2);
      return da - db;
    })[0];
    var dist = Math.sqrt(Math.pow(near.x-me.x,2) + Math.pow(near.y-me.y,2));
    o.push('- **最直接的对手**：' + near.n + '（距离 ' + dist.toFixed(1) + '）');
    if(dist < 2){
      o.push('  - ⚠️ 位置过于接近，用户难以区分。**要么拉开差异，要么准备打消耗战**');
    } else {
      o.push('  - ✅ 区隔度足够，定位清晰');
    }
  }
  if(empty.length){
    o.push('- **未被占据的区域**：' + empty.length + ' 个（图中虚线格）');
    o.push('  - 这是潜在的**差异化山头**，但要先确认：空白是因为没机会，还是因为别人试过不行');
  } else {
    o.push('- ⚠️ 九宫格已被占满，说明这是个拥挤市场，进入需谨慎');
  }
  o.push('');
  o.push('> 感知地图看的是**用户认知**，不是客观参数。');
  o.push('> 与定价矩阵的区别：定价看「价格-价值」，感知地图看「用户心智坐标」。');
  if(host) host.innerHTML = mdLite(o.join('\n'));
  if(ch) ch.innerHTML = svgPM(rows, T, empty, me);
  return {rows:rows, empty:empty, me:me};
}

/* 2D 散点定位图 */
function svgPM(rows, T, empty, me){
  var W = 760, H = 560;
  var s = '<svg xmlns="http://www.w3.org/2000/svg" width="'+W+'" height="'+H+'" viewBox="0 0 '+W+' '+H+'" font-family="PingFang SC,Microsoft YaHei,sans-serif">';
  s += cxFrame(W, H, '品牌感知地图', 'PERCEPTUAL MAPPING · ' + todayStr());

  var padL = 92, padR = 56, padT = 116, padB = 86;
  var pw = W - padL - padR, ph = H - padT - padB;
  var X = function(v){ return padL + v / 10 * pw; };
  var Y = function(v){ return padT + ph - v / 10 * ph; };

  /* 空白区高亮 */
  empty.forEach(function(e){
    var x1 = padL + e.x / 3 * pw, x2 = padL + (e.x+1) / 3 * pw;
    var y1 = padT + ph - (e.y+1) / 3 * ph, y2 = padT + ph - e.y / 3 * ph;
    s += '<rect x="'+x1.toFixed(0)+'" y="'+y1.toFixed(0)+'" width="'+(x2-x1).toFixed(0)+'" height="'+(y2-y1).toFixed(0)+'" fill="'+CX.s+'" fill-opacity="0.055" stroke="'+CX.s+'" stroke-opacity="0.25" stroke-dasharray="4 3" rx="4"/>';
  });
  /* 网格 */
  for(var i=0;i<=10;i+=2){
    s += '<line x1="'+X(i).toFixed(0)+'" y1="'+padT+'" x2="'+X(i).toFixed(0)+'" y2="'+(padT+ph)+'" stroke="'+CX.line+'"/>';
    s += '<line x1="'+padL+'" y1="'+Y(i).toFixed(0)+'" x2="'+(padL+pw)+'" y2="'+Y(i).toFixed(0)+'" stroke="'+CX.line+'"/>';
  }
  s += '<rect x="'+padL+'" y="'+padT+'" width="'+pw+'" height="'+ph+'" fill="none" stroke="'+CX.line+'" stroke-width="1.2"/>';

  /* 轴名 */
  s += '<text x="'+(padL+pw/2)+'" y="'+(H-40)+'" font-size="11.5" fill="'+CX.sub+'" text-anchor="middle" font-weight="600">'+esc(T.x)+'</text>';
  s += '<text x="30" y="'+(padT+ph/2)+'" font-size="11.5" fill="'+CX.sub+'" text-anchor="middle" font-weight="600" transform="rotate(-90 30 '+(padT+ph/2)+')">'+esc(T.y)+'</text>';

  rows.forEach(function(r){
    var isMe = (r === me);
    var col = isMe ? CX.brand : CX.mute;
    var rr = isMe ? 13 : 9;
    s += '<circle cx="'+X(r.x).toFixed(0)+'" cy="'+Y(r.y).toFixed(0)+'" r="'+rr+'" fill="'+col+'" fill-opacity="'+(isMe?0.92:0.55)+'" stroke="'+CX.paper+'" stroke-width="2"/>';
    if(isMe) s += '<circle cx="'+X(r.x).toFixed(0)+'" cy="'+Y(r.y).toFixed(0)+'" r="'+(rr+5)+'" fill="none" stroke="'+col+'" stroke-opacity="0.35" stroke-width="1.5"/>';
    s += '<text x="'+X(r.x).toFixed(0)+'" y="'+(Y(r.y)-rr-8).toFixed(0)+'" font-size="'+(isMe?12:10.5)+'" fill="'+(isMe?col:CX.sub)+'" text-anchor="middle" font-weight="'+(isMe?700:500)+'">'+esc(r.n)+'</text>';
  });
  s += '<text x="'+(W/2)+'" y="'+(H-16)+'" font-size="10" fill="'+CX.mute+'" text-anchor="middle">虚线格 = 无品牌占据的空白区　·　大圆点为我方</text>';
  s += '</svg>';
  return s;
}
