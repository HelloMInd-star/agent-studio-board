/* ==========================================================================
 * 品牌内核 Brand Core
 * 三层结构：文化内核(MVV) → 价值层级(功能/情感/自我表达) → 人格调性
 * 加一层：商业模式（收入模式 + 变现策略）与品牌承诺的对齐检测
 *
 * 设计原则：
 *  - 能算的绝不交给模型。五类诊断全是确定性规则。
 *  - 「价格定位」是位置型维度（无好坏，只有选择），其余是强度型。
 *  - 基准线是经验参考值，不是数据库；界面必须写明，且允许调整。
 * ========================================================================== */

/* ---------- 维度池（10 个，横跨三层） ---------- */
var BC_DIMS = [
  { k:'func',      n:'产品功能', layer:'功能' },
  { k:'price',     n:'价格定位', layer:'功能', pos:true },   /* 位置型：高=溢价端 */
  { k:'channel',   n:'渠道便利', layer:'功能' },
  { k:'speed',     n:'效率速度', layer:'功能' },
  { k:'sensory',   n:'感官体验', layer:'情感' },
  { k:'service',   n:'服务温度', layer:'情感' },
  { k:'emotion',   n:'情绪共鸣', layer:'情感' },
  { k:'belonging', n:'圈层归属', layer:'情感' },
  { k:'status',    n:'身份象征', layer:'象征' },
  { k:'values',    n:'价值观表达', layer:'象征' }
];

/* ---------- 品类模板（10 个） ----------
 * base: 该维度的品类基准（1-5，一位小数）
 * 只列该品类真正相关的维度，不铺满 10 个 */
var BC_CATS = [
  { k:'luxury', n:'奢侈品', em:'💎', base:{status:4.5, values:4.2, sensory:4.3, func:3.6, service:4.0, price:4.3, channel:2.2, speed:2.0},
    rev:['一次性买断','高端定制'], taboo:['高频折扣会摧毁稀缺感','大众裂变稀释专属感','全渠道铺货破坏控价体系'] },
  { k:'fmcg', n:'快消', em:'🧴', base:{channel:4.4, func:3.9, price:3.2, speed:4.0, emotion:3.4, sensory:3.5, belonging:2.8, status:2.2},
    rev:['一次性买断','平台抽佣'], taboo:['控量稀缺拖累周转','过度空间投入吃掉毛利','长决策链内容无人看完'] },
  { k:'cafe', n:'餐饮 / 咖啡', em:'☕', base:{channel:4.2, speed:3.9, price:3.0, sensory:3.6, func:3.5, belonging:3.0, service:3.4, emotion:2.8},
    rev:['一次性买断','会员订阅'], taboo:['过度空间投入拖累翻台率','高客单低频与快取模式互斥','频繁改菜单损伤心智'] },
  { k:'beauty', n:'美妆护肤', em:'💄', base:{func:4.2, emotion:3.8, sensory:4.0, belonging:3.5, channel:3.8, price:3.2, status:3.0, values:2.8},
    rev:['一次性买断','订阅制'], taboo:['纯成分叙事丢失情感溢价','全渠道乱价损伤专柜形象','过度依赖单一爆品'] },
  { k:'3c', n:'3C 数码', em:'📱', base:{func:4.4, speed:3.8, channel:3.9, price:3.3, sensory:3.4, status:3.0, service:3.2, belonging:2.8},
    rev:['一次性买断','增值服务'], taboo:['参数堆砌替代体验叙事','频繁降价伤害早期用户','纯线上缺失体验触点'] },
  { k:'auto', n:'汽车', em:'🚗', base:{func:4.1, status:4.0, sensory:3.9, service:3.8, price:3.6, belonging:3.2, values:3.0, channel:2.8},
    rev:['一次性买断','增值服务'], taboo:['纯线上直销缺失试驾信任','频繁改款损伤保值率','过度智驾宣传引发安全质疑'] },
  { k:'edu', n:'教育', em:'📚', base:{func:4.0, service:4.1, values:3.8, emotion:3.5, price:3.0, belonging:3.2, channel:3.2, speed:2.8},
    rev:['订阅制','一次性买断'], taboo:['过度承诺效果引发退费','纯录播缺失完课率','低价引流课伤害正价转化'] },
  { k:'b2b', n:'B 端服务', em:'🏢', base:{func:4.3, service:4.2, values:3.6, price:3.4, belonging:3.0, channel:2.6, status:2.8, speed:3.2},
    rev:['订阅制','增值服务'], taboo:['纯自助交付缺信任背书','低价获客难以覆盖服务成本','标准化方案无法适配决策链'] },
  { k:'newretail', n:'新消费', em:'🌱', base:{emotion:4.0, belonging:3.9, sensory:3.8, channel:3.9, func:3.5, price:3.0, values:3.4, status:2.9},
    rev:['一次性买断','订阅制'], taboo:['无内容支撑的种草即失效','爆款断档导致增速塌陷','联名过度稀释主品牌'] },
  { k:'custom', n:'自定义', em:'⚙️', base:{func:3.5,sensory:3.5,emotion:3.5,status:3.5,price:3.0,channel:3.5},
    rev:['一次性买断'], taboo:[] }
];

