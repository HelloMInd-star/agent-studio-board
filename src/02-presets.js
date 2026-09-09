/* ================= 预设数据 ================= */
var PRESETS = [
  {n:'🎯品牌策略', role:'你是一位有 10 年经验的品牌策略师，服务过快消与互联网品牌，擅长从市场结构中找差异化机会。',
   task:'为品牌制定清晰的定位策略与核心信息屋。', req:'先给结论再给论证；每条判断必须有依据；避免空话。', ex:'定位：为 X 人群提供 Y 差异价值的 Z 品类'},
  {n:'👥用户画像', role:'你是一位用户研究专家，擅长从定性数据中提炼行为模式与购买动机。',
   task:'输出 3 个核心用户画像 Persona。', req:'每个画像含：基本信息、目标、痛点、决策路径、触达渠道、抗拒点。', ex:''},
  {n:'⚔️竞品拆解', role:'你是一位竞品分析专家，擅长结构化拆解对手的打法并找出破绽。',
   task:'拆解指定竞品，输出对比矩阵与可乘之机。', req:'维度含：定位、卖点、价格、渠道、内容打法、用户口碑、明显弱点。', ex:''},
  {n:'✍️小红书', role:'你是一位小红书内容操盘手，操盘过多个万赞笔记，深谙平台流量逻辑。',
   task:'产出 10 个爆款标题 + 3 篇完整正文。', req:'标题必须含钩子；正文口语化、多换行、带 emoji；结尾有互动引导。', ex:''},
  {n:'📰公众号', role:'你是一位资深新媒体主编，擅长长文叙事与观点输出。',
   task:'写一篇结构完整的公众号推文。', req:'开头 100 字内给出阅读理由；小标题清晰；结尾有行动号召。', ex:''},
  {n:'🎬短视频', role:'你是一位短视频脚本策划，熟悉抖音/视频号的完播率逻辑。',
   task:'写一个 60 秒短视频脚本。', req:'前 3 秒必须有强钩子；按秒标注画面与口播；结尾引导转化。', ex:''},
  {n:'📊投放复盘', role:'你是一位效果营销专家，熟悉巨量引擎、腾讯广告等投放后台。',
   task:'基于投放数据做复盘并给出下一周期优化方案。', req:'先算指标再归因；区分素材/人群/出价问题；建议要可执行。', ex:''},
  {n:'⚖️合规审核', role:'你是一位熟悉《广告法》与各大平台内容规范的合规审核员。',
   task:'扫描文案中的违规风险并给出修改建议。', req:'标出风险等级、原文位置、违规原因、修改方案。', ex:''}
];

var STRATS = [
  {k:'SWOT分析', d:'优势 / 劣势 / 机会 / 威胁 四象限 + 交叉策略'},
  {k:'STP定位', d:'市场细分 → 目标市场 → 差异化定位'},
  {k:'用户画像', d:'3 个 Persona：目标、痛点、决策路径、触达渠道'},
  {k:'竞品对比', d:'多维度竞品矩阵 + 空白机会点识别'},
  {k:'GTM上市', d:'上市节奏、渠道组合、预算分配、关键里程碑'},
  {k:'信息屋', d:'Message House：核心主张 + 支撑点 + 用户利益'},
  {k:'营销日历', d:'全年节点排期与主题规划'},
  {k:'4P策略', d:'产品 / 价格 / 渠道 / 推广 组合策略'},
  {k:'PRD', d:'产品需求文档：目标、范围、功能、验收标准'},
  {k:'项目复盘', d:'目标回顾 → 结果评估 → 原因分析 → 经验沉淀'}
];

var MBTI = [
  'INTJ · 建筑师','INTP · 逻辑学家','ENTJ · 指挥官','ENTP · 辩论家',
  'INFJ · 提倡者','INFP · 调停者','ENFJ · 主人公','ENFP · 竞选者',
  'ISTJ · 物流师','ISFJ · 守卫者','ESTJ · 总经理','ESFJ · 执政官',
  'ISTP · 鉴赏家','ISFP · 探险家','ESTP · 企业家','ESFP · 表演者'
];

var TOOLS = ['🧠 豆包 (创意)','💻 DeepSeek (代码/逻辑)','📝 通义千问 (润色/长文本)','🖥️ Ollama (本地)',
  '🤖 扣子 Coze','⚡ Trae','🌿 Claude','🐙 GitHub','▲ Vercel','🚂 Railway','✋ 手动',
  '⚡ 竞品矩阵(本地函数)','⚡ STP市场选择(本地函数)','⚡ 营销日历(本地函数)','⚡ 内容体检(本地函数)'];
/* 本地可执行的确定性工具：索引 -> 定义 */
var LOCAL_TOOLS = {
  11:{key:'comp', name:'analyze_competitor_matrix', label:'竞品对比矩阵'},
  12:{key:'stp',  name:'evaluate_market_segments',  label:'STP 市场选择'},
  13:{key:'cal',  name:'plan_marketing_calendar',   label:'营销日历倒排'},
  14:{key:'scan', name:'check_content_health',      label:'内容体检评分'}
};
function isLocalTool(i){ return !!LOCAL_TOOLS[i]; }

