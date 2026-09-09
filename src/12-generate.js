/* ================= 生成逻辑 ================= */
function genRole(){
  var r = {role:$('#r_role').value, task:$('#r_task').value, bg:$('#r_bg').value,
           req:$('#r_req').value, ex:$('#r_ex').value};
  state.role = r;
  if(!r.role && !r.task){ toast('至少填写角色设定或核心任务'); return; }
  var out = '你是一位' + (r.role || '资深营销专家') + '。\n\n';
  out += '## 任务\n' + (r.task || '（请补充任务）') + '\n\n';
  if(r.bg)  out += '## 背景信息\n' + r.bg + '\n\n';
  if(r.req) out += '## 具体要求\n' + r.req + '\n\n';
  if(r.ex)  out += '## 参考示例\n' + r.ex + '\n\n';
  var ctx = brandCtx();
  if(ctx.length) out += '## 全局约束\n' + ctx.map(function(c){ return '- ' + c; }).join('\n') + '\n\n';
  out += '## 输出要求\n先给结论，再给论证。如果信息不足，明确指出缺什么，不要编造。';
  var txt = wrapWithBrand(out, '提示词 · ' + (state.curPreset || '营销角色'));
  setPreview(txt); pushHistory('营销角色 · ' + (state.curPreset || '自定义'), txt); save();
}

function genContent(){
  var c = {
    title:$('#c_title').value, kw:$('#c_kw').value, platform:$('#c_platform').value,
    len:$('#c_len').value, style:$('#c_style').value, aud:$('#c_aud').value,
    ref:$('#c_ref').value, extra:$('#c_extra').value
  };
  state.content = c;
  if(!c.title){ toast('请先填写内容题目'); return; }
  var out = '你是一位深耕「' + c.platform + '」的内容操盘手。\n\n';
  out += '## 任务\n围绕主题《' + c.title + '》创作一篇' + c.len + '左右的' + c.style + '内容。\n\n';
  out += '## 硬性要求\n';
  out += '- 平台：' + c.platform + '（严格遵守该平台的调性、排版习惯与禁忌）\n';
  out += '- 篇幅：' + c.len + '\n';
  out += '- 风格：' + c.style + '\n';
  if(c.aud)  out += '- 目标人群：' + c.aud + '\n';
  if(c.kw)   out += '- 必须自然融入关键词：' + c.kw + '\n';
  if(c.extra) out += '- 额外要求：' + c.extra + '\n';
  out += '\n## 结构建议\n';
  out += '1. 开头 3 秒内给出强钩子（痛点 / 反常识 / 利益点）\n';
  out += '2. 中段给出可信证据或具体场景，不要空讲概念\n';
  out += '3. 结尾给出明确的行动号召或互动引导\n\n';
  if(c.ref){
    out += '## 参考素材\n' + c.ref.split('\n').filter(Boolean).map(function(l){ return '- ' + l; }).join('\n') + '\n\n';
  }
  out += '## 输出格式\n直接输出成品正文（含标题），并额外给出 5 个备选标题。';
  var txt = wrapWithBrand(out, '内容工厂 · ' + c.title);
  setPreview(txt); pushHistory('内容工厂 · ' + c.title, txt); save();
}

function genStrat(){
  var s = {name:$('#s_name').value, bg:$('#s_bg').value, extra:$('#s_extra').value};
  state.strat = s;
  var k = state.curStrat;
  var out = '你是一位资深营销策略顾问。\n\n';
  out += '## 任务\n使用「' + k + '」框架，为以下项目产出一份可直接交付的策略文档。\n\n';
  out += '## 项目信息\n';
  out += '- 项目名称：' + (s.name || '（未填写）') + '\n';
  out += '- 背景/痛点：' + (s.bg || '（未填写）') + '\n';
  if(s.extra) out += '- 额外备注：' + s.extra + '\n';
  out += '\n## 输出结构\n' + stratOutline(k) + '\n';
  out += '\n## 要求\n每条判断都要有依据或数据支撑，避免正确的废话。信息不足时明确标注「需补充」。';
  var txt = wrapWithBrand(out, k + ' · ' + (s.name || '未命名'));
  setPreview(txt); pushHistory('策略 · ' + k, txt); save();
}

