/* ============================================================
 * 37-quarter.js —— 营销日历 · 季度视图（第 5 批）
 *
 * 为什么要有季度视图：
 *   月视图能看密度，但看不出节奏。Q4 三个大促怎么排布、
 *   资源会不会撞车，翻月是看不出来的——必须三个月并排。
 *
 * 设计：
 *   · 三个月并排，每格显示日期 + 最多 2 个事件（超出的 +N）
 *   · 跨天事件在覆盖的每一天都出现，延续日加 ↳（与月视图一致）
 *   · 点事件编辑、点空白新建，与月视图行为完全一致
 *   · 只读聚合日历数据，不新增数据结构
 *
 * 依赖：17-calendar（renderCal / openCalModal / ymd / today0）
 * ============================================================ */

/* 季度：0-3 → 该季度的月份数组（0-11） */
function qMonths(q){ return [q * 3, q * 3 + 1, q * 3 + 2]; }
/* 由年月反推所属季度 */
function qOfMonth(m){ return Math.floor(m / 3); }

function renderQuarter(){
  var host = $('#calQuarter');
  if(!host) return;
  var c = state.cal;
  var y = c.y, q = (c.q == null) ? qOfMonth(c.m) : c.q;
  c.q = q;
  var months = qMonths(q);
  var todayS = ymd(today0());

  var h = '';
  h += '<div class="qhd">' + y + ' 年 Q' + (q + 1) +
       '　<span class="qhd__sub">' + (months[0] + 1) + ' / ' + (months[1] + 1) + ' / ' + (months[2] + 1) + ' 月</span></div>';
  h += '<div class="qgrid">';

  months.forEach(function(m){
    var first = new Date(y, m, 1);
    var start = new Date(first); start.setDate(1 - first.getDay()); // 周日起
    var dim = new Date(y, m + 1, 0).getDate();

    h += '<div class="qmonth">';
    h += '<div class="qmonth__hd">' + (m + 1) + ' 月</div>';
    var WD = ['日','一','二','三','四','五','六'];
    h += '<div class="qmonth__wd">';
    WD.forEach(function(w){ h += '<i>' + w + '</i>'; });
    h += '</div>';
    h += '<div class="qmonth__cells">';

    for(var i = 0; i < 42; i++){
      var d = new Date(start); d.setDate(start.getDate() + i);
      var ds = ymd(d);
      var out = (d.getMonth() !== m);
      var isToday = (ds === todayS);
      /* 与月视图同一套区间逻辑 */
      var evs = (c.events || []).filter(function(e){
        if(!e.date) return false;
        if(e.dateEnd && e.dateEnd > e.date) return ds >= e.date && ds <= e.dateEnd;
        return e.date === ds;
      });
      /* 最后一周若全为下月，则整行不渲染，避免多余空白 */
      if(i >= 35 && out && evs.length === 0 && d.getMonth() !== m){
        var restEmpty = true;
        for(var j = i; j < 42; j++){
          var dj = new Date(start); dj.setDate(start.getDate() + j);
          if(dj.getMonth() === m){ restEmpty = false; break; }
        }
        if(restEmpty) break;
      }
      h += '<div class="qcell' + (out ? ' is-out' : '') + (isToday ? ' is-today' : '') +
           '" data-date="' + ds + '">';
      h += '<span class="qcell__d">' + d.getDate() + '</span>';
      evs.slice(0, 2).forEach(function(e){
        var isSpan = !!(e.dateEnd && e.dateEnd > e.date);
        var isCont = isSpan && ds > e.date;
        h += '<i class="qev ' + (e.status === 'done' ? 'qev--done' : e.status === 'delayed' ? 'qev--delayed' : '') +
             (e.pri === 'high' ? ' qev--high' : '') + (isCont ? ' qev--cont' : '') +
             '" data-ev="' + e.id + '" title="' + esc(e.title) +
             (isSpan ? '（' + e.date + ' → ' + e.dateEnd + '）' : '') + '">' +
             (isCont ? '↳' : esc(String(e.title).slice(0, 5))) + '</i>';
      });
      if(evs.length > 2) h += '<i class="qev qev--more">+' + (evs.length - 2) + '</i>';
      h += '</div>';
    }
    h += '</div></div>';
  });
  h += '</div>';
  h += '<div class="hint" style="margin-top:8px">💡 三个月并排看节奏：大促间隔、资源撞车、空档期一眼可见。点事件可直接编辑。</div>';

  host.innerHTML = h;

  host.onclick = function(e){
    var ev = e.target.closest('.qev');
    if(ev && ev.getAttribute('data-ev')){ openCalModal(ev.getAttribute('data-ev')); return; }
    var cell = e.target.closest('.qcell');
    if(cell){ openCalModal(null, cell.getAttribute('data-date')); }
  };
}

