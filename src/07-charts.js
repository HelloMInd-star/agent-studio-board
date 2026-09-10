/* ============================================================
 * 商业图卡引擎 —— 手写 SVG，零依赖，可导出
 * ============================================================ */
var CHART_TYPES = [
  {k:'swot',    n:'🎯 SWOT 四象限', d:'策略分析经典框架'},
  {k:'pos',     n:'🗺️ 竞品定位地图', d:'二维坐标看竞争格局'},
  {k:'persona', n:'👤 用户画像卡', d:'调研结论一图说清'},
  {k:'funnel',  n:'🔻 转化漏斗', d:'自动算各环节转化率'},
  {k:'mind',    n:'🧠 思维导图', d:'缩进即层级的发散结构'}
];

/* 工具：转义 SVG 文本 */
function esc(s){
  return String(s == null ? '' : s)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}
/* 工具：按行拆分并去掉空行 */
function lines(s){
  return String(s || '').split('\n').map(function(x){ return x.trim(); })
    .filter(function(x){ return x.length; });
}
/* 工具：SVG 内文本自动换行（按字符数粗暴折行，中文够用） */
function wrapText(text, per){
  var out = [], cur = '';
  for(var i=0;i<text.length;i++){
    cur += text[i];
    if(cur.length >= per){ out.push(cur); cur = ''; }
  }
  if(cur) out.push(cur);
  return out.length ? out : [''];
}

/* ---------- 咨询公司风配色与版式 ----------
 * 注意：CX 是 SVG 图卡专用配色，刻意不跟随 UI 主题（不用 var()）。
 * 原因：图卡要被截图 / 导出后放进方案与 PPT，必须恒为白底提案风；
 *      若跟随 dark 主题，深色底图卡贴进白色文档会完全不可用。
 * 因此这里的色值是「设计常量」而非「主题变量」，改动需同步评估导出效果。
 */
var CX = {
  ink:'#0f172a', sub:'#475569', mute:'#94a3b8',
  line:'#e2e8f0', soft:'#f8fafc', paper:'#ffffff',
  brand:'#1e3a8a', brandSoft:'#eff6ff',
  s:'#047857', sBg:'#ecfdf5', w:'#b45309', wBg:'#fffbeb',
  o:'#1d4ed8', oBg:'#eff6ff', t:'#b91c1c', tBg:'#fef2f2'
};
/* 统一页面框架：标题区 + 内容区 + 页脚（提案页观感） */
function cxFrame(W,H,title,sub){
  var s = '<defs>'
    + '<filter id="cxShadow" x="-20%" y="-20%" width="140%" height="140%">'
    + '<feDropShadow dx="0" dy="1" stdDeviation="2" flood-color="#0f172a" flood-opacity="0.06"/>'
    + '</filter></defs>';
  s += '<rect width="'+W+'" height="'+H+'" fill="'+CX.paper+'"/>';
  // 顶部品牌细线
  s += '<rect x="0" y="0" width="'+W+'" height="3" fill="'+CX.brand+'"/>';
  // 标题
  s += '<text x="48" y="56" font-size="25" font-weight="700" fill="'+CX.ink+'" letter-spacing="0.3">'+esc(title)+'</text>';
  if(sub){
    s += '<text x="48" y="80" font-size="13" fill="'+CX.mute+'">'+esc(sub)+'</text>';
  }
  s += '<line x1="48" y1="98" x2="'+(W-48)+'" y2="98" stroke="'+CX.line+'" stroke-width="1"/>';
  // 页脚
  s += '<line x1="48" y1="'+(H-46)+'" x2="'+(W-48)+'" y2="'+(H-46)+'" stroke="'+CX.line+'" stroke-width="1"/>';
  s += '<text x="48" y="'+(H-24)+'" font-size="10.5" fill="'+CX.mute+'" letter-spacing="0.5">Y.MINE · MARKETING WORKSPACE</text>';
  s += '<text x="'+(W-48)+'" y="'+(H-24)+'" font-size="10.5" fill="'+CX.mute+'" text-anchor="end">本地生成 · 数据不出浏览器</text>';
  return s;
}
function todayStr(){
  var d = new Date();
  return d.getFullYear() + '.' + ('0'+(d.getMonth()+1)).slice(-2) + '.' + ('0'+d.getDate()).slice(-2);
}