/* ---------- 收入模式 ---------- */
var BC_REVS = ['一次性买断','订阅制','增值服务','平台抽佣','广告变现','免费+增值','高端定制'];

/* ---------- 变现策略 × 调性冲突规则 ----------
 * level: 2=高冲突 1=中冲突 0=可共存 */
var BC_MON = [
  { k:'高频折扣',   conflict:{status:2, values:2, belonging:1}, price_high:2, note:'与溢价/稀缺主张直接冲突；性价比定位则天然匹配' },
  { k:'饥饿营销',   conflict:{channel:1, speed:2, func:1},              note:'与效率/便利型主张张力明显' },
  { k:'会员订阅',   conflict:{channel:1, speed:0},                       note:'与"随时可得"有轻微张力' },
  { k:'大众裂变',   conflict:{status:2, belonging:2, values:1},          note:'会稀释专属感与小众圈层' },
  { k:'直播带货',   conflict:{status:2, values:1},                       note:'叫卖式直播损伤高端调性（品牌自播讲工艺可抵消）' },
  { k:'联名跨界',   conflict:{values:1},                                 note:'联名过度会稀释主品牌' },
  { k:'私域深耕',   conflict:{channel:1},                                note:'与广覆盖渠道策略需平衡' },
  { k:'高端定制',   conflict:{speed:2, channel:2, price:0},              note:'与效率/便利型主张互斥' },
  { k:'内容种草',   conflict:{},                                         note:'与多数主张兼容' },
  { k:'渠道下沉',   conflict:{status:2, price:1},                        note:'与高端定位冲突，与性价比定位兼容' }
];

/* ---------- 撕裂检测：主张关键词 → 期望重心的维度 ---------- */
var BC_CLAIM = [
  { kw:['性价比','平价','实惠','便宜','高性价比'], dim:'price',  dir:'low',  label:'性价比' },
  { kw:['高端','奢华','奢侈','轻奢','高端定位'],   dim:'status', dir:'high', label:'高端' },
  { kw:['稀缺','限量','专属','珍藏'],             dim:'status', dir:'high', label:'稀缺' },
  { kw:['体验','沉浸','第三空间','感官'],         dim:'sensory',dir:'high', label:'体验' },
  { kw:['效率','快捷','便利','即时','快取'],       dim:'speed',  dir:'high', label:'效率' },
  { kw:['专业','技术','功能','性能','成分'],       dim:'func',   dir:'high', label:'专业功能' },
  { kw:['温度','关怀','陪伴','贴心'],             dim:'service',dir:'high', label:'温度' },
  { kw:['独立','自由','自我','不被定义'],          dim:'values', dir:'high', label:'价值观' }
];

/* ---------- 价值层级抽象度：停用词 ---------- */
var BC_STOP = '的 了 是 在 和 与 及 有 为 让 使 更 最 很 我们 你 我 它 这 那 一个 可以 能够 提供 带来 具有 拥有 产品 用户 客户 品牌 服务 体验'.split(/\s+/);

/* ==========================================================================
 *  算法
 * ========================================================================== */

/** 分词：中文二元切分 + 英文单词，去停用词 */
function bcTokens(s){
  s = (s||'').toLowerCase().replace(/[^\u4e00-\u9fa5a-z0-9]+/g, ' ').trim();
  var out = [], parts = s.split(/\s+/);
  parts.forEach(function(p){
    if(!p) return;
    if(/^[a-z0-9]+$/.test(p)){ if(p.length>1 && BC_STOP.indexOf(p)<0) out.push(p); return; }
    for(var i=0;i<p.length-1;i++){ var g=p.substr(i,2); if(BC_STOP.indexOf(g)<0) out.push(g); }
    if(p.length===1 && BC_STOP.indexOf(p)<0) out.push(p);
  });
  return out;
}

