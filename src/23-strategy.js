/* ============================================================
 * 战略矩阵 —— 增强版 SWOT（TOWS 自动推导）+ BCG 矩阵
 * 解决传统分析的三个问题：静态 / 主观 / 孤岛
 *   静态 → 版本快照与迁移对比
 *   主观 → 每条绑定数据指标
 *   孤岛 → 策略一键推送到营销日历
 * ============================================================ */

/* ---------- SWOT 数据模型 ---------- */
var SWOT_KEYS = [
  {k:'s', n:'优势', en:'STRENGTHS', icon:'💪', color:'#047857', ph:'例：品牌认知度高'},
  {k:'w', n:'劣势', en:'WEAKNESSES', icon:'🚨', color:'#b45309', ph:'例：营销预算有限'},
  {k:'o', n:'机会', en:'OPPORTUNITIES', icon:'🌟', color:'#1d4ed8', ph:'例：新消费趋势'},
  {k:'t', n:'威胁', en:'THREATS', icon:'⚡', color:'#b91c1c', ph:'例：竞品降价'}
];

function sm(){
  if(!state.mx) state.mx = {
    swot:{s:[], w:[], o:[], t:[]},
    bcg:[],
    bcgMode:'ratio',      // ratio = 相对份额(>1为高) | pct = 0-100
    snaps:[],
    name:''
  };
  return state.mx;
}

/* ---------- SWOT 条目渲染 ---------- */
function renderSwot(){
  var host = $('#smSwot'); if(!host) return;
  var S = sm();
  host.innerHTML = '';
  SWOT_KEYS.forEach(function(K){
    var box = document.createElement('div');
    box.className = 'swbox is-' + K.k;
    box.style.borderTopColor = K.color;
    var h = '<div class="swbox__hd"><span class="swbox__ico">' + K.icon + '</span>' +
            '<span class="swbox__n">' + K.n + '</span>' +
            '<span class="swbox__en">' + K.en + '</span></div><div class="swlist">';
    (S.swot[K.k] || []).forEach(function(it, i){
      h += '<div class="switem">' +
        '<input type="text" class="switem__t" value="' + esc(it.t) + '" placeholder="' + K.ph + '">' +
        '<div class="switem__m">' +
          '<input type="text" class="switem__v" value="' + esc(it.v||'') + '" placeholder="数值 87%">' +
          '<input type="text" class="switem__d" value="' + esc(it.d||'') + '" placeholder="变化 +5%">' +
          '<input type="text" class="switem__src" value="' + esc(it.src||'') + '" placeholder="来源">' +
          '<select class="switem__w" title="权重 1-5：该项在本象限内的重要程度（加权 SWOT / TOWS 强度用）">' +
            [1,2,3,4,5].map(function(n){
              return '<option value="' + n + '"' + (svW(it) === n ? ' selected' : '') + '>⚖' + n + '</option>';
            }).join('') +
          '</select>' +
        '</div>' +
        '<button class="btn btn--sm btn--ghost switem__x" data-swdel="' + K.k + ':' + i + '">✕</button>' +
      '</div>';
    });
    h += '</div><button class="btn btn--sm btn--ghost swadd" data-swadd="' + K.k + '">＋ 添加' + K.n + '</button>';
    box.innerHTML = h;
    host.appendChild(box);

    // 绑定
    var items = box.querySelectorAll('.switem');
    [].forEach.call(items, function(row, i){
      var it = S.swot[K.k][i];
      var q = function(sel){ return row.querySelector(sel); };
      q('.switem__t').addEventListener('input', function(){
        it.t = this.value; save(); renderTows(); renderTowsViz();
      });
      q('.switem__v').addEventListener('input', function(){ it.v = this.value; save(); renderTows(); });
      q('.switem__d').addEventListener('input', function(){ it.d = this.value; save(); renderTows(); });
      q('.switem__src').addEventListener('input', function(){ it.src = this.value; save(); });
      var wsel = q('.switem__w');
      if(wsel){
        wsel.addEventListener('change', function(){
          it.w = parseInt(this.value, 10);
          save(); renderTows(); renderTowsViz(); renderSnapTrack(); renderSwotViz();
        });
      }
    });
  });
  [].forEach.call(host.querySelectorAll('[data-swadd]'), function(b){
    b.onclick = function(){
      var k = b.getAttribute('data-swadd');
      sm().swot[k].push({t:'', v:'', d:'', src:''});
      save(); renderSwot(); renderTows();
    };
  });
  [].forEach.call(host.querySelectorAll('[data-swdel]'), function(b){
    b.onclick = function(){
      var a = b.getAttribute('data-swdel').split(':');
      sm().swot[a[0]].splice(parseInt(a[1],10), 1);
      save(); renderSwot(); renderTows();
    };
  });
  renderTows();
}

