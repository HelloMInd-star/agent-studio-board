/* ============================================================
 * 36-assets.js —— 品牌资产台账（第 4 批）
 *
 * 定位：登记「品牌有什么资产、现在什么状态」，不做设计功能。
 *   · 不做 Logo 绘制、不做排版、不内嵌图片编辑器
 *   · 只做：版本台账 / 物料进度 / 色值规范 / 导入导出接口
 *
 * 为什么不做设计：
 *   设计工具要么依赖大型库（摧毁「零依赖单文件」），
 *   要么只能做出玩具级功能。品牌人真正缺的不是又一个画板，
 *   而是「我有哪些物料、谁在跟进、定稿了没、规范能不能一键给出去」。
 *
 * 色值一致性检查的边界（重要）：
 *   色彩心理学是经验共识，不是硬科学，无法像 LTV 那样验算。
 *   所以这里只给「色彩性格读数 + 与定位的匹配提示」，
 *   措辞为提示而非判定，并明确标注为依据经验值。
 *
 * 依赖：04-store（save/toast/esc）· 09-agent（downloadFile）
 *       30-brandcore（state.bc 提供定位维度，用于软提示）
 * ============================================================ */

var AS_LOGO_ST = {
  cur: {n:'在用',     cls:'is-done'},
  old: {n:'历史版本', cls:'is-delayed'}
};
var AS_MAT_ST = {
  design:  {n:'设计中', cls:'is-todo'},
  review:  {n:'待审核', cls:'is-doing'},
  done:    {n:'已定稿', cls:'is-done'},
  archived:{n:'已归档', cls:'is-delayed'}
};
var AS_MAT_TYPES = ['包装','海报','社媒图文','视频','官网','线下物料','其他'];

/* ---------- 状态存取 ---------- */
function asState(){
  state.assets = state.assets || {};
  var a = state.assets;
  a.logos     = a.logos     || [];
  a.materials = a.materials || [];
  a.colors    = a.colors    || {main:'', sub:'', acc:''};
  if(a.fonts === undefined) a.fonts = '';
  if(a.norm  === undefined) a.norm  = '';
  return a;
}

