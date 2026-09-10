/* ============================================================
 * 38-packs.js —— 内容包：把工作流预设做成「照着跑就能出活」
 *
 * 为什么不是新能力：
 *   4 个包的能力全部来自已有模块。此前它们以「工作流预设」的形式
 *   藏在下拉里，首页 4 张卡片却写着「即将推出」——东西做好了，
 *   门口却挂着没开门的牌子。这里做的是产品化，不是新建功能。
 *
 * 关键改造：本地函数优先
 *   原有 4 个预设几乎全是 LLM 步骤（小红书包 0 个本地函数），
 *   意味着每一步都要人工去别的平台跑完再粘回来。
 *   重新编排后每个包含 3–4 个可本地真跑的步骤，
 *   跑完即有真实数字，结果页的可视化才有依据。
 *   —— 符合一贯原则：能算的不交给模型。
 *
 * LLM 步骤的产出是自由文本，无法结构化，因此可视化只基于：
 *   ① 步骤完成情况（真实）② 本地函数返回的关键数字（真实）
 *   绝不把自由文本伪造成图表。
 *
 * 依赖：04-store（save/toast）· 07-charts（esc/cxFrame）
 *       10-workspace（runLocalStep 复用本地执行）· 13-scan（scoreContent）
 * ============================================================ */

/* ---------- 包定义 ----------
 * kind: 本地函数 key（可真跑） · null: LLM 步骤（人工回填）
 * inFrom: 该步的文本输入取自第几步的产出（仅 scan / tonecheck 需要）
 * need: 若本地函数依赖用户先填的数据，缺数据时提示去哪个模块
 */
var PACKS = [
  {
    id:'xhs', n:'📕 小红书爆款', goal:'产出 10 条可发布的小红书笔记',
    desc:'从品牌调性出发生成选题与正文，做违禁词与调性双重体检，最后排出 7 天发布节奏。',
    steps:[
      {t:'读取品牌内核，把调性、价值主张、品类禁忌作为后续生成的基准。',
       kind:'brandcore', btn:'读取品牌内核', need:{tab:'persona', n:'品牌内核'}},
      {t:'基于调性生成 20 个标题候选与 5 条钩子公式，粘贴到下方。', kind:null,
       ph:'在这里粘贴标题候选与公式…'},
      {t:'筛选 10 个标题扩写正文，套用小红书排版与 emoji 节奏，粘贴到下方。', kind:null,
       ph:'在这里粘贴 10 条正文…'},
      {t:'对上一步的正文做违禁词 + 广告法极限词扫描，并给六维质量评分。',
       kind:'scan', btn:'扫描正文', inFrom:2},
      {t:'检查正文是否偏离品牌调性、是否踩到品类禁忌。',
       kind:'tonecheck', btn:'检查调性', inFrom:2, need:{tab:'persona', n:'品牌内核'}},
      {t:'输出 7 天发布排期，可直接写入营销日历。', kind:'cal', btn:'生成排期'}
    ]
  },
  {
    id:'rival', n:'⚔️ 竞品情报', goal:'生成本周竞品情报周报',
    desc:'先把竞品对比算成排名，再补外部动态，用 TOWS 推导出应对策略，最后沉淀进知识库。',
    steps:[
      {t:'填维度权重与各竞品打分，算出加权排名与机会点。',
       kind:'comp', btn:'计算竞品排名', need:{tab:'strategy', n:'竞品对比矩阵'}},
      {t:'检索各竞品近 7 天动态：上新、调价、活动、融资、舆情，粘贴到下方。', kind:null,
       ph:'在这里粘贴检索到的竞品动态…'},
      {t:'把竞品格局转成 TOWS 策略，明确攻守方向。',
       kind:'mx', btn:'推导 TOWS', need:{tab:'strat', n:'战略矩阵'}},
      {t:'结合排名与策略，输出 3 条可行动建议，粘贴到下方。', kind:null,
       ph:'在这里粘贴行动建议…'},
      {t:'润色成周报格式，写入品牌知识库供后续调用。', kind:null,
       ph:'在这里粘贴周报正文…', toKb:1}
    ]
  },
  {
    id:'brand', n:'🏷️ 品牌策略', goal:'输出品牌定位与信息屋',
    desc:'先诊断品牌内核，再选目标市场、推导战略，最后把结论落成信息屋与语气指南。',
    steps:[
      {t:'诊断品牌内核：文化三层、价值层级、商业模式是否自洽。',
       kind:'brandcore', btn:'诊断品牌内核', need:{tab:'persona', n:'品牌内核'}},
      {t:'细分市场打分，确定投入优先级与差异化切口。',
       kind:'stp', btn:'计算市场优先级', need:{tab:'strategy', n:'STP 市场选择'}},
      {t:'用 TOWS 把优势劣势机会威胁推成四条策略。',
       kind:'mx', btn:'推导战略', need:{tab:'strat', n:'战略矩阵'}},
      {t:'搭信息屋：核心主张 + 三大支撑点 + 用户利益 + 信任状，粘贴到下方。', kind:null,
       ph:'在这里粘贴信息屋内容…'},
      {t:'输出 Tone of Voice 语气指南与禁用词清单，粘贴到下方。', kind:null,
       ph:'在这里粘贴语气指南…'}
    ]
  },
  {
    id:'ads', n:'📈 投放复盘', goal:'输出下一周期投放优化方案',
    desc:'先把投放数字算清楚，再对素材文案做体检，归因后给出预算重分配与下期排期。',
    steps:[
      {t:'算 GMV 归因拆解、LTV/CAC、预算分配与渠道效率雷达。',
       kind:'fin', btn:'跑财务测算', need:{tab:'fin', n:'财务测算'}},
      {t:'把本周期头部素材的文案贴进来，供下一步体检。', kind:null,
       ph:'在这里粘贴头部素材文案…'},
      {t:'对素材文案做违禁词与质量体检，找出文案层的改进点。',
       kind:'scan', btn:'体检素材文案', inFrom:1},
      {t:'归因判断：是素材、人群还是出价问题，粘贴到下方。', kind:null,
       ph:'在这里粘贴归因结论…'},
      {t:'输出预算重分配方案与素材迭代方向，粘贴到下方。', kind:null,
       ph:'在这里粘贴优化方案…'},
      {t:'把下期动作排进营销日历。', kind:'cal', btn:'生成下期排期'}
    ]
  }
];

