/* ============================================================
 * 33-timeline.js —— 品牌轨迹
 * 把散落在 7 个模块的记录，统一成一条可筛选的时间线。
 * 设计原则：只读聚合，不新增能力，不改现有数据结构。
 *
 *   ① 📅 营销动作  state.cal.events      ymd        YYYY-MM-DD
 *   ② 📡 竞品动态  state.rivals[].events ymd        YYYY-MM-DD
 *   ③ 🩺 内容评分  state.scores[].d      locale     YYYY/M/D H:M:S
 *   ④ 🎯 战略快照  state.mx.snaps[].date ymd        YYYY-MM-DD
 *   ⑤ ⚙️ 执行记录  state.trace{}.at      ISO        YYYY-MM-DDTHH:MM:SS
 *   ⑥ 📝 生成留痕  state.history[].d     locale     YYYY/M/D H:M:S
 *   ⑦ 💬 对话记录  state.chat[].at       time only  HH:MM:SS  ← 无日期
 *
 * 难点：4 种时间格式需归一化；第 ⑦ 类历史上只存了时分秒，
 *       日期无法恢复，本模块如实标注「日期未知」而非编造。
 * ============================================================ */

var TL_TYPES = [
  {k:'cal',   n:'营销动作', em:'📅', jump:'cal'},
  {k:'rival', n:'竞品动态', em:'📡', jump:'market'},
  {k:'score', n:'内容评分', em:'🩺', jump:'content'},
  {k:'snap',  n:'战略快照', em:'🎯', jump:'strat'},
  {k:'trace', n:'执行记录', em:'⚙️', jump:'flow'},
  {k:'hist',  n:'生成留痕', em:'📝', jump:'agent'},
  {k:'chat',  n:'对话记录', em:'💬', jump:'agent'}
];