/* ---------- TOWS 交叉策略自动推导 ---------- */
function calcTows(){
  var S = sm();
  var has = function(k){
    return (S.swot[k] || []).filter(function(x){ return x.t && x.t.trim(); });
  };
  var s = has('s'), w = has('w'), o = has('o'), t = has('t');
  var out = [];

  var fmt = function(a){
    return a.slice(0, 2).map(function(x){
      return '「' + x.t + (x.v ? '（' + x.v + (x.d ? ' ' + x.d : '') + '）' : '') + '」';
    }).join(' + ');
  };

  /* SO 进攻型：内部优势 × 外部机会 → 最理想，全力投入 */
  if(s.length && o.length){
    out.push({
      k:'SO', n:'进攻型', icon:'🟢', color:'#047857',
      head:'利用优势抢占机会',
      elems:'S：' + fmt(s) + '　×　O：' + fmt(o),
      why:'内部能力与外部窗口同时具备，这是投入产出比最高的组合，应优先配置资源。',
      actions:[
        '把最优势的资产直接对准增长最快的机会点，做资源倾斜',
        '设定进取型目标（抢份额而非守利润），因为窗口期有限',
        '优先抢占心智/渠道卡位，避免窗口关闭后进入价格战'
      ]
    });
  }
  /* WO 补强型：克服劣势 × 抓住机会 → 补短板或换路径 */
  if(w.length && o.length){
    out.push({
      k:'WO', n:'补强型', icon:'🔵', color:'#1d4ed8',
      head:'补短板或用巧劲抓住机会',
      elems:'W：' + fmt(w) + '　×　O：' + fmt(o),
      why:'机会真实存在但能力/资源不足，硬拼会消耗过大，需要用低成本杠杆。',
      actions:[
        '判断能否快速补短板：能则补（合作/外包/借力），不能则换打法',
        '用内容和杠杆替代预算：KOC 矩阵、UGC、私域、资源置换',
        '先做小范围验证，验证成立再追加投入，避免全面铺开'
      ]
    });
  }
  /* ST 防御型：优势 × 威胁 → 用长板对冲外部风险 */
  if(s.length && t.length){
    out.push({
      k:'ST', n:'防御型', icon:'🟡', color:'#b45309',
      head:'用优势对冲威胁',
      elems:'S：' + fmt(s) + '　×　T：' + fmt(t),
      why:'外部出现不利变化，但自身有可依仗的长板，应避免正面对撞。',
      actions:[
        '明确"不跟什么"：不跟随降价/不进入对方主场，把战场拉回自己的优势区',
        '把长板做成护城河（供应链、服务、品牌资产、独家渠道）',
        '提前准备预案，设定触发条件（如竞品降价 X% 时启动）'
      ]
    });
  }
  /* WT 转型型：劣势 × 威胁 → 最危险，收缩或转型 */
  if(w.length && t.length){
    out.push({
      k:'WT', n:'转型型', icon:'🔴', color:'#b91c1c',
      head:'收缩战线或换赛道',
      elems:'W：' + fmt(w) + '　×　T：' + fmt(t),
      why:'内部不足叠加外部恶化，正面竞争胜算低，需主动做减法或转向。',
      actions:[
        '优先做减法：砍掉不盈利的线、收缩到能守住的细分市场',
        '寻找差异化生存空间（小而美、区域、垂直人群）',
        '设定止损线与退出标准，避免持续消耗'
      ]
    });
  }
  return out;
}

