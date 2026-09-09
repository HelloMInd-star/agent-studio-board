/* ============================================================
 * 方案合成 —— 跨模块聚合，生成整合营销方案
 * 借 MindArena #6「综合决策报告」的架构思路：
 *   多源采集 → 智能聚合 → 缺口诊断 → 一份可交付报告
 * 但不用它的技术（Three.js 会破坏零依赖与不联网）
 * ============================================================ */

/* ---------- 数据源采集 ---------- */
function collectSources(){
  var S = [];

  /* 1. 品牌记忆 */
  var b = state.brand || {};
  var brandFilled = !!(b.name || b.cat || b.aud || b.usp || b.ban);
  S.push({k:'brand', n:'品牌记忆', icon:'🎯', filled:brandFilled,
    hint:'左栏「🎯 品牌记忆」',
    data:brandFilled ? {name:b.name, cat:b.cat, aud:b.aud, usp:b.usp, ban:b.ban} : null});

  /* 2. STP 市场选择（读表单实时计算） */
  var stp = null;
  try{ if($('#st_rows') && $('#st_rows').value.trim()) stp = calcStp(); }catch(e){}
  S.push({k:'stp', n:'STP 市场选择', icon:'🎯', filled:!!stp,
    hint:'策略 → 🧮 计算模式 → STP',
    data:stp ? {ranked:stp.ranked.map(function(r){
      return {name:r.name, at:r.at, cp:r.cp, size:r.size, score:r.score, act:r.act};
    })} : null});

  /* 3. 竞品矩阵（读表单实时计算） */
  var comp = null;
  try{ if($('#cp_dims') && $('#cp_dims').value.trim()) comp = calcComp(); }catch(e){}
  S.push({k:'comp', n:'竞品对比矩阵', icon:'⚔️', filled:!!comp,
    hint:'策略 → 🧮 计算模式 → 竞品',
    data:comp ? {
      dims:comp.dims.map(function(d){ return d.name; }),
      scored:comp.scored.map(function(s){ return {name:s.name, total:+s.total.toFixed(2)}; }),
      me:comp.me ? comp.me.name : '',
      opps:comp.opps, threats:comp.threats
    } : null});

  /* 4. 内容体检 */
  var sc = state.scores || [];
  var last = sc.length ? sc[sc.length-1] : null;
  S.push({k:'score', n:'内容体检', icon:'🩺', filled:sc.length > 0,
    hint:'内容工厂 → 🩺 内容体检',
    data:sc.length ? {
      count:sc.length,
      last: last ? {total:last.total, grade:last.grade} : null,
      trend: sc.length > 1 ? (last.total - sc[0].total) : 0,
      first: sc[0] ? sc[0].total : 0
    } : null});

  /* 5. 营销日历 */
  var evs = (state.cal && state.cal.events) || [];
  var overdue = evs.filter(function(e){
    if(e.status === 'done') return false;
    var d = new Date(e.date + 'T00:00:00');
    return !isNaN(d) && d < today0();
  });
  var doneN = evs.filter(function(e){ return e.status === 'done'; }).length;
  S.push({k:'cal', n:'营销日历', icon:'📅', filled:evs.length > 0,
    hint:'📅 营销日历',
    data:evs.length ? {
      total:evs.length, done:doneN, overdue:overdue.length,
      events:evs.slice().sort(function(a,b2){ return a.date < b2.date ? -1 : 1; })
              .slice(0,10).map(function(e){
        return {title:e.title, date:e.date, pri:e.pri, status:e.status};
      })
    } : null});

  /* 6. 知识库 */
  var fds = (state.kb && state.kb.folders) || [];
  var docN = fds.reduce(function(a,f){ return a + (f.docs ? f.docs.length : 0); }, 0);
  S.push({k:'kb', n:'品牌知识库', icon:'📚', filled:docN > 0,
    hint:'📚 品牌知识库',
    data:docN > 0 ? {
      total:docN,
      folders:fds.map(function(f){ return {name:f.name, n:f.docs ? f.docs.length : 0}; })
                  .filter(function(f){ return f.n > 0; })
    } : null});

  /* 7. 工作流 */
  var steps = (state.flow && state.flow.steps) || [];
  S.push({k:'flow', n:'工作流编排', icon:'🔗', filled:steps.length > 0,
    hint:'🔗 工作流',
    data:steps.length ? {
      n:steps.length, goal:state.flow.goal || '',
      vars:steps.map(function(s){ return s.out; }).filter(Boolean)
    } : null});

  /* 8. Agent 工作台文档块 */
  var bs = state.blocks || [];
  S.push({k:'blocks', n:'工作台产出', icon:'💬', filled:bs.length > 0,
    hint:'💬 Agent 工作台',
    data:bs.length ? {
      n:bs.length,
      kinds:bs.reduce(function(a,x){ a[x.kind] = (a[x.kind]||0) + 1; return a; }, {})
    } : null});

  return S;
}