var PK_ST = {
  todo:{n:'未开始', c:'is-todo'},
  ran :{n:'已运行', c:'is-done'},
  need:{n:'待填数据', c:'is-delayed'},
  done:{n:'已完成', c:'is-doing'},
  skip:{n:'已跳过', c:'is-todo'}
};

/* ---------- 状态 ---------- */
function pkState(){
  state.packs = state.packs || {};
  return state.packs;
}
function pkCur(){
  var p = pkState();
  return p.cur || null;             // {id, steps:[{st, out, metric}]}
}
function pkOpen(id){
  var p = pkState();
  if(!p[id]) p[id] = {steps:[]};
  p.cur = id;
  save();
}
function pkPack(id){
  for(var i=0;i<PACKS.length;i++) if(PACKS[i].id === id) return PACKS[i];
  return null;
}
function pkRec(id, i){
  var p = pkState();
  p[id] = p[id] || {steps:[]};
  var s = p[id].steps;
  while(s.length <= i) s.push({st:'todo', out:'', metric:null});
  return s[i];
}

/* ---------- 本地执行（复用 runLocalStep，零重复实现） ---------- */
/* runLocalStep 把结果写进 wrapEl 内的 .traceOut，这里用临时容器取回文本。
   好处：14 个本地函数的分支逻辑只存在一份，不会两边跑偏。 */
function pkRunLocal(kind, label){
  var tmp = document.createElement('div');
  var ta = document.createElement('textarea');
  ta.className = 'traceOut';
  tmp.appendChild(ta);
  try{
    runLocalStep({no:0, local:{key:kind, name:kind, label:label}}, tmp);
  }catch(e){
    return {text:'执行出错：' + e.message, ok:false};
  }
  var t = ta.value || '';
  return {text:t, ok:!!t && t.indexOf('（请先') !== 0 && t.indexOf('执行出错') !== 0};
}

