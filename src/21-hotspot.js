/* ============================================================
 * 热点决策 —— 这个热点该不该跟、怎么跟
 *
 * 说明：不做"事实核查"（那需要联网权威数据源 + 要对结论负责）
 *       做"跟进决策"（确定性判断，纯前端可完成）
 * 营销翻车 90% 不是因为热点是假的，而是热点是真的但不该跟
 *
 * V45 重构：从「五维加权打分」改为「五道闸门 + 动作层」
 *   为什么改：热点是负偏态决策——收益有上限（多一波声量），
 *   损失无下限（品牌翻车不可逆）。加权打分会用虚假精确感
 *   掩盖尾部风险。闸门是"能不能碰"的定性判断，不是"值多少分"。
 *   原五维打分降级为背景信息，不再直接输出一个总分。
 * ============================================================ */

/* ---------- 五维打分（降级为背景信息，不再直接加权出总分） ---------- */
var HS_DIMS = [
  {k:'rel',    n:'相关性',   icon:'🎯', max:25,
   q:'这个热点与你的品牌/品类关联度多高？',
   lo:'只是蹭个热闹', hi:'与产品强相关'},
  {k:'time',   n:'时效性',   icon:'⏱️', max:20,
   q:'这个热点还能火多久？',
   lo:'已经降温', hi:'正在上升期'},
  {k:'risk',   n:'风险度',   icon:'⚠️', max:25,
   q:'涉及敏感话题的程度？（分数越高＝越安全）',
   lo:'涉政/灾难/逝者等高危', hi:'无敏感，安全'},
  {k:'fit',    n:'品牌契合', icon:'🎭', max:15,
   q:'与品牌调性契合度？',
   lo:'与调性冲突', hi:'天然契合'},
  {k:'value',  n:'转化潜力', icon:'💰', max:15,
   q:'能带来实际业务价值吗？',
   lo:'只有曝光没有转化', hi:'能直接带货/获客'}
];

/* ---------- 敏感话题清单（闸门一的判定依据） ---------- */
var HS_RISK_TOPICS = [
  {k:'disaster', n:'自然灾害/事故',   w:['地震','台风','洪水','火灾','爆炸','坠机','沉船','塌方'], lv:'high',
   tip:'涉伤亡事件，借势极易被解读为消费苦难。如要发声，只做公益不提产品。'},
  {k:'death',    n:'名人/公众人物离世', w:['去世','逝世','离世','身亡','殉职','遇难'], lv:'high',
   tip:'逝者话题，任何带货动作都会被放大解读。建议仅表达哀悼或不参与。'},
  {k:'politic',  n:'政治/时政/国际冲突', w:['选举','外交','制裁','战争','示威','政策','领导人','领土'], lv:'high',
   tip:'时政话题商业品牌不宜介入，风险不可控。'},
  {k:'gender',   n:'性别对立', w:['女权','男权','普信','拜金','捞女','田园'], lv:'mid',
   tip:'性别议题极易引发阵营对立，站队必得罪一方。'},
  {k:'tragedy',  n:'社会悲剧/犯罪', w:['遇害','被害','失踪','虐待','性侵','霸凌'], lv:'high',
   tip:'涉及受害者的话题，商业借势几乎必然翻车。'},
  {k:'price',    n:'物价/民生焦虑', w:['涨价','裁员','失业','房贷','内卷','躺平'], lv:'mid',
   tip:'民生焦虑类话题，用轻松玩梗语气会被批"何不食肉糜"。'},
  {k:'rumor',    n:'未证实传闻', w:['据说','传闻','网传','疑似','爆料','知情人'], lv:'mid',
   tip:'消息未证实前跟进，若后续反转品牌会被打脸。建议等官方通报。'},
  {k:'competitor',n:'竞品负面', w:['翻车','塌房','质检','曝光','处罚','起诉'], lv:'mid',
   tip:'借竞品负面营销容易引发行业反感，且可能构成不正当竞争。'}
];

/* ============================================================
 *  闸门一：红线筛查（一票否决，不是打分）
 * ============================================================ */
var HS_GATE1 = {
  red:    {n:'🔴 禁止触碰', c:'var(--alert)', d:'不参与后续任何评估，直接出结论'},
  yellow: {n:'🟡 谨慎',     c:'var(--warn)',  d:'可继续，但强制降档 + 额外约束'},
  green:  {n:'🟢 一般',     c:'var(--ok)',    d:'正常走完整评估流程'}
};

function hsGate1(topic){
  var hits = [];
  HS_RISK_TOPICS.forEach(function(t){
    var hit = [];
    t.w.forEach(function(w){ if(topic.indexOf(w) > -1) hit.push(w); });
    if(hit.length) hits.push({k:t.k, n:t.n, lv:t.lv, tip:t.tip, hit:hit});
  });
  var hasHigh = hits.some(function(r){ return r.lv === 'high'; });
  var hasMid  = hits.some(function(r){ return r.lv === 'mid'; });
  var lv = hasHigh ? 'red' : (hasMid ? 'yellow' : 'green');
  return {lv:lv, hits:hits, hasHigh:hasHigh, hasMid:hasMid};
}

