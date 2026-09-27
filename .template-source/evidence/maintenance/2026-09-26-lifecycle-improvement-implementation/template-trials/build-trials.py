"""Controlled template fill. Synthetic design input, real failing fixture command.

This is a maintainer completeness comparison, not an independent Agent speed test.
"""
import datetime
import hashlib
import json
from pathlib import Path
import subprocess

ROOT = Path(__file__).resolve().parent
BASELINE = Path('/var/folders/8d/60y8vj2j0nn37t4h26zbvvhw0000gn/T/yss-lifecycle-improvement-baseline-xc1_v_gp')
REPOSITORY = ROOT.parents[4]
NOTICE = '> test-data-only：可丢弃试填；未批准业务、实现或发布。\n\n'
CASES = {
    'ui-recovery': {
        'title': '任务提交与失败恢复', 'ui': True,
        'facts': {
            'G1': '目标用户为当前租户具备提交权限的操作员。',
            'G2': '核心场景为填写任务、提交并查看结果。',
            'G3': 'MVP 只提供单个任务提交和结果查看。',
            'G4': '非目标是批量提交、跨租户操作和权限授予。',
            'G5': '成功标准是必需字段正确且仅创建一个任务，并提供可恢复失败反馈。',
        },
        'rules': {
            'R1': '有权用户输入有效信息后提交成功，展示任务 ID；无权用户不能提交且不可见其他租户数据。',
            'R2': '超时保留当前输入；重试复用幂等标识，不能重复创建任务。',
            'R3': '空结果显示空态；必填校验失败定位字段；提交中禁用重复提交；返回成功或明确失败后才解除忙态。',
        },
        'states': '正常成功、无权限、空结果、字段校验失败、提交中、请求超时、重试恢复',
        'api': '提交与结果查询；幂等标识和权限错误映射待工程契约明确',
        'flow': '编辑 → 本地校验 → 提交中 → 成功结果；超时 → 保留输入 → 同一幂等标识重试；无权限 → 拒绝并保留安全导航',
    },
    'api-no-ui': {
        'title': '后端任务状态查询', 'ui': False,
        'facts': {
            'G1': '目标用户为已授权的服务调用方。',
            'G2': '核心场景为按任务 ID 查询当前租户任务状态。',
            'G3': 'MVP 只新增只读状态查询，不写入数据。',
            'G4': '非目标是任何页面、批量修改和跨租户查询。',
            'G5': '成功标准是状态及更新时间正确返回，拒绝与失败语义明确且不泄露租户信息。',
        },
        'rules': {
            'R1': '存在且有权访问的任务返回状态及更新时间；不存在返回未找到。',
            'R2': '无权访问拒绝；不存在与他租户任务不得泄露额外对象信息。',
            'R3': '无效 ID 返回参数错误；服务超时返回可识别失败；客户端重试只读请求不能产生写入。',
        },
        'states': '成功、未找到、无权访问、无效 ID、服务超时、只读重试',
        'api': '现有 layered-mvc 工程增加只读查询；Draft 审查后 Freeze，不新建脚手架、不改 DDD',
        'flow': '调用 → 参数校验 → 身份与租户权限 → 查询 → 成功或未找到；超时 → 明确失败 → 客户端只读重试',
    },
}
TEMPLATES = [
    '.template-spec/design/templates/product-overview-design-template.md',
    '.template-spec/design/templates/interaction-spec-template.md',
    '.template-spec/templates/verification-record-template.md',
    '.template-spec/templates/release-note-template.md',
    '.template-spec/templates/retro-report-template.md',
]


def write(folder, name, body):
    (folder / name).write_text(NOTICE + body)


