/* ============================================================
 * 40-calview.js —— 营销日历 · 周视图 / 日视图 / 看板视图
 *
 * 为什么补这三个视图（roadmap 上原本标着「进行中」）：
 *   月视图看密度、季度视图看节奏，但都回答不了一个问题——
 *   「这周我到底要干几件事？」「今天该推哪条？」「哪些卡住了？」
 *   周视图回答本周负荷，日视图回答今天做什么，看板回答流程堵在哪。
 *
 * 设计原则（与 37-quarter 一致）：
 *   · 只读聚合 state.cal.events，不新增数据结构
 *   · 跨天事件在覆盖的每一天出现，延续日加 ↳（三视图统一）
 *   · 点事件编辑、点空白新建，行为与月视图完全一致
 *   · 不引入任何依赖，纯 DOM + 既有函数
 *
 * 依赖：17-calendar（openCalModal / ymd / today0 / renderCalAlerts / renderEvList）
 *       37-quarter（qOfMonth / renderQuarter / calApplyView / calStep —— 本文件接管后两者）
 * ============================================================ */

var CAL_VIEWS = [
  {k:'month',   n:'月',   t:'月视图'},
  {k:'week',    n:'周',   t:'周视图'},
  {k:'day',     n:'日',   t:'日视图'},
  {k:'board',   n:'看板', t:'看板视图'},
  {k:'quarter', n:'季',   t:'季度视图'}
];
/* 视图 -> 容器 id */
var CAL_VIEW_EL = {
  month:'calGrid', quarter:'calQuarter',
  week:'calWeek', day:'calDay', board:'calBoard'
};
var CAL_ALL_EL = ['calGrid', 'calQuarter', 'calWeek', 'calDay', 'calBoard'];

var WD_CN = ['日', '一', '二', '三', '四', '五', '六'];

/* 当前焦点日（周/日视图用），缺失时回落到今天 */
function calFocusDate(){
  var c = state.cal;
  if(!c.d){
    c.d = ymd(today0());
  }
  var d = new Date(c.d + 'T00:00:00');
  if(isNaN(d)){ d = today0(); c.d = ymd(d); }
  return d;
}

/* 某日命中的事件（与月视图同一套区间逻辑） */
function calEvsOn(ds){
  return (state.cal.events || []).filter(function(e){
    if(!e.date) return false;
    if(e.dateEnd && e.dateEnd > e.date) return ds >= e.date && ds <= e.dateEnd;
    return e.date === ds;
  });
}
/* 是否跨天区间的延续日（非首日） */
function calIsCont(e, ds){
  return !!(e.dateEnd && e.dateEnd > e.date && ds > e.date);
}
function calEvCls(e, extra){
  return 'calv' + (e.status === 'done' ? ' calv--done' : e.status === 'delayed' ? ' calv--delayed' : '') +
         (e.pri === 'high' ? ' calv--high' : '') + (extra || '');
}

/* ============================================================
 * 周视图：7 列，每列列出当天事件
 * ============================================================ */
function renderWeek(){
  var host = $('#calWeek');
  if(!host) return;
  var c = state.cal;
  var base = calFocusDate();
  var start = new Date(base);
  start.setDate(base.getDate() - base.getDay());   // 周日起，与月视图一致
  var todayS = ymd(today0());

  var h = '<div class="wkgrid">';
  for(var i = 0; i < 7; i++){
    var d = new Date(start); d.setDate(start.getDate() + i);
    var ds = ymd(d);
    var isToday = (ds === todayS);
    var evs = calEvsOn(ds);
    h += '<div class="wkcol' + (isToday ? ' is-today' : '') + '">';
    h += '<div class="wkcol__hd"><b>' + d.getDate() + '</b><span>周' + WD_CN[d.getDay()] + '</span>' +
         (evs.length ? '<i class="wkcol__n">' + evs.length + '</i>' : '') + '</div>';
    h += '<div class="wkcol__body" data-date="' + ds + '">';
    if(!evs.length){
      h += '<div class="wkcol__empty">—</div>';
    } else {
      evs.forEach(function(e){
        var cont = calIsCont(e, ds);
        h += '<div class="' + calEvCls(e, cont ? ' calv--cont' : '') + '" data-ev="' + e.id +
             '" title="' + esc(e.title) + (e.dateEnd && e.dateEnd > e.date ? '（' + e.date + ' → ' + e.dateEnd + '）' : '') + '">' +
             '<span class="calv__t">' + (cont ? '↳ ' : '') + esc(e.title) + '</span>' +
             '</div>';
      });
    }
    h += '</div></div>';
  }
  h += '</div>';
  h += '<div class="hint" style="margin-top:8px">💡 一周负荷一眼可见：哪天堆满了、哪天空着。点空白处新建当天事件。</div>';
  host.innerHTML = h;

  host.onclick = function(e){
    var ev = e.target.closest('.calv');
    if(ev && ev.getAttribute('data-ev')){ openCalModal(ev.getAttribute('data-ev')); return; }
    var col = e.target.closest('.wkcol__body');
    if(col){ openCalModal(null, col.getAttribute('data-date')); }
  };
}