/* ---------- 1. SWOT 四象限 ---------- */
function svgSwot(d){
  var W = 960, H = 720, pad = 48, gap = 18, top = 122;
  var title = d.title || 'SWOT 分析';
  var qW = (W - pad*2 - gap) / 2;
  var qH = (H - top - 72 - gap) / 2;
  var quads = [
    {label:'S  STRENGTHS', cn:'优势', items:lines(d.s), c:CX.s, bg:CX.sBg, x:pad, y:top},
    {label:'W  WEAKNESSES', cn:'劣势', items:lines(d.w), c:CX.w, bg:CX.wBg, x:pad+qW+gap, y:top},
    {label:'O  OPPORTUNITIES', cn:'机会', items:lines(d.o), c:CX.o, bg:CX.oBg, x:pad, y:top+qH+gap},
    {label:'T  THREATS', cn:'威胁', items:lines(d.t), c:CX.t, bg:CX.tBg, x:pad+qW+gap, y:top+qH+gap}
  ];
  var s = '<svg xmlns="http://www.w3.org/2000/svg" width="'+W+'" height="'+H+'" viewBox="0 0 '+W+' '+H+'" font-family="PingFang SC,Microsoft YaHei,Hiragino Sans GB,sans-serif">';
  s += cxFrame(W,H,title,'SWOT ANALYSIS · '+todayStr());

  quads.forEach(function(q){
    // 卡片：白底 + 细描边 + 极浅色底 + 顶部色条
    s += '<rect x="'+q.x+'" y="'+q.y+'" width="'+qW+'" height="'+qH+'" rx="3" fill="'+CX.paper+'" stroke="'+CX.line+'"/>';
    s += '<rect x="'+q.x+'" y="'+q.y+'" width="'+qW+'" height="'+qH+'" rx="3" fill="'+q.bg+'" fill-opacity="0.5"/>';
    s += '<rect x="'+q.x+'" y="'+q.y+'" width="'+qW+'" height="3" fill="'+q.c+'"/>';
    // 英文小标签 + 中文
    s += '<text x="'+(q.x+22)+'" y="'+(q.y+32)+'" font-size="10" font-weight="700" fill="'+q.c+'" letter-spacing="1.6">'+esc(q.label)+'</text>';
    s += '<text x="'+(q.x+22)+'" y="'+(q.y+56)+'" font-size="16" font-weight="700" fill="'+CX.ink+'">'+esc(q.cn)+'</text>';
    s += '<line x1="'+(q.x+22)+'" y1="'+(q.y+70)+'" x2="'+(q.x+qW-22)+'" y2="'+(q.y+70)+'" stroke="'+q.c+'" stroke-opacity="0.25"/>';
    // 条目
    var iy = q.y + 96;
    var per = Math.floor((qW - 56) / 13.2);
    q.items.slice(0, 6).forEach(function(it){
      var rows = wrapText(it, per);
      rows.forEach(function(r, ri){
        if(ri === 0){
          s += '<rect x="'+(q.x+22)+'" y="'+(iy-8)+'" width="3" height="3" fill="'+q.c+'"/>';
        }
        s += '<text x="'+(q.x+34)+'" y="'+iy+'" font-size="13.5" fill="'+CX.sub+'">'+esc(r)+'</text>';
        iy += 22;
      });
      iy += 4;
    });
    if(!q.items.length){
      s += '<text x="'+(q.x+22)+'" y="'+(q.y+96)+'" font-size="13" fill="'+CX.mute+'">（未填写）</text>';
    }
  });
  s += '</svg>';
  return s;
}