/* ---------- 指标提取（结果页可视化的唯一数据来源） ---------- */
function pkMetric(kind, inputText){
  try{
    if(kind === 'brandcore'){
      if(!state.bc) return null;
      var r = bcAnalyze(state.bc);
      if(!r) return null;
      return {big:r.score, unit:'/100', lb:'品牌健康度',
              sub:'🛑 ' + r.bad + ' · ⚠️ ' + r.warn +
                  (r.mainFields.length ? '　主战场：' + r.mainFields.map(function(f){return f.n;}).join('/') : '')};
    }
    if(kind === 'scan'){
      var txt = String(inputText || '');
      if(txt.length < 10) return null;
      var sc = scoreContent(txt, null, {red:[],yellow:[],blue:[]});
      if(!sc) return null;
      return {big:sc.total, unit:'/100', lb:'内容体检',
              sub:sc.grade + ' 级 · ' + sc.gradeMsg,
              bars:sc.dims.map(function(d){ return {n:d.n, v:d.s, max:d.max}; })};
    }
    if(kind === 'tonecheck'){
      var tx = String(inputText || '');
      if(tx.length < 10) return null;
      var tr = tcAnalyze(tx);
      if(!tr) return null;
      return {big:tr.score, unit:'/25', lb:'调性得分',
              sub:'基准：' + tr.base.srcName + (tr.hard.length ? '　🛑 禁忌命中 ' + tr.hard.length : '')};
    }
    if(kind === 'comp'){
      var c = calcComp();
      if(!c || !c.ranked || !c.ranked.length) return null;
      var me = -1;
      c.ranked.forEach(function(r, i){ if(r.me) me = i + 1; });
      return {big:me > 0 ? me : c.ranked.length, unit:'/ ' + c.ranked.length,
              lb:me > 0 ? '我方排名' : '竞品数',
              sub:'冠军：' + c.ranked[0].n,
              bars:c.ranked.slice(0, 5).map(function(r){ return {n:r.n, v:r.total, max:c.ranked[0].total || 1}; })};
    }
    if(kind === 'stp'){
      var s = calcStp();
      if(!s || !s.rows || !s.rows.length) return null;
      var top = s.rows.slice().sort(function(a,b){ return (b.score||0) - (a.score||0); })[0];
      return {big:s.rows.length, unit:' 个细分', lb:'市场数',
              sub:'首选：' + top.n,
              bars:s.rows.slice(0, 5).map(function(r){
                return {n:r.n, v:Math.round((r.score||0)*10)/10, max:5};
              })};
    }
    if(kind === 'mx'){
      var t = calcTows();
      var b = calcBcg();
      var n = t && t.items ? t.items.length : 0;
      if(!n && (!b || !b.rows || !b.rows.length)) return null;
      return {big:n, unit:' 条', lb:'TOWS 策略',
              sub:b && b.rows && b.rows.length ? ('业务线 ' + b.rows.length + ' 个') : ''};
    }
    if(kind === 'fin'){
      var l = calcLtv(), g = calcGmv(), rd = calcRadar();
      if(!l && !g && !rd) return null;
      var bars = [];
      if(rd && rd.ranked) bars = rd.ranked.slice(0, 5).map(function(r){
        return {n:r.n, v:Math.round(r.avg*10)/10, max:5};
      });
      return {big:l ? (Math.round(l.ratio*100)/100) : 0, unit:'', lb:'LTV / CAC',
              sub:(l ? ltvVerdict(l.ratio).t + '　' : '') +
                  (g ? ('GMV 增量 ' + fmtMoney(g.total)) : ''),
              bars:bars};
    }
    if(kind === 'cal'){
      // 注意：calcCal 返回 {nodes:[...]}，不是 events
      var cc = calcCal();
      if(!cc || !cc.nodes || !cc.nodes.length) return null;
      return {big:cc.nodes.length, unit:' 个', lb:'排期节点',
              sub:cc.nodes.slice(0, 3).map(function(n){ return n.n; }).join(' / ')};
    }
  }catch(e){ return null; }
  return null;
}

