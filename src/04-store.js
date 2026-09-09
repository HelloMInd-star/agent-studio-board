/* ================= 读写 ================= */
function save(){
  try{ localStorage.setItem(KEY, JSON.stringify(state)); }catch(e){}
}
function load(){
  try{
    var s = localStorage.getItem(KEY);
    if(s){ var o = JSON.parse(s); for(var k in o){ state[k]=o[k]; } }
  }catch(e){}
  if(!state.flow.steps || !state.flow.steps.length) state.flow.steps = defaultSteps();
  if(!state.kb || !state.kb.folders || !state.kb.folders.length){
    state.kb = {folders:[{name:'品牌资产',docs:[]},{name:'竞品素材',docs:[]},{name:'用户原声',docs:[]},
      {name:'违禁词库',docs:[{title:'自定义词库（可编辑）',
        body:'# 自定义违禁词库\n\n在这里增删词条，扫描时会自动与内置词库合并。\n每行一个词，用 `##` 分节。**改完记得点「💾 保存」**\n\n## 红线词\n\n- 例：全网最低\n\n## 风险词\n\n- 例：顶级工艺\n\n## 平台敏感词\n\n- 例：私聊\n',
        tags:'合规,词库', link:''}]},
      {name:'爆款素材',docs:[]}],curFolder:0,curDoc:-1};
  }
}
function defaultSteps(){
  return FLOW_PRESETS[0].steps.map(function(s){ return {t:s.t, tool:s.tool, inVar:s.inVar||'', outVar:s.outVar||'', fail:s.fail||'retry', gate:s.gate||0}; });
}

/* ================= UI 工具 ================= */
function toast(m){
  var t = $('#toast'); t.textContent = m; t.classList.add('is-on');
  setTimeout(function(){ t.classList.remove('is-on'); }, 1800);
}
/* 预览区轻量 Markdown 渲染：先转义再渲染，避免 XSS */
/* 把 markdown 表格行转成 <table>，其余文本原样返回 */
function mdTable(lines, i){
  // lines[i] 是表头行，lines[i+1] 是分隔行
  var cells = function(l){
    return l.replace(/^\s*\|/,'').replace(/\|\s*$/,'').split('|').map(function(x){ return x.trim(); });
  };
  var head = cells(lines[i]);
  var body = [];
  var j = i + 2;
  while(j < lines.length && /\|/.test(lines[j]) && lines[j].trim()){
    body.push(cells(lines[j])); j++;
  }
  var h = '<table class="mdtbl"><thead><tr>';
  head.forEach(function(c){ h += '<th>' + c + '</th>'; });
  h += '</tr></thead><tbody>';
  body.forEach(function(r){
    h += '<tr>';
    r.forEach(function(c){ h += '<td>' + c + '</td>'; });
    h += '</tr>';
  });
  h += '</tbody></table>';
  return {html:h, next:j};
}

function mdLite(s){
  if(!s) return '';
  var h = s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

  // 逐行处理：识别 markdown 表格
  var lines = h.split('\n');
  var blocks = [], buf = [], i = 0;
  while(i < lines.length){
    if(/\|/.test(lines[i]) && /^\s*\|/.test(lines[i]) &&
       i + 1 < lines.length && /^\s*\|[\s:|-]+\|\s*$/.test(lines[i+1])){
      if(buf.length){ blocks.push({t:'raw', v:buf.join('\n')}); buf = []; }
      var r = mdTable(lines, i);
      blocks.push({t:'table', v:r.html});
      i = r.next;
    } else { buf.push(lines[i]); i++; }
  }
  if(buf.length) blocks.push({t:'raw', v:buf.join('\n')});

  h = blocks.map(function(b){ return b.v; }).join('\n');

  // 表格块内部已有 HTML，标题/加粗只在非表格片段生效的影响可忽略（** 已在单元格内）
  h = h.replace(/^### (.*)$/gm,'<b style="color:var(--brand)">$1</b>')
       .replace(/^## (.*)$/gm,'<b style="font-size:14.5px">$1</b>')
       .replace(/^# (.*)$/gm,'<b style="font-size:15.5px">$1</b>')
       .replace(/\*\*([^*]+)\*\*/g,'<b>$1</b>');
  // 表格块内的换行不能转成 <br>，否则 <table> 被破坏
  h = h.replace(/<\/table>\n/g,'</table>');
  return h.replace(/\n/g,'<br>');
}
/* 记住「待检原文」：体检报告本身含免责声明里的敏感词，避免重复扫描时自我命中
   注意：mdLite 会把「## 」渲染掉，所以标记必须取渲染后仍存在的文字 */
var SCAN_MARK = '内容体检报告';
var lastScanSrc = '';
var lastScan = null;   // 最近一次体检结果，供误报反馈引用
/* 判断一段文本是否为体检报告本身（标题前带 emoji 和 ##，故取前段做包含判断） */
function isReport(txt){
  if(!txt) return false;
  return txt.replace(/^[#\s]+/,'').slice(0, 40).indexOf(SCAN_MARK) > -1;
}
function setPreview(txt){
  var el = $('#preview');
  if(!txt){ el.textContent = '⚠️ 请填写字段或选择预设。'; }
  else { el.innerHTML = mdLite(txt); }
  // 注意 out 原文以「## 」开头，需先剥掉 # 再比对，否则会被报告覆盖
  if(!isReport(txt)) lastScanSrc = txt;
  $('#charCount').textContent = (txt||'').length + ' 字符';
}
function copy(txt){
  if(!txt){ toast('没有可复制的内容'); return; }
  if(navigator.clipboard && navigator.clipboard.writeText){
    navigator.clipboard.writeText(txt).then(function(){ toast('已复制 ✅'); },
      function(){ fallbackCopy(txt); });
  } else fallbackCopy(txt);
}
function fallbackCopy(txt){
  var ta = document.createElement('textarea');
  ta.value = txt; ta.style.position='fixed'; ta.style.opacity='0';
  document.body.appendChild(ta); ta.select();
  try{ document.execCommand('copy'); toast('已复制 ✅'); }catch(e){ toast('复制失败，请手动选择'); }
  document.body.removeChild(ta);
}
function pushHistory(title, txt){
  state.history.unshift({t:title, p:txt, d:new Date().toLocaleString('zh-CN')});
  if(state.history.length > 50) state.history.length = 50;
  save();
}
