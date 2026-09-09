/* ============ 品牌记忆 ============ */
/* 生成时从输入框实时读取，避免粘贴 / 自动填充不触发 oninput 导致漏注入 */
function readBrand(){
  var g = function(id, k){
    var el = $('#' + id);
    var v = el && el.value ? el.value.trim() : (state.brand[k] || '');
    return v;
  };
  state.brand.name = g('m_brand','name');
  state.brand.cat  = g('m_cat','cat');
  state.brand.aud  = g('m_aud','aud');
  state.brand.usp  = g('m_usp','usp');
  state.brand.ban  = g('m_ban','ban');
  var rEl = $('#defRole'), tEl = $('#defTone');
  state.defRole = (rEl && rEl.value) ? rEl.value.trim() : (state.defRole || '');
  state.defTone = (tEl && tEl.value) ? tEl.value.trim() : (state.defTone || '');
  return state.brand;
}

function brandCtx(){
  if(!state.memOn) return [];
  var b = readBrand();
  var out = [];
  if(b.name) out.push('品牌名：' + b.name);
  if(b.cat)  out.push('品类：' + b.cat);
  if(b.aud)  out.push('目标人群：' + b.aud);
  if(b.usp)  out.push('核心卖点：' + b.usp);
  if(state.defRole) out.push('专家角色：' + state.defRole);
  if(state.defTone) out.push('语气/风格：' + state.defTone);
  if(b.ban)  out.push('禁用词（严禁出现）：' + b.ban);
  return out;
}

/* 品牌禁用词 -> 供违禁词扫描使用 */
function brandBanList(){
  var b = readBrand();
  if(!b.ban) return [];
  return b.ban.split(/[,，、;；\s]+/).filter(function(w){ return w && w.length < 20; })
    .map(function(w){ return {t:w, lv:'red', why:'品牌自定义禁用词', fix:'删除或替换为品牌允许的表述', law:'品牌记忆 · 禁用词'}; });
}

/* ============ 知识库引用 ============ */
/* 收集可引用的文档：scope=all 全部 / cur 仅当前文件夹 */
function collectKbDocs(){
  var sel = $('#kbScope');
  var scope = sel ? sel.value : (state.kbScope || 'all');
  var maxEl = $('#kbMax');
  var max = parseInt((maxEl && maxEl.value) || state.kbMax || '5', 10);
  var useEl = $('#kbUse');
  var use = useEl ? useEl.checked : state.kbUse;
  if(!use || scope === 'off') return {docs:[], total:0, folder:''};

  var out = [];
  if(scope === 'cur'){
    var f = state.kb.folders[state.kb.curFolder];
    if(f) f.docs.forEach(function(d){ out.push({folder:f.name, doc:d}); });
  } else {
    state.kb.folders.forEach(function(f){
      f.docs.forEach(function(d){ out.push({folder:f.name, doc:d}); });
    });
  }
  // 排除词库本身（那是规则库，不是内容素材）
  out = out.filter(function(x){ return x.folder.indexOf('违禁词') === -1; });
  return {docs: out.slice(0, max), total: out.length, folder: scope === 'cur' ? (state.kb.folders[state.kb.curFolder]||{}).name || '' : '全部'};
}

/* 把知识库内容渲染成可注入的文本块 */
function kbContext(){
  var c = collectKbDocs();
  if(!c.docs.length) return '';
  var s = '## 参考资料（来自品牌知识库 · ' + c.folder + '，共引用 ' + c.docs.length + ' 篇）\n\n';
  c.docs.forEach(function(x, i){
    var d = x.doc;
    s += '### [' + x.folder + '] ' + (d.title || '未命名') + '\n';
    if(d.tags) s += '（标签：' + d.tags + '）\n';
    s += '\n' + (d.body || '').slice(0, 1200) + '\n\n';
  });
  s += '---\n请优先基于以上真实资料创作，不要编造与资料冲突的信息。资料未覆盖的部分可以合理补充并标注。\n';
  return s;
}

/* 更新左栏「可引用文档数」提示 */
function updateKbStat(){
  var el = $('#kbStat'); if(!el) return;
  var c = collectKbDocs();
  el.textContent = c.docs.length
    ? '当前可引用 ' + c.docs.length + ' 篇' + (c.total > c.docs.length ? '（共 ' + c.total + ' 篇，超出部分未引用）' : '')
    : '当前可引用 0 篇 —— 去「📚 品牌知识库」添加内容';
}
function wrapWithBrand(body, title){
  var ctx = brandCtx();
  var head = '# ' + title + '\n\n';
  if(ctx.length){
    head += '## 全局品牌语境（自动注入）\n' + ctx.map(function(c){ return '- ' + c; }).join('\n') + '\n\n';
  }
  head += '---\n\n';
  // 知识库资料排在正文之前，作为 AI 的创作依据
  var kb = kbContext();
  if(kb) head += kb + '\n';
  return head + body;
}
