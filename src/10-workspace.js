/* ============================================================
 * 运行记录 Trace —— 记录每步真实产出，形成可复现证据链
 * ============================================================ */
function renderTraceList(){
  var host = $('#traceList'); if(!host) return;
  host.innerHTML = '';
  var m = flowModel();
  if(!m.steps.length){
    host.innerHTML = '<p class="hint">还没有工作流步骤，先去编排几步。</p>';
    return;
  }
  m.steps.forEach(function(s){
    var rec = (state.trace && state.trace['step_' + s.no]) || null;
    var wrapEl = document.createElement('div');
    wrapEl.style.cssText = 'border:1px solid var(--line);border-radius:8px;padding:10px;margin-bottom:10px;background:var(--bg-soft)';
    var hd = document.createElement('div');
    hd.style.cssText = 'font-size:12.5px;font-weight:700;margin-bottom:6px;display:flex;align-items:center;gap:8px';
    hd.innerHTML = '<span>' + s.no + '. ' + (s.local ? '⚡ ' + s.local.label : s.toolName) + '</span>';
    if(s.local){
      var run = document.createElement('button');
      run.className = 'btn btn--sm btn--ghost';
      run.textContent = '▶ 运行';
      run.style.marginLeft = 'auto';
      run.onclick = function(){ runLocalStep(s, wrapEl); };
      hd.appendChild(run);
    }
    wrapEl.appendChild(hd);

    var inst = document.createElement('p');
    inst.className = 'hint'; inst.style.marginBottom = '6px';
    inst.textContent = s.instruction.slice(0, 90);
    wrapEl.appendChild(inst);

    var ta = document.createElement('textarea');
    ta.style.minHeight = '76px';
    ta.placeholder = s.local ? '点「▶ 运行」自动填充，也可手工粘贴产出' : '粘贴这一步的真实产出…';
    ta.value = rec ? (rec.output || '') : '';
    ta.className = 'traceOut';
    wrapEl.appendChild(ta);

    var st = document.createElement('div');
    st.style.cssText = 'display:flex;gap:8px;align-items:center;margin-top:6px';
    var sel = document.createElement('select');
    sel.className = 'traceStatus';
    sel.style.cssText = 'padding:4px 8px;font-size:12px;border-radius:6px;border:1px solid var(--line);background:var(--card)';
    [['success','✅ 成功'],['partial','🟡 部分成功'],['failed','❌ 失败'],['skipped','⏭ 跳过']].forEach(function(o){
      var op = document.createElement('option'); op.value=o[0]; op.textContent=o[1];
      if(rec && rec.status === o[0]) op.selected = true;
      sel.appendChild(op);
    });
    st.appendChild(sel);
    var note = document.createElement('input');
    note.type='text'; note.className='traceNote';
    note.style.cssText = 'flex:1;padding:4px 8px;font-size:12px;border-radius:6px;border:1px solid var(--line);background:var(--card)';
    note.placeholder = '备注（耗时、遇到的问题…）';
    note.value = rec ? (rec.note || '') : '';
    st.appendChild(note);
    wrapEl.appendChild(st);

    wrapEl.setAttribute('data-step', s.no);
    host.appendChild(wrapEl);
  });
}

