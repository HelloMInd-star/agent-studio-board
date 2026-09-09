/* ============================================================
 * 调研方案 —— 引导式营销调研模板库
 * 内核来源：把「觉醉」调研项目的方法论结构化
 *   0 待验证假设（区分已验证/待验证/已推翻，这是专业度的核心）
 *   1 TAM/SAM/SOM 市场测算
 *   2 竞品 × 画像交叉矩阵（找空白格）
 *   3 三层用户结构 + 转化路径
 *   4 定价验证（WTP 曲线 + Van Westendorp 双模型）
 *   5 可行性分期 + 风险清单
 * ============================================================ */

/* ---------- 模板类型：每类预置假设骨架与画像分层 ---------- */
var RS_TEMPLATES = {
  consumer: {
    n:'新消费品牌', icon:'🧴',
    assumptions:[
      '目标市场处于增长通道',
      '核心用户层的付费假设成立',
      '目标定价落在用户可接受区间',
      '产品闭环带来显著高于工具型竞品的留存'
    ],
    segs:[
      {n:'主力', pct:50, who:'核心高频用户', need:'核心需求被完整满足'},
      {n:'泛用户', pct:35, who:'低频尝鲜用户', need:'轻需求 + 社交货币'},
      {n:'长尾', pct:15, who:'专业/从业者', need:'专业工具 + 创作素材'}
    ],
    axes:['实用 ←→ 体验', '低频 ←→ 高频']
  },
  app: {
    n:'APP / 订阅产品', icon:'📱',
    assumptions:[
      '目标用户存在明确的持续性需求',
      '订阅制付费心智已被市场教育',
      '目标 ARPU 处于用户可接受区间',
      '留存曲线优于同类工具型产品'
    ],
    segs:[
      {n:'核心用户', pct:50, who:'高频重度用户', need:'深度功能 + 个性化'},
      {n:'活跃用户', pct:35, who:'周期性使用', need:'核心功能够用'},
      {n:'创作者/专业', pct:15, who:'产出内容的人', need:'专业工具 + 分发'}
    ],
    axes:['工具 ←→ 内容', '通用 ←→ 垂直']
  },
  offline: {
    n:'线下门店 / 空间', icon:'🏪',
    assumptions:[
      '选址半径内有足够目标客群',
      '客单价与复购频次支撑模型',
      '体验差异化足以驱动到店',
      '坪效/人效达到行业基准'
    ],
    segs:[
      {n:'周边常客', pct:50, who:'3 公里内高频', need:'便利 + 稳定品质'},
      {n:'目的性到访', pct:35, who:'专程打卡', need:'体验独特性'},
      {n:'团体/活动', pct:15, who:'包场/团建', need:'空间 + 服务'}
    ],
    axes:['刚需 ←→ 体验', '低价 ←→ 高价']
  },
  b2b: {
    n:'B 端服务 / SaaS', icon:'💼',
    assumptions:[
      '目标行业存在明确痛点且预算已存在',
      '决策链可在合理周期内走完',
      'ACV 与 LTV/CAC 比例健康',
      '产品可被标准化交付而非纯定制'
    ],
    segs:[
      {n:'标杆客户', pct:50, who:'行业中大型', need:'完整方案 + 案例背书'},
      {n:'中小客户', pct:35, who:'长尾 SMB', need:'轻量好用 + 低门槛'},
      {n:'渠道伙伴', pct:15, who:'代理/集成商', need:'可分润 + 易交付'}
    ],
    axes:['标准化 ←→ 定制', '轻量 ←→ 重度']
  }
};

/* ---------- 当前调研数据（挂在 state 上） ---------- */
function rs(){
  if(!state.research) state.research = {
    tpl:'consumer',
    name:'',
    assumptions:[],
    market:{users:'', arpu:'', samRate:'', somRate:''},
    rivals:[],       // {name, cells:['full','partial','none', ...]}
    segs:[],         // 分层（从模板带入，可改）
    wtp:{prices:'0,9.9,19,39,99', counts:'8,22,28,12,10', target:'19'},
    feas:{stages:'', risks:''},
    ver:{
      market:{users:'万人', note:'目标市场总人数'},
      arpu:{users:'元/年', note:'年均付费'}
    }
  };
  return state.research;
}

