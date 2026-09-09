/* ============================================================
 * 区域市场 + 竞品档案追踪
 * 区域市场：复用 GE 矩阵引擎（四象限判定 + 优先级公式）
 * 竞品档案：结构化台账 + 动态时间线（人工录入，非自动抓取）
 * ============================================================ */

/* ---------- 预置区域 ---------- */
var REGION_PRESETS = [
  {n:'华东', size:1000, at:5, cp:4, note:'消费力强，竞争最激烈'},
  {n:'华南', size:820,  at:5, cp:3, note:'年轻化，内容生态活跃'},
  {n:'华北', size:760,  at:4, cp:3, note:'品牌认知要求高'},
  {n:'华中', size:540,  at:4, cp:2, note:'性价比敏感，增速快'},
  {n:'西南', size:480,  at:4, cp:2, note:'新一线崛起，红利期'},
  {n:'东北', size:260,  at:2, cp:2, note:'市场收缩，谨慎投入'},
  {n:'西北', size:220,  at:2, cp:1, note:'物流成本高'},
  {n:'东南亚', size:900, at:5, cp:2, note:'出海首选，需本地化'},
  {n:'欧美',  size:1500, at:5, cp:1, note:'高客单，合规门槛高'},
  {n:'日韩',  size:600,  at:4, cp:1, note:'品质要求苛刻'},
  {n:'中东',  size:400,  at:4, cp:2, note:'新兴市场，宗教文化敏感'}
];

/* ---------- 区域市场：计算 ---------- */
function calcRegion(){
  var rows = parseRows($('#rg_rows').value).map(function(r){
    return {
      n: r[0] || '未命名',
      size: Math.max(1, parseFloat(String(r[1]||'').replace(/[^\d.]/g,'')) || 1),
      at: clamp(parseFloat(r[2])||0, 0, 5),
      cp: clamp(parseFloat(r[3])||0, 0, 5),
      note: r[4] || ''
    };
  });
  var errs = [];
  if(rows.length < 2) errs.push('请至少填写 2 个区域');

  var stat = $('#rgStat');
  if(stat) stat.textContent = errs.length ? ('⚠️ ' + errs[0])
    : ('已解析 ' + rows.length + ' 个区域　✅');
  if(errs.length) return null;

  // 与 STP 完全相同的优先级公式：规模取对数，避免大市场压倒一切
  var maxSize = rows.reduce(function(a,r){ return Math.max(a, r.size); }, 1);
  rows.forEach(function(r){
    var base = (r.at * 0.5 + r.cp * 0.5);
    var scale = Math.log(r.size + 1) / Math.log(maxSize + 1);
    r.score = +(base * (0.6 + 0.4 * scale)).toFixed(2);
    if(r.at >= 3 && r.cp >= 3)      r.act = '🟢 重点投入';
    else if(r.at >= 3 && r.cp < 3)  r.act = '🔵 提升能力 / 找合作';
    else if(r.at < 3 && r.cp >= 3)  r.act = '🟡 维持收割';
    else                            r.act = '🔴 谨慎 / 放弃';
  });
  var ranked = rows.slice().sort(function(a,b){ return b.score - a.score; });

  // 汇总
  var tier = {go:[], build:[], harvest:[], drop:[]};
  rows.forEach(function(r){
    if(r.act.indexOf('重点投入') > -1)      tier.go.push(r.n);
    else if(r.act.indexOf('提升') > -1)     tier.build.push(r.n);
    else if(r.act.indexOf('维持') > -1)     tier.harvest.push(r.n);
    else                                     tier.drop.push(r.n);
  });

  // 转成 GE 引擎需要的字段（name/at/cp/size）
  var geRows = rows.map(function(r){
    return {name:r.n, at:r.at, cp:r.cp, size:r.size, score:r.score, act:r.act};
  });

  return {rows:rows, ranked:ranked, maxSize:maxSize, tier:tier,
          svg: svgGE(geRows, maxSize, {title:'区域市场优先级矩阵', sub:'REGION MATRIX · ' + todayStr()})};
}