function renderTows(){
  var host = $('#smTows'); if(!host) return;
  var list = calcTows();
  if(!list.length){
    host.innerHTML = '<span class="ph">在四个象限各填至少一条，这里会自动生成交叉策略</span>';
    return;
  }
  host.innerHTML = '';
  list.forEach(function(x){
    var d = document.createElement('div');
    d.className = 'towscard';
    d.style.borderLeftColor = x.color;
    d.innerHTML =
      '<div class="towscard__hd">' +
        '<span class="towscard__k">' + x.k + '</span>' +
        '<span class="towscard__n">' + x.icon + ' ' + x.n + '：' + x.head + '</span>' +
        '<button class="btn btn--sm btn--ghost towscard__b" data-towssend="' + x.k + '">📅 推到日历</button>' +
      '</div>' +
      '<div class="towscard__e">' + esc(x.elems) + '</div>' +
      '<div class="towscard__y">💡 ' + esc(x.why) + '</div>' +
      '<ol class="towscard__a">' + x.actions.map(function(a){ return '<li>' + esc(a) + '</li>'; }).join('') + '</ol>';
    host.appendChild(d);
  });
  [].forEach.call(host.querySelectorAll('[data-towssend]'), function(b){
    b.onclick = function(){
      var k = b.getAttribute('data-towssend');
      var x = calcTows().filter(function(y){ return y.k === k; })[0];
      if(x) towToCalendar(x);
    };
  });
}

/* 策略推送到营销日历 */
function towToCalendar(x){
  state.cal = state.cal || {};
  state.cal.events = state.cal.events || [];
  var base = new Date();
  base.setDate(base.getDate() + 3);
  var title = x.k + ' ' + x.n + '：' + x.head;
  var note = x.elems + '\n\n' + x.why + '\n\n行动：\n' +
             x.actions.map(function(a, i){ return (i+1) + '. ' + a; }).join('\n');
  state.cal.events.push({
    id: 'ev' + Date.now() + Math.floor(Math.random()*100),
    title: title.slice(0, 40),
    date: ymd(base),
    pri: (x.k === 'SO' || x.k === 'WT') ? 'high' : 'mid',
    status: 'todo',
    link: '',
    note: note
  });
  save();
  toast('已推送到营销日历（3 天后）');
}

/* ---------- BCG 矩阵 ---------- */
function renderBcg(){
  var host = $('#smBcgRows'); if(!host) return;
  var B = sm().bcg;
  if(!B.length){ host.innerHTML = '<span class="ph">点「➕ 添加业务线」开始</span>'; }
  else {
    host.innerHTML = '';
    B.forEach(function(r, i){
      var row = document.createElement('div');
      row.className = 'bcgrow';
      row.innerHTML =
        '<input type="text" class="bcgrow__n" value="' + esc(r.n) + '" placeholder="业务线名">' +
        '<input type="number" class="bcgrow__s" value="' + (r.sales||'') + '" placeholder="销售额">' +
        '<input type="number" class="bcgrow__g" value="' + (r.growth||'') + '" placeholder="增长率%">' +
        '<input type="number" class="bcgrow__m" value="' + (r.share||'') + '" placeholder="相对份额">' +
        '<input type="number" class="bcgrow__p" value="' + (r.profit||'') + '" placeholder="利润%">' +
        '<button class="btn btn--sm btn--ghost" data-bcgdel="' + i + '">✕</button>';
      host.appendChild(row);
      var q = function(sel){ return row.querySelector(sel); };
      q('.bcgrow__n').addEventListener('input', function(){ r.n = this.value; save(); calcBcg(); });
      q('.bcgrow__s').addEventListener('input', function(){ r.sales = parseFloat(this.value)||0; save(); calcBcg(); });
      q('.bcgrow__g').addEventListener('input', function(){ r.growth = parseFloat(this.value)||0; save(); calcBcg(); });
      q('.bcgrow__m').addEventListener('input', function(){ r.share = parseFloat(this.value)||0; save(); calcBcg(); });
      q('.bcgrow__p').addEventListener('input', function(){ r.profit = parseFloat(this.value)||0; save(); calcBcg(); });
    });
    [].forEach.call(host.querySelectorAll('[data-bcgdel]'), function(b){
      b.onclick = function(){ sm().bcg.splice(parseInt(b.getAttribute('data-bcgdel'),10),1); save(); renderBcg(); };
    });
  }
  calcBcg();
}
function addBcgRow(){
  sm().bcg.push({n:'新业务线', sales:0, growth:0, share:1, profit:0});
  save(); renderBcg();
}

