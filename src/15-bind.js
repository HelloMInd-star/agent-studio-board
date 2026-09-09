/* ================= 事件绑定 ================= */
function bind(){
  // Tab
  $$('.tab').forEach(function(b){
    b.onclick = function(){
      $$('.tab').forEach(function(x){ x.classList.remove('is-on'); });
      b.classList.add('is-on');
      var k = b.getAttribute('data-tab');
      $$('.panel').forEach(function(p){ p.classList.toggle('is-on', p.getAttribute('data-panel') === k); });
      // 切到方案合成时实时重采数据源（各模块数据可能刚填完）
      if(k === 'synth') renderSynthSources();
      // 切到日历时重渲染（其他模块可能刚推送了任务进来）
      if(k === 'cal') renderCal();
    };
  });

  // 主题
  $('#btnTheme').onclick = function(){
    state.theme = state.theme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', state.theme);
    this.textContent = state.theme === 'dark' ? '☀️ 浅色' : '🌙 深色';
    save();
  };

  // 记忆
  $('#memOn').onchange = function(){ state.memOn = this.checked; save(); };
  $('#defRole').oninput = function(){ state.defRole = this.value; $('#curAgent').textContent = this.value || '提示词工坊'; save(); };
  $('#defTone').oninput = function(){ state.defTone = this.value; save(); };

  // 品牌记忆 6 字段（输入即存）
  ['m_brand','m_cat','m_aud','m_usp','m_ban'].forEach(function(id){
    var key = {m_brand:'name', m_cat:'cat', m_aud:'aud', m_usp:'usp', m_ban:'ban'}[id];
    var el = $('#' + id);
    if(el) el.addEventListener('input', function(){ readBrand(); save(); });
  });

  // 预览品牌记忆注入效果
  $('#btnMemPeek').onclick = function(){
    var ctx = brandCtx();
    var out = '# 品牌记忆 · 注入预览\n\n';
    if(!ctx.length){
      out += '（尚未填写任何品牌记忆）\n\n填好左栏 7 个字段后，这里会显示每次生成时自动注入的内容。';
    } else {
      out += '以下内容会在**每次生成时自动加到提示词开头**：\n\n';
      out += '## 全局品牌语境（自动注入）\n' + ctx.map(function(c){ return '- ' + c; }).join('\n') + '\n\n';
      var bb = brandBanList();
      if(bb.length){
        out += '## 品牌禁用词（已同步进违禁词体检）\n';
        out += bb.map(function(b){ return '- ' + b.t; }).join('\n') + '\n\n';
      }
      out += '---\n\n💡 这些字段存在浏览器本地，不会上传。';
    }
    setPreview(out); toast('已生成品牌记忆预览');
  };

  // 知识库引用
  $('#kbUse').onchange = function(){ state.kbUse = this.checked; updateKbStat(); save(); };
  $('#kbScope').onchange = function(){ state.kbScope = this.value; updateKbStat(); save(); };
  $('#kbMax').onchange = function(){ state.kbMax = this.value; updateKbStat(); save(); };

  // 清空
  $('#btnClear').onclick = function(){
    ['#r_role','#r_task','#r_bg','#r_req','#r_ex'].forEach(function(s){ $(s).value=''; });
    state.curPreset = ''; state.role = {role:'',task:'',bg:'',req:'',ex:''};
    $('#curAgent').textContent = '提示词工坊';
    renderPresets(); setPreview(''); save(); toast('已清空');
  };

  // 生成
  $('#btnGenRole').onclick = genRole;
  $('#btnGenContent').onclick = genContent;
  $('#btnGenStrat').onclick = genStrat;
  $('#btnBC').onclick = bcRun;
  $('#btnGenFlow').onclick = genFlow;
  $('#btnScan').onclick = scanWords;

  // 品牌调性基准：切换来源/品类时刷新提示
  var _tcb = $('#c_tcbase');
  if(_tcb) _tcb.onchange = function(){ tcRenderBase(); };
  var _tcc = $('#c_tccat');
  if(_tcc) _tcc.onchange = function(){ tcRenderBase(); };
  $('#btnExpand').onclick = expand;

  // 复制
  $('#btnCopyRole').onclick = function(){ copy($('#preview').textContent); };
  $('#btnCopyAll').onclick = function(){ copy($('#preview').textContent); };
  $('#btnCopyAll2').onclick = function(){ copy($('#preview').textContent); };
  $('#btnBCCopy').onclick = function(){ copy($('#bcOut').textContent); };
  $('#btnBCSvg').onclick = bcExportSvg;
  $('#btnBCMd').onclick  = bcExportMd;
  $('#bcUseBase').onclick = bcFillBase;
  $('#bcClear').onclick   = bcClearDims;
  $('#bc_cat').onchange   = function(){ bcRenderDims(); bcFillBase(); };
  $('#btnCopyAll4').onclick = function(){ copy($('#preview').textContent); };
  $('#btnCopyPreview').onclick = function(){ copy($('#preview').textContent); };

  // 导出 MD
  $('#btnExportMd').onclick = function(){
    var txt = $('#preview').textContent;
    if(!txt || txt.indexOf('请填写字段') > -1){ toast('请先生成内容'); return; }
    var blob = new Blob([txt], {type:'text/markdown;charset=utf-8'});
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'ym-' + Date.now() + '.md';
    a.click(); toast('已导出 MD');
  };

  // 步骤
  $('#btnAddStep').onclick = function(){ state.flow.steps.push({t:'', tool:10, inVar:'', outVar:'', fail:'retry', gate:0}); renderSteps(); save(); };
  $('#btnResetStep').onclick = function(){ state.flow.steps = [{t:'', tool:10, inVar:'', outVar:'', fail:'retry', gate:0}]; renderSteps(); save(); };

  // 历史
  $('#btnHistory').onclick = function(){
    var host = $('#histList'); host.innerHTML = '';
    if(!state.history.length){ host.innerHTML = '<p class="hint">暂无历史记录。</p>'; }
    state.history.forEach(function(h){
      var d = document.createElement('div'); d.className = 'hist-item';
      d.innerHTML = '<div class="hist-item__t">·</div>' +
                    '<div class="hist-item__p">'+'</div>';
      d.querySelector('.hist-item__t').textContent = h.t + ' · ' + h.d;
      d.querySelector('.hist-item__p').textContent = (h.p||'').slice(0,120);
      d.onclick = function(){ setPreview(h.p); $('#maskHist').classList.remove('is-on'); };
      host.appendChild(d);
    });
    $('#maskHist').classList.add('is-on');
  };
  $('#btnCloseHist').onclick = function(){ $('#maskHist').classList.remove('is-on'); };
  $('#maskHist').onclick = function(e){ if(e.target === this) this.classList.remove('is-on'); };
  $('#btnClearHist').onclick = function(){ state.history = []; save(); $('#btnHistory').click(); toast('历史已清空'); };

  // 误报反馈
  $('#btnReportFP').onclick = function(){
    if(!lastScan){
      // 未体检也能反馈漏报
      var ok = confirm('尚未进行内容体检。\n\n仍可提交「漏报」或补充词条，继续吗？');
      if(!ok) return;
      $('#fp_type').value = '漏报（有风险词没被查出）';
    }
    openFP();
  };
  $('#btnCloseFP').onclick = function(){ $('#maskFP').classList.remove('is-on'); };
  $('#maskFP').onclick = function(e){ if(e.target === this) this.classList.remove('is-on'); };
  $('#btnFpCopy').onclick = function(){
    var t = buildFPText();
    copy(t);
    setPreview('# 反馈内容已生成\n\n下面是为你填好的反馈，复制后粘贴到微信 / 邮件 / 问卷发送即可。\n\n---\n\n' + t);
  };
  $('#btnFpMail').onclick = function(){
    var t = buildFPText();
    var subj = 'Y.Mine 词库反馈';
    var w = $('#fp_word').value || $('#fp_new').value;
    if(w) subj += ' · ' + w;
    window.location.href = 'mailto:Hello.Mind-Y@outlook.com?subject=' + encodeURIComponent(subj) + '&body=' + encodeURIComponent(t);
    toast('已唤起邮件客户端');
  };

  // 策略双模式 + 分析工具
  $('#btnRunTool').onclick = runTool;
  $('#btnToolSchema').onclick = function(){
    setPreview(toolSchema(state.tool.type));
    toast('已生成 Function Schema');
  };
  $('#btnToolDemo').onclick = function(){
    var d = TOOL_DEMO[state.tool.type] || {};
    if(state.tool.type==='comp'){ $('#cp_dims').value = d.dims; $('#cp_rows').value = d.rows; }
    if(state.tool.type==='stp'){ $('#st_rows').value = d.rows; }
    if(state.tool.type==='cal'){
      $('#cal_custom').value = d.custom;
      var sel = $('#cal_pick');
      if(sel){ [].forEach.call(sel.options, function(o,i){ o.selected = (i===6 || i===10); }); }
    }
    saveToolData(); runTool();
  };
  $('#btnToolSvg').onclick = function(){
    if(!lastToolSvg){ toast('请先运行分析'); return; }
    var blob = new Blob([lastToolSvg], {type:'image/svg+xml;charset=utf-8'});
    var a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = 'ym-tool-' + state.tool.type + '-' + Date.now() + '.svg'; a.click();
    toast('已导出 SVG');
  };
  $('#btnToolPng').onclick = function(){
    if(!lastToolSvg){ toast('请先运行分析'); return; }
    var m = lastToolSvg.match(/width="(\d+)"/), m2 = lastToolSvg.match(/height="(\d+)"/);
    var w = m?parseInt(m[1],10):900, h = m2?parseInt(m2[1],10):600;
    var url = URL.createObjectURL(new Blob([lastToolSvg],{type:'image/svg+xml;charset=utf-8'}));
    var img = new Image();
    img.onload = function(){
      var cv = document.createElement('canvas'); cv.width=w*2; cv.height=h*2;
      var ctx = cv.getContext('2d'); ctx.fillStyle='#fff'; ctx.fillRect(0,0,cv.width,cv.height);
      ctx.drawImage(img,0,0,cv.width,cv.height); URL.revokeObjectURL(url);
      cv.toBlob(function(b){
        var a=document.createElement('a'); a.href=URL.createObjectURL(b);
        a.download='ym-tool-'+state.tool.type+'-'+Date.now()+'.png'; a.click(); toast('已导出 PNG');
      },'image/png');
    };
    img.onerror=function(){ URL.revokeObjectURL(url); toast('导出失败，请改用 SVG'); };
    img.src = url;
  };
  ['cp_dims','cp_rows','st_rows','cal_custom'].forEach(function(id){
    var el=$('#'+id); if(el) el.addEventListener('input', saveToolData);
  });
  var cl = $('#cal_lead'); if(cl) cl.addEventListener('change', saveToolData);
  var cps = $('#cal_pick'); if(cps) cps.addEventListener('change', saveToolData);

  // ===== Agent 工作台（对话 + 文档） =====
  var QUICK = ['做个竞品分析','帮我选市场','618 怎么排期','这段文案几分','画个 SWOT','写个小红书文案'];
  function renderQuick(){
    var h = $('#chatQuick'); if(!h) return;
    h.innerHTML = '';
    QUICK.forEach(function(q){
      var b = document.createElement('button');
      b.className = 'chip'; b.textContent = q;
      b.onclick = function(){ $('#chatInput').value = q; handleChat(q); };
      h.appendChild(b);
    });
  }
  renderQuick();
  $('#btnChatSend').onclick = function(){ handleChat($('#chatInput').value); };
  $('#chatInput').onkeydown = function(e){
    if(e.key === 'Enter' && (e.ctrlKey || e.metaKey)){ e.preventDefault(); handleChat(this.value); }
  };
  $('#btnChatClear').onclick = function(){
    if(!confirm('清空对话记录？文档块会保留。')) return;
    state.chat = []; renderChat(); save(); toast('已清空对话');
  };
  $('#btnChatDoc').onclick = function(){
    var v = ($('#chatInput').value || '').trim();
    if(!v){ toast('输入框是空的'); return; }
    addBlock('note', '笔记', v);
    $('#chatInput').value = '';
    toast('已存为文档块');
  };
  $('#btnAddNote').onclick = function(){
    var b = addBlock('note', '新笔记', '');
    setTimeout(function(){ editBlock((state.blocks||[]).length - 1); }, 50);
  };
  $('#btnDocMd').onclick = function(){
    var md = buildDocMd();
    downloadFile('workspace-' + Date.now() + '.md', md, 'text/markdown;charset=utf-8');
    setPreview(md); toast('已导出 MD');
  };
  $('#btnDocJson').onclick = function(){
    exportDocJson(); toast('已导出 JSON');
  };

  // 联网设置
  function syncNetBadge(){
    var b = $('#netBadge'); if(!b) return;
    if(state.net.on){ b.className = 'netbadge netbadge--on'; b.textContent = '🌐 联网已开'; }
    else { b.className = 'netbadge netbadge--off'; b.textContent = '🔒 本地模式'; }
  }
  syncNetBadge();
  $('#btnNetCfg').onclick = function(){
    $('#netProvider').value = state.net.provider || 'deepseek';
    $('#netKey').value = state.net.key || '';
    $('#netBase').value = state.net.base || '';
    $('#maskNet').classList.add('is-on');
  };
  $('#btnCloseNet').onclick = function(){ $('#maskNet').classList.remove('is-on'); };
  $('#maskNet').onclick = function(e){ if(e.target === this) this.classList.remove('is-on'); };
  $('#btnNetOn').onclick = function(){ state.net.on = true; save(); syncNetBadge(); $('#netMsg').textContent = '已开启。未匹配到本地工具时，会用真实模型回答。'; };
  $('#btnNetOff').onclick = function(){ state.net.on = false; save(); syncNetBadge(); $('#netMsg').textContent = '已关闭。全部计算在本地完成。'; };
  $('#btnNetSave').onclick = function(){
    state.net.provider = $('#netProvider').value;
    state.net.key = $('#netKey').value.trim();
    state.net.base = $('#netBase').value.trim();
    save(); $('#netMsg').textContent = '已保存（Key 仅存在本机 localStorage）'; toast('已保存');
  };
  $('#btnNetTest').onclick = function(){
    var cfg = getNetCfg();
    var msg = $('#netMsg');
    if(!cfg.key){ msg.textContent = '请先填 Key'; return; }
    msg.textContent = '测试中…实际连接受厂商 CORS 限制，失败不代表 Key 无效。';
    fetch(cfg.url, {method:'POST',
      headers:{'Content-Type':'application/json','Authorization':'Bearer ' + cfg.key},
      body: JSON.stringify({model:cfg.model, messages:[{role:'user',content:'ping'}], max_tokens:5})
    }).then(function(r){ return r.json(); })
      .then(function(j){ msg.textContent = j.error ? ('厂商返回：' + (j.error.message||JSON.stringify(j.error))) : '✅ 连接成功'; })
      .catch(function(e){ msg.textContent = '❌ 连接失败：' + e.message + '（多半是 CORS 限制）'; });
  };

  $('#btnToolToCal').onclick = function(){
    if(!lastCalRes || !lastCalRes.nodes){ toast('请先运行营销日历倒排'); return; }
    importPlanToCal(lastCalRes.nodes);
    switchTab('cal');
  };

  // ===== 经典工具箱：计算按钮 =====
  var tkBtns = [['#btnK5',calcFive],['#btnKP',calcPest],['#btnKA',calcAnsoff],['#btnKG',calcGE],
                ['#btnKV',calcVC],['#btnKJ',calcCJ],['#btnKO',calcOGSM],['#btnKM',calcPM]];
  tkBtns.forEach(function(b){
    var e = $(b[0]);
    if(e) e.onclick = function(){ try{ b[1](); }catch(err){ toast('计算出错：' + err.message); } };
  });

  // ===== 经典工具箱：工具切换 =====
  [].forEach.call(document.querySelectorAll('[data-tktool]'), function(b){
    b.onclick = function(){
      var k = b.getAttribute('data-tktool');
      [].forEach.call(document.querySelectorAll('[data-tktool]'), function(x){
        x.classList.toggle('is-on', x === b);
      });
      [].forEach.call(document.querySelectorAll('[data-tksec]'), function(sec){
        sec.style.display = (sec.getAttribute('data-tksec') === k) ? '' : 'none';
      });
      state.tkCur = k; save();
    };
  });

  // ===== 工具地图 =====
  var ts = $('#tmSearch');
  if(ts) ts.addEventListener('input', function(){
    tmState().q = ts.value.trim(); save(); renderToolMap();
  });

  // ===== 开始：流程导航 =====
  $('#btnGdAsk').onclick = guideAsk;
  var gi = $('#gdInput');
  if(gi) gi.addEventListener('keydown', function(e){
    if(e.key === 'Enter') guideAsk();
  });

  // ===== 营销财务测算 =====
  $('#btnGmvCalc').onclick = calcGmv;
  $('#btnGmvDemo').onclick = demoGmv;
  $('#btnLtvCalc').onclick = calcLtv;
  $('#btnLtvDemo').onclick = demoLtv;
  $('#btnBudgetCalc').onclick = calcBudget;
  $('#btnRadarCalc').onclick = calcRadar;
  [['#g_pT','gmv','pT'],['#g_pC','gmv','pC'],['#g_pA','gmv','pA'],['#g_pR','gmv','pR'],
   ['#g_nT','gmv','nT'],['#g_nC','gmv','nC'],['#g_nA','gmv','nA'],['#g_nR','gmv','nR'],
   ['#l_aov','ltv','aov'],['#l_freq','ltv','freq'],['#l_life','ltv','life'],
   ['#l_gm','ltv','gm'],['#l_cac','ltv','cac'],['#l_ret','ltv','ret']].forEach(function(a){
    var e = $(a[0]);
    if(e) e.addEventListener('input', function(){
      fin()[a[1]][a[2]] = e.value; save();
    });
  });

  // ===== 战略矩阵 =====
  $('#btnSmDemo').onclick = demoStrategy;
  $('#btnSmExp').onclick  = exportStrategy;
  $('#btnBcgAdd').onclick = addBcgRow;
  $('#btnSnapAdd').onclick = saveSnap;
  var bm = $('#smBcgMode');
  if(bm) bm.addEventListener('change', function(){ sm().bcgMode = bm.value; save(); calcBcg(); });
  var snm = $('#smName');
  if(snm) snm.addEventListener('input', function(){ sm().name = snm.value; save(); });

  // ===== 调研方案 =====
  $('#btnAsAdd').onclick = addAssump;
  $('#btnRsRival').onclick = addRivalRow;
  $('#btnRsSeg').onclick = addSeg;
  $('#btnRsGen').onclick = renderRsReport;
  $('#btnRsExp').onclick = exportRsReport;
  ['rs_users','rs_arpu','rs_samr','rs_somr'].forEach(function(id){
    var e = $('#' + id);
    if(e) e.addEventListener('input', function(){ calcTAM(); });
  });
  ['rs_prices','rs_counts','rs_target'].forEach(function(id){
    var e = $('#' + id);
    if(e) e.addEventListener('input', function(){ calcWTP(); });
  });
  var vw = $('#rs_vw');
  if(vw) vw.addEventListener('change', function(){
    var d = $('#rs_vwdata');
    if(d) d.style.display = vw.checked ? '' : 'none';
    calcWTP();
  });
  var vwd = $('#rs_vwdata');
  if(vwd) vwd.addEventListener('input', calcWTP);
  var rn = $('#rs_name');
  if(rn) rn.addEventListener('input', function(){
    var R = rs(); R.name = rn.value; save();
  });
  ['rs_stages','rs_risks'].forEach(function(id){
    var e = $('#' + id);
    if(e) e.addEventListener('input', function(){
      var R = rs(); R.feas = R.feas || {}; R.feas[id.slice(3)] = e.value; save();
    });
  });

  // ===== 热点决策 =====
  $('#btnHsCalc').onclick = renderHotspot;
  $('#btnHsDemo').onclick = demoHotspot;
  $('#btnHsExp').onclick  = exportHotspot;
  $('#btnHsScan').onclick = hotspotToScan;
  ['hs_topic','hs_way'].forEach(function(id){
    var el = $('#' + id);
    if(el) el.addEventListener('input', function(){ state.hotspot[id.slice(3)] = el.value; save(); });
  });
  ['rel','time','risk','fit','value'].forEach(function(k){
    var el = $('#hs_' + k);
    if(el) el.addEventListener('input', function(){
      state.hotspot[k] = el.value; save();
      if(lastHotspot) renderHotspot();
    });
  });

  // ===== 区域市场 + 竞品档案 =====
  $('#btnRgCalc').onclick = renderRegion;
  $('#btnRgDemo').onclick = demoRegion;
  $('#btnRgSvg').onclick  = exportRegionSvg;
  $('#btnRvAdd').onclick  = addRival;
  $('#btnRvDemo').onclick = demoRivals;
  $('#btnRvExp').onclick  = exportRivals;
  var rgEl = $('#rg_rows');
  if(rgEl){
    rgEl.addEventListener('input', function(){ state.region.rows = rgEl.value; save(); });
    rgEl.addEventListener('change', function(){ if(lastRegion) renderRegion(); });
  }

  // ===== 定价策略 =====
  $('#btnPrCalc').onclick = renderPricing;
  $('#btnPrDemo').onclick = demoPricing;
  $('#btnPrSvg').onclick  = exportPricingSvg;
  // 输入即重算（参数齐全时）
  ['pr_cost','pr_gm','pr_fixed','pr_qty','pr_rlo','pr_rhi','pr_value','pr_cap',
   'pr_base','pr_varc','pr_disc'].forEach(function(id){
    var el = $('#' + id);
    if(el) el.addEventListener('change', function(){
      if(lastPricing) renderPricing();
    });
  });
  var ps = $('#pr_pos');
  if(ps) ps.addEventListener('change', function(){ if(lastPricing) renderPricing(); });

  // ===== 方案合成 =====
  $('#btnSynthGen').onclick  = generatePlan;
  $('#btnSynthMd').onclick   = exportPlanMd;
  $('#btnSynthJson').onclick = exportPlanJson;

  // ===== 营销日历 =====
  $('#btnCalPrev').onclick = function(){
    state.cal.m--; if(state.cal.m < 0){ state.cal.m = 11; state.cal.y--; }
    save(); renderCal();
  };
  $('#btnCalNext').onclick = function(){
    state.cal.m++; if(state.cal.m > 11){ state.cal.m = 0; state.cal.y++; }
    save(); renderCal();
  };
  $('#btnCalToday').onclick = function(){
    var d = new Date(); state.cal.y = d.getFullYear(); state.cal.m = d.getMonth();
    save(); renderCal();
  };
  $('#btnCalAdd').onclick = function(){ openCalModal(null); };
  $('#btnCalNode').onclick = function(){ renderNodeChips(); $('#maskNode').classList.add('is-on'); };
  $('#btnCloseCal').onclick = function(){ $('#maskCal').classList.remove('is-on'); };
  $('#maskCal').onclick = function(e){ if(e.target === this) this.classList.remove('is-on'); };
  $('#btnCloseNode').onclick = function(){ $('#maskNode').classList.remove('is-on'); };
  $('#maskNode').onclick = function(e){ if(e.target === this) this.classList.remove('is-on'); };
  $('#btnEvSave').onclick = saveCalEvent;
  $('#btnEvDel').onclick = function(){
    if(!calEditingId) return;
    if(!confirm('删除这个事件？')) return;
    state.cal.events = (state.cal.events||[]).filter(function(x){ return x.id !== calEditingId; });
    save(); $('#maskCal').classList.remove('is-on'); renderCal(); toast('已删除');
  };

  // ===== Agent 导出 =====
  $('#btnExpStd').onclick = function(){
    var r = exportStd(); if(!r) return;
    downloadFile(r.name, r.text);
    setPreview('# 📐 标准 Agent JSON\n\n已导出 `' + r.name + '`\n\n```json\n' + r.text.slice(0, 2600) + (r.text.length>2600?'\n…（已截断）':'') + '\n```\n\n' +
      '**设计要点**\n\n- `steps` 里每一步标明 `executor`：确定性计算走 `type:function`，创作类走 `type:llm`\n' +
      '- `variables` 由各步 `output_var` 汇总，形成变量流\n- `on_error` 与 `quality_gate` 描述失败策略与质量关卡\n- `runtime.deterministic_tools` 列出本次实际用到的确定性函数\n\n' +
      '💡 同一套编排，人看是流程，Agent 看是可执行定义。');
    toast('已导出标准 Agent JSON');
  };
  $('#btnExpCoze').onclick = function(){
    var r = exportCoze(); if(!r) return;
    downloadFile(r.name, r.text);
    setPreview('# 🤖 Coze 工作流\n\n已导出 `' + r.name + '`\n\n```json\n' + r.text.slice(0, 2600) + (r.text.length>2600?'\n…':'') + '\n```\n\n' +
      '本地确定性函数导出为 Coze 的**自定义插件节点**，LLM 步骤导出为 LLM 节点。\n\n' +
      '> 注：Coze 节点结构版本差异较大，导入前可能需要在编辑器里微调字段。');
    toast('已导出 Coze 工作流');
  };
  $('#btnExpDify').onclick = function(){
    var r = exportDify(); if(!r) return;
    downloadFile(r.name, r.text);
    setPreview('# 🔧 Dify DSL\n\n已导出 `' + r.name + '`\n\n```json\n' + r.text.slice(0, 2600) + (r.text.length>2600?'\n…':'') + '\n```\n\n' +
      '确定性函数导出为 `type:tool` 节点并带 `tool_name`，LLM 步骤导出为 `type:llm` 节点。\n' +
      '失败策略映射：abort→fail-branch，skip→continue-on-error，retry→retry。');
    toast('已导出 Dify DSL');
  };

  // ===== Trace =====
  $('#btnTraceOpen').onclick = function(){
    renderTraceList();
    $('#maskTrace').classList.add('is-on');
  };
  $('#btnCloseTrace').onclick = function(){ $('#maskTrace').classList.remove('is-on'); };
  $('#maskTrace').onclick = function(e){ if(e.target === this) this.classList.remove('is-on'); };
  $('#btnTraceSave').onclick = function(){
    saveTrace();
    $('#maskTrace').classList.remove('is-on');
  };
  $('#btnTraceRunAll').onclick = function(){
    var els = document.querySelectorAll('#traceList > div[data-step]');
    var n = 0;
    [].forEach.call(els, function(el){
      var runBtn = el.querySelector('button');
      if(runBtn && runBtn.textContent.indexOf('运行') > -1){ runBtn.click(); n++; }
    });
    toast(n ? ('已执行 ' + n + ' 个本地步骤') : '本工作流没有可本地执行的步骤');
  };
  $('#btnTraceView').onclick = function(){
    setPreview(buildTraceReport()); toast('已生成 Trace 报告');
  };
  $('#btnTraceExp').onclick = function(){
    var txt = buildTraceReport();
    downloadFile('trace-' + Date.now() + '.md', txt, 'text/markdown;charset=utf-8');
    setPreview(txt); toast('已导出 Trace');
  };
  $('#btnTraceClear').onclick = function(){
    if(!confirm('清空所有执行记录？')) return;
    state.trace = {}; save(); updateTraceStat(); toast('已清空');
  };

  // 评分记录
  $('#btnScoreHist').onclick = showScoreHistory;
  $('#btnScoreClear').onclick = function(){
    if(!confirm('清空所有体检评分记录？')) return;
    state.scores = []; save(); renderScoreTrend(); toast('已清空评分记录');
  };

  // 图卡
  $('#btnStratChart').onclick = function(){
    // 按当前策略框架映射到对应图卡，并带项目名称过去
    var map = {'SWOT分析':'swot', '用户画像':'persona', '竞品对比':'pos', '项目复盘':'funnel'};
    var t = map[state.curStrat] || 'swot';
    state.chart.type = t;
    restoreChart();
    var nm = $('#s_name').value || '';
    if(t === 'swot' && nm && !$('#sw_title').value) $('#sw_title').value = nm + ' · SWOT 分析';
    if(t === 'pos' && nm && !$('#pm_title').value) $('#pm_title').value = nm + ' · 竞品定位地图';
    if(t === 'persona' && nm && !$('#pe_name').value) $('#pe_name').value = nm + ' · 核心用户';
    if(t === 'funnel' && nm && !$('#fu_title').value) $('#fu_title').value = nm + ' · 转化漏斗';
    saveChartData();
    gotoChart(t);
    toast('已切到图卡页，填数据即可出图');
  };
  $('#btnDrawChart').onclick = drawChart;
  $('#btnChartSvg').onclick = exportSvg;
  $('#btnChartPng').onclick = exportPng;
  $('#btnChartData').onclick = function(){
    var c = readChartData();
    copy(JSON.stringify(c.data, null, 2));
  };
  ['sw_s','sw_w','sw_o','sw_t','sw_title','pm_x','pm_y','pm_title','pm_pts',
   'pe_name','pe_age','pe_job','pe_goal','pe_pain','pe_quote','pe_ch',
   'fu_title','fu_stages'].forEach(function(id){
    var el = $('#' + id);
    if(el) el.addEventListener('input', function(){ saveChartData(); });
  });
  var pc = $('#pe_color'); if(pc) pc.addEventListener('change', function(){ saveChartData(); });

  // 知识库
  $('#btnAddFolder').onclick = function(){
    var n = prompt('新文件夹名称');
    if(n){ state.kb.folders.push({name:n, docs:[]}); state.kb.curFolder = state.kb.folders.length-1; renderKb(); updateKbStat(); save(); }
  };
  $('#btnDelFolder').onclick = function(){
    if(state.kb.folders.length <= 1){ toast('至少保留一个文件夹'); return; }
    if(!confirm('删除当前文件夹？')) return;
    state.kb.folders.splice(state.kb.curFolder,1); state.kb.curFolder = 0; state.kb.curDoc = -1;
    renderKb(); save();
  };
  $('#btnAddDoc').onclick = function(){
    state.kb.curDoc = -1;
    ['#d_title','#d_body','#d_tags','#d_link'].forEach(function(s){ $(s).value=''; });
    $('#docForm').style.display = 'block'; $('#docView').style.display = 'none';
  };
  $('#btnSaveDoc').onclick = function(){
    var f = state.kb.folders[state.kb.curFolder];
    var doc = {title:$('#d_title').value, body:$('#d_body').value,
               tags:$('#d_tags').value, link:$('#d_link').value};
    if(!doc.title && !doc.body){ toast('标题或正文至少填一项'); return; }
    if(state.kb.curDoc >= 0) f.docs[state.kb.curDoc] = doc; else { f.docs.push(doc); state.kb.curDoc = f.docs.length-1; }
    renderKb(); updateKbStat(); save(); toast('已保存');
  };
  $('#btnDelDoc').onclick = function(){
    var f = state.kb.folders[state.kb.curFolder];
    if(state.kb.curDoc < 0){ toast('请先选择文档'); return; }
    if(!confirm('删除该文档？')) return;
    f.docs.splice(state.kb.curDoc,1); state.kb.curDoc = -1;
    ['#d_title','#d_body','#d_tags','#d_link'].forEach(function(s){ $(s).value=''; });
    renderKb(); save();
  };
  $('#btnCancelDoc').onclick = function(){
    $('#docForm').style.display = 'none'; state.kb.curDoc = -1; renderKb();
  };

  // 导入导出
  $('#btnExport').onclick = function(){
    var blob = new Blob([JSON.stringify(state, null, 2)], {type:'application/json'});
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'ym-studio-config.json';
    a.click(); toast('配置已导出');
  };
  $('#btnImport').onclick = function(){ $('#fileImport').click(); };
  $('#fileImport').onchange = function(){
    var file = this.files[0]; if(!file) return;
    var fr = new FileReader();
    fr.onload = function(){
      try{
        var o = JSON.parse(fr.result);
        for(var k in o){ state[k] = o[k]; }
        restoreAll(); save(); toast('配置已导入 ✅');
      }catch(e){ toast('文件格式错误'); }
    };
    fr.readAsText(file);
    this.value = '';
  };
}