/* ============================================================
 * 日视图：单日清单，含完整信息
 * ============================================================ */
function renderDay(){
  var host = $('#calDay');
  if(!host) return;
  var c = state.cal;
  var d = calFocusDate();
  var ds = ymd(d);
  var todayS = ymd(today0());
  var isToday = (ds === todayS);
  var evs = calEvsOn(ds);

  var h = '';
  h += '<div class="dayhd' + (isToday ? ' is-today' : '') + '">' +
       '<b>' + d.getFullYear() + ' 年 ' + (d.getMonth() + 1) + ' 月 ' + d.getDate() + ' 日</b>' +
       '<span>星期' + WD_CN[d.getDay()] + (isToday ? ' · 今天' : '') + '</span>' +
       '<i class="dayhd__n">' + evs.length + ' 个事件</i></div>';

  if(!evs.length){
    h += '<div class="empty">这一天还没有安排。点「➕ 新建事件」为 ' + (d.getMonth() + 1) + ' 月 ' + d.getDate() + ' 日 排一个动作。</div>';
  } else {
    /* 未完成在前，高优先级在前 */
    var ord = {doing:0, todo:1, delayed:2, done:3};
    evs.slice().sort(function(a, b){
      var sa = ord[a.status] != null ? ord[a.status] : 1;
      var sb = ord[b.status] != null ? ord[b.status] : 1;
      if(sa !== sb) return sa - sb;
      var pa = a.pri === 'high' ? 0 : (a.pri === 'mid' ? 1 : 2);
      var pb = b.pri === 'high' ? 0 : (b.pri === 'mid' ? 1 : 2);
      return pa - pb;
    }).forEach(function(e){
      var span = (e.dateEnd && e.dateEnd > e.date);
      h += '<div class="dayev ' + (e.status === 'done' ? 'dayev--done' : '') + '" data-ev="' + e.id + '">';
      h += '<div class="dayev__top"><span class="dayev__t">' + esc(e.title) + '</span>';
      h += '<span class="dayev__tags">' +
           (e.pri ? '<i class="tagpri tagpri--' + e.pri + '">' + (EV_PRI[e.pri] || {}).n + '</i>' : '') +
           '<i class="tagst ' + ((EV_STATUS[e.status] || {}).cls || '') + '">' + ((EV_STATUS[e.status] || {}).n || '待开始') + '</i>' +
           '</span></div>';
      h += '<div class="dayev__meta mono">' + e.date + (span ? ' → ' + e.dateEnd + '（' + calSpanDays(e) + ' 天）' : '') + '</div>';
      if(e.note) h += '<div class="dayev__note">' + esc(e.note) + '</div>';
      h += '</div>';
    });
    h += '<div class="hint" style="margin-top:8px">💡 点任意一条可直接改状态或编辑。</div>';
  }
  host.innerHTML = h;

  host.onclick = function(e){
    var ev = e.target.closest('.dayev');
    if(ev && ev.getAttribute('data-ev')){ openCalModal(ev.getAttribute('data-ev')); }
  };
}
/* 区间天数（含首尾） */
function calSpanDays(e){
  if(!e.dateEnd || e.dateEnd <= e.date) return 1;
  var a = new Date(e.date + 'T00:00:00'), b = new Date(e.dateEnd + 'T00:00:00');
  if(isNaN(a) || isNaN(b)) return 1;
  return Math.round((b - a) / 86400000) + 1;
}

/* ============================================================
 * 看板视图：按状态分列，卡在哪个环节一眼可见
 * ============================================================ */
var BOARD_COLS = ['todo', 'doing', 'done', 'delayed'];

