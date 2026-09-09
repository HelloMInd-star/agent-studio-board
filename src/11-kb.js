/* ================= 渲染：知识库 ================= */
function renderKb(){
  var fh = $('#kbFolders'); fh.innerHTML = '';
  state.kb.folders.forEach(function(f, i){
    var d = document.createElement('div');
    d.className = 'kb__folder' + (state.kb.curFolder === i ? ' is-on' : '');
    d.innerHTML = '<span>📁 ' + f.name + '</span><span>' + f.docs.length + '</span>';
    d.onclick = function(){ state.kb.curFolder = i; state.kb.curDoc = -1; renderKb(); updateKbStat(); save(); };
    fh.appendChild(d);
  });
  var dh = $('#kbDocs'); dh.innerHTML = '';
  var f = state.kb.folders[state.kb.curFolder];
  if(!f) return;
  if(!f.docs.length){
    dh.innerHTML = '<div style="padding:14px;color:var(--soft);font-size:12.5px">此文件夹暂无文档</div>';
  }
  f.docs.forEach(function(doc, i){
    var d = document.createElement('div');
    d.className = 'kb__doc' + (state.kb.curDoc === i ? ' is-on' : '');
    d.innerHTML = '<span>📄 ' + (doc.title || '未命名') + '</span>';
    d.onclick = function(){
      state.kb.curDoc = i;
      $('#d_title').value = doc.title || '';
      $('#d_body').value = doc.body || '';
      $('#d_tags').value = doc.tags || '';
      $('#d_link').value = doc.link || '';
      $('#docForm').style.display = 'block';
      $('#docView').style.display = 'none';
      renderKb(); save();
    };
    dh.appendChild(d);
  });
}
