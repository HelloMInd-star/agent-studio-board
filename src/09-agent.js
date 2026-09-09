/* ============================================================
 * Agent 导出引擎 —— 把编排结果变成可导入的 Agent 定义
 * 三种格式：标准 JSON / Coze workflow / Dify DSL
 * 本地确定性函数以 tool 形式注册，供 Agent 调用
 * ============================================================ */

/* 收集当前工作流的规范化结构 */
function flowModel(){
  var steps = [];
  state.flow.steps.forEach(function(s, i){
    if(!s.t || !s.t.trim()) return;
    steps.push({
      idx: i,
      no: steps.length + 1,
      instruction: s.t.trim(),
      tool: s.tool,
      toolName: TOOLS[s.tool] || '手动',
      inVar: s.inVar || '',
      outVar: s.outVar || '',
      fail: s.fail || 'retry',
      gate: s.gate || 0,
      local: isLocalTool(s.tool) ? LOCAL_TOOLS[s.tool] : null
    });
  });
  return {
    goal: state.flow.goal || ($('#f_goal') ? $('#f_goal').value : '') || '',
    bg: state.flow.bg || ($('#f_bg') ? $('#f_bg').value : '') || '',
    steps: steps,
    brand: brandCtx()
  };
}

/* 供 Agent 调用的确定性工具清单 */
function toolManifest(){
  return [
    {name:'analyze_competitor_matrix', label:'竞品对比矩阵',
     description:'输入竞品在各维度的打分(1-5)与权重，输出加权排名、机会点与威胁点。确定性计算。',
     parameters:{type:'object', properties:{
       dimensions:{type:'array', items:{type:'object', properties:{name:{type:'string'},weight:{type:'number'}},required:['name','weight']}},
       competitors:{type:'array', items:{type:'object', properties:{name:{type:'string'},scores:{type:'array',items:{type:'number'}}},required:['name','scores']}}
     }, required:['dimensions','competitors']}},
    {name:'evaluate_market_segments', label:'STP 市场选择',
     description:'用 GE 矩阵评估细分市场，输出优先级排序与投入建议。确定性计算。',
     parameters:{type:'object', properties:{
       segments:{type:'array', items:{type:'object', properties:{
         name:{type:'string'}, attractiveness:{type:'number'}, competitiveness:{type:'number'}, size:{type:'number'}},required:['name','attractiveness','competitiveness','size']}}
     }, required:['segments']}},
    {name:'plan_marketing_calendar', label:'营销日历倒排',
     description:'根据营销节点自动倒排筹备任务并计算倒计时。确定性计算。',
     parameters:{type:'object', properties:{
       nodes:{type:'array', items:{type:'object', properties:{name:{type:'string'},date:{type:'string'}}},required:['name','date']},
       lead_days:{type:'number'}}, required:['nodes']}},
    {name:'check_content_health', label:'内容体检评分',
     description:'对文案做六维评分（合规/平台适配/钩子/CTA/可读性/品牌一致性），输出总分与改进建议。确定性计算。',
     parameters:{type:'object', properties:{
       text:{type:'string'}, platform:{type:'string', enum:['xhs','dy','wx','tb','bili','zhihu','weibo']}}, required:['text']}},
    {name:'generate_mind_map', label:'思维导图',
     description:'把缩进文本解析为树状结构，生成思维导图 SVG。第一行是中心主题，子项用空格或 Tab 缩进表示层级。确定性计算。',
     parameters:{type:'object', properties:{
       title:{type:'string'}, body:{type:'string'}}, required:['body']}},
    {name:'decide_hotspot_follow', label:'热点跟进决策',
     description:'输入热点描述与五维自评（相关性/时效性/风险度/品牌契合/转化潜力），输出综合分、四档跟进建议（果断跟进/谨慎跟进/不建议投入/不建议跟进）、敏感话题风险预警与跟进角度建议。注意：做决策辅助，不做事实核查。确定性计算。',
     parameters:{type:'object', properties:{
       topic:{type:'string', description:'热点描述'},
       way:{type:'string', description:'计划跟进方式'},
       rel:{type:'number', description:'相关性1-5'},
       time:{type:'number', description:'时效性1-5'},
       risk:{type:'number', description:'风险度1-5，越高越安全'},
       fit:{type:'number', description:'品牌契合1-5'},
       value:{type:'number', description:'转化潜力1-5'}}, required:['topic']},
     returns:{type:'object', properties:{
       total:{type:'number'}, advice:{type:'string'},
       risks:{type:'array'}, angles:{type:'array'}}}},
    {name:'evaluate_regional_markets', label:'区域市场优先级',
     description:'输入各区域的市场体量/吸引力/竞争力，输出优先级排序与 GE 四象限分层建议（重点投入/提升能力/维持收割/放弃）。与 STP 同一套判定规则。确定性计算。',
     parameters:{type:'object', properties:{
       regions:{type:'array', items:{type:'object', properties:{
         n:{type:'string'}, size:{type:'number'}, at:{type:'number'},
         cp:{type:'number'}, note:{type:'string'}}, required:['n','size','at','cp']}}},
       required:['regions']}},
    {name:'calculate_pricing_strategy', label:'定价策略',
     description:'输入成本/目标毛利率/竞品价格带/感知价值等，输出五种定价法（成本加成/竞品锚定/价值定价/渗透/撇脂）的建议价格、毛利率、盈亏平衡销量，以及促销折扣的保本销量倍数。确定性计算。',
     parameters:{type:'object', properties:{
       cost:{type:'number', description:'单位变动成本'},
       gm:{type:'number', description:'目标毛利率百分比，默认55'},
       fixed:{type:'number', description:'固定成本总额'},
       qty:{type:'number', description:'预估销量'},
       rivalLo:{type:'number', description:'竞品价格下限'},
       rivalHi:{type:'number', description:'竞品价格上限'},
       value:{type:'number', description:'用户感知价值，可空'},
       capRate:{type:'number', description:'价值捕获率百分比，默认60'},
       position:{type:'string', enum:['high','mid','low'], description:'品牌定位'},
       base:{type:'number', description:'促销原价'},
       varCost:{type:'number', description:'促销期单位变动成本'},
       discount:{type:'number', description:'计划折扣，80表示8折'}}, required:['cost','rivalLo','rivalHi']}},
    {name:'synthesize_marketing_plan', label:'方案合成',
     description:'跨模块采集数据（品牌记忆/STP/竞品/内容体检/营销日历/知识库/工作流/工作台），聚合成一份整合营销方案，并输出缺口诊断与下一步建议。确定性聚合，不调用模型。',
     parameters:{type:'object', properties:{
       sections:{type:'array', items:{type:'string',
         enum:['summary','brand','market','compete','content','schedule','asset','gap']},
         description:'要包含的章节，不传则全部包含'}}, required:[]}}
  ];
}