function renderBoard(){
  var host = $('#calBoard');
  if(!host) return;
  var evs = (state.cal.events || []).slice();
  var todayS = ymd(today0());

  var h = '';
  /* 顶部统计 */
  var by = {todo:0, doing:0, done:0, delayed:0};
  evs.forEach(function(e){ var s = e.status || 'todo'; if(by[s] != null) by[s]++; else by.todo++; });
  var total = evs.length;
  var rate = total ? Math.round(by.done / total * 100) : 0;
  h += '<div class="bdstat">';
  h += '<span>共 <b>' + total + '</b> 个动作</span>';
  h += '<span>完成率 <b>' + rate + '%</b></span>';
  h += '<span>进行中 <b>' + by.doing + '</b></span>';
  h += '<span>已延期 <b style="color:var(--alert)">' + by.delayed + '</b></span>';
  h += '<span class="spacer"></span>';
  h += '<span class="hint">点卡片上的 ▶ 推进状态（待开始 → 进行中 → 已完成）</span>';
  h += '</div>';

  h += '<div class="bdgrid">';
  BOARD_COLS.forEach(function(st){
    var meta = EV_STATUS[st] || {n:st};
    var list = evs.filter(function(e){ return (e.status || 'todo') === st; });
    /* 排序：逾期的在前，其次高优先级，其次日期近的 */
    list.sort(function(a, b){
      var oa = (a.status !== 'done' && a.date && a.date < todayS) ? 0 : 1;
      var ob = (b.status !== 'done' && b.date && b.date < todayS) ? 0 : 1;
      if(oa !== ob) return oa - ob;
      var pa = a.pri === 'high' ? 0 : (a.pri === 'mid' ? 1 : 2);
      var pb = b.pri === 'high' ? 0 : (b.pri === 'mid' ? 1 : 2);
      if(pa !== pb) return pa - pb;
      return String(a.date || '') < String(b.date || '') ? -1 : 1;
    });
    h += '<div class="bdcol">';
    h += '<div class="bdcol__hd"><span class="bddot ' + (meta.cls || '') + '"></span>' + meta.n +
         '<i class="bdcol__n">' + list.length + '</i></div>';
    h += '<div class="bdcol__body">';
    if(!list.length){
      h += '<div class="bdcol__empty">暂无</div>';
    } else {
      list.forEach(function(e){
        var overdue = (e.status !== 'done' && e.date && e.date < todayS);
        var span = (e.dateEnd && e.dateEnd > e.date);
        h += '<div class="bdcard' + (overdue ? ' is-overdue' : '') + (e.status === 'done' ? ' is-done' : '') + '" data-ev="' + e.id + '">';
        h += '<div class="bdcard__t">' + esc(e.title) + '</div>';
        h += '<div class="bdcard__meta mono">' + (e.date || '—') +
             (span ? ' → ' + e.dateEnd : '') +
             (e.pri === 'high' ? '　🔥' : '') + '</div>';
        h += '<div class="bdcard__bar">';
        if(overdue) h += '<i class="bdcard__flag">已逾期</i>';
        h += '<button class="bdcard__next" data-next="' + e.id + '" title="推进状态">▶</button>';
        h += '</div>';
        h += '</div>';
      });
    }
    h += '</div></div>';
  });
  h += '</div>';
  host.innerHTML = h;

  host.onclick = function(e){
    var nx = e.target.closest('.bdcard__next');
    if(nx){ evAdvance(nx.getAttribute('data-next')); return; }
    var card = e.target.closest('.bdcard');
    if(card && card.getAttribute('data-ev')){ openCalModal(card.getAttribute('data-ev')); }
  };
}

/* 推进状态：todo → doing → done → todo（循环）；delayed → doing */
function evAdvance(id){
  var ev = (state.cal.events || []).filter(function(x){ return x.id === id; })[0];
  if(!ev) return;
  var cur = ev.status || 'todo';
  var next = cur === 'todo' ? 'doing' : (cur === 'doing' ? 'done' : (cur === 'done' ? 'todo' : 'doing'));
  ev.status = next;
  save();
  toast('已改为「' + ((EV_STATUS[next] || {}).n || next) + '」');
  calApplyView();
  if(typeof renderCalAlerts === 'function') renderCalAlerts();
  if(typeof renderEvList === 'function') renderEvList();
}

/* ============================================================
 * 接管视图调度：calApplyView / calStep
 * 37-quarter.js 只认 month / quarter，这里扩展为 5 视图，
 * 并保留对原实现的调用（不复制逻辑，避免两处漂移）。
 * ============================================================ */
var __calApplyQ = (typeof calApplyView === 'function') ? calApplyView : null;
var __calStepQ  = (typeof calStep === 'function') ? calStep : null;
var __renderCalBase = (typeof __renderCalOrig === 'function') ? __renderCalOrig : renderCal;

