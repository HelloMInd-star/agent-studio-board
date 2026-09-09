/* ============================================================
 * 热点决策 —— 这个热点该不该跟
 * 说明：不做"事实核查"（那需要联网权威数据源 + 要对结论负责）
 *       做"跟进决策"（确定性打分，纯前端可完成）
 * 营销翻车 90% 不是因为热点是假的，而是热点是真的但不该跟
 * ============================================================ */

/* ---------- 五维打分定义 ---------- */
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

/* ---------- 敏感话题清单（用于风险预警，非违禁词） ---------- */
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

/* ---------- 核心计算 ---------- */
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

  var dims = HS_DIMS.map(function(d){
    var v = clamp(get(d.k), 1, 5);
    var ratio = (v - 1) / 4;                 // 1-5 映射到 0-1
    var score = Math.round(ratio * d.max);
    return {k:d.k, n:d.n, icon:d.icon, raw:v, s:score, max:d.max};
  });

  var total = dims.reduce(function(a,d){ return a + d.s; }, 0);

  /* 敏感话题识别 */
  var risks = [];
  HS_RISK_TOPICS.forEach(function(t){
    var hit = [];
    t.w.forEach(function(w){ if(topic.indexOf(w) > -1) hit.push(w); });
    if(hit.length) risks.push({k:t.k, n:t.n, lv:t.lv, tip:t.tip, hit:hit});
  });

  /* 风险一票否决：高危话题且风险维度自评 >=4，直接降级 */
  var riskDim = dims.filter(function(d){ return d.k === 'risk'; })[0];
  var hasHigh = risks.filter(function(r){ return r.lv === 'high'; }).length > 0;
  var vetoed = false;
  if(hasHigh && riskDim.raw >= 4){
    // 用户认为安全但文本含高危词 —— 提示矛盾，并强制降级
    vetoed = true;
    total = Math.min(total, 45);
  }

  /* 建议四档 */
  var advice, adviceKey, color;
  if(hasHigh){
    adviceKey = 'stop';
    advice = '🛑 不建议跟进';
    color = '#b91c1c';
  } else if(total >= 70){
    adviceKey = 'go';
    advice = '🟢 果断跟进';
    color = '#047857';
  } else if(total >= 50){
    adviceKey = 'careful';
    advice = '🟡 谨慎跟进（建议换角度）';
    color = '#b45309';
  } else {
    adviceKey = 'no';
    advice = '⚪ 不建议投入资源';
    color = '#64748b';
  }
  if(vetoed && adviceKey !== 'stop'){
    advice = '🟠 文本含高危话题，建议重新评估';
    color = '#c2410c';
  }

  /* 跟进角度建议 */
  var angles = [];
  var relD  = dims.filter(function(d){ return d.k === 'rel'; })[0];
  var fitD  = dims.filter(function(d){ return d.k === 'fit'; })[0];
  var valD  = dims.filter(function(d){ return d.k === 'value'; })[0];
  var timeD = dims.filter(function(d){ return d.k === 'time'; })[0];

  if(hasHigh){
    angles.push('若必须发声，只做公益/关怀表达，**全程不提产品与购买链接**');
    angles.push('或选择完全不参与，等舆论平息');
  } else {
    if(relD.raw <= 2) angles.push('相关性偏低 → 不要硬蹭，可只取热点中的某个**情绪或场景**做软关联');
    if(fitD.raw <= 2) angles.push('品牌契合度低 → 换更中性的表达，避免强行玩梗');
    if(timeD.raw <= 2) angles.push('时效性差 → 放弃追首发，改做**长尾复盘/科普**角度');
    if(valD.raw <= 2) angles.push('转化潜力低 → 控制投入，当作品牌曝光而非带货');
    if(timeD.raw >= 4 && relD.raw >= 4) angles.push('时效与相关性双高 → **优先快发**，抢占首发窗口');
    if(valD.raw >= 4) angles.push('转化潜力高 → 配明确 CTA 与落地页，别浪费流量');
    if(!angles.length) angles.push('各项均衡 → 按常规内容流程执行，发布前务必过一遍内容体检');
  }

  return {
    topic:topic, way:way, brand:brand,
    dims:dims, total:total, max:100,
    risks:risks, hasHigh:hasHigh, vetoed:vetoed,
    advice:advice, adviceKey:adviceKey, color:color,
    angles:angles
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
  out.push('## 一、决策结论');
  out.push('');
  out.push('> # ' + d.advice);
  out.push('>');
  out.push('> 综合得分 **' + d.total + ' / 100**');
  out.push('');
  out.push('## 二、五维评分明细');
  out.push('');
  out.push('| 维度 | 自评 | 得分 | 说明 |');
  out.push('|---|---|---|---|');
  d.dims.forEach(function(x){
    var def = HS_DIMS.filter(function(y){ return y.k === x.k; })[0];
    out.push('| ' + x.icon + ' ' + x.n + ' | ' + x.raw + ' / 5 | **' + x.s + ' / ' + x.max +
             '** | ' + def.q + ' |');
  });
  out.push('');

  if(d.risks.length){
    out.push('## 三、⚠️ 风险话题识别');
    out.push('');
    d.risks.forEach(function(r){
      var lv = r.lv === 'high' ? '🔴 高危' : '🟡 中危';
      out.push('### ' + lv + '　' + r.n);
      out.push('');
      out.push('- 命中词：' + r.hit.join('、'));
      out.push('- **建议**：' + r.tip);
      out.push('');
    });
    if(d.vetoed){
      out.push('> ⚠️ **注意**：你给风险维度打了 ' +
        d.dims.filter(function(x){ return x.k === 'risk'; })[0].raw +
        ' 分（偏安全），但热点描述中包含高危话题词。请重新确认——是否已排除上述情况？');
      out.push('');
    }
  }

  out.push('## ' + (d.risks.length ? '四' : '三') + '、跟进角度建议');
  out.push('');
  d.angles.forEach(function(a, i){ out.push((i+1) + '. ' + a); });
  out.push('');
  out.push('---');
  out.push('');
  out.push('### 下一步');
  out.push('');
  out.push('- 把写好的跟进文案贴进「📝 内容工厂」，点「🩺 内容体检」查合规与质量');
  out.push('- 高热点内容尤其要查**违禁词**——流量越大，翻车代价越高');
  out.push('');
  out.push('*本工具做「该不该跟」的决策辅助，不做事实核查。热点真伪请自行通过权威渠道核实。*');

  if(host) host.innerHTML = mdLite(out.join('\n'));

  // 结论徽章
  var badge = $('#hsBadge');
  if(badge){
    badge.textContent = d.advice + '　' + d.total + ' 分';
    badge.style.color = d.color;
    badge.style.borderColor = d.color;
  }
}