/* ---------- 模板切换：带入骨架 ---------- */
function applyTpl(k){
  var t = RS_TEMPLATES[k]; if(!t) return;
  var R = rs();
  R.tpl = k;
  R.assumptions = t.assumptions.map(function(a){
    return {text:a, how:'', status:'todo'};
  });
  R.segs = t.segs.map(function(s){
    return {n:s.n, pct:s.pct, who:s.who, need:s.need};
  });
  R.axes = t.axes.slice();
  save();
  renderRsAll();
  toast('已套用「' + t.n + '」模板骨架');
}

/* ---------- 假设清单渲染 ---------- */
function renderAssump(){
  var host = $('#rsAssump'); if(!host) return;
  var R = rs();
  host.innerHTML = '';
  if(!R.assumptions.length){
    host.innerHTML = '<span class="ph">选择模板后会自动带入假设骨架</span>';
    return;
  }
  var ST = {todo:'待验证', doing:'验证中', done:'已验证', fail:'已推翻'};
  R.assumptions.forEach(function(a, i){
    var row = document.createElement('div');
    row.className = 'asrow is-' + a.status;
    row.innerHTML =
      '<span class="asrow__st">' + (ST[a.status]||'待验证') + '</span>' +
      '<input type="text" class="asrow__t" value="' + esc(a.text) + '" placeholder="假设描述">' +
      '<input type="text" class="asrow__h" value="' + esc(a.how) + '" placeholder="验证方式（如：问卷 Q3 / 50 份）">' +
      '<select class="asrow__s">' +
        ['todo','doing','done','fail'].map(function(k){
          return '<option value="' + k + '"' + (a.status===k?' selected':'') + '>' + (ST[k]) + '</option>';
        }).join('') +
      '</select>' +
      '<button class="btn btn--sm btn--ghost" data-asdel="' + i + '">✕</button>';
    host.appendChild(row);
    var ti = row.querySelector('.asrow__t'), hi = row.querySelector('.asrow__h'),
        si = row.querySelector('.asrow__s');
    ti.addEventListener('input', function(){ a.text = ti.value; save(); });
    hi.addEventListener('input', function(){ a.how = hi.value; save(); });
    si.addEventListener('change', function(){ a.status = si.value; save(); renderAssump(); renderRsReport(); });
  });
  [].forEach.call(host.querySelectorAll('[data-asdel]'), function(b){
    b.onclick = function(){
      R.assumptions.splice(parseInt(b.getAttribute('data-asdel'),10), 1);
      save(); renderAssump();
    };
  });
  // 统计
  var c = $('#rsAssumpCount');
  if(c){
    var done = R.assumptions.filter(function(a){ return a.status === 'done'; }).length;
    c.textContent = done + ' / ' + R.assumptions.length + ' 已验证';
  }
}
function addAssump(){
  rs().assumptions.push({text:'', how:'', status:'todo'});
  save(); renderAssump();
}