/* ---------- 2. 竞品定位地图 ---------- */
function svgPos(d){
  var W = 960, H = 780, pad = 96, top = 122;
  var title = d.title || '竞品定位地图';
  var xLabel = d.x || '维度 X', yLabel = d.y || '维度 Y';
  var pts = [];
  lines(d.pts).forEach(function(l){
    var p = l.split(/[,，]/);
    var name = (p[0]||'').trim();
    var x = parseFloat(p[1]), y = parseFloat(p[2]);
    if(!name) return;
    if(isNaN(x)) x = 5; if(isNaN(y)) y = 5;
    pts.push({name:name, x:Math.max(0,Math.min(10,x)), y:Math.max(0,Math.min(10,y))});
  });
  var pw = W - pad - 56, ph = H - top - 108;
  var X = function(v){ return pad + (v/10) * pw; };
  var Y = function(v){ return top + ph - (v/10) * ph; };
  var pal = [CX.brand,'#b45309','#047857','#b91c1c','#7c3aed','#0891b2','#be185d','#4338ca'];

  var s = '<svg xmlns="http://www.w3.org/2000/svg" width="'+W+'" height="'+H+'" viewBox="0 0 '+W+' '+H+'" font-family="PingFang SC,Microsoft YaHei,sans-serif">';
  s += cxFrame(W,H,title,'POSITIONING MAP · '+todayStr());

  // 象限底色（极浅，交替）
  s += '<rect x="'+X(5)+'" y="'+Y(10)+'" width="'+pw/2+'" height="'+ph/2+'" fill="'+CX.brand+'" fill-opacity="0.025"/>';
  s += '<rect x="'+pad+'" y="'+Y(5)+'" width="'+pw/2+'" height="'+ph/2+'" fill="'+CX.brand+'" fill-opacity="0.025"/>';
  // 外框
  s += '<rect x="'+pad+'" y="'+Y(10)+'" width="'+pw+'" height="'+ph+'" fill="none" stroke="'+CX.line+'" stroke-width="1"/>';
  // 网格
  for(var i=1;i<10;i++){
    s += '<line x1="'+X(i)+'" y1="'+Y(10)+'" x2="'+X(i)+'" y2="'+Y(0)+'" stroke="'+CX.line+'" stroke-opacity="'+(i===5?0.9:0.45)+'"/>';
    s += '<line x1="'+pad+'" y1="'+Y(i)+'" x2="'+(pad+pw)+'" y2="'+Y(i)+'" stroke="'+CX.line+'" stroke-opacity="'+(i===5?0.9:0.45)+'"/>';
  }
  // 坐标轴
  s += '<line x1="'+pad+'" y1="'+Y(0)+'" x2="'+(pad+pw+16)+'" y2="'+Y(0)+'" stroke="'+CX.sub+'" stroke-width="1.2"/>';
  s += '<line x1="'+pad+'" y1="'+Y(0)+'" x2="'+pad+'" y2="'+(Y(10)-16)+'" stroke="'+CX.sub+'" stroke-width="1.2"/>';
  s += '<polygon points="'+(pad+pw+16)+','+Y(0)+' '+(pad+pw+8)+','+(Y(0)-4)+' '+(pad+pw+8)+','+(Y(0)+4)+'" fill="'+CX.sub+'"/>';
  s += '<polygon points="'+pad+','+(Y(10)-16)+' '+(pad-4)+','+(Y(10)-8)+' '+(pad+4)+','+(Y(10)-8)+'" fill="'+CX.sub+'"/>';
  // 轴名
  s += '<text x="'+(pad+pw/2)+'" y="'+(Y(0)+40)+'" font-size="13.5" font-weight="600" fill="'+CX.sub+'" text-anchor="middle">'+esc(xLabel)+'  →</text>';
  s += '<text x="'+(pad-52)+'" y="'+(Y(5))+'" font-size="13.5" font-weight="600" fill="'+CX.sub+'" text-anchor="middle" transform="rotate(-90 '+(pad-52)+' '+Y(5)+')">'+esc(yLabel)+'  →</text>';
  // 象限角标
  s += '<text x="'+(pad+12)+'" y="'+(Y(0)-12)+'" font-size="10" fill="'+CX.mute+'" letter-spacing="1">LOW / LOW</text>';
  s += '<text x="'+(pad+pw-12)+'" y="'+(Y(10)+22)+'" font-size="10" fill="'+CX.mute+'" text-anchor="end" letter-spacing="1">HIGH / HIGH</text>';

  // 点位
  pts.forEach(function(p, i){
    var c = pal[i % pal.length];
    var cx = X(p.x), cy = Y(p.y);
    // 引线到标签（避免遮挡，标签放右上）
    var lx = cx + 26, ly = cy - 20;
    s += '<line x1="'+cx+'" y1="'+cy+'" x2="'+lx+'" y2="'+ly+'" stroke="'+c+'" stroke-opacity="0.4" stroke-width="1"/>';
    s += '<circle cx="'+cx+'" cy="'+cy+'" r="18" fill="'+c+'" fill-opacity="0.10"/>';
    s += '<circle cx="'+cx+'" cy="'+cy+'" r="7.5" fill="'+c+'"/>';
    s += '<circle cx="'+cx+'" cy="'+cy+'" r="7.5" fill="none" stroke="#ffffff" stroke-width="2"/>';
    s += '<text x="'+(lx+5)+'" y="'+(ly+4)+'" font-size="14" font-weight="700" fill="'+CX.ink+'">'+esc(p.name)+'</text>';
    s += '<text x="'+(lx+5)+'" y="'+(ly+20)+'" font-size="10.5" fill="'+CX.mute+'">('+p.x+', '+p.y+')</text>';
  });
  if(!pts.length){
    s += '<text x="'+(pad+pw/2)+'" y="'+Y(5)+'" font-size="14" fill="'+CX.mute+'" text-anchor="middle">（请在左侧填写品牌点位，格式：名称,X,Y）</text>';
  }
  s += '</svg>';
  return s;
}

