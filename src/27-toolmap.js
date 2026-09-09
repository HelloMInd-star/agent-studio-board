/* ============================================================
 * 营销工具地图 —— 70 个经典框架全景
 *   ✅ 已实现（25）：点开直接跳转对应模块
 *   🚧 部分覆盖（5）：已有雏形，待完整
 *   📋 方法论速查（40）：未做成工具，但点开有真实内容
 *                      —— 看什么 / 输出什么 / 常见误用
 * 关键：每个卡片都有可点开的内容，没有一个是空壳
 * ============================================================ */

var TOOLMAP = [
  /* ---------- 战略层 ---------- */
  {id:'S-01', n:'PEST分析', en:'PEST', em:'🏛️', cat:'strategy', catN:'战略', st:'done', tab:'tkm', fn:'pest',
   d:'宏观环境扫描（政治/经济/社会/技术）', chart:'四象限仪表盘',
   w:'四个维度分别列出"正在发生什么"', o:'机会清单 / 威胁清单 + 净环境分', m:'写成新闻剪报——堆事实却不写对我们的具体影响'},
  {id:'S-02', n:'波特五力', en:"Porter's Five Forces", em:'⚔️', cat:'strategy', catN:'战略', st:'done', tab:'tkm', fn:'five',
   d:'行业竞争格局分析，判断值不值得进', chart:'五边形雷达图',
   w:'五力各自强度（1-10）', o:'行业吸引力评分 + 最大威胁识别', m:'只打分不写"为什么是这个分"，分数没有依据'},
  {id:'S-03', n:'SWOT分析', en:'SWOT', em:'📊', cat:'strategy', catN:'战略', st:'done', tab:'strategy',
   d:'内外部综合评估（已升级为动态版）', chart:'四象限矩阵',
   w:'优势/劣势/机会/威胁，每条可绑数据', o:'TOWS 四条交叉策略', m:'做完就存档——分析和执行脱节'},
  {id:'S-04', n:'BCG矩阵', en:'BCG Matrix', em:'⭐', cat:'strategy', catN:'战略', st:'done', tab:'strategy',
   d:'业务组合（明星/现金牛/问题/瘦狗）', chart:'四象限气泡图',
   w:'各业务线的增长率与相对份额', o:'象限判定 + 预算建议 + 组合健康度', m:'只看单个业务，不看整体组合是否失衡'},
  {id:'S-05', n:'GE-McKinsey矩阵', en:'GE-McKinsey', em:'🎯', cat:'strategy', catN:'战略', st:'done', tab:'tkm', fn:'ge',
   d:'比 BCG 精细的九宫格业务组合分析', chart:'3×3 热力九宫格',
   w:'行业吸引力 × 业务竞争力（各 1-5）', o:'九格落位 + 投资/维持/收割/退出建议', m:'吸引力维度拍脑袋打分，不如 BCG 用客观增长率'},
  {id:'S-06', n:'价值链分析', en:'Value Chain', em:'🔗', cat:'strategy', catN:'战略', st:'done', tab:'tkm', fn:'vc',
   d:'找出哪些环节创造价值、哪些在消耗', chart:'流程图 + 双条对比',
   w:'各环节的成本占比与利润贡献', o:'低效环节（降本首选）+ 高效环节（应加投）', m:'一刀切砍成本——低效该砍，高效反而该加'},
  {id:'S-07', n:'波特钻石模型', en:"Porter's Diamond", em:'💎', cat:'strategy', catN:'战略', st:'todo',
   d:'国家/区域竞争力分析', chart:'菱形图',
   w:'生产要素/需求条件/相关产业/企业战略', o:'区域竞争优势判断', m:'用于单一企业分析——它本是国家/区域级模型'},
  {id:'S-08', n:'蓝海四步框架', en:'ERRC Grid', em:'🌊', cat:'strategy', catN:'战略', st:'todo',
   d:'剔除/减少/增加/创造', chart:'四象限矩阵',
   w:'行业默认在拼什么，我们如何重构', o:'价值曲线重构方案', m:'写成创意脑暴——没有对应到成本结构的变化'},

  /* ---------- 品牌层 ---------- */
  {id:'B-01', n:'品牌价值金字塔', en:'Brand Pyramid', em:'🏔️', cat:'brand', catN:'品牌', st:'todo',
   d:'基础→利益→个性→定位→价值→精神', chart:'金字塔图',
   w:'每一层对应的具体承诺', o:'品牌价值层级结构', m:'上层写得很美，下层（产品功能）撑不住'},
  {id:'B-02', n:'品牌资产五星', en:"Aaker's Brand Equity", em:'⭐', cat:'brand', catN:'品牌', st:'todo',
   d:'知名度/认知度/联想度/忠诚度/其他资产', chart:'五星雷达图',
   w:'五项各自的现状与差距', o:'品牌资产短板诊断', m:'只测知名度——它只是五星里最容易的一项'},
  {id:'B-03', n:'品牌共鸣金字塔', en:'Brand Resonance', em:'🔊', cat:'brand', catN:'品牌', st:'todo',
   d:'身份→含义→反应→共鸣', chart:'金字塔图',
   w:'每一层的用户实际表现', o:'品牌关系强度阶梯', m:'跳过底层直接追求"共鸣"，没有根基'},
  {id:'B-04', n:'品牌健康度仪表盘', en:'Brand Health', em:'💚', cat:'brand', catN:'品牌', st:'todo',
   d:'搜索指数/NPS/声量/溢价能力', chart:'仪表盘组合',
   w:'各指标的当期值与趋势', o:'品牌健康度综合分', m:'只看声量——声量高可能是负面舆情'},
  {id:'B-05', n:'品牌人格 MBTI', en:'Brand MBTI', em:'🪐', cat:'brand', catN:'品牌', st:'done', tab:'persona',
   d:'品牌拟人化性格（已覆盖）', chart:'人格卡',
   w:'调性/风味/场景偏好', o:'品牌人格设定', m:'人格与产品实际体验不符，反而造成认知混乱'},
  {id:'B-06', n:'管理者 MBTI', en:'Founder MBTI', em:'🧠', cat:'brand', catN:'品牌', st:'todo',
   d:'创始团队性格与决策风格', chart:'雷达图',
   w:'决策偏好/风险态度/信息处理方式', o:'团队决策风格画像', m:'把个人性格当战略依据——它只影响执行风格'},
  {id:'B-07', n:'感知地图', en:'Perceptual Mapping', em:'🗺️', cat:'brand', catN:'品牌', st:'done', tab:'tkm', fn:'pm',
   d:'用户心智中的品牌 vs 竞品位置', chart:'2D 散点图',
   w:'自定义两轴 + 各品牌坐标', o:'空白区识别 + 区隔度诊断', m:'用客观参数代替用户认知——它看的是心智不是事实'},
  {id:'B-08', n:'品牌信任度模型', en:'Brand Trust', em:'🤝', cat:'brand', catN:'品牌', st:'todo',
   d:'用户对品牌的信任度评估', chart:'仪表盘',
   w:'能力/诚信/善意三个维度', o:'信任短板定位', m:'用满意度代替信任度——满意不等于信任'},
  {id:'B-09', n:'品牌故事画布', en:'Story Canvas', em:'📖', cat:'brand', catN:'品牌', st:'todo',
   d:'品牌叙事的完整结构', chart:'画布式',
   w:'主角/冲突/转折/结局', o:'品牌叙事脚本', m:'故事很动人但和产品无关'},

  /* ---------- 市场与用户层 ---------- */
  {id:'M-01', n:'STP分析', en:'STP', em:'🎯', cat:'brand', catN:'市场', st:'done', tab:'strategy',
   d:'市场细分→目标市场→定位', chart:'四象限散点',
   w:'各细分市场的吸引力与竞争力', o:'优先级排序 + 投入建议', m:'细分做完没有取舍——全都想做等于没做'},
  {id:'M-02', n:'用户画像', en:'Persona', em:'👤', cat:'brand', catN:'市场', st:'planned', tab:'charts',
   d:'典型用户人物画像（图卡已覆盖部分）', chart:'人物卡片',
   w:'人口属性/目标/痛点/原声', o:'可贴进方案的人物卡', m:'编一个不存在的人——画像必须来自真实访谈'},
  {id:'M-03', n:'用户旅程地图', en:'Journey Map', em:'🚶', cat:'brand', catN:'市场', st:'done', tab:'tkm', fn:'cj',
   d:'从认知到推荐的完整体验路径', chart:'时间线 + 情绪曲线',
   w:'各阶段的行为/情绪/痛点', o:'情绪低谷 + 痛点清单', m:'画得很漂亮但没有对应改进行动'},
  {id:'M-04', n:'同理心地图', en:'Empathy Map', em:'🧠', cat:'brand', catN:'市场', st:'todo',
   d:'用户"看/听/想/做/痛/得"六维', chart:'六宫格',
   w:'用户视角的六个维度', o:'用户需求洞察', m:'团队自己脑补用户想法，没有真实素材'},
  {id:'M-05', n:'TAM/SAM/SOM', en:'TAM/SAM/SOM', em:'📐', cat:'brand', catN:'市场', st:'done', tab:'research',
   d:'总市场/可服务市场/可获得市场', chart:'三层漏斗',
   w:'目标人群规模与客单价', o:'三层市场规模测算', m:'TAM 报得很大——投资人只看 SOM 能否支撑业务'},
  {id:'M-06', n:'AIPL模型', en:'AIPL', em:'🔄', cat:'brand', catN:'市场', st:'planned', tab:'charts',
   d:'认知→兴趣→购买→忠诚（漏斗图卡部分覆盖）', chart:'漏斗图',
   w:'各层人数与转化率', o:'流转效率诊断', m:'只看人数不看流转率——沉淀比拉新更重要'},
  {id:'M-07', n:'5A模型', en:'5A Model', em:'5️⃣', cat:'brand', catN:'市场', st:'todo',
   d:'认知→吸引→问询→行动→拥护', chart:'漏斗图',
   w:'五个环节的人数', o:'全链路流转分析', m:'把它当漏斗用——5A 强调"问询"这一环常被忽略'},
  {id:'M-08', n:'RFM模型', en:'RFM', em:'📊', cat:'brand', catN:'市场', st:'todo',
   d:'用户分层（最近/频率/金额）', chart:'三维散点',
   w:'三项指标的历史数据', o:'八类用户分层 + 差异化运营', m:'分层完不做差异化动作——分层本身不产生价值'},
  {id:'M-09', n:'用户生命周期', en:'Lifecycle', em:'🌱', cat:'brand', catN:'市场', st:'todo',
   d:'从引入到流失的全周期', chart:'折线图',
   w:'各阶段的留存率', o:'生命周期价值曲线', m:'只关注拉新——成长期的留存才是利润来源'},
  {id:'M-10', n:'NPS追踪', en:'NPS', em:'📈', cat:'brand', catN:'市场', st:'todo',
   d:'用户推荐意愿追踪', chart:'仪表盘',
   w:'推荐者/被动者/贬损者占比', o:'NPS 分值 + 趋势', m:'只问分数不问原因——没原因就无法改进'},
  {id:'M-11', n:'消费行为路径', en:'Clickstream', em:'🖱️', cat:'brand', catN:'市场', st:'todo',
   d:'站内点击/浏览/购买路径', chart:'桑基图',
   w:'页面级流转数据', o:'关键流失节点', m:'数据量大却没有结论——要落到"改哪个页面"'},
  {id:'M-12', n:'流失用户分析', en:'Churn Analysis', em:'🚫', cat:'brand', catN:'市场', st:'todo',
   d:'流失原因及挽回策略', chart:'柱状图',
   w:'流失时间分布与前期行为', o:'流失预警信号 + 挽回方案', m:'只做挽不做防——预警比挽回成本低得多'},
  {id:'M-13', n:'KANO模型', en:'KANO Model', em:'🎈', cat:'brand', catN:'市场', st:'todo',
   d:'用户需求分层：必备/期望/兴奋/无差异', chart:'四象限散点',
   w:'每个功能在"有/无"两种情况下的满意度', o:'需求优先级排序', m:'把所有需求都当必备——兴奋型需求才是差异化来源'},

  /* ---------- 策略与增长层 ---------- */
  {id:'G-01', n:'安索夫矩阵', en:'Ansoff Matrix', em:'🚀', cat:'growth', catN:'策略', st:'done', tab:'tkm', fn:'ansoff',
   d:'增长四策略：渗透/开发/新产品/多元化', chart:'2×2 矩阵',
   w:'四象限策略 + 收益与风险打分', o:'性价比排序 + 执行顺序', m:'四个都做——资源分散，一个都做不好'},
  {id:'G-02', n:'OGSM模型', en:'OGSM', em:'📋', cat:'growth', catN:'策略', st:'done', tab:'tkm', fn:'ogsm',
   d:'目标→具体目标→策略→衡量', chart:'四层瀑布图',
   w:'四层内容', o:'可执行性检查 + 断链提醒', m:'停在 O 和 G——没有 S 和 M 就落不了地'},
  {id:'G-03', n:'营销OKR', en:'Marketing OKR', em:'🎯', cat:'growth', catN:'策略', st:'todo',
   d:'目标与关键结果对齐', chart:'卡片+进度条',
   w:'O 与 2-4 个 KR', o:'可追踪的 KR 看板', m:'KR 写成待办清单——KR 必须是可量化的结果'},
  {id:'G-04', n:'营销组合 4P/7P', en:'Marketing Mix', em:'🧩', cat:'growth', catN:'策略', st:'todo',
   d:'产品/价格/渠道/促销（+人/过程/物质）', chart:'环形图',
   w:'各项的当前状态', o:'营销组合一致性检查', m:'各项各自为战——4P 必须互相支撑'},
  {id:'G-05', n:'AARRR增长模型', en:'AARRR', em:'📈', cat:'growth', catN:'策略', st:'todo',
   d:'获取→激活→留存→收入→推荐', chart:'漏斗图',
   w:'五环节转化率', o:'增长瓶颈定位', m:'狂拉新不留存——AARRR 里留存才是底盘'},
  {id:'G-06', n:'PDCA循环', en:'PDCA', em:'🔄', cat:'growth', catN:'策略', st:'todo',
   d:'计划→执行→检查→改进', chart:'循环图',
   w:'本轮的目标与结果', o:'下轮改进点', m:'C（检查）被跳过——没有检查的 PDCA 只是重复'},
  {id:'G-07', n:'MVP分析', en:'MVP', em:'🧪', cat:'growth', catN:'策略', st:'todo',
   d:'最小可行性产品评估', chart:'矩阵图',
   w:'核心假设与验证方式', o:'验证计划', m:'MVP 做成了完整产品的阉割版'},
  {id:'G-08', n:'战略画布', en:'Strategy Canvas', em:'🖼️', cat:'growth', catN:'策略', st:'todo',
   d:'与竞品的价值曲线对比', chart:'折线图',
   w:'各竞争要素的得分', o:'价值曲线差异点', m:'画了曲线却不改变资源配置'},

  /* ---------- 执行层 ---------- */
  {id:'E-01', n:'营销日历', en:'Calendar', em:'🗓️', cat:'execute', catN:'执行', st:'done', tab:'cal',
   d:'全年营销活动排期（已覆盖）', chart:'月视图日历',
   w:'事件/日期/优先级/状态', o:'排期表 + 到期提醒', m:'排了不跟踪——日历的价值在状态更新'},
  {id:'E-02', n:'竞品对比矩阵', en:'Competitor Matrix', em:'⚔️', cat:'execute', catN:'执行', st:'done', tab:'strategy',
   d:'多维度竞品加权打分', chart:'加权排名表',
   w:'维度权重 + 各竞品打分', o:'排名 + 机会点 + 威胁点', m:'只排名不找空白——排名本身不产生决策'},
  {id:'E-03', n:'转化漏斗', en:'Funnel', em:'📊', cat:'execute', catN:'执行', st:'planned', tab:'charts',
   d:'各阶段转化率（图卡已覆盖部分）', chart:'漏斗图',
   w:'各环节人数', o:'转化率 + 流失最大环节', m:'只看整体转化率——要拆到每一环'},
  {id:'E-04', n:'媒介投放矩阵', en:'Media Matrix', em:'📺', cat:'execute', catN:'执行', st:'done', tab:'fin',
   d:'渠道效率综合对比（财务测算已覆盖）', chart:'雷达图',
   w:'各渠道多维指标', o:'综合排名 + 强弱项', m:'用单一指标（如 CPM）选渠道'},
  {id:'E-05', n:'内容矩阵', en:'Content Matrix', em:'📝', cat:'execute', catN:'执行', st:'todo',
   d:'内容类型 × 渠道匹配', chart:'热力图',
   w:'内容类型与渠道的组合', o:'内容分发策略', m:'一套内容发所有渠道'},
  {id:'E-06', n:'预算分配模型', en:'Budget Allocation', em:'💰', cat:'execute', catN:'执行', st:'done', tab:'fin',
   d:'按渠道/项目/时间分配预算', chart:'热力矩阵',
   w:'渠道 × 目标的百分比', o:'分配表 + 行和校验', m:'平均分配——按目标加权才有效率'},
  {id:'E-07', n:'A/B测试框架', en:'A/B Testing', em:'🔬', cat:'execute', catN:'执行', st:'todo',
   d:'对照实验设计与验证', chart:'对比柱状图',
   w:'变量/样本量/指标', o:'显著性结论', m:'样本不够就下结论——统计显著性是底线'},
  {id:'E-08', n:'投放排期表', en:'Media Schedule', em:'📅', cat:'execute', catN:'执行', st:'todo',
   d:'各渠道投放时间安排', chart:'甘特图',
   w:'渠道/起止/预算', o:'排期甘特图', m:'排期与内容制作脱节'},
  {id:'E-09', n:'关键词矩阵', en:'Keyword Matrix', em:'🔑', cat:'execute', catN:'执行', st:'todo',
   d:'搜索关键词分类管理', chart:'词云图',
   w:'关键词/搜索量/意图', o:'关键词布局表', m:'只追大词——长尾词转化往往更高'},

  /* ---------- 复盘层 ---------- */
  {id:'R-01', n:'投放复盘报告', en:'Campaign Review', em:'📋', cat:'review', catN:'复盘', st:'planned', tab:'synth',
   d:'ROI/CPL/ROAS 复盘（方案合成部分覆盖）', chart:'仪表盘组合',
   w:'投放数据与产出', o:'复盘结论 + 下期建议', m:'罗列数据不给结论'},
  {id:'R-02', n:'归因分析模型', en:'Attribution', em:'🔍', cat:'review', catN:'复盘', st:'todo',
   d:'多触点归因', chart:'桑基图',
   w:'触点序列与转化', o:'各触点贡献度', m:'默认末次归因——它会系统性低估种草渠道'},
  {id:'R-03', n:'同期群分析', en:'Cohort', em:'📊', cat:'review', catN:'复盘', st:'todo',
   d:'不同时期用户留存对比', chart:'热力图',
   w:'按进入时间分组的留存', o:'留存曲线对比', m:'看整体留存——它会掩盖新用户质量下滑'},
  {id:'R-04', n:'营销ROI仪表盘', en:'ROI Dashboard', em:'📈', cat:'review', catN:'复盘', st:'todo',
   d:'整体投入产出追踪', chart:'仪表盘组合',
   w:'投入与产出', o:'ROI 趋势', m:'ROI 口径不统一（含不含人力/工具成本）'},
  {id:'R-05', n:'LTV/CAC测算', en:'LTV/CAC', em:'⚖️', cat:'review', catN:'复盘', st:'done', tab:'fin',
   d:'用户终身价值 vs 获客成本（已覆盖）', chart:'仪表盘',
   w:'客单/复购/生命周期/毛利率/CAC', o:'比值 + 回本周期 + 健康判定', m:'用营收口径——判断回收能力应看毛利'},
  {id:'R-06', n:'GMV拆解', en:'GMV Breakdown', em:'🧩', cat:'review', catN:'复盘', st:'done', tab:'fin',
   d:'GMV = 流量×转化×客单（已覆盖）', chart:'瀑布图',
   w:'两期的四个因子', o:'各因子贡献 + 归因说明', m:'简单相减——会产生无法解释的残差'},
  {id:'R-07', n:'盈亏平衡分析', en:'Breakeven', em:'⚖️', cat:'review', catN:'复盘', st:'done', tab:'pricing',
   d:'卖多少才不亏（定价策略已覆盖）', chart:'折线图',
   w:'固定成本/变动成本/单价', o:'盈亏平衡销量', m:'忽略固定成本——那是很多"卖得越多亏得越多"的根源'},
  {id:'R-08', n:'渠道效率对比', en:'Channel Efficiency', em:'📊', cat:'review', catN:'复盘', st:'done', tab:'fin',
   d:'CPM/CPC/CPL/ROI 对比（已覆盖）', chart:'雷达图',
   w:'各渠道多维指标', o:'综合排名 + 强弱维度', m:'成本类维度不反向计分——数值越低应越好'},
  {id:'R-09', n:'预算使用进度', en:'Budget Tracking', em:'⏳', cat:'review', catN:'复盘', st:'todo',
   d:'花了多少、还剩多少', chart:'环形图',
   w:'预算与实际', o:'使用进度 + 预警', m:'只看花没花完——花超了不一定是坏事，没花完也不一定是好事'},
  {id:'R-10', n:'增长率分析', en:'Growth Rate', em:'📈', cat:'review', catN:'复盘', st:'todo',
   d:'月度/季度/年度增长率', chart:'面积图',
   w:'各期数值', o:'增长率 + 环比同比', m:'只看同比——会掩盖近期的趋势转折'},
  {id:'R-11', n:'留存/流失分析', en:'Retention/Churn', em:'🔄', cat:'review', catN:'复盘', st:'todo',
   d:'用户流失与留存趋势', chart:'折线图',
   w:'各期留存率', o:'留存曲线 + 流失拐点', m:'用整体留存率——新客质量变化会被平均掉'},

  /* ---------- 财务测算层 ---------- */
  {id:'F-01', n:'预算分配热力图', en:'Budget Heatmap', em:'🔥', cat:'finance', catN:'测算', st:'done', tab:'fin',
   d:'渠道 × 目标预算分布（已覆盖）', chart:'热力图',
   w:'渠道 × 目标百分比', o:'热力矩阵 + 行和校验', m:'每行合计不等于 100%'},
  {id:'F-02', n:'渠道效率雷达', en:'Channel Radar', em:'📡', cat:'finance', catN:'测算', st:'done', tab:'fin',
   d:'多维渠道效率综合对比（已覆盖）', chart:'雷达图',
   w:'维度 + 各渠道数值', o:'归一化排名', m:'认为归一化结果是绝对达标——它只是相对排名'},
  {id:'F-03', n:'ROI仪表盘', en:'ROI Dashboard', em:'💹', cat:'finance', catN:'测算', st:'todo',
   d:'实时 ROI 追踪与目标对比', chart:'仪表盘',
   w:'实际 ROI 与目标', o:'达成度', m:'目标值拍脑袋定'},
  {id:'F-04', n:'GMV瀑布拆解', en:'GMV Waterfall', em:'🌊', cat:'finance', catN:'测算', st:'done', tab:'fin',
   d:'GMV 变化逐项拆解（已覆盖）', chart:'瀑布图',
   w:'两期四因子', o:'各因子贡献瀑布图', m:'归因顺序影响单点贡献——应固定顺序并说明'},
  {id:'F-05', n:'渠道效率气泡图', en:'Channel Bubble', em:'🫧', cat:'finance', catN:'测算', st:'todo',
   d:'CPL/转化率/投放额三维对比', chart:'气泡图',
   w:'三个维度数值', o:'效率象限', m:'气泡重叠导致看不清——数据点多时应改用表格'},
  {id:'F-06', n:'用户活跃热力图', en:'Activity Heatmap', em:'🌡️', cat:'finance', catN:'测算', st:'todo',
   d:'活跃时段/日期分布', chart:'热力图',
   w:'时段 × 星期活跃数', o:'最佳投放时段', m:'看绝对量不看占比——大盘的规律不一定适用你的客群'},
  {id:'F-07', n:'转化路径桑基图', en:'Sankey', em:'🌀', cat:'finance', catN:'测算', st:'todo',
   d:'曝光→购买全路径', chart:'桑基图',
   w:'各环节流转人数', o:'流失路径可视化', m:'路径太复杂看不清——应只保留主干路径'},
  {id:'F-08', n:'盈亏平衡折线', en:'Breakeven Chart', em:'📉', cat:'finance', catN:'测算', st:'done', tab:'pricing',
   d:'收入线 vs 成本线交点（已覆盖）', chart:'折线图',
   w:'成本结构与单价', o:'平衡点销量', m:'成本不是线性的——规模效应下变动成本会变'},
  {id:'F-09', n:'LTV/CAC对比图', en:'LTV vs CAC', em:'⚖️', cat:'finance', catN:'测算', st:'done', tab:'fin',
   d:'用户价值与获客成本对比（已覆盖）', chart:'对比柱状图',
   w:'LTV 与 CAC', o:'比值 + 健康判定', m:'LTV 用营收口径——应看能回收多少毛利'},
  {id:'F-10', n:'预算使用环形图', en:'Budget Ring', em:'⭕', cat:'finance', catN:'测算', st:'todo',
   d:'各渠道预算使用进度', chart:'环形图',
   w:'预算与实际', o:'使用进度环', m:'进度 100% 当成目标——不代表效果好'},
  {id:'F-11', n:'品类收入树图', en:'Treemap', em:'🌳', cat:'finance', catN:'测算', st:'todo',
   d:'按品类/渠道/地区收入分布', chart:'树图',
   w:'各层级收入', o:'收入结构占比', m:'层级超过两层就看不清——树图不适合深层级'},
  {id:'F-12', n:'价格敏感度矩阵', en:'Price Sensitivity', em:'💲', cat:'finance', catN:'测算', st:'done', tab:'research',
   d:'不同价格带接受度（调研方案已覆盖）', chart:'曲线图',
   w:'各价位的接受人数', o:'最优价格 + 收入最大化点', m:'月费档与一次性档混在一条曲线上比——会算出荒谬最优价'}
];

