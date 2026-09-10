/* ============================================================
 * 39-packwiz.js —— 内容包独立窗口（全屏模态）
 *
 * 三段式：① 启动前对话式采集 → ② 分步执行 → ③ 结果页
 *
 * 依赖：38-packs（pkOpen/pkRec/renderPackRun/renderPackResult）
 *       04-store（save/toast）· 01-core（$/esc）
 *
 * 设计要点（与 38 的关键约定）
 *   1. pkHostEl：执行容器 · pkResEl：结果容器。两者必须分开，
 *      否则 renderPackRun 与 renderPackResult 会互相覆盖。
 *   2. 采集阶段用规则校验（见 pkValidate），中间步骤只查非空。
 *      原因：AI 步骤用户粘回的是几百字产出，规则无法判断质量，
 *      硬判只会误伤。这是刻意的边界，不是偷懒。
 * ============================================================ */

/* ---------- 采集字段配置 ----------
 * key   存入 ctx 的键
 * q     问用户的话
 * ph    输入框占位
 * opt   快捷选项（可空）
 * black 该字段专属黑名单（在通用黑名单之上追加）
 * pos   正向特征：'num' 需含数字 / 'short' 2-10 字名词短语 / null 不校验
 * skip  是否允许跳过
 */
var PK_GEN_BLACK = ['多少钱', '会员', '怎么用', '你能不能', '收费', '价格', '多少钱一个月'];

var PK_FIELDS = {
  xhs: [
    {key:'brand', q:'这次用哪个品牌基准？', ph:'例：Y.Mine 手工香薰 / 已有档案名',
     opt:['用已填的品牌内核', '还没填，先跳过'], pos:'short', skip:1,
     black:['短视频', '脚本', '竞品分析']},
    {key:'goal', q:'这批笔记主要想涨什么？', ph:'例：涨粉 / 引导到店 / 单品转化',
     opt:['涨粉', '引导到店', '单品转化', '品牌曝光'], pos:'short', skip:1,
     black:['怎么用']},
    {key:'limit', q:'有什么硬限制？（没有就跳过）', ph:'例：不提折扣、字数 300 内、本周三是 deadline',
     opt:['不提折扣促销', '不超 300 字', '没有，跳过'], pos:null, skip:1, black:[]}
  ],
  rival: [
    {key:'scope', q:'这次盯哪几家竞品？', ph:'例：A 品牌、B 品牌、C 品牌',
     opt:['用竞品矩阵里已填的', '手动列 3 家'], pos:'short', skip:0,
     black:['多少钱']},
    {key:'focus', q:'重点关注哪类动态？', ph:'例：上新、调价、活动、舆情',
     opt:['上新', '调价', '活动', '舆情', '都看'], pos:'short', skip:1, black:[]}
  ],
  brand: [
    {key:'stage', q:'品牌现在处在什么阶段？', ph:'例：初创 / 成长 / 成熟 / 转型',
     opt:['初创', '成长', '成熟', '转型'], pos:'short', skip:0, black:[]},
    {key:'goal', q:'这次最想解决什么？', ph:'例：说不清自己是谁 / 老客流失 / 溢价卖不动',
     opt:['定位不清', '老客流失', '溢价卖不动', '新客不进来'], pos:'short', skip:1, black:[]}
  ],
  ads: [
    {key:'period', q:'复盘哪个周期？', ph:'例：8 月 / Q3 / 618 期间',
     opt:['本月', '上个季度', '618 期间'], pos:'short', skip:0, black:[]},
    {key:'budget', q:'本周期投放预算大概多少？', ph:'例：20 万 / 50000',
     opt:['10 万以内', '10-50 万', '50 万以上'], pos:'num', skip:1, black:[]}
  ]
};

/* ---------- 规则校验引擎 ----------
 * 返回 {ok:bool, why:'', tip:''}
 *
 * 相对朴素版做了 4 处改良，都是实测会误判才加的：
 *   ① 疑问句加长度豁免：短疑问句才是真提问，
 *      "目标人群是 25-35 岁白领？" 是有效回答，不该拦。
 *   ② 黑名单分字段：全局黑名单会让"我们和竞品一样做美妆"
 *      在行业题上被误判。
 *   ③ 正向特征：不只判断"不是什么"，也判断"像什么"。
 *   ④ 连续 2 次跑偏才强拉（由调用方累计 offN 控制），且始终给跳过出口。
 */
