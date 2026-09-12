/* ============================================================
 * 可预期热点池 —— 热点决策的入口层
 *
 * 为什么不做「实时热点雷达」
 *   突发热点（塌房/事故/爆梗）只能靠抓取 API 发现，
 *   而抓取会破坏「零依赖、本地运行」的产品底线。
 *   更要命的是：等你发现 → 评估 → 出物料，窗口已经关了。
 *
 * 可预期热点的真正价值
 *   它们提前一年就确定，因此可以提前准备。
 *   这才是本工具（排期 / 工作流 / 内容包）能真正帮上忙的地方。
 *
 * 数据来源说明
 *   农历节日复用 17-calendar.js 的 LUNAR_FEST（2026-2030 已核对），
 *   不另行维护一套，避免两处漂移。
 * ============================================================ */

/* ---------- 情绪倾向（用于价值契合判断） ---------- */
var HS_EMO = {
  warm:  {n:'温情',   c:'var(--warn)',  d:'团圆/感恩/关怀，适合情感叙事'},
  joy:   {n:'欢快',   c:'var(--ok)',    d:'玩梗/庆祝/释放，适合轻松玩闹'},
  deal:  {n:'交易',   c:'var(--brand)', d:'促销/囤货/比价，理性决策主导'},
  achiev:{n:'成就',   c:'var(--signal)',d:'拼搏/逆袭/里程碑，适合励志叙事'},
  calm:  {n:'肃穆',   c:'var(--mute)',  d:'纪念/反思/庄重，商业表达需极度克制'},
  trend: {n:'潮流',   c:'var(--violet)',d:'跟风/尝鲜/社交货币，适合快节奏'}
};

/* ---------- 热点池节点定义 ----------
 * type: festival 传统节日 / ecom 电商节点 / season 行业档期
 * md:   公历固定日期 'MM-DD'；lunar:true 时按 LUNAR_FEST 取
 * lead: 建议提前准备天数（= 物料筹备 + 预热所需）
 * emo:  情绪倾向（见 HS_EMO）
 * win:  这个节点通常怎么赢（典型打法）
 * care: 这个节点最容易翻车的点
 */