/* ---------- 视图 1：包列表 ---------- */
function renderPacks(){
  var host = $('#packList'); if(!host) return;
  host.innerHTML = '';
  var cur = pkCur();
  PACKS.forEach(function(p){
    var localN = p.steps.filter(function(s){ return s.kind; }).length;
    var st = pkState()[p.id];
    var doneN = st ? st.steps.filter(function(x){ return x && (x.st === 'ran' || x.st === 'done'); }).length : 0;
    var pct = Math.round(doneN / p.steps.length * 100);

    var el = document.createElement('div');
    el.className = 'pkcard' + (cur === p.id ? ' is-on' : '');
    el.innerHTML =
      '<div class="pkcard__hd">' +
        '<span class="pkcard__n">' + esc(p.n) + '</span>' +
        '<span class="pkcard__cnt">' + p.steps.length + ' 步 · ⚡ ' + localN + ' 步本地</span>' +
      '</div>' +
      '<div class="pkcard__goal">🎯 ' + esc(p.goal) + '</div>' +
      '<div class="pkcard__desc">' + esc(p.desc) + '</div>' +
      '<div class="pkcard__bar"><i style="width:' + pct + '%"></i></div>' +
      '<div class="pkcard__ft">' +
        '<span>' + (doneN ? ('已跑 ' + doneN + ' / ' + p.steps.length + ' 步') : '尚未开始') + '</span>' +
        '<button class="btn btn--sm ' + (doneN ? 'btn--ghost' : 'btn--primary') + '">' +
          (doneN ? '继续' : '开始') + ' →</button>' +
      '</div>';
    el.querySelector('button').onclick = function(){ pkOpen(p.id); renderPacks(); renderPackRun(); };
    host.appendChild(el);
  });
  var back = $('#pkBack'); if(back) back.style.display = cur ? '' : 'none';
}

