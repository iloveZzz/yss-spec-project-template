---
title: useLoading
description: 管理异步加载状态的 Hook
toc: content
---

# useLoading

管理异步请求的加载状态，支持自动控制和手动控制两种模式。

## 代码演示

### 基础用法

使用 `withLoading` 包装异步函数，自动控制加载状态。

<code src="./demos/useLoading/use-loading-basic.vue"></code>

### 手动控制

使用 `setLoading` 和 `toggleLoading` 手动控制加载状态。

<code src="./demos/useLoading/use-loading-manual.vue"></code>

## API

```typescript
const {
  loading,
  setLoading,
  withLoading,
  toggleLoading,
} = useLoading(initialValue?);
```

### Params

| 参数 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| initialValue | 初始加载状态 | `boolean` | `false` |

### UseLoadingReturn

| 参数 | 说明 | 类型 |
| --- | --- | --- |
| loading | 当前加载状态（响应式） | `Ref<boolean>` |
| setLoading | 设置加载状态 | `(value: boolean) => void` |
| withLoading | 包装异步函数，自动控制加载状态 | `<T>(fn: () => Promise<T>, options?: WithLoadingOptions) => Promise<T \| undefined>` |
| toggleLoading | 切换加载状态 | `() => void` |

### WithLoadingOptions

`withLoading` 方法的配置选项：

| 参数 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| onSuccess | 成功回调函数 | `(result: T) => void` | - |
| onError | 错误回调函数 | `(error: Error) => void` | - |
| onFinally | 完成回调（无论成功/失败都会触发） | `() => void` | - |
| keepLoadingOnError | 发生错误时是否保持 loading 状态 | `boolean` | `false` |
| rethrowError | 是否重新抛出错误（设为 false 可防止白屏） | `boolean` | `false` |

:::info{title=命名说明}
- **onSuccess**：异步函数成功执行后触发，可以获取返回值
- **onError**：异步函数内部抛出错误（接口异常/JS 报错）时触发
- **onFinally**：类似 try-catch-finally 的 finally，无论成功或失败都会触发
- **rethrowError**：默认 `false`，错误会被捕获，通过 `onError` 通知，防止未捕获的 Promise rejection 导致白屏
:::

## 使用场景

- ✅ 按钮点击触发异步请求
- ✅ 表单提交时显示加载状态
- ✅ 数据列表刷新时显示加载动画
- ✅ 多个并发请求的统一加载状态管理

## 类型定义

```typescript
interface WithLoadingOptions<T = any> {
  onSuccess?: (result: T) => void;
  onError?: (error: Error) => void;
  onFinally?: () => void;
  keepLoadingOnError?: boolean;
  rethrowError?: boolean;
}

export function useLoading(initialValue?: boolean): {
  loading: Ref<boolean>;
  setLoading: (value: boolean) => void;
  withLoading: <T>(
    fn: () => Promise<T>,
    options?: WithLoadingOptions<T>
  ) => Promise<T | undefined>;
  toggleLoading: () => void;
}
```
