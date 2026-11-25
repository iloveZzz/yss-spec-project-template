---
category: Browser
related:
  - useDark
  - usePreferredDark
  - useStorage
---

# useColorMode

Reactive color mode (dark / light / customs) with auto data persistence.

## Basic Usage

```ts
import { useColorMode } from '@vueuse/core'

const mode = useColorMode() // Ref<'dark' | 'light'>
```

By default, `auto` follows the browser's color preference using `usePreferredDark`. Reading the ref returns the applied mode (`dark`, `light`, or a custom mode). Read `mode.store.value` to distinguish the saved `auto` choice from the applied mode. Writing to the ref updates the DOM and saves the choice to local storage (or your custom storage) by default. Assign `auto` to follow the browser preference again.

```ts
import { useColorMode } from '@vueuse/core'

const mode = useColorMode()
// ---cut---
mode.value // 'dark' | 'light'

mode.value = 'dark' // change to dark mode and persist

mode.value = 'auto' // change to auto mode
```

## Config

```ts
import { useColorMode } from '@vueuse/core'

const mode = useColorMode({
  attribute: 'theme',
  modes: {
    // custom colors
    dim: 'dim',
    cafe: 'cafe',
  },
}) // Ref<'dark' | 'light' | 'dim' | 'cafe'>
```

## Advanced Usage

You can read the system preference and the stored choice separately.

```ts
import { useColorMode } from '@vueuse/core'
import { computed } from 'vue'

const { system, store } = useColorMode()

system.value // 'dark' | 'light'
store.value // 'dark' | 'light' | 'auto'

const myColorMode = computed(() => store.value === 'auto' ? system.value : store.value)
```

## Component Usage

```vue
<script setup lang="ts">
import { UseColorMode } from '@vueuse/components'
</script>

<template>
  <UseColorMode v-slot="color">
    <button @click="color.mode = color.mode === 'dark' ? 'light' : 'dark'">
      Mode {{ color.mode }}
    </button>
  </UseColorMode>
</template>
```

## Type Declarations

```ts
export type BasicColorMode = "light" | "dark"
export type BasicColorSchema = BasicColorMode | "auto"
export interface UseColorModeOptions<
  T extends string = BasicColorMode,
> extends UseStorageOptions<T | BasicColorMode> {
  /**
   * CSS Selector for the target element applying to
   *
   * @default 'html'
   */
  selector?: string | MaybeElementRef
  /**
   * HTML attribute applying the target element
   *
   * @default 'class'
   */
  attribute?: string
  /**
   * The initial color mode
   *
   * @default 'auto'
   */
  initialValue?: MaybeRefOrGetter<T | BasicColorSchema>
  /**
   * Prefix when adding value to the attribute
   */
  modes?: Partial<Record<T | BasicColorSchema, string>>
  /**
   * A custom handler for handle the updates.
   * When specified, the default behavior will be overridden.
   *
   * @default undefined
   */
  onChanged?: (
    mode: T | BasicColorMode,
    defaultHandler: (mode: T | BasicColorMode) => void,
  ) => void
  /**
   * Custom storage ref
   *
   * When provided, `useStorage` will be skipped
   */
  storageRef?: Ref<T | BasicColorSchema>
  /**
   * Key to persist the data into localStorage/sessionStorage.
   *
   * Pass `null` to disable persistence
   *
   * @default 'vueuse-color-scheme'
   */
  storageKey?: string | null
  /**
   * Storage object, can be localStorage or sessionStorage
   *
   * @default localStorage
   */
  storage?: StorageLike
  /**
   * Emit `auto` mode from state
   *
   * When set to `true`, preferred mode won't be translated into `light` or `dark`.
   * This is useful when the fact that `auto` mode was selected needs to be known.
   *
   * @default undefined
   * @deprecated use `store.value` when `auto` mode needs to be known
   * @see https://vueuse.org/core/useColorMode/#advanced-usage
   */
  emitAuto?: boolean
  /**
   * Disable transition on switch
   *
   * @see https://paco.me/writing/disable-theme-transitions
   * @default true
   */
  disableTransition?: boolean
}
export type UseColorModeReturn<T extends string = BasicColorMode> = Ref<
  T | BasicColorSchema
> & {
  store: Ref<T | BasicColorSchema>
  system: ComputedRef<BasicColorMode>
  state: ComputedRef<T | BasicColorMode>
}
/**
 * Reactive color mode with auto data persistence.
 *
 * @see https://vueuse.org/useColorMode
 * @param options
 */
export declare function useColorMode<T extends string = BasicColorMode>(
  options?: UseColorModeOptions<T>,
): UseColorModeReturn<T>
```