/* ---------- 视图 2：执行页 ---------- */
function renderPackRun(){
  var wrap = $('#packRun'); if(!wrap) return;
  var id = pkCur(), p = pkPack(id);
  if(!p){
    wrap.innerHTML = '<p class="hint">从上方选一个内容包开始。每个包都标明哪几步能本地真跑。</p>';
    var rst = $('#packResult'); if(rst) rst.innerHTML = '';
    return;
  }
  wrap.innerHTML = '';

  var hd = document.createElement('div');
  hd.className = 'pkrun__hd';
  hd.innerHTML = '<div><h3>' + esc(p.n) + '</h3><p class="hint">🎯 ' + esc(p.goal) + '</p></div>';
  var close = document.createElement('button');
  close.className = 'btn btn--sm btn--ghost';
  close.textContent = '✕ 返回列表';
  close.onclick = function(){
    var s = pkState(); s.cur = null; save();
    renderPacks(); renderPackRun();
  };
  hd.appendChild(close);
  wrap.appendChild(hd);

  p.steps.forEach(function(sp, i){
    var rec = pkRec(id, i);
    var box = document.createElement('div');
    box.className = 'pkstep ' + (PK_ST[rec.st] ? PK_ST[rec.st].c : 'is-todo');

    var isLocal = !!sp.kind;
    var hdEl = document.createElement('div');
    hdEl.className = 'pkstep__hd';
    hdEl.innerHTML = '<span class="pkstep__no">' + (i + 1) + '</span>' +
      '<span class="pkstep__tag">' + (isLocal ? '⚡ 本地函数' : '🤖 AI 步骤') + '</span>' +
      '<span class="pkstep__st">' + (PK_ST[rec.st] ? PK_ST[rec.st].n : '') + '</span>';
    box.appendChild(hdEl);

    var tx = document.createElement('p');
    tx.className = 'pkstep__t';
    tx.textContent = sp.t;
    box.appendChild(tx);

    // 输入取自前序步骤
    if(sp.inFrom != null){
      var src = pkRec(id, sp.inFrom);
      var tip = document.createElement('p');
      tip.className = 'hint';
      tip.innerHTML = '↳ 输入取自第 ' + (sp.inFrom + 1) + ' 步' +
        (src.out && src.out.length > 10 ? '（已取到 ' + src.out.length + ' 字）' : '（⚠️ 该步还没内容）');
      box.appendChild(tip);
    }

    var ta = document.createElement('textarea');
    ta.className = 'pkstep__out';
    ta.placeholder = isLocal ? '点下方按钮自动填充，也可手工粘贴' : (sp.ph || '粘贴这一步的产出…');
    ta.value = rec.out || '';
    ta.oninput = function(){ rec.out = ta.value; save(); };
    box.appendChild(ta);

    var row = document.createElement('div');
    row.className = 'row';

    if(isLocal){
      var b = document.createElement('button');
      b.className = 'btn btn--sm btn--primary';
      b.textContent = '▶ ' + (sp.btn || '运行');
      b.onclick = function(){
        var input = '';
        if(sp.inFrom != null) input = pkRec(id, sp.inFrom).out || '';
        var r;
        if(sp.kind === 'scan' || sp.kind === 'tonecheck'){
          // 这两个需要文本入参，直接调底层函数比走 runLocalStep 更可控
          r = pkRunTextKind(sp.kind, input);
        }else{
          r = pkRunLocal(sp.kind, sp.btn || '');
        }
        rec.out = r.text; rec.st = r.ok ? 'ran' : 'need';
        rec.metric = r.ok ? pkMetric(sp.kind, input) : null;
        ta.value = rec.out;
        save(); renderPackRun(); renderPackResult();
        toast(r.ok ? '已运行' : '需要你先去填数据');
      };
      row.appendChild(b);
    }

    var bd = document.createElement('button');
    bd.className = 'btn btn--sm btn--ghost';
    bd.textContent = '✅ 标记完成';
    bd.onclick = function(){
      rec.st = 'done'; save(); renderPackRun(); renderPackResult();
    };
    row.appendChild(bd);

    var bs = document.createElement('button');
    bs.className = 'btn btn--sm btn--ghost';
    bs.textContent = '⏭ 跳过';
    bs.onclick = function(){
      rec.st = 'skip'; save(); renderPackRun(); renderPackResult();
    };
    row.appendChild(bs);

    if(rec.st === 'need' && sp.need){
      var bg = document.createElement('button');
      bg.className = 'btn btn--sm btn--ghost';
      bg.textContent = '前往「' + sp.need.n + '」→';
      bg.onclick = function(){ switchTab(sp.need.tab); };
      row.appendChild(bg);
    }
    // 需要文本的本地步骤，若来源为空，给一个去内容工厂的入口
    if(isLocal && sp.inFrom != null && !(pkRec(id, sp.inFrom).out || '').trim()){
      var bg2 = document.createElement('button');
      bg2.className = 'btn btn--sm btn--ghost';
      bg2.textContent = '去内容工厂写 →';
      bg2.onclick = function(){ switchTab('content'); };
      row.appendChild(bg2);
    }

    box.appendChild(row);
    if(rec.metric){
      var mb = document.createElement('div');
      mb.className = 'pkstep__metric';
      mb.innerHTML = '<b>' + rec.metric.big + '</b><i>' + esc(rec.metric.unit || '') + '</i>' +
                     '<span>' + esc(rec.metric.lb) + '</span>' +
                     (rec.metric.sub ? '<em>' + esc(rec.metric.sub) + '</em>' : '');
      box.appendChild(mb);
    }
    wrap.appendChild(box);
  });

  var exp = document.createElement('div');
  exp.className = 'row';
  var be = document.createElement('button');
  be.className = 'btn btn--sm btn--ghost';
  be.textContent = '📤 导出本次成果（Markdown）';
  be.onclick = pkExport;
  exp.appendChild(be);
  wrap.appendChild(exp);

  renderPackResult();
}