/* ---------- 报告生成 ---------- */
var SYNTH_SECTIONS = [
  {k:'summary',  n:'执行摘要',   on:true},
  {k:'brand',    n:'品牌语境',   on:true},
  {k:'market',   n:'市场选择',   on:true},
  {k:'compete',  n:'竞争格局',   on:true},
  {k:'content',  n:'内容现状',   on:true},
  {k:'schedule', n:'执行排期',   on:true},
  {k:'asset',    n:'知识沉淀',   on:true},
  {k:'gap',      n:'缺口诊断',   on:true}
];

function buildPlan(sections){
  sections = sections || SYNTH_SECTIONS.filter(function(s){ return s.on; })
                                        .map(function(s){ return s.k; });
  var S = collectSources();
  var map = {};
  S.forEach(function(x){ map[x.k] = x; });

  var out = [];
  out.push('# 整合营销方案');
  out.push('');
  out.push('> 由 Y.Mine 营销 AI 工作台自动聚合生成 · ' + new Date().toLocaleString('zh-CN'));
  out.push('>');
  out.push('> 数据来源：' + S.filter(function(x){ return x.filled; }).length +
           ' / ' + S.length + ' 个模块。所有数据本地生成，未上传。');
  out.push('');
  out.push('---');
  out.push('');

  /* 1. 执行摘要 */
  if(sections.indexOf('summary') > -1){
    out.push('## 一、执行摘要');
    out.push('');
    var lines = [];
    if(map.brand && map.brand.filled){
      var bd = map.brand.data;
      lines.push('**' + (bd.name || '未命名品牌') + '**' +
        (bd.cat ? '（' + bd.cat + '）' : '') +
        (bd.aud ? ' 面向 ' + bd.aud : '') +
        (bd.usp ? '，核心卖点为「' + bd.usp + '」' : '') + '。');
    }
    if(map.stp && map.stp.filled){
      var top = map.stp.data.ranked[0];
      lines.push('市场优先级排序中，**' + top.name + '** 以 ' + top.score +
                 ' 分居首，建议' + String(top.act).replace(/^[^\s]+\s/, '') + '。');
    }
    if(map.comp && map.comp.filled){
      var cd = map.comp.data;
      var myRank = 0;
      cd.scored.forEach(function(s, i){ if(s.name === cd.me) myRank = i + 1; });
      lines.push('竞品加权排名中，我方（' + cd.me + '）位列 **第 ' + myRank + ' / ' +
                 cd.scored.length + '**' +
                 (cd.opps.length ? '，识别 **' + cd.opps.length + ' 个机会点**' : '') +
                 (cd.threats.length ? '、' + cd.threats.length + ' 个威胁点' : '') + '。');
    }
    if(map.score && map.score.filled){
      var sd = map.score.data;
      lines.push('内容体检累计 ' + sd.count + ' 次，最近得分 **' + sd.last.total +
                 '/100（' + sd.last.grade + ' 级）**' +
                 (sd.trend > 0 ? '，较首次提升 ' + sd.trend + ' 分' :
                  sd.trend < 0 ? '，较首次下降 ' + Math.abs(sd.trend) + ' 分' : '') + '。');
    }
    if(map.cal && map.cal.filled){
      var cdd = map.cal.data;
      lines.push('营销日历共 ' + cdd.total + ' 个事件，已完成 ' + cdd.done +
                 (cdd.overdue ? '，**' + cdd.overdue + ' 项逾期**' : '，无逾期') + '。');
    }
    if(!lines.length) lines.push('（暂无已填写的模块数据，请先在对应模块填写后再生成）');
    lines.forEach(function(l){ out.push('- ' + l); });
    out.push('');
  }

  /* 2. 品牌语境 */
  if(sections.indexOf('brand') > -1){
    out.push('## 二、品牌语境');
    out.push('');
    if(map.brand && map.brand.filled){
      var b2 = map.brand.data;
      out.push('| 项目 | 内容 |');
      out.push('|---|---|');
      out.push('| 品牌名称 | ' + (b2.name || '—') + ' |');
      out.push('| 所属品类 | ' + (b2.cat || '—') + ' |');
      out.push('| 目标人群 | ' + (b2.aud || '—') + ' |');
      out.push('| 核心卖点 | ' + (b2.usp || '—') + ' |');
      out.push('| 禁用词 | ' + (b2.ban || '—') + ' |');
    } else {
      out.push('⚠️ 未填写。建议在左栏「🎯 品牌记忆」补充，它会注入每次生成与评分。');
    }
    out.push('');
  }

  /* 3. 市场选择 */
  if(sections.indexOf('market') > -1){
    out.push('## 三、市场选择（STP）');
    out.push('');
    if(map.stp && map.stp.filled){
      out.push('| 排名 | 细分市场 | 吸引力 | 竞争力 | 规模 | 优先级 | 建议 |');
      out.push('|---|---|---|---|---|---|---|');
      map.stp.data.ranked.forEach(function(r, i){
        out.push('| ' + (i+1) + ' | ' + r.name + ' | ' + r.at + ' | ' + r.cp +
                 ' | ' + r.size + ' | **' + r.score + '** | ' + r.act + ' |');
      });
      out.push('');
      out.push('> 优先级 =（吸引力×0.5 + 竞争力×0.5）× 规模权重，规模取对数避免大市场压倒一切。');
    } else {
      out.push('⚠️ 未填写。建议在「策略 → 🧮 计算模式 → STP 市场选择」录入细分市场。');
    }
    out.push('');
  }

  /* 4. 竞争格局 */
  if(sections.indexOf('compete') > -1){
    out.push('## 四、竞争格局');
    out.push('');
    if(map.comp && map.comp.filled){
      var c2 = map.comp.data;
      out.push('### 加权总分排名');
      out.push('');
      out.push('| 排名 | 对象 | 加权总分 |');
      out.push('|---|---|---|');
      c2.scored.forEach(function(s, i){
        var nm = (s.name === c2.me) ? '**' + s.name + '（我方）**' : s.name;
        out.push('| ' + (i+1) + ' | ' + nm + ' | ' + s.total + ' |');
      });
      out.push('');
      if(c2.opps.length){
        out.push('### 🔥 机会点');
        out.push('');
        c2.opps.forEach(function(o){
          out.push('- **' + o.dim + '**（权重 ' + o.w + '）：我方 ' + o.my +
                   ' 分，竞品均分 ' + o.avg + ' 分 → 可作为差异化切口');
        });
        out.push('');
      }
      if(c2.threats.length){
        out.push('### ⚠️ 威胁点');
        out.push('');
        c2.threats.forEach(function(t){
          out.push('- **' + t.dim + '**（权重 ' + t.w + '）：我方仅 ' + t.my +
                   ' 分，最强对手 ' + t.best + ' 分 → 存在被打风险');
        });
        out.push('');
      }
      if(!c2.opps.length && !c2.threats.length){
        out.push('未识别出显著机会点或威胁点（判定规则：机会点=我方≥4 且竞品均分≤3；威胁点=我方≤2 且最强对手≥4）。');
        out.push('');
      }
    } else {
      out.push('⚠️ 未填写。建议在「策略 → 🧮 计算模式 → 竞品对比矩阵」录入打分。');
      out.push('');
    }
  }

  /* 5. 内容现状 */
  if(sections.indexOf('content') > -1){
    out.push('## 五、内容现状');
    out.push('');
    if(map.score && map.score.filled){
      var s2 = map.score.data;
      out.push('- 累计体检：**' + s2.count + ' 次**');
      out.push('- 首次得分：' + s2.first);
      out.push('- 最近得分：**' + s2.last.total + ' / 100（' + s2.last.grade + ' 级）**');
      out.push('- 整体变化：' + (s2.trend > 0 ? '↑ +' + s2.trend :
                                s2.trend < 0 ? '↓ ' + s2.trend : '持平'));
    } else {
      out.push('⚠️ 暂无体检记录。建议在「内容工厂」生成文案后点「🩺 内容体检」。');
    }
    out.push('');
  }

  /* 6. 执行排期 */
  if(sections.indexOf('schedule') > -1){
    out.push('## 六、执行排期');
    out.push('');
    if(map.cal && map.cal.filled){
      var ST = {todo:'待开始', doing:'进行中', done:'已完成', delayed:'已延期'};
      var c3 = map.cal.data;
      out.push('| 日期 | 事件 | 优先级 | 状态 |');
      out.push('|---|---|---|---|');
      var PR = {high:'高', mid:'中', low:'低'};
      c3.events.forEach(function(e){
        out.push('| ' + e.date + ' | ' + e.title + ' | ' + (PR[e.pri]||'中') +
                 ' | ' + (ST[e.status]||'待开始') + ' |');
      });
      out.push('');
      out.push('共 ' + c3.total + ' 个事件，已完成 ' + c3.done +
               (c3.overdue ? '，**逾期 ' + c3.overdue + ' 项**' : '，无逾期') + '。');
    } else {
      out.push('⚠️ 暂无排期。建议在「📅 营销日历」添加事件，或从「策略 → 营销日历倒排」一键导入。');
    }
    out.push('');
  }

  /* 7. 知识沉淀 */
  if(sections.indexOf('asset') > -1){
    out.push('## 七、知识沉淀');
    out.push('');
    var parts = [];
    if(map.kb && map.kb.filled){
      parts.push('知识库共 **' + map.kb.data.total + ' 篇**文档：' +
        map.kb.data.folders.map(function(f){ return f.name + '(' + f.n + ')'; }).join('、'));
    }
    if(map.flow && map.flow.filled){
      parts.push('已编排 **' + map.flow.data.n + ' 步**工作流' +
        (map.flow.data.goal ? '（目标：' + map.flow.data.goal + '）' : '') +
        (map.flow.data.vars.length ? '，变量流：' + map.flow.data.vars.join(' → ') : ''));
    }
    if(map.blocks && map.blocks.filled){
      var KN = {analysis:'分析', chart:'图卡', note:'笔记', prompt:'提示词', chat:'对话'};
      var ks = Object.keys(map.blocks.data.kinds).map(function(k){
        return (KN[k]||k) + ' ' + map.blocks.data.kinds[k];
      }).join('、');
      parts.push('工作台累计 **' + map.blocks.data.n + ' 个**产出块（' + ks + '）');
    }
    if(parts.length) parts.forEach(function(p){ out.push('- ' + p); });
    else out.push('⚠️ 暂无沉淀。建议在「📚 品牌知识库」存入品牌资产与用户原声。');
    out.push('');
  }

  /* 8. 缺口诊断 */
  if(sections.indexOf('gap') > -1){
    out.push('## 八、缺口诊断与下一步');
    out.push('');
    var gaps = [];
    if(!map.brand.filled) gaps.push({t:'品牌记忆未填写',
      d:'所有生成与评分都缺少品牌语境，输出会偏「通用腔」。',
      a:'左栏「🎯 品牌记忆」填 5 项，约 2 分钟'});
    if(!map.stp.filled) gaps.push({t:'市场选择未做',
      d:'不清楚该优先投入哪个细分市场，资源容易摊薄。',
      a:'「策略 → 🧮 计算模式 → STP 市场选择」填入 2-6 个细分市场'});
    if(!map.comp.filled) gaps.push({t:'竞品数据未填写',
      d:'差异化定位缺乏依据，机会点与威胁点无法自动识别。',
      a:'「策略 → 🧮 计算模式 → 竞品对比矩阵」填维度与各家打分'});
    if(!map.score.filled) gaps.push({t:'内容未体检',
      d:'文案质量没有量化基线，无法判断优化是否有效。',
      a:'在「内容工厂」生成后点「🩺 内容体检」'});
    if(!map.cal.filled) gaps.push({t:'无执行排期',
      d:'策略停留在文档里，没有落到具体日期与责任人。',
      a:'「📅 营销日历」添加事件，或从倒排结果一键导入'});
    if(map.cal && map.cal.filled && map.cal.data.overdue)
      gaps.push({t:'存在 ' + map.cal.data.overdue + ' 项逾期任务',
        d:'逾期任务会拖累整体节奏，且会持续触发提醒。',
        a:'在「📅 营销日历」处理或重新排期'});
    if(!map.kb.filled) gaps.push({t:'知识库为空',
      d:'品牌资产与用户原声未沉淀，每次生成都要重新输入。',
      a:'「📚 品牌知识库」存入核心资料'});

    if(!gaps.length){
      out.push('✅ **所有核心模块均已填写，方案数据完整。**');
      out.push('');
      out.push('建议的下一步：');
      out.push('');
      out.push('1. 用「🔗 工作流」把本次分析编排成可复用流程，导出 Coze / Dify 交给 Agent 执行');
      out.push('2. 把关键结论做成「🖼️ 商业图卡」，导出 SVG 贴进提案');
      out.push('3. 定期重跑本方案，对比不同时期的排名与评分变化');
    } else {
      gaps.forEach(function(g, i){
        out.push('### ' + (i+1) + '. ' + g.t);
        out.push('');
        out.push('- **影响**：' + g.d);
        out.push('- **建议**：' + g.a);
        out.push('');
      });
    }
  }

  out.push('---');
  out.push('');
  out.push('*本方案由本地计算生成，所有数据保留在你自己的浏览器中。*');
  out.push('');
  out.push('*分析结论仅供参考，不构成商业决策依据。*');
  return out.join('\n');
}