/** 相邻两层重合度：0~1，越高说明越没抽象 */
function bcOverlap(a, b){
  var ta = bcTokens(a), tb = bcTokens(b);
  if(!ta.length || !tb.length) return 0;
  var set = {}, hit = 0;
  ta.forEach(function(t){ set[t]=1; });
  tb.forEach(function(t){ if(set[t]) hit++; });
  return hit / Math.min(ta.length, tb.length);
}

/** 主战场识别 + 五类诊断 */
function bcAnalyze(o){
  var cat = null;
  BC_CATS.forEach(function(c){ if(c.k === o.cat) cat = c; });
  if(!cat) cat = BC_CATS[0];

  var dims = o.dims || {};           /* 用户打分 1-5 */
  var base = cat.base || {};
  var rows = [], focus = [], flat = true;

  /* 关键设计：
   *  1) 主战场用「绝对分 >= 4.0」判定，不用相对基准的比值。
   *     因为成熟品类的基准本身就有 4.5（奢侈品身份象征），
   *     要求再高 30% 等于要求 5.85 分——永远达不到，会误判成"无主战场"。
   *  2) 差异化用「绝对偏离 >= 0.5」判定，代表真正超出品类平均。 */
  BC_DIMS.forEach(function(d){
    var v = dims[d.k];
    if(v == null) return;                       /* 未打分维度不参与 */
    var b = base[d.k] != null ? base[d.k] : 3.0;
    var ratio = b > 0 ? v / b : 1;
    var diff  = v - b;                          /* 绝对偏离 */
    rows.push({ k:d.k, n:d.n, layer:d.layer, v:v, b:b, diff:diff, ratio:ratio, pos:!!d.pos });
    if(Math.abs(diff) > 0.15) flat = false;
    /* 明显放弃的维度（位置型低位 / 强度型远低于基准） */
    if(diff <= -0.6) focus.push({ n:d.n, v:v, b:b, diff:diff, low:true });
  });

  /* strong = 投入重心（绝对高分）；diffFields = 真正的差异化 */
  var strong = rows.filter(function(r){ return r.v >= 4.0; });
  var diffFields = rows.filter(function(r){ return Math.abs(r.diff) >= 0.5; });
  var mainFields = strong.slice().sort(function(a,b){ return b.v - a.v; });

  var diag = [];

  /* ① 主战场清晰度 */
  if(!rows.length){
    diag.push({ lv:'warn', t:'主战场', d:'尚未给任何维度打分，无法判断重心。' });
  } else if(strong.length >= 2 && strong.length <= 5){
    diag.push({ lv:'ok', t:'主战场清晰',
      d:'投入重心在：' + mainFields.map(function(f){ return f.n; }).join(' / ') + '。' });
  } else if(strong.length < 2){
    diag.push({ lv:'warn', t:'缺少重心',
      d:'几乎没有维度达到 4 分，看不出你在哪个方向上下了重注。' });
  } else {
    diag.push({ lv:'warn', t:'主战场过散',
      d:'有 ' + strong.length + ' 个维度都在 4 分以上（' + mainFields.map(function(f){return f.n;}).join(' / ') +
        '）。想打的太多，等于没有重点，建议收缩到 3-4 个。' });
  }

  /* ② 记忆点 = 真正超出品类基准的部分 */
  if(rows.length){
    if(diffFields.length === 0){
      diag.push({ lv:'warn', t:'无记忆点',
        d:'所有维度都贴近品类基准（偏离 <0.5），轮廓与行业平均几乎重合。用户说不出你有什么不同——这是大多数品牌的真实问题：每项单看都合理，合起来没有记忆点。' });
    } else {
      diag.push({ lv:'ok', t:'差异化维度',
        d:diffFields.map(function(f){
          return f.n + (f.diff>0 ? ' 高于基准 ' : ' 低于基准 ') + Math.abs(f.diff).toFixed(1);
        }).join('；') + '。' });
    }
  }
  if(flat && rows.length && diffFields.length === 0){
    /* 已由上一条覆盖，不重复输出 */
  }

  /* ③ 撕裂检测：主张 ↔ 实际投入 */
  var claim = (o.claim || '').toLowerCase();
  BC_CLAIM.forEach(function(c){
    var hit = false;
    c.kw.forEach(function(w){ if(claim.indexOf(w) >= 0) hit = true; });
    if(!hit) return;
    var r = null;
    rows.forEach(function(x){ if(x.k === c.dim) r = x; });
    if(!r) return;
    if(c.dim === 'price'){
      /* 位置型：主张性价比 → 应在中低价位（分低）；主张高端 → 应高分 */
      if(c.dir === 'low' && r.v >= 3.8){
        diag.push({ lv:'bad', t:'定位撕裂',
          d:'你主张「' + c.label + '」，但价格定位打了 ' + r.v + ' 分（偏高端）。说的和做的不一致。' });
      } else if(c.dir === 'high' && r.v <= 2.6){
        diag.push({ lv:'bad', t:'定位撕裂',
          d:'你主张「' + c.label + '」，但价格定位只有 ' + r.v + ' 分（偏低端），撑不起高端主张。' });
      }
      return;
    }
    if(c.dir === 'high' && r.ratio < 0.9){
      diag.push({ lv:'bad', t:'定位撕裂',
        d:'你主张「' + c.label + '」，但「' + r.n + '」维度只有 ' + r.v + ' 分（基准 ' + r.b + '），投入撑不起主张。' });
    }
  });

  /* ④ 价值层级抽象度 */
  var lf = o.lvFunc || '', le = o.lvEmo || '', ls = o.lvSelf || '';
  var ov1 = bcOverlap(lf, le), ov2 = bcOverlap(le, ls);
  var absIssues = [];
  if(lf && le && ov1 >= 0.3) absIssues.push('功能→情感 重合度 ' + Math.round(ov1*100) + '%，只是换了说法，没有真正抽象');
  if(le && ls && ov2 >= 0.3) absIssues.push('情感→自我表达 重合度 ' + Math.round(ov2*100) + '%，同上');
  if(absIssues.length){
    diag.push({ lv:'warn', t:'价值层级未抽象', d:absIssues.join('；') + '。例：功能「深层补水」→ 情感应是「素颜也从容」，而非「补水效果好」。' });
  } else if(lf && le && ls){
    diag.push({ lv:'ok', t:'价值层级', d:'三层逐级抽象，无明显复述。' });
  }

  /* ⑤ 商业模式对齐 + 变现调性冲突 */
  var monHits = [];
  (o.mon || []).forEach(function(mk){
    var rule = null;
    BC_MON.forEach(function(m){ if(m.k === mk) rule = m; });
    if(!rule) return;
    var worst = 0, wd = '';
    rows.forEach(function(r){
      var lv = 0;
      if(r.k === 'price' && rule.price_high){
        /* 位置型维度：仅当处于溢价端时才冲突 */
        if(r.v >= 3.8) lv = rule.price_high;
      } else if(rule.conflict[r.k]){
        /* 强度型维度：仅当该维度确实是投入重心时才算冲突 */
        if(r.ratio > 1.0) lv = rule.conflict[r.k];   /* 需高于基准才算投入重心 */
      }
      if(lv > worst){ worst = lv; wd = r.n; }
    });
    if(worst >= 2)      monHits.push({ k:mk, lv:'bad',  w:wd, note:rule.note });
    else if(worst === 1) monHits.push({ k:mk, lv:'warn', w:wd, note:rule.note });
    else                 monHits.push({ k:mk, lv:'ok',  w:'',  note:'与当前价值主张无冲突' });
  });

  monHits.forEach(function(h){
    if(h.lv === 'bad')  diag.push({ lv:'bad',  t:'变现冲突（高）', d:'「' + h.k + '」与你的「' + h.w + '」直接冲突。' + h.note + '。' });
    if(h.lv === 'warn') diag.push({ lv:'warn', t:'变现冲突（中）', d:'「' + h.k + '」与「' + h.w + '」存在张力。' + h.note + '。' });
  });

  /* 收入模式与主张的粗对齐 */
  if(o.rev === '高端定制'){
    var sp = null, ch = null;
    rows.forEach(function(r){ if(r.k==='speed') sp=r; if(r.k==='channel') ch=r; });
    if(sp && sp.ratio >= 1.2) diag.push({ lv:'warn', t:'模式与主张',
      d:'「高端定制」需要慢工出细活，但你的「效率速度」高于基准 ' + Math.round((sp.ratio-1)*100) + '%，两者互斥，需取舍。' });
    if(ch && ch.ratio >= 1.2) diag.push({ lv:'warn', t:'模式与主张',
      d:'「高端定制」意味着不可规模化铺货，但「渠道便利」高于基准，需确认是否矛盾。' });
  }

  var bad  = diag.filter(function(d){ return d.lv==='bad';  }).length;
  var warn = diag.filter(function(d){ return d.lv==='warn'; }).length;

  return {
    cat:cat, rows:rows, focus:focus, mainFields:mainFields,
    strong:strong, diffFields:diffFields,
    diag:diag, monHits:monHits, flat:flat,
    score: Math.max(0, 100 - bad*22 - warn*10),
    bad:bad, warn:warn
  };
}