/* scan / tonecheck 需要文本入参：直接调底层函数生成报告 */
function pkRunTextKind(kind, txt){
  if(!txt || String(txt).length < 10){
    return {text:'（需要文本：请先完成前序步骤，粘贴正文后再运行）', ok:false};
  }
  try{
    if(kind === 'scan'){
      var sc = scoreContent(txt, null, {red:[],yellow:[],blue:[]});
      var o = '内容体检得分 ' + sc.total + '/100（' + sc.grade + ' 级 · ' + sc.gradeMsg + '）\n\n';
      sc.dims.forEach(function(d){
        o += '- ' + d.icon + ' ' + d.n + '：' + d.s + '/' + d.max + '　' + d.tip + '\n';
      });
      return {text:o, ok:true};
    }
    if(kind === 'tonecheck'){
      var r = tcAnalyze(txt);
      if(!r) return {text:'（品牌内核未填写，或调性约束已关闭）', ok:false};
      var s = '# 🎭 品牌调性约束\n\n**基准** ' + r.base.srcName +
              '　**调性得分** ' + r.score + '/25\n\n';
      s += '| 信号 | 实测 | 期望 | 判定 |\n|---|---|---|---|\n';
      r.sigRows.forEach(function(x){
        s += '| ' + x.n + ' | ' + x.v + x.unit + ' | ' + x.lo + '~' + x.hi + ' | ' +
             (x.lv === 'ok' ? '✅' : (x.lv === 'bad' ? '🛑 偏高' : '⚠️')) + ' |\n';
      });
      if(r.hard.length){
        s += '\n### 禁忌命中\n\n';
        r.hard.forEach(function(h){
          s += '- 🛑 **' + h.d + '**：' + h.words.join('、') + ' —— ' + h.why + '\n';
        });
      }
      if(r.cov && r.cov.miss.length){
        s += '\n⚠️ 未体现价值层级：' + r.cov.miss.join(' / ') + '\n';
      }
      return {text:s, ok:true};
    }
  }catch(e){ return {text:'执行出错：' + e.message, ok:false}; }
  return {text:'（暂不支持的类型）', ok:false};
}

/* ---------- 视图 3：结果页（可视化） ---------- */
function renderPackResult(){
  var host = $('#packResult'); if(!host) return;
  var id = pkCur(), p = pkPack(id);
  if(!p){ host.innerHTML = ''; return; }
  var st = pkState()[id] || {steps:[]};
  var total = p.steps.length;
  var cnt = {ran:0, done:0, need:0, skip:0, todo:0};
  p.steps.forEach(function(_, i){
    var r = st.steps[i] || {st:'todo'};
    if(cnt[r.st] != null) cnt[r.st]++; else cnt.todo++;
  });
  var fin = cnt.ran + cnt.done;
  var pct = Math.round(fin / total * 100);
  var metrics = [];
  p.steps.forEach(function(_, i){
    var r = st.steps[i];
    if(r && r.metric) metrics.push({i:i + 1, m:r.metric});
  });

  var h = '<div class="pkres">';
  h += '<h3 class="pkres__hd">📊 本次成果</h3>';

  // ① 完成度环形图
  h += '<div class="pkres__top">' + pkRingSvg(pct, fin, total) +
       '<div class="pkres__legend">' +
         '<div><i style="background:var(--ok)"></i>本地已跑 <b>' + cnt.ran + '</b></div>' +
         '<div><i style="background:var(--brand)"></i>人工完成 <b>' + cnt.done + '</b></div>' +
         '<div><i style="background:var(--warn)"></i>待填数据 <b>' + cnt.need + '</b></div>' +
         '<div><i style="background:var(--line)"></i>未开始 <b>' + cnt.todo + '</b></div>' +
         (cnt.skip ? '<div><i style="background:var(--soft)"></i>已跳过 <b>' + cnt.skip + '</b></div>' : '') +
       '</div></div>';

  // ② 指标卡
  if(metrics.length){
    h += '<div class="pkres__cards">';
    metrics.forEach(function(x){
      var m = x.m;
      h += '<div class="pkres__card">' +
             '<span class="pkres__cardlb">第 ' + x.i + ' 步 · ' + esc(m.lb) + '</span>' +
             '<b>' + m.big + '<i>' + esc(m.unit || '') + '</i></b>' +
             (m.sub ? '<em>' + esc(m.sub) + '</em>' : '');
      if(m.bars && m.bars.length){
        var mx = 0;
        m.bars.forEach(function(b){ if(b.v > mx) mx = b.v; });
        m.bars.forEach(function(b){
          var w = mx > 0 ? Math.round(b.v / mx * 100) : 0;
          h += '<div class="pkres__bar"><span>' + esc(b.n) + '</span>' +
               '<i style="width:' + w + '%"></i><u>' + b.v + '</u></div>';
        });
      }
      h += '</div>';
    });
    h += '</div>';
  }else{
    h += '<p class="hint">还没有本地步骤跑出数字。运行带 ⚡ 的步骤后，这里会出现真实指标。</p>';
  }

  // ③ 步骤分布条
  h += '<div class="pkres__dist">';
  ['ran','done','need','todo','skip'].forEach(function(k){
    if(!cnt[k]) return;
    var lb = {ran:'本地已跑', done:'人工完成', need:'待填数据', todo:'未开始', skip:'已跳过'}[k];
    var w = Math.round(cnt[k] / total * 100);
    h += '<div class="pkres__drow"><span>' + lb + '</span>' +
         '<i class="pkres__di pkres__di--' + k + '" style="width:' + w + '%"></i>' +
         '<u>' + cnt[k] + '</u></div>';
  });
  h += '</div>';

  h += '<p class="hint" style="margin-top:10px">💡 可视化的数字全部来自本地函数的真实计算。' +
       'AI 步骤的产出是自由文本，不做结构化，因此不参与图表。</p>';
  h += '</div>';
  host.innerHTML = h;
}

