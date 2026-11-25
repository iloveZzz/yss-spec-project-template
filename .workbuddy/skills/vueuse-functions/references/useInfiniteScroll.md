---
category: Sensors
---

# useInfiniteScroll

Infinite scrolling of the element.

## Usage

```vue
<script setup lang="ts">
import { useInfiniteScroll } from '@vueuse/core'
import { ref, useTemplateRef } from 'vue'

const el = useTemplateRef('el')
const data = ref([1, 2, 3, 4, 5, 6])
const maxItems = 30

function loadMore() {
  const start = data.value.length + 1
  const count = Math.min(5, maxItems - data.value.length)
  data.value.push(...Array.from({ length: count }, (_, index) => start + index))
}

const { reset } = useInfiniteScroll(
  el,
  loadMore,
  {
    distance: 10,
    canLoadMore: () => data.value.length < maxItems,
  }
)

function resetList() {
  data.value = []
  reset()
}
</script>

<template>
  <div ref="el" style="max-height: 12rem; overflow-y: auto">
    <div v-for="item in data" :key="item">
      {{ item }}
    </div>
  </div>
  <button @click="resetList()">
    Reset
  </button>
</template>
```

## Direction

Different scroll directions require different CSS style settings:

| Direction          | Required CSS                                          |
| ------------------ | ----------------------------------------------------- |
| `bottom` (default) | No special settings required                          |
| `top`              | `display: flex;`<br>`flex-direction: column-reverse;` |
| `left`             | `display: flex;`<br>`flex-direction: row-reverse;`    |
| `right`            | `display: flex;`                                      |

::: warning
`onLoadMore` can run on mount and after each load when the content does not fill the scroll container, even before the user scrolls. Use `canLoadMore` to stop when pagination is exhausted or requires manual recovery.
:::

## Directive Usage

```vue
<script setup lang="ts">
import { vInfiniteScroll } from '@vueuse/components'
import { ref } from 'vue'

const data = ref([1, 2, 3, 4, 5, 6])
const maxItems = 30

function onLoadMore() {
  const start = data.value.length + 1
  const count = Math.min(5, maxItems - data.value.length)
  data.value.push(...Array.from({ length: count }, (_, index) => start + index))
}
function canLoadMore() {
  return data.value.length < maxItems
}
</script>

<template>
  <div v-infinite-scroll="[onLoadMore, { distance: 10, canLoadMore }]" style="max-height: 12rem; overflow-y: auto">
    <div v-for="item in data" :key="item">
      {{ item }}
    </div>
  </div>
</template>
```

## Type Declarations

```ts
type InfiniteScrollElement =
  HTMLElement | SVGElement | Window | Document | null | undefined
export interface UseInfiniteScrollOptions<
  T extends InfiniteScrollElement = InfiniteScrollElement,
> extends UseScrollOptions {
  /**
   * The minimum distance between the bottom of the element and the bottom of the viewport
   *
   * @default 0
   */
  distance?: number
  /**
   * The direction in which to listen the scroll.
   *
   * @default 'bottom'
   */
  direction?: "top" | "bottom" | "left" | "right"
  /**
   * The interval time between two load more (to avoid too many invokes).
   *
   * @default 100
   */
  interval?: number
  /**
   * A function that determines whether more content can be loaded for a specific element.
   * Should return `true` if loading more content is allowed for the given element,
   * and `false` otherwise.
   */
  canLoadMore?: (el: T) => boolean
}
export interface UseInfiniteScrollReturn {
  isLoading: ComputedRef<boolean>
  reset: () => void
}
/**
 * Reactive infinite scroll.
 *
 * @see https://vueuse.org/useInfiniteScroll
 */
export declare function useInfiniteScroll<T extends InfiniteScrollElement>(
  element: MaybeRefOrGetter<T>,
  onLoadMore: (state: UnwrapNestedRefs<UseScrollReturn>) => Awaitable<void>,
  options?: UseInfiniteScrollOptions<T>,
): UseInfiniteScrollReturn
```