/* ---------- 3. 用户画像卡 ---------- */
function svgPersona(d){
  var W = 860, H = 620, pad = 48, top = 122;
  var th = { indigo:{c:'#1e3a8a', bg:'#eff6ff'}, rose:{c:'#9f1239', bg:'#fff1f2'},
    teal:{c:'#0f766e', bg:'#f0fdfa'}, amber:{c:'#b45309', bg:'#fffbeb'} }[d.color || 'indigo'];
  var name = d.name || '用户画像';
  var initial = name.slice(0,1);

  var s = '<svg xmlns="http://www.w3.org/2000/svg" width="'+W+'" height="'+H+'" viewBox="0 0 '+W+' '+H+'" font-family="PingFang SC,Microsoft YaHei,sans-serif">';
  s += cxFrame(W,H,name,'USER PERSONA · '+todayStr());

  // 头部：头像 + 元信息
  s += '<circle cx="'+(pad+34)+'" cy="'+(top+42)+'" r="34" fill="'+th.bg+'" stroke="'+th.c+'" stroke-opacity="0.3" stroke-width="1.5"/>';
  s += '<text x="'+(pad+34)+'" y="'+(top+55)+'" font-size="32" font-weight="700" fill="'+th.c+'" text-anchor="middle">'+esc(initial)+'</text>';
  var meta = [d.age, d.job].filter(Boolean).join('   ·   ');
  if(meta) s += '<text x="'+(pad+86)+'" y="'+(top+38)+'" font-size="15.5" fill="'+CX.sub+'">'+esc(meta)+'</text>';
  if(d.ch) s += '<text x="'+(pad+86)+'" y="'+(top+64)+'" font-size="12.5" fill="'+CX.mute+'">常用渠道：'+esc(d.ch)+'</text>';

  s += '<line x1="'+pad+'" y1="'+(top+94)+'" x2="'+(W-pad)+'" y2="'+(top+94)+'" stroke="'+CX.line+'"/>';

  // 目标 / 痛点 两栏
  var colW = (W - pad*2 - 32) / 2;
  var y0 = top + 128;
  // 左：目标
  s += '<text x="'+pad+'" y="'+y0+'" font-size="10" font-weight="700" fill="'+CX.s+'" letter-spacing="1.4">GOALS</text>';
  s += '<text x="'+(pad+52)+'" y="'+y0+'" font-size="15" font-weight="700" fill="'+CX.ink+'">目标</text>';
  var gy = y0 + 30;
  lines(d.goal).slice(0,4).forEach(function(g){
    var rows = wrapText(g, Math.floor((colW-24)/13));
    rows.forEach(function(r, ri){
      if(ri===0) s += '<rect x="'+pad+'" y="'+(gy-8)+'" width="3" height="3" fill="'+CX.s+'"/>';
      s += '<text x="'+(pad+14)+'" y="'+gy+'" font-size="13" fill="'+CX.sub+'">'+esc(r)+'</text>';
      gy += 22;
    });
    gy += 4;
  });
  // 右：痛点
  var rx = pad + colW + 32;
  s += '<text x="'+rx+'" y="'+y0+'" font-size="10" font-weight="700" fill="'+CX.t+'" letter-spacing="1.4">PAINS</text>';
  s += '<text x="'+(rx+46)+'" y="'+y0+'" font-size="15" font-weight="700" fill="'+CX.ink+'">痛点</text>';
  var py = y0 + 30;
  lines(d.pain).slice(0,4).forEach(function(g){
    var rows = wrapText(g, Math.floor((colW-24)/13));
    rows.forEach(function(r, ri){
      if(ri===0) s += '<rect x="'+rx+'" y="'+(py-8)+'" width="3" height="3" fill="'+CX.t+'"/>';
      s += '<text x="'+(rx+14)+'" y="'+py+'" font-size="13" fill="'+CX.sub+'">'+esc(r)+'</text>';
      py += 22;
    });
    py += 4;
  });

  // 底部原声
  if(d.quote){
    var qy = H - 92;
    s += '<rect x="'+pad+'" y="'+(qy-34)+'" width="'+(W-pad*2)+'" height="76" rx="2" fill="'+th.bg+'" fill-opacity="0.7"/>';
    s += '<rect x="'+pad+'" y="'+(qy-34)+'" width="3" height="76" fill="'+th.c+'"/>';
    var qrows = wrapText('“'+d.quote+'”', Math.floor((W-pad*2-56)/15));
    qrows.slice(0,2).forEach(function(r,i){
      s += '<text x="'+(pad+26)+'" y="'+(qy-4+i*26)+'" font-size="16" font-weight="600" fill="'+CX.ink+'">'+esc(r)+'</text>';
    });
  }
  s += '</svg>';
  return s;
}