/* ---------- 1. TAM/SAM/SOM ---------- */
function calcTAM(){
  var R = rs();
  var num = function(id){ var e=$(id); var v=parseFloat(e&&e.value); return isNaN(v)?0:v; };
  var uu = $('#rs_uunit') ? (parseFloat($('#rs_uunit').value) || 10000) : 10000;
  var usersRaw = num('#rs_users');
  var users = usersRaw * uu;      // 换算成「人」
  var arpu = num('#rs_arpu'),
      samR = num('#rs_samr'), somR = num('#rs_somr');
  R.market = {users:usersRaw, unit:uu, arpu:arpu, samRate:samR, somRate:somR};
  save();
  if(!users || !arpu){
    var w = $('#rsTamOut'); if(w) w.innerHTML = '<span class="ph">填写「目标用户数」与「年均付费」后自动计算</span>';
    return null;
  }
  var tam = users * arpu;
  var samN = users * (samR || 100) / 100;
  var sam = samN * arpu;
  var somN = samN * (somR || 1) / 100;
  var som = somN * arpu;
  var res = {users:users, arpu:arpu, tam:tam, samN:samN, sam:sam, somN:somN, som:som,
             samRate:samR||100, somRate:somR||1};
  var w2 = $('#rsTamOut');
  if(w2){
    var o = [];
    o.push('| 层级 | 用户数 | 年均付费 | 市场规模 |');
    o.push('|---|---|---|---|');
    o.push('| **TAM** 总市场 | ' + fmtN(res.users) + ' | ' + res.arpu + ' | **' + fmtMoney(res.tam) + '** |');
    o.push('| **SAM** 可服务 | ' + fmtN(res.samN) + '（' + res.samRate + '%） | ' + res.arpu + ' | **' + fmtMoney(res.sam) + '** |');
    o.push('| **SOM** 可获得 | ' + fmtN(res.somN) + '（' + res.somRate + '%） | ' + res.arpu + ' | **' + fmtMoney(res.som) + '** |');
    o.push('');
    o.push('> 算法：用户数 × 年均付费。**这是假设模型，需用真实数据校准。**');
    w2.innerHTML = mdLite(o.join('\n'));
  }
  return res;
}

/* ---------- 2. 竞品 × 画像交叉矩阵 ---------- */
var CELL = {full:{s:'●', n:'满足'}, partial:{s:'◐', n:'局部'}, none:{s:'✕', n:'缺失'}};

function renderCross(){
  var host = $('#rsCross'); if(!host) return;
  var R = rs();
  if(!R.segs.length || !R.rivals.length){
    host.innerHTML = '<span class="ph">先在下方的「用户分层」与「竞品」里填入数据</span>';
    return;
  }
  var t = '<table class="mdtbl crosstbl"><thead><tr><th>竞品 ＼ 用户层</th>';
  R.segs.forEach(function(s){ t += '<th>' + esc(s.n) + '<br><small>' + s.pct + '%</small></th>'; });
  t += '</tr></thead><tbody>';
  R.rivals.forEach(function(r, ri){
    t += '<tr><td><input type="text" class="ctname" value="' + esc(r.name) + '" data-ri="' + ri + '"></td>';
    R.segs.forEach(function(s, si){
      var v = r.cells[si] || 'none';
      t += '<td><select class="ctsel is-' + v + '" data-ri="' + ri + '" data-si="' + si + '">' +
        Object.keys(CELL).map(function(k){
          return '<option value="' + k + '"' + (v===k?' selected':'') + '>' + CELL[k].s + ' ' + CELL[k].n + '</option>';
        }).join('') + '</select></td>';
    });
    t += '<td><button class="btn btn--sm btn--ghost" data-rdel="' + ri + '">✕</button></td></tr>';
  });
  t += '</tbody></table>';
  host.innerHTML = t;

  [].forEach.call(host.querySelectorAll('.ctname'), function(el){
    el.addEventListener('input', function(){
      R.rivals[parseInt(el.getAttribute('data-ri'),10)].name = el.value; save();
    });
  });
  [].forEach.call(host.querySelectorAll('.ctsel'), function(el){
    el.addEventListener('change', function(){
      var ri = parseInt(el.getAttribute('data-ri'),10), si = parseInt(el.getAttribute('data-si'),10);
      R.rivals[ri].cells[si] = el.value;
      el.className = 'ctsel is-' + el.value;
      save(); renderCrossNote();
    });
  });
  [].forEach.call(host.querySelectorAll('[data-rdel]'), function(b){
    b.onclick = function(){ R.rivals.splice(parseInt(b.getAttribute('data-rdel'),10),1); save(); renderCross(); renderCrossNote(); };
  });
  renderCrossNote();
}