var BCG_QUAD = {
  star:   {n:'明星',   icon:'⭐', color:'#1d4ed8',
           plan:'加大投入，抢占第一', budget:'建议预算 +15% ~ +25%', pri:'high'},
  cash:   {n:'现金牛', icon:'🐄', color:'#047857',
           plan:'维持现状，利润最大化', budget:'建议预算维持，重心提效', pri:'mid'},
  question:{n:'问题儿童', icon:'❓', color:'#b45309',
           plan:'选择性投资或放弃', budget:'需决策：加注 / 收割 / 放弃', pri:'high'},
  dog:    {n:'瘦狗',   icon:'🐕', color:'#b91c1c',
           plan:'逐步退出，释放资源', budget:'建议预算 -50% 或归零', pri:'low'}
};

function calcBcg(){
  var S = sm();
  var rows = S.bcg.filter(function(r){ return r.n && r.n.trim(); });
  var host = $('#smBcgOut');
  if(!rows.length){
    if(host) host.innerHTML = '<span class="ph">添加业务线后自动判定象限</span>';
    var c = $('#smBcgChart'); if(c) c.innerHTML = '<span class="ph">—</span>';
    return null;
  }
  // 阈值：增长率中位数或 10%（常用标准）；份额阈值取决于口径
  var gs = rows.map(function(r){ return r.growth; }).sort(function(a,b){ return a-b; });
  var gTh = gs[Math.floor(gs.length/2)] || 10;
  if(gTh === 0) gTh = 10;
  var mTh = (S.bcgMode === 'ratio') ? 1 : 50;

  rows.forEach(function(r){
    var hiG = r.growth >= gTh;
    var hiM = r.share >= mTh;
    r.q = hiG ? (hiM ? 'star' : 'question') : (hiM ? 'cash' : 'dog');
  });
  var ranked = rows.slice().sort(function(a,b){ return b.sales - a.sales; });

  // 图
  var c2 = $('#smBcgChart');
  if(c2) c2.innerHTML = svgBCG(rows, gTh, mTh, S.bcgMode);

  // 文字
  var o = [];
  o.push('### 📊 BCG 象限判定');
  o.push('');
  o.push('> 增长率阈值 **' + gTh + '%**（取中位数）　|　相对份额阈值 **' + mTh +
         '**（' + (S.bcgMode === 'ratio' ? '>1 为领先者' : '0-100 口径') + '）');
  o.push('');
  o.push('| 业务线 | 销售额 | 增长率 | 相对份额 | 利润% | 象限 | 建议 | 预算动作 |');
  o.push('|---|---|---|---|---|---|---|---|');
  ranked.forEach(function(r){
    var Q = BCG_QUAD[r.q];
    o.push('| **' + r.n + '** | ' + r.sales + ' | ' + r.growth + '% | ' + r.share +
           ' | ' + r.profit + '% | ' + Q.icon + ' ' + Q.n + ' | ' + Q.plan + ' | ' + Q.budget + ' |');
  });
  o.push('');
  var byQ = {};
  rows.forEach(function(r){ (byQ[r.q] = byQ[r.q] || []).push(r.n); });
  o.push('### 组合诊断');
  o.push('');
  Object.keys(BCG_QUAD).forEach(function(k){
    if(byQ[k]) o.push('- ' + BCG_QUAD[k].icon + ' **' + BCG_QUAD[k].n + '**：' + byQ[k].join('、'));
  });
  // 现金流平衡判断（BCG 的核心洞察）
  var cashN = (byQ.cash || []).length, starN = (byQ.star || []).length,
      qN = (byQ.question || []).length, dogN = (byQ.dog || []).length;
  o.push('');
  var diag = [];
  if(!cashN && qN) diag.push('⚠️ **无现金牛却有问题儿童**：缺少自我造血业务，扩张依赖外部输血，风险较高');
  if(!starN) diag.push('⚠️ **无明星业务**：缺少高增长引擎，未来增长乏力，建议从问题儿童中筛选 1-2 个重点培育');
  if(dogN >= 2) diag.push('⚠️ **瘦狗偏多（' + dogN + ' 个）**：资源被低效业务占用，建议加速清理');
  if(cashN && starN && !qN && !dogN) diag.push('✅ 组合健康：现金牛供养明星，无拖累项');
  if(!diag.length) diag.push('组合结构尚可，建议按各象限策略分别配置资源');
  diag.forEach(function(x){ o.push(x); });

  if(host) host.innerHTML = mdLite(o.join('\n'));
  return {rows:rows, ranked:ranked, gTh:gTh, mTh:mTh, byQ:byQ};
}