/* ==========================================================================
 *  价值曲线图（SVG）
 *  横轴 = 维度，纵轴 = 1~5；品牌实线 + 品类基准虚线
 * ========================================================================== */
function bcChart(r){
  if(!r.rows.length) return '';
  var W=860, H=340, PL=54, PR=150, PT=28, PB=52;
  var iw = W-PL-PR, ih = H-PT-PB;
  var n = r.rows.length;
  var x = function(i){ return PL + (n===1 ? iw/2 : iw*i/(n-1)); };
  var y = function(v){ return PT + ih*(1-(v-1)/4); };

  var s = '<svg viewBox="0 0 '+W+' '+H+'" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto">';
  s += '<rect x="0" y="0" width="'+W+'" height="'+H+'" fill="none"/>';

  /* 网格 + Y 轴刻度 */
  for(var v=1; v<=5; v++){
    s += '<line x1="'+PL+'" y1="'+y(v)+'" x2="'+(W-PR)+'" y2="'+y(v)+'" stroke="var(--line)" stroke-width="1"/>';
    s += '<text x="'+(PL-10)+'" y="'+(y(v)+4)+'" text-anchor="end" font-size="11" fill="var(--text-3)">'+v+'</text>';
  }

  /* 两条线 */
  var pMine='', pBase='';
  r.rows.forEach(function(d,i){
    pMine += (i?' L':'M') + x(i) + ' ' + y(d.v);
    pBase += (i?' L':'M') + x(i) + ' ' + y(d.b);
  });
  s += '<path d="'+pBase+'" fill="none" stroke="var(--text-3)" stroke-width="1.6" stroke-dasharray="5 4" opacity=".65"/>';
  s += '<path d="'+pMine+'" fill="none" stroke="var(--brand)" stroke-width="2.6" stroke-linejoin="round"/>';

  /* 点 + 标签 */
  r.rows.forEach(function(d,i){
    var isFocus = d.ratio>=1.3 || d.ratio<=0.77;
    s += '<circle cx="'+x(i)+'" cy="'+y(d.v)+'" r="'+(isFocus?5.5:4)+'" fill="'+(isFocus?'var(--brand)':'#fff')+'" stroke="var(--brand)" stroke-width="2"/>';
    s += '<text x="'+x(i)+'" y="'+(H-PB+18)+'" text-anchor="middle" font-size="11.5" fill="var(--text-2)">'+d.n+'</text>';
    if(isFocus){
      s += '<text x="'+x(i)+'" y="'+(y(d.v)-11)+'" text-anchor="middle" font-size="11" font-weight="600" fill="var(--brand)">'+d.v+'</text>';
    }
  });

  /* 图例 */
  s += '<line x1="'+(W-PR+16)+'" y1="'+(PT+14)+'" x2="'+(W-PR+46)+'" y2="'+(PT+14)+'" stroke="var(--brand)" stroke-width="2.6"/>';
  s += '<text x="'+(W-PR+52)+'" y="'+(PT+18)+'" font-size="11.5" fill="var(--text-2)">你的品牌</text>';
  s += '<line x1="'+(W-PR+16)+'" y1="'+(PT+34)+'" x2="'+(W-PR+46)+'" y2="'+(PT+34)+'" stroke="var(--text-3)" stroke-width="1.6" stroke-dasharray="5 4"/>';
  s += '<text x="'+(W-PR+52)+'" y="'+(PT+38)+'" font-size="11.5" fill="var(--text-3)">'+r.cat.n+'基准</text>';
  s += '<text x="'+(W-PR+16)+'" y="'+(PT+62)+'" font-size="10.5" fill="var(--text-3)">基准为经验参考值</text>';
  s += '<text x="'+(W-PR+16)+'" y="'+(PT+76)+'" font-size="10.5" fill="var(--text-3)">可拖动调整，非数据库</text>';

  s += '</svg>';
  return s;
}

