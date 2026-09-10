/* ================= 渲染：预设 chips ================= */
function renderPresets(){
  var host = $('#presetChips'); host.innerHTML = '';
  PRESETS.forEach(function(p){
    var b = document.createElement('button');
    b.className = 'chip' + (state.curPreset === p.n ? ' is-on' : '');
    b.textContent = p.n;
    b.onclick = function(){
      state.curPreset = p.n;
      $('#r_role').value = p.role; $('#r_task').value = p.task;
      $('#r_req').value = p.req;   $('#r_ex').value = p.ex;
      state.role = {role:p.role,task:p.task,bg:$('#r_bg').value,req:p.req,ex:p.ex};
      $('#curAgent').textContent = p.n;
      renderPresets(); save();
      toast('已载入预设：' + p.n);
    };
    host.appendChild(b);
  });
}
function renderStratChips(){
  var host = $('#stratChips'); host.innerHTML = '';
  STRATS.forEach(function(s){
    var b = document.createElement('button');
    b.className = 'chip' + (state.curStrat === s.k ? ' is-on' : '');
    b.textContent = s.k; b.title = s.d;
    b.onclick = function(){ state.curStrat = s.k; renderStratChips(); save(); };
    host.appendChild(b);
  });
}
function renderFlowChips(){
  var host = $('#flowChips'); host.innerHTML = '';
  FLOW_PRESETS.forEach(function(f){
    var b = document.createElement('button');
    b.className = 'chip';
    b.textContent = f.n;
    b.onclick = function(){
      state.flow.goal = f.goal; $('#f_goal').value = f.goal;
      state.flow.steps = f.steps.map(function(s){ return {t:s.t, tool:s.tool, inVar:s.inVar||'', outVar:s.outVar||'', fail:s.fail||'retry', gate:s.gate||0}; });
      renderSteps(); save(); toast('已载入链路：' + f.n);
    };
    host.appendChild(b);
  });
}

/* ================= 渲染：工作流步骤 ================= */
function renderSteps(){
  var host = $('#steps'); host.innerHTML = '';
  state.flow.steps.forEach(function(s, i){
    s.inVar = s.inVar || ''; s.outVar = s.outVar || '';
    s.fail = s.fail || 'retry'; s.gate = s.gate || 0;
    var d = document.createElement('div'); d.className = 'step';

    /* 头部：序号 + 输出变量名 + 删除 */
    var hd = document.createElement('div'); hd.className = 'step__hd';
    var no = document.createElement('span'); no.className = 'step__no'; no.textContent = (i+1) + '.';
    var outBox = document.createElement('span'); outBox.className = 'step__out';
    outBox.textContent = '→ ' + (s.outVar || '?');
    if(!s.outVar) outBox.style.color = 'var(--alert)';
    var del = document.createElement('button'); del.className = 'step__del'; del.textContent = '✕';
    del.onclick = function(){ state.flow.steps.splice(i,1); renderSteps(); save(); };
    hd.appendChild(no); hd.appendChild(outBox); hd.appendChild(del);
    d.appendChild(hd);

    /* 指令 */
    var ta = document.createElement('textarea');
    ta.value = s.t; ta.placeholder = '这一步具体做什么（越具体，AI 执行越准）';
    ta.oninput = function(){ s.t = ta.value; save(); };
    d.appendChild(ta);

    /* 变量契约 */
    var io = document.createElement('div'); io.className = 'step__io';
    var iw = document.createElement('label'); iw.className = 'iofield';
    iw.innerHTML = '<span>输入（引用上游变量）</span>';
    var ii = document.createElement('input'); ii.type = 'text';
    ii.value = s.inVar; ii.placeholder = '例：{{formulas}},{{drafts}}';
    ii.oninput = function(){ s.inVar = ii.value; renderSteps(); save(); };
    iw.appendChild(ii); io.appendChild(iw);

    var ow = document.createElement('label'); ow.className = 'iofield';
    ow.innerHTML = '<span>输出变量名</span>';
    var oi = document.createElement('input'); oi.type = 'text';
    oi.value = s.outVar; oi.placeholder = '例：drafts';
    oi.oninput = function(){ s.outVar = oi.value.trim(); renderSteps(); save(); };
    ow.appendChild(oi); io.appendChild(ow);
    d.appendChild(io);

    /* 失败策略 + 质量关卡 */
    var ctl = document.createElement('div'); ctl.className = 'step__ctl';
    var fl = document.createElement('label'); fl.className = 'iofield iofield--sm';
    fl.innerHTML = '<span>失败时</span>';
    var fs = document.createElement('select');
    [['retry','重试'],['skip','跳过继续'],['abort','终止流程']].forEach(function(o){
      var op = document.createElement('option'); op.value=o[0]; op.textContent=o[1];
      if(s.fail===o[0]) op.selected = true; fs.appendChild(op);
    });
    fs.onchange = function(){ s.fail = fs.value; save(); };
    fl.appendChild(fs); ctl.appendChild(fl);

    var gl = document.createElement('label'); gl.className = 'iofield iofield--sm';
    gl.innerHTML = '<span>质量关卡（体检分门槛，0=不设）</span>';
    var gs = document.createElement('select');
    [['0','不设'],['60','≥60'],['70','≥70'],['80','≥80'],['90','≥90']].forEach(function(o){
      var op = document.createElement('option'); op.value=o[0]; op.textContent=o[1];
      if(String(s.gate)===o[0]) op.selected = true; gs.appendChild(op);
    });
    gs.onchange = function(){ s.gate = parseInt(gs.value,10)||0; save(); };
    gl.appendChild(gs); ctl.appendChild(gl);
    d.appendChild(ctl);

    /* 工具选择 */
    var tools = document.createElement('div'); tools.className = 'tools';
    TOOLS.forEach(function(t, ti){
      var b = document.createElement('button');
      b.className = 'tool' + (s.tool === ti ? ' is-on' : '');
      b.textContent = t;
      b.onclick = function(){ s.tool = ti; renderSteps(); save(); };
      tools.appendChild(b);
    });
    d.appendChild(tools);

    host.appendChild(d);
  });
  updateFlowDiag();
}

