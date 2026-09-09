
(function(){
'use strict';
var $ = function(s){ return document.querySelector(s); };
var $$ = function(s){ return Array.prototype.slice.call(document.querySelectorAll(s)); };
var KEY = 'ym_studio_v1';

/* ================= 状态 ================= */
var state = {
  theme:'light', memOn:true, defRole:'', defTone:'', curPreset:'', curStrat:'SWOT分析',
  brand:{name:'', cat:'', aud:'', usp:'', ban:''},
  kbUse:true, kbScope:'all', kbMax:'5',
  scores:[],
  stratMode:'prompt',
  trace:{},
  chat:[], blocks:[], chatRef:null,
  net:{on:false, provider:'deepseek', key:'', base:''},
  tool:{type:'comp', comp:{dims:'',rows:''}, stp:{rows:''}, cal:{picked:[],custom:'',lead:'30'}},
  role:{role:'',task:'',bg:'',req:'',ex:''},
  content:{title:'',kw:'',platform:'小红书',len:'800 字',style:'专业干货型',aud:'',ref:'',extra:''},
  strat:{name:'',bg:'',extra:''},
  persona:{type:'INTJ · 建筑师',flavor:'酸甜/果味',abv:'中高度',occ:''},
  flow:{goal:'',bg:'',steps:[]},
  chart:{
    type:'swot',
    swot:{s:'',w:'',o:'',t:'',title:''},
    pos:{x:'',y:'',title:'',pts:''},
    persona:{name:'',age:'',job:'',color:'indigo',goal:'',pain:'',quote:'',ch:''},
    funnel:{title:'',stages:''},
    mind:{
      title:'618 大促营销策略',
      body:'618 大促营销策略\n  目标拆解\n    GMV 目标 500 万\n    新客占比 40%\n    ROI 不低于 2.5\n  渠道组合\n    小红书种草\n      达人 30 位\n      笔记 120 篇\n    抖音投放\n      信息流\n      直播间\n    私域承接\n      社群\n      企微 1v1\n  节奏排期\n    D-30 选题锁定\n    D-14 内容制作\n    D-7 预热蓄水\n    D 日 正式开售\n  风险与预案\n    竞品提前开打\n    素材审核不过\n    库存不足'
    }
  },
  kb:{folders:[
    {name:'品牌资产',docs:[]},{name:'竞品素材',docs:[]},
    {name:'用户原声',docs:[]},
    {name:'违禁词库',docs:[
      {title:'自定义词库（可编辑）',
       body:'# 自定义违禁词库\n\n在这里增删词条，扫描时会自动与内置词库合并。\n' +
            '每行一个词，用 `##` 分节。**改完记得点「💾 保存」**\n\n' +
            '## 红线词\n\n' +
            '- 例：全网最低\n' +
            '- 例：永久有效\n\n' +
            '## 风险词\n\n' +
            '- 例：顶级工艺\n\n' +
            '## 平台敏感词\n\n' +
            '- 例：私聊\n\n' +
            '---\n\n' +
            '提示：\n' +
            '- 🔴 红线词 = 广告法明文禁止，建议直接用\n' +
            '- 🟡 风险词 = 有证据就能用，不必删除\n' +
            '- 🔵 平台敏感词 = 法律未必禁止，但可能限流\n' +
            '- 不确定放哪级？先放「风险词」，宁可提示也不要误报',
       tags:'合规,词库', link:''}
    ]},
    {name:'爆款素材',docs:[]}
  ],curFolder:0,curDoc:-1},
  history:[],
  cal:{y:new Date().getFullYear(), m:new Date().getMonth(), events:[]},
  pricing:{cost:'', gm:'55', fixed:'', qty:'', rlo:'', rhi:'', value:'',
           cap:'60', pos:'mid', base:'', varc:'', disc:'80'}
};