/* ---------- 区域市场：渲染 ---------- */
var lastRegion = null;
function renderRegion(){
  var d = calcRegion();
  lastRegion = d;
  var wc = $('#rgChart'), pv = $('#rgPreview');
  if(!d){
    if(wc) wc.innerHTML = '<span class="ph">填写区域数据后点「⚡ 分析区域」</span>';
    if(pv) pv.innerHTML = '<span class="ph">⚠️ 请至少填写 2 个区域</span>';
    return;
  }
  if(wc) wc.innerHTML = d.svg;

  var out = [];
  out.push('# 🌏 区域市场优先级分析');
  out.push('');
  out.push('共 **' + d.rows.length + '** 个区域，按优先级排序如下。');
  out.push('');
  out.push('| 排名 | 区域 | 市场体量 | 吸引力 | 竞争力 | 优先级 | 建议 |');
  out.push('|---|---|---|---|---|---|---|');
  d.ranked.forEach(function(r, i){
    out.push('| ' + (i+1) + ' | **' + r.n + '** | ' + r.size + ' | ' + r.at + ' | ' + r.cp +
             ' | **' + r.score + '** | ' + r.act + ' |');
  });
  out.push('');
  out.push('## 分层结论');
  out.push('');
  out.push('- 🟢 **重点投入**（' + d.tier.go.length + '）：' +
           (d.tier.go.length ? d.tier.go.join('、') : '暂无') + '　→ 资源优先倾斜');
  out.push('- 🔵 **提升能力**（' + d.tier.build.length + '）：' +
           (d.tier.build.length ? d.tier.build.join('、') : '暂无') + '　→ 有吸引力但打不动，需补能力或找本地伙伴');
  out.push('- 🟡 **维持收割**（' + d.tier.harvest.length + '）：' +
           (d.tier.harvest.length ? d.tier.harvest.join('、') : '暂无') + '　→ 市场一般但我们有优势，控成本收利润');
  out.push('- 🔴 **谨慎/放弃**（' + d.tier.drop.length + '）：' +
           (d.tier.drop.length ? d.tier.drop.join('、') : '暂无') + '　→ 双低，除非战略需要否则不投入');
  out.push('');
  out.push('> 优先级 =（吸引力×0.5 + 竞争力×0.5）×（0.6 + 0.4×规模权重），规模取对数避免大市场凭体量压倒一切。');
  out.push('>');
  out.push('> 与 STP 使用同一套判定规则，保证结论口径一致。');
  if(pv) pv.innerHTML = mdLite(out.join('\n'));
}

function demoRegion(){
  var txt = REGION_PRESETS.map(function(r){
    return r.n + ',' + r.size + ',' + r.at + ',' + r.cp + ',' + r.note;
  }).join('\n');
  var el = $('#rg_rows'); if(el) el.value = txt;
  renderRegion();
  toast('已填入 11 个预置区域（含国际）');
}

function exportRegionSvg(){
  if(!lastRegion || !lastRegion.svg){ toast('请先分析区域'); return; }
  downloadFile('区域市场矩阵_' + ymd(new Date()) + '.svg', lastRegion.svg, 'image/svg+xml');
}

/* ============================================================
 * 竞品档案与动态追踪
 * ============================================================ */

var RIVAL_TYPES = [
  {k:'launch', n:'新品上市', icon:'🆕'},
  {k:'price',  n:'价格变动', icon:'💰'},
  {k:'promo',  n:'促销活动', icon:'🎁'},
  {k:'channel',n:'渠道拓展', icon:'🏬'},
  {k:'spoke',  n:'代言/合作', icon:'⭐'},
  {k:'fund',   n:'融资/并购', icon:'💼'},
  {k:'content',n:'内容动向', icon:'📣'},
  {k:'other',  n:'其他',     icon:'📌'}
];

