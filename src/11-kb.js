/* ================= 渲染：知识库 ================= */

/* 知识库软上限（软 = 提醒，不阻止）
 *
 * 为什么需要：知识库是全站唯一「无条数上限 + 高频粘贴长文」的地方，
 * 也是撑爆 localStorage（约 5MB）的主要路径。
 * 其他增长项都有截断保护：scores 100 条、chat 60 条、history 50 条。
 *
 * 为什么不硬限制：用户有权存长资料，硬拦会让人难受。
 * 做法是「知情」而非「禁止」——超阈值时告知占用并建议拆分。
 */
var KB_DOC_SOFT_CHARS = 50000;   /* 单篇约 5 万字 ≈ 100 KB，触发确认 */
var KB_TOTAL_WARN_B   = 2 * 1024 * 1024;  /* 知识库总量 > 2MB 时提示一次 */
var KB_TOTAL_WARN_N   = 50;               /* 知识库 > 50 篇时提示一次 */
var kbWarnShown = false;

/* 统计知识库占用（UTF-16 计） */
function kbUsageStat(){
  var n = 0, b = 0, big = 0;
  (state.kb && state.kb.folders ? state.kb.folders : []).forEach(function(f){
    (f.docs || []).forEach(function(d){
      n++;
      var sz = ((d.body || '').length + (d.title || '').length) * 2;
      b += sz;
      if (sz > 100 * 1024) big++;
    });
  });
  return { n:n, b:b, big:big };
}
function kbFmt(b){
  if (b < 1024) return b + ' B';
  if (b < 1024 * 1024) return (b / 1024).toFixed(1) + ' KB';
  return (b / 1024 / 1024).toFixed(2) + ' MB';
}
/* 保存后调用：接近风险时提示一次（不重复打扰） */
function kbWarnIfLarge(){
  if (kbWarnShown) return;
  var u = kbUsageStat();
  if (u.b > KB_TOTAL_WARN_B || u.n >= KB_TOTAL_WARN_N) {
    kbWarnShown = true;
    toast('知识库已存 ' + u.n + ' 篇 / ' + kbFmt(u.b) +
          '，是存储占用最大项。可在「⚙️ 系统设置」查看明细并导出备份');
  }
}

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
  renderKbUsage();
}

/* 文档列表底部显示占用 —— 让「知识库很占地方」这件事可见，
   而不是等存储出问题才发现。超过软上限时变橙提示。 */
function renderKbUsage(){
  var host = $('#kbUsage'); if(!host) return;
  var u = kbUsageStat();
  if (!u.n) { host.innerHTML = ''; return; }
  var over = u.b > KB_TOTAL_WARN_B || u.n >= KB_TOTAL_WARN_N;
  host.innerHTML =
    '<div class="kbusg' + (over ? ' kbusg--over' : '') + '">' +
    '<span>💾 共 ' + u.n + ' 篇 · ' + kbFmt(u.b) + '</span>' +
    (over ? '<span>建议导出备份后清理旧资料</span>'
          : (u.big ? '<span>其中 ' + u.big + ' 篇超过 100 KB</span>' : '<span>存储占用正常</span>')) +
    '</div>';
}