/* ---------- 1. 标准 Agent JSON ---------- */
function exportStd(){
  var m = flowModel();
  if(!m.steps.length){ toast('请先填写工作流步骤'); return null; }
  var tools = toolManifest();
  var usedTools = {};
  m.steps.forEach(function(s){ if(s.local) usedTools[s.local.name] = 1; });

  var obj = {
    schema_version: '1.0',
    name: m.goal || '未命名工作流',
    description: m.bg || '',
    type: 'workflow',
    variables: m.steps.filter(function(s){ return s.outVar; })
      .map(function(s){ return {name:s.outVar, produced_by:'step_' + s.no, type:'string'}; }),
    tools: tools,
    steps: m.steps.map(function(s){
      var o = {
        id: 'step_' + s.no,
        instruction: s.instruction,
        inputs: (s.inVar ? s.inVar.split(',').map(function(x){ return x.trim(); }) : []),
        output_var: s.outVar || null,
        on_error: s.fail,
        quality_gate: s.gate ? {min_score: s.gate, action:'retry'} : null,
        executor: s.local ? {type:'function', name:s.local.name} : {type:'llm', model:s.toolName}
      };
      return o;
    }),
    global_context: m.brand,
    runtime: {deterministic_tools: Object.keys(usedTools)}
  };
  return {name:'agent-' + Date.now() + '.json', text: JSON.stringify(obj, null, 2)};
}