/* ---------- 档案渲染 ---------- */
function renderRivals(){
  var host = $('#rvList'); if(!host) return;
  var rs = state.rivals || [];
  var cnt = $('#rvCount');
  if(cnt) cnt.textContent = rs.length ? (rs.length + ' 个竞品') : '暂无';

  if(!rs.length){
    host.innerHTML = '<span class="ph">还没有竞品档案。点「➕ 新建档案」开始，或用「📋 填入示例」快速体验。</span>';
    return;
  }
  host.innerHTML = '';
  rs.forEach(function(r, i){
    var d = document.createElement('div');
    d.className = 'rival';
    var TH = {high:'🔴 高', mid:'🟡 中', low:'🟢 低'};
    d.innerHTML =
      '<div class="rival__hd">' +
        '<span class="rival__n">' + esc(r.name) + '</span>' +
        '<span class="rival__th ' + (r.threat||'mid') + '">' + (TH[r.threat||'mid']||'🟡 中') + '</span>' +
        '<span class="rival__ops">' +
          '<button class="btn btn--sm btn--ghost" data-rvact="ev" data-i="' + i + '">＋动态</button>' +
          '<button class="btn btn--sm btn--ghost" data-rvact="del" data-i="' + i + '">🗑</button>' +
        '</span>' +
      '</div>' +
      '<div class="rival__meta">' +
        (r.pos ? '<span>定位：' + esc(r.pos) + '</span>' : '') +
        (r.price ? '<span>价格带：' + esc(r.price) + '</span>' : '') +
        (r.channel ? '<span>主渠道：' + esc(r.channel) + '</span>' : '') +
      '</div>' +
      (r.usp ? '<div class="rival__usp">核心卖点：' + esc(r.usp) + '</div>' : '') +
      (r.aud ? '<div class="rival__aud">目标人群：' + esc(r.aud) + '</div>' : '');
    if(r.events && r.events.length){
      var tl = document.createElement('div');
      tl.className = 'rtl';
      r.events.slice().sort(function(a,b){ return a.date < b.date ? 1 : -1; }).forEach(function(e){
        var tp = RIVAL_TYPES.filter(function(x){ return x.k === e.type; })[0] || RIVAL_TYPES[7];
        var row = document.createElement('div');
        row.className = 'rtl__row';
        row.innerHTML = '<span class="rtl__d">' + esc(e.date) + '</span>' +
          '<span class="rtl__t">' + tp.icon + ' ' + esc(tp.n) + '</span>' +
          '<span class="rtl__c">' + esc(e.text) + '</span>';
        tl.appendChild(row);
      });
      d.appendChild(tl);
    } else {
      var no = document.createElement('div');
      no.className = 'rtl__empty';
      no.textContent = '暂无动态记录';
      d.appendChild(no);
    }
    host.appendChild(d);
  });

  // 事件委托
  [].forEach.call(host.querySelectorAll('[data-rvact]'), function(b){
    b.onclick = function(){
      var i = parseInt(b.getAttribute('data-i'), 10);
      var act = b.getAttribute('data-rvact');
      if(act === 'del') delRival(i); else addRivalEvent(i);
    };
  });
}

/* ---------- 档案操作 ---------- */
function addRival(){
  var name = prompt('竞品名称：');
  if(!name || !name.trim()) return;
  state.rivals = state.rivals || [];
  state.rivals.push({
    id:'r' + Date.now(),
    name:name.trim(), pos:'', price:'', channel:'', usp:'', aud:'',
    threat:'mid', events:[]
  });
  save(); renderRivals();
  toast('已创建档案：' + name.trim());
}

function delRival(i){
  if(!confirm('删除该竞品档案及其全部动态？')) return;
  state.rivals.splice(i, 1);
  save(); renderRivals();
}

function addRivalEvent(i){
  var r = state.rivals[i]; if(!r) return;
  var txt = prompt('动态内容（例：618 主推款降价至 99）：');
  if(!txt || !txt.trim()) return;
  var tsel = prompt('类型编号：\n1 新品上市\n2 价格变动\n3 促销活动\n4 渠道拓展\n5 代言/合作\n6 融资/并购\n7 内容动向\n8 其他\n\n直接回车默认 2：', '2');
  var idx = (parseInt(tsel, 10) || 2) - 1;
  if(idx < 0 || idx >= RIVAL_TYPES.length) idx = 1;
  r.events = r.events || [];
  r.events.push({
    date: ymd(new Date()),
    type: RIVAL_TYPES[idx].k,
    text: txt.trim()
  });
  save(); renderRivals();
  toast('已记录动态');
}