var HS_POOL = [

  /* ========== 一、传统节日（情感向最强） ========== */
  {n:'元旦',     type:'festival', md:'01-01', lead:20, emo:'joy',
   win:'新年flag / 年度回顾 / 开年第一单，适合做"新开始"叙事',
   care:'避免空洞的励志口号，用户已免疫'},
  {n:'春节',     type:'festival', md:'02-17', lunar:true, lead:45, emo:'warm',
   win:'团圆/归乡/年味，情感浓度全年最高；年货礼品类可做转化',
   care:'氛围合家欢，任何冲突性表达都会被放大；促销硬广会冲淡情感'},
  {n:'元宵',     type:'festival', md:'03-03', lunar:true, lead:14, emo:'warm',
   win:'灯谜/汤圆/团圆收尾，适合轻量互动，低成本收官春节档',
   care:'春节尾声，用户注意力已回落，不宜重投'},
  {n:'情人节',   type:'festival', md:'02-14', lead:21, emo:'warm',
   win:'礼物/告白/双人场景，礼品与体验类转化率高',
   care:'单身群体对过度甜蜜表达敏感，注意别制造对立'},
  {n:'妇女节',   type:'festival', md:'03-08', lead:18, emo:'achiev',
   win:'女性力量/自我犒赏，近年从"女神节"转向"悦己"叙事',
   care:'❗ 高危：避免"教女性如何取悦他人"的旧叙事，易被批物化'},
  {n:'清明',     type:'festival', md:'04-05', lead:10, emo:'calm',
   win:'踏青/春日/思念；多数品牌应仅做静默或轻量春日内容',
   care:'❗ 高危：祭扫主题严禁商业借势，只可踏青不可悼念'},
  {n:'五一',     type:'festival', md:'05-01', lead:21, emo:'joy',
   win:'出行/假期/劳动者，旅游与户外品类主战场',
   care:'"劳动节"与"假期玩乐"两种叙事易冲突，选一个别混着说'},
  {n:'母亲节',   type:'festival', md:'05-10', lead:21, emo:'warm',
   win:'感恩/礼物/亲情，礼品类转化稳定',
   care:'避免制造"不买就是不孝"的愧疚感营销'},
  {n:'儿童节',   type:'festival', md:'06-01', lead:18, emo:'joy',
   win:'童心/怀旧/成年人的儿童节，泛人群都能参与',
   care:'面向成年人的怀旧易与真正的亲子内容混流，受众要分清楚'},
  {n:'端午',     type:'festival', md:'06-19', lunar:true, lead:21, emo:'warm',
   win:'粽子/龙舟/家宴，食品与礼盒类主战场',
   care:'历史人物题材（屈原）不宜娱乐化玩梗'},
  {n:'七夕',     type:'festival', md:'08-19', lunar:true, lead:21, emo:'warm',
   win:'中式浪漫/告白/礼物，比情人节更适合国风表达',
   care:'单身议题敏感，避免"脱单焦虑"话术'},
  {n:'教师节',   type:'festival', md:'09-10', lead:14, emo:'achiev',
   win:'感恩师恩/回忆校园，教育与众筹类借势合适',
   care:'❗ 避免借机推销送礼，与师德议题冲突'},
  {n:'中秋',     type:'festival', md:'09-25', lunar:true, lead:30, emo:'warm',
   win:'团圆/月饼/赏月，全年第二情感高峰，礼盒类转化强',
   care:'与春节同质化，需找差异角度'},
  {n:'国庆',     type:'festival', md:'10-01', lead:25, emo:'achiev',
   win:'长假/出游/家国情怀，旅游与家居大促窗口',
   care:'❗ 高危：家国叙事商业品牌须极克制，娱乐化会被批'},
  {n:'重阳',     type:'festival', md:'10-18', lunar:true, lead:12, emo:'warm',
   win:'敬老/登高/秋意，适合银发与康养品类',
   care:'敬老题材避免悲情化，也避免过度商业化'},
  {n:'万圣节',   type:'festival', md:'10-31', lead:14, emo:'joy',
   win:'cosplay/搞怪/暗黑，年轻化品牌的低成本玩法',
   care:'恐怖元素需注意尺度，儿童向内容要规避'},
  {n:'平安夜',   type:'festival', md:'12-24', lead:14, emo:'warm',
   win:'礼物/仪式感/城市氛围，年轻人社交场景',
   care:'宗教意味淡化处理，只取节庆氛围'},
  {n:'圣诞节',   type:'festival', md:'12-25', lead:18, emo:'joy',
   win:'节日氛围/限定款/聚会，全品类通用',
   care:'"洋节"在部分舆论场有争议，重氛围轻文化'},
  {n:'跨年',     type:'festival', md:'12-31', lead:20, emo:'achiev',
   win:'年度盘点/新年flag/告别与启程，情感与转发率双高',
   care:'各家都在做盘点，同质化极严重，需要独特切口'},

  /* ========== 二、电商节点（转化向，且有预热期） ========== */
  {n:'年货节',   type:'ecom', md:'01-10', lead:30, emo:'deal',
   win:'囤货/送礼/返乡，礼盒与食品类主战场',
   care:'与春节档重叠，需明确是"囤"还是"送"'},
  {n:'38大促',   type:'ecom', md:'03-05', lead:18, emo:'deal',
   win:'悦己消费/女性向品类，美妆个护主战场',
   care:'❗ 与妇女节同期，促销叙事与女性议题需分开处理'},
  {n:'五一黄金周', type:'ecom', md:'04-28', lead:21, emo:'deal',
   win:'出行装备/出游囤货，比五一当天更早开打',
   care:'促销期与假期错位，别在假期开始后才发力'},
  {n:'618',      type:'ecom', md:'06-18', lead:30, emo:'deal',
   win:'年中最大节点；6/1 即开预售，6/18 为爆发日',
   care:'❗ 真正的战场在 6/1 预售，不是 6/18 当天——按"起止区间"排期'},
  {n:'818',      type:'ecom', md:'08-18', lead:18, emo:'deal',
   win:'数码家电类主战场，暑期末促销',
   care:'声量远小于 618/双11，投入需相应缩减'},
  {n:'99划算节', type:'ecom', md:'09-09', lead:14, emo:'deal',
   win:'秋冬换季预热，服饰与家居类',
   care:'夹在 818 与双11 之间，需避免促销疲劳'},
  {n:'双11',     type:'ecom', md:'11-11', lead:40, emo:'deal',
   win:'全年最大节点；10 月中下旬即启动预售，战线长达一个月',
   care:'❗ 提前量最大的节点，40 天前不动就已落后'},
  {n:'双12',     type:'ecom', md:'12-12', lead:14, emo:'deal',
   win:'双11 补漏与清仓，性价比叙事',
   care:'用户对连续大促已疲劳，需新角度'},
  {n:'年终清仓', type:'ecom', md:'12-20', lead:12, emo:'deal',
   win:'库存出清/年终结账，价格敏感人群',
   care:'频繁清仓会损伤正价心智'},

  /* ========== 三、行业档期（分人群，非全品类） ========== */
  {n:'寒假',     type:'season', md:'01-20', lead:20, emo:'joy',
   win:'学生/亲子/家庭场景，教育与娱乐品类',
   care:'家长视角与学生视角叙事完全不同'},
  {n:'开学季',   type:'season', md:'02-25', lead:21, emo:'achiev',
   win:'装备/文具/换新，泛学生人群；家长决策学生使用',
   care:'决策者（家长）与使用者（学生）诉求不同'},
  {n:'秋招季',   type:'season', md:'03-01', lead:18, emo:'achiev',
   win:'求职/简历/成长焦虑，教育与服务类',
   care:'❗ 民生焦虑类，玩梗语气会被批"何不食肉糜"'},
  {n:'毕业季',   type:'season', md:'06-10', lead:25, emo:'warm',
   win:'告别/启程/友谊，情感浓度高，泛品类可借',
   care:'伤感与希望两种情绪需择一，混用会稀释'},
  {n:'暑假',     type:'season', md:'07-05', lead:25, emo:'joy',
   win:'出游/培训/宅家娱乐，亲子与学生双线',
   care:'跨度长达两月，需拆成多个子节点运营'},
  {n:'暑期档',   type:'season', md:'07-15', lead:21, emo:'trend',
   win:'影视/游戏/线下娱乐，内容消费高峰',
   care:'娱乐内容竞争激烈，蹭片需版权意识'},
  {n:'军训季',   type:'season', md:'09-01', lead:14, emo:'achiev',
   win:'晒黑/成长/集体记忆，适合轻量化玩梗',
   care:'❗ 涉校园与青少年，商业表达需谨慎'},
  {n:'开学季(秋)',type:'season', md:'09-01', lead:21, emo:'achiev',
   win:'秋季开学，装备与教辅类；比春季开学声量更大',
   care:'与军训季重叠，需区分人群'},
  {n:'秋游季',   type:'season', md:'10-15', lead:18, emo:'trend',
   win:'赏秋/露营/短途，户外与摄影品类',
   care:'地域差异大，南北方内容不可通用'},
  {n:'换季上新', type:'season', md:'10-08', lead:20, emo:'trend',
   win:'秋冬服饰/护肤/家居，全品类上新窗口',
   care:'"换季"是常规动作，缺乏话题性需另找钩子'},
  {n:'年度盘点', type:'season', md:'12-15', lead:18, emo:'achiev',
   win:'报告/榜单/回顾，B端与个人品牌都适用',
   care:'各家都发盘点，同质化严重，需独特数据或角度'},
  {n:'颁奖季',   type:'season', md:'02-20', lead:14, emo:'trend',
   win:'影视/时尚/设计，内容借势与红毯话题',
   care:'明星关联度高，需防塌房风险'}
];