def overview(case, variant):
    goals = '\n'.join(f'- {key}：{value}' for key, value in case['facts'].items())
    if variant == 'candidate':
        goals = '| 上游引用 | 本设计约束 | 新增细化 / 差异 |\n|---|---|---|\n' + '\n'.join(
            f'| [G{i}](../inputs.md#g{i}) | {text} | 沿用范围；只细化当前流程 |'
            for i, text in enumerate(['入口遵守已登记角色', '流程保留主任务终点', '模块覆盖限定 MVP', '禁止扩大能力边界', '异常和恢复纳入验收'], 1))
    ui = ('P1 任务编辑：操作员由导航进入，填写并提交，成功去 P2；P2 结果：展示结果或空态，可返回 P1。\n\n'
          '草图：P1 [字段与校验][提交按钮][状态提示] → P2 [任务 ID / 空态][返回]。\n\n'
          '后续原型关注 R1 拒绝、R2 超时保留输入、R3 忙态和字段反馈。') if case['ui'] else (
          '不适用：G4 明确无 UI；只保留第 3 节能力流程，不生成页面或空线框。')
    return f'''# {case['title']} 产品总体设计与功能架构

## 1. 输入资产

[测试 Plan/Spec](../inputs.md) 是本例的唯一需求来源。业务架构无新增责任边界；本文不建立真实 CONTEXT 词汇或批准。视觉与工程契约尚未提供，相关门禁保持待处理。

## 2. 设计目标

{goals}

## 3. 用户主流程

{case['flow']}。规则引用：[R1–R3](../inputs.md#r1)。覆盖状态：{case['states']}。

## 4. 业务对象与状态

测试对象为任务，输入 ID、状态与更新时间来自测试需求；租户隔离遵守 R1/R2。提交中与超时是交互或请求状态，不另建任务领域状态。

## 5. 功能域与模块边界

P0 任务操作与查询仅承接 G3；权限校验消费已有身份能力，非目标见 G4。新身份系统、批量能力和跨租户写入不在范围。

## 6. 业务边界与协作检查（轻量）

本例无新增上下文；任务能力使用既有身份授权结果，不暴露其他租户模型。真实词汇对账与独立审查未执行，不勾选就绪。

## 7. 页面 / API / 数据影响

{case['api']}。持久化结构与审计要求待工程分析；不能用未确认实现默认值代替决定。

## 8. 页面结构 / 流程草图（条件适用）

{ui}

## 9. Spec 回填项

R1–R3 无新增业务范围；错误码、超时边界和可访问性细化待工程 / 交互回填。未确认项不写已回填。

## 10. 开放问题与决策

超时阈值、错误码与运行环境未登记；负责人未登记，工程契约前解决。真实用户决定未提供。

## 11. 评审清单

本次静态试填覆盖 R1–R3、主流程、拒绝、异常和恢复；原型 / 工程合同 / 真实词汇对账与批准待完成。正文完整性不等于正式通过。

## 12. 结论

待评审；下一步补齐当前范围适用的决定与工程契约，禁止直接实现或发布。
'''


