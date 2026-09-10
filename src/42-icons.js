/* ============================================================
 * 42-icons.js —— 线性图标系统（orbit 风格）
 *
 * 规范（与设计稿一致）：
 *   viewBox 0 0 24 24 · stroke-width 1.5 · fill:none
 *   stroke=currentColor（自动跟随主题与激活色）
 *   linecap/linejoin = round
 *
 * 设计原则：
 *   1. 不引外部图标库（Lucide / Feather 都要额外文件，破坏单文件零依赖）
 *   2. 图标按业务语义重画，不套通用图形：
 *      竞品=BCG四象限、STP=准心圈定人群、日历=跨天色条、工作流=三节点链
 *   3. 降级：脚本缺失或 key 找不到时保留原 emoji，图标位不塌陷
 * ============================================================ */
(function () {
  'use strict';

  function S(inner) {
    return '<svg class="ico" viewBox="0 0 24 24" width="18" height="18" fill="none" ' +
      'stroke="currentColor" stroke-width="1.5" stroke-linecap="round" ' +
      'stroke-linejoin="round" aria-hidden="true" focusable="false">' + inner + '</svg>';
  }

  /* 23 个 Tab 图标（key 与 index.template.html 的 data-tab 严格对应） */
  var ICONS = {
    /* ① 入口 */
    // 开始：指南针
    guide: S('<circle cx="12" cy="12" r="8.5"/><path d="M15.4 8.6l-2.1 5.1-5.1 2.1 2.1-5.1z"/>'),

    /* ② 想清楚 */
    // 热点决策：信号塔（发散弧 + 中心点）
    hotspot: S('<circle cx="12" cy="14.5" r="1.2"/><path d="M12 18.5v2.5"/><path d="M8.4 13.2a5 5 0 017.2 0"/><path d="M5.8 10.4a8.6 8.6 0 0112.4 0"/>'),
    // 调研方案：问卷纸 + 勾选项
    research: S('<path d="M6 3.5h8.2L18 7.3V20a.5.5 0 01-.5.5H6a.5.5 0 01-.5-.5V4a.5.5 0 01.5-.5z"/><path d="M14 3.5v4h4"/><path d="M8.6 12h7"/><path d="M8.6 15.5h4.2"/><path d="M14.6 18.2l1.5 1.5 2.6-2.8"/>'),
    // 战略矩阵：同心环 + 准心（圈定）
    strat: S('<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="3.6"/><path d="M12 3.5v2.6M12 17.9v2.6M3.5 12h2.6M17.9 12h2.6"/>'),
    // 经典工具：工具箱
    tkm: S('<path d="M3.5 8.5h17v10.5a1 1 0 01-1 1h-15a1 1 0 01-1-1z"/><path d="M8.2 8.5V6.2a2 2 0 012-2h3.6a2 2 0 012 2v2.3"/><path d="M3.5 12.6h17"/><path d="M10.2 12.6v3.2M13.8 12.6v3.2"/>'),
    // 工具地图：三折地图
    toolmap: S('<path d="M3.5 6.2l5.6-2 6 2 5.4-2v13.4l-5.4 2-6-2-5.6 2z"/><path d="M9.1 4.2v13.4M15.1 6.2v13.4"/>'),
    // 品牌内核：神庙（文化·价值·商业模型的三层隐喻）
    persona: S('<path d="M3 10.2L12 4l9 6.2"/><path d="M3.6 10.2h16.8"/><path d="M6.8 10.5v8.6M12 10.5v8.6M17.2 10.5v8.6"/><path d="M3.4 19.6h17.2"/>'),

    /* ③ 算出来 */
    // 策略模板：分层 STP（逐层收窄）
    strategy: S('<path d="M4 6.8h16"/><path d="M7 12h10"/><path d="M10 17.2h4"/><path d="M4 6.8l2.6 3M20 6.8l-2.6 3"/><path d="M7 12l2.2 3.4M17 12l-2.2 3.4"/>'),
    // 定价策略：价签
    pricing: S('<path d="M12.6 3.6H19.5a.9.9 0 01.9.9v6.9l-8.3 8.3-7.8-7.8z"/><circle cx="16.4" cy="7.5" r="1.3"/><path d="M8.4 15.6l4.2 4.2"/>'),
    // 市场与竞品：地球（经纬）
    market: S('<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17"/><path d="M12 3.5a13 13 0 010 17"/><path d="M12 3.5a13 13 0 000 17"/>'),
    // 财务测算：上涨折线 + 箭头
    fin: S('<path d="M4.2 17.4l5.2-5.2 3.4 3.4 7-7"/><path d="M15.4 8.6h4.4v4.4"/><path d="M4.2 20.4h15.6"/>'),

    /* ④ 做出来 */
    // 营销角色：头像 + 思维纹
    role: S('<circle cx="12" cy="8.4" r="3.9"/><path d="M4.8 20.2a7.2 7.2 0 0114.4 0"/><path d="M12 5.6v3.4M10.4 7.6h3.2"/>'),
    // 内容工厂：纸 + 斜置铅笔（创作）
    content: S('<path d="M6.5 20.2l2.6-.7L19 9.6l-2.6-2.6L6.5 17z"/><path d="M15.2 5.6l2.6 2.6"/><path d="M5.4 21.6l1.6-2.6"/>'),
    // 商业图卡：柱图
    chart: S('<path d="M4.2 20.2h15.6"/><path d="M7.2 20.2V13M12 20.2V7.8M16.8 20.2v-4.6"/>'),

    /* ⑤ 串起来 */
    // 营销工作流：三节点链（本地 / LLM / 人工）
    flow: S('<circle cx="5.4" cy="6.4" r="2.3"/><circle cx="5.4" cy="17.6" r="2.3"/><circle cx="18.6" cy="12" r="2.3"/><path d="M7.4 7.6l9.1 3.4M7.4 16.4l9.1-3.4"/>'),
    // Agent 工作台：对话气泡
    agent: S('<path d="M4.2 6.4a2 2 0 012-2h11.6a2 2 0 012 2v7.2a2 2 0 01-2 2H9.4L4.4 20z"/><path d="M8.4 10.2h.01M12 10.2h.01M15.6 10.2h.01"/>'),
    // 营销日历：挂环 + 网格 + 跨天条
    cal: S('<path d="M4.4 6.6h15.2v13.2H4.4z"/><path d="M8.2 3.6v4M15.8 3.6v4"/><path d="M4.4 10.4h15.2"/><path d="M7 13.6h8.4"/>'),
    // 方案合成：剪板 + 汇总行
    synth: S('<path d="M8.6 4.2h6.8v3H8.6z"/><path d="M6 6.4h12v13.4H6z"/><path d="M8.8 10.8h6.4M8.8 14.2h6.4M8.8 17.6h4.2"/>'),
    // 内容包：开箱立方体
    packs: S('<path d="M12 3.4l8 4.4v8.4L12 20.6 4 16.2V7.8z"/><path d="M4 7.8l8 4.4 8-4.4"/><path d="M12 12.2v8.4"/>'),

    /* ⑥ 存下来 */
    // 品牌知识库：三本书
    kb: S('<path d="M4 4.6h4.6v15H4z"/><path d="M9.7 4.6h4.6v15H9.7z"/><path d="M15.6 6.2l4.4 1.2v11.6l-4.4-1.2z"/>'),
    // 品牌资产：调色板
    assets: S('<circle cx="12" cy="12" r="8.5"/><circle cx="9.2" cy="9.6" r="1.25"/><circle cx="14.6" cy="10.2" r="1.25"/><circle cx="10.4" cy="15" r="1.25"/>'),
    // 品牌轨迹：时间轴 + 疏密节点
    timeline: S('<path d="M6.8 4.2v15.6"/><circle cx="6.8" cy="8" r="2.1"/><circle cx="6.8" cy="16.2" r="2.1"/><path d="M12.4 7.4h7.6M12.4 15.6h5"/>'),
    // 系统设置：齿轮
    settings: S('<circle cx="12" cy="12" r="3.2"/><path d="M12 3.6v2.8M12 17.6v2.8M4.4 7.6l2.4 1.4M17.2 15l2.4 1.4M4.4 16.4l2.4-1.4M17.2 9l2.4-1.4"/>')
  };

  /* ---------- 状态圆点：替代 🔴🟡⚠️ 等语义 emoji ----------
   * 只在 UI 徽章/状态位使用；报告正文里的 emoji 保留（用户会复制走）。
   * 相比 emoji：渲染一致（不受系统字体影响）、可跟随主题、零体积。 */
  var DOT_KIND = { ok: '--ok', good: '--ok', warn: '--warn', alert: '--alert', stop: '--alert', signal: '--signal', mute: '--mute' };

  function dotTag(kind) {
    var k = DOT_KIND[kind] || '--mute';
    return '<i class="dot dot' + k + '" aria-hidden="true"></i>';
  }

  /* ---------- 应用：把 Tab 名称里的 emoji 换成 SVG ---------- */
  function applyTabIcons() {
    var tabs = document.querySelectorAll('.tab[data-tab]');
    var n = 0;
    for (var i = 0; i < tabs.length; i++) {
      var btn = tabs[i];
      var key = btn.getAttribute('data-tab');
      var nm = btn.querySelector('.tab__name');
      if (!nm || !ICONS[key]) continue;
      if (nm.getAttribute('data-iconed') === '1') continue;
      // 去掉开头的 emoji 与空白，只保留中文/字母数字标签
      var label = nm.textContent.replace(/^[^一-龥A-Za-z0-9]+/, '').trim();
      if (!label) continue;
      nm.setAttribute('data-iconed', '1');
      nm.innerHTML = ICONS[key] + '<span>' + label + '</span>';
      n++;
    }
    return n;
  }

  /* 立即执行一次（脚本位于 body 末尾，DOM 已就绪） */
  var applied = 0;
  try { applied = applyTabIcons(); } catch (e) { /* 失败则保留 emoji */ }

  // 兜底：若因时序问题未生效，DOMContentLoaded 与 load 各再试一次
  if (!applied) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function () {
        try { applyTabIcons(); } catch (e) {}
      });
    }
    window.addEventListener && window.addEventListener('load', function () {
      try { applyTabIcons(); } catch (e) {}
    });
  }

  // 暴露给其它模块与调试
  window.ICONS = ICONS;
  window.iconSvg = function (k) { return ICONS[k] || ''; };
  window.dotTag = dotTag;
  window.iconApplyTabs = applyTabIcons;
})();