/* ============================================================
 *  闸门二：品牌契合（三层，不止"品类相关吗"）
 * ============================================================ */
function hsBrandCtx(){
  var out = {hasBC:false, catName:'', taboo:[], claim:'', aud:''};
  try{
    if(typeof BC_CATS === 'undefined') return out;
    var k = '';
    var el = $('#bc_cat');
    if(el && el.value) k = el.value;
    if(!k && state.bc && state.bc.cat) k = state.bc.cat;
    if(!k) return out;
    var cat = null;
    BC_CATS.forEach(function(x){ if(x.k === k) cat = x; });
    if(!cat) return out;
    out.hasBC = true;
    out.catName = cat.n;
    out.taboo = cat.taboo || [];
    if(state.bc){
      out.claim = state.bc.claim || '';
      out.aud   = state.bc.aud || '';
    }
  }catch(e){}
  return out;
}

function hsGate2(topic, way){
  var bc = hsBrandCtx();
  var res = {bc:bc, level:'na', note:'', conflicts:[]};

  if(!bc.hasBC){
    res.note = '未填品牌内核，无法做价值契合判断。建议先填「🏛️ 品牌内核」再评估。';
    return res;
  }

  // 品类禁忌文本匹配：热点涉及的动作是否踩到品类禁忌
  var txt = (topic + ' ' + (way || '')).toLowerCase();
  var hitTaboo = [];
  bc.taboo.forEach(function(t){
    // 禁忌句里抽取关键动作词做粗匹配
    var keys = (t.match(/[一-龥]{2,4}/g) || []);
    keys.forEach(function(kk){
      if(kk.length >= 2 && txt.indexOf(kk) > -1) hitTaboo.push({t:t, k:kk});
    });
  });
  // 去重
  var seen = {};
  hitTaboo = hitTaboo.filter(function(x){ if(seen[x.t]) return false; seen[x.t] = 1; return true; });

  res.conflicts = hitTaboo;

  if(hitTaboo.length){
    res.level = 'conflict';
    res.note = '热点跟进方式可能触发【' + bc.catName + '】品类禁忌，需调整角度或放弃。';
  } else {
    res.level = 'ok';
    res.note = '未发现与【' + bc.catName + '】品类禁忌的明显冲突。价值契合需人工复核：这个热点传达的价值观，与品牌主张一致吗？';
  }
  return res;
}

/* ============================================================
 *  闸门三：时滞 vs 窗口（唯一能真算的一关）
 *  绝大多数热点不是"不该追"，是"来不及"
 * ============================================================ */
function hsGate3(){
  var g = function(id, def){
    var el = $(id);
    var v = el ? parseFloat(el.value) : NaN;
    return isNaN(v) ? def : v;
  };
  var win  = g('#hs_win_h', 36);   // 热点剩余窗口（小时）
  var copy = g('#hs_copy_h', 4);   // 文案
  var des  = g('#hs_design_h', 8); // 设计
  var appr = g('#hs_appr_h', 12);  // 审批
  var ramp = g('#hs_ramp_h', 8);   // 发布后起量
  var paraEl = $('#hs_para');
  var para = paraEl ? (paraEl.value === '1') : false;

  // 串行 = 累加；并行 = 取最长项
  var lag = para ? Math.max(copy, des, appr) : (copy + des + appr);
  var eff = win - lag - ramp;

  var verdict, vc;
  if(eff <= 0){
    verdict = '参与不了';
    vc = 'var(--alert)';
  } else if(eff <= win * 0.25){
    verdict = '极度紧张';
    vc = 'var(--warn)';
  } else if(eff <= win * 0.5){
    verdict = '基本来得及';
    vc = 'var(--signal)';
  } else {
    verdict = '有余量';
    vc = 'var(--ok)';
  }

  return {
    win:win, copy:copy, des:des, appr:appr, ramp:ramp, para:para,
    lag:lag, eff:eff, verdict:verdict, vc:vc
  };
}

/* ============================================================
 *  闸门四：参与姿态（"追不追"是个错误的二选一）
 * ============================================================ */