/* 交叉矩阵的核心洞察：找出所有竞品都未满足的用户层 */
function renderCrossNote(){
  var host = $('#rsCrossNote'); if(!host) return;
  var R = rs();
  if(!R.segs.length || !R.rivals.length){ host.innerHTML = ''; return; }
  var gaps = [];
  R.segs.forEach(function(s, si){
    var full = R.rivals.filter(function(r){ return r.cells[si] === 'full'; }).length;
    if(full === 0){
      gaps.push({n:s.n, pct:s.pct, why:'无任何竞品完整满足'});
    }
  });
  var out = [];
  if(gaps.length){
    out.push('### 🔥 市场空白格');
    out.push('');
    gaps.forEach(function(g){
      out.push('- **' + g.n + '（' + g.pct + '%）**：' + g.why + ' → 可作为差异化切口');
    });
  } else {
    out.push('未发现完全空白的用户层（每层至少有 1 家竞品完整满足）。');
    out.push('');
    out.push('> 此时应转向**局部满足**的层：找竞品普遍只做到 ◐（局部）的层，比拼谁能做完整。');
  }
  host.innerHTML = mdLite(out.join('\n'));
}

function addRivalRow(){
  var R = rs();
  R.rivals.push({name:'竞品 ' + (R.rivals.length+1), cells:R.segs.map(function(){ return 'none'; })});
  save(); renderCross();
}

/* ---------- 3. 用户分层 ---------- */
function renderSegs(){
  var host = $('#rsSegs'); if(!host) return;
  var R = rs();
  if(!R.segs.length){ host.innerHTML = '<span class="ph">选择模板后自动带入分层骨架</span>'; return; }
  var total = R.segs.reduce(function(a,s){ return a + (parseFloat(s.pct)||0); }, 0);
  host.innerHTML = '';
  R.segs.forEach(function(s, i){
    var row = document.createElement('div');
    row.className = 'segrow';
    row.innerHTML =
      '<input type="text" class="segrow__n" value="' + esc(s.n) + '" placeholder="分层名">' +
      '<input type="number" class="segrow__p" value="' + s.pct + '" min="0" max="100">%' +
      '<input type="text" class="segrow__w" value="' + esc(s.who) + '" placeholder="人群描述">' +
      '<input type="text" class="segrow__d" value="' + esc(s.need) + '" placeholder="核心需求">' +
      '<button class="btn btn--sm btn--ghost" data-sdel="' + i + '">✕</button>';
    host.appendChild(row);
    var q = function(sel){ return row.querySelector(sel); };
    q('.segrow__n').addEventListener('input', function(){ s.n = this.value; save(); renderCross(); });
    q('.segrow__p').addEventListener('input', function(){ s.pct = parseFloat(this.value)||0; save(); renderSegSum(); });
    q('.segrow__w').addEventListener('input', function(){ s.who = this.value; save(); });
    q('.segrow__d').addEventListener('input', function(){ s.need = this.value; save(); });
  });
  [].forEach.call(host.querySelectorAll('[data-sdel]'), function(b){
    b.onclick = function(){
      var i = parseInt(b.getAttribute('data-sdel'),10);
      R.segs.splice(i,1);
      R.rivals.forEach(function(r){ r.cells.splice(i,1); });
      save(); renderSegs(); renderCross();
    };
  });
  renderSegSum();
}
function renderSegSum(){
  var R = rs(), c = $('#rsSegSum');
  if(!c) return;
  var total = R.segs.reduce(function(a,s){ return a + (parseFloat(s.pct)||0); }, 0);
  var ok = Math.abs(total - 100) < 0.5;
  c.textContent = '合计 ' + total + '%' + (ok ? ' ✅' : ' ⚠️ 应为 100%');
  c.style.color = ok ? 'var(--ok)' : 'var(--warn)';
}
function addSeg(){
  rs().segs.push({n:'新分层', pct:0, who:'', need:''});
  rs().rivals.forEach(function(r){ r.cells.push('none'); });
  save(); renderSegs(); renderCross();
}

