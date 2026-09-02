---
name: component-testing
description: 为 yss-ui 组件库的 Vue3 组件与 Hooks 新增、修复或评审 Vitest/Vue Test Utils 测试；当需要复现组件缺陷、补回归测试、验证公开实例、v-model、事件、浏览器 API、定时器或卸载清理时使用。
---

# YSS UI 组件测试

## 触发条件

- 为 `packages/components` 或 `packages/hooks` 新增、修复或评审单元测试、组件测试。
- 需要先复现组件运行时缺陷，再锁定修复行为。
- 需要验证 Props、Emits、Slots、Expose、受控状态、浏览器 API 或资源清理。

## 不适用场景

- 只修改业务微应用页面测试，不涉及 YSS UI 组件库。
- 只做 Dumi 浏览器验收或页面截图对比：使用对应的文档/原型验收流程。
- 只修改组件实现且不需要补测试：使用 `../component-development/SKILL.md`。

## 硬约束（禁止/必须）

- 修改测试前必须读取真实组件实现、公共类型、已有相邻测试和对应文档；不得根据文档标题猜测运行时行为。
- 公开组件交互测试使用 `@vue/test-utils`；需要 DOM 的文件命名为 `*.component.test.ts`，由仓库自动切换到 `happy-dom`，纯函数与纯 Hook 测试保持 Node 环境。
- 缺陷修复必须先建立可观察的失败条件，再验证最小修复；断言面向用户可见行为、事件载荷、公开实例或清理结果，不断言无意义的内部变量。
- 测试公开 API 时优先挂载公开入口组件；仅验证独立 renderer、helper 或适配器时才直接测试内部模块。
- 仅关心父组件契约时使用 `shallowMount` 或精确 stub；需要验证子组件协作、Teleport、焦点或真实事件传播时使用 `mount`，不得为了安静日志而屏蔽待测行为。
- 每个测试创建的 wrapper、DOM 容器、fake timer、全局 mock、ResizeObserver、MutationObserver 和事件监听必须在 `afterEach` 中恢复或卸载，避免顺序依赖。
- 异步交互必须等待对应 Promise、`nextTick` 或 fake timer；禁止使用固定 sleep 和依赖机器速度的断言。
- 不使用大面积快照替代行为断言；第三方组件仅验证 YSS 自有适配边界，不复制上游测试套件。
- 公共行为变化必须同步组件文档与目标版本 changelog；测试修复不得偷偷扩大生产代码改动范围。

## 标准代码骨架

```typescript
import { afterEach, describe, expect, it } from 'vitest';
import { mount, type VueWrapper } from '@vue/test-utils';
import YExample from '../index.vue';

/** 当前测试创建的组件包装器。 */
const wrappers: VueWrapper[] = [];

/** 挂载组件并登记清理。 */
const mountExample = (): VueWrapper => {
  const wrapper = mount(YExample, { props: { modelValue: 'initial' } });
  wrappers.push(wrapper);
  return wrapper;
};

afterEach(() => {
  wrappers.splice(0).forEach(wrapper => wrapper.unmount());
});

describe('YExample 公开契约', () => {
  it('交互后派发受控值更新', async () => {
    const wrapper = mountExample();
    await wrapper.get('[data-testid="trigger"]').trigger('click');
    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual(["next"]);
  });
});
```

验证顺序：

```bash
pnpm test -- --run <target-test-file>
pnpm type-check
pnpm test:unit
```

## 交付检查清单

- [ ] 测试名称描述了真实行为和触发条件，不依赖实现细节。
- [ ] 关键 Props、事件载荷、受控更新或 Expose 返回值有明确断言。
- [ ] wrapper、DOM、定时器、observer、mock 和监听器已清理。
- [ ] 异步断言没有固定 sleep、未处理 Promise 或竞态。
- [ ] 定向测试、全量单测和类型检查结果已记录。
- [ ] 公共行为变化已同步文档和 changelog。

## 失败兜底策略

- 第三方组件导致挂载噪声或环境缺失时，先判断测试目标；只测 YSS 父组件契约时精确 stub，确需真实协作时补最小浏览器 API mock。
- 缺陷无法稳定复现时，优先抽取纯状态转换或建立事件级断言，不用延长 sleep 掩盖竞态。
- 全量测试被无关历史问题阻断时，保留已通过的定向结果并明确列出阻断文件；不得删除或放宽有效断言换取绿灯。