var HS_POSES = [
  {k:'silent',  n:'沉默',     lv:0, cost:'零',   risk:'零',
   d:'不参与，品牌资产零损耗',
   when:'红线命中 / 价值冲突 / 明显来不及',
   tip:'放弃不是失败。不参与是最低成本的品牌保护。'},
  {k:'light',   n:'轻量跟随', lv:1, cost:'极低', risk:'低',
   d:'换话题标签、评论区接梗、转发带态度。近乎零成本，拿存在感不押资产',
   when:'时间紧 / 预算小 / 不确定值不值',
   tip:'多数情况下这是最优解——用最小成本拿曝光，不押品牌。'},
  {k:'rewrite', n:'借势改写', lv:2, cost:'中',   risk:'中',
   d:'用热点元素讲自己的故事，做独立内容',
   when:'价值契合 + 有时间做内容',
   tip:'需要真正的创意，不是复述热点。'},
  {k:'heavy',   n:'重度绑定', lv:3, cost:'高',   risk:'高',
   d:'做物料、投流、做活动，全资源压上',
   when:'热点与品牌强相关 + 窗口充足 + 预算到位',
   tip:'只有大节点值得，且必须过事前验尸。'},
  {k:'reverse', n:'反向输出', lv:4, cost:'中高', risk:'很高',
   d:'反其道而行，用对立角度制造记忆点',
   when:'仅限 🟢 一般类热点 + 有极强的表达把控力',
   tip:'最高回报也最高风险。🟡🔴 类热点绝不提供此选项。'}
];

function hsGate4(g1, g2, g3, dims){
  var why = [];

  // 红线命中 → 直接沉默（不参与后续任何评估）
  if(g1.lv === 'red'){
    return {pose:HS_POSES[0], why:['闸门一命中红线（🔴 禁止触碰），不参与后续评估']};
  }

  /* cap = 系统推荐上限。所有"提升"规则都不得突破它。
   * 初始 3（重度绑定）——reverse 是最低风险档的反面，
   * 属最高风险，只作可选提示，永不作为系统自动推荐结果。 */
  var cap = 3;

  // 黄线 → 天花板压到轻量
  if(g1.lv === 'yellow'){
    cap = 1;
    why.push('闸门一为 🟡 谨慎：最高只到「轻量跟随」');
  }

  // 价值冲突 → 天花板压到轻量
  if(g2.level === 'conflict'){
    cap = Math.min(cap, 1);
    why.push('闸门二检测到品类禁忌冲突：不宜做重度内容');
  }

  // 时间窗决定时间天花板
  var timeCap = 4;
  if(g3.eff <= 0){ timeCap = 0; why.push('闸门三：有效窗口 ' + Math.round(g3.eff) + ' 小时 → 参与不了'); }
  else if(g3.eff <= g3.win * 0.25){ timeCap = 1; why.push('闸门三：有效窗口仅剩 ' + Math.round(g3.eff) + ' 小时 → 只够轻量动作'); }
  else if(g3.eff <= g3.win * 0.5){ timeCap = 2; why.push('闸门三：有效窗口 ' + Math.round(g3.eff) + ' 小时 → 可借势改写'); }
  else { why.push('闸门三：有效窗口 ' + Math.round(g3.eff) + ' 小时 → 时间充裕'); }

  cap = Math.min(cap, timeCap);

  var lv = cap;

  // 相关性与契合度做进一步压低（只会更低，不会突破 cap）
  var rel = (dims.filter(function(d){ return d.k === 'rel'; })[0] || {}).raw || 3;
  var fit = (dims.filter(function(d){ return d.k === 'fit'; })[0] || {}).raw || 3;
  if(rel <= 2 && lv > 1){ lv = 1; why.push('相关性偏低（' + rel + '/5）→ 硬蹭风险大于收益'); }
  if(fit <= 2 && lv > 1){ lv = 1; why.push('品牌契合偏低（' + fit + '/5）→ 强行玩梗易翻车'); }

  // 相关性与契合双高：在时间天花板内提升到重度绑定，但不得突破 cap
  if(rel >= 4 && fit >= 4 && lv < 3 && timeCap >= 3){
    var want = Math.min(3, cap);
    if(want > lv){ lv = want; why.push('相关性与契合双高 → 可考虑重度绑定'); }
  }

  // 🟡 类热点不给反向输出（双重保险）
  if(g1.lv !== 'green' && lv >= 4) lv = 3;
  // 反向输出永不作为自动推荐
  if(lv >= 4) lv = 3;

  if(!why.length) why.push('各项均衡，按推荐档位执行');

  return {pose:HS_POSES[lv], why:why};
}

/* ============================================================
 *  闸门五：事前验尸（Pre-mortem）
 *  不问"会不会成功"，问"假设翻车了，最可能因为什么"
 * ============================================================ */
var HS_PREMORTEM = [
  {k:'reverse',  n:'热点本身反转',        d:'事实未明就站队，后续打脸'},
  {k:'person',   n:'关联人出负面',        d:'代言人/话题人物塌房牵连品牌'},
  {k:'offend',   n:'表达冒犯了某群体',    d:'玩梗越界、刻板印象、地域性别'},
  {k:'same',     n:'竞品已占位，同质化',  d:'同样的角度被说过了，无人记得你'},
  {k:'slow',     n:'审批太慢，错过窗口',  d:'内部流程耗光了热度'},
  {k:'overdo',   n:'用力过猛',            d:'小热点大投入，显得刻意且廉价'},
  {k:'values',   n:'价值观冲突',          d:'热点传达的价值观与品牌主张相悖'}
];