/* ---------- 4. 定价验证：WTP 曲线 + Van Westendorp ---------- */
function bindUnit(){
  var u = $('#rs_uunit');
  if(u) u.addEventListener('change', function(){ calcTAM(); });
  var el = $('#rs_exlast');
  if(el) el.addEventListener('change', function(){ calcWTP(); });
}

function calcWTP(){
  var R = rs();
  var pStr = ($('#rs_prices') && $('#rs_prices').value) || '0,9.9,19,39,99';
  var cStr = ($('#rs_counts') && $('#rs_counts').value) || '';
  var target = parseFloat(($('#rs_target') && $('#rs_target').value) || 0);
  var prices = pStr.split(/[,，\s]+/).map(function(x){ return parseFloat(x); }).filter(function(x){ return !isNaN(x); });
  var counts = cStr.split(/[,，\s]+/).map(function(x){ return parseFloat(x); }).filter(function(x){ return !isNaN(x); });
  R.wtp = {prices:pStr, counts:cStr, target:target};
  save();
  var host = $('#rsWtpOut');
  if(prices.length !== counts.length || !prices.length){
    if(host) host.innerHTML = '<span class="ph">价格点与人数数量需一致（如 5 个价格点对应 5 个数字）</span>';
    return null;
  }
  var total = counts.reduce(function(a,b){ return a+b; }, 0);
  if(!total){ if(host) host.innerHTML = '<span class="ph">请填写各价位选择人数</span>'; return null; }

  /* --- 模型 A：支付意愿曲线（WTP）--- 匹配单问"你愿意付多少" --- */
  // 累计接受度：选该价及以下的占比
  var rows = [], cum = 0;
  prices.forEach(function(p, i){
    cum += counts[i];
    var accept = cum / total;              // 接受此价及以下的比例
    rows.push({p:p, n:counts[i], cum:cum, accept:accept, above:1 - accept + counts[i]/total});
  });
  // 愿付此价及以上的人数（用于算收入）
  var exLast = $('#rs_exlast') ? $('#rs_exlast').checked : true;
  var cmpEnd = (exLast && rows.length > 1) ? rows.length - 1 : rows.length;
  rows.forEach(function(r, i){
    var above = 0;
    for(var j = i; j < cmpEnd; j++) above += rows[j].n;
    r.aboveN = above;
    r.rev = r.p * above;                    // 预期收入
    r.inCmp = i < cmpEnd;                   // 是否参与最优价比较
  });
  // 收入最大化价格（只在同口径档位间比较）
  var cmpRows = rows.filter(function(r){ return r.inCmp; });
  var best = cmpRows.reduce(function(a,b){ return b.rev > a.rev ? b : a; }, cmpRows[0]);
  // 50% 接受价格（中位数 WTP）：线性插值
  var med = null;
  for(var i = 1; i < rows.length; i++){
    if(rows[i-1].accept < 0.5 && rows[i].accept >= 0.5){
      var t = (0.5 - rows[i-1].accept) / (rows[i].accept - rows[i-1].accept || 1);
      med = rows[i-1].p + t * (rows[i].p - rows[i-1].p);
      break;
    }
  }
  if(med === null) med = rows[rows.length-1].accept >= 0.5 ? rows[0].p : rows[rows.length-1].p;

  /* --- 模型 B：标准 Van Westendorp 需四问数据，此处仅作说明 --- */
  var vw = null;
  var vwOn = $('#rs_vw') && $('#rs_vw').checked;
  if(vwOn){
    var raw = ($('#rs_vwdata') && $('#rs_vwdata').value) || '';
    var lines = raw.split('\n').map(function(l){ return l.trim(); }).filter(Boolean);
    if(lines.length >= 2){
      var pts = [];
      lines.forEach(function(l){
        var a = l.split(/[,，\s]+/).map(parseFloat).filter(function(x){ return !isNaN(x); });
        if(a.length >= 5) pts.push({p:a[0], tc:a[1], c:a[2], e:a[3], te:a[4]});
      });
      if(pts.length >= 2) vw = solveVW(pts);
    }
  }

  var res = {rows:rows, total:total, best:best, med:med, target:target, vw:vw};
  if(host) host.innerHTML = mdLite(wtpReport(res));
  return res;
}