/* ---------- 色值工具 ---------- */
/* #RGB / #RRGGBB → {h:0-360, s:0-100, l:0-100}；非法返回 null */
function hexToHsl(hex){
  var s = String(hex || '').trim().replace(/^#/, '');
  if(s.length === 3) s = s[0]+s[0]+s[1]+s[1]+s[2]+s[2];
  if(!/^[0-9a-fA-F]{6}$/.test(s)) return null;
  var r = parseInt(s.slice(0,2),16)/255, g = parseInt(s.slice(2,4),16)/255, b = parseInt(s.slice(4,6),16)/255;
  var mx = Math.max(r,g,b), mn = Math.min(r,g,b);
  var h = 0, l = (mx+mn)/2, d = mx-mn;
  var sat = 0;
  if(d){
    sat = l > 0.5 ? d/(2-mx-mn) : d/(mx+mn);
    if(mx === r)      h = ((g-b)/d + (g<b?6:0));
    else if(mx === g) h = ((b-r)/d + 2);
    else              h = ((r-g)/d + 4);
    h *= 60;
  }
  return {h:Math.round(h), s:Math.round(sat*100), l:Math.round(l*100)};
}
/* 色彩性格读数：只描述客观特征 + 通行联想，不做优劣判断 */
function colorPersona(hsl){
  if(!hsl) return null;
  var warm = (hsl.h >= 0 && hsl.h < 60) || hsl.h >= 300;
  var cool = hsl.h >= 180 && hsl.h < 300;
  var satTxt = hsl.s >= 70 ? '高饱和' : hsl.s >= 35 ? '中饱和' : '低饱和';
  var litTxt = hsl.l >= 65 ? '高明度' : hsl.l >= 35 ? '中明度' : '低明度';
  var hueTxt = warm ? '暖色系' : cool ? '冷色系' : '中性/绿色系';
  var mood = [];
  /* 阈值与「低饱和」的定义一致（s<35），避免出现
     米白（s≈31、l≈94）明明是留白感却被判成亲和感的错判 */
  if(hsl.s >= 70 && warm) mood.push('活力、促销感');
  else if(hsl.s <= 35 && hsl.l >= 60) mood.push('克制、留白感');
  else if(hsl.s <= 35 && hsl.l <= 35) mood.push('沉稳、高端感');
  else if(cool && hsl.s <= 55) mood.push('理性、专业感');
  else mood.push('亲和、日常感');
  return {hue:hueTxt, sat:satTxt, lit:litTxt, mood:mood.join(''), h:hsl.h, s:hsl.s, l:hsl.l};
}
/* 与品牌内核定位的软匹配提示
   期望表为经验值：只提示「可能有张力」，绝不说「你错了」 */
var TONE_COLOR_EXPECT = {
  '身份象征':  {sat:'low',  txt:'高身份象征的定位通常配低饱和/中性色'},
  '价值观表达':{sat:'low',  txt:'价值观驱动型多配低饱和色，避免喧宾夺主'},
  '感官体验':  {sat:'mid',  txt:'感官体验型偏好中等饱和、柔和明度'},
  '情绪共鸣':  {sat:'mid',  txt:'情绪共鸣型可用中等饱和暖色'},
  '服务温度':  {sat:'mid',  txt:'服务温度型适合中饱和、偏暖'},
  '圈层归属':  {sat:'low',  txt:'圈层型多用低饱和色强化专属感'},
  '效率速度':  {sat:'high', txt:'效率型常用高饱和、明快色彩'},
  '渠道便利':  {sat:'high', txt:'便利型倾向高饱和、易识别'},
  '产品功能':  {sat:'mid',  txt:'功能导向型色彩多为中性或中饱和'},
  '价格定位':  {sat:'high', txt:'性价比定位常用高饱和暖色传达活力'}
};
function colorToneHint(hsl){
  var bc = state.bc;
  if(!bc || !bc.dims || !hsl) return null;
  /* 取打分最高的维度作为主战场 */
  var top = null;
  Object.keys(bc.dims).forEach(function(k){
    var v = parseFloat((bc.dims[k] || {}).v || 0);
    if(!top || v > top.v) top = {k:k, v:v};
  });
  if(!top || !top.v) return null;
  var ex = TONE_COLOR_EXPECT[top.k];
  if(!ex) return null;
  var actual = hsl.s >= 70 ? 'high' : hsl.s >= 35 ? 'mid' : 'low';
  if(actual === ex.sat) return {ok:true, dim:top.k, txt:'与「' + top.k + '」定位的色彩习惯一致'};
  return {ok:false, dim:top.k, txt:ex.txt + '，当前主色为' + (actual==='high'?'高':actual==='mid'?'中':'低') + '饱和，可能存在张力'};
}

/* ---------- 增删改 ---------- */
function asAddLogo(){
  var a = asState();
  var n = $('#as_logo_name');
  var name = n ? n.value.trim() : '';
  if(!name){ toast('请填写 Logo 名称'); return; }
  a.logos.unshift({
    id:'lg' + Date.now(),
    name:name,
    ver:($('#as_logo_ver') || {}).value || 'v1.0',
    use:($('#as_logo_use') || {}).value || '',
    path:($('#as_logo_path') || {}).value || '',
    st:($('#as_logo_st') || {}).value || 'cur',
    d:ymd(today0())
  });
  if(n) n.value = '';
  save(); renderAssets(); toast('已添加 Logo 版本');
}
function asAddMat(){
  var a = asState();
  var n = $('#as_mat_name');
  var name = n ? n.value.trim() : '';
  if(!name){ toast('请填写物料名称'); return; }
  a.materials.unshift({
    id:'mt' + Date.now(),
    name:name,
    type:($('#as_mat_type') || {}).value || '其他',
    st:($('#as_mat_st') || {}).value || 'design',
    owner:($('#as_mat_owner') || {}).value || '',
    due:($('#as_mat_due') || {}).value || '',
    note:($('#as_mat_note') || {}).value || ''
  });
  if(n) n.value = '';
  save(); renderAssets(); toast('已添加物料');
}
function asDel(list, id){
  var a = asState();
  a[list] = a[list].filter(function(x){ return x.id !== id; });
  save(); renderAssets(); toast('已删除');
}
function asSet(list, id, key, val){
  var a = asState();
  a[list].forEach(function(x){ if(x.id === id) x[key] = val; });
  save(); renderAssets();
}

/* ---------- 渲染 ---------- */
function renderAssets(){
  var a = asState();
  var host = $('#asBody');
  if(!host) return;

  var h = '';

  /* ---- 1. 色值与字体规范 ---- */
  h += '<div class="card">';
  h += '<div class="card__hd">🎨 色值与字体规范 <span class="eyebrow" style="margin-left:auto">品牌一致性的基准</span></div>';
  h += '<div class="card__bd">';
  h += '<div class="grid3">';
  [['main','主色','#4f46e5'],['sub','辅色',''],['acc','强调色','']].forEach(function(c){
    h += '<label class="fld"><span>' + c[1] + '</span>' +
         '<input type="text" id="as_c_' + c[0] + '" class="inp" placeholder="' + c[2] + '" value="' +
         esc(a.colors[c[0]] || '') + '"></label>';
  });
  h += '</div>';
  h += '<label class="fld" style="margin-top:10px"><span>字体规范</span>' +
       '<input type="text" id="as_fonts" class="inp" placeholder="例：标题 PingFang SC Semibold / 正文 PingFang SC Regular" value="' +
       esc(a.fonts || '') + '"></label>';
  h += '<label class="fld" style="margin-top:10px"><span>使用规范 / 禁忌备注</span>' +
       '<textarea id="as_norm" class="inp" rows="3" placeholder="例：Logo 最小留白为高度的 1/2；不得拉伸变形；不得置于高饱和背景上">' +
       esc(a.norm || '') + '</textarea></label>';

  /* 色卡预览 + 性格读数 */
  var anyColor = a.colors.main || a.colors.sub || a.colors.acc;
  if(anyColor){
    h += '<div class="asswatch" style="margin-top:12px">';
    ['main','sub','acc'].forEach(function(k){
      var v = a.colors[k];
      if(!v) return;
      var hsl = hexToHsl(v);
      h += '<div class="asswatch__i" title="' + esc(v) + '">' +
           '<i style="background:' + esc(v) + '"></i>' +
           '<span class="mono">' + esc(v) + '</span>' +
           (hsl ? '<span class="asswatch__hsl">H' + hsl.h + ' S' + hsl.s + '% L' + hsl.l + '%</span>' : '<span class="asswatch__hsl">色值无法解析</span>') +
           '</div>';
    });
    h += '</div>';
    var p = colorPersona(hexToHsl(a.colors.main));
    if(p){
      h += '<div class="ashint">🎨 主色读数：' + p.hue + ' · ' + p.sat + ' · ' + p.lit +
           '　→　通常传达<b>' + esc(p.mood) + '</b></div>';
      var tn = colorToneHint(hexToHsl(a.colors.main));
      if(tn){
        h += '<div class="ashint ' + (tn.ok ? 'is-ok' : 'is-warn') + '">' +
             (tn.ok ? '✅ ' : '⚠️ ') + esc(tn.txt) +
             '<span class="ashint__note">（色彩与定位的关联为经验共识，非精确科学，仅供参考）</span></div>';
      }
    }
  } else {
    h += '<div class="hint" style="margin-top:10px">💡 填入主色后可看到 HSL 读数，并与品牌内核的定位做一致性提示</div>';
  }
  h += '<div class="row" style="margin-top:10px"><button class="btn btn--sm btn--primary" id="btnAsSaveColor">💾 保存规范</button></div>';
  h += '</div></div>';

  /* ---- 2. Logo 版本台账 ---- */
  h += '<div class="card">';
  h += '<div class="card__hd">🖼️ Logo 版本台账 <span class="eyebrow" style="margin-left:auto">' + a.logos.length + ' 个版本</span></div>';
  h += '<div class="card__bd">';
  h += '<div class="asform">';
  h += '<input type="text" id="as_logo_name" class="inp" placeholder="名称，例：主 Logo 横版">';
  h += '<input type="text" id="as_logo_ver" class="inp" style="max-width:90px" placeholder="v1.0" value="v1.0">';
  h += '<input type="text" id="as_logo_use" class="inp" placeholder="用途，例：官网/包装">';
  h += '<input type="text" id="as_logo_path" class="inp" placeholder="文件位置或链接">';
  h += '<select id="as_logo_st" class="inp" style="max-width:110px"><option value="cur">在用</option><option value="old">历史版本</option></select>';
  h += '<button class="btn btn--sm btn--primary" id="btnAsAddLogo">➕ 添加</button>';
  h += '</div>';
  if(!a.logos.length){
    h += '<div class="calempty">还没有登记 Logo 版本<br>多版本并存时，这张表能避免「用错旧版」</div>';
  } else {
    h += '<div class="astable">';
    a.logos.forEach(function(l){
      var st = AS_LOGO_ST[l.st] || AS_LOGO_ST.cur;
      h += '<div class="asrow">';
      h += '<span class="badge ' + st.cls + '"><i class="dot"></i>' + st.n + '</span>';
      h += '<span class="asrow__n">' + esc(l.name) + ' <span class="mono">' + esc(l.ver || '') + '</span></span>';
      h += '<span class="asrow__m">' + esc(l.use || '') + (l.path ? '　🔗 ' + esc(l.path) : '') + '</span>';
      h += '<span class="asrow__ops">';
      h += '<button data-as="tgl" data-l="logos" data-id="' + l.id + '" data-k="st" data-v="' + (l.st === 'cur' ? 'old' : 'cur') + '">切换</button>';
      h += '<button data-as="del" data-l="logos" data-id="' + l.id + '">删除</button>';
      h += '</span></div>';
    });
    h += '</div>';
  }
  h += '</div></div>';

  /* ---- 3. 物料清单 ---- */
  h += '<div class="card">';
  h += '<div class="card__hd">📦 物料清单与进度 <span class="eyebrow" style="margin-left:auto" id="asMatStat"></span></div>';
  h += '<div class="card__bd">';
  h += '<div class="asform">';
  h += '<input type="text" id="as_mat_name" class="inp" placeholder="物料名称，例：618 主视觉">';
  h += '<select id="as_mat_type" class="inp" style="max-width:110px">';
  AS_MAT_TYPES.forEach(function(t){ h += '<option value="' + t + '">' + t + '</option>'; });
  h += '</select>';
  h += '<select id="as_mat_st" class="inp" style="max-width:100px">';
  Object.keys(AS_MAT_ST).forEach(function(k){ h += '<option value="' + k + '">' + AS_MAT_ST[k].n + '</option>'; });
  h += '</select>';
  h += '<input type="text" id="as_mat_owner" class="inp" style="max-width:90px" placeholder="负责人">';
  h += '<input type="date" id="as_mat_due" class="inp" style="max-width:140px">';
  h += '<input type="text" id="as_mat_note" class="inp" placeholder="备注">';
  h += '<button class="btn btn--sm btn--primary" id="btnAsAddMat">➕ 添加</button>';
  h += '</div>';
  if(!a.materials.length){
    h += '<div class="calempty">还没有物料记录<br>包装、海报、社媒图文的进度都可以在这里跟</div>';
  } else {
    h += '<div class="astable">';
    a.materials.forEach(function(m){
      var st = AS_MAT_ST[m.st] || AS_MAT_ST.design;
      var late = m.due && m.st !== 'done' && m.st !== 'archived' && m.due < ymd(today0());
      h += '<div class="asrow">';
      h += '<span class="badge ' + st.cls + '"><i class="dot"></i>' + st.n + '</span>';
      h += '<span class="asrow__n">' + esc(m.name) + ' <span class="asrow__tag">' + esc(m.type || '') + '</span></span>';
      h += '<span class="asrow__m">' + (m.owner ? esc(m.owner) + '　' : '') +
           (m.due ? (late ? '⚠️ 已逾期 ' : '📅 ') + esc(m.due) : '') +
           (m.note ? '　' + esc(m.note) : '') + '</span>';
      h += '<span class="asrow__ops">';
      h += '<button data-as="next" data-l="materials" data-id="' + m.id + '">推进</button>';
      h += '<button data-as="del" data-l="materials" data-id="' + m.id + '">删除</button>';
      h += '</span></div>';
    });
    h += '</div>';
  }
  h += '</div></div>';

  /* ---- 4. 导入导出接口 ---- */
  h += '<div class="card">';
  h += '<div class="card__hd">🔌 导入导出接口</div>';
  h += '<div class="card__bd">';
  h += '<div class="row">';
  h += '<button class="btn btn--sm btn--primary" id="btnAsSpec">📄 导出品牌规范</button>';
  h += '<button class="btn btn--sm btn--ghost" id="btnAsCsv">📊 导出物料 CSV</button>';
  h += '<button class="btn btn--sm btn--ghost" id="btnAsJson">📐 导出 JSON</button>';
  h += '<button class="btn btn--sm btn--ghost" id="btnAsImport">📥 导入 JSON</button>';
  h += '<input type="file" id="asFileImport" accept=".json" style="display:none">';
  h += '</div>';
  h += '<div class="hint" style="margin-top:8px">💡 品牌规范是可直接发给设计/供应商的 Markdown 文档；JSON 用于备份或在另一台设备恢复。</div>';
  h += '</div></div>';

  host.innerHTML = h;

  /* 统计 */
  var doneN = a.materials.filter(function(m){ return m.st === 'done'; }).length;
  var lateN = a.materials.filter(function(m){
    return m.due && m.st !== 'done' && m.st !== 'archived' && m.due < ymd(today0());
  }).length;
  var ms = $('#asMatStat');
  if(ms) ms.textContent = a.materials.length + ' 项 · 已定稿 ' + doneN + (lateN ? ' · 逾期 ' + lateN : '');

  /* 事件 */
  var b1 = $('#btnAsAddLogo'); if(b1) b1.onclick = asAddLogo;
  var b2 = $('#btnAsAddMat');  if(b2) b2.onclick = asAddMat;
  var b3 = $('#btnAsSaveColor'); if(b3) b3.onclick = asSaveColor;
  var b4 = $('#btnAsSpec');    if(b4) b4.onclick = asExportSpec;
  var b5 = $('#btnAsCsv');     if(b5) b5.onclick = asExportCsv;
  var b6 = $('#btnAsJson');    if(b6) b6.onclick = asExportJson;
  var b7 = $('#btnAsImport');  if(b7) b7.onclick = function(){ var f = $('#asFileImport'); if(f) f.click(); };
  var fi = $('#asFileImport'); if(fi) fi.onchange = function(){ if(this.files && this.files[0]) asImportJson(this.files[0]); this.value = ''; };

  /* 行内操作：切换 / 推进 / 删除 */
  [].forEach.call(host.querySelectorAll('[data-as]'), function(el){
    el.onclick = function(){
      var op = el.getAttribute('data-as');
      var list = el.getAttribute('data-l');
      var id = el.getAttribute('data-id');
      if(op === 'del'){ asDel(list, id); return; }
      if(op === 'tgl'){ asSet(list, id, el.getAttribute('data-k'), el.getAttribute('data-v')); return; }
      if(op === 'next'){
        var order = ['design','review','done'];
        var a2 = asState();
        a2[list].forEach(function(x){
          if(x.id === id){
            var i = order.indexOf(x.st || 'design');
            x.st = order[Math.min(i + 1, order.length - 1)];
          }
        });
        save(); renderAssets();
      }
    };
  });

  /* 色值输入即时预览 */
  ['main','sub','acc'].forEach(function(k){
    var el = $('#as_c_' + k);
    if(el) el.addEventListener('input', function(){
      var s = asState();
      s.colors[k] = el.value;
      save();
    });
  });
}
function asSaveColor(){
  var a = asState();
  a.colors.main = ($('#as_c_main') || {}).value || '';
  a.colors.sub  = ($('#as_c_sub')  || {}).value || '';
  a.colors.acc  = ($('#as_c_acc')  || {}).value || '';
  a.fonts = ($('#as_fonts') || {}).value || '';
  a.norm  = ($('#as_norm')  || {}).value || '';
  save(); renderAssets(); toast('规范已保存');
}

/* ---------- 导出：品牌规范 Markdown ---------- */
function asExportSpec(){
  var a = asState();
  var bn = (state.brand && state.brand.name) || (state.bc && state.bc.name) || '品牌';
  var m = '# ' + bn + ' · 品牌规范\n\n';
  m += '> 由本地工作台生成 · ' + new Date().toLocaleString('zh-CN') + '\n';
  m += '> 本文件只登记规范与台账，不含设计文件本身\n\n';

  m += '## 一、色彩规范\n\n';
  var hasC = false;
  ['main','sub','acc'].forEach(function(k){
    var v = a.colors[k];
    if(!v) return;
    hasC = true;
    var nm = k === 'main' ? '主色' : k === 'sub' ? '辅色' : '强调色';
    var hsl = hexToHsl(v);
    m += '- **' + nm + '**：`' + v + '`' + (hsl ? '　HSL(' + hsl.h + ', ' + hsl.s + '%, ' + hsl.l + '%)' : '') + '\n';
  });
  if(!hasC) m += '_（未填写）_\n';
  var p = colorPersona(hexToHsl(a.colors.main));
  if(p) m += '\n主色读数：' + p.hue + ' · ' + p.sat + ' · ' + p.lit + '，通常传达' + p.mood + '。\n';

  m += '\n## 二、字体规范\n\n';
  m += a.fonts ? a.fonts + '\n' : '_（未填写）_\n';

  m += '\n## 三、使用规范与禁忌\n\n';
  m += a.norm ? a.norm + '\n' : '_（未填写）_\n';
  if(state.bc && state.bc.cat){
    m += '\n> 品类：' + state.bc.cat + '\n';
  }

  m += '\n## 四、Logo 版本台账\n\n';
  if(!a.logos.length) m += '_（未登记）_\n';
  else {
    m += '| 版本 | 名称 | 用途 | 状态 | 文件位置 |\n|---|---|---|---|---|\n';
    a.logos.forEach(function(l){
      var st = (AS_LOGO_ST[l.st] || AS_LOGO_ST.cur).n;
      m += '| ' + (l.ver || '') + ' | ' + l.name + ' | ' + (l.use || '') + ' | ' + st + ' | ' + (l.path || '') + ' |\n';
    });
  }

  m += '\n## 五、物料清单\n\n';
  if(!a.materials.length) m += '_（未登记）_\n';
  else {
    m += '| 物料 | 类型 | 状态 | 负责人 | 截止 | 备注 |\n|---|---|---|---|---|---|\n';
    a.materials.forEach(function(x){
      m += '| ' + x.name + ' | ' + (x.type || '') + ' | ' + (AS_MAT_ST[x.st] || AS_MAT_ST.design).n +
           ' | ' + (x.owner || '') + ' | ' + (x.due || '') + ' | ' + (x.note || '') + ' |\n';
    });
  }
  m += '\n---\n\n_说明：色彩与定位的关联为经验共识，非精确科学；本文件仅作团队对齐用。_\n';
  downloadFile('brand-spec-' + ymd(today0()) + '.md', m, 'text/markdown;charset=utf-8');
  toast('已导出品牌规范');
}
/* ---------- 导出：物料 CSV ---------- */
function asExportCsv(){
  var a = asState();
  if(!a.materials.length && !a.logos.length){ toast('还没有可导出的资产'); return; }
  var rows = [['类别','名称','类型/版本','状态','负责人','截止','备注']];
  a.logos.forEach(function(l){
    rows.push(['Logo', l.name, l.ver || '', (AS_LOGO_ST[l.st] || AS_LOGO_ST.cur).n, '', '', l.use || '']);
  });
  a.materials.forEach(function(x){
    rows.push(['物料', x.name, x.type || '', (AS_MAT_ST[x.st] || AS_MAT_ST.design).n,
               x.owner || '', x.due || '', x.note || '']);
  });
  downloadFile('brand-assets-' + ymd(today0()) + '.csv', csvText(rows), 'text/csv;charset=utf-8');
  toast('已导出资产台账');
}
/* ---------- 导出 / 导入 JSON ---------- */
function asExportJson(){
  var a = asState();
  var pack = {__type:'ym-brand-assets', v:1, at:new Date().toISOString(), assets:a};
  downloadFile('brand-assets-' + ymd(today0()) + '.json', JSON.stringify(pack, null, 2), 'application/json');
  toast('已导出 JSON');
}
function asImportJson(file){
  var r = new FileReader();
  r.onload = function(){
    try{
      var o = JSON.parse(r.result);
      var src = (o && o.assets) ? o.assets : o;
      if(!src || typeof src !== 'object') throw new Error('格式不符');
      if(!window.confirm('导入将覆盖当前品牌资产台账（Logo / 物料 / 色值规范）。建议先导出备份。继续？')) return;
      state.assets = {
        logos:     Array.isArray(src.logos) ? src.logos : [],
        materials: Array.isArray(src.materials) ? src.materials : [],
        colors:    src.colors || {main:'', sub:'', acc:''},
        fonts:     src.fonts || '',
        norm:      src.norm || ''
      };
      save(); renderAssets(); toast('已导入资产台账');
    }catch(e){ toast('导入失败：文件不是有效的资产 JSON'); }
  };
  r.readAsText(file);
}

/* ---------- 绑定 ---------- */
function bindAssets(){
  /* 面板内元素由 renderAssets 动态绑定，这里只处理首次渲染 */
  renderAssets();
}
bindAssets();
