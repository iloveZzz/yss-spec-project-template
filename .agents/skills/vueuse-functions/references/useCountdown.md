---
category: Time
---

# useCountdown

Reactive countdown timer in seconds.

## Usage

```ts
import { useCountdown } from '@vueuse/core'

const countdownSeconds = 5
const { remaining, start, stop, pause, resume } = useCountdown(countdownSeconds, {
  onComplete() {

  },
  onTick() {

  }
})
```

You can use a `ref` to change the initial countdown.
`start(seconds)` sets a new countdown value and starts the timer. `reset(seconds)` sets the remaining seconds without changing whether the timer is running. After `pause()`, call `resume()` with no arguments to continue from the remaining value.

```ts
import { useCountdown } from '@vueuse/core'
import { shallowRef } from 'vue'

const countdown = shallowRef(5)
const { start, pause, reset } = useCountdown(countdown)

// change the countdown value
countdown.value = 10

// start a new countdown with 2 seconds
start(2)

// pause the running timer, then set the remaining seconds to 4
pause()
reset(4)

// start the countdown with the current value of `countdown`
start()
```

## Type Declarations

```ts
export interface UseCountdownOptions extends ConfigurableScheduler {
  /**
   * Callback function called when the countdown reaches 0.
   */
  onComplete?: () => void
  /**
   * Callback function called on each tick of the countdown.
   */
  onTick?: () => void
}
export interface UseCountdownReturn extends Pausable {
  /**
   * Current countdown value.
   */
  remaining: ShallowRef<number>
  /**
   * Resets the countdown and repeatsLeft to their initial values.
   */
  reset: (countdown?: MaybeRefOrGetter<number>) => void
  /**
   * Stops the countdown and resets its state.
   */
  stop: () => void
  /**
   * Reset the countdown and start it again.
   */
  start: (countdown?: MaybeRefOrGetter<number>) => void
}
/**
 * Reactive countdown timer in seconds.
 *
 * @param initialCountdown
 * @param options
 *
 * @see https://vueuse.org/useCountdown
 */
export declare function useCountdown(
  initialCountdown: MaybeRefOrGetter<number>,
  options?: UseCountdownOptions,
): UseCountdownReturn
```