/* ---------- 4. 转化漏斗 ---------- */
function svgFunnel(d){
  var st = [];
  lines(d.stages).forEach(function(l){
    var p = l.split(/[,，]/);
    var name = (p[0]||'').trim();
    var v = parseFloat(String(p[1]||'').replace(/[^\d.]/g,''));
    if(!name) return;
    st.push({name:name, v:isNaN(v)?0:v});
  });
  var W = 900, top = 122;
  var H = Math.max(520, top + 130 + st.length * 82);
  var pad = 48;
  var title = d.title || '转化漏斗';

  var s = '<svg xmlns="http://www.w3.org/2000/svg" width="'+W+'" height="'+H+'" viewBox="0 0 '+W+' '+H+'" font-family="PingFang SC,Microsoft YaHei,sans-serif">';
  s += cxFrame(W,H,title,'CONVERSION FUNNEL · '+todayStr());

  if(!st.length){
    s += '<text x="'+(W/2)+'" y="'+(H/2)+'" font-size="14" fill="'+CX.mute+'" text-anchor="middle">（请在左侧填写环节与数值，格式：环节名,数值）</text>';
    s += '</svg>'; return s;
  }
  var maxV = st[0].v || Math.max.apply(null, st.map(function(x){return x.v;})) || 1;
  var topW = W - pad*2 - 150;
  var lh = 74, y0 = top + 30;

  st.forEach(function(stage, i){
    var ratio = maxV ? Math.max(0.20, Math.min(1, stage.v/maxV)) : 0.2;
    var nextRatio = (i+1 < st.length && maxV) ? Math.max(0.20, Math.min(1, st[i+1].v/maxV)) : ratio*0.9;
    var wTop = topW*ratio, wBot = topW*nextRatio;
    var cx = pad + 40 + topW/2;
    var topY = y0 + i*lh;
    // 咨询风：品牌色系递浅 + 细描边
    var op = 1 - i*0.13; if(op < 0.35) op = 0.35;
    s += '<path d="M '+(cx-wTop/2)+' '+topY+' L '+(cx+wTop/2)+' '+topY+' L '+(cx+wBot/2)+' '+(topY+lh-8)+' L '+(cx-wBot/2)+' '+(topY+lh-8)+' Z" fill="'+CX.brand+'" fill-opacity="'+op.toFixed(2)+'"/>';
    s += '<text x="'+cx+'" y="'+(topY+32)+'" font-size="14.5" font-weight="700" fill="#ffffff" text-anchor="middle">'+esc(stage.name)+'</text>';
    s += '<text x="'+cx+'" y="'+(topY+52)+'" font-size="12.5" fill="#ffffff" fill-opacity="0.85" text-anchor="middle">'+stage.v.toLocaleString('en-US')+'</text>';

    // 右侧转化率（细线连接 + 浅底标签）
    if(i > 0 && st[i-1].v){
      var r = (stage.v / st[i-1].v * 100);
      var bx = cx + wTop/2 + 22;
      s += '<line x1="'+(cx+wTop/2)+'" y1="'+(topY+30)+'" x2="'+bx+'" y2="'+(topY+30)+'" stroke="'+CX.line+'" stroke-width="1"/>';
      s += '<rect x="'+bx+'" y="'+(topY+16)+'" width="86" height="28" rx="2" fill="'+CX.soft+'" stroke="'+CX.line+'"/>';
      s += '<text x="'+(bx+43)+'" y="'+(topY+35)+'" font-size="12.5" font-weight="700" fill="'+CX.ink+'" text-anchor="middle">'+r.toFixed(1)+'%</text>';
    }
  });

  // 整体转化率
  if(st.length > 1 && st[0].v){
    var overall = (st[st.length-1].v / st[0].v * 100);
    var by = H - 78;
    s += '<line x1="'+pad+'" y1="'+(by-26)+'" x2="'+(W-pad)+'" y2="'+(by-26)+'" stroke="'+CX.line+'"/>';
    s += '<text x="'+pad+'" y="'+by+'" font-size="11" font-weight="700" fill="'+CX.mute+'" letter-spacing="1.2">OVERALL</text>';
    s += '<text x="'+(pad+96)+'" y="'+by+'" font-size="15" font-weight="700" fill="'+CX.brand+'">'+overall.toFixed(2)+'%</text>';
    s += '<text x="'+(pad+200)+'" y="'+by+'" font-size="12.5" fill="'+CX.mute+'">'+esc(st[0].name)+' → '+esc(st[st.length-1].name)+'</text>';
  }
  s += '</svg>';
  return s;
}