/* BCG 气泡图 */
function svgBCG(rows, gTh, mTh, mode){
  var W = 880, H = 520;
  var padL = 76, padR = 40, padT = 56, padB = 66;
  var pw = W - padL - padR, ph = H - padT - padB;

  var maxS = rows.reduce(function(a,r){ return Math.max(a, r.sales||0); }, 1);
  var gs = rows.map(function(r){ return r.growth; });
  var gMax = Math.max.apply(null, gs.concat([gTh])) * 1.15 || 10;
  var gMin = Math.min.apply(null, gs.concat([0]));
  if(gMax === gMin) gMax = gMin + 10;
  var mMax = mode === 'ratio' ? Math.max.apply(null, rows.map(function(r){ return r.share; }).concat([mTh, 1.5])) * 1.15
                              : 100;
  var mMin = 0;

  var X = function(v){ return padL + (Math.max(mMin, Math.min(mMax, v)) - mMin) / (mMax - mMin) * pw; };
  var Y = function(v){ return padT + ph - (Math.max(gMin, Math.min(gMax, v)) - gMin) / (gMax - gMin) * ph; };

  var s = '<svg xmlns="http://www.w3.org/2000/svg" width="' + W + '" height="' + H +
          '" viewBox="0 0 ' + W + ' ' + H + '" font-family="PingFang SC,Microsoft YaHei,sans-serif">';
  s += cxFrame(W, H, 'BCG 业务组合矩阵', 'BCG MATRIX · ' + todayStr());

  // 象限底纹
  var xm = X(mTh), ym = Y(gTh);
  var QB = [
    {x:padL, y:padT, w:xm-padL, h:ym-padT, c:'#b45309'},         // 问题儿童（高增长低份额）
    {x:xm,   y:padT, w:padL+pw-xm, h:ym-padT, c:'#1d4ed8'},      // 明星
    {x:padL, y:ym,   w:xm-padL, h:padT+ph-ym, c:'#b91c1c'},      // 瘦狗
    {x:xm,   y:ym,   w:padL+pw-xm, h:padT+ph-ym, c:'#047857'}    // 现金牛
  ];
  QB.forEach(function(q){
    s += '<rect x="' + q.x.toFixed(0) + '" y="' + q.y.toFixed(0) + '" width="' + Math.max(0,q.w).toFixed(0) +
         '" height="' + Math.max(0,q.h).toFixed(0) + '" fill="' + q.c + '" fill-opacity="0.05"/>';
  });

  // 轴线
  s += '<line x1="' + padL + '" y1="' + (padT+ph) + '" x2="' + (padL+pw) + '" y2="' + (padT+ph) +
       '" stroke="' + CX.line + '" stroke-width="1"/>';
  s += '<line x1="' + padL + '" y1="' + padT + '" x2="' + padL + '" y2="' + (padT+ph) +
       '" stroke="' + CX.line + '" stroke-width="1"/>';
  // 阈值线
  s += '<line x1="' + xm.toFixed(0) + '" y1="' + padT + '" x2="' + xm.toFixed(0) + '" y2="' + (padT+ph) +
       '" stroke="' + CX.mute + '" stroke-dasharray="4 3"/>';
  s += '<line x1="' + padL + '" y1="' + ym.toFixed(0) + '" x2="' + (padL+pw) + '" y2="' + ym.toFixed(0) +
       '" stroke="' + CX.mute + '" stroke-dasharray="4 3"/>';
  // 轴标
  s += '<text x="' + (padL + pw/2) + '" y="' + (H - 26) + '" font-size="11" fill="' + CX.sub +
       '" text-anchor="middle">相对市场份额 →</text>';
  s += '<text x="20" y="' + (padT + ph/2) + '" font-size="11" fill="' + CX.sub +
       '" text-anchor="middle" transform="rotate(-90 20 ' + (padT + ph/2) + ')">市场增长率 →</text>';
  // 象限角标
  var lbl = [
    {x:padL+8, y:padT+16, t:'❓ 问题儿童'},
    {x:padL+pw-8, y:padT+16, t:'⭐ 明星'},
    {x:padL+8, y:padT+ph-8, t:'🐕 瘦狗'},
    {x:padL+pw-8, y:padT+ph-8, t:'🐄 现金牛'}
  ];
  lbl.forEach(function(l){
    s += '<text x="' + l.x + '" y="' + l.y + '" font-size="10" fill="' + CX.mute +
         '" text-anchor="' + (l.x > padL+pw/2 ? 'end' : 'start') + '">' + l.t + '</text>';
  });

  // 气泡
  rows.forEach(function(r){
    var cx = X(r.share), cy = Y(r.growth);
    var rad = 10 + Math.sqrt((r.sales||0) / maxS) * 26;
    var Q = BCG_QUAD[r.q];
    s += '<circle cx="' + cx.toFixed(0) + '" cy="' + cy.toFixed(0) + '" r="' + rad.toFixed(0) +
         '" fill="' + Q.color + '" fill-opacity="0.22" stroke="' + Q.color + '" stroke-width="1.5"/>';
    s += '<text x="' + cx.toFixed(0) + '" y="' + (cy + 3).toFixed(0) + '" font-size="10.5" fill="' +
         CX.ink + '" text-anchor="middle" font-weight="600">' + esc(r.n.slice(0, 6)) + '</text>';
    s += '<text x="' + cx.toFixed(0) + '" y="' + (cy + 15).toFixed(0) + '" font-size="9" fill="' +
         CX.mute + '" text-anchor="middle">' + (r.growth) + '%</text>';
  });

  // 阈值注记
  s += '<text x="' + (W - padR) + '" y="' + (H - 44) + '" font-size="10" fill="' + CX.mute +
       '" text-anchor="end">阈值：增长率 ' + gTh + '%　份额 ' + mTh + '　气泡大小=销售额</text>';
  s += '</svg>';
  return s;
}

