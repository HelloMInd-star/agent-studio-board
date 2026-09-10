/* ============================================================
 * 35-insight.js —— 洞察与导出（第 3 批）
 *
 * ① 品牌轨迹洞察：活跃度趋势 / 内容质量趋势 / 执行完成率 / 跟进提醒
 *    原则：全部为对已有记录的确定性聚合，不猜、不补、不编造。
 *    样本不足时明确标注「暂不可判断」，而不是硬给一个趋势。
 *
 * ② 日历导出：iCal(.ics) + CSV
 *    iCal 的两个硬规则：
 *      · DTEND 对全天事件是「 exclusive 」——单日 09-04 必须写 DTEND 09-05
 *      · RFC 5545 要求单行 ≤75 octets，超长必须折行且续行以空格开头
 *    CSV 带 UTF-8 BOM，否则 Excel 打开中文乱码。
 *
 * ③ 轨迹导出：CSV（与已有的 Markdown 导出互补）
 *
 * 依赖：33-timeline.js（tlCollect / TL_TYPES / tlDay）
 *       17-calendar.js（EV_STATUS / EV_PRI / ymd / today0 / dayDiff）
 *       09-agent.js（downloadFile）
 * ============================================================ */

/* ---------- 通用数学 ---------- */
/* 最小二乘斜率：ys 为按时间正序排列的序列，返回每次观测的平均变化量 */
function lsSlope(ys){
  var n = ys.length;
  if(n < 2) return 0;
  var sx = 0, sy = 0, sxy = 0, sxx = 0;
  for(var i = 0; i < n; i++){
    sx += i; sy += ys[i]; sxy += i * ys[i]; sxx += i * i;
  }
  var den = n * sxx - sx * sx;
  if(!den) return 0;
  return (n * sxy - sx * sy) / den;
}