/* ============================================================
 *  动作层：四个决策动作
 * ============================================================ */
var HS_ACTIONS = [
  {k:'drop',  n:'放弃',     c:'var(--mute)',   d:'归档，不投入任何资源'},
  {k:'light', n:'轻量跟随', c:'var(--ok)',     d:'最低成本拿曝光，不押品牌资产'},
  {k:'watch', n:'继续追踪', c:'var(--signal)', d:'进观察池，设定复评条件后暂缓'},
  {k:'go',    n:'肯定跟',   c:'var(--brand)',  d:'投入资源，走完整内容流程'}
];

/* ---------- 反向角度（仅 🟢 类热点提供）----------
 * 追热点最大的问题不是慢，是同质化——所有人说一样的话。
 * 真正的差异化是角度，不是速度。
 * ⚠️ 但反向角度最容易踩红线，所以仅 🟢 类开放。
 */
function hsReverseAngles(topic, g1){
  if(g1.lv !== 'green'){
    return null; // 🔴🟡 类不提供，避免诱导在敏感话题上"抖机灵"
  }
  return [
    {n:'主流叙事', c:'var(--mute)',  d:'大多数人会怎么说——这是你要避开的角度'},
    {n:'反向切入', c:'var(--brand)', d:'解构/质疑/补充主流没说的那一面。反向角度往往才是被记住的'},
    {n:'侧向迁移', c:'var(--signal)',d:'不谈热点本身，把热点的情绪或场景迁移到自己的产品'}
  ];
}

/* ============================================================
 *  核心计算
 * ============================================================ */
function calcHotspot(){
  var get = function(k){
    var el = $('#hs_' + k);
    return el ? (parseFloat(el.value) || 0) : 0;
  };
  var topic = ($('#hs_topic') && $('#hs_topic').value.trim()) || '';
  var way   = ($('#hs_way')   && $('#hs_way').value.trim())   || '';
  var brand = (state.brand && state.brand.name) || '';

  var errs = [];
  if(!topic) errs.push('请填写热点描述');

  var stat = $('#hsStat');
  if(stat) stat.textContent = errs.length ? ('⚠️ ' + errs[0]) : '✅ 参数已就绪';
  if(errs.length) return null;

  // 五维（背景信息）
  var dims = HS_DIMS.map(function(d){
    var v = clamp(get(d.k), 1, 5);
    var ratio = (v - 1) / 4;
    return {k:d.k, n:d.n, icon:d.icon, raw:v, s:Math.round(ratio * d.max), max:d.max};
  });
  var total = dims.reduce(function(a,d){ return a + d.s; }, 0);

  // 五闸门
  var g1 = hsGate1(topic);
  var g2 = hsGate2(topic, way);
  var g3 = hsGate3();
  var g4 = hsGate4(g1, g2, g3, dims);
  var g5 = HS_PREMORTEM.slice();

  // 反向角度（仅 🟢）
  var rev = hsReverseAngles(topic, g1);

  // 整体建议：以闸门结论为准，不再用总分
  var advice, adviceKey, color;
  if(g1.lv === 'red'){
    adviceKey = 'stop'; advice = '🛑 红线命中 · 不建议跟进'; color = 'var(--alert)';
  } else if(g3.eff <= 0){
    adviceKey = 'late'; advice = '⏱️ 来不及 · 有效窗口已耗尽'; color = 'var(--alert)';
  } else if(g2.level === 'conflict'){
    adviceKey = 'conflict'; advice = '⚠️ 与品类禁忌冲突 · 需换角度'; color = 'var(--warn)';
  } else {
    adviceKey = g4.pose.k;
    advice = {silent:'⚪ 建议放弃', light:'🟢 轻量跟随即可', rewrite:'🔵 可借势改写',
              heavy:'🟣 值得重度投入', reverse:'🟠 可考虑反向输出'}[g4.pose.k] || '🟢 可跟进';
    color = g4.pose.k === 'silent' ? 'var(--mute)' :
            (g4.pose.k === 'light' ? 'var(--ok)' : 'var(--brand)');
  }

  return {
    topic:topic, way:way, brand:brand,
    dims:dims, total:total, max:100,
    g1:g1, g2:g2, g3:g3, g4:g4, g5:g5, rev:rev,
    advice:advice, adviceKey:adviceKey, color:color
  };
}

/* ---------- 渲染 ---------- */
var lastHotspot = null;