/* ---------- 版本快照与迁移 ---------- */
function saveSnap(){
  var S = sm();
  var b = calcBcg();
  var name = prompt('快照名称（如：Q3 战略复盘）：', '快照 ' + (S.snaps.length + 1));
  if(!name) return;
  S.snaps.push({
    id:'sn' + Date.now(),
    name:name,
    date:ymd(new Date()),
    swot:JSON.parse(JSON.stringify(S.swot)),
    bcg:JSON.parse(JSON.stringify(S.bcg)),
    bcgMode:S.bcgMode
  });
  save(); renderSnaps();
  toast('已保存快照：' + name);
}

function renderSnaps(){
  var host = $('#smSnaps'); if(!host) return;
  var S = sm();
  var cnt = $('#smSnapCount');
  if(cnt) cnt.textContent = S.snaps.length ? (S.snaps.length + ' 个快照') : '暂无';
  if(!S.snaps.length){
    host.innerHTML = '<span class="ph">保存快照后可对比两次分析的位置迁移</span>';
    renderSnapTrack();
    return;
  }
  host.innerHTML = '';
  S.snaps.forEach(function(sn, i){
    var d = document.createElement('div');
    d.className = 'snaprow';
    d.innerHTML = '<span class="snaprow__d">' + sn.date + '</span>' +
      '<span class="snaprow__n">' + esc(sn.name) + '</span>' +
      '<span class="snaprow__c">' + (sn.bcg||[]).length + ' 条业务线</span>' +
      '<button class="btn btn--sm btn--ghost" data-snapcmp="' + i + '">对比当前</button>' +
      '<button class="btn btn--sm btn--ghost" data-snapdel="' + i + '">🗑</button>';
    host.appendChild(d);
  });
  [].forEach.call(host.querySelectorAll('[data-snapcmp]'), function(b){
    b.onclick = function(){ cmpSnap(parseInt(b.getAttribute('data-snapcmp'),10)); };
  });
  [].forEach.call(host.querySelectorAll('[data-snapdel]'), function(b){
    b.onclick = function(){
      sm().snaps.splice(parseInt(b.getAttribute('data-snapdel'),10),1); save(); renderSnaps();
      var tr = $('#smBcgTrack'); if(tr) tr.innerHTML = '';
    };
  });
  renderSnapTrack();
}