/* ---------- 取节点在今年/明年的公历日期 ---------- */
function hsNodeDate(node, year){
  if(node.lunar){
    var lf = (typeof LUNAR_FEST !== 'undefined') && LUNAR_FEST[year];
    if(lf && lf[node.n]) return year + '-' + lf[node.n];
    // 没有该年的农历表时退回内置值（不静默返回 null 导致后续崩）
    return year + '-' + node.md;
  }
  return year + '-' + node.md;
}

/* ---------- 计算节点状态 ----------
 * 返回 { d: 距今天数, stage:'past'|'live'|'prepare'|'future', label, color }
 * d < -3          已过（归档）
 * -3 <= d <= 3    进行中（黄金期）
 * 3 < d <= lead   该准备了
 * d > lead        还早
 */
function hsNodeStage(node, today){
  today = today || new Date();
  var y = today.getFullYear();
  var ds = hsNodeDate(node, y);
  var dt = new Date(ds + 'T00:00:00');
  var d = Math.round((dt - new Date(today.getFullYear(), today.getMonth(), today.getDate())) / 86400000);

  // 已过且超过 3 天 → 看明年
  if(d < -3){
    var ds2 = hsNodeDate(node, y + 1);
    var dt2 = new Date(ds2 + 'T00:00:00');
    var d2 = Math.round((dt2 - new Date(today.getFullYear(), today.getMonth(), today.getDate())) / 86400000);
    return {d:d2, date:ds2, year:y+1, stage:(d2 <= node.lead ? 'prepare' : 'future'), nextYear:true};
  }

  var stage;
  if(d <= 3) stage = 'live';
  else if(d <= node.lead) stage = 'prepare';
  else stage = 'future';

  return {d:d, date:ds, year:y, stage:stage, nextYear:false};
}

var HS_STAGE = {
  live:    {n:'进行中',   c:'var(--ok)',    d:'黄金期，内容应已在投放'},
  prepare: {n:'该准备了', c:'var(--warn)',  d:'筹备与预热窗口'},
  future:  {n:'还早',     c:'var(--mute)',  d:'可先记入排期'},
  past:    {n:'已过',     c:'var(--gray-500)', d:'已归档'}
};

