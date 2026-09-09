/* ============================================================
 * 开始 —— 场景化流程导航 + 对话式入口
 * 解决「16 个 Tab，用户不知道从哪开始」的入口缺失问题
 *   第一层：场景 × 步骤 的可视化动线（规则驱动，100% 可控）
 *   第二层：对话式快捷入口（关键词匹配，不命中诚实兜底）
 * ============================================================ */

/* ---------- 场景定义：每步写明做什么 / 产出什么 / 去哪个 Tab ---------- */
var GUIDE_SCENES = {
  launch: {
    n:'新品上市', icon:'🚀', desc:'从市场判断到上市复盘，走完一个新品的全流程',
    steps:[
      {t:'市场判断', d:'先判断这个市场值不值得做：规模多大、哪些假设还没验证。',
       tab:'research', p:'市场测算 + 待验证假设清单',
       kw:['市场','调研','tam','som','规模','假设','问卷']},
      {t:'定位与定价', d:'找到差异化切口，并算出建议价格区间。',
       tab:'strategy', p:'TOWS 策略 + 建议价格带',
       kw:['定位','定价','价格','竞争','竞品','swot','差异化','成本']},
      {t:'内容生产', d:'基于品牌语境生成内容，并做合规与质量体检。',
       tab:'content', p:'合规文案 + 六维评分',
       kw:['文案','内容','小红书','标题','种草','笔记','写']},
      {t:'执行排期', d:'把策略拆成有节奏的任务，排进日历。',
       tab:'cal', p:'可执行的排期任务',
       kw:['排期','日历','计划','日程','节点','618','双11','时间']},
      {t:'复盘优化', d:'拆解 GMV 增量来源，判断下阶段资源投放。',
       tab:'fin', p:'归因拆解 + 下阶段建议',
       kw:['复盘','gmv','归因','增长','转化','销售']}
    ]
  },
  review: {
    n:'投放复盘', icon:'📊', desc:'投放结束后，搞清楚钱花在哪、值不值、下期怎么调',
    steps:[
      {t:'数据归集', d:'把各渠道的花费与效果数据整理成可对比的形式。',
       tab:'fin', p:'渠道效率雷达',
       kw:['数据','渠道','效果','roi','roas','花费','投放']},
      {t:'效率诊断', d:'判断哪个渠道综合效率最高，哪个该缩减。',
       tab:'fin', p:'渠道排名 + 预算建议',
       kw:['效率','诊断','对比','排名','cpm','cpc','cpl']},
      {t:'归因拆解', d:'GMV 涨跌到底由流量、转化、客单还是退货驱动。',
       tab:'fin', p:'瀑布图 + 各因子贡献',
       kw:['归因','拆解','gmv','涨跌','增长','下降']},
      {t:'单位经济', d:'算清 LTV/CAC 与回本周期，判断投放是否可持续。',
       tab:'fin', p:'LTV/CAC 比值 + 回本周期',
       kw:['ltv','cac','回本','获客','成本','终身价值','单位经济']},
      {t:'报告产出', d:'把前面所有结论聚合成一份可交付的复盘方案。',
       tab:'synth', p:'完整复盘方案',
       kw:['报告','总结','方案','输出','交付','汇报']}
    ]
  },
  content: {
    n:'内容运营', icon:'✍️', desc:'日常内容生产与质量管理，避免违规与自嗨',
    steps:[
      {t:'语境设定', d:'先把品牌记忆填好，后续所有生成才会带上你的品牌。',
       tab:'brand', p:'品牌语境（7 个字段）',
       kw:['品牌','语境','调性','语气','人设','记忆','设定']},
      {t:'选题生成', d:'用策略模板或直接生成内容，带品牌语境。',
       tab:'content', p:'带品牌语境的提示词',
       kw:['选题','生成','灵感','写','创作','提示词']},
      {t:'合规体检', d:'扫描违禁词与平台风险，避免发不出去。',
       tab:'scan', p:'红线/风险/平台提示',
       kw:['体检','违禁','合规','风险','扫描','检查','敏感']},
      {t:'排期发布', d:'把内容排进日历，形成发布节奏。',
       tab:'cal', p:'内容排期表',
       kw:['排期','发布','日历','节奏','安排']},
      {t:'效果追踪', d:'积累评分历史，看内容质量是否在提升。',
       tab:'ws', p:'评分趋势曲线',
       kw:['效果','追踪','趋势','评分','历史','进步']}
    ]
  },
  brand: {
    n:'品牌定位', icon:'🎯', desc:'从零梳理品牌定位，产出可对外表达的策略',
    steps:[
      {t:'现状盘点', d:'把品牌基础信息、卖点、禁用词先固化下来。',
       tab:'brand', p:'品牌记忆档案',
       kw:['品牌','现状','盘点','基础','信息','卖点']},
      {t:'竞品格局', d:'多维度打分，看清自己相对竞品的位置。',
       tab:'strategy', p:'加权排名 + 机会点',
       kw:['竞品','竞争','对手','格局','对比','矩阵']},
      {t:'用户分层', d:'明确主力/泛用户/长尾分别是谁、要什么。',
       tab:'research', p:'用户分层 + 画像卡',
       kw:['用户','分层','画像','人群','目标客群',' persona']},
      {t:'差异化切口', d:'找竞品都没满足好的那一层，作为突破点。',
       tab:'strategy', p:'市场空白格 + 差异化建议',
       kw:['差异化','切口','空白','机会','突破','定位']},
      {t:'落地表达', d:'把定位转成信息屋、语气指南等可执行的表达规范。',
       tab:'charts', p:'信息屋 / 定位图卡',
       kw:['表达','落地','信息屋','语气','规范','图卡','视觉']}
    ]
  }
};

