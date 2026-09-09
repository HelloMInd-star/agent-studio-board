/* ================= 回填 ================= */
function restoreAll(){
  document.documentElement.setAttribute('data-theme', state.theme);
  $('#btnTheme').textContent = state.theme === 'dark' ? '☀️ 浅色' : '🌙 深色';
  $('#memOn').checked = state.memOn;
  $('#defRole').value = state.defRole || '';
  $('#defTone').value = state.defTone || '';
  $('#curAgent').textContent = state.defRole || '提示词工坊';

  state.brand = state.brand || {name:'',cat:'',aud:'',usp:'',ban:''};
  $('#m_brand').value = state.brand.name || '';
  $('#m_cat').value   = state.brand.cat || '';
  $('#m_aud').value   = state.brand.aud || '';
  $('#m_usp').value   = state.brand.usp || '';
  $('#m_ban').value   = state.brand.ban || '';
  $('#kbUse').checked = state.kbUse !== false;
  $('#kbScope').value = state.kbScope || 'all';
  $('#kbMax').value   = state.kbMax || '5';

  $('#r_role').value = state.role.role || ''; $('#r_task').value = state.role.task || '';
  $('#r_bg').value = state.role.bg || '';     $('#r_req').value = state.role.req || '';
  $('#r_ex').value = state.role.ex || '';

  var c = state.content;
  $('#c_title').value = c.title || ''; $('#c_kw').value = c.kw || '';
  $('#c_platform').value = c.platform || '小红书'; $('#c_len').value = c.len || '800 字';
  $('#c_style').value = c.style || '专业干货型'; $('#c_aud').value = c.aud || '';
  $('#c_ref').value = c.ref || ''; $('#c_extra').value = c.extra || '';

  $('#s_name').value = state.strat.name || ''; $('#s_bg').value = state.strat.bg || '';
  $('#s_extra').value = state.strat.extra || '';

  var sel = $('#p_type'); sel.innerHTML = '';
  MBTI.forEach(function(m){
    var o = document.createElement('option'); o.textContent = m;
    if(m === state.persona.type) o.selected = true;
    sel.appendChild(o);
  });
  $('#p_flavor').value = state.persona.flavor || '酸甜/果味';
  $('#p_abv').value = state.persona.abv || '中高度';
  $('#p_occ').value = state.persona.occ || '';

  $('#f_goal').value = state.flow.goal || '';
  $('#f_bg').value = state.flow.bg || '';

  renderPresets(); renderStratChips(); renderFlowChips(); renderSteps(); renderKb();
  updateKbStat();
  state.chart = state.chart || {type:'swot',swot:{},pos:{},persona:{color:'indigo'},funnel:{}};
  state.chart.swot = state.chart.swot || {};
  state.chart.pos = state.chart.pos || {};
  state.chart.persona = state.chart.persona || {color:'indigo'};
  state.chart.funnel = state.chart.funnel || {};
  restoreChart(); renderChartChips();
  state.stratMode = state.stratMode || 'prompt';
  state.tool = state.tool || {type:'comp',comp:{dims:'',rows:''},stp:{rows:''},cal:{picked:[],custom:'',lead:'30'}};
  state.tool.comp = state.tool.comp || {dims:'',rows:''};
  state.tool.stp = state.tool.stp || {rows:''};
  state.tool.cal = state.tool.cal || {picked:[],custom:'',lead:'30'};
  $('#stratPromptMode').style.display = state.stratMode==='prompt' ? '' : 'none';
  $('#stratCalcMode').style.display   = state.stratMode==='calc'   ? '' : 'none';
  renderStratMode(); restoreTool(); renderToolChips();
  state.trace = state.trace || {};
  updateTraceStat();
  state.chat = state.chat || []; state.blocks = state.blocks || [];
  state.net = state.net || {on:false, provider:'deepseek', key:'', base:''};
  renderChat(); renderBlocks();
  state.cal = state.cal || {y:new Date().getFullYear(), m:new Date().getMonth(), events:[]};
  state.cal.events = state.cal.events || [];
  renderCal();
  renderSynthSecs();
  renderSynthSources();

  /* 定价策略：回填表单 + 参数齐全自动算一次 */
  state.pricing = state.pricing || {};
  var pm = {pr_cost:'cost', pr_gm:'gm', pr_fixed:'fixed', pr_qty:'qty',
            pr_rlo:'rlo', pr_rhi:'rhi', pr_value:'value', pr_cap:'cap',
            pr_base:'base', pr_varc:'varc', pr_disc:'disc'};
  Object.keys(pm).forEach(function(id){
    var el = $('#' + id);
    if(el && state.pricing[pm[id]] !== undefined) el.value = state.pricing[pm[id]];
  });
  var ppos = $('#pr_pos');
  if(ppos && state.pricing.pos) ppos.value = state.pricing.pos;
  // 保存：输入即存
  Object.keys(pm).forEach(function(id){
    var el = $('#' + id);
    if(el) el.addEventListener('input', function(){
      state.pricing[pm[id]] = el.value; save();
    });
  });
  if(ppos) ppos.addEventListener('change', function(){
    state.pricing.pos = ppos.value; save();
  });
  if($('#pr_cost') && $('#pr_cost').value && $('#pr_rlo').value && $('#pr_rhi').value){
    renderPricing();
  }

  /* 区域市场 + 竞品档案：回填 */
  state.region = state.region || {rows:''};
  if($('#rg_rows')) $('#rg_rows').value = state.region.rows || '';
  state.rivals = state.rivals || [];
  renderRivals();
  if(state.region.rows) renderRegion();

  /* 热点决策：回填 */
  state.hotspot = state.hotspot || {};
  var hsMap = {hs_topic:'topic', hs_way:'way'};
  Object.keys(hsMap).forEach(function(id){
    var el = $('#' + id);
    if(el && state.hotspot[hsMap[id]] !== undefined){
      el.value = state.hotspot[hsMap[id]];
      el.addEventListener('input', function(){ state.hotspot[hsMap[id]] = el.value; save(); });
    }
  });
  ['rel','time','risk','fit','value'].forEach(function(k){
    var el = $('#hs_' + k);
    if(el && state.hotspot[k] !== undefined){
      el.value = state.hotspot[k];
      var lab = $('#hs_' + k + '_v'); if(lab) lab.textContent = el.value;
      el.addEventListener('input', function(){ state.hotspot[k] = el.value; save(); });
    }
  });
  if($('#hs_topic') && $('#hs_topic').value) renderHotspot();

  /* 调研方案：模板 chips + 回填 */
  var rt = $('#rsTpls');
  if(rt){
    rt.innerHTML = '';
    Object.keys(RS_TEMPLATES).forEach(function(k){
      var t = RS_TEMPLATES[k];
      var b = document.createElement('button');
      b.className = 'chip' + (rs().tpl === k ? ' is-on' : '');
      b.textContent = t.icon + ' ' + t.n;
      b.onclick = function(){
        [].forEach.call(rt.children, function(x){ x.classList.remove('is-on'); });
        b.classList.add('is-on');
        applyTpl(k);
      };
      rt.appendChild(b);
    });
  }
  var R0 = rs();
  if(!R0.assumptions.length && !R0.segs.length) applyTpl(R0.tpl || 'consumer');
  else renderRsAll();
  var rn0 = $('#rs_name'); if(rn0) rn0.value = R0.name || '';
  var m = R0.market || {};
  if($('#rs_users')) $('#rs_users').value = m.users || '';
  if($('#rs_arpu'))  $('#rs_arpu').value  = m.arpu  || '';
  if($('#rs_samr'))  $('#rs_samr').value  = m.samRate || 100;
  if($('#rs_somr'))  $('#rs_somr').value  = m.somRate || 1;
  var w0 = R0.wtp || {};
  if($('#rs_prices')) $('#rs_prices').value = w0.prices || '0,9.9,19,39,99';
  if($('#rs_counts')) $('#rs_counts').value = w0.counts || '';
  if($('#rs_target')) $('#rs_target').value = w0.target || '';
  var f0 = R0.feas || {};
  if($('#rs_stages')) $('#rs_stages').value = f0.stages || '';
  if($('#rs_risks'))  $('#rs_risks').value  = f0.risks  || '';
  if($('#rs_uunit') && m.unit) $('#rs_uunit').value = m.unit;
  bindUnit();
  calcTAM(); calcWTP();

  /* 战略矩阵：回填 */
  renderStratAll();

  /* 财务测算：回填 */
  var F = fin();
  var fg = F.gmv || {};
  ['pT','pC','pA','pR','nT','nC','nA','nR'].forEach(function(k){
    var e = $('#g_' + k); if(e) e.value = fg[k] || '';
  });
  var fl = F.ltv || {};
  ['aov','freq','life','gm','cac','ret'].forEach(function(k){
    var e = $('#l_' + k); if(e) e.value = fl[k] || '';
  });
  if($('#b_goals')) $('#b_goals').value = (F.budget||{}).goals || '';
  if($('#b_rows'))  $('#b_rows').value  = (F.budget||{}).rows  || '';
  if($('#r_dims'))  $('#r_dims').value  = (F.radar||{}).dims   || '';
  if($('#r_rows'))  $('#r_rows').value  = (F.radar||{}).rows   || '';
  if(fg.pT && fg.nT) calcGmv();
  if(fl.aov && fl.cac) calcLtv();

  /* 开始页：默认打开，先解决「从哪开始」 */
  renderGuideAll();

  /* sticky 偏移同步：topbar 换行后高度变化，Tab 栏要跟着下移 */
  function syncSticky(){
    var tb = document.querySelector('.topbar');
    var tabs = document.querySelector('.tabs');
    if(tb && tabs) tabs.style.top = tb.offsetHeight + 'px';
  }
  syncSticky();
  window.addEventListener('resize', syncSticky);
  state.scores = state.scores || [];
  renderScoreTrend();
}

/* ================= 启动 ================= */
load();
bind();
restoreAll();
renderScoreTrend();
})();