/* ---------- 按状态排序后的热点池 ---------- */
function hsPoolList(today){
  return HS_POOL.map(function(n){
    var st = hsNodeStage(n, today);
    return {node:n, d:st.d, date:st.date, year:st.year, stage:st.stage, nextYear:st.nextYear};
  }).sort(function(a, b){
    var ord = {live:0, prepare:1, future:2};
    var oa = ord[a.stage] === undefined ? 3 : ord[a.stage];
    var ob = ord[b.stage] === undefined ? 3 : ord[b.stage];
    if(oa !== ob) return oa - ob;
    return a.d - b.d;
  });
}

/* ---------- 从热点池载入到评估表单 ---------- */
function hsLoadNode(idx){
  var list = hsPoolList();
  var it = list[idx];
  if(!it) return;
  var n = it.node;

  var t = $('#hs_topic');
  if(t){ t.value = n.n; }

  // 自动带出：情绪倾向 + 典型打法，作为背景信息
  var bg = $('#hs_poolbg');
  if(bg){
    var emo = HS_EMO[n.emo] || HS_EMO.trend;
    bg.innerHTML =
      '<div class="hspool__bg">' +
      '<div class="hspool__bgrow"><span class="chip chip--sm">' + esc(n.type === 'ecom' ? '电商节点' : (n.type === 'festival' ? '传统节日' : '行业档期')) + '</span>' +
      '<span class="chip chip--sm" style="background:' + emo.c + '22;color:' + emo.c + '">' + esc(emo.n) + '</span>' +
      '<span class="chip chip--sm">' + esc(it.date) + ' · 还有 ' + it.d + ' 天</span></div>' +
      '<div class="hspool__tip"><b>通常怎么赢</b>：' + esc(n.win) + '</div>' +
      '<div class="hspool__care"><b>容易翻车</b>：' + esc(n.care) + '</div>' +
      '</div>';
  }

  // 节点类热点的时效性默认给高（因为可预期、可提前准备）
  var timeEl = $('#hs_time');
  if(timeEl){
    timeEl.value = it.stage === 'live' ? 5 : (it.stage === 'prepare' ? 4 : 3);
    if(typeof syncRange === 'function') syncRange(timeEl);
  }

  if(typeof calcHotspot === 'function') calcHotspot();
  if(typeof renderHotspot === 'function') renderHotspot();
}

/* ---------- 渲染热点池 ---------- */
function hsRenderPool(){
  var host = $('#hsPool');
  if(!host) return;
  var list = hsPoolList();
  var flt = $('#hsPoolFlt') ? $('#hsPoolFlt').value : 'all';

  var show = list.filter(function(it){
    if(flt === 'all') return it.stage !== 'future';
    if(flt === 'live') return it.stage === 'live';
    if(flt === 'prepare') return it.stage === 'prepare';
    if(flt === 'future') return true;
    if(flt === 'ecom') return it.node.type === 'ecom';
    if(flt === 'festival') return it.node.type === 'festival';
    if(flt === 'season') return it.node.type === 'season';
    return true;
  });

  if(!show.length){
    host.innerHTML = '<span class="ph">当前筛选下没有节点</span>';
    return;
  }

  var h = '<div class="hspool">';
  show.forEach(function(it){
    var n = it.node;
    var st = HS_STAGE[it.stage] || HS_STAGE.future;
    var emo = HS_EMO[n.emo] || HS_EMO.trend;
    h += '<div class="hspool__item hspool__item--' + it.stage + '" data-idx="' + list.indexOf(it) + '">';
    h += '<div class="hspool__top">';
    h += '<span class="hspool__name">' + esc(n.n) + '</span>';
    h += '<span class="hspool__stage" style="background:' + st.c + '22;color:' + st.c + '">' + esc(st.n) + '</span>';
    h += '</div>';
    h += '<div class="hspool__meta">';
    h += '<span>' + esc(it.date) + '</span>';
    h += '<span>·</span>';
    h += '<span>' + (it.d <= 0 ? '今天/进行中' : '还有 ' + it.d + ' 天') + '</span>';
    h += '<span>·</span>';
    h += '<span style="color:' + emo.c + '">' + esc(emo.n) + '</span>';
    h += '<span>·</span>';
    h += '<span>建议提前 ' + n.lead + ' 天</span>';
    h += '</div>';
    h += '<div class="hspool__win">' + esc(n.win) + '</div>';
    h += '<div class="hspool__btn"><button class="btn btn--sm" onclick="hsLoadNode(' + list.indexOf(it) + ')">载入评估 →</button></div>';
    h += '</div>';
  });
  h += '</div>';
  host.innerHTML = h;
}

/* ---------- 暴露到 window：修「载入评估」按钮点了没反应 ----------
 * 原因同 21-hotspot.js：全站 JS 包在 IIFE 里，内联 onclick 访问不到闭包内函数。
 * 本文件是唯一另一处使用内联 onclick 的模块。
 */
window.hsLoadNode = hsLoadNode;
