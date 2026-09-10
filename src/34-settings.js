/* ============================================================
 * 34-settings.js —— 系统设置
 *
 * 定位：这不是功能，是基础设施。
 *
 * 为什么要做：
 *   全站数据存在 localStorage，有 save() / load()，但**没有任何备份出口**。
 *   清一次浏览器缓存，品牌内核、竞品档案、调研方案、战略矩阵
 *   这些最难重建的「思考成果」就全没了。
 *
 *   这与「数据不出浏览器」的隐私卖点形成一个自相矛盾：
 *     数据不外泄（好）  ——  但也无备份（坏）
 *   本地导出备份，是这个隐私卖点的必需配套。
 *   否则「不出浏览器」就变成了「丢了就真没了」。
 *
 * 设计原则：克制。
 *   只做真正有用的 6 类，不做账号 / 云同步 / 多语言 / 快捷键 / 插件市场。
 * ============================================================ */

/* 全部 Tab，供「默认打开」选择 */
var SET_TABS = [
  { k:'guide',    n:'🧭 开始' },
  { k:'hotspot',  n:'📡 热点决策' },
  { k:'research', n:'📐 调研方案' },
  { k:'strat',    n:'🎯 战略矩阵' },
  { k:'tkm',      n:'🧰 经典工具' },
  { k:'toolmap',  n:'🗺️ 工具地图' },
  { k:'persona',  n:'🏛️ 品牌内核' },
  { k:'strategy', n:'📊 策略模板' },
  { k:'pricing',  n:'💰 定价策略' },
  { k:'market',   n:'🌏 市场与竞品' },
  { k:'fin',      n:'💹 财务测算' },
  { k:'role',     n:'🧠 营销角色' },
  { k:'content',  n:'✍️ 内容工厂' },
  { k:'chart',    n:'📊 商业图卡' },
  { k:'flow',     n:'🔗 营销工作流' },
  { k:'agent',    n:'💬 Agent 工作台' },
  { k:'cal',      n:'📅 营销日历' },
  { k:'synth',    n:'📋 方案合成' },
  { k:'kb',       n:'📚 品牌知识库' },
  { k:'timeline', n:'🕐 品牌轨迹' },
  { k:'settings', n:'⚙️ 系统设置' }
];

/* ---------- 工具 ---------- */
function setTodayStr(){
  var d = new Date();
  return d.getFullYear() + '-' +
         String(d.getMonth() + 1).padStart(2, '0') + '-' +
         String(d.getDate()).padStart(2, '0');
}
function setBytes(){
  try {
    var s = localStorage.getItem(KEY) || '';
    return (new Blob([s])).size;
  } catch (e) {
    return (JSON.stringify(state) || '').length;
  }
}
function setFmtBytes(b){
  if (!b) return '0 B';
  if (b < 1024) return b + ' B';
  if (b < 1024 * 1024) return (b / 1024).toFixed(1) + ' KB';
  return (b / 1024 / 1024).toFixed(2) + ' MB';
}
/* localStorage 上限通常 5MB，用占比提示风险 */
function setUsagePct(){
  var b = setBytes();
  var cap = 5 * 1024 * 1024;
  return Math.min(100, Math.round(b / cap * 100));
}