/* ---------- 2. Coze 工作流 ---------- */
function exportCoze(){
  var m = flowModel();
  if(!m.steps.length){ toast('请先填写工作流步骤'); return null; }
  var nodes = [], edges = [];
  var startId = '900001';
  nodes.push({
    id: startId, type:'1', position:{x:0, y:0},
    data:{outputs:[{name:'goal', type:'string', value:{type:'literal', content:m.goal}}], nodeMeta:{description:'开始'}}
  });
  var prev = startId;
  m.steps.forEach(function(s, i){
    var id = String(100001 + i*1000);
    var inputs = [];
    if(s.inVar){
      s.inVar.split(',').forEach(function(v){
        var nm = v.replace(/[{}]/g,'').trim();
        if(nm) inputs.push({name:nm, type:'string'});
      });
    }
    var isLocal = !!s.local;
    nodes.push({
      id: id,
      type: isLocal ? '4' : '3',
      position:{x: 260 + i*300, y: 0},
      data:{
        inputs: inputs,
        outputs: s.outVar ? [{name:s.outVar, type:'string'}] : [],
        nodeMeta:{ description: s.local ? ('本地确定性函数：' + s.local.name) : s.instruction.slice(0,60) },
        ...(isLocal ? {
          apiParam:[{name:s.local.name, input:inputs, output:s.outVar?[{name:s.outVar,type:'string'}]:[]}]
        } : {
          modelMeta:{ model:s.toolName },
          prompt: s.instruction
        })
      }
    });
    edges.push({source:prev, target:id});
    prev = id;
  });
  var endId = '900002';
  nodes.push({id:endId, type:'2', position:{x: 260 + m.steps.length*300, y:0},
    data:{outputs:[], nodeMeta:{description:'结束'}}});
  edges.push({source:prev, target:endId});

  var obj = {
    type:'coze_workflow', version:'1.0',
    workflow:{
      name: m.goal || '未命名工作流',
      description: m.bg || '',
      nodes: nodes, edges: edges
    },
    tools: toolManifest()
  };
  return {name:'coze-workflow-' + Date.now() + '.json', text: JSON.stringify(obj, null, 2)};
}

/* ---------- 3. Dify DSL ---------- */
function exportDify(){
  var m = flowModel();
  if(!m.steps.length){ toast('请先填写工作流步骤'); return null; }
  var graph = {nodes:[], edges:[]};
  var startId = 'start_' + Date.now();
  graph.nodes.push({
    id: startId, type:'start', position:{x:0,y:0},
    data:{title:'开始', variables:[{variable:'goal', label:'目标', type:'text-input', required:false, default:m.goal}]}
  });
  var prev = startId;
  m.steps.forEach(function(s, i){
    var id = 'node_' + (i+1) + '_' + Date.now();
    var isLocal = !!s.local;
    graph.nodes.push({
      id: id,
      type: isLocal ? 'tool' : 'llm',
      position:{x: 300 + i*320, y: 0},
      data:{
        title: '步骤 ' + s.no + ' · ' + (isLocal ? s.local.label : s.toolName),
        desc: s.instruction.slice(0, 60),
        ...(isLocal ? {
          tool_name: s.local.name,
          tool_parameters: {},
          tool_label: s.local.label
        } : {
          model:{provider:'custom', name:s.toolName, mode:'chat'},
          prompt_template:[{role:'system', text:s.instruction}],
          vision:{enabled:false}
        }),
        ...(s.gate ? {quality_gate:{min_score:s.gate}} : {}),
        ...(s.fail === 'abort' ? {error_strategy:'fail-branch'} : s.fail === 'skip' ? {error_strategy:'continue-on-error'} : {error_strategy:'retry', max_retries:2})
      }
    });
    graph.edges.push({id:'e'+i, source:prev, target:id, sourceHandle:'source', targetHandle:'target'});
    prev = id;
  });
  graph.nodes.push({id:'end_'+Date.now(), type:'end', position:{x:300+m.steps.length*320,y:0}, data:{title:'结束', outputs:[]}});
  graph.edges.push({id:'e_end', source:prev, target:'end_'+Date.now()});

  var obj = {
    version:'0.1.5', kind:'app', app:{mode:'workflow', name:m.goal||'未命名工作流', description:m.bg||''},
    workflow:{ graph: graph, features:{}, environment_variables:[], conversation_variables:[] },
    tools: toolManifest()
  };
  return {name:'dify-dsl-' + Date.now() + '.yml.json', text: JSON.stringify(obj, null, 2)};
}

function downloadFile(name, text, mime){
  try{
    if(typeof URL === 'undefined' || !URL.createObjectURL) return false;
    var blob = new Blob([text], {type: mime || 'application/json;charset=utf-8'});
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name; a.click();
    setTimeout(function(){ URL.revokeObjectURL(a.href); }, 1000);
    return true;
  }catch(e){ return false; }
}