/* ==========================================================================
 *  报告
 * ========================================================================== */
function bcReport(r, o){
  var L = { ok:'✅', warn:'⚠️', bad:'🛑' };
  var m = '## 品牌内核诊断 · ' + (o.brand || '未命名品牌') + '\n\n';
  m += '**品类**：' + r.cat.n + '　**综合健康度**：' + r.score + ' / 100';
  m += '（🛑 ' + r.bad + ' 项严重 · ⚠️ ' + r.warn + ' 项提示）\n\n';

  if(o.mission) m += '**使命**：' + o.mission + '\n';
  if(o.vision)  m += '**愿景**：' + o.vision + '\n';
  if(o.mvv)     m += '**价值观**：' + o.mvv + '\n';
  m += '\n';

  /* 品牌信条 */
  var credo = bcCredo(o);
  if(credo) m += '### 品牌信条\n> ' + credo + '\n\n';

  m += '### 一、价值重心\n\n';
  m += '| 维度 | 层级 | 你的分值 | 品类基准 | 偏离 |\n|---|---|---|---|---|\n';
  r.rows.forEach(function(d){
    var pct = Math.round(d.dev*100);
    var mark = d.ratio>=1.3 ? ' 🔺' : (d.ratio<=0.77 ? ' 🔻' : '');
    m += '| ' + d.n + ' | ' + d.layer + ' | ' + d.v + ' | ' + d.b + ' | ' +
         (pct>0?'+':'') + pct + '%' + mark + ' |\n';
  });
  m += '\n';

  if(r.mainFields.length){
    m += '**主战场**：' + r.mainFields.map(function(f){ return f.n; }).join(' / ') + '\n\n';
  }

  m += '### 二、价值层级\n\n';
  m += '- **功能价值**：' + (o.lvFunc || '（未填写）') + '\n';
  m += '- **情感价值**：' + (o.lvEmo  || '（未填写）') + '\n';
  m += '- **自我表达**：' + (o.lvSelf || '（未填写）') + '\n\n';

  if(r.cat.taboo && r.cat.taboo.length){
    m += '### 三、' + r.cat.n + '品类禁忌\n\n';
    r.cat.taboo.forEach(function(t){ m += '- ⛔ ' + t + '\n'; });
    m += '\n';
  }

  m += '### 四、商业模式\n\n';
  m += '- **收入模式**：' + (o.rev || '（未选）') + '\n';
  m += '- **变现策略**：' + ((o.mon && o.mon.length) ? o.mon.join(' / ') : '（未选）') + '\n\n';
  if(r.monHits.length){
    r.monHits.forEach(function(h){
      var ic = h.lv==='bad' ? '🛑' : (h.lv==='warn' ? '⚠️' : '✅');
      m += '- ' + ic + ' ' + h.k + (h.w ? '（与「' + h.w + '」）' : '') + '：' + h.note + '\n';
    });
    m += '\n';
  }

  m += '### 五、诊断结论\n\n';
  if(!r.diag.length) m += '暂无结论。\n';
  r.diag.forEach(function(d){
    m += '- ' + (L[d.lv]||'') + ' **' + d.t + '**：' + d.d + '\n';
  });
  m += '\n';

  m += '---\n\n*基准线为经验参考值，不来自任何数据库，可在界面上调整。*\n';
  return m;
}