/* 标准 Van Westendorp 求解：给定若干价格点的四类百分比，线性插值求交点 */
function solveVW(pts){
  // 找两条曲线的交点（反号或跨越处线性插值）
  var cross = function(aKey, bKey){
    for(var i = 1; i < pts.length; i++){
      var a0 = pts[i-1][aKey] - pts[i-1][bKey], a1 = pts[i][aKey] - pts[i][bKey];
      if(a0 === 0) return pts[i-1].p;
      if(a0 * a1 < 0){
        var t = Math.abs(a0) / (Math.abs(a0) + Math.abs(a1));
        return pts[i-1].p + t * (pts[i].p - pts[i-1].p);
      }
    }
    return null;
  };
  var opp = cross('tc','te');   // 太便宜 与 太贵
  var ipc = cross('c','e');     // 便宜 与 贵
  // 可接受区间：太便宜=50% 与 太贵=50% 对应的价格
  var atPct = function(key, v){
    for(var i = 1; i < pts.length; i++){
      var v0 = pts[i-1][key], v1 = pts[i][key];
      if((v0 - v) * (v1 - v) <= 0 && v0 !== v1){
        var t = (v - v0) / (v1 - v0);
        return pts[i-1].p + t * (pts[i].p - pts[i-1].p);
      }
    }
    return null;
  };
  return {opp:opp, ipc:ipc, lo:atPct('tc', 50), hi:atPct('te', 50)};
}

function wtpReport(r){
  var o = [];
  o.push('### 📊 支付意愿分布（WTP）');
  o.push('');
  o.push('> 样本 **' + r.total + '** 份　|　每个价格点的「接受此价及以下」比例与预期收入：');
  o.push('');
  o.push('| 价格 | 选择人数 | 累计接受 | 愿付此价及以上 | 预期收入 |');
  o.push('|---|---|---|---|---|');
  r.rows.forEach(function(x){
    var mark = (r.target && Math.abs(x.p - r.target) < 0.01) ? ' ⭐' : '';
    var ex = x.inCmp ? '' : '（不参与）';
    o.push('| ' + x.p + mark + ' | ' + x.n + ' | ' + (x.accept*100).toFixed(0) + '% | ' +
           x.aboveN + ' 人 | **' + x.rev.toFixed(0) + '** ' + ex + ' |');
  });
  o.push('');
  o.push('**关键结果**');
  o.push('');
  o.push('- **收入最大化价格**：**' + r.best.p + '**（预期收入 ' + r.best.rev.toFixed(0) + '）');
  o.push('- **中位数支付意愿**（50% 用户可接受）：约 **' + r.med.toFixed(1) + '**');
  if(r.target){
    o.push('');
    var tj, tip;
    if(Math.abs(r.target - r.best.p) < 0.01){
      tj = '✅ **恰为收入最大化点**';
      tip = '定价合理。若想冲量可下调至中位数 ' + r.med.toFixed(1) + ' 附近换取更高转化。';
    } else if(r.target < r.med){
      tj = '✅ 低于中位数支付意愿（' + r.med.toFixed(1) + '）';
      tip = '多数用户可接受，转化率高；但总收入未最大化，可考虑增设更高档位承接高支付意愿用户。';
    } else if(r.target < r.best.p){
      tj = '🟡 介于中位数（' + r.med.toFixed(1) + '）与最优价（' + r.best.p + '）之间';
      tip = '属于"牺牲部分转化率换客单价"，需配合明确的价值塑造（成分/背书/权益）支撑溢价。';
    } else {
      tj = '⚠️ 高于收入最大化点（' + r.best.p + '）';
      tip = '预计会因价格流失大量用户，总收入反而下降。建议下调，或改为"低价引流 + 高价进阶"两档。';
    }
    o.push('- **目标价 ' + r.target + ' 的判定**：' + tj);
    o.push('- **建议**：' + tip);
    var acc = null;
    r.rows.forEach(function(x){ if(Math.abs(x.p - r.target) < 0.01) acc = x.accept; });
    if(acc !== null) o.push('- **该价位累计接受度**：' + (acc*100).toFixed(0) + '% 的用户接受此价或更低');
  }
  o.push('');
  if(r.vw){
    o.push('### 📐 标准 Van Westendorp（四问数据）');
    o.push('');
    o.push('- **OPP**（最优价格点）≈ **' + (r.vw.opp !== null ? r.vw.opp.toFixed(1) : '—') + '**');
    o.push('- **IPC**（无差异价格）≈ **' + (r.vw.ipc !== null ? r.vw.ipc.toFixed(1) : '—') + '**');
    o.push('- **可接受区间**：' + (r.vw.lo !== null ? r.vw.lo.toFixed(1) : '—') +
           ' ~ ' + (r.vw.hi !== null ? r.vw.hi.toFixed(1) : '—'));
  } else {
    o.push('> 💡 **关于 Van Westendorp**：标准模型需要四个独立问题（什么价太便宜/便宜/贵/太贵），');
    o.push('> 单题「你愿意付多少」严格来说不适合直接套用。上方用的是更匹配的 **WTP 曲线**。');
    o.push('> 若你已做四问调研，勾选「我有四问数据」可启用标准模型。');
  }
  return o.join('\n');
}

