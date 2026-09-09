/* ============================================================
 * 内容体检中心 —— 六维评分引擎（纯规则，不联网）
 * 维度：合规30 / 平台适配15 / 钩子15 / CTA10 / 可读性15 / 品牌一致性15
 * ============================================================ */
var HOOK_WORDS = ['竟然','原来','终于','别再','偷偷','绝了','真相','注意','为什么','怎么','千万别','后悔','居然','没想到','居然','一定要','救命','谁懂','破防','踩坑','实测','亲测','保姆级','吐血','划重点'];
var CTA_WORDS  = ['点击','关注','收藏','评论','私信','下单','领取','试试','快来','链接','了解','咨询','预约','扫码','加入','获取','抢','戳','看这里','mark','码住','蹲'];
var PF_FEATURES = {
  xhs:{n:'小红书', checks:[
    {re:/[\uD83C-\uDBFF][\uDC00-\uDFFF]|[\u2600-\u27BF]/, p:4, t:'含 emoji（平台强相关）'},
    {re:/\n\s*\n/, p:4, t:'有分段换行（利于阅读）'},
    {re:/#\S+/, p:4, t:'含话题标签 #'},
    {re:/^.{0,20}[！!?？]/m, p:3, t:'开头有情绪/疑问'}
  ]},
  dy:{n:'抖音', checks:[
    {re:/(你|大家|姐妹|兄弟|朋友们)/, p:5, t:'有对话感称呼'},
    {re:/[，,。！!？?]/, p:3, t:'口语化断句'},
    {re:/(第一|第二|第三|首先|然后|最后|记住|重点)/, p:4, t:'有结构提示词'},
    {re:/^.{0,15}[！!?？]/m, p:3, t:'前 3 秒有强钩子'}
  ]},
  wx:{n:'公众号', checks:[
    {re:/\n#{1,3}\s?\S+/, p:4, t:'有小标题结构'},
    {re:/\n\s*\n/, p:4, t:'有分段'},
    {re:/(我们|大家|读者|用户)/, p:3, t:'有读者视角'},
    {re:/(综上所述|总之|最后|希望|欢迎|期待)/, p:4, t:'有收尾'}
  ]},
  tb:{n:'电商详情页', checks:[
    {re:/\d/, p:4, t:'含具体数字/规格'},
    {re:/(材质|成分|规格|尺寸|容量|适用|保修|售后)/, p:5, t:'含参数信息'},
    {re:/(正品|保障|退换|包邮|现货)/, p:4, t:'含信任保障信息'},
    {re:/\n\s*\n/, p:2, t:'有分段'}
  ]},
  bili:{n:'B站', checks:[
    {re:/(大家好|我是|这期|本期|三连|投币|点赞)/, p:6, t:'有 UP 主语境'},
    {re:/\n\s*\n/, p:4, t:'有分段'},
    {re:/[！!?？]/, p:5, t:'有情绪表达'}
  ]},
  zhihu:{n:'知乎', checks:[
    {re:/(我的观点|首先|其次|最后|综上)/, p:5, t:'有论证结构'},
    {re:/(数据|研究|根据|来源|参考)/, p:5, t:'有依据意识'},
    {re:/\n\s*\n/, p:5, t:'有分段'}
  ]},
  weibo:{n:'微博', checks:[
    {re:/#\S+#/, p:5, t:'含话题 #…#'},
    {re:/[\uD83C-\uDBFF][\uDC00-\uDFFF]|[\u2600-\u27BF]/, p:4, t:'含 emoji'},
    {re:/(@\S+)/, p:3, t:'有 @ 互动'},
    {re:/[！!?？]/, p:3, t:'有情绪表达'}
  ]}
};

function scoreContent(txt, pfKey, hits){
  var L = txt || '';
  var dims = [];

  /* 1️⃣ 合规 30 分 */
  var cd = 30;
  cd -= (hits.red.length * 10);
  cd -= (hits.yellow.length * 3);
  cd -= (hits.blue.length * 2);
  if(cd < 0) cd = 0;
  var cdTip = hits.red.length
    ? '有 ' + hits.red.length + ' 个红线词必须处理'
    : (hits.yellow.length + hits.blue.length)
      ? '无红线，但 ' + (hits.yellow.length + hits.blue.length) + ' 处需核对证据'
      : '未命中风险词';
  dims.push({k:'compliance', n:'合规风险', icon:'⚖️', s:cd, max:30, tip:cdTip});

  /* 2️⃣ 平台适配 15 分 */
  var pfScore = 0, pfHits = [], pfMiss = [];
  var feat = PF_FEATURES[pfKey];
  if(feat){
    feat.checks.forEach(function(c){
      if(c.re.test(L)){ pfScore += c.p; pfHits.push(c.t); }
      else pfMiss.push(c.t);
    });
    if(pfScore > 15) pfScore = 15;
  } else {
    // 未指定平台：只做通用检查
    pfScore = 8;
    pfMiss.push('未指定平台，按通用标准评分');
  }
  dims.push({k:'platform', n:'平台适配', icon:'🧭', s:pfScore, max:15,
    tip: pfHits.length ? ('已具备：' + pfHits.slice(0,2).join('、')) : '缺少平台特征',
    detail: pfMiss.slice(0,3)});

  /* 3️⃣ 开头钩子 15 分 */
  var head = L.replace(/\s+/g,'').slice(0, 40);
  var hookScore = 0; var hookWhy = [];
  if(/\d/.test(head)){ hookScore += 5; hookWhy.push('含数字'); }
  if(/[?？]/.test(head)){ hookScore += 5; hookWhy.push('疑问句'); }
  var hasHookWord = HOOK_WORDS.some(function(w){ return head.indexOf(w) > -1; });
  if(hasHookWord){ hookScore += 5; hookWhy.push('钩子词'); }
  if(!head){ hookScore = 0; }
  var hookMiss = [];
  if(!/\d/.test(head)) hookMiss.push('开头加具体数字，如「3 个方法」「省了 200 元」');
  if(!/[?？]/.test(head)) hookMiss.push('用提问开场，如「为什么你涂了防晒还是黑？」');
  if(!hasHookWord) hookMiss.push('加钩子词：竟然 / 原来 / 千万别 / 实测 / 谁懂');
  dims.push({k:'hook', n:'开头钩子', icon:'🪝', s:hookScore, max:15,
    tip: hookScore ? ('开头' + hookWhy.join('+')) : '前 40 字缺少钩子',
    detail: hookMiss});

  /* 4️⃣ 行动号召 CTA 10 分 */
  var ctaScore = 0;
  var hasCta = CTA_WORDS.some(function(w){ return L.indexOf(w) > -1; });
  if(hasCta) ctaScore += 6;
  var tail = L.replace(/\s+/g,'').slice(-50);
  var tailCta = CTA_WORDS.some(function(w){ return tail.indexOf(w) > -1; });
  if(tailCta) ctaScore += 4;
  dims.push({k:'cta', n:'行动号召', icon:'📢', s:ctaScore, max:10,
    tip: ctaScore === 10 ? 'CTA 明确且在结尾' : (hasCta ? '有 CTA 但不在结尾，建议移到末段' : '缺少行动号召'),
    detail: ctaScore < 10 ? ['结尾加一句明确指令：收藏备用 / 评论区聊聊 / 私信领取'] : []});

  /* 5️⃣ 可读性 15 分 */
  var rd = 0, rdDetail = [];
  var sents = L.split(/[。！？!?\n]/).filter(function(s){ return s.trim().length; });
  var avgLen = sents.length ? (L.replace(/\s/g,'').length / sents.length) : 99;
  if(avgLen <= 25){ rd += 6; } else { rdDetail.push('平均句长 ' + Math.round(avgLen) + ' 字，建议拆短到 25 字内'); }
  var paras = L.split(/\n\s*\n/).filter(function(s){ return s.trim().length; });
  if(paras.length >= 3){ rd += 5; } else { rdDetail.push('段落偏少，建议拆成 3 段以上'); }
  if(/(^|\n)\s*(\d+[.、)]|[-*·]|#{1,3}\s)/m.test(L)){ rd += 4; }
  else { rdDetail.push('建议加小标题或编号列表'); }
  dims.push({k:'read', n:'可读性', icon:'📖', s:rd, max:15,
    tip: rd >= 12 ? '结构清晰' : '还有优化空间', detail: rdDetail});

  /* 6️⃣ 品牌一致性 15 分 */
  var bd = 0, bdDetail = [];
  var b = readBrand();
  var filled = b.name || b.cat || b.aud || b.usp;
  if(!filled){
    bd = 10;
    bdDetail.push('未填写品牌记忆，本项按默认分计。填后可评估「卖点/人群是否体现」');
  } else {
    if(b.usp){
      var uspWords = b.usp.split(/[,，、;；\s]+/).filter(function(w){ return w.length >= 2; });
      var hitUsp = uspWords.some(function(w){ return L.indexOf(w) > -1; });
      if(hitUsp) bd += 5; else bdDetail.push('核心卖点「' + b.usp + '」未在文中体现');
    } else bd += 3;
    if(b.aud){
      var audWords = b.aud.split(/[,，、;；\s]+/).filter(function(w){ return w.length >= 2; });
      var hitAud = audWords.some(function(w){ return L.indexOf(w) > -1; });
      if(hitAud) bd += 3; else bdDetail.push('目标人群相关表述偏弱');
    } else bd += 2;
    if(b.name && L.indexOf(b.name) > -1) bd += 3;
    else if(b.name) bdDetail.push('正文未出现品牌名「' + b.name + '」');
    var banWords = brandBanList();
    var banHit = banWords.filter(function(w){ return L.indexOf(w.t) > -1; });
    var banTip = '';
    if(banHit.length){
      banTip = '⚠️ 出现品牌禁用词：' + banHit.map(function(x){return x.t;}).join('、');
      bdDetail.push('删除或替换：' + banHit.map(function(x){return x.t;}).join('、'));
    }
    else bd += 4;
    var _bdTip = banTip || (bd >= 12 ? '与品牌设定吻合' : '与品牌记忆有出入');
    window.__banTip = banTip;
  }
  if(bd > 15) bd = 15;
  var brandTip = (typeof window !== 'undefined' && window.__banTip) ? window.__banTip : (bd >= 12 ? '与品牌设定吻合' : '与品牌记忆有出入');
  window.__banTip = '';
  dims.push({k:'brand', n:'品牌一致性', icon:'🎯', s:bd, max:15,
    tip: brandTip, detail: bdDetail});

  var total = dims.reduce(function(a,d){ return a + d.s; }, 0);
  var grade = total >= 90 ? 'A' : total >= 80 ? 'B' : total >= 70 ? 'C' : total >= 60 ? 'D' : 'E';
  var gradeMsg = {A:'可直接发布', B:'小改即可发布', C:'建议优化后再发', D:'需要较大修改', E:'建议重写'}[grade];
  return {dims:dims, total:total, grade:grade, gradeMsg:gradeMsg};
}

/* ---------- 评分沉淀 ---------- */
function pushScore(rec){
  state.scores = state.scores || [];
  state.scores.push(rec);
  if(state.scores.length > 100) state.scores = state.scores.slice(-100);
  save();
  renderScoreTrend();
}
function renderScoreTrend(){
  var host = $('#scoreTrend'); if(!host) return;
  var sc = state.scores || [];
  var cnt = $('#scoreCount');
  if(cnt) cnt.textContent = sc.length ? ('共 ' + sc.length + ' 次') : '暂无记录';
  if(!sc.length){
    host.innerHTML = '<p class="hint">每次体检会自动记录评分，改完再测就能看到进步。<br>数据存在本地，越用越准。</p>';
    return;
  }
  var last = sc[sc.length-1];
  var prev = sc.length > 1 ? sc[sc.length-2] : null;
  var delta = prev ? (last.total - prev.total) : 0;
  var dcls = delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat';
  var dtxt = prev ? (delta > 0 ? ('↑ +' + delta) : delta < 0 ? ('↓ ' + delta) : '持平') : '首次';

  var recent = sc.slice(-12);
  var maxS = Math.max.apply(null, recent.map(function(x){ return x.total; }));
  if(maxS < 1) maxS = 1;

  var h = '';
  h += '<div style="display:flex;align-items:baseline;gap:10px;margin-bottom:2px">';
  h += '<span class="grade grade--' + last.grade + '">' + last.total + '</span>';
  h += '<span style="font-size:12px;color:var(--soft)">' + last.grade + ' 级 · ' + last.gradeMsg + '</span>';
  h += '<span class="scoredelta ' + dcls + '" style="margin-left:auto">' + dtxt + '</span>';
  h += '</div>';
  h += '<div class="trendrow">';
  recent.forEach(function(x, i){
    var hh = Math.max(4, Math.round(x.total / 100 * 52));
    var isLast = (i === recent.length - 1);
    h += '<div class="trendbar' + (isLast ? ' trendbar--last' : '') + '" style="height:' + hh + 'px;opacity:' + (0.45 + 0.55*(x.total/100)).toFixed(2) + '" title="' + x.total + '分 · ' + x.grade + ' · ' + x.d + '"></div>';
  });
  h += '</div>';
  h += '<div class="trendmeta"><span>' + (recent[0].total) + ' 分起</span><span>最近 ' + recent.length + ' 次</span></div>';
  host.innerHTML = h;
}
function showScoreHistory(){
  var sc = state.scores || [];
  var out = '# 内容体检记录\n\n';
  if(!sc.length){ out += '暂无记录。先在内容工厂生成内容并点「🩺 内容体检」。'; }
  else {
    out += '共 ' + sc.length + ' 条，最新在前。\n\n';
    sc.slice().reverse().slice(0, 30).forEach(function(x, i){
      out += '### ' + (i+1) + '. ' + x.total + ' 分（' + x.grade + ' 级 · ' + x.gradeMsg + '）\n';
      out += '- 时间：' + x.d + '\n';
      out += '- 平台：' + (x.platform || '未指定') + '\n';
      out += '- 标题：' + (x.title || '—') + '\n';
      out += '- 分项：' + x.dims.map(function(d){ return d.icon + d.n + ' ' + d.s + '/' + d.max; }).join(' ｜ ') + '\n';
      var weak = x.dims.filter(function(d){ return d.s / d.max < 0.7; });
      if(weak.length) out += '- 待改进：' + weak.map(function(d){ return d.n; }).join('、') + '\n';
      out += '\n';
    });
    var first = sc[0].total, last = sc[sc.length-1].total;
    out += '---\n\n**整体变化**：' + first + ' 分 → ' + last + ' 分（' + (last-first >= 0 ? '+' : '') + (last-first) + '）\n\n';
    out += '💡 这些记录只存在你本地浏览器，是「内容质量进步曲线」。';
  }
  setPreview(out);
}

function scanWords(){
  var txt = $('#preview').textContent;
  // 如果当前预览已经是体检报告，则回到原始文本重新扫，避免扫描报告自身
  if(isReport(txt)){
    if(lastScanSrc){ txt = lastScanSrc; } else { toast('请先生成内容再做体检'); return; }
  }
  if(!txt || txt.indexOf('请填写字段') > -1){ toast('请先生成内容再做体检'); return; }
  lastScanSrc = txt;   // 记住原文，使重复扫描 / 切换平台重扫结果稳定

  /* 平台维度过滤：决定叠加哪一套 🔵 平台规则 */
  var sel = $('#c_scanpf');
  var pfSel = sel ? sel.value : '__all__';
  var pfKey, pfName;
  if(pfSel === '__follow__'){
    var pEl = $('#c_platform');
    pfKey = PLATFORM_MAP[pEl ? pEl.value : ''] || null;
    pfName = (pEl ? pEl.value : '') || '未指定';
  } else if(pfSel === '__all__'){
    pfKey = null; pfName = '全部平台';
  } else {
    pfKey = pfSel; pfName = PLATFORM_LABEL[pfSel] || pfSel;
  }

  var uw = userWords();
  var bb = brandBanList();
  var all = WORD_RULES.concat(uw.red, uw.yellow, uw.blue, bb);
  var seen = {}, hits = {red:[], yellow:[], blue:[]};
  var skipped = 0;
  all.forEach(function(r){
    // 🔴🟡 法律类规则全平台生效；🔵 平台规则只在命中当前平台时叠加
    if(r.lv === 'blue' && r.pf && pfKey && r.pf.indexOf(pfKey) === -1){ skipped++; return; }
    if(seen[r.t]) return;
    if(txt.indexOf(r.t) > -1){ seen[r.t] = 1; hits[r.lv].push(r); }
  });

  var total = hits.red.length + hits.yellow.length + hits.blue.length;

  /* ===== 六维评分 ===== */
  var sc = scoreContent(txt, pfKey, hits);
  var out = '## 🩺 内容体检报告\n\n';
  out += '### 综合得分 ' + sc.total + ' / 100　（' + sc.grade + ' 级 · ' + sc.gradeMsg + '）\n\n';
  sc.dims.forEach(function(d){
    var blocks = Math.round(d.s / d.max * 10);
    var bar = '█'.repeat(blocks) + '░'.repeat(10 - blocks);
    out += '- ' + d.icon + ' **' + d.n + '　' + d.s + '/' + d.max + '**　`' + bar + '`　' + d.tip + '\n';
  });
  out += '\n';

  // 优先改进项
  var weak = sc.dims.filter(function(d){ return d.s / d.max < 0.7; })
                    .sort(function(a,b){ return (a.s/a.max) - (b.s/b.max); });
  if(weak.length){
    out += '### ⚡ 优先改进（' + weak.length + ' 项）\n\n';
    weak.forEach(function(d, i){
      out += '**' + (i+1) + '. ' + d.icon + ' ' + d.n + '**（' + d.s + '/' + d.max + '）\n';
      if(d.detail && d.detail.length){
        d.detail.forEach(function(t){ out += '- ' + t + '\n'; });
      } else {
        out += '- ' + d.tip + '\n';
      }
      out += '\n';
    });
  }
  out += '---\n\n';
  out += '**体检平台：' + pfName + '** ｜ 🔴🟡 法律规则全平台生效，🔵 平台规则按渠道叠加\n';
  out += pfKey ? '（仅叠加「' + (PLATFORM_LABEL[pfKey]||pfKey) + '」的平台敏感词）\n'
               : '（已叠加全部平台的敏感词，最严格）\n';
  out += '\n';
  out += '### ⚖️ 合规明细\n\n';

  if(total){
    out += '共命中 ' + total + ' 处（🔴 红线 ' + hits.red.length +
           ' · 🟡 风险 ' + hits.yellow.length + ' · 🔵 平台 ' + hits.blue.length + '）\n\n';

    if(hits.red.length){
      out += '#### 🔴 红线词（建议删除或改为可证限定）\n\n';
      hits.red.forEach(function(r){
        out += '- **' + r.t + '**\n';
        out += '  - 风险：' + r.why + '\n';
        out += '  - 建议改为：' + r.fix + '\n';
        out += '  - 依据：' + r.law + '\n';
      });
      out += '\n';
    }
    if(hits.yellow.length){
      out += '#### 🟡 风险词（有真实依据则可用，无需删除）\n\n';
      hits.yellow.forEach(function(r){
        out += '- **' + r.t + '** —— ' + r.why + '\n';
        out += '  - 合规写法：' + r.fix + '\n';
      });
      out += '\n';
    }
    if(hits.blue.length){
      out += '#### 🔵 平台敏感词（法律上未必禁止，但可能限流/下架）\n\n';
      hits.blue.forEach(function(r){
        out += '- **' + r.t + '** —— ' + r.why + '\n';
        out += '  - 建议：' + r.fix + '\n';
      });
      out += '\n';
    }

    // 误判提醒
    var fp = [];
    FALSE_POSITIVE_HINT.forEach(function(f){
      if(txt.indexOf(f.t) > -1) fp.push(f);
    });
    if(fp.length){
      out += '#### ⚠️ 避免过度拦截\n\n以下词可能是误判，请结合语境判断：\n\n';
      fp.forEach(function(f){ out += '- 「' + f.t + '」：' + f.msg + '\n'; });
      out += '\n';
    }
  } else {
    out += '✅ 未命中词库中的风险词。\n\n';
  }

  /* ===== 品牌调性约束：由「品牌内核」驱动，同一句文案不同品牌结论不同 ===== */
  var tcr = null;
  try{
    tcr = tcAnalyze(txt);
    if(tcr) out += tcReport(tcr);
  }catch(e){
    /* 品牌内核未就绪时静默跳过，不影响主体检流程 */
  }

  out += '---\n\n';
  out += '**重要说明**\n\n';
  out += '1. 本工具是「审核决策库」，不是黑名单。**命中 ≠ 违法**。\n';
  out += '2. 🟡 风险词的合法性取决于证据：有机要有认证、限时要有真实起止时间、100% 要说明检测对象与方法。\n';
  out += '3. 依据 2023 年《广告绝对化用语执法指南》，企业内部比较、表达经营理念、有明确限定的销量事实等情形可分流处理。\n';
  out += '4. 内置词库 ' + WORD_RULES.length + ' 条，来源为《广告法》《广告绝对化用语执法指南》《化妆品标签管理办法》《药品广告审查发布标准》及平台公开规则。\n';
  out += '5. 平台规则更新频繁，发布前请以各平台最新规则中心为准。\n';
  out += '6. 🔵 平台敏感词仅为「运营风险提示」，不代表违法；不同平台规则差异大，切换「体检平台」结果会不同。\n\n';
  out += '> ⚠️ 本工具仅作辅助参考，不构成法律意见。正式发布前请人工复核。\n\n';
  out += '💡 想增删词条？去「📚 品牌知识库 → 违禁词库」，用 `## 红线词` / `## 风险词` / `## 平台敏感词` 分节编辑即可，扫描时会自动合并。\n\n';
  out += '💡 想看别的平台结果？改上面「体检平台」再扫一次。\n\n💡 觉得判错了？点旁边的「🚩 报告误报」告诉我们 —— 每一条反馈都会让词库更准。';

  lastScan = {txt:txt, pfName:pfName, pfKey:pfKey, hits:hits, score:sc};
  setPreview(out);
  pushScore({
    d: new Date().toLocaleString('zh-CN'),
    total: sc.total, grade: sc.grade, gradeMsg: sc.gradeMsg,
    platform: pfName,
    title: ($('#c_title') && $('#c_title').value) ? $('#c_title').value : '',
    dims: sc.dims
  });
  toast('体检得分 ' + sc.total + ' 分（' + sc.grade + ' 级）' +
        (tcr ? '　·　调性 ' + tcr.score + '/25' : ''));
  pushHistory('内容体检 · ' + sc.total + ' 分' + (tcr ? ' · 调性 ' + tcr.score : ''), out);
}

function expand(){
  var txt = $('#preview').textContent;
  if(!txt || txt.indexOf('请填写字段') > -1){ toast('请先生成内容再扩写'); return; }
  var out = '以下是一份待优化的营销内容，请你从三个维度改进它：\n\n';
  out += '1. **更有钩子**：重写开头，让前 3 秒抓住注意力\n';
  out += '2. **更可信**：补充具体数据、场景或证据，替换空泛表述\n';
  out += '3. **更能转化**：强化行动号召，降低用户决策成本\n\n';
  out += '---\n\n原文：\n\n' + txt + '\n\n---\n\n';
  out += '请输出改进后的完整版本，并在末尾用表格列出你做了哪些修改及原因。';
  setPreview(out); toast('已生成扩写指令');
}
