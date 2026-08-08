---
title: useFullscreen
description: 管理 DOM 全屏的 Hook
toc: content
---

# useFullscreen

管理 DOM 全屏的 Hook，支持真实全屏和页面全屏两种模式。

## 代码演示

### 基础用法

使用 `ref` 设置需要全屏的元素。

<code src="./demos/useFullscreen/demo1-basic.vue"></code>

### 图片全屏

使用函数形式传入目标元素，实现图片全屏效果。

<code src="./demos/useFullscreen/demo2-image.vue"></code>

### 页面全屏

使用 `pageFullscreen` 配置启用页面全屏模式（伪全屏），通过 CSS fixed 定位实现，不使用浏览器全屏 API。

<code src="./demos/useFullscreen/demo3-page.vue"></code>

### 与其他全屏操作共存

元素的全屏情况可能被其他脚本修改，useFullscreen 能正确追踪外部全屏状态变化。

<code src="./demos/useFullscreen/demo4-coexist.vue"></code>

## API

```typescript
const {
  isFullscreen,
  enterFullscreen,
  exitFullscreen,
  toggleFullscreen,
  isEnabled,
} = useFullscreen(target, options?);
```

### Params

| 参数    | 说明             | 类型                                                                 | 默认值 |
| ------- | ---------------- | -------------------------------------------------------------------- | ------ |
| target  | 目标元素         | `HTMLElement` \| `Ref<HTMLElement>` \| `() => HTMLElement \| null` | -      |
| options | 配置选项         | `UseFullscreenOptions`                                               | -      |

### UseFullscreenOptions

| 参数           | 说明                                                                   | 类型                                                   | 默认值  |
| -------------- | ---------------------------------------------------------------------- | ------------------------------------------------------ | ------- |
| onEnter        | 进入全屏时的回调                                                       | `() => void`                                           | -       |
| onExit         | 退出全屏时的回调                                                       | `() => void`                                           | -       |
| pageFullscreen | 是否使用页面全屏模式。当参数类型为对象时，可以设置全屏元素的类名和 `z-index` | `boolean` \| `{ className?: string, zIndex?: number }` | `false` |
| escTip         | Esc 键退出提示配置。`true` 显示默认提示，`string` 自定义文案，`false` 不显示 | `boolean` \| `string`                                  | `true`  |

### UseFullscreenReturn

| 参数             | 说明                 | 类型                  |
| ---------------- | -------------------- | --------------------- |
| isFullscreen     | 是否处于全屏状态     | `Readonly<Ref<boolean>>` |
| enterFullscreen  | 进入全屏             | `() => void`          |
| exitFullscreen   | 退出全屏             | `() => void`          |
| toggleFullscreen | 切换全屏状态         | `() => void`          |
| isEnabled        | 浏览器是否支持全屏   | `boolean`             |

## 注意事项

1. **浏览器兼容性**：Fullscreen API 在某些旧版浏览器中可能不支持，可以通过 `isEnabled` 属性检查支持状态。

2. **用户手势要求**：浏览器要求全屏操作必须由用户手势触发（如点击事件），不能在页面加载时自动全屏。

3. **页面全屏 vs 真实全屏**：
   - **真实全屏**：使用浏览器 Fullscreen API，会隐藏浏览器界面，用户可以按 `ESC` 键退出
   - **页面全屏**：通过 CSS 实现，只是让元素覆盖整个视口，不会隐藏浏览器界面

4. **样式隔离**：页面全屏模式会动态创建 `<style>` 标签，默认类名为 `yss-page-fullscreen`，可以通过配置自定义。

5. **Esc 键提示**：进入全屏时会自动显示"若要退出全屏模式，请按 esc"提示，3 秒后自动隐藏。可以通过 `escTip` 配置自定义提示文案或禁用提示。

## 类型定义

```typescript
export interface PageFullscreenOptions {
  /** 全屏元素的类名 */
  className?: string;
  /** 全屏元素的 z-index */
  zIndex?: number;
}

export interface UseFullscreenOptions {
  /** 退出全屏时的回调 */
  onExit?: () => void;
  /** 进入全屏时的回调 */
  onEnter?: () => void;
  /** 是否使用页面全屏模式（伪全屏），或传入配置对象 */
  pageFullscreen?: boolean | PageFullscreenOptions;
  /** 
   * Esc 键退出提示配置
   * - true: 显示默认提示"若要退出全屏模式，请按 esc"
   * - string: 自定义提示文案
   * - false: 不显示提示
   * @default true
   */
  escTip?: boolean | string;
}

export type Target = HTMLElement | Ref<HTMLElement | undefined> | (() => HTMLElement | null);

export interface UseFullscreenReturn {
  /** 是否处于全屏状态 */
  isFullscreen: Readonly<Ref<boolean>>;
  /** 进入全屏 */
  enterFullscreen: () => void;
  /** 退出全屏 */
  exitFullscreen: () => void;
  /** 切换全屏状态 */
  toggleFullscreen: () => void;
  /** 浏览器是否支持全屏 */
  isEnabled: boolean;
}
```
