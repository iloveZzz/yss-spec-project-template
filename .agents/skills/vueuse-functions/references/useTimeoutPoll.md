---
category: Utilities
---

# useTimeoutPoll

With the default options, polling waits one interval, awaits the callback, then schedules the next timeout. Handle recoverable failures inside the callback to keep polling after a failed request.

In VueUse 15.0.0, `immediateCallback: true` also runs a callback on resume without waiting for it before starting the timer. Leave it `false` for serial polling. Pausing stops future polls while paused; an in-flight request can still finish. If polling resumes before that request settles, guard its result and avoid starting overlapping work.

## Usage

```ts
import { useTimeoutPoll } from '@vueuse/core'
import { ref } from 'vue'

const count = ref(0)

async function fetchData() {
  await new Promise(resolve => setTimeout(resolve, 1000))
  count.value++
}

// Only trigger after last fetch is done
const { isActive, pause, resume } = useTimeoutPoll(fetchData, 1000)
```

## Type Declarations

```ts
export interface UseTimeoutPollOptions {
  /**
   * Start the timer immediately
   *
   * @default true
   */
  immediate?: boolean
  /**
   * Execute the callback immediately after calling `resume`
   *
   * @default false
   */
  immediateCallback?: boolean
}
export declare function useTimeoutPoll(
  fn: () => Awaitable<void>,
  interval: MaybeRefOrGetter<number>,
  options?: UseTimeoutFnOptions,
): Pausable
```