/* ---------- 报告生成 ---------- */
function buildResearchReport(){
  var R = rs();
  var T = RS_TEMPLATES[R.tpl] || RS_TEMPLATES.consumer;
  var out = [];
  out.push('# ' + (R.name || '未命名项目') + ' · 市场调研方案');
  out.push('');
  out.push('> 模板：**' + T.n + '**　·　生成于 ' + new Date().toLocaleString('zh-CN'));
  out.push('>');
  out.push('> 本地生成，数据不出浏览器。');
  out.push('');
  out.push('---');
  out.push('');

  /* 0 假设 */
  out.push('## 0. 待验证假设');
  out.push('');
  if(R.assumptions.length){
    var ST = {todo:'待验证', doing:'验证中', done:'已验证', fail:'已推翻'};
    out.push('| 状态 | 假设 | 验证方式 |');
    out.push('|---|---|---|');
    R.assumptions.forEach(function(a){
      out.push('| ' + (ST[a.status]||'待验证') + ' | ' + (a.text||'—') + ' | ' + (a.how||'—') + ' |');
    });
    var un = R.assumptions.filter(function(a){ return a.status !== 'done'; }).length;
    out.push('');
    if(un){
      out.push('⚠️ **尚有 ' + un + ' 条假设未验证。** 报告中的相关结论应视为待验证，不宜直接对外引用。');
    } else {
      out.push('✅ 所有假设均已验证。');
    }
  } else {
    out.push('*未填写假设清单。*');
  }
  out.push('');

  /* 1 市场 */
  var tam = calcTAM();
  out.push('## 1. 市场测算');
  out.push('');
  if(tam){
    out.push('| 层级 | 用户数 | 年均付费 | 市场规模 |');
    out.push('|---|---|---|---|');
    out.push('| TAM 总市场 | ' + fmtN(tam.users) + ' | ' + tam.arpu + ' | **' + fmtMoney(tam.tam) + '** |');
    out.push('| SAM 可服务 | ' + fmtN(tam.samN) + '（' + tam.samRate + '%） | ' + tam.arpu + ' | **' + fmtMoney(tam.sam) + '** |');
    out.push('| SOM 可获得 | ' + fmtN(tam.somN) + '（' + tam.somRate + '%） | ' + tam.arpu + ' | **' + fmtMoney(tam.som) + '** |');
    out.push('');
    out.push('> 算法：用户数 × 年均付费；SAM/SOM 按比例折算。**这是假设模型，需用真实数据校准。**');
  } else {
    out.push('*未填写市场参数。*');
  }
  out.push('');

  /* 2 竞品交叉 */
  out.push('## 2. 竞品 × 画像交叉');
  out.push('');
  if(R.segs.length && R.rivals.length){
    out.push('| 竞品 ＼ 用户层 |' + R.segs.map(function(s){ return ' ' + s.n + '（' + s.pct + '%） |'; }).join(''));
    out.push('|---|' + R.segs.map(function(){ return '---|'; }).join(''));
    R.rivals.forEach(function(r){
      out.push('| ' + r.name + ' |' + R.segs.map(function(s, i){
        return ' ' + CELL[r.cells[i]||'none'].s + ' ' + CELL[r.cells[i]||'none'].n + ' |';
      }).join(''));
    });
    out.push('');
    var gaps = [];
    R.segs.forEach(function(s, i){
      if(!R.rivals.some(function(r){ return r.cells[i] === 'full'; })) gaps.push(s);
    });
    if(gaps.length){
      out.push('### 🔥 市场空白格');
      out.push('');
      gaps.forEach(function(g){
        out.push('- **' + g.n + '（' + g.pct + '%）**：' + g.why + ' → 可作为差异化切口');
      });
    } else {
      out.push('每层至少有 1 家竞品完整满足，无完全空白层。建议转向竞品普遍只做到「局部」的层做深。');
    }
  } else {
    out.push('*未填写竞品或用户分层。*');
  }
  out.push('');

  /* 3 分层 */
  out.push('## 3. 用户分层');
  out.push('');
  if(R.segs.length){
    out.push('| 分层 | 占比 | 人群 | 核心需求 |');
    out.push('|---|---|---|---|');
    R.segs.forEach(function(s){
      out.push('| ' + s.n + ' | ' + s.pct + '% | ' + (s.who||'—') + ' | ' + (s.need||'—') + ' |');
    });
  } else {
    out.push('*未填写。*');
  }
  out.push('');

  /* 4 定价 */
  out.push('## 4. 定价验证');
  out.push('');
  var w = calcWTP();
  if(w){
    out.push(wtpReport(w));
  } else {
    out.push('*未填写定价数据。*');
  }
  out.push('');

  /* 5 可行性 */
  out.push('## 5. 可行性与风险');
  out.push('');
  var st = ($('#rs_stages') && $('#rs_stages').value.trim()) || '';
  var rk = ($('#rs_risks') && $('#rs_risks').value.trim()) || '';
  if(st){
    out.push('### 分期路线');
    out.push('');
    out.push(st);
    out.push('');
  }
  if(rk){
    out.push('### 风险清单');
    out.push('');
    out.push(rk);
    out.push('');
  }
  if(!st && !rk) out.push('*未填写。*');

  out.push('');
  out.push('---');
  out.push('');
  out.push('*本方案基于你填写的数据生成。标为「待验证」的假设需通过调研确认后才能作为决策依据。*');
  return out.join('\n');
}

function fmtN(v){
  if(v >= 10000) return (v/10000).toFixed(1) + ' 万';
  return String(Math.round(v));
}
function fmtMoney(v){
  if(v >= 100000000) return (v/100000000).toFixed(2) + ' 亿';
  if(v >= 10000) return (v/10000).toFixed(1) + ' 万';
  return String(Math.round(v));
}

function renderRsReport(){
  var host = $('#rsReport');
  if(!host) return;
  host.innerHTML = mdLite(buildResearchReport());
}

function exportRsReport(){
  downloadFile('调研方案_' + ymd(new Date()) + '.md', buildResearchReport(), 'text/markdown');
}

/* ---------- 统一渲染 ---------- */
function renderRsAll(){
  renderAssump(); renderSegs(); renderCross(); calcTAM(); calcWTP(); renderRsReport();
}