function gd(){
  if(!state.guide) state.guide = {
    scene:'launch',
    done:{},        // {'launch:0':true, ...}
    q:''
  };
  return state.guide;
}

/* ---------- 场景切换 ---------- */
function renderSceneChips(){
  var host = $('#gdScenes'); if(!host) return;
  var G = gd();
  host.innerHTML = '';
  Object.keys(GUIDE_SCENES).forEach(function(k){
    var s = GUIDE_SCENES[k];
    var b = document.createElement('button');
    b.className = 'chip' + (G.scene === k ? ' is-on' : '');
    b.textContent = s.icon + ' ' + s.n;
    b.onclick = function(){
      G.scene = k; save();
      renderSceneChips(); renderGuideSteps();
    };
    host.appendChild(b);
  });
  var cur = GUIDE_SCENES[G.scene];
  var d = $('#gdSceneDesc');
  if(d) d.textContent = cur ? cur.desc : '';
}

/* ---------- 步骤渲染 ---------- */
function renderGuideSteps(){
  var host = $('#gdSteps'); if(!host) return;
  var G = gd();
  var sc = GUIDE_SCENES[G.scene];
  if(!sc){ host.innerHTML = ''; return; }

  var doneN = sc.steps.filter(function(_, i){ return G.done[G.scene + ':' + i]; }).length;
  var bar = $('#gdProgress');
  if(bar) bar.textContent = doneN + ' / ' + sc.steps.length + ' 步';
  var barFill = $('#gdBarFill');
  if(barFill) barFill.style.width = (doneN / sc.steps.length * 100) + '%';

  host.innerHTML = '';
  sc.steps.forEach(function(st, i){
    var key = G.scene + ':' + i;
    var isDone = !!G.done[key];
    var card = document.createElement('div');
    card.className = 'gdstep' + (isDone ? ' is-done' : '');
    card.innerHTML =
      '<div class="gdstep__hd">' +
        '<span class="gdstep__no">' + (i + 1) + '</span>' +
        '<span class="gdstep__t">' + esc(st.t) + '</span>' +
        (isDone ? '<span class="gdstep__ok">✅ 已完成</span>' : '') +
      '</div>' +
      '<p class="gdstep__d">' + esc(st.d) + '</p>' +
      '<p class="gdstep__p">产出：' + esc(st.p) + '</p>' +
      '<div class="gdstep__acts">' +
        '<button class="btn btn--primary btn--sm" data-gdgo="' + i + '">前往 →</button>' +
        '<button class="btn btn--ghost btn--sm" data-gddone="' + i + '">' +
          (isDone ? '撤销完成' : '标记完成') + '</button>' +
        (i > 0 ? '<button class="btn btn--ghost btn--sm" data-gdback="' + i + '">↩ 回上一步</button>' : '') +
        '<button class="btn btn--ghost btn--sm" data-gdskip="' + i + '">⏭ 跳过</button>' +
      '</div>';
    host.appendChild(card);
  });

  [].forEach.call(host.querySelectorAll('[data-gdgo]'), function(b){
    b.onclick = function(){
      var i = parseInt(b.getAttribute('data-gdgo'), 10);
      switchTab(sc.steps[i].tab);
    };
  });
  [].forEach.call(host.querySelectorAll('[data-gddone]'), function(b){
    b.onclick = function(){
      var i = parseInt(b.getAttribute('data-gddone'), 10);
      var key = G.scene + ':' + i;
      if(G.done[key]) delete G.done[key]; else G.done[key] = true;
      save(); renderGuideSteps();
    };
  });
  [].forEach.call(host.querySelectorAll('[data-gdback]'), function(b){
    b.onclick = function(){
      var i = parseInt(b.getAttribute('data-gdback'), 10);
      // 回到上一步：跳过去并取消当前步的完成标记
      delete G.done[G.scene + ':' + i];
      save(); renderGuideSteps();
      switchTab(sc.steps[i - 1].tab);
      toast('已回到：' + sc.steps[i - 1].t);
    };
  });
  [].forEach.call(host.querySelectorAll('[data-gdskip]'), function(b){
    b.onclick = function(){
      var i = parseInt(b.getAttribute('data-gdskip'), 10);
      if(i < sc.steps.length - 1){
        G.done[G.scene + ':' + i] = true;
        save(); renderGuideSteps();
        switchTab(sc.steps[i + 1].tab);
        toast('已跳过，前往下一步');
      } else {
        toast('已是最后一步');
      }
    };
  });
}