function renderHotspot(){
  var d = calcHotspot();
  lastHotspot = d;
  var host = $('#hsPreview');
  if(!d){
    if(host) host.innerHTML = '<span class="ph">⚠️ 请填写热点描述后计算</span>';
    return;
  }

  var out = [];
  out.push('# 📡 热点跟进决策');
  out.push('');
  out.push('**热点**：' + d.topic);
  if(d.brand) out.push('　|　**品牌**：' + d.brand);
  if(d.way)   out.push('　|　**计划跟进方式**：' + d.way);
  out.push('');
  out.push('---');
  out.push('');
  out.push('## 决策结论');
  out.push('');
  out.push('> # ' + d.advice);
  out.push('>');
  out.push('> 建议姿态：**' + d.g4.pose.n + '**（成本 ' + d.g4.pose.cost + ' · 风险 ' + d.g4.pose.risk + '）');
  out.push('');

  /* 闸门一 */
  var G1 = HS_GATE1[d.g1.lv];
  out.push('## 闸门一 · 红线筛查');
  out.push('');
  out.push('**' + G1.n + '** — ' + G1.d);
  out.push('');
  if(d.g1.hits.length){
    d.g1.hits.forEach(function(r){
      out.push('- **' + (r.lv === 'high' ? '🔴 高危' : '🟡 中危') + ' ' + r.n + '**（命中：' + r.hit.join('、') + '）');
      out.push('  - ' + r.tip);
    });
  } else {
    out.push('- 未命中敏感话题词库。');
    out.push('- 提醒：词库只能识别显性词，**价值观层面的风险仍需人工判断**。');
  }
  out.push('');
  if(d.g1.lv === 'red'){
    out.push('> 🛑 **红线命中，以下闸门仅作记录，不改变"不跟进"的结论。**');
    out.push('');
  }

  /* 闸门二 */
  out.push('## 闸门二 · 品牌契合');
  out.push('');
  var G2 = d.g2;
  if(G2.level === 'na'){
    out.push('⚪ ' + G2.note);
  } else {
    out.push('品类：**' + G2.bc.catName + '**');
    if(G2.bc.claim) out.push('品牌主张：' + G2.bc.claim);
    out.push('');
    if(G2.conflicts.length){
      out.push('⚠️ **可能与品类禁忌冲突**：');
      G2.conflicts.forEach(function(c){
        out.push('- ' + c.t + '（命中词：' + c.k + '）');
      });
    } else {
      out.push('✅ 未发现与品类禁忌的明显冲突。');
    }
    out.push('');
    out.push('> ' + G2.note);
    if(G2.bc.taboo.length){
      out.push('>');
      out.push('> 该品类全部禁忌：');
      G2.bc.taboo.forEach(function(t){ out.push('> - ' + t); });
    }
  }
  out.push('');

  /* 闸门三 */
  var G3 = d.g3;
  out.push('## 闸门三 · 时滞 vs 窗口');
  out.push('');
  out.push('| 项目 | 数值 |');
  out.push('|---|---|');
  out.push('| 热点剩余窗口 | ' + G3.win + ' 小时 |');
  out.push('| 响应时滞（' + (G3.para ? '并行' : '串行') + '） | ' + G3.lag + ' 小时 |');
  out.push('　| 　— 文案 ' + G3.copy + 'h · 设计 ' + G3.des + 'h · 审批 ' + G3.appr + 'h |  ');
  out.push('| 发布后起量 | ' + G3.ramp + ' 小时 |');
  out.push('| **有效窗口** | **' + Math.round(G3.eff) + ' 小时** |');
  out.push('');
  out.push('**判定：' + G3.verdict + '**');
  out.push('');
  if(G3.eff <= 0){
    out.push('> ⏱️ 有效窗口为负——不是"建议观望"，是**这个热点你参与不了**。');
    out.push('>');
    out.push('> 缩短审批或改用轻量动作（评论区/话题标签）可重新进入窗口。');
  }
  out.push('');

  /* 闸门四 */
  var G4 = d.g4;
  out.push('## 闸门四 · 建议参与姿态');
  out.push('');
  out.push('### ' + G4.pose.n + '（成本 ' + G4.pose.cost + ' · 风险 ' + G4.pose.risk + '）');
  out.push('');
  out.push(G4.pose.d);
  out.push('');
  out.push('- **适用**：' + G4.pose.when);
  out.push('- **提醒**：' + G4.pose.tip);
  out.push('');
  out.push('**为什么是这一档**：');
  G4.why.forEach(function(w){ out.push('- ' + w); });
  out.push('');
  out.push('<details><summary>全部五档姿态对照</summary>');
  out.push('');
  out.push('| 姿态 | 成本 | 风险 | 说明 | 适用 |');
  out.push('|---|---|---|---|---|');
  HS_POSES.forEach(function(p){
    out.push('| ' + (p.k === G4.pose.k ? '**▶ ' + p.n + '**' : p.n) + ' | ' + p.cost + ' | ' + p.risk + ' | ' + p.d + ' | ' + p.when + ' |');
  });
  out.push('');
  out.push('</details>');
  out.push('');

  /* 闸门五 */
  out.push('## 闸门五 · 事前验尸');
  out.push('');
  out.push('> 假设一周后，这次追热点翻车了。最可能因为什么？');
  out.push('>');
  out.push('> 逐项确认，勾选你无法排除的：');
  out.push('');
  d.g5.forEach(function(p){
    out.push('- [ ] **' + p.n + '** — ' + p.d);
  });
  out.push('');
  out.push('*方法论：Gary Klein 的 Pre-mortem。人预测失败时的判断力显著强于预测成功。*');
  out.push('');

  /* 反向角度 */
  if(d.rev){
    out.push('## 💡 反向角度（仅 🟢 一般类热点提供）');
    out.push('');
    d.rev.forEach(function(r){
      out.push('- **' + r.n + '**：' + r.d);
    });
    out.push('');
  } else if(d.g1.lv !== 'green'){
    out.push('## 💡 反向角度');
    out.push('');
    out.push('🛑 **本次不提供**。反向角度在' +
      (d.g1.lv === 'red' ? '🔴 禁止触碰' : '🟡 谨慎') +
      '类热点上极易演变为冒犯——这个功能本身很妙，但没有约束就是定时炸弹。');
    out.push('');
  }

  /* 动作层 */
  out.push('## 决策动作');
  out.push('');
  out.push('| 动作 | 含义 |');
  out.push('|---|---|');
  HS_ACTIONS.forEach(function(a){
    out.push('| ' + a.n + ' | ' + a.d + ' |');
  });
  out.push('');

  /* 五维背景 */
  out.push('<details><summary>五维自评（背景信息，不参与加权）</summary>');
  out.push('');
  out.push('| 维度 | 自评 | 说明 |');
  out.push('|---|---|---|');
  d.dims.forEach(function(x){
    var def = HS_DIMS.filter(function(y){ return y.k === x.k; })[0];
    out.push('| ' + x.icon + ' ' + x.n + ' | ' + x.raw + ' / 5 | ' + def.q + ' |');
  });
  out.push('');
  out.push('> ⚠️ 原「总分 ' + d.total + '/100」已弃用。热点是负偏态决策，');
  out.push('> 加权打分会用虚假精确感掩盖尾部风险，改为闸门定性判断。');
  out.push('');
  out.push('</details>');
  out.push('');

  out.push('---');
  out.push('');
  out.push('### 下一步');
  out.push('');
  out.push('- 把写好的跟进文案贴进「📝 内容工厂」，点「🩺 内容体检」查合规与质量');
  out.push('- 高热点内容尤其要查**违禁词**——流量越大，翻车代价越高');
  out.push('');
  out.push('*本工具做「该不该跟」的决策辅助，不做事实核查。热点真伪请自行通过权威渠道核实。*');

  if(host){
    host.innerHTML = mdLite(out.join('\n'));
    /* 动作层与台账挂在 md 之后，避免被 mdLite 吞掉按钮 */
    var _a = document.createElement('div');
    _a.innerHTML = hsActHtml(d);
    host.appendChild(_a);
    var _l = document.createElement('div');
    _l.id = 'hsLog';
    host.appendChild(_l);
  }
  hsRenderLog();

  var badge = $('#hsBadge');
  if(badge){
    badge.textContent = d.advice;
    badge.style.color = d.color;
    badge.style.borderColor = d.color;
  }
}