/* ---------- 时间归一化 ---------- */
/* 4 种格式 → YYYY-MM-DD；无法解析（如只有时分秒）返回空串 */
function tlDay(s){
  if(!s) return '';
  var m = String(s).trim().match(/(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if(!m) return '';
  return m[1] + '-' + String(m[2]).padStart(2,'0') + '-' + String(m[3]).padStart(2,'0');
}
function tlTime(s){
  if(!s) return '';
  var m = String(s).match(/(\d{1,2}):(\d{2})/);
  return m ? String(m[1]).padStart(2,'0') + ':' + m[2] : '';
}

/* ---------- 采集 7 类 ---------- */
function tlCollect(){
  var out = [];

  /* ① 营销动作 */
  ((state.cal && state.cal.events) || []).forEach(function(e){
    var st = (typeof EV_STATUS !== 'undefined' && EV_STATUS[e.status]) ? EV_STATUS[e.status].n : (e.status || '');
    var pr = (typeof EV_PRI !== 'undefined' && EV_PRI[e.pri]) ? EV_PRI[e.pri].n : '';
    out.push({k:'cal', day:tlDay(e.date), time:'',
      id:e.id || '',
      t:e.title || '未命名事件',
      meta:[st, pr].filter(Boolean).join(' · '),
      txt:e.note || ''});
  });

  /* ② 竞品动态 */
  (state.rivals || []).forEach(function(r){
    (r.events || []).forEach(function(e){
      out.push({k:'rival', day:tlDay(e.date), time:'',
        t:(r.name || '竞品') + '：' + (e.text || ''),
        meta:'竞品动态', txt:''});
    });
  });

  /* ③ 内容评分 */
  (state.scores || []).forEach(function(s){
    out.push({k:'score', day:tlDay(s.d), time:tlTime(s.d),
      t:(s.title ? s.title + ' · ' : '') + '体检 ' + (s.total != null ? s.total : '?') + ' 分（' + (s.grade || '') + '）',
      meta:s.platform || '', txt:s.gradeMsg || ''});
  });

  /* ④ 战略快照 */
  ((state.mx && state.mx.snaps) || []).forEach(function(s){
    out.push({k:'snap', day:tlDay(s.date), time:'',
      t:'战略快照：' + (s.name || '未命名'),
      meta:(s.bcg && s.bcg.length) ? (s.bcg.length + ' 个业务') : '', txt:''});
  });

  /* ⑤ 执行记录（step_N → flowModel 拿步骤名） */
  var tr = state.trace || {};
  var steps = [];
  try{ steps = flowModel().steps || []; }catch(err){ steps = []; }
  Object.keys(tr).forEach(function(key){
    var rec = tr[key] || {};
    var no = parseInt(String(key).replace('step_',''), 10);
    var st = null;
    steps.forEach(function(s){ if(s.no === no) st = s; });
    out.push({k:'trace', day:tlDay(rec.at), time:tlTime(rec.at),
      t:'执行：' + (st ? st.instruction : ('步骤 ' + no)),
      meta:rec.status === 'success' ? '✅ 成功' : (rec.status || ''),
      txt:rec.output || rec.note || ''});
  });

  /* ⑥ 生成留痕 */
  (state.history || []).forEach(function(h){
    out.push({k:'hist', day:tlDay(h.d), time:tlTime(h.d),
      t:h.t || '生成记录', meta:'生成留痕',
      txt:(typeof h.p === 'string') ? h.p.slice(0, 200) : ''});
  });

  /* ⑦ 对话记录 —— at 只有时分秒；新数据带 d 字段 */
  (state.chat || []).forEach(function(c){
    var full = String(c.text || '');
    out.push({k:'chat', day:tlDay(c.d), time:tlTime(c.at),
      t:(c.role === 'user' ? '提问：' : '回复：') + full.slice(0, 80),
      meta:c.tag || '', txt:full.length > 80 ? full : ''});
  });

  return out;
}

/* ---------- 渲染 ---------- */
var tlFilter = 'all';
var tlQ = '';

function renderTimeline(){
  var host = $('#tlList');
  if(!host) return;
  var all = tlCollect();

  /* 统计 + 筛选条 */
  var cnt = {};
  TL_TYPES.forEach(function(t){ cnt[t.k] = 0; });
  all.forEach(function(r){ if(cnt[r.k] != null) cnt[r.k]++; });

  var sh = $('#tlStats');
  if(sh){
    var h = '<span class="tlstat' + (tlFilter === 'all' ? ' is-on' : '') + '" data-f="all">全部 ' + all.length + '</span>';
    TL_TYPES.forEach(function(t){
      h += '<span class="tlstat' + (tlFilter === t.k ? ' is-on' : '') + '" data-f="' + t.k + '">' +
           t.em + ' ' + t.n + ' ' + cnt[t.k] + '</span>';
    });
    sh.innerHTML = h;
    [].forEach.call(sh.querySelectorAll('.tlstat'), function(el){
      el.onclick = function(){ tlFilter = el.getAttribute('data-f'); renderTimeline(); };
    });
  }

  /* 筛选 */
  var list = all.filter(function(r){ return tlFilter === 'all' || r.k === tlFilter; });
  if(tlQ){
    var q = tlQ.toLowerCase();
    list = list.filter(function(r){
      return String(r.t).toLowerCase().indexOf(q) >= 0 ||
             String(r.txt).toLowerCase().indexOf(q) >= 0;
    });
  }

  /* 排序：有日期的倒序在前，无日期的（chat 旧数据）排最后并标注 */
  var dated = list.filter(function(r){ return r.day; }).sort(function(a, b){
    if(a.day !== b.day) return a.day < b.day ? 1 : -1;
    return (a.time || '') < (b.time || '') ? 1 : -1;
  });
  var undated = list.filter(function(r){ return !r.day; });
  list = dated.concat(undated);

  if(!list.length){
    host.innerHTML = all.length
      ? '<div class="calempty">当前筛选下没有记录<br>换个类型或清空搜索词</div>'
      : '<div class="calempty">还没有任何记录<br>去各模块产出内容后，这里会自动汇总成一条时间线</div>';
    return;
  }

  /* 按日期分组 */
  var h = '', curDay = '';
  list.forEach(function(r){
    var t = TL_TYPES.filter(function(x){ return x.k === r.k; })[0] || {em:'•', n:r.k};
    var dayLabel = r.day ? r.day : '日期未知';
    if(dayLabel !== curDay){
      curDay = dayLabel;
      h += '<div class="tlday">' + esc(dayLabel) +
           (r.day ? '' : ' <span class="tlday__note">（该记录仅保存了时分秒）</span>') + '</div>';
    }
    h += '<div class="tlitem tl--' + r.k + '"' +
         ' data-jump="' + esc(t.jump || '') + '"' +
         ' data-rid="' + esc(r.id || '') + '"' +
         ' title="点击前往来源模块">';
    h += '<div class="tlitem__hd"><span class="tlitem__em">' + t.em + '</span>';
    h += '<span class="tlitem__t">' + esc(r.t) + '</span>';
    if(r.time) h += '<span class="tlitem__time mono">' + esc(r.time) + '</span>';
    if(t.jump) h += '<span class="tljump">前往 ' + esc(t.n) + ' →</span>';
    h += '</div>';
    if(r.meta || r.txt){
      h += '<div class="tlitem__bd">';
      if(r.meta) h += '<span class="tlitem__meta">' + esc(r.meta) + '</span>';
      if(r.txt) h += '<div class="tlitem__txt">' + esc(String(r.txt).slice(0, 300)) + '</div>';
      h += '</div>';
    }
    h += '</div>';
  });
  host.innerHTML = h;
  bindTimelineJump(host);
}

/* ---------- 溯源：点记录跳回来源模块（第 2 批） ---------- */
/* 品牌轨迹只负责「聚合呈现」，真正的明细在各自模块。
   所以每条记录都要能点回去 —— 否则用户看到问题却无法处理。 */
function bindTimelineJump(host){
  [].forEach.call(host.querySelectorAll('.tlitem[data-jump]'), function(el){
    el.onclick = function(){
      tlJumpTo(el.getAttribute('data-jump'), el.getAttribute('data-rid'));
    };
  });
}
function tlJumpTo(tab, rid){
  if (!tab) return;
  switchTab(tab);
  /* 日历事件带 id，可精确定位到那一条，而不是只切到模块 */
  if (tab === 'cal' && rid && typeof openCalModal === 'function') {
    setTimeout(function(){ openCalModal(rid); }, 60);
    toast('已定位到这条营销动作');
  } else {
    var nm = (TL_TYPES.filter(function(t){ return t.jump === tab; })[0] || {}).n;
    toast(nm ? '已跳转到「' + nm + '」模块' : '已跳转');
  }
}

/* ---------- 导出（只读，不改数据） ---------- */
function exportTimeline(){
  var all = tlCollect().sort(function(a, b){
    if(a.day !== b.day) return a.day < b.day ? 1 : -1;
    return 0;
  });
  if(!all.length){ toast('还没有可导出的记录'); return; }
  var m = '# 🕐 品牌轨迹\n\n';
  m += '> 由本地工作台聚合 · ' + new Date().toLocaleString('zh-CN') + ' · 共 ' + all.length + ' 条\n\n';
  var curDay = '';
  all.forEach(function(r){
    var t = TL_TYPES.filter(function(x){ return x.k === r.k; })[0] || {em:'•', n:r.k};
    var d = r.day || '日期未知';
    if(d !== curDay){ curDay = d; m += '\n## ' + d + '\n\n'; }
    m += '- ' + t.em + ' **' + t.n + '**　' + r.t + (r.time ? '（' + r.time + '）' : '') + '\n';
    if(r.meta) m += '  - ' + r.meta + '\n';
  });
  downloadFile('brand-timeline-' + Date.now() + '.md', m, 'text/markdown;charset=utf-8');
  toast('已导出 ' + all.length + ' 条记录');
}