/** 品牌信条合成：使命 + 为谁 + 什么价值
 *  注意：自我表达价值常是用户口吻（"我是一个…的人"），
 *  直接接"创造"会产生语病。故只在有「为谁」时才合成价值部分。 */
function bcCredo(o){
  var who = (o.aud  || '').trim();
  var val = (o.lvSelf || o.lvEmo || '').trim().replace(/[。．.]$/,'');
  var mis = (o.mission || '').trim().replace(/[。．.]$/,'');
  if(!mis && !(who && val)) return '';
  var s = '';
  if(mis) s += mis;
  if(who && val) s += (s ? '——' : '') + '为' + who + '创造' + val;
  return s ? s + '。' : '';
}

/* ==========================================================================
 *  可调用 function（第 21 个）
 * ========================================================================== */
function analyzeBrandCore(p){
  p = p || {};
  var o = {
    cat: p.cat || 'custom',
    brand: p.brand || '',
    mission: p.mission || '', vision: p.vision || '', mvv: p.mvv || '',
    aud: p.aud || '', claim: p.claim || '',
    lvFunc: p.lvFunc || '', lvEmo: p.lvEmo || '', lvSelf: p.lvSelf || '',
    dims: p.dims || {}, rev: p.rev || '', mon: p.mon || []
  };
  var r = bcAnalyze(o);
  return {
    score: r.score,
    category: r.cat.n,
    mainFields: r.mainFields.map(function(f){ return f.n; }),
    credo: bcCredo(o),
    table: r.rows.map(function(d){
      return { dim:d.n, layer:d.layer, value:d.v, base:d.b, dev:Math.round(d.dev*100) };
    }),
    monetize: r.monHits.map(function(h){ return { k:h.k, level:h.lv, note:h.note }; }),
    taboo: r.cat.taboo || [],
    diagnoses: r.diag.map(function(d){ return { level:d.lv, title:d.t, detail:d.d }; }),
    report: bcReport(r, o)
  };
}
if(typeof LOCAL_TOOLS !== 'undefined'){
  LOCAL_TOOLS[21] = { key:'brandcore', name:'analyze_brand_core', label:'品牌内核诊断' };
  if(typeof TOOLS !== 'undefined' && TOOLS.indexOf('⚡ 品牌内核(本地函数)') < 0){
    TOOLS.push('⚡ 品牌内核(本地函数)');
  }
}