/* ---------- 一键送去体检 ---------- */
function hotspotToScan(){
  if(!lastHotspot){ toast('请先计算热点决策'); return; }
  var d = lastHotspot;
  switchTab('content');

  var t = $('#c_title');
  if(t){
    t.value = d.topic.slice(0, 30);
    t.dispatchEvent(new Event('input', {bubbles:true}));
  }
  var ex = $('#c_extra');
  if(ex){
    var lines = [];
    lines.push('【热点借势】' + d.topic);
    if(d.way) lines.push('计划跟进方式：' + d.way);
    lines.push('决策结论：' + d.advice + '（建议姿态：' + d.g4.pose.n + '）');
    lines.push('建议：' + d.g4.pose.tip);
    if(d.rev) lines.push('可用角度：' + d.rev.map(function(r){ return r.n; }).join(' / '));
    ex.value = lines.join('\n');
    ex.dispatchEvent(new Event('input', {bubbles:true}));
  }
  toast('已把热点语境填入内容工厂，生成后可直接体检');
}

/* ---------- 示例 ---------- */
function demoHotspot(){
  var set = function(id, v){ var e = $(id); if(e) e.value = v; };
  set('#hs_topic', '某明星官宣新代言，全网热议其代言的平价护肤品牌');
  set('#hs_way',   '借势发小红书：平价也能有好成分，附产品对比测评');
  set('#hs_rel',   '4');
  set('#hs_time',  '4');
  set('#hs_risk',  '5');
  set('#hs_fit',   '4');
  set('#hs_value', '3');
  set('#hs_win_h',   '36');
  set('#hs_copy_h',  '4');
  set('#hs_design_h','8');
  set('#hs_appr_h',  '12');
  set('#hs_ramp_h',  '8');
  set('#hs_para',    '0');
  renderHotspot();
  toast('已填入示例：明星代言类热点');
}