function demoRivals(){
  state.rivals = [
    {id:'r1', name:'竞品 A（头部）', pos:'高端专业', price:'158-268', channel:'天猫+抖音',
     usp:'成分浓度高，临床背书', aud:'30-45 岁精致女性', threat:'high',
     events:[
       {date: ymd(new Date(Date.now()-86400000*2)), type:'price', text:'主推款降至 99，限时 7 天'},
       {date: ymd(new Date(Date.now()-86400000*20)), type:'spoke', text:'签约一线女星代言'},
       {date: ymd(new Date(Date.now()-86400000*45)), type:'launch', text:'上线新品线，主打抗老'}
     ]},
    {id:'r2', name:'竞品 B（新锐）', pos:'性价比', price:'59-129', channel:'小红书+拼多多',
     usp:'包装年轻，联名频繁', aud:'18-28 岁学生与职场新人', threat:'mid',
     events:[
       {date: ymd(new Date(Date.now()-86400000*6)), type:'promo', text:'开学季满 199 减 50'},
       {date: ymd(new Date(Date.now()-86400000*30)), type:'content', text:'小红书投放 200+ 素人笔记'}
     ]},
    {id:'r3', name:'竞品 C（跨界）', pos:'天然有机', price:'128-198', channel:'线下+私域',
     usp:'零添加，溯源可查', aud:'25-40 岁宝妈', threat:'low',
     events:[
       {date: ymd(new Date(Date.now()-86400000*15)), type:'channel', text:'进入 300 家母婴连锁'}
     ]}
  ];
  save(); renderRivals();
  toast('已填入 3 个示例竞品（含 6 条动态）');
}

/* ---------- 竞品情报导出 ---------- */
function exportRivals(){
  var rs = state.rivals || [];
  if(!rs.length){ toast('暂无竞品档案'); return; }
  var out = ['# 🕵️ 竞品情报台账', ''];
  out.push('> 生成于 ' + new Date().toLocaleString('zh-CN') + '　·　共 ' + rs.length + ' 个竞品');
  out.push('>');
  out.push('> 本台账为人工录入，非自动抓取。数据保留在本地浏览器。');
  out.push('');
  var TH = {high:'🔴 高威胁', mid:'🟡 中威胁', low:'🟢 低威胁'};
  rs.forEach(function(r){
    out.push('## ' + r.name + '　' + (TH[r.threat||'mid']||''));
    out.push('');
    if(r.pos)     out.push('- **定位**：' + r.pos);
    if(r.price)   out.push('- **价格带**：' + r.price);
    if(r.channel) out.push('- **主渠道**：' + r.channel);
    if(r.usp)     out.push('- **核心卖点**：' + r.usp);
    if(r.aud)     out.push('- **目标人群**：' + r.aud);
    out.push('');
    if(r.events && r.events.length){
      out.push('### 动态时间线');
      out.push('');
      out.push('| 日期 | 类型 | 内容 |');
      out.push('|---|---|---|');
      r.events.slice().sort(function(a,b){ return a.date < b.date ? 1 : -1; }).forEach(function(e){
        var tp = RIVAL_TYPES.filter(function(x){ return x.k === e.type; })[0] || RIVAL_TYPES[7];
        out.push('| ' + e.date + ' | ' + tp.icon + ' ' + tp.n + ' | ' + e.text + ' |');
      });
    } else {
      out.push('*暂无动态记录*');
    }
    out.push('');
  });
  out.push('---');
  out.push('');
  out.push('### 下一步建议');
  out.push('');
  var hi = rs.filter(function(r){ return r.threat === 'high'; });
  if(hi.length){
    out.push('- ⚠️ 高威胁竞品 ' + hi.length + ' 个（' + hi.map(function(r){ return r.name; }).join('、') +
             '）→ 建议每周更新一次动态，必要时做专项拆解');
  }
  out.push('- 把竞品的价格带填入「💰 定价策略」，可直接影响定价建议');
  out.push('- 把竞品作为行填入「策略 → 竞品对比矩阵」，可算出加权排名与机会点');
  downloadFile('竞品情报台账_' + ymd(new Date()) + '.md', out.join('\n'), 'text/markdown');
}