/* 迁移对比：同一业务线两次快照的象限变化 */
function cmpSnap(i){
  var S = sm();
  var sn = S.snaps[i]; if(!sn) return;
  var cur = S.bcg;
  var gTh = 10;
  var gs = cur.map(function(r){ return r.growth; }).sort(function(a,b){ return a-b; });
  if(gs.length) gTh = gs[Math.floor(gs.length/2)] || 10;
  var mTh = (S.bcgMode === 'ratio') ? 1 : 50;
  var quadOf = function(r, mode, th){
    var t = mode === 'ratio' ? 1 : 50;
    var hiG = r.growth >= th.g, hiM = r.share >= t;
    return hiG ? (hiM ? 'star' : 'question') : (hiM ? 'cash' : 'dog');
  };
  var sg = (sn.bcg||[]).map(function(r){ return r.growth; }).sort(function(a,b){ return a-b; });
  var sgTh = sg.length ? (sg[Math.floor(sg.length/2)] || 10) : 10;

  var o = [];
  o.push('### 🔄 迁移对比：' + sn.name + '（' + sn.date + '）→ 当前');
  o.push('');
  o.push('| 业务线 | 当时 | 现在 | 迁移 |');
  o.push('|---|---|---|---|');
  var moves = [];
  cur.forEach(function(r){
    var old = (sn.bcg||[]).filter(function(x){ return x.n === r.n; })[0];
    if(!old) return;
    var q1 = quadOf(old, sn.bcgMode, {g:sgTh});
    var q2 = r.q || quadOf(r, S.bcgMode, {g:gTh});
    var same = q1 === q2;
    var chg = (r.growth - old.growth);
    o.push('| ' + r.n + ' | ' + BCG_QUAD[q1].icon + BCG_QUAD[q1].n + ' | ' +
           BCG_QUAD[q2].icon + BCG_QUAD[q2].n + ' | ' +
           (same ? '持平' : (BCG_QUAD[q1].icon + ' → ' + BCG_QUAD[q2].icon)) + ' |');
    if(!same) moves.push({n:r.n, from:q1, to:q2, chg:chg});
  });
  o.push('');
  if(!moves.length){
    o.push('本次对比未发现象限迁移。');
  } else {
    o.push('**迁移解读**');
    o.push('');
    moves.forEach(function(m){
      var good = (m.to === 'star' || m.to === 'cash');
      o.push('- **' + m.n + '**：' + BCG_QUAD[m.from].icon + BCG_QUAD[m.from].n +
             ' → ' + BCG_QUAD[m.to].icon + BCG_QUAD[m.to].n +
             '　' + (good ? '✅ 投入见效' : '⚠️ 需关注') +
             '　增长率变化 ' + (m.chg >= 0 ? '+' : '') + m.chg.toFixed(0) + '%');
    });
  }
  var host = $('#smSnapOut');
  if(host) host.innerHTML = mdLite(o.join('\n'));
  // 矢量迁移图（BCG 象限间箭头）
  renderSnapShift(i);
}