function stratOutline(k){
  var m = {
    'SWOT分析':'1. 优势 Strengths\n2. 劣势 Weaknesses\n3. 机会 Opportunities\n4. 威胁 Threats\n5. SO/ST/WO/WT 交叉策略\n6. 优先级建议',
    'STP定位':'1. 市场细分 Segmentation（维度与子市场）\n2. 目标市场 Targeting（评估与选择）\n3. 差异化定位 Positioning（定位陈述）\n4. 定位验证与风险',
    '用户画像':'输出 3 个 Persona，每个包含：\n- 基本信息与典型场景\n- 核心目标\n- 关键痛点\n- 决策路径与影响因素\n- 触达渠道\n- 主要抗拒点',
    '竞品对比':'1. 竞品识别与分层（核心/次要/替代）\n2. 对比维度矩阵\n3. 各竞品打法拆解\n4. 市场空白点识别\n5. 我方切入建议',
    'GTM上市':'1. 上市目标与成功标准\n2. 目标人群与核心信息\n3. 渠道组合与节奏\n4. 预算分配建议\n5. 关键里程碑与责任人\n6. 风险预案',
    '信息屋':'1. 核心主张（一句话）\n2. 三大支撑点\n3. 每个支撑点对应的用户利益\n4. 信任状（证据）\n5. 不同触点的表达变体',
    '营销日历':'1. 全年关键节点清单\n2. 每个节点的主题与主打产品\n3. 渠道与内容形式\n4. 筹备倒排期\n5. 预算节奏',
    '4P策略':'1. Product 产品策略\n2. Price 价格策略\n3. Place 渠道策略\n4. Promotion 推广策略\n5. 四者协同性检查',
    'PRD':'1. 背景与目标\n2. 范围与不做的事\n3. 用户故事\n4. 功能详述\n5. 数据需求\n6. 验收标准',
    '项目复盘':'1. 目标回顾（原本要什么）\n2. 结果评估（实际达成）\n3. 差异分析（为什么）\n4. 经验沉淀（下次怎么做）'
  };
  return m[k] || '按该框架的标准结构展开。';
}

function genPersona(){
  var p = {type:$('#p_type').value, flavor:$('#p_flavor').value, abv:$('#p_abv').value, occ:$('#p_occ').value};
  state.persona = p;
  var t = p.type.split(' · ')[0];
  var name = p.type.split(' · ')[1] || '';
  var out = '你是一位品牌调性顾问。\n\n';
  out += '## 任务\n为一个具有「' + p.type + '」人格特质的品牌，输出完整的 Tone of Voice 调性指南。\n\n';
  out += '## 品牌场合\n' + (p.occ || '（未填写）') + '\n\n';
  out += '## 输出结构\n';
  out += '1. 人格速写：这个品牌"像什么样的人"（3-5 个特质词）\n';
  out += '2. 语气三要素：句式偏好 / 词汇偏好 / 情绪浓度\n';
  out += '3. 该说 vs 不该说（各 5 条对照）\n';
  out += '4. 分触点表达示例：社媒 / 官网 / 客服 / 广告 / 危机声明\n';
  out += '5. 一句品牌 Slogan 与三条核心文案\n';
  out += '6. 彩蛋：基于「' + p.flavor + ' · ' + p.abv + '」为这个人格调一杯专属特调，给出配方、步骤与命名寓意\n\n';
  out += '## 要求\n调性要能直接写进品牌手册，具体到可执行的程度，不要停留在形容词。';
  var txt = wrapWithBrand(out, '品牌人格 · ' + t + ' ' + name);
  setPreview(txt); pushHistory('品牌人格 · ' + t, txt); save();
}

function genFlow(){
  state.flow.goal = $('#f_goal').value;
  state.flow.bg = $('#f_bg').value;
  var out = '## 项目目标\n' + (state.flow.goal || '（未填写）') + '\n\n';
  out += '## 全局背景\n' + (state.flow.bg || '（未填写）') + '\n\n';
  out += '## 执行链路\n\n';
  state.flow.steps.forEach(function(s, i){
    if(!s.t.trim()) return;
    out += '### 步骤 ' + (i+1) + ' ｜ 工具：' + TOOLS[s.tool] + '\n';
    out += s.t.trim() + '\n\n';
    out += '> 产出物：（请填写本步交付什么）\n\n';
  });
  var ctx = brandCtx();
  if(ctx.length) out += '## 全局约束\n' + ctx.map(function(c){ return '- ' + c; }).join('\n') + '\n\n';
  out += '## 执行说明\n按顺序执行，每步完成后确认产出物再进入下一步。任一步失败时，说明原因并给出替代方案。';
  var txt = wrapWithBrand(out, '工作流 · ' + (state.flow.goal || '未命名'));
  setPreview(txt); pushHistory('工作流 · ' + (state.flow.goal || '未命名'), txt); save();
}

/* 读取用户在知识库「违禁词库」中自定义的词，支持 ## 红线词 / ## 风险词 / ## 平台敏感词 分节 */
function userWords(){
  var res = {red:[], yellow:[], blue:[]};
  var lv = 'red';
  var folder = null;
  for(var i=0;i<state.kb.folders.length;i++){
    if(state.kb.folders[i].name.indexOf('违禁词') > -1){ folder = state.kb.folders[i]; break; }
  }
  if(!folder) return res;
  folder.docs.forEach(function(doc){
    (doc.body || '').split('\n').forEach(function(line){
      line = line.trim();
      if(line.indexOf('## ') === 0){
        var h = line.replace(/^#+\s*/,'');
        if(h.indexOf('红线') > -1) lv = 'red';
        else if(h.indexOf('风险') > -1) lv = 'yellow';
        else if(h.indexOf('平台') > -1) lv = 'blue';
        return;
      }
      if(!line || line.indexOf('#') === 0) return;
      var w = line.replace(/^[-*·\d.\s]+/,'').split(/[，,（(]/)[0].trim();
      if(w && w.length < 20) res[lv].push({t:w, lv:lv, why:'用户自定义', fix:'—', law:'自定义词库'});
    });
  });
  return res;
}