/* ---------- 视图切换 ---------- */
function calApplyView(){
  var g = $('#calGrid'), q = $('#calQuarter');
  var ym = $('#calYM');
  if(!g || !q) return;
  var isQ = state.cal.view === 'quarter';
  if(isQ){
    renderQuarter();
    g.style.display = 'none';
    q.style.display = '';
    if(ym) ym.textContent = state.cal.y + ' 年 Q' + ((state.cal.q == null ? qOfMonth(state.cal.m) : state.cal.q) + 1);
  } else {
    g.style.display = '';
    q.style.display = 'none';
    var c = state.cal;
    if(ym) ym.textContent = c.y + ' 年 ' + (c.m + 1) + ' 月';
  }
  /* 上/下 按钮文案随视图变化 */
  var pv = $('#btnCalPrev'), nx = $('#btnCalNext');
  if(pv) pv.textContent = isQ ? '‹ 上季' : '‹ 上月';
  if(nx) nx.textContent = isQ ? '下季 ›' : '下月 ›';
}
function calSetView(v){
  var c = state.cal;
  if(v === 'quarter'){
    /* 进入季度视图：先看当前月属于哪一季，避免莫名其妙跳到别的季度 */
    c.q = qOfMonth(c.m);
  } else {
    /* 回到月视图：保持在刚才那个季度内的相对位置。
       例如在 5 月（Q2 第 2 个月）翻到 Q3 再切回月，应落在 8 月（Q3 第 2 个月），
       而不是跳回 Q3 首月，否则用户会丢失浏览上下文。 */
    var q = (c.q == null) ? qOfMonth(c.m) : c.q;
    c.m = q * 3 + (c.m % 3);
  }
  c.view = v;
  save();
  if(v === 'month' && typeof __renderCalOrig === 'function') __renderCalOrig();   // 月份可能已变，重渲染月视图
  calApplyView();
}
/* 季度/月度的上一步下一步 */
function calStep(dir){
  var c = state.cal;
  if(c.view === 'quarter'){
    var q = (c.q == null) ? qOfMonth(c.m) : c.q;
    q += dir;
    if(q < 0){ q = 3; c.y -= 1; }
    else if(q > 3){ q = 0; c.y += 1; }
    c.q = q;
    c.m = q * 3;   // 与月视图联动：季变则月跟到该季首月
  } else {
    var m = c.m + dir;
    if(m < 0){ m = 11; c.y -= 1; }
    else if(m > 11){ m = 0; c.y += 1; }
    c.m = m;
    c.q = qOfMonth(m);
  }
  save();
  if(c.view === 'quarter') calApplyView(); else renderCal();
}

/* ---------- 包装原 renderCal：让所有调用点都尊重当前视图 ---------- */
var __renderCalOrig = renderCal;
renderCal = function(){
  __renderCalOrig();
  if(!state.cal.view) state.cal.view = 'month';
  if(state.cal.q == null) state.cal.q = qOfMonth(state.cal.m);
  calApplyView();
};

/* ---------- 绑定 ---------- */
function bindQuarter(){
  var v = $('#btnCalView');
  if(v) v.onclick = function(){
    calSetView(state.cal.view === 'quarter' ? 'month' : 'quarter');
  };
  /* 上/下 按钮改由 calStep 统一处理 */
  var pv = $('#btnCalPrev'); if(pv) pv.onclick = function(){ calStep(-1); };
  var nx = $('#btnCalNext'); if(nx) nx.onclick = function(){ calStep(1); };
  var td = $('#btnCalToday');
  if(td) td.onclick = function(){
    var t = today0();
    state.cal.y = t.getFullYear();
    state.cal.m = t.getMonth();
    state.cal.q = qOfMonth(state.cal.m);
    save();
    if(state.cal.view === 'quarter') calApplyView(); else renderCal();
  };
}
bindQuarter();