/* ==========================================================================
 *  UI 层
 * ========================================================================== */
var bcSelMon = [];          /* 已选变现策略 */
var bcLast   = null;        /* 上次分析结果 */

function bcCat(){ var k = $('#bc_cat').value; var c=null; BC_CATS.forEach(function(x){ if(x.k===k) c=x; }); return c || BC_CATS[0]; }

/** 初始化下拉框 */
function bcInitUI(){
  var cs = $('#bc_cat'); cs.innerHTML = '';
  BC_CATS.forEach(function(c){
    var o=document.createElement('option'); o.value=c.k; o.textContent=c.em+' '+c.n; cs.appendChild(o);
  });
  var rs = $('#bc_rev'); rs.innerHTML = '';
  BC_REVS.forEach(function(r){ var o=document.createElement('option'); o.value=r; o.textContent=r; rs.appendChild(o); });

  var ts = $('#bc_type'); ts.innerHTML = '';
  var o0=document.createElement('option'); o0.value=''; o0.textContent='（不选）'; ts.appendChild(o0);
  MBTI.forEach(function(m){ var o=document.createElement('option'); o.value=m; o.textContent=m; ts.appendChild(o); });

  if(state.bc){
    cs.value = state.bc.cat || 'custom';
    $('#bc_mission').value = state.bc.mission || '';
    $('#bc_vision').value  = state.bc.vision  || '';
    $('#bc_mvv').value     = state.bc.mvv     || '';
    $('#bc_lvf').value     = state.bc.lvFunc  || '';
    $('#bc_lve').value     = state.bc.lvEmo   || '';
    $('#bc_lvs').value     = state.bc.lvSelf  || '';
    $('#bc_brand').value   = state.bc.brand   || '';
    $('#bc_aud').value     = state.bc.aud     || '';
    $('#bc_claim').value   = state.bc.claim   || '';
    if(state.bc.rev) $('#bc_rev').value = state.bc.rev;
    if(state.bc.type) ts.value = state.bc.type;
    bcSelMon = state.bc.mon ? state.bc.mon.slice() : [];
  }
  bcRenderDims();
  bcRenderMon();
}

/** 渲染维度打分表（只显示该品类相关的维度） */
function bcRenderDims(){
  var cat = bcCat(), box = $('#bc_dims');
  box.innerHTML = '';
  BC_DIMS.forEach(function(d){
    if(cat.base[d.k] == null) return;         /* 该品类不涉及 */
    var base = cat.base[d.k];
    var row = document.createElement('div');
    row.className = 'bcdim';
    row.setAttribute('data-dim', d.k);
    var saved = (state.bc && state.bc.dims) ? state.bc.dims[d.k] : null;
    row.innerHTML =
      '<span class="bcdim__n">' + d.n + '</span>' +
      (d.pos ? '<span class="bcdim__tag">位置型</span>' : '<span class="bcdim__tag is-layer">' + d.layer + '</span>') +
      '<input type="range" class="bcdim__r" min="1" max="5" step="0.5" value="' + (saved!=null?saved:base) + '">' +
      '<span class="bcdim__v">' + (saved!=null?saved:base) + '</span>' +
      '<span class="bcdim__b">基准 ' + base + '</span>';
    box.appendChild(row);
    var r = row.querySelector('.bcdim__r'), v = row.querySelector('.bcdim__v');
    r.oninput = function(){ v.textContent = r.value; };
  });
}

/** 渲染变现策略 chips */
function bcRenderMon(){
  var box = $('#bc_mon'); box.innerHTML = '';
  BC_MON.forEach(function(m){
    var b = document.createElement('button');
    b.className = 'chip' + (bcSelMon.indexOf(m.k)>=0 ? ' is-on' : '');
    b.textContent = m.k;
    b.onclick = function(){
      var i = bcSelMon.indexOf(m.k);
      if(i>=0) bcSelMon.splice(i,1); else bcSelMon.push(m.k);
      bcRenderMon();
    };
    box.appendChild(b);
  });
}