/* ---------- 5. 思维导图 ---------- */
var MINDC = ['#1e3a8a','#1d4ed8','#047857','#b45309','#b91c1c'];
/* 估算文本宽度：中文按 1em，西文按 0.55em */
function mindMeasure(t, size){
  size = size || 12.5;
  var w = 0;
  for(var i=0;i<t.length;i++) w += size * (t.charCodeAt(i) > 0x2E80 ? 1.0 : 0.55);
  return w;
}
/* 解析缩进文本为树：第一行是中心主题，后续用空格/Tab 缩进表示层级 */
function parseMind(text){
  var raw = String(text||'').split('\n').filter(function(l){ return l.trim(); });
  if(!raw.length) return null;
  var root = {t: raw[0].trim().replace(/^[-*·]\s*/,''), c: []};
  var stack = [{ind:-1, node:root}];
  for(var i=1;i<raw.length;i++){
    var line = raw[i];
    var lead = line.match(/^[\s\u3000]*/)[0];
    var ind = lead.replace(/\t/g,'  ').length;
    var t = line.trim().replace(/^[-*·]\s*/,'');
    if(!t) continue;
    var node = {t:t, c:[]};
    while(stack.length > 1 && ind <= stack[stack.length-1].ind) stack.pop();
    stack[stack.length-1].node.c.push(node);
    stack.push({ind:ind, node:node});
  }
  return root;
}
/* 后序布局：父节点垂直居中于其子节点 */
function layoutMind(root){
  var nodes = [], edges = [], cursor = [0];
  var X_STEP = 222, Y_GAP = 18, H = 34;
  function walk(n, d, parent){
    var me = {t:n.t, x:d*X_STEP, y:0, d:d,
              w:Math.min(204, mindMeasure(n.t)+30), h:H};
    nodes.push(me);
    if(parent) edges.push({a:parent, b:me});
    var cs = n.c || [];
    if(cs.length){
      var ys = [];
      cs.forEach(function(c){ ys.push(walk(c, d+1, me).y); });
      me.y = ys.reduce(function(a,b){ return a+b; }, 0) / ys.length;
    } else {
      me.y = cursor[0]; cursor[0] += H + Y_GAP;
    }
    return me;
  }
  walk(root, 0, null);
  return {nodes:nodes, edges:edges};
}
function svgMindmap(d){
  var title = d.title || '思维导图';
  var root = parseMind(d.body);
  var top = 122, padX = 48;

  if(!root){
    var W0 = 900, H0 = 430;
    var e = '<svg xmlns="http://www.w3.org/2000/svg" width="'+W0+'" height="'+H0+'" viewBox="0 0 '+W0+' '+H0+'" font-family="PingFang SC,Microsoft YaHei,sans-serif">';
    e += cxFrame(W0,H0,title,'MIND MAP · '+todayStr());
    e += '<text x="'+(W0/2)+'" y="'+(H0/2)+'" font-size="14" fill="'+CX.mute+'" text-anchor="middle">（请用缩进填写：第一行是中心主题，子项用 2 个空格或 Tab 缩进）</text>';
    e += '</svg>'; return e;
  }

  var L = layoutMind(root);
  var maxX = 0, maxY = 0;
  L.nodes.forEach(function(n){
    if(n.x + n.w > maxX) maxX = n.x + n.w;
    if(n.y > maxY) maxY = n.y;
  });
  var W = Math.max(780, Math.round(maxX + padX + 60));
  var H = Math.max(430, Math.round(top + maxY + 108));

  var s = '<svg xmlns="http://www.w3.org/2000/svg" width="'+W+'" height="'+H+'" viewBox="0 0 '+W+' '+H+'" font-family="PingFang SC,Microsoft YaHei,sans-serif">';
  s += cxFrame(W,H,title,'MIND MAP · '+todayStr());

  // 连线（先画线，后画节点，避免压住文字）
  L.edges.forEach(function(e){
    var x1 = e.a.x + e.a.w + padX, y1 = e.a.y + top;
    var x2 = e.b.x + padX,         y2 = e.b.y + top;
    var mx = (x1 + x2) / 2;
    var c = MINDC[e.b.d % MINDC.length];
    s += '<path d="M'+x1.toFixed(0)+','+y1.toFixed(0)+' C'+mx.toFixed(0)+','+y1.toFixed(0)+' '+mx.toFixed(0)+','+y2.toFixed(0)+' '+x2.toFixed(0)+','+y2.toFixed(0)+'" fill="none" stroke="'+c+'" stroke-width="1.6" stroke-opacity="0.5"/>';
  });

  // 节点
  L.nodes.forEach(function(n){
    var c = MINDC[n.d % MINDC.length];
    var x = n.x + padX, y = n.y + top - n.h/2;
    if(n.d === 0){
      s += '<rect x="'+x+'" y="'+y.toFixed(0)+'" width="'+n.w+'" height="'+n.h+'" rx="8" fill="'+c+'"/>';
      s += '<text x="'+(x+14)+'" y="'+(n.y+top+5)+'" font-size="13.5" font-weight="700" fill="#ffffff">'+esc(n.t)+'</text>';
    } else {
      s += '<rect x="'+x+'" y="'+y.toFixed(0)+'" width="'+n.w+'" height="'+n.h+'" rx="6" fill="'+CX.paper+'" stroke="'+c+'" stroke-width="1.3"/>';
      s += '<rect x="'+x+'" y="'+y.toFixed(0)+'" width="3.5" height="'+n.h+'" rx="2" fill="'+c+'"/>';
      s += '<text x="'+(x+13)+'" y="'+(n.y+top+5)+'" font-size="12.5" fill="'+CX.ink+'">'+esc(n.t)+'</text>';
    }
  });

  // 统计角标：节点数与层级
  var lv = 1;
  L.nodes.forEach(function(n){ if(n.d+1 > lv) lv = n.d+1; });
  s += '<text x="'+(W-48)+'" y="'+(H-46)+'" font-size="11" fill="'+CX.mute+'" text-anchor="end">'+L.nodes.length+' 节点 · '+lv+' 层</text>';
  s += '</svg>';
  return s;
}