/* ---------- 一键送去体检 ---------- */
function hotspotToScan(){
  if(!lastHotspot){ toast('请先计算热点决策'); return; }
  var d = lastHotspot;
  switchTab('content');

  // 内容工厂用「标题 + 额外要求」驱动生成，把热点语境填进这两处
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
    lines.push('决策结论：' + d.advice + '（' + d.total + '/100）');
    d.angles.forEach(function(a){ lines.push('· ' + a.replace(/\*\*/g, '')); });
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
  out.push('## 结论：' + d.advice + '（' + d.total + '/100）');
  out.push('');
  out.push('| 维度 | 自评 | 得分 |');
  out.push('|---|---|---|');
  d.dims.forEach(function(x){
    out.push('| ' + x.n + ' | ' + x.raw + '/5 | ' + x.s + '/' + x.max + ' |');
  });
  out.push('');
  if(d.risks.length){
    out.push('## 风险识别');
    out.push('');
    d.risks.forEach(function(r){
      out.push('- **' + (r.lv === 'high' ? '🔴 高危' : '🟡 中危') + ' ' + r.n + '**：' + r.tip);
    });
    out.push('');
  }
  out.push('## 跟进角度建议');
  out.push('');
  d.angles.forEach(function(a, i){ out.push((i+1) + '. ' + a); });
  out.push('');
  out.push('---');
  out.push('');
  out.push('*决策辅助工具，不做事实核查。热点真伪请通过权威渠道核实。*');
  downloadFile('热点决策_' + ymd(new Date()) + '.md', out.join('\n'), 'text/markdown');
}
