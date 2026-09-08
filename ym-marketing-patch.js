/* ============================================================
 * Y.Mine · 营销 AI 工作台 —— 定位改版补丁 v1
 *
 * 用法：在你 index.html 的 </body> 前面加这一行即可
 *   <script src="ym-marketing-patch.js"></script>
 * （若不想多一个文件，也可把本文件全部内容粘进一个 <script> 标签里）
 *
 * 特点：
 *   - 不改动原有 HTML / JS，随时删掉本行即可 100% 还原
 *   - 只做「加 Hero、改 Tab 文案、改记忆区标题、加内容包区、隐藏 Python 预设」
 *   - 全程容错：找不到目标节点就跳过，不会报错、不会影响原功能
 * ============================================================ */
(function () {
  'use strict';

  /* ---------- 1. 注入样式 ---------- */
  var css = `
:root{
  --ym-brand:#6366f1; --ym-brand2:#a855f7;
  --ym-bg:#ffffff; --ym-bg-soft:#f7f7fb; --ym-card:#ffffff;
  --ym-text:#16161d; --ym-text-soft:#6b6b7b; --ym-line:#e8e8ef;
}
body.dark,html.dark,[data-theme="dark"],body[data-theme="dark"]{
  --ym-bg:#0e0e14; --ym-bg-soft:#15151f; --ym-card:#171722;
  --ym-text:#ececf3; --ym-text-soft:#9a9aae; --ym-line:#282833;
}
.ym-hero{
  background:
    radial-gradient(1200px 420px at 15% -10%, rgba(99,102,241,.16), transparent 60%),
    radial-gradient(900px 380px at 88% 0%, rgba(168,85,247,.14), transparent 60%),
    var(--ym-bg-soft);
  border-bottom:1px solid var(--ym-line);
  padding:52px 20px 40px; text-align:center;
}
.ym-hero__inner{max-width:860px;margin:0 auto;}
.ym-hero__badge{
  display:inline-flex;align-items:center;gap:6px;font-size:12px;letter-spacing:.4px;
  color:var(--ym-text-soft);border:1px solid var(--ym-line);background:var(--ym-card);
  padding:6px 14px;border-radius:999px;margin-bottom:18px;
}
.ym-hero__badge::before{content:"🌌";}
.ym-hero__title{
  margin:0 0 14px;font-size:clamp(28px,5vw,44px);line-height:1.18;font-weight:800;
  background:linear-gradient(100deg,var(--ym-brand),var(--ym-brand2));
  -webkit-background-clip:text;background-clip:text;color:transparent;
}
.ym-hero__sub{margin:0 auto 20px;max-width:640px;font-size:15px;line-height:1.9;color:var(--ym-text-soft);}
.ym-hero__sub b{color:var(--ym-text);font-weight:600;}
.ym-hero__trust{display:flex;flex-wrap:wrap;justify-content:center;gap:10px;margin-bottom:24px;}
.ym-hero__trust span{
  font-size:12.5px;color:var(--ym-text-soft);background:var(--ym-card);
  border:1px solid var(--ym-line);padding:7px 13px;border-radius:8px;
}
.ym-hero__cta{display:flex;flex-wrap:wrap;justify-content:center;gap:12px;}
.ym-btn{
  display:inline-block;padding:11px 24px;border-radius:10px;font-size:14.5px;font-weight:600;
  text-decoration:none;transition:.18s;border:1px solid transparent;cursor:pointer;
}
.ym-btn--primary{
  background:linear-gradient(100deg,var(--ym-brand),var(--ym-brand2));color:#fff;
  box-shadow:0 6px 20px rgba(99,102,241,.28);
}
.ym-btn--primary:hover{transform:translateY(-1px);box-shadow:0 10px 26px rgba(99,102,241,.36);}
.ym-btn--ghost{background:var(--ym-card);color:var(--ym-text);border-color:var(--ym-line);}
.ym-btn--ghost:hover{border-color:var(--ym-brand);color:var(--ym-brand);}

.ym-tab{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;}
.ym-tab__name{font-size:14px;font-weight:600;line-height:1.3;}
.ym-tab__desc{font-size:11px;opacity:.7;line-height:1.3;font-weight:400;white-space:nowrap;}

.ym-memory{
  background:linear-gradient(160deg,rgba(99,102,241,.08),rgba(168,85,247,.06));
  border:1px solid var(--ym-line);border-radius:12px;padding:12px 14px;margin-bottom:12px;
}
.ym-memory__hd{font-size:13px;font-weight:700;margin-bottom:4px;}
.ym-memory__tip{font-size:11.5px;color:var(--ym-text-soft);line-height:1.65;}

.ym-packs{padding:48px 20px 56px;background:var(--ym-bg);}
.ym-packs__inner{max-width:960px;margin:0 auto;}
.ym-packs__hd{text-align:center;margin-bottom:26px;}
.ym-packs__hd h2{margin:0 0 8px;font-size:23px;font-weight:800;color:var(--ym-text);}
.ym-packs__hd p{margin:0;font-size:14px;color:var(--ym-text-soft);}
.ym-packs__grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:14px;}
.ym-pack{
  border:1px solid var(--ym-line);border-radius:14px;padding:20px;background:var(--ym-card);
  position:relative;transition:.18s;
}
.ym-pack:hover{transform:translateY(-3px);border-color:var(--ym-brand);}
.ym-pack__tag{
  position:absolute;top:-9px;right:14px;font-size:11px;font-weight:700;color:#fff;
  background:linear-gradient(100deg,var(--ym-brand),var(--ym-brand2));padding:3px 10px;border-radius:999px;
}
.ym-pack__ico{font-size:26px;margin-bottom:8px;}
.ym-pack__name{font-size:15px;font-weight:700;margin-bottom:6px;color:var(--ym-text);}
.ym-pack__desc{font-size:12.5px;color:var(--ym-text-soft);line-height:1.75;margin-bottom:12px;}
.ym-pack__price{font-size:20px;font-weight:800;color:var(--ym-brand);}
.ym-pack__price small{font-size:12px;font-weight:500;color:var(--ym-text-soft);margin-left:4px;}
.ym-packs__note{text-align:center;margin-top:20px;font-size:12.5px;color:var(--ym-text-soft);}
`;
  var st = document.createElement('style');
  st.textContent = css;
  document.head.appendChild(st);

  /* ---------- 工具函数 ---------- */
  function el(tag, cls, html) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  }

  // 从 "🧠 提示词" 里取出开头的 emoji 图标
  function pickIcon(text) {
    var m = String(text || '').trim().match(/^[^\s\u4e00-\u9fa5a-zA-Z0-9]+/u);
    return m ? m[0] : '';
  }

  /* ---------- 2. 顶部 Hero ---------- */
  function mountHero() {
    if (document.querySelector('.ym-hero')) return;
    var hero = el('header', 'ym-hero');
    hero.innerHTML = `
      <div class="ym-hero__inner">
        <div class="ym-hero__badge">Y.Mine 应用矩阵 · 营销专用</div>
        <h1 class="ym-hero__title">营销人的 AI 工作台</h1>
        <p class="ym-hero__sub">
          策略 · 文案 · 竞品 · 投放 —— <b>40+ 营销模板与可编排工作流</b><br>
          全部在你自己的浏览器里跑完，不登录、不上传、不联网
        </p>
        <div class="ym-hero__trust">
          <span>🔒 数据不出浏览器</span>
          <span>⚡ 打开即用 · 零配置</span>
          <span>🎁 核心功能永久免费</span>
          <span>🧩 配置可导入导出</span>
        </div>
        <div class="ym-hero__cta">
          <a class="ym-btn ym-btn--primary" href="#ym-studio">免费开始使用</a>
          <a class="ym-btn ym-btn--ghost" href="#ym-packs">查看付费内容包 →</a>
        </div>
      </div>`;
    // 插到 body 最前面
    document.body.insertBefore(hero, document.body.firstChild);
    // 给原主内容区一个锚点，让「免费开始使用」能跳过去
    var anchor = el('div', '', '');
    anchor.id = 'ym-studio';
    anchor.style.cssText = 'height:0;overflow:hidden;';
    var tabsHost = document.querySelector('.ym-tabs') || document.body.children[1];
    if (tabsHost && tabsHost.parentNode) tabsHost.parentNode.insertBefore(anchor, tabsHost);
  }

  /* ---------- 3. 改 6 个 Tab 的文案（保留 emoji + 原事件） ---------- */
  var TAB_MAP = [
    { key: '提示词',   name: '营销角色',  desc: '12 位专家 · 一键生成' },
    { key: '长文写作', name: '内容工厂',  desc: '多平台 · 批量出稿' },
    { key: '策略',     name: '策略模板',  desc: 'STP · 竞品 · GTM' },
    { key: 'MBTI',     name: '品牌人格',  desc: '调性指南 · 彩蛋玩法' },
    { key: '工作流',   name: '营销工作流', desc: '6 步编排 · 自动跑通' },
    { key: '知识库',   name: '品牌知识库', desc: '卖点 · 竞品 · 违禁词' }
  ];

  function retab() {
    var nodes = document.querySelectorAll('button, [role="tab"], a');
    var used = {};
    for (var i = 0; i < nodes.length; i++) {
      var n = nodes[i];
      if (!n.textContent) continue;
      if (n.querySelector('.ym-tab__name')) continue; // 已处理过
      var txt = n.textContent.trim();
      if (txt.length > 14) continue;                   // 只处理短标签
      for (var j = 0; j < TAB_MAP.length; j++) {
        var t = TAB_MAP[j];
        if (used[t.key]) continue;
        if (txt.indexOf(t.key) === -1) continue;
        used[t.key] = true;
        var icon = pickIcon(txt) || '▪️';
        n.innerHTML =
          '<span class="ym-tab__name">' + icon + ' ' + t.name + '</span>' +
          '<span class="ym-tab__desc">' + t.desc + '</span>';
        n.classList.add('ym-tab');
        break;
      }
    }
  }

  /* ---------- 4. 左侧「全局记忆」→「品牌记忆」 ---------- */
  function rebrandMemory() {
    if (document.querySelector('.ym-memory')) return;
    var all = document.querySelectorAll('*');
    for (var i = 0; i < all.length; i++) {
      var n = all[i];
      if (n.children.length > 3) continue;
      if (!n.textContent) continue;
      if (n.textContent.indexOf('全局记忆设置') === -1) continue;
      // 改标题
      if (n.children.length === 0) {
        n.textContent = n.textContent.replace('全局记忆设置（默认角色 / 风格偏好）', '品牌记忆（核心资产）')
                                     .replace('全局记忆设置', '品牌记忆（核心资产）');
        n.classList.add('ym-memory__hd');
      }
      // 在该标题前插入引导卡
      var card = el('div', 'ym-memory');
      card.innerHTML =
        '<div class="ym-memory__hd">🎯 品牌记忆（核心资产）</div>' +
        '<div class="ym-memory__tip">填写一次，之后所有生成都会自动带上你的品牌语境。<br>' +
        '建议填写：品牌名 / 品类 / 目标人群 / 核心卖点 / 品牌语气 / 禁用词</div>';
      var host = n.parentNode;
      if (host) host.insertBefore(card, n);
      // 把原来的标题文字块收进卡片里，避免重复
      n.style.display = 'none';
      return;
    }
  }

  /* ---------- 5. 隐藏「🐍Python」预设（垂直定位的信号污染） ---------- */
  function hidePythonPreset() {
    var nodes = document.querySelectorAll('button, a, span, div');
    for (var i = 0; i < nodes.length; i++) {
      var n = nodes[i];
      if (n.children.length > 0) continue;
      var txt = (n.textContent || '').trim();
      if (txt.indexOf('Python') !== -1 && txt.length < 14) {
        n.style.display = 'none';
        return;
      }
    }
  }

  /* ---------- 6. 底部内容包区 ---------- */
  function mountPacks() {
    if (document.querySelector('.ym-packs')) return;
    var sec = el('section', 'ym-packs');
    sec.id = 'ym-packs';
    sec.innerHTML = `
      <div class="ym-packs__inner">
        <div class="ym-packs__hd">
          <h2>内容包 · 让模板变成可交付的产出</h2>
          <p>引擎永久免费。内容包提供完整工作流、种子素材库与实战案例。</p>
        </div>
        <div class="ym-packs__grid">
          <div class="ym-pack">
            <div class="ym-pack__tag">最受欢迎</div>
            <div class="ym-pack__ico">📕</div>
            <div class="ym-pack__name">小红书增长包</div>
            <div class="ym-pack__desc">选题挖掘 → 标题公式 → 正文生成 → 违禁词体检 → 发布排期，含 500+ 爆款标题库</div>
            <div class="ym-pack__price">¥99<small>买断 · 永久更新</small></div>
          </div>
          <div class="ym-pack">
            <div class="ym-pack__tag">专业向</div>
            <div class="ym-pack__ico">⚔️</div>
            <div class="ym-pack__name">竞品情报包</div>
            <div class="ym-pack__desc">竞品识别 → 监测维度 → 对比矩阵 → 周报自动化，含 6 大行业竞品维度表</div>
            <div class="ym-pack__price">¥129<small>买断 · 永久更新</small></div>
          </div>
          <div class="ym-pack">
            <div class="ym-pack__tag">投放向</div>
            <div class="ym-pack__ico">📈</div>
            <div class="ym-pack__name">投放复盘包</div>
            <div class="ym-pack__desc">数据清洗 → 漏斗诊断 → 素材归因 → 预算重分配建议</div>
            <div class="ym-pack__price">¥129<small>买断 · 永久更新</small></div>
          </div>
          <div class="ym-pack">
            <div class="ym-pack__tag">超值</div>
            <div class="ym-pack__ico">💎</div>
            <div class="ym-pack__name">年度通行证</div>
            <div class="ym-pack__desc">全部内容包 + 一年持续更新 + 专属答疑社群</div>
            <div class="ym-pack__price">¥399<small>/ 年</small></div>
          </div>
        </div>
        <div class="ym-packs__note">
          💡 所有配置与知识库均支持 JSON 导入导出 · 数据始终保存在你本地浏览器
        </div>
      </div>`;
    // 插到「Y.Mine 应用矩阵」之前，找不到就放最后
    var all = document.querySelectorAll('*');
    var target = null;
    for (var i = 0; i < all.length; i++) {
      var n = all[i];
      if (n.children.length < 4 && n.textContent &&
          n.textContent.indexOf('Y.Mine 应用矩阵') !== -1) { target = n; break; }
    }
    if (target && target.parentNode) {
      target.parentNode.insertBefore(sec, target);
    } else {
      document.body.appendChild(sec);
    }
  }

  /* ---------- 执行 + 防丢失（切 Tab 若被重渲染，自动补回来） ---------- */
  function apply() {
    try { mountHero(); } catch (e) {}
    try { retab(); } catch (e) {}
    try { rebrandMemory(); } catch (e) {}
    try { hidePythonPreset(); } catch (e) {}
    try { mountPacks(); } catch (e) {}
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', apply);
  } else {
    apply();
  }
  // 保底：DOM 变动后 300ms 补一次（自带去重，不会重复插入、不会死循环）
  var timer = null;
  var mo = new MutationObserver(function () {
    if (timer) return;
    timer = setTimeout(function () { timer = null; apply(); }, 300);
  });
  mo.observe(document.body, { childList: true, subtree: true });

  console.log('%c[Y.Mine] 营销定位补丁已加载','color:#6366f1;font-weight:bold');
})();