/* ---------- 渲染数据源状态 ---------- */
function renderSynthSources(){
  var host = $('#synthSources'); if(!host) return;
  var S = collectSources();
  var n = S.filter(function(x){ return x.filled; }).length;
  var cnt = $('#synthCount');
  if(cnt) cnt.textContent = n + ' / ' + S.length + ' 个模块有数据';

  host.innerHTML = '';
  S.forEach(function(x){
    var d = document.createElement('div');
    d.className = 'srcrow' + (x.filled ? ' is-on' : '');
    d.innerHTML = '<span class="srcrow__dot"></span>' +
      '<span class="srcrow__ico">' + x.icon + '</span>' +
      '<span class="srcrow__n">' + x.n + '</span>' +
      '<span class="srcrow__s">' + (x.filled ? '已采集' : '未填写') + '</span>' +
      (x.filled ? '' : '<span class="srcrow__hint">' + x.hint + '</span>');
    host.appendChild(d);
  });
}

/* ---------- 生成 ---------- */
var lastPlan = '';
function generatePlan(){
  var secs = [];
  $$('#synthSecs .chip.is-on').forEach(function(c){
    secs.push(c.getAttribute('data-sec'));
  });
  if(!secs.length){ toast('请至少选择 1 个章节'); return; }
  lastPlan = buildPlan(secs);
  var pv = $('#synthPreview');
  if(pv) pv.innerHTML = mdLite(lastPlan);
  var btn = $('#btnSynthJson');
  if(btn) btn.style.display = '';
  toast('已生成方案（' + secs.length + ' 个章节）');
}

function renderSynthSecs(){
  var host = $('#synthSecs'); if(!host) return;
  host.innerHTML = '';
  SYNTH_SECTIONS.forEach(function(s){
    var b = document.createElement('button');
    b.className = 'chip' + (s.on ? ' is-on' : '');
    b.setAttribute('data-sec', s.k);
    b.textContent = s.n;
    b.onclick = function(){
      s.on = !s.on;
      b.classList.toggle('is-on', s.on);
    };
    host.appendChild(b);
  });
}

/* ---------- 导出 ---------- */
function exportPlanMd(){
  if(!lastPlan){ toast('请先生成方案'); return; }
  downloadFile('营销方案_' + ymd(new Date()) + '.md', lastPlan, 'text/markdown');
}
function exportPlanJson(){
  if(!lastPlan){ toast('请先生成方案'); return; }
  var payload = {
    generatedAt:new Date().toISOString(),
    sources:collectSources(),
    sections:SYNTH_SECTIONS.filter(function(s){ return s.on; }).map(function(s){ return s.k; }),
    markdown:lastPlan
  };
  downloadFile('营销方案_' + ymd(new Date()) + '.json',
               JSON.stringify(payload, null, 2), 'application/json');
}