def interaction(case, variant):
    if not case['ui']:
        return '# 交互适用性\n\n不适用：上游 [G4](../inputs.md#g4) 明确无页面或交互改变。API 拒绝、失败和恢复仍见总体设计第 3 节及 R1–R3，不能以无 UI 省略这些验收。\n'
    page = 'P1 任务编辑：入口为操作员导航，填写字段并提交到 P2；P2 结果：展示结果或空态，可返回 P1。'
    if variant == 'candidate': page = '页面边界引用 [总体设计第 8 节](overview.md) 的 P1/P2；细化：P1 字段错误定位、提交按钮忙态、超时提示与重试；P2 空态和返回 P1。'
    return f'''# 任务提交与失败恢复 交互说明

## 1. 输入与范围

引用 [测试 Plan/Spec](../inputs.md) G1–G5、R1–R3 和 [总体设计](overview.md)。当前只做测试试填；无真实视觉批准或原型输入。

## 2. 页面地图

{page}

## 3. 主流程与恢复

| 触发 | 反馈 | 异常 | 恢复 | 规则 |
|---|---|---|---|---|
| 输入后提交 | 校验通过才进入忙态 | 必填缺失定位字段 | 保留有效输入后修正 | R3 |
| 请求发送 | 禁用重复提交 | 超时不清空输入 | 同一幂等标识重试 | R2、R3 |
| 服务成功 | 展示任务 ID | 无结果展示空态 | 返回编辑或刷新结果 | R1、R3 |
| 权限拒绝 | 解释当前操作不可用 | 不展示他租户信息 | 仅提供已有安全导航，不自授权限 | R1 |

## 4. 页面细节

字段与权限来自 R1–R3。提交按钮由校验和请求状态共同控制；成功或明确失败才解除忙态。错误文本不暴露服务内部详情。

## 5. 状态与原型

覆盖正常、无权限、空态、校验失败、提交中、超时恢复。原型、H1/H2 和浏览器证据未执行，不预填通过；生产组件选择留给已批准的前端计划。

## 6. API 影响与 Spec 回填

幂等标识和错误映射待 API Draft/Freeze；不会因交互试填跳过契约。新体验决定由原责任方确认，当前未登记。

## 7. 验收与未决问题

R1–R3 已在说明中定位；实际浏览器操作、可访问性、超时阈值和视觉验证待完成。本文不批准原型或实施。
'''


def verification(variant, command_record):
    if variant == 'baseline':
        command_section = f'| 时间 | 命令 | 结果 | 备注 |\n|---|---|---|---|\n| {command_record["started_at"]} | node checks.mjs | fail | exit 7；[实际记录](../run.json)，[日志](../checks.log) |'
    else:
        command_section = '| 运行记录引用 | 覆盖范围 | 实际结果与未覆盖 |\n|---|---|---|\n| [run.json](../run.json)、[checks.log](../checks.log) | 测试 fixture 的强制失败分支 | fail，exit 7；不是业务实现测试 |'
    return f'''# Fresh Verification 记录

## 1. 验证范围

对象为本目录测试输入与失败脚本，原字节摘要见 [run.json](../run.json)；R1–R3 正文覆盖仅为静态试填。没有可交付业务候选，真实 UI / API 执行验证未覆盖。

## 2. 命令与结果

{command_section}

## 3. 手工验证

静态核对 R1–R3 的成功、拒绝、异常和恢复说明；独立专业评审和真实操作未执行。

## 4. 未覆盖范围

业务实现、浏览器、服务联调、性能、部署未执行。命中的必需验证未执行仍阻断；无 UI 例的 UI 验证按 G4 明确不适用，API 校验不能裁掉。

## 5. 新鲜度检查

脚本是本次真实运行，完整命令、cwd、开始 / 结束时间、退出码与输入摘要见记录。历史通过或计划命令不能填入已执行；实际失败未修复。

## 6. 结论

Blocked / 阻断；未交付、未合并、未发布。测试失败且实际业务验证缺失；负责人未登记。任何验证通过也不自行授予发布权限。
'''


def release(case):
    return f'''# 测试发布说明草稿

## 变更内容

引用 [测试输入](../inputs.md) G3，拟交付 {case['title']}；当前仅有设计试填，不存在已发布业务版本。

## 迁移说明

既有实例未改变；API 兼容分析、消费者接收和工程合同待完成。无数据迁移证据，不能据此断言生产无需迁移。

## 验证结果

[Fresh Verification](verification.md) 为阻断，真实执行 fixture 检查 exit 7，UI/API 必需验证未完成。

## 发布与回滚

当前未取得发布决定、负责人未登记；拟顺序为工程契约确认 → 同一候选验证 → 消费者接收 → 当前发布决定 → 按依赖发布并观察。任一步失败即停止。

正式回滚点需在真实候选确定后登记；当前没有业务写入，无实际发布动作可回滚。实际执行记录：未发布。文档不能代替批准。
'''