/* ---------- 图卡：读取表单 -> 生成 SVG ---------- */
var lastSvg = '';
function readChartData(){
  var t = state.chart.type;
  if(t === 'swot'){
    return {type:'swot', data:{
      s:$('#sw_s').value, w:$('#sw_w').value, o:$('#sw_o').value,
      t:$('#sw_t').value, title:$('#sw_title').value
    }, svg:function(){ return svgSwot(this.data); }};
  }
  if(t === 'pos'){
    return {type:'pos', data:{
      x:$('#pm_x').value, y:$('#pm_y').value, title:$('#pm_title').value, pts:$('#pm_pts').value
    }, svg:function(){ return svgPos(this.data); }};
  }
  if(t === 'persona'){
    return {type:'persona', data:{
      name:$('#pe_name').value, age:$('#pe_age').value, job:$('#pe_job').value,
      color:$('#pe_color').value, goal:$('#pe_goal').value, pain:$('#pe_pain').value,
      quote:$('#pe_quote').value, ch:$('#pe_ch').value
    }, svg:function(){ return svgPersona(this.data); }};
  }
  if(t === 'mind'){
    return {type:'mind', data:{
      title:$('#md_title').value, body:$('#md_body').value
    }, svg:function(){ return svgMindmap(this.data); }};
  }
  return {type:'funnel', data:{
    title:$('#fu_title').value, stages:$('#fu_stages').value
  }, svg:function(){ return svgFunnel(this.data); }};
}
function saveChartData(){
  var t = state.chart.type;
  if(t==='swot') state.chart.swot = {s:$('#sw_s').value,w:$('#sw_w').value,o:$('#sw_o').value,t:$('#sw_t').value,title:$('#sw_title').value};
  if(t==='pos') state.chart.pos = {x:$('#pm_x').value,y:$('#pm_y').value,title:$('#pm_title').value,pts:$('#pm_pts').value};
  if(t==='persona') state.chart.persona = {name:$('#pe_name').value,age:$('#pe_age').value,job:$('#pe_job').value,color:$('#pe_color').value,goal:$('#pe_goal').value,pain:$('#pe_pain').value,quote:$('#pe_quote').value,ch:$('#pe_ch').value};
  if(t==='funnel') state.chart.funnel = {title:$('#fu_title').value,stages:$('#fu_stages').value};
  if(t==='mind')   state.chart.mind   = {title:$('#md_title').value, body:$('#md_body').value};
  save();
}
function drawChart(){
  var c = readChartData();
  var svg = c.svg();
  lastSvg = svg;
  var wrap = $('#chartWrap');
  wrap.innerHTML = svg;
  saveChartData();
  toast('已生成 ' + (CHART_TYPES.filter(function(x){return x.k===c.type;})[0]||{}).n);
}
function showChartForm(){
  var t = state.chart.type;
  $('#cfSwot').style.display    = t==='swot' ? '' : 'none';
  $('#cfPos').style.display     = t==='pos' ? '' : 'none';
  $('#cfPersona').style.display = t==='persona' ? '' : 'none';
  $('#cfFunnel').style.display  = t==='funnel' ? '' : 'none';
  var cfm = $('#cfMind'); if(cfm) cfm.style.display = t==='mind' ? '' : 'none';
}
function renderChartChips(){
  var host = $('#chartChips'); if(!host) return;
  host.innerHTML = '';
  CHART_TYPES.forEach(function(t){
    var b = document.createElement('button');
    b.className = 'chip' + (state.chart.type === t.k ? ' is-on' : '');
    b.textContent = t.n; b.title = t.d;
    b.onclick = function(){
      saveChartData();
      state.chart.type = t.k;
      restoreChart();
      renderChartChips();
      $('#chartWrap').innerHTML = '<div class="chartph">👈 数据已切换，点「🎨 生成图卡」重新出图</div>';
      save();
    };
    host.appendChild(b);
  });
}
function restoreChart(){
  var c = state.chart;
  if(!c.mind) c.mind = {title:'', body:''};   // 兼容旧版存档
  $('#sw_s').value = c.swot.s||''; $('#sw_w').value = c.swot.w||'';
  $('#sw_o').value = c.swot.o||''; $('#sw_t').value = c.swot.t||'';
  $('#sw_title').value = c.swot.title||'';
  $('#pm_x').value = c.pos.x||''; $('#pm_y').value = c.pos.y||'';
  $('#pm_title').value = c.pos.title||''; $('#pm_pts').value = c.pos.pts||'';
  $('#pe_name').value = c.persona.name||''; $('#pe_age').value = c.persona.age||'';
  $('#pe_job').value = c.persona.job||''; $('#pe_color').value = c.persona.color||'indigo';
  $('#pe_goal').value = c.persona.goal||''; $('#pe_pain').value = c.persona.pain||'';
  $('#pe_quote').value = c.persona.quote||''; $('#pe_ch').value = c.persona.ch||'';
  $('#fu_title').value = c.funnel.title||''; $('#fu_stages').value = c.funnel.stages||'';
  $('#md_title').value = c.mind.title||'';   $('#md_body').value   = c.mind.body||'';
  showChartForm();
}
/* 导出 SVG */
function exportSvg(){
  if(!lastSvg){ toast('请先生成图卡'); return; }
  var blob = new Blob([lastSvg], {type:'image/svg+xml;charset=utf-8'});
  var a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'ym-chart-' + state.chart.type + '-' + Date.now() + '.svg';
  a.click(); toast('已导出 SVG（可编辑）');
}
/* 导出 PNG（2 倍图） */
function exportPng(){
  if(!lastSvg){ toast('请先生成图卡'); return; }
  var m = lastSvg.match(/width="(\d+)"/); var m2 = lastSvg.match(/height="(\d+)"/);
  var w = m ? parseInt(m[1],10) : 800, h = m2 ? parseInt(m2[1],10) : 600;
  var blob = new Blob([lastSvg], {type:'image/svg+xml;charset=utf-8'});
  var url = URL.createObjectURL(blob);
  var img = new Image();
  img.onload = function(){
    var scale = 2;
    var cv = document.createElement('canvas');
    cv.width = w * scale; cv.height = h * scale;
    var ctx = cv.getContext('2d');
    ctx.fillStyle = '#ffffff'; ctx.fillRect(0,0,cv.width,cv.height);
    ctx.drawImage(img, 0, 0, cv.width, cv.height);
    URL.revokeObjectURL(url);
    cv.toBlob(function(b){
      var a = document.createElement('a');
      a.href = URL.createObjectURL(b);
      a.download = 'ym-chart-' + state.chart.type + '-' + Date.now() + '.png';
      a.click(); toast('已导出 PNG（2 倍图）');
    }, 'image/png');
  };
  img.onerror = function(){ URL.revokeObjectURL(url); toast('导出失败，请改用 SVG'); };
  img.src = url;
}
/* 跳转到图卡页（供其他 Tab 调用） */
function gotoChart(type){
  saveChartData();
  if(type){ state.chart.type = type; restoreChart(); renderChartChips(); }
  $$('.tab').forEach(function(x){ x.classList.toggle('is-on', x.getAttribute('data-tab')==='chart'); });
  $$('.panel').forEach(function(p){ p.classList.toggle('is-on', p.getAttribute('data-panel')==='chart'); });
  if(type){
    // 预填数据后自动出图
    setTimeout(drawChart, 60);
  }
  try{
    var tabsEl = document.querySelector('.tabs');
    var top = tabsEl ? (tabsEl.offsetTop - 10) : 0;
    if(window.scrollTo) window.scrollTo({top:top, behavior:'smooth'});
  }catch(e){}
}