calApplyView = function(){
  var c = state.cal;
  var v = c.view || 'month';
  if(!CAL_VIEW_EL[v]) v = 'month';

  /* 1. 容器显隐 */
  CAL_ALL_EL.forEach(function(id){
    var el = $('#' + id);
    if(el) el.style.display = (CAL_VIEW_EL[v] === id) ? '' : 'none';
  });

  /* 2. 渲染当前视图 */
  if(v === 'quarter')      renderQuarter();
  else if(v === 'month')   __renderCalBase();
  else if(v === 'week')    renderWeek();
  else if(v === 'day')     renderDay();
  else if(v === 'board')   renderBoard();

  /* 3. 头部文案 */
  var ym = $('#calYM');
  if(ym) ym.textContent = calHeadText(v);

  /* 4. 上/下一步按钮文案 */
  var pv = $('#btnCalPrev'), nx = $('#btnCalNext');
  var stepName = {month:'月', week:'周', day:'天', quarter:'季', board:'月'}[v];
  if(pv) pv.textContent = '‹ 上' + stepName;
  if(nx) nx.textContent = '下' + stepName + ' ›';
  /* 看板是全局视图，翻页无意义 */
  if(pv) pv.style.display = (v === 'board') ? 'none' : '';
  if(nx) nx.style.display = (v === 'board') ? 'none' : '';

  /* 5. 视图按钮高亮 */
  var box = $('#calViews');
  if(box){
    [].forEach.call(box.querySelectorAll('.calview'), function(b){
      b.classList.toggle('is-on', b.getAttribute('data-v') === v);
    });
  }

  /* 6. 提醒与事件列表（月视图已由 renderCal 内部渲染，此处补齐其余视图） */
  if(v !== 'month'){
    if(typeof renderCalAlerts === 'function') renderCalAlerts();
    if(typeof renderEvList === 'function') renderEvList();
  }
};

function calHeadText(v){
  var c = state.cal;
  if(v === 'quarter'){
    return c.y + ' 年 Q' + ((c.q == null ? qOfMonth(c.m) : c.q) + 1);
  }
  if(v === 'month') return c.y + ' 年 ' + (c.m + 1) + ' 月';
  if(v === 'week'){
    var base = calFocusDate();
    var s = new Date(base); s.setDate(base.getDate() - base.getDay());
    var e2 = new Date(s); e2.setDate(s.getDate() + 6);
    return c.y + ' 年 ' + (s.getMonth() + 1) + '/' + s.getDate() + ' – ' +
           (e2.getMonth() + 1) + '/' + e2.getDate() + '（本周）';
  }
  if(v === 'day'){
    var d = calFocusDate();
    return d.getFullYear() + ' 年 ' + (d.getMonth() + 1) + ' 月 ' + d.getDate() + ' 日 星期' + WD_CN[d.getDay()];
  }
  if(v === 'board') return '全部 ' + ((state.cal.events || []).length) + ' 个动作 · 看板';
  return '';
}

calStep = function(dir){
  var c = state.cal;
  if(c.view === 'week' || c.view === 'day'){
    var base = calFocusDate();
    base.setDate(base.getDate() + dir * (c.view === 'week' ? 7 : 1));
    c.d = ymd(base);
    /* 与月/季联动，切回月视图时落在同一处 */
    c.y = base.getFullYear();
    c.m = base.getMonth();
    c.q = qOfMonth(c.m);
    save();
    calApplyView();
  } else if(__calStepQ){
    __calStepQ(dir);
  }
};

/* ============================================================
 * 绑定：视图切换组 + 今天（周/日视图要同步焦点日）
 * 37-quarter.js 的 bindQuarter() 已在加载时绑过一次，
 * 这里重绑同名元素即可覆盖（元素上存在 onclick 属性赋值，后者生效）。
 * ============================================================ */
function bindCalViews(){
  var box = $('#calViews');
  if(box){
    box.onclick = function(e){
      var b = e.target.closest('.calview');
      if(!b) return;
      var v = b.getAttribute('data-v');
      if(v === state.cal.view) return;
      calSetViewEx(v);
    };
  }
  var pv = $('#btnCalPrev'); if(pv) pv.onclick = function(){ calStep(-1); };
  var nx = $('#btnCalNext'); if(nx) nx.onclick = function(){ calStep(1); };
  var td = $('#btnCalToday');
  if(td) td.onclick = function(){
    var t = today0();
    var c = state.cal;
    c.y = t.getFullYear();
    c.m = t.getMonth();
    c.q = qOfMonth(c.m);
    c.d = ymd(t);
    save();
    calApplyView();
  };
}

/* 视图切换（含焦点日初始化） */
function calSetViewEx(v){
  var c = state.cal;
  if(v === 'week' || v === 'day'){
    /* 从月/季切进来时，焦点日取当前月今天；若已在其他月，取该月 1 日 */
    if(!c.d){
      var t = today0();
      c.d = (c.y === t.getFullYear() && c.m === t.getMonth()) ? ymd(t)
            : ymd(new Date(c.y, c.m, 1));
    }
    c.view = v;
    save();
    calApplyView();
    return;
  }
  /* 月 / 季 / 看板：沿用 37 的切换逻辑（它负责月份位置的换算） */
  if(typeof calSetView === 'function' && (v === 'month' || v === 'quarter')){
    calSetView(v);
    return;
  }
  c.view = v;
  save();
  calApplyView();
}

bindCalViews();