/* ---------- 导出 ---------- */
function exportHotspot(){
  if(!lastHotspot){ toast('请先计算'); return; }
  var d = lastHotspot;
  var out = ['# 📡 热点跟进决策报告', ''];
  out.push('> ' + new Date().toLocaleString('zh-CN') + '　·　本地生成，未上传');
  out.push('');
  out.push('**热点**：' + d.topic);
  if(d.way) out.push('**计划跟进方式**：' + d.way);
  out.push('');
  out.push('## 结论：' + d.advice + '（建议姿态：' + d.g4.pose.n + '）');
  out.push('');
  out.push('### 闸门一 · 红线筛查：' + HS_GATE1[d.g1.lv].n);
  if(d.g1.hits.length){
    d.g1.hits.forEach(function(r){
      out.push('- ' + (r.lv === 'high' ? '🔴' : '🟡') + ' ' + r.n + '：' + r.tip);
    });
  } else out.push('- 未命中敏感话题词库');
  out.push('');
  out.push('### 闸门二 · 品牌契合');
  out.push('- ' + d.g2.note);
  if(d.g2.conflicts.length){
    d.g2.conflicts.forEach(function(c){ out.push('- ⚠️ ' + c.t); });
  }
  out.push('');
  out.push('### 闸门三 · 时滞 vs 窗口');
  out.push('- 剩余窗口 ' + d.g3.win + 'h － 时滞 ' + d.g3.lag + 'h － 起量 ' + d.g3.ramp + 'h ＝ **有效 ' + Math.round(d.g3.eff) + 'h**');
  out.push('- 判定：' + d.g3.verdict);
  out.push('');
  out.push('### 闸门四 · 建议姿态：' + d.g4.pose.n);
  d.g4.why.forEach(function(w){ out.push('- ' + w); });
  out.push('');
  out.push('### 闸门五 · 事前验尸');
  d.g5.forEach(function(p){ out.push('- [ ] ' + p.n + '：' + p.d); });
  out.push('');
  if(d.rev){
    out.push('### 反向角度');
    d.rev.forEach(function(r){ out.push('- **' + r.n + '**：' + r.d); });
  } else {
    out.push('### 反向角度');
    out.push('- 本次不提供（' + HS_GATE1[d.g1.lv].n + '类热点不开放反向角度）');
  }
  out.push('');
  out.push('---');
  out.push('');
  out.push('*决策辅助工具，不做事实核查。热点真伪请通过权威渠道核实。*');
  downloadFile('热点决策_' + ymd(new Date()) + '.md', out.join('\n'), 'text/markdown');
}

/* ============================================================
 *  热点台账：决策留痕 + 事后回填
 * ------------------------------------------------------------
 *  为什么单独做台账，而不是只给一个结论：
 *    「追不追」是当下决策，但「追得对不对」只有事后才知道。
 *    没有回填，每次决策都是从零开始，无法形成
 *    「我们品牌适合追什么」的规律——那才是长期值钱的东西。
 *  样本约定：有效回填 < 5 条时不统计规律（沿用产品一贯原则：
 *  宁可少说，也不说一个自己都不信的数字）。
 * ============================================================ */
function hsLog(){
  if(!state.hs) state.hs = {};
  if(!state.hs.log) state.hs.log = [];
  return state.hs.log;
}

function hsStat(){
  var log = hsLog();
  var done = log.filter(function(r){ return r.result; });
  return {total:log.length, done:done.length, enough:done.length >= 5};
}

function hsLogAdd(actKey){
  var d = lastHotspot;
  if(!d){ toast('请先计算热点决策'); return null; }
  var act = HS_ACTIONS.filter(function(a){ return a.k === actKey; })[0] || HS_ACTIONS[0];
  var rec = {
    id:'hs' + Date.now(),
    day:(new Date()).toISOString().slice(0,10),
    topic:d.topic,
    way:d.way || '',
    gate1:d.g1.lv,
    advice:d.advice || '',
    pose:(d.g4 && d.g4.pose) ? d.g4.pose.n : '',
    act:actKey,
    actName:act.n,
    result:'',
    review:''
  };
  var log = hsLog();
  log.unshift(rec);
  if(log.length > 100) log.length = 100;
  if(typeof save === 'function') save();
  toast('已记入热点台账：' + act.n);
  hsRenderLog();
  return rec;
}

/* 事后回填：prompt 是最朴素但零依赖可靠的方式 */
function hsFillResult(id){
  var log = hsLog();
  var rec = log.filter(function(r){ return r.id === id; })[0];
  if(!rec) return;
  var v = prompt('回填结果：这次「' + rec.actName + '」，实际效果如何？\n例：曝光 5 万、转化 12 单 / 无反响 / 轻微负面', rec.result || '');
  if(v === null) return;
  rec.result = v.trim();
  if(rec.result){
    var r2 = prompt('一句话复盘：下次遇到同类热点，还会这么做吗？', rec.review || '');
    if(r2 !== null) rec.review = r2.trim();
  }
  if(typeof save === 'function') save();
  hsRenderLog();
  if(typeof renderTimeline === 'function') renderTimeline();
}