/* 'YYYY-MM-DD' → Date（按本地时区，避免 new Date('2026-09-04') 按 UTC 解析导致差一天） */
function parseDay(s){
  if(!s) return null;
  var m = String(s).trim().match(/(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if(!m) return null;
  return new Date(parseInt(m[1], 10), parseInt(m[2], 10) - 1, parseInt(m[3], 10));
}
/* 距今天数（今天=0，昨天=1） */
function daysAgo(dayStr){
  var d = parseDay(dayStr);
  if(!d) return -1;
  return dayDiff(today0(), d);
}
function mean(arr){
  if(!arr || !arr.length) return 0;
  var s = 0;
  arr.forEach(function(x){ s += x; });
  return s / arr.length;
}

/* ============================================================
   ① 洞察计算
   ============================================================ */

/* 活跃度：最近 30 天每天的记录数 */
function insActivity(all){
  var today = today0();
  var byDay = {};
  all.forEach(function(r){ if(r.day) byDay[r.day] = (byDay[r.day] || 0) + 1; });
  var days = [];
  for(var i = 29; i >= 0; i--){
    var d = new Date(today);
    d.setDate(d.getDate() - i);
    var s = ymd(d);
    days.push({d: s, n: byDay[s] || 0});
  }
  var max = 1;
  days.forEach(function(x){ if(x.n > max) max = x.n; });
  var total = 0, active = 0;
  days.forEach(function(x){ total += x.n; if(x.n > 0) active++; });
  return {days: days, max: max, total: total, active: active};
}

/* 内容质量趋势：对 state.scores 做回归 */
function insScoreTrend(){
  var sc = (state.scores || []).slice().filter(function(s){ return s && s.total != null; });
  sc.sort(function(a, b){
    var da = tlDay(a.d), db = tlDay(b.d);
    if(da !== db) return da < db ? -1 : 1;
    return 0;
  });
  var ys = sc.map(function(s){ return s.total; });
  var n = ys.length;
  var slope = lsSlope(ys);
  var dir, dirTxt;
  if(n < 5){
    dir = 'na';
    dirTxt = '样本不足';
  } else if(slope > 1.0){ dir = 'up2'; dirTxt = '明显上升'; }
  else if(slope > 0.5){ dir = 'up'; dirTxt = '稳步上升'; }
  else if(slope < -1.0){ dir = 'down2'; dirTxt = '明显下滑'; }
  else if(slope < -0.5){ dir = 'down'; dirTxt = '略有下滑'; }
  else { dir = 'flat'; dirTxt = '基本持平'; }

  /* 前一半 vs 后一半：只有样本够多才比较，否则容易得出假结论 */
  var halfOk = n >= 10;
  var earlyAvg = 0, recentAvg = 0;
  if(halfOk){
    var h = Math.floor(n / 2);
    earlyAvg = Math.round(mean(ys.slice(0, h)));
    recentAvg = Math.round(mean(ys.slice(h)));
  }
  return {
    n: n, slope: slope, dir: dir, dirTxt: dirTxt,
    avg: n ? Math.round(mean(ys)) : 0,
    max: n ? Math.max.apply(null, ys) : 0,
    min: n ? Math.min.apply(null, ys) : 0,
    first: n ? ys[0] : 0,
    last: n ? ys[n - 1] : 0,
    halfOk: halfOk, earlyAvg: earlyAvg, recentAvg: recentAvg
  };
}

/* 执行完成率 */
function insCalStat(){
  var evs = (state.cal && state.cal.events) || [];
  var by = {todo: 0, doing: 0, done: 0, delayed: 0};
  evs.forEach(function(e){
    var s = e.status || 'todo';
    if(by[s] != null) by[s]++; else by.todo++;
  });
  var today = ymd(today0());
  var overdue = evs.filter(function(e){
    return e.status !== 'done' && e.date && e.date < today;
  });
  var total = evs.length;
  return {
    total: total, by: by, overdue: overdue,
    rate: total ? Math.round(by.done / total * 100) : 0
  };
}

/* 跟进提醒：某类记录太久没新增 */
function insGaps(all){
  var lastBy = {};
  all.forEach(function(r){
    if(!r.day) return;
    if(!lastBy[r.k] || r.day > lastBy[r.k]) lastBy[r.k] = r.day;
  });
  /* 各类型的合理间隔天数是经验值：营销动作/内容体检以周计，
     竞品动态以月计，战略快照按季度即可。超过才提醒，避免误报。 */
  var TH = {cal: 14, score: 14, rival: 30, snap: 60, trace: 30, hist: 30, chat: 30};
  var out = [];
  TL_TYPES.forEach(function(t){
    var d = lastBy[t.k];
    if(!d) return;
    var gap = daysAgo(d);
    if(gap < 0) return;
    var th = TH[t.k] || 30;
    if(gap > th) out.push({k: t.k, n: t.n, em: t.em, days: gap, th: th, last: d, jump: t.jump});
  });
  out.sort(function(a, b){ return b.days - a.days; });
  return out;
}

/* 类别分布：找出最活跃的一类 */
function insSpread(all){
  var cnt = {};
  TL_TYPES.forEach(function(t){ cnt[t.k] = 0; });
  all.forEach(function(r){ if(cnt[r.k] != null) cnt[r.k]++; });
  var top = null;
  TL_TYPES.forEach(function(t){
    if(!top || cnt[t.k] > cnt[top.k]) top = {k: t.k, n: t.n, em: t.em, c: cnt[t.k]};
  });
  return {cnt: cnt, top: (top && top.c > 0) ? top : null, total: all.length};
}

/* ============================================================
   ① 洞察渲染
   ============================================================ */
function renderInsight(){
  var host = $('#tlInsight');
  if(!host) return;
  var all = tlCollect();
  var act = insActivity(all);
  var sc = insScoreTrend();
  var cs = insCalStat();
  var gaps = insGaps(all);
  var sp = insSpread(all);

  var h = '';

  /* ---- 卡片 1：活跃度 ---- */
  h += '<div class="ins">';
  h += '<div class="ins__hd">📊 最近 30 天活跃度</div>';
  if(sp.total === 0){
    h += '<div class="ins__empty">还没有任何记录<br>用起来之后，这里会自动画出节奏</div>';
  } else {
    h += '<div class="ins__big">' + act.total + '<span class="ins__unit">条</span></div>';
    h += '<div class="ins__sub">分布在 ' + act.active + ' 天里' +
         (sp.top ? '　·　最多：' + sp.top.em + ' ' + esc(sp.top.n) + ' ' + sp.top.c + ' 条' : '') + '</div>';
    h += '<div class="inspark">';
    act.days.forEach(function(d){
      var pct = Math.round(d.n / act.max * 100);
      var hh = d.n ? Math.max(3, Math.round(d.n / act.max * 34)) : 2;
      h += '<i class="inspark__b' + (d.n ? '' : ' is-zero') + '" style="height:' + hh + 'px" title="' +
           d.d + '：' + d.n + ' 条"></i>';
    });
    h += '</div>';
    h += '<div class="ins__axis"><span>30 天前</span><span>今天</span></div>';
  }
  h += '</div>';

  /* ---- 卡片 2：内容质量趋势 ---- */
  h += '<div class="ins">';
  h += '<div class="ins__hd">🩺 内容质量趋势</div>';
  if(sc.n === 0){
    h += '<div class="ins__empty">还没有体检记录<br>在内容工厂生成后点「🩺 内容体检」</div>';
  } else {
    var dcls = sc.dir === 'na' ? 'is-na' :
               (sc.dir.indexOf('up') === 0 ? 'is-up' :
                sc.dir.indexOf('down') === 0 ? 'is-down' : 'is-flat');
    var arrow = sc.dir === 'na' ? '—' :
                (sc.dir.indexOf('up') === 0 ? '↑' : sc.dir.indexOf('down') === 0 ? '↓' : '→');
    h += '<div class="ins__big">' + sc.last + '<span class="ins__unit">分（最新）</span></div>';
    h += '<div class="ins__trend ' + dcls + '">' + arrow + ' ' + esc(sc.dirTxt) +
         (sc.dir !== 'na' ? '　斜率 ' + sc.slope.toFixed(2) + ' 分/次' : '') + '</div>';
    h += '<div class="ins__sub">共 ' + sc.n + ' 次 · 均值 ' + sc.avg +
         ' · 区间 ' + sc.min + '–' + sc.max + '</div>';
    if(sc.dir === 'na'){
      h += '<div class="ins__warn">⚠️ 样本不足（' + sc.n + '/5），趋势暂不可判断。<br>再积累几次体检结果才能看出走向。</div>';
    } else if(sc.halfOk){
      var dv = sc.recentAvg - sc.earlyAvg;
      h += '<div class="ins__sub">前半程均值 ' + sc.earlyAvg + ' → 后半程 ' + sc.recentAvg +
           (dv > 0 ? '　<span class="is-up">↑ +' + dv + '</span>' :
            dv < 0 ? '　<span class="is-down">↓ ' + dv + '</span>' : '　基本持平') + '</div>';
    }
  }
  h += '</div>';

  /* ---- 卡片 3：执行完成率 ---- */
  h += '<div class="ins">';
  h += '<div class="ins__hd">📅 执行完成率</div>';
  if(cs.total === 0){
    h += '<div class="ins__empty">日历里还没有事件<br>把策略落成具体动作，才能追踪执行</div>';
  } else {
    var rcls = cs.rate >= 70 ? 'is-up' : cs.rate >= 40 ? 'is-flat' : 'is-down';
    h += '<div class="ins__big">' + cs.rate + '<span class="ins__unit">%</span></div>';
    h += '<div class="ins__trend ' + rcls + '">' + cs.by.done + ' / ' + cs.total + ' 条已完成</div>';
    h += '<div class="ins__sub">待开始 ' + cs.by.todo + ' · 进行中 ' + cs.by.doing +
         ' · 已延期 ' + cs.by.delayed + '</div>';
    if(cs.overdue.length){
      h += '<div class="ins__warn">⚠️ ' + cs.overdue.length + ' 条已过计划日期仍未完成' +
           '<br>最早一条：' + esc(cs.overdue[0].title || '未命名') + '（' + esc(cs.overdue[0].date) + '）</div>';
    }
  }
  h += '</div>';

  /* ---- 卡片 4：跟进提醒 ---- */
  h += '<div class="ins">';
  h += '<div class="ins__hd">🔔 跟进提醒</div>';
  if(gaps.length === 0){
    h += '<div class="ins__ok">✅ 各类记录都在合理间隔内<br>暂时没有需要补的</div>';
  } else {
    h += '<div class="ins__sub" style="margin-bottom:8px">以下类型太久没有新增：</div>';
    gaps.slice(0, 4).forEach(function(g){
      h += '<div class="insgap" data-jump="' + esc(g.jump || '') + '">' +
           '<span class="insgap__em">' + g.em + '</span>' +
           '<span class="insgap__n">' + esc(g.n) + '</span>' +
           '<span class="insgap__d">已 ' + g.days + ' 天</span>' +
           '<span class="insgap__last">上次 ' + esc(g.last) + '</span></div>';
    });
    h += '<div class="ins__sub" style="margin-top:8px">💡 间隔阈值为经验值（动作/体检 14 天，竞品 30 天，战略快照 60 天）</div>';
  }
  h += '</div>';

  host.innerHTML = h;

  /* 跟进提醒可点击跳到对应模块 */
  [].forEach.call(host.querySelectorAll('.insgap[data-jump]'), function(el){
    var t = el.getAttribute('data-jump');
    if(!t) return;
    el.onclick = function(){ if(typeof tlJumpTo === 'function') tlJumpTo(t, ''); };
  });
}

/* ============================================================
   ② 日历导出：iCal
   ============================================================ */
function icsEsc(s){
  return String(s == null ? '' : s)
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}
/* RFC 5545 折行：单行 ≤75 octets，续行以空格开头。
   这里按 UTF-8 字节数近似（CJK 记 3 字节），阈值取 70 留余量。 */
function icsFold(line){
  var s = String(line), out = [], cur = '', bytes = 0, LIMIT = 70;
  for(var i = 0; i < s.length; i++){
    var ch = s.charAt(i);
    var cb = ch.charCodeAt(0) > 127 ? 3 : 1;
    if(bytes + cb > LIMIT){
      out.push(cur);
      cur = ' ' + ch;
      bytes = 1 + cb;
    } else {
      cur += ch;
      bytes += cb;
    }
  }
  out.push(cur);
  return out.join('\r\n');
}
function icsPad(n){ return (n < 10 ? '0' : '') + n; }
function icsStamp(d){
  return d.getUTCFullYear() + icsPad(d.getUTCMonth() + 1) + icsPad(d.getUTCDate()) + 'T' +
         icsPad(d.getUTCHours()) + icsPad(d.getUTCMinutes()) + icsPad(d.getUTCSeconds()) + 'Z';
}
/* 全天事件的 DTEND 是 exclusive：加一天 */
function icsNextDay(s){
  var d = parseDay(s);
  if(!d) return s;
  d.setDate(d.getDate() + 1);
  return ymd(d);
}

function calToIcs(){
  var evs = (state.cal && state.cal.events) || [];
  if(!evs.length){ toast('日历里还没有事件'); return; }
  var L = [];
  L.push('BEGIN:VCALENDAR');
  L.push('VERSION:2.0');
  L.push('PRODID:-//Y.Mine//Agent Studio Board//ZH');
  L.push('CALSCALE:GREGORIAN');
  L.push('METHOD:PUBLISH');
  L.push('X-WR-CALNAME:' + icsEsc('营销日历'));
  L.push('X-WR-TIMEZONE:Asia/Shanghai');
  var now = icsStamp(new Date());
  var n = 0;
  evs.forEach(function(e){
    var start = tlDay(e.date) || tlDay(e.dateEnd);
    if(!start) return;
    var endRaw = tlDay(e.dateEnd) || start;
    if(endRaw < start) endRaw = start;
    var end = icsNextDay(endRaw);
    L.push('BEGIN:VEVENT');
    L.push('UID:' + (e.id || ('ev' + Date.now() + n)) + '@ymine.local');
    L.push('DTSTAMP:' + now);
    L.push('DTSTART;VALUE=DATE:' + start.replace(/-/g, ''));
    L.push('DTEND;VALUE=DATE:' + end.replace(/-/g, ''));
    L.push('SUMMARY:' + icsEsc(e.title || '未命名事件'));
    var desc = [];
    var st = (typeof EV_STATUS !== 'undefined' && EV_STATUS[e.status]) ? EV_STATUS[e.status].n : '';
    var pr = (typeof EV_PRI !== 'undefined' && EV_PRI[e.pri]) ? EV_PRI[e.pri].n : '';
    if(st) desc.push('状态：' + st);
    if(pr) desc.push('优先级：' + pr);
    if(e.note) desc.push(e.note);
    if(e.link) desc.push('链接：' + e.link);
    if(desc.length) L.push('DESCRIPTION:' + icsEsc(desc.join('\n')));
    if(e.link) L.push('URL:' + icsEsc(e.link));
    L.push('STATUS:' + (e.status === 'done' ? 'CONFIRMED' : 'TENTATIVE'));
    L.push('END:VEVENT');
    n++;
  });
  L.push('END:VCALENDAR');
  var txt = L.map(icsFold).join('\r\n') + '\r\n';
  downloadFile('marketing-calendar-' + ymd(today0()) + '.ics', txt, 'text/calendar;charset=utf-8');
  toast('已导出 ' + n + ' 个事件（.ics）');
}

/* ============================================================
   ② 日历导出：CSV
   ============================================================ */
function csvCell(v){
  var s = (v == null ? '' : String(v));
  if(/[",\r\n]/.test(s)) s = '"' + s.replace(/"/g, '""') + '"';
  return s;
}
function csvText(rows){
  return '\uFEFF' + rows.map(function(r){
    return r.map(csvCell).join(',');
  }).join('\r\n');
}
function calToCsv(){
  var evs = (state.cal && state.cal.events) || [];
  if(!evs.length){ toast('日历里还没有事件'); return; }
  var sorted = evs.slice().sort(function(a, b){
    var da = tlDay(a.date) || '', db = tlDay(b.date) || '';
    return da < db ? -1 : da > db ? 1 : 0;
  });
  var rows = [['标题', '开始日期', '结束日期', '天数', '状态', '优先级', '备注', '链接']];
  sorted.forEach(function(e){
    var s = tlDay(e.date) || '';
    var en = tlDay(e.dateEnd) || s;
    if(en < s) en = s;
    var days = 1;
    if(s && en){
      var d1 = parseDay(s), d2 = parseDay(en);
      if(d1 && d2) days = dayDiff(d2, d1) + 1;
    }
    var st = (typeof EV_STATUS !== 'undefined' && EV_STATUS[e.status]) ? EV_STATUS[e.status].n : (e.status || '');
    var pr = (typeof EV_PRI !== 'undefined' && EV_PRI[e.pri]) ? EV_PRI[e.pri].n : (e.pri || '');
    rows.push([e.title || '未命名事件', s, en, days, st, pr, e.note || '', e.link || '']);
  });
  downloadFile('marketing-calendar-' + ymd(today0()) + '.csv', csvText(rows), 'text/csv;charset=utf-8');
  toast('已导出 ' + sorted.length + ' 个事件（.csv）');
}

/* ============================================================
   ③ 轨迹导出：CSV
   ============================================================ */
function exportTimelineCsv(){
  var all = tlCollect();
  if(!all.length){ toast('还没有可导出的记录'); return; }
  var dated = all.filter(function(r){ return r.day; }).sort(function(a, b){
    if(a.day !== b.day) return a.day < b.day ? 1 : -1;
    return (a.time || '') < (b.time || '') ? 1 : -1;
  });
  var undated = all.filter(function(r){ return !r.day; });
  var rows = [['日期', '时间', '类型', '标题', '摘要']];
  dated.concat(undated).forEach(function(r){
    var t = TL_TYPES.filter(function(x){ return x.k === r.k; })[0] || {n: r.k};
    rows.push([r.day || '日期未知', r.time || '', t.n, r.t, r.meta || '']);
  });
  downloadFile('brand-timeline-' + ymd(today0()) + '.csv', csvText(rows), 'text/csv;charset=utf-8');
  toast('已导出 ' + all.length + ' 条记录（.csv）');
}

/* ============================================================
   绑定
   ============================================================ */
function bindInsight(){
  var i1 = $('#btnCalIcs'); if(i1) i1.onclick = calToIcs;
  var i2 = $('#btnCalCsv'); if(i2) i2.onclick = calToCsv;
  var i3 = $('#btnTlCsv'); if(i3) i3.onclick = exportTimelineCsv;
}
bindInsight();