/* ============================================================
 * 第二层：对话式入口
 * 关键词匹配 → 命中直接跳；不命中诚实兜底（不硬猜）
 * ============================================================ */
function guideAsk(){
  var inp = $('#gdInput');
  if(!inp) return;
  var q = (inp.value || '').trim();
  if(!q){ toast('先输入你要做什么'); return; }
  gd().q = q; save();
  renderGuideAnswer(q);
}

function matchScene(q){
  var s = q.toLowerCase();
  var best = null, bestScore = 0;

  Object.keys(GUIDE_SCENES).forEach(function(sk){
    var sc = GUIDE_SCENES[sk];
    sc.steps.forEach(function(st, i){
      var score = 0;
      // 步骤标题命中权重最高
      if(s.indexOf(st.t.toLowerCase()) >= 0) score += 10;
      // 关键词命中
      st.kw.forEach(function(w){
        if(s.indexOf(w.toLowerCase()) >= 0) score += 3;
      });
      // 场景名命中
      if(s.indexOf(sc.n.toLowerCase()) >= 0) score += 2;
      if(score > bestScore){
        bestScore = score;
        best = {scene:sk, step:i, sceneN:sc.n, stepT:st.t, tab:st.tab, icon:sc.icon};
      }
    });
  });
  return bestScore >= 3 ? best : null;
}

function renderGuideAnswer(q){
  var host = $('#gdAnswer'); if(!host) return;
  var m = matchScene(q);

  if(m){
    var G = gd();
    // 自动切到命中的场景，便于用户看清上下文
    if(G.scene !== m.scene){ G.scene = m.scene; save(); renderSceneChips(); renderGuideSteps(); }
    host.className = 'preview gdanw is-hit';
    host.innerHTML =
      '<div class="gdanw__hd">✅ 这应该属于</div>' +
      '<div class="gdanw__m">' + m.icon + ' <b>' + esc(m.sceneN) + '</b> · 第 ' + (m.step + 1) + ' 步：' + esc(m.stepT) + '</div>' +
      '<div class="gdanw__acts">' +
        '<button class="btn btn--primary btn--sm" id="gdGoHit">直接前往 →</button>' +
        '<button class="btn btn--ghost btn--sm" id="gdSeeFlow">查看完整流程</button>' +
      '</div>';
    $('#gdGoHit').onclick = function(){ switchTab(m.tab); };
    $('#gdSeeFlow').onclick = function(){
      var el = $('#gdSteps');
      if(el) el.scrollIntoView({behavior:'smooth', block:'start'});
    };
    return;
  }

  /* 兜底：不硬猜，摊开流程让用户选 */
  var cands = [];
  Object.keys(GUIDE_SCENES).forEach(function(sk){
    var sc = GUIDE_SCENES[sk];
    cands.push({icon:sc.icon, n:sc.n, first:sc.steps[0], sk:sk});
  });
  host.className = 'preview gdanw is-miss';
  var h = '<div class="gdanw__hd">🤔 没太确定你说的是哪一步</div>';
  h += '<p class="gdanw__tip">纯本地工具无法做语义理解，硬猜会误导你。下面是四个场景的起点，看看哪个更接近：</p>';
  h += '<ul class="gdanw__list">';
  cands.forEach(function(c){
    h += '<li><b>' + c.icon + ' ' + esc(c.n) + '</b>：' + esc(c.first.t) +
         '　<button class="btn btn--sm btn--ghost" data-gdcand="' + c.sk + '">从这里开始</button></li>';
  });
  h += '</ul>';
  host.innerHTML = h;
  [].forEach.call(host.querySelectorAll('[data-gdcand]'), function(b){
    b.onclick = function(){
      gd().scene = b.getAttribute('data-gdcand');
      save(); renderSceneChips(); renderGuideSteps();
      host.innerHTML = '<div class="gdanw__hd">已切换到「' +
        esc(GUIDE_SCENES[gd().scene].n) + '」，从第一步开始 ↓</div>';
    };
  });
}

/* ---------- 渲染入口 ---------- */
function renderGuideAll(){
  renderSceneChips();
  renderGuideSteps();
  var G = gd();
  var inp = $('#gdInput');
  if(inp && G.q){ inp.value = G.q; renderGuideAnswer(G.q); }
}
