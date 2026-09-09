/* ============================================================
 * 营销日历 —— 时间轴与行动中枢
 * 精简版：月视图 + 事件增删改 + 状态 + 节点库 + 到期提醒
 * 说明：无后端，提醒在「打开页面时」计算，不承诺关页面后仍推送
 * ============================================================ */
var EV_STATUS = {
  todo:   {n:'待开始', cls:'is-todo'},
  doing:  {n:'进行中', cls:'is-doing'},
  done:   {n:'已完成', cls:'is-done'},
  delayed:{n:'已延期', cls:'is-delayed'}
};
var EV_PRI = {high:{n:'高',cls:'pri--high'}, mid:{n:'中',cls:'pri--mid'}, low:{n:'低',cls:'pri--low'}};

var CAL_NODES_LIB = [
  {n:'元旦', md:'01-01'}, {n:'年货节', md:'01-20'}, {n:'情人节', md:'02-14'},
  {n:'春节', md:'02-17'}, {n:'妇女节', md:'03-08'}, {n:'五一', md:'05-01'},
  {n:'母亲节', md:'05-10'}, {n:'618 大促', md:'06-18'}, {n:'818 大促', md:'08-18'},
  {n:'七夕', md:'08-19'}, {n:'开学季', md:'09-01'}, {n:'99 大促', md:'09-09'},
  {n:'中秋', md:'09-25'}, {n:'国庆', md:'10-01'}, {n:'双 11', md:'11-11'},
  {n:'双 12', md:'12-12'}, {n:'圣诞', md:'12-25'}
];

/* ---------- 日期工具 ---------- */
function ymd(d){
  return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
}
function today0(){ var d = new Date(); d.setHours(0,0,0,0); return d; }
function dayDiff(a, b){ return Math.round((a - b) / 86400000); }

/* ---------- 渲染月视图 ---------- */
function renderCal(){
  var c = state.cal;
  var y = c.y, m = c.m; // m: 0-11
  var first = new Date(y, m, 1);
  var start = new Date(first); start.setDate(1 - first.getDay()); // 周日起
  var today = today0();
  var todayS = ymd(today);

  var el = $('#calYM');
  if(el) el.textContent = y + ' 年 ' + (m+1) + ' 月';

  var grid = $('#calGrid');
  if(!grid) return;
  var WD = ['日','一','二','三','四','五','六'];
  var h = '';
  WD.forEach(function(w){ h += '<div class="calgrid__wd">' + w + '</div>'; });

  for(var i=0;i<42;i++){
    var d = new Date(start); d.setDate(start.getDate() + i);
    var ds = ymd(d);
    var out = (d.getMonth() !== m);
    var isToday = (ds === todayS);
    var evs = (c.events || []).filter(function(e){ return e.date === ds; });
    h += '<div class="calcell' + (out?' is-out':'') + (isToday?' is-today':'') + '" data-date="' + ds + '">';
    h += '<div class="calcell__d"><span>' + d.getDate() + '</span>';
    if(evs.length) h += '<span class="mono" style="font-size:9.5px">' + evs.length + '</span>';
    h += '</div>';
    evs.slice(0,3).forEach(function(e){
      h += '<div class="calev ' + (e.status==='done'?'calev--done':e.status==='delayed'?'calev--delayed':'') +
           (e.pri==='high'?' calev--high':'') + '" data-ev="' + e.id + '" title="' + esc(e.title) + '">' +
           esc(e.title) + '</div>';
    });
    if(evs.length > 3) h += '<div class="calcell__d" style="margin-top:2px">+' + (evs.length-3) + '</div>';
    h += '</div>';
  }
  grid.innerHTML = h;

  // 点空白格 = 新建；点事件 = 编辑
  grid.onclick = function(e){
    var ev = e.target.closest('.calev');
    if(ev){ openCalModal(ev.getAttribute('data-ev')); return; }
    var cell = e.target.closest('.calcell');
    if(cell){ openCalModal(null, cell.getAttribute('data-date')); }
  };

  renderCalAlerts();
  renderEvList();
}

/* ---------- 到期提醒（打开页面时计算） ---------- */
function renderCalAlerts(){
  var host = $('#calAlerts'); if(!host) return;
  var today = today0();
  var evs = (state.cal.events || []).filter(function(e){ return e.status !== 'done'; });
  var overdue = [], soon = [];
  evs.forEach(function(e){
    var d = new Date(e.date + 'T00:00:00');
    if(isNaN(d)) return;
    var diff = dayDiff(d, today);
    if(diff < 0){ overdue.push({e:e, days:Math.abs(diff)}); }
    else if(diff <= 3){ soon.push({e:e, days:diff}); }
  });
  var h = '';
  if(overdue.length){
    h += '<div class="calalert"><b>⚠️ ' + overdue.length + ' 项已逾期</b>' +
         '<span>' + overdue.slice(0,3).map(function(x){ return esc(x.e.title) + '（逾期 ' + x.days + ' 天）'; }).join('、') +
         (overdue.length>3 ? ' 等' : '') + '</span><span class="spacer"></span>' +
         '<button class="btn btn--sm btn--ghost" id="btnMarkOverdue">全部标记延期</button></div>';
  }
  if(soon.length){
    h += '<div class="calalert calalert--soon"><b>⏳ ' + soon.length + ' 项即将到期</b>' +
         '<span>' + soon.slice(0,3).map(function(x){ return esc(x.e.title) + '（' + (x.days===0?'今天':x.days+' 天后') + '）'; }).join('、') +
         (soon.length>3 ? ' 等' : '') + '</span></div>';
  }
  host.innerHTML = h;
  var b = $('#btnMarkOverdue');
  if(b) b.onclick = function(){
    overdue.forEach(function(x){ x.e.status = 'delayed'; });
    save(); renderCal(); toast('已标记 ' + overdue.length + ' 项为延期');
  };
}