var TM_CATS = [
  {k:'all', n:'全部'}, {k:'strategy', n:'战略'}, {k:'brand', n:'品牌'},
  {k:'market', n:'市场'}, {k:'growth', n:'策略'}, {k:'execute', n:'执行'},
  {k:'review', n:'复盘'}, {k:'finance', n:'测算'}
];

function tmState(){
  if(!state.tm) state.tm = {cat:'all', st:'all', q:''};
  return state.tm;
}

function renderToolMap(){
  var host = $('#tmGrid'); if(!host) return;
  var M = tmState();
  /* 统计 */
  var done = TOOLMAP.filter(function(t){ return t.st === 'done'; }).length;
  var plan = TOOLMAP.filter(function(t){ return t.st === 'planned'; }).length;
  var todo = TOOLMAP.filter(function(t){ return t.st === 'todo'; }).length;
  var cnt = $('#tmCount');
  if(cnt) cnt.textContent = '✅ ' + done + ' 已实现 · 🚧 ' + plan + ' 部分覆盖 · 📋 ' + todo + ' 方法论速查';

  var list = TOOLMAP.filter(function(t){
    if(M.cat !== 'all' && t.cat !== M.cat) return false;
    if(M.st !== 'all' && t.st !== M.st) return false;
    if(M.q){
      var q = M.q.toLowerCase();
      return (t.n + t.en + t.d + t.id).toLowerCase().indexOf(q) >= 0;
    }
    return true;
  });

  host.innerHTML = '';
  if(!list.length){
    host.innerHTML = '<div class="tempty"><div class="tempty__big">🔍</div><div>没有匹配的工具</div>' +
      '<div class="tempty__s">试试调整筛选或搜索关键词</div></div>';
    return;
  }
  list.forEach(function(t){
    var card = document.createElement('div');
    card.className = 'tcard is-' + t.st;
    var stN = t.st === 'done' ? '✅ 已实现' : (t.st === 'planned' ? '🚧 部分覆盖' : '📋 方法论速查');
    card.innerHTML =
      '<div class="tcard__hd">' +
        '<span class="tcard__em">' + t.em + '</span>' +
        '<span class="tcard__st st-' + t.st + '">' + stN + '</span>' +
      '</div>' +
      '<div class="tcard__n">' + esc(t.n) + '</div>' +
      '<div class="tcard__en">' + esc(t.en) + '</div>' +
      '<div class="tcard__d">' + esc(t.d) + '</div>' +
      '<div class="tcard__meta">' +
        '<span class="tchip">' + esc(t.catN) + '</span>' +
        '<span class="tchip">' + esc(t.chart) + '</span>' +
      '</div>' +
      '<button class="tcard__btn" data-tmopen="' + t.id + '">' +
        (t.st === 'done' ? '🚀 打开工具' : '📖 查看方法论') +
      '</button>';
    host.appendChild(card);
  });

  [].forEach.call(host.querySelectorAll('[data-tmopen]'), function(b){
    b.onclick = function(){
      tmOpen(b.getAttribute('data-tmopen'));
    };
  });
}