/* ---------- 备份 ---------- */
function setExportBackup(){
  try {
    var data = JSON.stringify(state, null, 2);
    var blob = new Blob([data], { type:'application/json' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'Y.Mine备份_' + setTodayStr() + '.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function(){ URL.revokeObjectURL(a.href); }, 1000);
    toast('备份已导出（' + setFmtBytes(setBytes()) + '）');
  } catch (e) {
    toast('导出失败：' + e.message);
  }
}
function setImportBackup(file){
  if (!file) return;
  var r = new FileReader();
  r.onload = function(){
    var o;
    try { o = JSON.parse(r.result); }
    catch (e) { toast('解析失败：不是合法的 JSON 文件'); return; }
    if (!o || typeof o !== 'object' || Array.isArray(o)) {
      toast('文件格式不对：应为备份导出的对象'); return;
    }
    if (!confirm('恢复备份会覆盖当前全部数据。\n\n确定继续？建议先导出一份当前备份。')) return;
    Object.keys(o).forEach(function(k){ state[k] = o[k]; });
    save();
    toast('已恢复，正在刷新…');
    setTimeout(function(){ location.reload(); }, 600);
  };
  r.readAsText(file);
}
function setClearAll(){
  if (!confirm('确定清空全部数据？\n\n包括品牌内核、竞品档案、调研方案、战略矩阵、知识库等所有内容。\n\n此操作不可撤销，建议先导出备份。')) return;
  if (!confirm('再确认一次：真的要清空吗？')) return;
  try { localStorage.removeItem(KEY); } catch (e) {}
  location.reload();
}

/* ---------- 渲染 ---------- */
function renderSettings(){
  var host = $('#setBody');
  if (!host) return;

  var b = setBytes();
  var pct = setUsagePct();
  var barColor = pct > 80 ? '#dc2626' : (pct > 50 ? '#f59e0b' : '#0ea5e9');

  /* 品牌基准 */
  var bc = state.bc || {};
  var bcName = bc.brand || '';
  var bcCat = bc.cat || '';
  var bcHtml = bcName
    ? '<div class="setrow__val"><strong>' + esc(bcName) + '</strong>' +
      (bcCat ? ' <span class="setrow__note">' + esc(bcCat) + '</span>' : '') +
      '</div><div class="setrow__hint">内容体检会按这个品牌的调性与禁忌评分</div>'
    : '<div class="setrow__val" style="color:var(--text-3)">未设置</div>' +
      '<div class="setrow__hint">未设置时，内容体检使用通用评分</div>';

  /* 默认打开 */
  var startTab = state.startTab || 'guide';
  var optHtml = SET_TABS.map(function(t){
    return '<option value="' + t.k + '"' + (t.k === startTab ? ' selected' : '') + '>' +
           esc(t.n) + '</option>';
  }).join('');

  var h = '';

  /* ① 数据与备份（最重要，放最前） */
  h += '<div class="card">';
  h += '<div class="card__hd">💾 数据与备份 <span class="eyebrow" style="margin-left:auto">建议定期导出</span></div>';
  h += '<div class="card__bd">';
  h += '<div class="setrow">';
  h += '<div class="setrow__lb">存储占用</div>';
  h += '<div class="setrow__val">' + setFmtBytes(b) + ' <span class="setrow__note">/ 约 5 MB 上限（' + pct + '%）</span></div>';
  h += '<div class="setbar"><div class="setbar__in" style="width:' + Math.max(2, pct) + '%;background:' + barColor + '"></div></div>';
  h += '<div class="setrow__hint">全部数据只存在这台设备的浏览器里，不上传任何服务器。清缓存会丢失，所以导出备份很重要。</div>';
  h += '</div>';
  h += '<div class="setrow setrow--btns">';
  h += '<button class="btn btn--sm" id="btnSetExport">📤 导出全量备份</button>';
  h += '<button class="btn btn--sm btn--ghost" id="btnSetImport">📥 恢复备份</button>';
  h += '<button class="btn btn--sm btn--ghost" id="btnSetClear" style="color:#dc2626">🗑️ 清空全部数据</button>';
  h += '<input type="file" id="setFile" accept=".json,application/json" style="display:none" />';
  h += '</div>';
  h += '</div></div>';

  /* ② 外观 */
  h += '<div class="card">';
  h += '<div class="card__hd">🎨 外观</div>';
  h += '<div class="card__bd">';
  h += '<div class="setrow">';
  h += '<div class="setrow__lb">主题</div>';
  h += '<div class="setrow__val">';
  h += '<label class="setradio"><input type="radio" name="setTheme" value="light"' + (state.theme !== 'dark' ? ' checked' : '') + '> 浅色</label>';
  h += '<label class="setradio"><input type="radio" name="setTheme" value="dark"' + (state.theme === 'dark' ? ' checked' : '') + '> 深色</label>';
  h += '</div></div>';
  h += '</div></div>';

  /* ③ 品牌基准 */
  h += '<div class="card">';
  h += '<div class="card__hd">🏛️ 品牌基准 <span class="eyebrow" style="margin-left:auto">内容体检的评分依据</span></div>';
  h += '<div class="card__bd">';
  h += '<div class="setrow"><div class="setrow__lb">当前生效</div>' + bcHtml + '</div>';
  h += '<div class="setrow setrow--btns">';
  h += '<button class="btn btn--sm btn--ghost" id="btnSetGoBrand">前往' + (bcName ? '修改' : '填写') + ' →</button>';
  h += '</div>';
  h += '</div></div>';

  /* ④ 启动 */
  h += '<div class="card">';
  h += '<div class="card__hd">🚀 启动</div>';
  h += '<div class="card__bd">';
  h += '<div class="setrow">';
  h += '<div class="setrow__lb">默认打开</div>';
  h += '<div class="setrow__val"><select id="setStartTab" class="setsel">' + optHtml + '</select></div>';
  h += '<div class="setrow__hint">下次打开工作台时自动进入这个模块</div>';
  h += '</div></div></div>';

  /* ⑤ 隐私 */
  h += '<div class="card">';
  h += '<div class="card__hd">🔒 隐私与联网</div>';
  h += '<div class="card__bd">';
  h += '<div class="setrow">';
  h += '<div class="setrow__lb">允许联网调用模型</div>';
  h += '<div class="setrow__val">';
  h += '<label class="setradio"><input type="radio" name="setNet" value="off"' + (!state.net || !state.net.on ? ' checked' : '') + '> 关闭（默认）</label>';
  h += '<label class="setradio"><input type="radio" name="setNet" value="on"' + (state.net && state.net.on ? ' checked' : '') + '> 开启</label>';
  h += '</div>';
  h += '<div class="setrow__hint">关闭时全部功能本地运行，数据不出浏览器。开启后由你填入自己的 Key，请求直达模型厂商，不经任何中转服务器。</div>';
  h += '</div></div></div>';

  /* ⑥ 关于 */
  h += '<div class="card">';
  h += '<div class="card__hd">ℹ️ 关于</div>';
  h += '<div class="card__bd">';
  h += '<div class="setrow"><div class="setrow__lb">定位</div><div class="setrow__val">品牌战略到增长的完整决策链</div></div>';
  h += '<div class="setrow"><div class="setrow__lb">运行方式</div><div class="setrow__val">单文件 · 零依赖 · 默认不联网</div></div>';
  h += '<div class="setrow"><div class="setrow__lb">数据存储</div><div class="setrow__val">浏览器本地（localStorage）</div></div>';
  h += '<div class="setrow"><div class="setrow__lb">使用手册</div><div class="setrow__val"><a href="manual.html" target="_blank" rel="noopener">打开 manual.html →</a></div></div>';
  h += '</div></div>';

  host.innerHTML = h;
  bindSettings();
}

function bindSettings(){
  var ex = $('#btnSetExport');
  if (ex) ex.onclick = setExportBackup;

  var im = $('#btnSetImport');
  var fi = $('#setFile');
  if (im && fi) im.onclick = function(){ fi.click(); };
  if (fi) fi.onchange = function(){
    if (fi.files && fi.files[0]) setImportBackup(fi.files[0]);
    fi.value = '';
  };

  var cl = $('#btnSetClear');
  if (cl) cl.onclick = setClearAll;

  var gb = $('#btnSetGoBrand');
  if (gb) gb.onclick = function(){ switchTab('persona'); };

  [].forEach.call(document.querySelectorAll('input[name="setTheme"]'), function(el){
    el.onchange = function(){
      state.theme = el.value;
      document.documentElement.setAttribute('data-theme', state.theme);
      /* 同步顶栏主题按钮的文字，避免两处显示不一致 */
      var tb = $('#btnTheme');
      if (tb) tb.textContent = state.theme === 'dark' ? '☀️ 浅色' : '🌙 深色';
      save();
      toast('已切换为' + (state.theme === 'dark' ? '深色' : '浅色'));
    };
  });

  [].forEach.call(document.querySelectorAll('input[name="setNet"]'), function(el){
    el.onchange = function(){
      if (!state.net) state.net = { on:false, provider:'deepseek', key:'', base:'' };
      state.net.on = (el.value === 'on');
      save();
      toast(state.net.on ? '已开启联网（需填自己的 Key）' : '已关闭联网，全部本地运行');
    };
  });

  var st = $('#setStartTab');
  if (st) st.onchange = function(){
    state.startTab = st.value;
    save();
    toast('下次打开将进入「' + (SET_TABS.filter(function(t){ return t.k === st.value; })[0] || {}).n + '」');
  };
}