/** 填入品类基准 */
function bcFillBase(){
  var cat = bcCat();
  [].forEach.call(document.querySelectorAll('#bc_dims .bcdim'), function(row){
    var k = row.getAttribute('data-dim'), b = cat.base[k];
    if(b == null) return;
    row.querySelector('.bcdim__r').value = b;
    row.querySelector('.bcdim__v').textContent = b;
  });
}

/** 清空打分（归到最低，便于自己重填） */
function bcClearDims(){
  [].forEach.call(document.querySelectorAll('#bc_dims .bcdim'), function(row){
    row.querySelector('.bcdim__r').value = 3;
    row.querySelector('.bcdim__v').textContent = '3';
  });
}

/** 收集当前输入 */
function bcCollect(){
  var dims = {};
  [].forEach.call(document.querySelectorAll('#bc_dims .bcdim'), function(row){
    dims[row.getAttribute('data-dim')] = parseFloat(row.querySelector('.bcdim__r').value);
  });
  var o = {
    cat:     $('#bc_cat').value,
    brand:   $('#bc_brand').value.trim(),
    aud:     $('#bc_aud').value.trim(),
    claim:   $('#bc_claim').value.trim(),
    mission: $('#bc_mission').value.trim(),
    vision:  $('#bc_vision').value.trim(),
    mvv:     $('#bc_mvv').value.trim(),
    lvFunc:  $('#bc_lvf').value.trim(),
    lvEmo:   $('#bc_lve').value.trim(),
    lvSelf:  $('#bc_lvs').value.trim(),
    dims:    dims,
    rev:     $('#bc_rev').value,
    mon:     bcSelMon.slice(),
    type:    $('#bc_type').value
  };
  state.bc = o; save();
  return o;
}

/** 主入口 */
function bcRun(){
  var o = bcCollect();
  var r = bcAnalyze(o);
  bcLast = { o:o, r:r };

  $('#bcChart').innerHTML = bcChart(r);

  var L = { ok:'✅', warn:'⚠️', bad:'🛑' };
  var h = '<div class="bcres">';
  h += '<div class="bcres__hd">综合健康度 <b>' + r.score + '</b> / 100';
  h += '<span class="bcres__sub">🛑 ' + r.bad + ' 严重 · ⚠️ ' + r.warn + ' 提示</span></div>';

  var credo = bcCredo(o);
  if(credo) h += '<div class="bccredo">「' + credo + '」</div>';

  if(r.mainFields.length){
    h += '<div class="bcres__row"><span class="bcres__k">主战场</span><span class="bcres__v">' +
         r.mainFields.map(function(f){ return f.n; }).join(' · ') + '</span></div>';
  }

  h += '<div class="bcres__sec">诊断结论</div>';
  if(!r.diag.length) h += '<div class="bcres__d">暂无结论，先给维度打分。</div>';
  r.diag.forEach(function(d){
    h += '<div class="bcres__d is-' + d.lv + '"><span class="bcres__i">' + (L[d.lv]||'') + '</span>' +
         '<div><b>' + d.t + '</b>：' + d.d + '</div></div>';
  });

  if(r.cat.taboo && r.cat.taboo.length){
    h += '<div class="bcres__sec">' + r.cat.em + ' ' + r.cat.n + '禁忌</div>';
    r.cat.taboo.forEach(function(t){ h += '<div class="bcres__d is-warn"><span class="bcres__i">⛔</span><div>' + t + '</div></div>'; });
  }

  h += '<div class="bcres__note">基准线为经验参考值，不来自任何数据库，可拖动调整。</div>';
  h += '</div>';

  $('#bcOut').innerHTML = h;
}

function bcExportSvg(){
  if(!bcLast || !bcLast.r.rows.length){ toast('先点「⚡ 诊断」'); return; }
  var svg = bcChart(bcLast.r);
  svg = svg.replace(/var\(--([a-z0-9-]+)\)/g, function(m0, n){
    return getComputedStyle(document.documentElement).getPropertyValue('--'+n).trim() || '#888';
  });
  downloadFile('品牌内核_价值曲线.svg', svg, 'image/svg+xml');
}

function bcExportMd(){
  if(!bcLast){ toast('先点「⚡ 诊断」'); return; }
  downloadFile('品牌内核诊断.md', bcReport(bcLast.r, bcLast.o), 'text/markdown');
}