/* 完成度环形图（手写 SVG，不引依赖） */
function pkRingSvg(pct, fin, total){
  var R = 52, C = 2 * Math.PI * R, off = C * (1 - pct / 100);
  var s = '<svg viewBox="0 0 140 140" width="140" height="140" role="img" aria-label="完成度 ' + pct + '%">';
  s += '<circle cx="70" cy="70" r="' + R + '" fill="none" stroke="var(--line)" stroke-width="13"/>';
  s += '<circle cx="70" cy="70" r="' + R + '" fill="none" stroke="var(--brand)" stroke-width="13" ' +
       'stroke-linecap="round" stroke-dasharray="' + C.toFixed(1) + '" stroke-dashoffset="' + off.toFixed(1) + '" ' +
       'transform="rotate(-90 70 70)"/>';
  s += '<text x="70" y="66" text-anchor="middle" font-size="27" font-weight="700" fill="var(--text)">' + pct + '%</text>';
  s += '<text x="70" y="88" text-anchor="middle" font-size="12" fill="var(--text-3)">' + fin + ' / ' + total + ' 步</text>';
  s += '</svg>';
  return '<div class="pkres__ring">' + s + '</div>';
}

/* ---------- 导出 ---------- */
function pkExport(){
  var id = pkCur(), p = pkPack(id);
  if(!p){ toast('先选一个内容包'); return; }
  var st = pkState()[id] || {steps:[]};
  var o = '# ' + p.n + ' · 执行成果\n\n**目标**：' + p.goal + '\n\n';
  o += '> 生成时间：' + new Date().toLocaleString('zh-CN') + '　数据全程本地生成\n\n---\n\n';
  p.steps.forEach(function(sp, i){
    var r = st.steps[i] || {};
    o += '## 步骤 ' + (i + 1) + '　' + (sp.kind ? '⚡ 本地函数' : '🤖 AI 步骤') +
         '　' + (PK_ST[r.st] ? PK_ST[r.st].n : '未开始') + '\n\n';
    o += '**做什么**：' + sp.t + '\n\n';
    if(r.metric){
      o += '**结果**：' + r.metric.lb + ' ' + r.metric.big + (r.metric.unit || '') +
           (r.metric.sub ? '（' + r.metric.sub + '）' : '') + '\n\n';
    }
    o += r.out ? ('```\n' + r.out + '\n```\n\n') : '（该步暂无产出）\n\n';
  });
  downloadFile('内容包-' + p.n.replace(/[^\u4e00-\u9fa5A-Za-z0-9]/g, '') + '-' +
               ymd(new Date()) + '.md', o, 'text/markdown;charset=utf-8');
  toast('已导出');
}