var FLOW_PRESETS = [
  {n:'📕 小红书爆款', goal:'产出 10 条可发布的小红书笔记', steps:[
    {t:'检索该品类近 30 天 Top20 笔记，提炼标题公式与钩子结构，输出 5 条公式。', tool:1, inVar:'', outVar:'formulas', fail:'retry', gate:0},
    {t:'基于公式，围绕产品卖点生成 20 个标题候选。', tool:0, inVar:'{{formulas}}', outVar:'candidates', fail:'retry', gate:0},
    {t:'筛选 10 个最优标题，逐个扩写正文，套用平台调性与 emoji 排版。', tool:2, inVar:'{{candidates}}', outVar:'drafts', fail:'retry', gate:70},
    {t:'合规扫描：违禁词 + 广告法极限词，标出风险并给出修改方案。', tool:1, inVar:'{{drafts}}', outVar:'scan', fail:'abort', gate:0},
    {t:'为 10 篇笔记生成 9 图分镜文案与话题标签。', tool:0, inVar:'{{drafts}},{{scan}}', outVar:'shots', fail:'skip', gate:0},
    {t:'输出 7 天发布排期表，标注最佳发布时间。', tool:10, inVar:'{{shots}}', outVar:'schedule', fail:'skip', gate:0}
  ]},
  {n:'⚔️ 竞品情报', goal:'生成本周竞品情报周报', steps:[
    {t:'确定监测竞品清单与维度（定位/价格/卖点/渠道/内容/口碑）。', tool:10, inVar:'', outVar:'scope', fail:'abort', gate:0},
    {t:'检索各竞品近 7 天动态：上新、调价、活动、融资、舆情。', tool:1, inVar:'{{scope}}', outVar:'raw', fail:'retry', gate:0},
    {t:'抓取竞品小红书/抖音近 30 天爆款内容，提取选题与结构。', tool:4, inVar:'{{scope}}', outVar:'hot', fail:'skip', gate:0},
    {t:'汇总成对比矩阵，标注威胁等级与趋势变化。', tool:1, inVar:'{{raw}},{{hot}}', outVar:'matrix', fail:'abort', gate:0},
    {t:'输出 3 条可行动建议，附我方应对方案与优先级。', tool:1, inVar:'{{matrix}}', outVar:'actions', fail:'retry', gate:0},
    {t:'润色成周报格式，写入知识库「竞品素材」。', tool:2, inVar:'{{matrix}},{{actions}}', outVar:'report', fail:'skip', gate:70}
  ]},
    {n:'🏷️ 品牌策略', goal:'输出品牌定位与信息屋', steps:[
    {t:'梳理品类格局与我方资源，明确可占据的心智位置。', tool:0, inVar:'', outVar:'context', fail:'abort', gate:0},
    {t:'做 STP：细分市场 → 目标人群 → 差异化定位陈述。', tool:1, inVar:'{{context}}', outVar:'stp', fail:'abort', gate:0},
    {t:'用市场选择矩阵评估各细分市场，给出投入优先级。', tool:12, inVar:'{{stp}}', outVar:'priority', fail:'skip', gate:0},
    {t:'搭信息屋：核心主张 + 三大支撑点 + 用户利益 + 信任状。', tool:0, inVar:'{{stp}}', outVar:'house', fail:'retry', gate:70},
    {t:'输出 Tone of Voice 语气指南与禁用词清单。', tool:2, inVar:'{{house}}', outVar:'tone', fail:'retry', gate:0},
    {t:'合规扫描全部对外表述，写入品牌记忆。', tool:14, inVar:'{{house}},{{tone}}', outVar:'compliance', fail:'abort', gate:0}
  ]},
  {n:'📈 投放复盘', goal:'输出下一周期投放优化方案', steps:[
    {t:'导入投放后台导出的数据表，说明字段与统计周期。', tool:10, inVar:'', outVar:'dataset', fail:'abort', gate:0},
    {t:'计算 CTR / CVR / CPA / ROAS，按计划、素材、人群分层。', tool:1, inVar:'{{dataset}}', outVar:'metrics', fail:'abort', gate:0},
    {t:'识别跑量素材与衰退素材，标注生命周期阶段。', tool:1, inVar:'{{metrics}}', outVar:'creatives', fail:'retry', gate:0},
    {t:'归因分析：判断是素材、人群还是出价问题，给出依据。', tool:1, inVar:'{{metrics}},{{creatives}}', outVar:'attribution', fail:'abort', gate:0},
    {t:'对头部素材做内容体检，找出文案层面的改进点。', tool:14, inVar:'{{creatives}}', outVar:'copycheck', fail:'skip', gate:0},
    {t:'输出预算重分配方案与素材迭代方向。', tool:1, inVar:'{{attribution}},{{copycheck}}', outVar:'plan', fail:'retry', gate:0},
    {t:'沉淀结论进知识库，供下期策略调用。', tool:10, inVar:'{{plan}}', outVar:'memory', fail:'skip', gate:0}
  ]}
];