/* 校验变量引用是否指向上游已定义的变量 */
function validateFlow(){
  var defined = {}, errs = [], warns = [];
  state.flow.steps.forEach(function(s, i){
    var refs = (s.inVar || '').match(/\{\{\s*([A-Za-z_][A-Za-z0-9_]*)\s*\}\}/g) || [];
    refs.forEach(function(r){
      var name = r.replace(/[{}]/g,'').trim();
      if(!defined[name]) errs.push('步骤 ' + (i+1) + ' 引用了未定义的变量 ' + r);
    });
    if(s.outVar){
      if(defined[s.outVar]) warns.push('步骤 ' + (i+1) + ' 的输出变量名「' + s.outVar + '」与上游重名，会覆盖');
      defined[s.outVar] = 1;
    } else {
      warns.push('步骤 ' + (i+1) + ' 未定义输出变量名，下游无法引用');
    }
  });
  return {errs:errs, warns:warns};
}

/* 数据流图：用文本展示变量流向，让面试官一眼看懂 */
function updateFlowDiag(){
  var el = $('#flowDiag'); if(!el) return;
  var v = validateFlow();
  var lines = [];
  state.flow.steps.forEach(function(s, i){
    var ins = (s.inVar || '').trim();
    var outs = (s.outVar || '?').trim();
    lines.push((i+1) + '. ' + (ins ? ins + '  →  ' : '（起始）  →  ') + '**' + outs + '**' +
      (s.gate ? '　🚧≥' + s.gate : '') + '　·失败:' + ({retry:'重试',skip:'跳过',abort:'终止'}[s.fail]||'重试'));
  });
  var h = lines.join('\n\n');
  if(v.errs.length){
    h += '\n\n❌ **错误**\n- ' + v.errs.join('\n- ');
  }
  if(v.warns.length){
    h += '\n\n⚠️ **提醒**\n- ' + v.warns.slice(0,4).join('\n- ');
  }
  if(!v.errs.length && !v.warns.length){
    h += '\n\n✅ 变量流校验通过，' + state.flow.steps.length + ' 个节点，' +
         state.flow.steps.filter(function(x){return x.gate>0;}).length + ' 个质量关卡。';
  }
  el.innerHTML = mdLite(h);
}
