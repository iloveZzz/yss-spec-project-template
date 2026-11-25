---
category: Network
---

# useFetch

Reactive [Fetch API](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API) provides the ability to abort requests, intercept requests before
they are fired, automatically refetch requests when the url changes, and create your own `useFetch` with predefined options.

<CourseLink href="https://vueschool.io/lessons/vueuse-utilities-usefetch-and-reactify?friend=vueuse">Learn useFetch with this FREE video lesson from Vue School!</CourseLink>

::: tip
When using with Nuxt 3, this function will **NOT** be auto imported in favor of Nuxt's built-in [`useFetch()`](https://v3.nuxtjs.org/api/composables/use-fetch). Use explicit import if you want to use the function from VueUse.
:::

## Usage

### Basic Usage

The `useFetch` function can be used by simply providing a url. The url can be either a string or a `ref`. The `data` object will contain the result of the request, the `error` object will contain any errors, and the `isFetching` object will indicate if the request is loading.

```ts
import { useFetch } from '@vueuse/core'

const { isFetching, error, data } = useFetch(url)
```

### Asynchronous Usage

`useFetch` can also be awaited just like a normal fetch. Note that whenever a component is asynchronous, whatever component that uses
it must wrap the component in a `<Suspense>` tag. You can read more about the suspense api in the [Official Vue 3 Docs](https://vuejs.org/guide/built-ins/suspense.html)

```ts
import { useFetch } from '@vueuse/core'
// ---cut---
const { isFetching, error, data } = await useFetch(url)
```

### Refetching on URL change

Use a reactive URL and enable `refetch` to trigger another request when the URL changes. Automatic refetching is off by default.

```ts
import { useFetch } from '@vueuse/core'
import { ref } from 'vue'
// ---cut---
const url = ref('https://my-api.com/user/1')

const { data } = useFetch(url, { refetch: true })

url.value = 'https://my-api.com/user/2' // Will trigger another request
```

### Prevent request from firing immediately

Set `immediate: false` to skip the initial request. Call `execute()` to run it manually.

```ts
import { useFetch } from '@vueuse/core'
// ---cut---
const { execute } = useFetch(url, { immediate: false })

execute()
```

### Aborting a request

A request can be aborted by using the `abort` function from the `useFetch` function. The `canAbort` property indicates if the request can be aborted.

```ts
import { useFetch } from '@vueuse/core'
// ---cut---
const { abort, canAbort } = useFetch(url)

setTimeout(() => {
  if (canAbort.value)
    abort()
}, 100)
```

A request can also be aborted automatically by using `timeout` property. It will call `abort` function when the given timeout is reached.

```ts
import { useFetch } from '@vueuse/core'
// ---cut---
const { data } = useFetch(url, { timeout: 100 })
```

### Intercepting a request

The `beforeFetch` option can intercept a request before it is sent and modify the request options and URL. Handle failures inside an asynchronous `beforeFetch` hook and call `cancel()` when the request cannot proceed. In VueUse 15.0.0, a rejected `beforeFetch` runs outside the fetch error and loading cleanup path. In the token examples, `getMyToken` is provided by the application's auth layer and resolves to no token when the request must be canceled.

```ts
import { useFetch } from '@vueuse/core'
// ---cut---
const { data } = useFetch(url, {
  async beforeFetch({ options, cancel }) {
    const myToken = await getMyToken()

    if (!myToken) {
      cancel()
      return
    }

    const headers = new Headers(options.headers)
    headers.set('Authorization', `Bearer ${myToken}`)
    options.headers = headers

    return {
      options,
    }
  },
})
```

The `afterFetch` option can intercept the response data before it is updated.

```ts
import { useFetch } from '@vueuse/core'
// ---cut---
const { data } = useFetch(url, {
  afterFetch(ctx) {
    if (ctx.data?.title === 'HxH')
      ctx.data.title = 'Hunter x Hunter' // Modifies the response data

    return ctx
  },
}).json<{ title: string }>()
```

The `onFetchError` option can change the reported error. Set `updateDataOnError: true` to also update the `data` ref with the data returned from the hook.

```ts
import { useFetch } from '@vueuse/core'
// ---cut---
const { data, execute } = useFetch(url, {
  immediate: false,
  updateDataOnError: true,
  onFetchError(ctx) {
    // No response body could be parsed.
    if (ctx.data === null)
      ctx.data = { title: 'Hunter x Hunter' } // Modifies the response data

    ctx.error = new Error('Custom Error') // Modifies the error
    return ctx
  },
}).json<{ title: string }>()

await execute()
console.log(data.value)
```

### Setting the request method and return type

The request method and return type can be set by adding the appropriate methods to the end of `useFetch`

```ts
import { useFetch } from '@vueuse/core'
// ---cut---
// Request will be sent with GET method and data will be parsed as JSON
const { data: jsonData } = useFetch(url).get().json()

// Request will be sent with POST method and data will be parsed as text
const { data: textData } = useFetch(url).post().text()

// Or set the method using the options

// Request will be sent with GET method and data will be parsed as blob
const { data: blobData } = useFetch(url, { method: 'GET' }, { refetch: true }).blob()
```

### Creating a Custom Instance

The `createFetch` function will return a useFetch function with whatever pre-configured options that are provided to it. This is useful for interacting with API's throughout an application that uses the same base URL or needs Authorization headers.

```ts
import { createFetch } from '@vueuse/core'
// ---cut---
const useMyFetch = createFetch({
  baseUrl: 'https://my-api.com',
  options: {
    async beforeFetch({ options, cancel }) {
      const myToken = await getMyToken()
      if (!myToken) {
        cancel()
        return
      }

      const headers = new Headers(options.headers)
      headers.set('Authorization', `Bearer ${myToken}`)
      options.headers = headers

      return { options }
    },
  },
  fetchOptions: {
    mode: 'cors',
  },
})

const { isFetching, error, data } = useMyFetch('users')
```

Use the `combination` option to choose how instance and per-call hooks are combined. The default, `chain`, runs both. With `overwrite`, the per-call hook replaces the instance hook when provided.

```ts
import { createFetch } from '@vueuse/core'
// ---cut---
const useMyFetch = createFetch({
  baseUrl: 'https://my-api.com',
  combination: 'overwrite',
  options: {
    // beforeFetch in pre-configured instance will only run when the newly spawned instance do not pass beforeFetch
    async beforeFetch({ options, cancel }) {
      const myToken = await getMyToken()
      if (!myToken) {
        cancel()
        return
      }

      const headers = new Headers(options.headers)
      headers.set('Authorization', `Bearer ${myToken}`)
      options.headers = headers

      return { options }
    },
  },
})

// use useMyFetch beforeFetch
const users = useMyFetch('users')

// use custom beforeFetch
const customUsers = useMyFetch('users', {
  async beforeFetch({ options, cancel }) {
    const myToken = await getMyToken()

    if (!myToken) {
      cancel()
      return
    }

    const headers = new Headers(options.headers)
    headers.set('Authorization', `Bearer ${myToken}`)
    options.headers = headers

    return {
      options,
    }
  },
})
```

Both `afterFetch` and `onFetchError` receive an `execute` function that starts another request. HTTP failures such as 401 go to `onFetchError`; `afterFetch` runs only for successful responses. In YSS projects, reuse the application's existing authentication, token renewal and retry logic in its request transport.

### Events

The `onFetchResponse` event fires after a successful response has been parsed and processed by `afterFetch`. The `onFetchError` event fires for failures handled by the fetch error path.

```ts
import { useFetch } from '@vueuse/core'
// ---cut---
const { onFetchResponse, onFetchError } = useFetch(url)

onFetchResponse((response) => {
  console.log(response.status)
})

onFetchError((error) => {
  console.error(error.message)
})
```

## Type Declarations

```ts
export interface UseFetchReturn<T> {
  /**
   * Indicates if the fetch request has finished
   */
  isFinished: Readonly<ShallowRef<boolean>>
  /**
   * The statusCode of the HTTP fetch response
   */
  statusCode: ShallowRef<number | null>
  /**
   * The raw response of the fetch response
   */
  response: ShallowRef<Response | null>
  /**
   * Any fetch errors that may have occurred
   */
  error: ShallowRef<any>
  /**
   * The fetch response body on success, may either be JSON or text
   */
  data: ShallowRef<T | null>
  /**
   * Indicates if the request is currently being fetched.
   */
  isFetching: Readonly<ShallowRef<boolean>>
  /**
   * Indicates if the fetch request is able to be aborted
   */
  canAbort: ComputedRef<boolean>
  /**
   * Indicates if the fetch request was aborted
   */
  aborted: ShallowRef<boolean>
  /**
   * Abort the fetch request
   */
  abort: (reason?: any) => void
  /**
   * Manually call the fetch
   * (default not throwing error)
   */
  execute: (throwOnFailed?: boolean) => Promise<any>
  /**
   * Fires after the fetch request has finished
   */
  onFetchResponse: EventHookOn<Response>
  /**
   * Fires after a fetch request error
   */
  onFetchError: EventHookOn
  /**
   * Fires after a fetch has completed
   */
  onFetchFinally: EventHookOn
  get: () => UseFetchReturn<T> & PromiseLike<UseFetchReturn<T>>
  post: (
    payload?: MaybeRefOrGetter<unknown>,
    type?: string,
  ) => UseFetchReturn<T> & PromiseLike<UseFetchReturn<T>>
  put: (
    payload?: MaybeRefOrGetter<unknown>,
    type?: string,
  ) => UseFetchReturn<T> & PromiseLike<UseFetchReturn<T>>
  delete: (
    payload?: MaybeRefOrGetter<unknown>,
    type?: string,
  ) => UseFetchReturn<T> & PromiseLike<UseFetchReturn<T>>
  patch: (
    payload?: MaybeRefOrGetter<unknown>,
    type?: string,
  ) => UseFetchReturn<T> & PromiseLike<UseFetchReturn<T>>
  head: (
    payload?: MaybeRefOrGetter<unknown>,
    type?: string,
  ) => UseFetchReturn<T> & PromiseLike<UseFetchReturn<T>>
  options: (
    payload?: MaybeRefOrGetter<unknown>,
    type?: string,
  ) => UseFetchReturn<T> & PromiseLike<UseFetchReturn<T>>
  json: <JSON = any>() => UseFetchReturn<JSON> &
    PromiseLike<UseFetchReturn<JSON>>
  text: () => UseFetchReturn<string> & PromiseLike<UseFetchReturn<string>>
  blob: () => UseFetchReturn<Blob> & PromiseLike<UseFetchReturn<Blob>>
  arrayBuffer: () => UseFetchReturn<ArrayBuffer> &
    PromiseLike<UseFetchReturn<ArrayBuffer>>
  formData: () => UseFetchReturn<FormData> &
    PromiseLike<UseFetchReturn<FormData>>
}
type Combination = "overwrite" | "chain"
export interface BeforeFetchContext {
  /**
   * The computed url of the current request
   */
  url: string
  /**
   * The request options of the current request
   */
  options: RequestInit
  /**
   * Cancels the current request
   */
  cancel: Fn
}
export interface AfterFetchContext<T = any> {
  response: Response
  data: T | null
  context: BeforeFetchContext
  execute: (throwOnFailed?: boolean) => Promise<any>
}
export interface OnFetchErrorContext<T = any, E = any> {
  error: E
  data: T | null
  response: Response | null
  context: BeforeFetchContext
  execute: (throwOnFailed?: boolean) => Promise<any>
}
export interface UseFetchOptions {
  /**
   * Fetch function
   */
  fetch?: typeof window.fetch
  /**
   * Will automatically run fetch when `useFetch` is used
   *
   * @default true
   */
  immediate?: boolean
  /**
   * Will automatically refetch when:
   * - the URL is changed if the URL is a ref
   * - the payload is changed if the payload is a ref
   *
   * @default false
   */
  refetch?: MaybeRefOrGetter<boolean>
  /**
   * Initial data before the request finished
   *
   * @default null
   */
  initialData?: any
  /**
   * Timeout for abort request after number of millisecond
   * `0` means use browser default
   *
   * @default 0
   */
  timeout?: number
  /**
   * Allow update the `data` ref when fetch error whenever provided, or mutated in the `onFetchError` callback
   *
   * @default false
   */
  updateDataOnError?: boolean
  /**
   * Will run immediately before the fetch request is dispatched
   */
  beforeFetch?: (
    ctx: BeforeFetchContext,
  ) =>
    | Promise<Partial<BeforeFetchContext> | void>
    | Partial<BeforeFetchContext>
    | void
  /**
   * Will run immediately after the fetch request is returned.
   * Runs after any 2xx response
   */
  afterFetch?: (
    ctx: AfterFetchContext,
  ) => Promise<Partial<AfterFetchContext>> | Partial<AfterFetchContext>
  /**
   * Will run immediately after the fetch request is returned.
   * Runs after any 4xx and 5xx response
   */
  onFetchError?: (
    ctx: OnFetchErrorContext,
  ) => Promise<Partial<OnFetchErrorContext>> | Partial<OnFetchErrorContext>
}
export interface CreateFetchOptions {
  /**
   * The base URL that will be prefixed to all urls unless urls are absolute
   */
  baseUrl?: MaybeRefOrGetter<string>
  /**
   * Determine the inherit behavior for beforeFetch, afterFetch, onFetchError
   * @default 'chain'
   */
  combination?: Combination
  /**
   * Default Options for the useFetch function
   */
  options?: UseFetchOptions
  /**
   * Options for the fetch request
   */
  fetchOptions?: RequestInit
}
export declare function createFetch(
  config?: CreateFetchOptions,
): typeof useFetch
export declare function useFetch<T>(
  url: MaybeRefOrGetter<string>,
): UseFetchReturn<T> & PromiseLike<UseFetchReturn<T>>
export declare function useFetch<T>(
  url: MaybeRefOrGetter<string>,
  useFetchOptions: UseFetchOptions,
): UseFetchReturn<T> & PromiseLike<UseFetchReturn<T>>
export declare function useFetch<T>(
  url: MaybeRefOrGetter<string>,
  options: RequestInit,
  useFetchOptions?: UseFetchOptions,
): UseFetchReturn<T> & PromiseLike<UseFetchReturn<T>>
```