/* ---------- 导出 ---------- */
function exportStrategy(){
  var S = sm();
  var o = [];
  o.push('# 🎯 战略分析报告');
  o.push('');
  o.push('> ' + (S.name || '未命名项目') + '　·　' + new Date().toLocaleString('zh-CN'));
  o.push('>');
  o.push('> 本地生成，数据不出浏览器。');
  o.push('');
  o.push('## 一、SWOT 分析');
  o.push('');
  SWOT_KEYS.forEach(function(K){
    var items = (S.swot[K.k]||[]).filter(function(x){ return x.t && x.t.trim(); });
    o.push('### ' + K.icon + ' ' + K.n);
    o.push('');
    if(!items.length){ o.push('*未填写*'); o.push(''); return; }
    items.forEach(function(x){
      o.push('- **' + x.t + '**' +
        '　⚖' + svW(x) +
        (x.v ? '　📊 ' + x.v + (x.d ? ' ' + x.d : '') : '') +
        (x.src ? '　*来源：' + x.src + '*' : ''));
    });
    o.push('');
  });
  // 加权态势与 TOWS 交叉强度（矢量层的结论，纯文本形式进报告）
  svExportBlock().forEach(function(l){ o.push(l); });
  o.push('## 二、TOWS 交叉策略');
  o.push('');
  var tw = calcTows();
  if(!tw.length){ o.push('*四象限需各填至少一条*'); }
  tw.forEach(function(x){
    o.push('### ' + x.k + '　' + x.icon + ' ' + x.n + '：' + x.head);
    o.push('');
    o.push('**参与要素**：' + x.elems);
    o.push('');
    o.push('**判断依据**：' + x.why);
    o.push('');
    o.push('**建议动作**：');
    o.push('');
    x.actions.forEach(function(a, i){ o.push((i+1) + '. ' + a); });
    o.push('');
  });
  o.push('## 三、BCG 业务组合');
  o.push('');
  var b = calcBcg();
  if(b){
    o.push('| 业务线 | 销售额 | 增长率 | 相对份额 | 利润% | 象限 | 建议 | 预算 |');
    o.push('|---|---|---|---|---|---|---|---|');
    b.ranked.forEach(function(r){
      var Q = BCG_QUAD[r.q];
      o.push('| ' + r.n + ' | ' + r.sales + ' | ' + r.growth + '% | ' + r.share + ' | ' +
             r.profit + '% | ' + Q.icon + Q.n + ' | ' + Q.plan + ' | ' + Q.budget + ' |');
    });
  } else { o.push('*未填写*'); }
  o.push('');
  o.push('---');
  o.push('');
  o.push('*象限判定与预算建议为基于所填数据的推导，不构成投资建议。*');
  downloadFile('战略分析_' + ymd(new Date()) + '.md', o.join('\n'), 'text/markdown');
}

/* ---------- 示例 ---------- */
function demoStrategy(){
  var S = sm();
  S.name = '示例：新消费美妆品牌';
  S.swot = {
    s:[
      {t:'品牌认知度高', v:'87%', d:'+5%', src:'Q1 品牌调研'},
      {t:'供应链稳定', v:'交货准时率 98.6%', d:'', src:'内部数据'}
    ],
    w:[
      {t:'营销预算有限', v:'200 万', d:'-12%', src:'财务预算'},
      {t:'团队人手不足', v:'人均产出低于行业 30%', d:'', src:'人力盘点'}
    ],
    o:[
      {t:'新消费趋势', v:'市场规模年增 23%', d:'', src:'行业报告'},
      {t:'内容平台红利', v:'小红书美妆流量 +40%', d:'', src:'平台数据'}
    ],
    t:[
      {t:'竞品降价', v:'市占率环比 -3%', d:'', src:'竞品档案'},
      {t:'新入局者增多', v:'', d:'', src:''}
    ]
  };
  S.bcg = [
    {n:'抖音直播', sales:1200, growth:38, share:1.4, profit:28},
    {n:'天猫店',   sales:2400, growth:6,  share:2.1, profit:60},
    {n:'小红书',   sales:420,  growth:45, share:0.6, profit:8},
    {n:'微博',     sales:180,  growth:2,  share:0.4, profit:3}
  ];
  S.bcgMode = 'ratio';
  save();
  var mm = $('#smBcgMode'); if(mm) mm.value = 'ratio';
  renderStratAll();
  toast('已填入示例数据');
}

function renderStratAll(){
  renderSwot(); renderBcg(); renderSnaps();
  svBindToggles(); renderTowsViz(); renderSnapTrack();
  var nm = $('#smName'); if(nm) nm.value = sm().name || '';
}
