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
    '17-calendar.js',   # 营销日历（须在 boot 前：boot 结尾闭合 IIFE）
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
    print('    模块数: %d' % len(MODULES))
    print('    源文件: src/')


if __name__ == '__main__':
    main()
