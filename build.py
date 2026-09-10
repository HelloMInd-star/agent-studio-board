#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Y.Mine Agent Studio —— 构建脚本

把 src/ 下的模块合并成单一 index.html（用于 GitHub Pages 部署）。

用法：
    python3 build.py          # 构建
    python3 build.py --check  # 只校验，不写文件

设计原则：
  - 开发时拆分成多个文件，便于阅读与 code review
  - 发布时合并为单文件，保持「零依赖、双击即开」的产品特性
"""

import os
import re
import sys

ROOT = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(ROOT, 'src')
OUT = os.path.join(ROOT, 'index.html')

# 合并顺序：依赖在前，绑定/启动在后
MODULES = [
    '01-core.js',       # 状态定义
    '02-presets.js',    # 预设数据
    '03-rules.js',      # 违禁词规则库
    '04-store.js',      # 读写与导入导出
    '05-brand.js',      # 品牌记忆 + 知识库引用
    '06-render.js',     # chips / 工作流步骤渲染
    '07-charts.js',     # SVG 图卡引擎
    '08-tools.js',      # 确定性分析工具
    '09-agent.js',      # Agent 导出 + Trace
    '10-workspace.js',  # Agent 工作台
    '11-kb.js',         # 知识库渲染
    '12-generate.js',   # 生成逻辑
    '13-scan.js',       # 内容体检评分
    '14-feedback.js',   # 误报反馈
    '15-bind.js',       # 事件绑定
    '17-calendar.js',   # 营销日历
    '18-synth.js',      # 方案合成（跨模块聚合，须在 boot 前）
    '19-pricing.js',    # 定价策略（5 种定价法 + 折扣测算，须在 boot 前）
    '20-market.js',     # 区域市场 + 竞品档案（须在 boot 前）
    '21-hotspot.js',    # 热点决策（五维打分 + 风险预警，须在 boot 前）
    '22-research.js',   # 调研方案模板库（假设/市场/交叉/定价，须在 boot 前）
    '23-strategy.js',   # 战略矩阵（SWOT/TOWS/BCG，须在 boot 前）
    '24-finance.js',    # 营销财务测算（GMV/LTV/预算/雷达，须在 boot 前）
    '25-guide.js',      # 场景化流程导航 + 对话式入口（须在 boot 前）
    '26-toolkit.js',    # 经典营销工具箱（8个框架，须在 boot 前）
    '28-framesvg.js',   # 框架结构示意图引擎（24 种 SVG 骨架，须在 toolmap 前）
    '29-framecfg.js',   # 70 框架 → 骨架配置表（须在 toolmap 前）
    '27-toolmap.js',      # 70 工具全景地图（须在 boot 前）
    '30-brandcore.js',    # 品牌内核：三层结构 + 品类模板 + 商业模型对齐（须在 boot 前）
    '32-tonecheck.js',    # 品牌调性约束：把品牌内核变成内容体检的评分基准（须在 brandcore 后）
    '33-timeline.js',     # 品牌轨迹：7 类记录统一时间线（须在 calendar/agent 后、boot 前）
    '34-settings.js',     # 系统设置：备份/恢复/主题/品牌基准/默认Tab（须在 boot 前）
    '35-insight.js',      # 洞察与导出：趋势分析 + 日历 iCal/CSV（须在 timeline/calendar 后、boot 前）
    '36-assets.js',       # 品牌资产台账：Logo 版本 / 物料进度 / 色值规范（须在 brandcore 后）
    '37-quarter.js',      # 营销日历季度视图：三个月并排看节奏（须在 calendar 后、boot 前）
    '38-packs.js',        # 内容包：工作流预设产品化，本地函数优先 + 结果可视化（须在 workspace 后）
    '39-packwiz.js',      # 内容包独立窗口：全屏模态 + 启动前对话式采集 + AI 步骤引导（须在 packs 后）
    '16-boot.js',       # 回填 + 启动（最后，含 })();）
]


def read(path):
    with open(path, encoding='utf-8') as f:
        return f.read()


def build():
    missing = [m for m in MODULES if not os.path.exists(os.path.join(SRC, m))]
    if missing:
        print('[x] 缺少模块: ' + ', '.join(missing))
        return None

    # 1. JS：按序拼接，每段加来源标注
    js_parts = []
    for m in MODULES:
        body = read(os.path.join(SRC, m)).rstrip()
        js_parts.append(
            '/* ===== src/%s ===== */\n%s' % (m, body)
        )
    js = '\n\n'.join(js_parts) + '\n'

    # 2. CSS
    css = read(os.path.join(SRC, 'style.css')).rstrip() + '\n'

    # 3. 模板替换
    tpl = read(os.path.join(SRC, 'index.template.html'))
    if '__CSS__' not in tpl or '__JS__' not in tpl:
        print('[x] 模板缺少 __CSS__ / __JS__ 占位符')
        return None

    out = tpl.replace('/*__CSS__*/', css).replace('/*__JS__*/', js)

    # 4. 基本校验
    problems = []
    if out.count('<script') != out.count('</script>'):
        problems.append('script 标签不配对')
    if out.count('<style') != out.count('</style>'):
        problems.append('style 标签不配对')
    for fn in ['function bind(', 'function restoreAll(', 'var state =']:
        if fn not in out:
            problems.append('缺少关键定义: ' + fn)
    if problems:
        print('[x] 校验失败:')
        for p in problems:
            print('    - ' + p)
        return None

    return out


def main():
    out = build()
    if out is None:
        sys.exit(1)

    if '--check' in sys.argv:
        print('[v] 校验通过，未写入文件')
        return

    with open(OUT, 'w', encoding='utf-8', newline='\n') as f:
        f.write(out)

    size = os.path.getsize(OUT)
    print('[v] 构建完成 -> index.html (%d 字节, %d 行)' % (size, out.count('\n') + 1))

    # 使用手册：src/manual.template.html -> manual.html（纯静态，无需合并）
    tpl = os.path.join(SRC, 'manual.template.html')
    if os.path.exists(tpl):
        mt = open(tpl, encoding='utf-8').read()
        mo = os.path.join(ROOT, 'manual.html')
        open(mo, 'w', encoding='utf-8', newline='\n').write(mt)
        print('[v] 使用手册 -> manual.html (%d 字节)' % len(mt.encode('utf-8')))
    else:
        print('[!] 未找到 manual.template.html，跳过手册生成')
    print('    模块数: %d' % len(MODULES))
    print('    源文件: src/')


if __name__ == '__main__':
    main()