function tmOpen(id){
  var t = TOOLMAP.filter(function(x){ return x.id === id; })[0];
  if(!t) return;
  var box = $('#tmDetail'); if(!box) return;
  var h = '';
  h += '<div class="tmd__hd">' + t.em + ' <b>' + esc(t.n) + '</b>' +
       '<span class="tcard__st st-' + t.st + '" style="margin-left:8px">' +
       (t.st === 'done' ? '✅ 已实现' : (t.st === 'planned' ? '🚧 部分覆盖' : '📋 方法论速查')) +
       '</span></div>';
  h += '<p class="tmd__en">' + esc(t.en) + '　·　' + esc(t.catN) + '　·　图表形态：' + esc(t.chart) + '</p>';
  h += '<p class="tmd__d">' + esc(t.d) + '</p>';
  h += '<div class="tmd__row"><span class="tmd__k">看什么</span><span class="tmd__v">' + esc(t.w) + '</span></div>';
  h += '<div class="tmd__row"><span class="tmd__k">输出什么</span><span class="tmd__v">' + esc(t.o) + '</span></div>';
  h += '<div class="tmd__row is-warn"><span class="tmd__k">常见误用</span><span class="tmd__v">' + esc(t.m) + '</span></div>';
  if(t.st === 'done'){
    h += '<div class="tmd__act"><button class="btn btn--primary btn--sm" data-tmgo="' + t.tab + '" data-tmfn="' + (t.fn||'') + '">🚀 前往该模块</button></div>';
  } else if(t.st === 'planned'){
    h += '<div class="tmd__act"><button class="btn btn--primary btn--sm" data-tmgo="' + t.tab + '">🚀 前往已有部分</button>' +
         '<span class="tmd__tip">该工具已有部分实现，完整版待补</span></div>';
  } else {
    h += '<div class="tmd__note">📋 未做成工具——这是<b>方法论速查</b>卡片。' +
         '本工具箱的原则是：<b>能算的做成工具，算不了的诚实写清楚</b>，' +
         '不做点了没反应的空壳。</div>';
  }
  box.innerHTML = h;
  box.className = 'tmd is-on';
  var go = box.querySelector('[data-tmgo]');
  if(go) go.onclick = function(){
    var fn = go.getAttribute('data-tmfn');
    if(fn){
      /* 切到工具箱并选中对应工具 */
      switchTab(go.getAttribute('data-tmgo'));
      var chip = document.querySelector('[data-tktool="' + fn + '"]');
      if(chip) chip.click();
    } else {
      switchTab(go.getAttribute('data-tmgo'));
    }
  };
  if(box.scrollIntoView){ try{ box.scrollIntoView({behavior:'smooth', block:'nearest'}); }catch(e){} }
}

function tmFilter(kind, val){
  var M = tmState();
  if(kind === 'cat') M.cat = val;
  if(kind === 'st') M.st = val;
  save(); renderToolMap(); tmSyncUI();
}
function tmSyncUI(){
  var M = tmState();
  [].forEach.call(document.querySelectorAll('[data-tmcat]'), function(b){
    b.classList.toggle('is-on', b.getAttribute('data-tmcat') === M.cat);
  });
  [].forEach.call(document.querySelectorAll('[data-tmst]'), function(b){
    b.classList.toggle('is-on', b.getAttribute('data-tmst') === M.st);
  });
}