/* ---------- 事件列表 ---------- */
function renderEvList(){
  var host = $('#evList'); if(!host) return;
  var evs = (state.cal.events || []).slice().sort(function(a,b){ return a.date < b.date ? -1 : 1; });
  if(!evs.length){
    host.innerHTML = '<div class="calempty">还没有事件<br>点「➕ 新建事件」或「🎯 节点库」一键添加</div>';
    return;
  }
  var h = '';
  evs.forEach(function(e){
    var st = EV_STATUS[e.status] || EV_STATUS.todo;
    var pr = EV_PRI[e.pri] || EV_PRI.mid;
    h += '<div class="evrow">';
    h += '<span class="badge ' + st.cls + '"><i class="dot"></i>' + st.n + '</span>';
    h += '<span class="evrow__t">' + esc(e.title) + '</span>';
    h += '<span class="pri ' + pr.cls + '">' + pr.n + '</span>';
    h += '<span class="evrow__d">' + e.date.slice(5) + '</span>';
    h += '<span class="evrow__ops">';
    if(e.status !== 'done') h += '<button data-op="done" data-id="' + e.id + '">完成</button>';
    if(e.link) h += '<button data-op="go" data-id="' + e.id + '">跳转</button>';
    h += '<button data-op="edit" data-id="' + e.id + '">编辑</button>';
    h += '</span></div>';
  });
  host.innerHTML = h;
  host.onclick = function(ev){
    var b = ev.target.closest('button[data-op]'); if(!b) return;
    var op = b.getAttribute('data-op'), id = b.getAttribute('data-id');
    var e = (state.cal.events||[]).filter(function(x){ return x.id === id; })[0];
    if(!e) return;
    if(op === 'done'){ e.status = 'done'; save(); renderCal(); toast('已标记完成'); }
    else if(op === 'edit'){ openCalModal(id); }
    else if(op === 'go'){ switchTab(e.link); }
  };
}

/* ---------- 弹层 ---------- */
var calEditingId = null;
function openCalModal(id, date){
  calEditingId = id || null;
  var e = id ? (state.cal.events||[]).filter(function(x){ return x.id === id; })[0] : null;
  $('#calModalTitle').textContent = e ? '✏️ 编辑事件' : '➕ 新建事件';
  $('#ev_title').value  = e ? e.title : '';
  $('#ev_date').value   = e ? e.date : (date || ymd(today0()));
  $('#ev_pri').value    = e ? e.pri : 'mid';
  $('#ev_status').value = e ? e.status : 'todo';
  $('#ev_link').value   = e ? (e.link || '') : '';
  $('#ev_note').value   = e ? (e.note || '') : '';
  $('#btnEvDel').style.display = e ? '' : 'none';
  $('#maskCal').classList.add('is-on');
}
function saveCalEvent(){
  var t = $('#ev_title').value.trim();
  if(!t){ toast('请填写标题'); return; }
  var d = $('#ev_date').value || ymd(today0());
  var o = {
    title:t, date:d,
    pri:$('#ev_pri').value, status:$('#ev_status').value,
    link:$('#ev_link').value, note:$('#ev_note').value.trim()
  };
  if(calEditingId){
    var e = (state.cal.events||[]).filter(function(x){ return x.id === calEditingId; })[0];
    if(e){ e.title=o.title; e.date=o.date; e.pri=o.pri; e.status=o.status; e.link=o.link; e.note=o.note; }
  } else {
    o.id = 'ev' + Date.now() + Math.floor(Math.random()*100);
    state.cal.events.push(o);
  }
  save();
  $('#maskCal').classList.remove('is-on');
  renderCal();
  toast(calEditingId ? '已保存' : '已添加');
}

/* ---------- 节点库 ---------- */
function renderNodeChips(){
  var host = $('#nodeChips'); if(!host) return;
  var y = today0().getFullYear();
  host.innerHTML = '';
  CAL_NODES_LIB.forEach(function(n){
    var b = document.createElement('button');
    b.className = 'chip';
    b.textContent = n.n + ' · ' + n.md.replace('-','/');
    b.onclick = function(){
      var mm = n.md.split('-');
      var dt = new Date(y, parseInt(mm[0],10)-1, parseInt(mm[1],10));
      if(dt < today0()) dt = new Date(y+1, parseInt(mm[0],10)-1, parseInt(mm[1],10));
      state.cal.events.push({
        id:'ev' + Date.now() + Math.floor(Math.random()*100),
        title:n.n, date:ymd(dt), pri:'mid', status:'todo', link:'', note:'来自节点库'
      });
      save(); renderCal();
      $('#maskNode').classList.remove('is-on');
      toast('已添加「' + n.n + '」');
    };
    host.appendChild(b);
  });
}

/* ---------- 供其他模块调用：把倒排结果存入日历 ---------- */
function importPlanToCal(nodes){
  if(!nodes || !nodes.length){ toast('没有可导入的排期'); return; }
  var n = 0;
  nodes.forEach(function(nd){
    state.cal.events.push({
      id:'ev' + Date.now() + Math.floor(Math.random()*100) + n,
      title:nd.n, date:ymd(nd.date), pri:'high', status:'todo',
      link:'', note:'由营销日历倒排导入'
    });
    n++;
  });
  save();
  renderCal();
  toast('已导入 ' + n + ' 个节点到日历');
  return n;
}

/* ---------- 切换 Tab（供跳转用） ---------- */
function switchTab(name){
  var btn = document.querySelector('.tab[data-tab="' + name + '"]');
  if(btn && btn.onclick) btn.onclick();
  else if(btn) btn.click();
}