/* 执行本地确定性工具，把结果填进 trace */
function runLocalStep(s, wrapEl){
  var out = '';
  try{
    if(s.local.key === 'comp'){
      var c = calcComp();
      out = c ? compReport(c) : '（数据不足，请先在「策略 → 计算模式 → 竞品对比矩阵」填好数据）';
    } else if(s.local.key === 'stp'){
      var g = calcStp();
      out = g ? stpReport(g) : '（数据不足，请先在「策略 → 计算模式 → STP 市场选择」填好数据）';
    } else if(s.local.key === 'cal'){
      var k = calcCal();
      out = k ? calReport(k) : '（数据不足，请先在「策略 → 计算模式 → 营销日历」选择节点）';
    } else if(s.local.key === 'scan'){
      var pv = $('#preview');
      var txt = pv ? pv.textContent : '';
      if(!txt || txt.indexOf('请填写字段') > -1){ out = '（请先在内容工厂生成或粘贴一段文案）'; }
      else {
        var pfEl = $('#c_scanpf');
        var pfKey = pfEl ? (PLATFORM_MAP[$('#c_platform') ? $('#c_platform').value : ''] || null) : null;
        var sc = scoreContent(txt, pfKey, {red:[],yellow:[],blue:[]});
        out = '内容体检得分 ' + sc.total + '/100（' + sc.grade + ' 级 · ' + sc.gradeMsg + '）\n\n';
        sc.dims.forEach(function(d){ out += '- ' + d.icon + ' ' + d.n + '：' + d.s + '/' + d.max + '　' + d.tip + '\n'; });
      }
    }
    else if(s.local.key === 'mind'){
      var mTitle = $('#md_title') ? $('#md_title').value : '';
      var mBody  = $('#md_body')  ? $('#md_body').value  : '';
      if(!mBody || !mBody.trim()){
        out = '（请先在「📊 商业图卡 → 🧠 思维导图」填写分支结构）';
      } else {
        var mr = parseMind(mBody);
        if(!mr){ out = '（解析失败：第一行是中心主题，子项用空格或 Tab 缩进）'; }
        else {
          var mL = layoutMind(mr);
          var mLv = 1;
          mL.nodes.forEach(function(nd){ if(nd.d + 1 > mLv) mLv = nd.d + 1; });
          out = '# 🧠 思维导图 · ' + (mTitle || '未命名') + '\n\n';
          out += '**节点数**：' + mL.nodes.length + '　**层级**：' + mLv + '\n\n**结构**：\n\n';
          (function walk(n, d){
            var pad2 = ''; for(var q=0;q<d;q++) pad2 += '  ';
            out += pad2 + '- ' + n.t + '\n';
            (n.c || []).forEach(function(c){ walk(c, d + 1); });
          })(mr, 0);
          out += '\n💡 完整 SVG 图卡见「📊 商业图卡 → 🧠 思维导图」，可导出 SVG / PNG。';
        }
      }
    }
    else if(s.local.key === 'synth'){
      var srcs = collectSources();
      var n = srcs.filter(function(x){ return x.filled; }).length;
      out = buildPlan(['summary','gap']);
      out = '# 📋 方案合成（摘要 + 缺口）\n\n**数据源**：' + n + ' / ' +
            srcs.length + ' 个模块有数据\n\n' +
            out.replace(/^# 整合营销方案\n\n[\s\S]*?---\n\n/, '');
    }
    else if(s.local.key === 'pricing'){
      var pd = calcPricing();
      if(!pd){ out = '（请先在「💰 定价策略」填写成本与竞品价格带）'; }
      else {
        out = '# 💰 定价策略\n\n';
        out += '**成本** ' + pd.cost + '　**目标毛利率** ' + pd.gm + '%　**竞品带** ' +
               pd.rivalLo + ' – ' + pd.rivalHi + '（均价 ' + pd.rivalAvg + '）\n\n';
        out += '| 策略 | 价格 | 毛利率 | 盈亏平衡 |\n|---|---|---|---|\n';
        pd.strategies.forEach(function(x){
          out += '| ' + x.n + ' | ' + x.price.toFixed(1) + ' | ' + x.marginRate.toFixed(1) +
                 '% | ' + (x.beQty !== null ? x.beQty + ' 件' : '—') + ' |\n';
        });
        out += '\n**建议区间**：' + pd.lo.toFixed(1) + ' – ' + pd.hi.toFixed(1) + '\n\n';
        var cd2 = pd.curDisc;
        if(cd2){
          out += '**' + (pd.disc/10).toFixed(1) + ' 折测算**：折后 ' + cd2.price.toFixed(1) +
                 '，单件毛利 ' + cd2.margin.toFixed(1) +
                 (cd2.safe ? ('，需多卖 ×' + cd2.mult.toFixed(2) + '（+' + cd2.needPct.toFixed(0) + '%）')
                           : '，❌ 已击穿成本') + '\n';
        }
      }
    }
    else if(s.local.key === 'region'){
      var rd = calcRegion();
      if(!rd){ out = '（请先在「🌏 市场与竞品」填写至少 2 个区域）'; }
      else {
        out = '# 🌏 区域市场优先级\n\n';
        out += '| 排名 | 区域 | 体量 | 吸引力 | 竞争力 | 优先级 | 建议 |\n|---|---|---|---|---|---|---|\n';
        rd.ranked.forEach(function(x, i){
          out += '| ' + (i+1) + ' | ' + x.n + ' | ' + x.size + ' | ' + x.at + ' | ' +
                 x.cp + ' | ' + x.score + ' | ' + x.act + ' |\n';
        });
        out += '\n**重点投入**：' + (rd.tier.go.join('、') || '暂无') + '\n';
        out += '**提升能力**：' + (rd.tier.build.join('、') || '暂无') + '\n';
        out += '**维持收割**：' + (rd.tier.harvest.join('、') || '暂无') + '\n';
        out += '**谨慎/放弃**：' + (rd.tier.drop.join('、') || '暂无') + '\n';
      }
    }
    else if(s.local.key === 'hotspot'){
      var hd = calcHotspot();
      if(!hd){ out = '（请先在「📡 热点决策」填写热点描述）'; }
      else {
        out = '# 📡 热点跟进决策\n\n';
        out += '**热点**：' + hd.topic + '\n\n';
        out += '## ' + hd.advice + '（' + hd.total + '/100）\n\n';
        out += '| 维度 | 自评 | 得分 |\n|---|---|---|\n';
        hd.dims.forEach(function(x){
          out += '| ' + x.n + ' | ' + x.raw + '/5 | ' + x.s + '/' + x.max + ' |\n';
        });
        if(hd.risks.length){
          out += '\n### 风险识别\n\n';
          hd.risks.forEach(function(r){
            out += '- **' + (r.lv === 'high' ? '🔴 高危' : '🟡 中危') + ' ' + r.n + '**：' + r.tip + '\n';
          });
        }
        out += '\n### 跟进角度\n\n';
        hd.angles.forEach(function(a, i){ out += (i+1) + '. ' + a + '\n'; });
        out += '\n*决策辅助，不做事实核查。*';
      }
    }
    else if(s.local.key === 'research'){
      var RR = rs();
      var rep = buildResearchReport();
      var gapsN = 0;
      if(RR.segs.length && RR.rivals.length){
        RR.segs.forEach(function(sg, i){
          if(!RR.rivals.some(function(rv){ return rv.cells[i] === 'full'; })) gapsN++;
        });
      }
      out = '**项目**：' + (RR.name || '未命名') + '　**模板**：' +
            ((RS_TEMPLATES[RR.tpl]||{}).n || '-') + '\n\n';
      out += '**假设**：' + RR.assumptions.length + ' 条，已验证 ' +
             RR.assumptions.filter(function(a){ return a.status === 'done'; }).length + ' 条\n';
      out += '**市场空白格**：' + gapsN + ' 个\n\n';
      out += rep.slice(0, 2000) + (rep.length > 2000 ? '\n\n…（完整内容见「📐 调研方案」Tab）' : '');
    }
    else if(s.local.key === 'mx'){
      var M = sm();
      var tw = calcTows();
      var bb = calcBcg();
      out = '**项目**：' + (M.name || '未命名') + '\n\n';
      if(tw.length){
        out += '### TOWS 交叉策略\n\n';
        tw.forEach(function(x){
          out += '- **' + x.k + ' ' + x.n + '**：' + x.head + '\n  ' + x.elems + '\n';
        });
        out += '\n';
      }
      if(bb){
        out += '### BCG 象限\n\n';
        out += '| 业务线 | 增长率 | 份额 | 象限 | 预算 |\n|---|---|---|---|---|\n';
        bb.ranked.forEach(function(r){
          out += '| ' + r.n + ' | ' + r.growth + '% | ' + r.share + ' | ' +
                 BCG_QUAD[r.q].icon + BCG_QUAD[r.q].n + ' | ' + BCG_QUAD[r.q].budget + ' |\n';
        });
      }
      if(!tw.length && !bb) out += '（请先在「🎯 战略矩阵」填写 SWOT 或 BCG 数据）';
    }
    else if(s.local.key === 'fin'){
      var g = calcGmv(), l = calcLtv(), b = calcBudget(), rd = calcRadar();
      out = '# 💹 营销财务测算\n\n';
      if(g){
        out += '## GMV 拆解\n\n';
        out += '上期 ' + fmtMoney(g.base) + ' → 本期 ' + fmtMoney(g.now) +
               '（' + (g.total>=0?'+':'') + fmtMoney(g.total) + '）\n\n';
        g.steps.forEach(function(x){
          out += '- **' + x.n + '**：' + (x.d>=0?'+':'') + fmtMoney(x.d) + '\n';
        });
        out += '\n> 逐因子替换法，贡献之和恒等于总增量。\n\n';
      }
      if(l){
        out += '## LTV / CAC\n\n';
        out += '- LTV（毛利口径）：¥' + l.ltv.toFixed(0) + '\n';
        out += '- CAC：¥' + l.cac + '\n';
        out += '- **LTV/CAC：' + l.ratio.toFixed(2) + '**　' + ltvVerdict(l.ratio).t + '\n';
        out += '- 回本周期：' + (l.payback===Infinity ? '—' : l.payback.toFixed(1) + ' 个月') + '\n\n';
      }
      if(b){
        out += '## 预算分配\n\n';
        b.rows.forEach(function(r){
          out += '- ' + r.n + '：' + r.vals.join('% / ') + '%　合计 ' + r.sum.toFixed(0) + '%\n';
        });
        out += '\n';
      }
      if(rd){
        out += '## 渠道效率\n\n';
        rd.ranked.forEach(function(r, i){
          out += (i+1) + '. **' + r.n + '**　综合 ' + r.avg.toFixed(1) + '\n';
        });
      }
      if(!g && !l && !b && !rd) out += '（请先在「💹 财务测算」填写数据）';
    }
    else if(s.local.key === 'brandcore'){
      var BO = state.bc;
      if(!BO){ out = '（请先在「🏛️ 品牌内核」填写品牌信息并点诊断）'; }
      else {
        var BR = bcAnalyze(BO);
        out = '# 🏛️ 品牌内核诊断 · ' + (BO.brand || '未命名') + '\n\n';
        out += '**健康度** ' + BR.score + '/100（🛑 ' + BR.bad + ' · ⚠️ ' + BR.warn + '）\n\n';
        if(BR.mainFields.length){
          out += '**主战场**：' + BR.mainFields.map(function(f){ return f.n; }).join(' / ') + '\n\n';
        }
        BR.diag.forEach(function(d){
          out += '- ' + (d.lv === 'bad' ? '🛑' : d.lv === 'warn' ? '⚠️' : '✅') +
                 ' **' + d.t + '**：' + d.d + '\n';
        });
      }
    }
    else if(s.local.key === 'tonecheck'){
      var pvEl = $('#preview');
      var tcTxt = pvEl ? pvEl.textContent : '';
      if(!tcTxt || tcTxt.indexOf('请填写字段') > -1){
        out = '（请先在内容工厂生成或粘贴一段文案，再执行本步骤）';
      } else {
        var TCr = tcAnalyze(tcTxt);
        if(!TCr){ out = '（品牌内核未填写，或调性约束已关闭）'; }
        else {
          out = '# 🎭 品牌调性约束\n\n';
          out += '**基准** ' + TCr.base.srcName + '　**调性得分** ' + TCr.score + '/25\n\n';
          out += '| 信号 | 实测 | 期望 | 判定 |\n|---|---|---|---|\n';
          TCr.sigRows.forEach(function(x){
            out += '| ' + x.n + ' | ' + x.v + x.unit + ' | ' + x.lo + '~' + x.hi +
                   ' | ' + (x.lv === 'ok' ? '✅' : (x.lv === 'bad' ? '🛑 偏高' : '⚠️')) + ' |\n';
          });
          if(TCr.hard.length){
            out += '\n### 禁忌命中\n\n';
            TCr.hard.forEach(function(h){
              out += '- 🛑 **' + h.d + '**：' + h.words.join('、') + ' —— ' + h.why + '\n';
            });
          }
          if(TCr.cov && TCr.cov.miss.length){
            out += '\n⚠️ 未体现价值层级：' + TCr.cov.miss.join(' / ') + '\n';
          }
        }
      }
    }
  }catch(e){ out = '执行出错：' + e.message; }
  var ta = wrapEl.querySelector('.traceOut');
  if(ta){ ta.value = out; }
  toast('已执行「' + s.local.label + '」');
}

function saveTrace(){
  var recs = state.trace || (state.trace = {});
  var items = document.querySelectorAll('#traceList > div[data-step]');
  var n = 0;
  [].forEach.call(items, function(el){
    var no = el.getAttribute('data-step');
    var out = el.querySelector('.traceOut');
    var stSel = el.querySelector('.traceStatus');
    var nt = el.querySelector('.traceNote');
    if(out && (out.value || (stSel && stSel.value !== 'success'))){
      recs['step_'+no] = {output:out.value, status:stSel?stSel.value:'success', note:nt?nt.value:'', at:new Date().toISOString()};
      n++;
    }
  });
  save(); updateTraceStat();
  toast('已保存 ' + n + ' 条执行记录');
}

function updateTraceStat(){
  var el = $('#traceStat'); if(!el) return;
  var keys = Object.keys(state.trace || {});
  var okc = keys.filter(function(k){ return (state.trace[k]||{}).status === 'success'; }).length;
  el.textContent = keys.length
    ? ('已记录 ' + keys.length + ' 步（✅ 成功 ' + okc + '）· 可用于导出 Trace 证明流程真实跑过')
    : '尚未记录任何执行结果';
}

function buildTraceReport(){
  var m = flowModel();
  var recs = state.trace || {};
  var out = '# 🧾 运行记录 Trace\n\n';
  out += '**工作流**：' + (m.goal || '未命名') + '\n\n';
  out += '**生成时间**：' + new Date().toLocaleString('zh-CN') + '\n\n';
  var keys = Object.keys(recs);
  var done = 0;
  m.steps.forEach(function(s){
    var r = recs['step_' + s.no];
    out += '## 步骤 ' + s.no + ' · ' + (s.local ? '⚡ ' + s.local.label + '（确定性函数）' : s.toolName) + '\n\n';
    out += '**指令**：' + s.instruction.slice(0, 120) + '\n\n';
    if(s.outVar) out += '**输出变量**：`' + s.outVar + '`\n\n';
    if(r){
      done++;
      out += '**状态**：' + ({success:'✅ 成功',partial:'🟡 部分成功',failed:'❌ 失败',skipped:'⏭ 跳过'}[r.status]||r.status) + '\n\n';
      if(r.note) out += '**备注**：' + r.note + '\n\n';
      out += '**产出**：\n\n```\n' + String(r.output||'').slice(0, 1600) + '\n```\n\n';
    } else {
      out += '**状态**：未记录\n\n';
    }
  });
  out += '---\n\n**完成度**：' + done + ' / ' + m.steps.length + ' 步有记录\n\n';
  out += '💡 这份 Trace 说明该工作流不只是设计稿，而是真实执行过并可复现。\n';
  return out;
}

/* ============================================================
 * Agent 工作台 —— 对话路由 + 飞书式可编辑文档块
 * 左：自然语言 -> 意图识别 -> 调本地确定性工具（或生成提示词）
 * 右：产出沉淀为文档块，可编辑/删除/排序/引用回对话
 * ============================================================ */

/* ---------- 意图路由表 ---------- */
var INTENTS = [
  {k:'comp', kw:['竞品','竞品分析','竞品对比','竞品矩阵','对手分析','competitor'],
   tool:'analyze_competitor_matrix', label:'竞品对比矩阵'},
  {k:'stp', kw:['市场选择','stp','细分市场','选市场','ge矩阵','目标市场'],
   tool:'evaluate_market_segments', label:'STP 市场选择'},
  {k:'cal', kw:['排期','日历','倒排','节点','618','双11','双12','大促','节日','营销日历'],
   tool:'plan_marketing_calendar', label:'营销日历倒排'},
  {k:'scan', kw:['体检','评分','几分','打分','检测','违禁词','合规','检查'],
   tool:'check_content_health', label:'内容体检'},
  {k:'chart_swot', kw:['swot','四象限','优势劣势'],
   tool:'render_chart', label:'SWOT 四象限'},
  {k:'chart_pos', kw:['定位地图','定位图','positioning'],
   tool:'render_chart', label:'竞品定位地图'},
  {k:'chart_persona', kw:['画像','persona','用户画像卡'],
   tool:'render_chart', label:'用户画像卡'},
  {k:'chart_funnel', kw:['漏斗','funnel','转化漏斗'],
   tool:'render_chart', label:'转化漏斗'},
  {k:'chart_mind', kw:['思维导图','导图','脑图','mindmap','结构拆解','发散'],
   tool:'render_chart', label:'思维导图'},
  {k:'five', kw:['波特五力','五力模型','五力分析','行业吸引力','值不值得进','行业格局'],
   tool:'analyze_porter_five_forces', label:'波特五力分析'},
  {k:'pest', kw:['pest','宏观环境','宏观','政策环境','经济环境','社会环境','技术趋势'],
   tool:'analyze_pest', label:'PEST 宏观环境扫描'},
  {k:'ansoff', kw:['安索夫','增长策略','市场渗透','多元化','增长方向','往哪走'],
   tool:'plan_ansoff_growth', label:'安索夫增长矩阵'},
  {k:'ge9', kw:['ge矩阵','九宫格','ge九宫格','麦肯锡矩阵','业务组合'],
   tool:'evaluate_ge_nine_box', label:'GE-McKinsey 九宫格'},
  {k:'vc', kw:['价值链','成本占比','降本增效','利润贡献','环节效率'],
   tool:'analyze_value_chain', label:'价值链分析'},
  {k:'cj', kw:['用户旅程','旅程地图','情绪曲线','体验地图','用户体验','journey'],
   tool:'map_customer_journey', label:'用户旅程地图'},
  {k:'ogsm', kw:['ogsm','目标拆解','战略落地','执行计划','战略解码'],
   tool:'build_ogsm', label:'OGSM 战略拆解'},
  {k:'pm', kw:['感知地图','心智地图','品牌定位图','差异化山头','认知地图'],
   tool:'map_perceptual', label:'品牌感知地图'},
  {k:'tonecheck', kw:['调性','调性检查','品牌调性','语气检查','是否偏离','符合品牌','调性约束'],
   tool:'check_brand_tone', label:'品牌调性约束'},
  {k:'brandcore', kw:['品牌内核','品牌诊断','品牌价值','品牌文化','价值层级'],
   tool:'analyze_brand_core', label:'品牌内核诊断'},
  {k:'write', kw:['写','文案','小红书','公众号','标题','种草','脚本','生成内容'],
   tool:'prompt', label:'内容创作'}
];

function matchIntent(text){
  var t = String(text||'').toLowerCase();
  var best = null, bestScore = 0;
  INTENTS.forEach(function(it){
    it.kw.forEach(function(w){
      if(t.indexOf(w.toLowerCase()) > -1 && w.length > bestScore){ bestScore = w.length; best = it; }
    });
  });
  return best;
}

/* ---------- 对话 ---------- */
function pushMsg(role, text, tag){
  state.chat = state.chat || [];
  state.chat.push({role:role, text:text, tag:tag||'', at:new Date().toLocaleTimeString('zh-CN')});
  if(state.chat.length > 60) state.chat = state.chat.slice(-60);
  renderChat(); save();
}
function renderChat(){
  var host = $('#chatLog'); if(!host) return;
  host.innerHTML = '';
  var msgs = state.chat || [];
  if(!msgs.length){
    host.innerHTML = '<div class="msg msg--sys">👋 说句话开始。<br>本地工具会<b>直接执行</b>并给出真实结果，<br>创作类任务会生成提示词供你带走。</div>';
    return;
  }
  msgs.forEach(function(m){
    var d = document.createElement('div');
    if(m.role === 'sys'){ d.className = 'msg msg--sys'; d.textContent = m.text; }
    else{
      d.className = 'msg msg--' + (m.role === 'me' ? 'me' : 'ai');
      var h = '';
      if(m.tag){
        var cls = m.tag.indexOf('⚡')>-1 ? 'tag--run' : m.tag.indexOf('📋')>-1 ? 'tag--prompt'
                : m.tag.indexOf('🌐')>-1 ? 'tag--net' : m.tag.indexOf('示例')>-1 ? 'tag--demo' : 'tag--run';
        h += '<span class="msg__tag ' + cls + '">' + esc(m.tag) + '</span><br>';
      }
      d.innerHTML = h + esc(m.text).replace(/\n/g,'<br>');
    }
    host.appendChild(d);
  });
  host.scrollTop = host.scrollHeight;
}

/* 执行本地工具：数据不足则用示例数据跑一遍并标注 */
function runLocalTool(kind, ctxText){
  var demoUsed = false, out = '', kindLabel = '', blockKind = 'analysis';

  if(kind === 'comp'){
    var c = calcComp();
    if(!c){
      $('#cp_dims').value = TOOL_DEMO.comp.dims;
      $('#cp_rows').value = TOOL_DEMO.comp.rows;
      saveToolData();
      c = calcComp(); demoUsed = true;
    }
    if(!c) return {text:'无法运行竞品分析，请先填写数据。', demo:false, kind:'analysis'};
    out = compReport(c); kindLabel = '竞品对比矩阵';
    out = summarize(out, '竞品对比矩阵');
    addBlock('analysis', '竞品对比矩阵' + (demoUsed ? '（示例数据）' : ''), out, demoUsed ? '示例数据' : '');
  }
  else if(kind === 'stp'){
    var g = calcStp();
    if(!g){
      $('#st_rows').value = TOOL_DEMO.stp.rows; saveToolData();
      g = calcStp(); demoUsed = true;
    }
    if(!g) return {text:'无法运行 STP 分析，请先填写数据。', demo:false, kind:'analysis'};
    out = stpReport(g); kindLabel = 'STP 市场选择';
    out = summarize(out, 'STP 市场选择');
    addBlock('analysis', 'STP 市场选择' + (demoUsed ? '（示例数据）' : ''), out, demoUsed ? '示例数据' : '');
  }
  else if(kind === 'cal'){
    var k = calcCal();
    if(!k){
      // 默认选 618 与双 11
      var sel = $('#cal_pick');
      if(sel){ [].forEach.call(sel.options, function(o){ if(o.value.indexOf('618')>-1 || o.value.indexOf('双 11')>-1) o.selected = true; }); }
      saveToolData(); k = calcCal(); demoUsed = true;
    }
    if(!k) return {text:'无法生成排期，请先选择节点。', demo:false, kind:'analysis'};
    out = calReport(k); kindLabel = '营销日历倒排';
    out = summarize(out, '营销日历');
    addBlock('analysis', '营销日历倒排' + (demoUsed ? '（示例节点）' : ''), out, demoUsed ? '示例数据' : '');
  }
  else if(kind === 'scan'){
    // 优先用引用块的正文，其次用预览区，最后用示例
    var refBody = state.chatRef ? (state.chatRef.body || '') : '';
    var txt = refBody || ctxText || ($('#preview') ? $('#preview').textContent : '');
    if(!txt || txt.length < 10 || txt.indexOf('请填写字段') > -1){
      txt = '姐妹们！这款防晒竟然只要89元✨ 三周实测不搓泥，质地清爽不油腻。\n\n#防晒推荐\n\n你最在意防晒哪一点？评论区聊聊，记得收藏备用～';
      demoUsed = true;
    }
    var pfEl = $('#c_platform');
    var pfKey = pfEl ? (PLATFORM_MAP[pfEl.value] || null) : null;
    var sc = scoreContent(txt, pfKey, {red:[],yellow:[],blue:[]});
    out = '**综合得分 ' + sc.total + '/100（' + sc.grade + ' 级 · ' + sc.gradeMsg + '）**\n\n';
    sc.dims.forEach(function(d){ out += '- ' + d.icon + ' ' + d.n + '：' + d.s + '/' + d.max + '　' + d.tip + '\n'; });
    var weak = sc.dims.filter(function(d){ return d.s/d.max < 0.7; });
    if(weak.length){
      out += '\n⚡ 优先改进：\n';
      weak.forEach(function(d){ out += '  · ' + d.n + ' —— ' + (d.detail && d.detail[0] ? d.detail[0] : d.tip) + '\n'; });
    }
    kindLabel = '内容体检';
    addBlock('analysis', '内容体检 ' + sc.total + ' 分' + (demoUsed ? '（示例文案）' : ''), out, demoUsed ? '示例数据' : '');
  }
  else if(kind === 'tonecheck'){
    var tcRef = state.chatRef ? (state.chatRef.body || '') : '';
    var tcTxt2 = tcRef || ctxText || ($('#preview') ? $('#preview').textContent : '');
    if(!tcTxt2 || tcTxt2.length < 10 || tcTxt2.indexOf('请填写字段') > -1){
      return {text:'请先在内容工厂生成或粘贴一段文案，再对我说「检查调性」。', demo:false, kind:'analysis'};
    }
    var tcr2 = tcAnalyze(tcTxt2);
    if(!tcr2){
      return {text:'调性约束未启用。请先到「🏛️ 品牌内核」填一次并诊断，或把体检面板的「基准来源」切回「跟随品牌内核」。',
              demo:false, kind:'analysis'};
    }
    out = '**调性得分 ' + tcr2.score + '/25**　基准：' + tcr2.base.srcName +
          (tcr2.base.cat ? '（' + tcr2.base.cat.n + '）' : '') + '\n\n';
    out += '| 信号 | 实测 | 期望 | 判定 |\n|---|---|---|---|\n';
    tcr2.sigRows.forEach(function(x){
      out += '| ' + x.n + ' | ' + x.v + x.unit + ' | ' + x.lo + '~' + x.hi + ' | ' +
             (x.lv === 'ok' ? '✅' : (x.lv === 'bad' ? '🛑 偏高' : '⚠️')) + ' |\n';
    });
    if(tcr2.hard.length){
      out += '\n🛑 **禁忌命中**\n';
      tcr2.hard.forEach(function(h){
        out += '  · ' + h.d + '：' + h.words.join('、') + ' —— ' + h.why + '\n';
      });
    }
    if(tcr2.cov && tcr2.cov.miss.length){
      out += '\n⚠️ 未体现价值层级：' + tcr2.cov.miss.join(' / ') + '\n';
    }
    if(!tcr2.hard.length && tcr2.score >= 22){
      out += '\n✅ 文案与品牌内核定义的调性一致。\n';
    }
    kindLabel = '品牌调性约束';
    addBlock('analysis', '品牌调性 ' + tcr2.score + '/25', out, '');
  }
  else if(kind === 'brandcore'){
    var BO2 = state.bc;
    if(!BO2){
      return {text:'请先到「🏛️ 品牌内核」填写品牌信息并点一次诊断，之后这里可以直接调用。', demo:false, kind:'analysis'};
    }
    var BR2 = bcAnalyze(BO2);
    out = '**品牌内核健康度 ' + BR2.score + '/100**（🛑 ' + BR2.bad + ' · ⚠️ ' + BR2.warn + '）\n\n';
    if(BR2.mainFields.length){
      out += '主战场：' + BR2.mainFields.map(function(f){ return f.n; }).join(' / ') + '\n\n';
    }
    BR2.diag.forEach(function(d){
      out += '- ' + (d.lv === 'bad' ? '🛑' : d.lv === 'warn' ? '⚠️' : '✅') + ' **' + d.t + '**：' + d.d + '\n';
    });
    kindLabel = '品牌内核诊断';
    addBlock('analysis', '品牌内核 ' + BR2.score + '/100', out, '');
  }
  else if(['five','pest','ansoff','ge9','vc','cj','ogsm','pm'].indexOf(kind) >= 0){
    var TKF = {five:calcFive, pest:calcPest, ansoff:calcAnsoff, ge9:calcGE,
               vc:calcVC, cj:calcCJ, ogsm:calcOGSM, pm:calcPM};
    var TKO = {five:'#k5Out', pest:'#kpOut', ansoff:'#kaOut', ge9:'#kgOut',
               vc:'#kvOut', cj:'#kjOut', ogsm:'#koOut', pm:'#kmOut'};
    var TKL = {five:'波特五力分析', pest:'PEST 宏观环境扫描', ansoff:'安索夫增长矩阵',
               ge9:'GE-McKinsey 九宫格', vc:'价值链分析', cj:'用户旅程地图',
               ogsm:'OGSM 战略拆解', pm:'品牌感知地图'};
    var tkr = TKF[kind] ? TKF[kind]() : null;
    if(!tkr) return {text:'数据不足，请先到「🧰 经典工具 → ' + TKL[kind] + '」填写。', demo:false, kind:'analysis'};
    var tke = $(TKO[kind]);
    out = tke ? String(tke.textContent || '').replace(/\s+/g,' ').trim() : '';
    if(!out || out.length < 30) out = '已生成 ' + TKL[kind] + '，完整图表请到「🧰 经典工具」查看。';
    kindLabel = TKL[kind];
    addBlock('analysis', TKL[kind], out, '');
  }
  else if(kind.indexOf('chart_') === 0){
    var ct = kind.replace('chart_','');
    var names = {swot:'SWOT 四象限', pos:'竞品定位地图', persona:'用户画像卡', funnel:'转化漏斗', mind:'思维导图'};
    var r = demoChart(ct);
    if(!r || !r.svg) return {text:'该图卡需要数据，请到「📊 商业图卡」填写。', demo:false, kind:'chart'};
    demoUsed = !!r.isDemo;
    addBlock('chart', names[ct] + (demoUsed ? '（示例数据）' : ''), '', demoUsed ? '示例数据' : '', r.svg);
    return {text:'已生成「' + names[ct] + '」图卡，右侧工作台可查看并导出。\n\n'
      + (demoUsed ? '⚠️ 用的是示例数据——去「📊 商业图卡」填你自己的数据，或告诉我具体内容。' : ''),
      demo:demoUsed, kind:'chart'};
  }
  else {
    return {text:'暂不支持该任务。', demo:false, kind:'note'};
  }

  var tail = demoUsed ? '\n\n⚠️ 以上是**示例数据**跑出的结果，让你先看到输出长什么样。改成你的数据：策略 Tab → 🧮 计算模式。' : '';
  return {text: out + tail, demo: demoUsed, kind: blockKind, label: kindLabel};
}

/* 把长报告压缩成对话里适合展示的摘要 */
function summarize(out, label){
  var lines = out.split('\n');
  var keep = [], n = 0;
  for(var i=0;i<lines.length && n<14;i++){
    var l = lines[i];
    if(!l.trim()) continue;
    keep.push(l); n++;
  }
  var s = keep.join('\n');
  if(out.length > keep.join('\n').length + 60) s += '\n\n（完整报告已存入右侧工作台文档）';
  return s;
}

/* 生成图卡（数据不足用示例） */
function demoChart(ct){
  var d, isDemo = false;
  if(ct === 'swot'){
    if(!$('#sw_s').value && !$('#sw_w').value) isDemo = true;
    d = {title:($('#sw_title').value||'SWOT 分析'), s:$('#sw_s').value||'品牌口碑积累\n本地运行差异化\n零部署成本',
         w:$('#sw_w').value||'知名度尚低\n渠道单一', o:$('#sw_o').value||'隐私合规需求上升\n付费习惯养成',
         t:$('#sw_t').value||'大厂免费工具挤压\n同质化竞品出现'};
    return {svg:svgSwot(d), isDemo:isDemo};
  }
  if(ct === 'pos'){
    if(!$('#pm_pts').value) isDemo = true;
    d = {title:($('#pm_title').value||'竞品定位地图'), x:$('#pm_x').value||'价格高端化',
         y:$('#pm_y').value||'功能专业度', pts:$('#pm_pts').value||'我方,6.5,8\n竞品A,3,5\n竞品B,8,6\n竞品C,7,4'};
    return {svg:svgPos(d), isDemo:isDemo};
  }
  if(ct === 'persona'){
    if(!$('#pe_name').value) isDemo = true;
    d = {name:$('#pe_name').value||'核心用户', age:$('#pe_age').value||'29 岁 · 上海',
         job:$('#pe_job').value||'品牌市场经理', color:$('#pe_color').value||'indigo',
         goal:$('#pe_goal').value||'做出能刷屏的内容\n控制获客成本', pain:$('#pe_pain').value||'违禁词拿不准，反复改稿\n竞品动态跟不过来',
         quote:$('#pe_quote').value||'我要能直接发的稿，不是一堆建议', ch:$('#pe_ch').value||'小红书 / 抖音 / 私域'};
    return {svg:svgPersona(d), isDemo:isDemo};
  }
  if(ct === 'funnel'){
    if(!$('#fu_stages').value) isDemo = true;
    d = {title:($('#fu_title').value||'转化漏斗'),
         stages:$('#fu_stages').value||'曝光,120000\n点击,9600\n加购,2400\n下单,720\n复购,180'};
    return {svg:svgFunnel(d), isDemo:isDemo};
  }
  if(ct === 'mind'){
    if(!$('#md_body').value) isDemo = true;
    d = {title:$('#md_title').value||'思维导图',
         body:$('#md_body').value||'策略主题\n  目标拆解\n    GMV 目标\n    新客占比\n  渠道组合\n    小红书\n    抖音\n  风险预案'};
    return {svg:svgMindmap(d), isDemo:isDemo};
  }
  return null;
}

/* 创作类：生成提示词（本地做不了） */
function genPromptReply(text){
  var b = readBrand();
  var p = '你是一位资深营销内容专家。\n\n## 任务\n' + text + '\n\n';
  if(b.name || b.cat || b.aud || b.usp){
    p += '## 品牌语境\n';
    if(b.name) p += '- 品牌：' + b.name + '\n';
    if(b.cat)  p += '- 品类：' + b.cat + '\n';
    if(b.aud)  p += '- 目标人群：' + b.aud + '\n';
    if(b.usp)  p += '- 核心卖点：' + b.usp + '\n';
    p += '\n';
  }
  p += '## 要求\n- 给出 3 个不同角度的版本\n- 标注每个版本的适用场景\n- 避免夸大与绝对化用语';
  addBlock('prompt', '创作提示词 · ' + text.slice(0, 18), p);
  return '这是创作类任务，本地无法凭空生成可靠内容（那需要真实模型）。\n\n已为你生成一段**结构化提示词**，复制到豆包 / DeepSeek / Kimi 执行：\n\n' + p.slice(0, 260) + '\n\n…完整版已存入右侧工作台。';
}

/* ---------- 对话主入口 ---------- */
function handleChat(text){
  text = String(text||'').trim();
  if(!text) return;
  pushMsg('me', text);
  $('#chatInput').value = '';

  // 有引用上下文则带入
  var ref = state.chatRef;
  var ctx = ref ? ('\n\n[引用文档块：' + ref.title + ']\n' + (ref.body||'').slice(0, 800)) : '';
  if(ref){ clearChatRef(); }

  var it = matchIntent(text);
  if(!it){
    if(state.net.on){
      callRemote(text + ctx);
    } else {
      pushMsg('ai', '没匹配到可执行的本地任务。\n\n我能直接跑的有：竞品分析 / 市场选择 / 排期日历 / 内容体检 / 四种图卡。\n创作类任务我可以生成提示词。\n\n也可以开启联网（右上角 ⚙️）用真实模型自由对话。', '📋 未匹配');
    }
    return;
  }

  if(it.tool === 'prompt'){
    var r = genPromptReply(text + ctx);
    pushMsg('ai', r, '📋 提示词');
    return;
  }

  // 确定性工具：直接执行
  var res = runLocalTool(it.k, text + ctx);
  var tag = res.demo ? '⚡ 已执行 · 示例数据' : '⚡ 已执行本地函数';
  pushMsg('ai', res.text, tag);
  toast(res.demo ? '已用示例数据运行' : '已执行 ' + it.label);
}

/* ---------- 联网（可选） ---------- */
function callRemote(text){
  pushMsg('ai', '正在调用「' + (state.net.provider||'') + '」…', '🌐 联网');
  var cfg = getNetCfg();
  if(!cfg.key){
    pushMsg('ai', '未填写 API Key。点右上角 ⚙️ 联网设置填写。', '🌐 联网');
    return;
  }
  fetch(cfg.url, {
    method:'POST',
    headers:{'Content-Type':'application/json','Authorization':'Bearer ' + cfg.key},
    body: JSON.stringify({model: cfg.model, messages:[{role:'user', content:text}], stream:false})
  }).then(function(r){ return r.json(); })
  .then(function(j){
    var reply = (j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content)
      || j.error && (j.error.message || JSON.stringify(j.error)) || JSON.stringify(j).slice(0,300);
    pushMsg('ai', reply, '🌐 联网');
    addBlock('chat', '联网对话', reply);
  }).catch(function(e){
    pushMsg('ai', '调用失败：' + e.message + '\n\n大概率是厂商 CORS 策略不允许浏览器直连。\n本站不提供代理，也不经手你的数据。', '🌐 联网');
  });
}
function getNetCfg(){
  var prov = state.net.provider || 'deepseek';
  var map = {
    deepseek:{url:'https://api.deepseek.com/chat/completions', model:'deepseek-chat'},
    moonshot:{url:'https://api.moonshot.cn/v1/chat/completions', model:'moonshot-v1-8k'},
    zhipu:{url:'https://open.bigmodel.cn/api/paas/v4/chat/completions', model:'glm-4'},
    custom:{url: state.net.base || '', model:'gpt-3.5-turbo'}
  };
  var c = map[prov] || map.deepseek;
  return {url:c.url, model:c.model, key:state.net.key || ''};
}

/* ---------- 文档块 ---------- */
function addBlock(kind, title, body, demo, svg){
  state.blocks = state.blocks || [];
  state.blocks.push({
    id: 'b' + Date.now() + Math.floor(Math.random()*100),
    kind: kind || 'note',
    title: title || '未命名',
    body: body || '',
    svg: svg || '',
    demo: demo || '',
    at: new Date().toLocaleString('zh-CN')
  });
  renderBlocks(); save();
  return state.blocks[state.blocks.length-1];
}
function renderBlocks(){
  var host = $('#docBlocks'); if(!host) return;
  var bs = state.blocks || [];
  var st = $('#docStat'); if(st) st.textContent = bs.length + ' 个块';
  if(!bs.length){
    host.innerHTML = '<div class="docempty">还没有内容<br><br>左侧对话产出的结果会自动追加到这里<br>也可以点「➕ 新建笔记」手动记录</div>';
    return;
  }
  host.innerHTML = '';
  bs.forEach(function(b, i){
    var d = document.createElement('div');
    d.className = 'docblock';
    var kindName = {analysis:'分析', chart:'图卡', note:'笔记', prompt:'提示词', chat:'对话'}[b.kind] || '块';
    var hd = '<div class="docblock__hd">'
      + '<span class="docblock__kind kind--' + b.kind + '">' + kindName + '</span>'
      + '<span>' + esc(b.title) + '</span>'
      + (b.demo ? '<span class="docblock__kind kind--prompt" style="margin-left:4px">' + esc(b.demo) + '</span>' : '')
      + '<span class="docblock__ops">'
        + '<button data-op="ref" data-i="' + i + '" title="引用到对话">💬</button>'
        + '<button data-op="up" data-i="' + i + '" title="上移">↑</button>'
        + '<button data-op="down" data-i="' + i + '" title="下移">↓</button>'
        + '<button data-op="edit" data-i="' + i + '" title="编辑">✎</button>'
        + '<button data-op="del" data-i="' + i + '" title="删除">🗑</button>'
      + '</span></div>';
    d.innerHTML = hd;
    var bodyEl = document.createElement('div');
    bodyEl.className = 'docblock__body';
    if(b.svg){
      bodyEl.innerHTML = b.svg;
    } else {
      bodyEl.textContent = (b.body || '').slice(0, 400) + ((b.body||'').length > 400 ? '\n\n…（已折叠，导出可见全文）' : '');
    }
    d.appendChild(bodyEl);
    host.appendChild(d);
  });
  // 事件委托
  host.onclick = function(e){
    var btn = e.target.closest('button[data-op]');
    if(!btn) return;
    var op = btn.getAttribute('data-op'), i = parseInt(btn.getAttribute('data-i'),10);
    var bs2 = state.blocks || [];
    if(op === 'del'){ if(confirm('删除这个块？')) { bs2.splice(i,1); renderBlocks(); save(); } }
    else if(op === 'up' && i > 0){ var t = bs2[i]; bs2[i] = bs2[i-1]; bs2[i-1] = t; renderBlocks(); save(); }
    else if(op === 'down' && i < bs2.length-1){ var t2 = bs2[i]; bs2[i] = bs2[i+1]; bs2[i+1] = t2; renderBlocks(); save(); }
    else if(op === 'edit'){ editBlock(i); }
    else if(op === 'ref'){ setChatRef(bs2[i]); }
  };
}
function editBlock(i){
  var b = (state.blocks||[])[i]; if(!b) return;
  var host = $('#docBlocks'); if(!host) return;
  var el = host.children[i]; if(!el) return;
  var bodyEl = el.querySelector('.docblock__body');
  if(!bodyEl) return;
  if(bodyEl.querySelector('textarea')) return;
  var ta = document.createElement('textarea');
  ta.value = b.body || '';
  bodyEl.innerHTML = '';
  bodyEl.appendChild(ta);
  var row = document.createElement('div');
  row.className = 'row'; row.style.marginTop = '6px';
  var ok = document.createElement('button');
  ok.className = 'btn btn--sm btn--primary'; ok.textContent = '💾 保存';
  ok.onclick = function(){ b.body = ta.value; save(); renderBlocks(); toast('已保存'); };
  var cc = document.createElement('button');
  cc.className = 'btn btn--sm btn--ghost'; cc.textContent = '取消';
  cc.onclick = function(){ renderBlocks(); };
  row.appendChild(ok); row.appendChild(cc);
  bodyEl.appendChild(row);
  ta.focus();
}
/* 引用文档块到对话 */
function setChatRef(b){
  state.chatRef = {title:b.title, body:b.body || (b.svg ? '[图卡：' + b.title + ']' : '')};
  var el = $('#chatRef'); if(!el) return;
  el.style.display = '';
  el.innerHTML = '💬 已引用 <b>' + esc(b.title) + '</b>　<span style="margin-left:auto;cursor:pointer" id="refX">✕</span>';
  var x = $('#refX'); if(x) x.onclick = clearChatRef;
  toast('已引用，输入你的问题');
}
function clearChatRef(){
  state.chatRef = null;
  var el = $('#chatRef'); if(el) el.style.display = 'none';
}
/* 导出文档 */
function buildDocMd(){
  var bs = state.blocks || [];
  var out = '# ' + ((state.brand && state.brand.name) ? state.brand.name + ' · ' : '') + '工作台文档\n\n';
  out += '生成时间：' + new Date().toLocaleString('zh-CN') + '\n\n---\n\n';
  bs.forEach(function(b, i){
    out += '## ' + (i+1) + '. ' + b.title + (b.demo ? '　`' + b.demo + '`' : '') + '\n\n';
    if(b.svg) out += '（图卡内容，见 SVG 导出）\n\n';
    if(b.body) out += b.body + '\n\n';
  });
  if(!bs.length) out += '（暂无内容）\n';
  return out;
}
function exportDocJson(){
  var data = {
    brand: state.brand || {},
    blocks: state.blocks || [],
    chat: state.chat || [],
    exported_at: new Date().toISOString()
  };
  downloadFile('workspace-' + Date.now() + '.json', JSON.stringify(data, null, 2));
}
