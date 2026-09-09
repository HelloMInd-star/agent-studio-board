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