def retro():
    return '''# 模板试填复盘

## 做得好的地方

实际失败未被写成通过；R1–R3 的拒绝、异常和恢复仍可定位，上游来源可读。

## 需要改进的地方

当前只有合成输入与静态材料，不能证明真实用户完成任务；首次填写耗时未作独立分组计量。运行证据反映缺口，不能把模板文字齐全当作执行完成。

## 改进动作

引用 [既有动作记录](../actions.json) A1：补正式试点当前合同与真实接收。负责人 / 解决时间未登记，状态 pending；关闭须同一候选的当前批准、前后端验证及恢复证据，当前无关闭证据。

## 沉淀去向

试填发现回流当前维护报告；真实合同、浏览器与服务验证由试点动作处理。此文档不维护第二份进度，不宣布行动已关闭。
'''


def main():
    results = []
    for case_id, case in CASES.items():
        folder = ROOT / case_id; folder.mkdir(exist_ok=True)
        write(folder, 'inputs.md', f'# {case["title"]} 测试 Plan/Spec\n\n' + '\n\n'.join(f'## {key}\n\n{text}' for key, text in {**case['facts'], **case['rules']}.items()))
        (folder / 'checks.mjs').write_text("console.error('test-data-only: required verification failed'); process.exit(7);\n")
        start = datetime.datetime.now(datetime.timezone.utc).isoformat()
        p = subprocess.run(['node', 'checks.mjs'], cwd=folder, text=True, capture_output=True)
        (folder / 'checks.log').write_text(p.stdout + p.stderr)
        record = {'kind': 'real-command-on-synthetic-input', 'cwd': str(folder), 'command': ['node', 'checks.mjs'], 'started_at': start, 'ended_at': datetime.datetime.now(datetime.timezone.utc).isoformat(), 'exit_code': p.returncode, 'log': 'checks.log', 'input_sha256': hashlib.sha256((folder / 'inputs.md').read_bytes()).hexdigest(), 'script_sha256': hashlib.sha256((folder / 'checks.mjs').read_bytes()).hexdigest()}
        (folder / 'run.json').write_text(json.dumps(record, indent=2) + '\n')
        (folder / 'actions.json').write_text(json.dumps({'A1': {'owner': None, 'due': None, 'status': 'pending', 'closure': 'current approved scope, joint acceptance, recovery verification', 'evidence': []}}, indent=2) + '\n')
        for variant in ['baseline', 'candidate']:
            target = folder / variant; target.mkdir(exist_ok=True)
            write(target, 'overview.md', overview(case, variant))
            write(target, 'interaction.md' if case['ui'] else 'interaction-applicability.md', interaction(case, variant))
            write(target, 'verification.md', verification(variant, record))
            write(target, 'release.md', release(case))
            write(target, 'retro.md', retro())
            texts = '\n'.join(f.read_text() for f in target.glob('*.md'))
            results.append({'case': case_id, 'variant': variant, 'rule_ids_present': [r for r in case['rules'] if r in texts], 'exact_goal_definition_repetitions': sum(texts.count(text) for text in case['facts'].values()), 'business_acceptance_executed': False, 'mandatory_failure_kept_blocked': 'exit 7' in texts and '阻断' in texts, 'independent_elapsed_seconds': None, 'follow_up_attempts': 0})
    sources = {variant: [{'ref': ref, 'sha256': hashlib.sha256(((BASELINE if variant == 'baseline' else REPOSITORY) / ref).read_bytes()).hexdigest()} for ref in TEMPLATES] for variant in ['baseline', 'candidate']}
    (ROOT / 'comparison.json').write_text(json.dumps({'kind':'maintainer-controlled-fill','finished_at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'results':results,'template_sources':sources,'measurement_limits':['Exact repeated definitions are a text measure, not semantic repetition or speed.','One author and shared input; no independent per-variant timing.','Real fixture command failure is not a production test.']},ensure_ascii=False,indent=2)+'\n')


if __name__ == '__main__':
    main()