function pkValidate(field, text){
  var t = String(text || '').trim();
  var r = {ok:false, why:'', tip:''};

  if(!t){ r.why = 'empty'; r.tip = '还没填内容，写一句就行，或者点「跳过这题」。'; return r; }

  // ① 纯表情 / 过短
  var plain = t.replace(/[\s\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu, '');
  if(plain.length < 2){ r.why = 'tooShort'; r.tip = '太短了，至少写 2 个字，让我知道你在说什么。'; return r; }

  // ② 疑问句（带长度豁免）
  var isQ = /[？?]$/.test(t) || /怎么|能不能|是什么|如何|是否可以/.test(t);
  if(isQ && t.length < 15){
    r.why = 'question';
    r.tip = '你像是在问我问题。这题我想知道的是「' + field.q.replace(/[？?]$/, '') + '」，直接答就行。';
    return r;
  }

  // ③ 黑名单（通用 + 字段专属）
  var bl = PK_GEN_BLACK.concat(field.black || []);
  var hit = null;
  for(var i = 0; i < bl.length; i++){
    if(t.indexOf(bl[i]) !== -1){ hit = bl[i]; break; }
  }
  if(hit && t.length < 20){
    r.why = 'black';
    r.tip = '这题先不聊「' + hit + '」。回到正题：' + field.q.replace(/[？?]$/, '') + '。';
    return r;
  }

  // ④ 正向特征
  if(field.pos === 'num' && !/\d/.test(t)){
    r.why = 'noNum';
    r.tip = '填个数字吧，比如「20 万」或「50000」。也可以直接跳过。';
    return r;
  }
  if(field.pos === 'short' && t.length > 60){
    r.why = 'tooLong';
    r.tip = '这题想要个简短说法（60 字以内就够了），长内容后面有专门的输入框。';
    return r;
  }

  r.ok = true;
  return r;
}

/* ---------- 状态 ---------- */
var pkHostEl = null;   // 执行容器（38 读取）
var pkResEl  = null;   // 结果容器（38 读取）
var pkModal  = null;   // 模态根节点
var pkWiz    = null;   // {id, fi:0, ans:{}, offN:0, stage:'collect'|'run'}

function pkCtx(id){
  var p = pkState();
  p[id] = p[id] || {steps:[]};
  return p[id].ctx || (p[id].ctx = {});
}

/* ---------- 打开全屏窗口 ---------- */
function pkOpenModal(id){
  var pack = pkPack(id);
  if(!pack) return;

  var fields = PK_FIELDS[id] || [];
  var saved  = pkState()[id];
  var hasRun = saved && saved.steps.some(function(s){ return s && (s.st === 'ran' || s.st === 'done'); });
  /* 答过采集题（ctx 有内容）也视为已启动，不再重复问答 */
  var hasCtx = saved && saved.ctx && Object.keys(saved.ctx).length > 0;

  pkWiz = {
    id:id,
    fi:0,
    ans:{},
    offN:0,
    // 已经跑过就不用再采集一遍
    stage:(hasRun || hasCtx || !fields.length) ? 'run' : 'collect'
  };

  pkOpen(id);
  pkBuildModal(pack);
  if(pkWiz.stage === 'collect') pkRenderCollect();
  else pkRenderRun();
}

/* ---------- 模态骨架 ---------- */
function pkBuildModal(pack){
  /* 只清理旧 DOM，不调用 pkCloseModal：
     后者会把 pkWiz 一起置空，而它是调用方刚刚设好的（踩过这个坑） */
  if(pkModal && pkModal.parentNode) pkModal.parentNode.removeChild(pkModal);
  pkModal = null;

  pkModal = document.createElement('div');
  pkModal.className = 'mwiz';
  pkModal.innerHTML =
    '<div class="mwiz__box">' +
      '<div class="mwiz__hd">' +
        '<div class="mwiz__ttl"><span class="mwiz__ico">' + esc(pack.n) + '</span>' +
          '<em>🎯 ' + esc(pack.goal) + '</em></div>' +
        '<button class="mwiz__x" title="关闭">✕</button>' +
      '</div>' +
      '<div class="mwiz__steps" id="mwizSteps"></div>' +
      '<div class="mwiz__body" id="mwizBody"></div>' +
    '</div>';

  pkModal.querySelector('.mwiz__x').onclick = pkCloseModal;
  pkModal.addEventListener('click', function(e){
    if(e.target === pkModal) pkCloseModal();
  });
  document.body.appendChild(pkModal);
  document.body.style.overflow = 'hidden';
}

function pkCloseModal(){
  if(pkModal && pkModal.parentNode) pkModal.parentNode.removeChild(pkModal);
  pkModal = null; pkHostEl = null; pkResEl = null; pkWiz = null;
  document.body.style.overflow = '';
  if(typeof renderPacks === 'function') renderPacks();
}

/* ---------- 顶部进度指示 ---------- */
function pkRenderSteps(){
  var bar = pkModal && pkModal.querySelector('#mwizSteps');
  if(!bar || !pkWiz) return;
  var labels = ['① 开始前', '② 分步执行', '③ 本次成果'];
  var cur = pkWiz.stage === 'collect' ? 0 : 1;
  bar.innerHTML = labels.map(function(l, i){
    return '<span class="mwiz__st' + (i === cur ? ' is-on' : '') + '">' + l + '</span>';
  }).join('<i class="mwiz__arw">→</i>');
}

/* ---------- 阶段①：对话式采集 ---------- */
function pkRenderCollect(){
  var body = pkModal.querySelector('#mwizBody');
  var fields = PK_FIELDS[pkWiz.id] || [];
  pkRenderSteps();

  // 全部答完 → 进入执行
  if(pkWiz.fi >= fields.length){
    var p = pkState(); p[pkWiz.id] = p[pkWiz.id] || {steps:[]};
    p[pkWiz.id].ctx = pkWiz.ans; save();
    pkWiz.stage = 'run';
    pkRenderRun();
    return;
  }

  var f = fields[pkWiz.fi];
  body.innerHTML = '';

  var box = document.createElement('div');
  box.className = 'mwiz__chat';

  // 已答的作为气泡留下（对话感）
  for(var i = 0; i < pkWiz.fi; i++){
    var pf = fields[i];
    var b = document.createElement('div');
    b.className = 'mwiz__bub is-me';
    b.innerHTML = '<span class="mwiz__bubq">' + esc(pf.q) + '</span>' +
                  '<span class="mwiz__buba">' + esc(pkWiz.ans[pf.key] || '（已跳过）') + '</span>';
    box.appendChild(b);
  }

  var ask = document.createElement('div');
  ask.className = 'mwiz__bub is-ai';
  ask.innerHTML = '<span class="mwiz__bubq">' + esc(f.q) + '</span>' +
    (f.opt && f.opt.length
      ? '<div class="mwiz__opts">' + f.opt.map(function(o){
          return '<button class="mwiz__opt">' + esc(o) + '</button>';
        }).join('') + '</div>'
      : '');
  box.appendChild(ask);

  var row = document.createElement('div');
  row.className = 'mwiz__in';
  row.innerHTML =
    '<input type="text" placeholder="' + esc(f.ph || '') + '" autocomplete="off" />' +
    '<button class="btn btn--primary">下一题 →</button>' +
    (f.skip ? '<button class="btn btn--ghost mwiz__skip">跳过这题</button>' : '');
  box.appendChild(row);

  var tip = document.createElement('div');
  tip.className = 'mwiz__tip';
  tip.innerHTML = '<span class="hint">第 ' + (pkWiz.fi + 1) + ' / ' + fields.length +
                  ' 题 · 答案会注入后面每一步的提示词</span>';
  box.appendChild(tip);

  body.appendChild(box);

  var inp = row.querySelector('input');
  function submit(){
    var v = inp.value.trim();
    if(f.skip && (v === '' || /^没有.*跳过$|^跳过$/.test(v))){
      pkWiz.fi++; pkWiz.offN = 0; pkRenderCollect(); return;
    }
    var r = pkValidate(f, v);
    if(!r.ok){
      // ④ 连续 2 次才强拉，第一次只提示
      pkWiz.offN++;
      /* 注意：首次改写后 className 变成 mwiz__warn，不再含 hint，
         所以两个选择器都要查，否则第 2 次起提示就不再刷新（踩过） */
      var t = tip.querySelector('.hint, .mwiz__warn');
      if(t){
        t.className = 'mwiz__warn';
        t.textContent = (pkWiz.offN >= 2 ? '⚠️ ' : '💡 ') + r.tip +
                        (f.skip ? '（也可以点「跳过这题」）' : '');
      }
      inp.focus();
      return;
    }
    pkWiz.ans[f.key] = v;
    pkWiz.fi++; pkWiz.offN = 0;
    pkRenderCollect();
  }

  row.querySelector('.btn--primary').onclick = submit;
  inp.onkeydown = function(e){ if(e.key === 'Enter') submit(); };
  var sk = row.querySelector('.mwiz__skip');
  if(sk) sk.onclick = function(){ pkWiz.fi++; pkWiz.offN = 0; pkRenderCollect(); };
  Array.prototype.forEach.call(ask.querySelectorAll('.mwiz__opt'), function(b){
    b.onclick = function(){
      var v = b.textContent;
      if(f.skip && /跳过/.test(v)){ pkWiz.fi++; pkWiz.offN = 0; pkRenderCollect(); return; }
      pkWiz.ans[f.key] = v;
      pkWiz.fi++; pkWiz.offN = 0;
      pkRenderCollect();
    };
  });

  setTimeout(function(){ inp.focus(); }, 60);
}

/* ---------- 阶段②：执行（把容器交给 38 渲染） ---------- */
function pkRenderRun(){
  var body = pkModal.querySelector('#mwizBody');
  if(!body) return;
  pkRenderSteps();
  body.innerHTML = '<div id="mwizRunHost"></div><div id="mwizResHost"></div>';
  pkHostEl = body.querySelector('#mwizRunHost');
  pkResEl  = body.querySelector('#mwizResHost');

  if(typeof renderPackRun === 'function') renderPackRun();
  if(typeof renderPackResult === 'function') renderPackResult();

  // 执行页的"返回列表"在模态里应改为关闭窗口
  var back = pkHostEl.querySelector('.pkrun__hd .btn');
  if(back){ back.textContent = '✕ 关闭'; back.onclick = pkCloseModal; }

  // 顶部加一行：把采集到的答案回填显示，让用户知道生效了
  var ctx = pkCtx(pkWiz.id);
  var keys = Object.keys(ctx || {});
  if(keys.length){
    var bar = document.createElement('div');
    bar.className = 'mwiz__ctx';
    bar.innerHTML = '<span class="mwiz__ctxlb">本次设定</span>' +
      keys.map(function(k){
        return '<span class="mwiz__ctxv">' + esc(String(ctx[k])) + '</span>';
      }).join('');
    pkHostEl.insertBefore(bar, pkHostEl.firstChild);
  }
}

/* ---------- 首页卡片 → 打开窗口 ---------- */
function pkBindHomeCards(){
  Array.prototype.forEach.call(document.querySelectorAll('.pack[data-pack]'), function(el){
    if(el.__pkBound) return;
    el.__pkBound = 1;
    el.style.cursor = 'pointer';
    el.onclick = function(){
      if(typeof switchTab === 'function') switchTab('packs');
      pkOpenModal(el.getAttribute('data-pack'));
    };
  });
}

/* ============================================================
 * AI 步骤引导（供 38 的 renderPackRun 调用）
 *
 * 边界：这一套只服务执行阶段「把 AI 产出粘回来」的步骤。
 * 采集阶段（问一句、答一句）走 pkValidate 的规则判断，两者不混用——
 * 用户粘回的是几百字正文，用疑问句/黑名单判断它对不对没有意义。
 * 这里改用「可复制提示词 + 字数提示」来解决卡住的问题。
 * ============================================================ */

/* 生成带上下文的可复制提示词 */
function pkAiHelpHtml(pack, sp, ctx, idx){
  var vals = [];
  if(ctx){
    for(var k in ctx){
      if(ctx[k] && String(ctx[k]).trim()) vals.push(String(ctx[k]).trim());
    }
  }
  var prompt = '你是资深营销专家，请完成下面的任务。\n\n';
  if(vals.length) prompt += '【本次设定】' + vals.join(' · ') + '\n\n';
  prompt += '【任务】\n' + sp.t + '\n\n';
  prompt += '【要求】\n- 直接给结果，不要解释思路\n- 结构清晰，可直接复制使用\n';

  return '<div class="pkhelp">' +
    '<div class="pkhelp__hd">🤖 这一步需要 AI：复制下面的提示词，去任意平台跑完，把结果粘回下方</div>' +
    '<pre class="pkhelp__pre" id="pkPrompt' + idx + '">' + esc(prompt) + '</pre>' +
    '<button class="pkhelp__copy" data-idx="' + idx + '">📋 复制提示词</button>' +
    '</div>';
}

/* 字数提示占位 */
function pkCountHtml(idx){
  return '<p class="pkcount" id="pkCount' + idx + '"></p>';
}

/* 字数实时提示：少于 30 字提醒可能没跑完 */
function pkCountUpdate(idx, ta){
  var el = document.getElementById('pkCount' + idx);
  if(!el) return;
  var n = (ta.value || '').length;
  if(!n){
    el.className = 'pkcount';
    el.textContent = '';
  }else if(n < 30){
    el.className = 'pkcount is-warn';
    el.textContent = '已粘贴 ' + n + ' 字，看起来偏少，可能还没跑完';
  }else{
    el.className = 'pkcount is-ok';
    el.textContent = '已粘贴 ' + n + ' 字';
  }
}