function hsLogDel(id){
  var log = hsLog();
  var i = -1;
  log.forEach(function(r, k){ if(r.id === id) i = k; });
  if(i > -1){
    log.splice(i, 1);
    if(typeof save === 'function') save();
    hsRenderLog();
    if(typeof renderTimeline === 'function') renderTimeline();
  }
}

function hsRenderLog(){
  var host = $('#hsLog');
  if(!host) return;
  var log = hsLog();
  var st = hsStat();
  if(!log.length){
    host.innerHTML = '<span class="ph">暂无记录。在上方选一个动作，决策会记入这里，事后可回填结果。</span>';
    return;
  }
  var h = '<div class="hslog">';
  h += '<div class="hslog__ttl">热点台账 <span class="hslog__cnt">' + st.total + ' 条决策 · ' + st.done + ' 条已回填</span></div>';
  if(!st.enough){
    h += '<div class="hslog__note">样本不足（' + st.done + '/5）：暂不统计「我们适合追什么」的规律，只做记录。</div>';
  } else {
    var byAct = {};
    log.forEach(function(r){ if(r.result) byAct[r.actName] = (byAct[r.actName] || 0) + 1; });
    var arr = Object.keys(byAct).map(function(k){ return k + ' ' + byAct[k] + ' 次'; });
    h += '<div class="hslog__note hslog__note--ok">已回填 ' + st.done + ' 条：' + esc(arr.join('、')) + '</div>';
  }
  log.slice(0, 12).forEach(function(r){
    var c = {drop:'var(--mute)', light:'var(--ok)', watch:'var(--signal)', go:'var(--brand)'}[r.act] || 'var(--mute)';
    h += '<div class="hslog__row">';
    h += '<div class="hslog__hd"><span class="hslog__act" style="color:' + c + '">' + esc(r.actName) + '</span>';
    h += '<span class="hslog__day">' + esc(r.day) + '</span></div>';
    h += '<div class="hslog__topic">' + esc(r.topic) + '</div>';
    h += '<div class="hslog__meta">' + esc(r.advice) + '</div>';
    if(r.result){
      h += '<div class="hslog__res">📌 ' + esc(r.result) + (r.review ? '　—　' + esc(r.review) : '') + '</div>';
    } else {
      h += '<div class="hslog__todo">⏳ 待回填</div>';
    }
    h += '<div class="hslog__ops">';
    h += '<button class="lnk" onclick="hsFillResult(\'' + r.id + '\')">' + (r.result ? '改结果' : '回填结果') + '</button>';
    h += '<button class="lnk" onclick="hsLogDel(\'' + r.id + '\')">删除</button>';
    h += '</div></div>';
  });
  h += '</div>';
  host.innerHTML = h;
}

/* ---------- 动作层：可点击按钮（原来只是导出报告里的表格） ---------- */
function hsActHtml(d){
  var h = '<div class="hsact"><div class="hsact__ttl">选一个动作 · 记入热点台账</div><div class="hsact__row">';
  HS_ACTIONS.forEach(function(a){
    h += '<button class="btn hsact__btn" style="border-color:' + a.c + ';color:' + a.c + '" '
       + 'onclick="hsLogAdd(\'' + a.k + '\')">' + a.n + '</button>';
  });
  h += '</div>';
  h += '<div class="hsact__note">';
  h += '「继续追踪」不是逃避决定——它会带着复评条件留在台账里，到期提醒你回看。';
  h += '</div>';
  h += '<div class="hsact__out">';
  if(d.g1.lv !== 'red'){
    h += '<button class="btn" onclick="hotspotToPack(\'xhs\')">📦 开内容包生产</button>';
  } else {
    h += '<span class="hsact__ban">🛑 红线热点：不提供「开内容包」出口</span>';
  }
  h += '<button class="btn" onclick="hotspotToScan()">📝 送去内容工厂</button>';
  h += '</div></div>';
  return h;
}

/* ---------- 出口：一键开内容包，并带入热点语境 ---------- */
function hotspotToPack(id){
  var d = lastHotspot;
  if(!d){ toast('请先计算热点决策'); return; }
  if(typeof pkOpenModal !== 'function'){ toast('内容包模块未加载'); return; }
  var pid = id || 'xhs';
  try{
    if(typeof pkState === 'function'){
      var st = pkState();
      if(!st[pid]) st[pid] = {steps:[], ctx:{}};
      if(!st[pid].ctx) st[pid].ctx = {};
      var flds = (typeof PK_FIELDS !== 'undefined' && PK_FIELDS[pid]) || [];
      if(flds.length && !st[pid].ctx[flds[0].key]){
        st[pid].ctx[flds[0].key] = d.topic.slice(0, 40);
      }
      if(typeof save === 'function') save();
    }
  }catch(e){ /* 预填失败不影响开包 */ }
  pkOpenModal(pid);
  toast('已带入热点语境');
}
