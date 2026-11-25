# VueUse function index

Find a function by category and open its reference for usage examples and type declarations. Check signatures and availability against the installed VueUse version.

The tables come from VueUse skills at commit `004812b4aa0815f5745ac30a6a7dc4927aec7b3d`. This package includes 256 references from that commit alongside the 14 existing references with YSS corrections where applicable. [Upstream source](https://github.com/vueuse/skills/blob/004812b4aa0815f5745ac30a6a7dc4927aec7b3d/skills/vueuse-functions/SKILL.md#functions)

## State

| Function | Description | Invocation |
|----------|-------------|------------|
| [`createGlobalState`](createGlobalState.md) | Keep states in the global scope to be reusable across Vue instances | AUTO |
| [`createInjectionState`](createInjectionState.md) | Create global state that can be injected into components | AUTO |
| [`createSharedComposable`](createSharedComposable.md) | Make a composable function usable with multiple Vue instances | AUTO |
| [`injectLocal`](injectLocal.md) | Extended `inject` with ability to call `provideLocal` to provide the value in the same component | AUTO |
| [`provideLocal`](provideLocal.md) | Extended `provide` with ability to call `injectLocal` to obtain the value in the same component | AUTO |
| [`useAsyncState`](useAsyncState.md) | Reactive async state | AUTO |
| [`useDebouncedRefHistory`](useDebouncedRefHistory.md) | Shorthand for `useRefHistory` with debounced filter | AUTO |
| [`useLastChanged`](useLastChanged.md) | Records the timestamp of the last change | AUTO |
| [`useLocalStorage`](useLocalStorage.md) | Reactive [LocalStorage](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage) | AUTO |
| [`useManualRefHistory`](useManualRefHistory.md) | Manually track the change history of a ref when the user calls `commit()` | AUTO |
| [`useRefHistory`](useRefHistory.md) | Track the change history of a ref | AUTO |
| [`useSessionStorage`](useSessionStorage.md) | Reactive [SessionStorage](https://developer.mozilla.org/en-US/docs/Web/API/Window/sessionStorage) | AUTO |
| [`useStorage`](useStorage.md) | Create a reactive ref that can be used to access & modify [LocalStorage](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage) or [SessionStorage](https://developer.mozilla.org/en-US/docs/Web/API/Window/sessionStorage) | AUTO |
| [`useStorageAsync`](useStorageAsync.md) | Reactive Storage with async support | AUTO |
| [`useThrottledRefHistory`](useThrottledRefHistory.md) | Shorthand for `useRefHistory` with throttled filter | AUTO |

## Elements

| Function | Description | Invocation |
|----------|-------------|------------|
| [`useActiveElement`](useActiveElement.md) | Reactive `document.activeElement` | AUTO |
| [`useDocumentVisibility`](useDocumentVisibility.md) | Reactively track [`document.visibilityState`](https://developer.mozilla.org/en-US/docs/Web/API/Document/visibilityState) | AUTO |
| [`useDraggable`](useDraggable.md) | Make elements draggable | AUTO |
| [`useDropZone`](useDropZone.md) | Create a zone where files can be dropped | AUTO |
| [`useElementBounding`](useElementBounding.md) | Reactive [bounding box](https://developer.mozilla.org/en-US/docs/Web/API/Element/getBoundingClientRect) of an HTML element | AUTO |
| [`useElementOverflow`](useElementOverflow.md) | Reactive element's overflow state | AUTO |
| [`useElementSize`](useElementSize.md) | Reactive size of an HTML element | AUTO |
| [`useElementVisibility`](useElementVisibility.md) | Tracks the visibility of an element within the viewport | AUTO |
| [`useIntersectionObserver`](useIntersectionObserver.md) | Detects changes to a target element's visibility | AUTO |
| [`useMouseInElement`](useMouseInElement.md) | Reactive mouse position related to an element | AUTO |
| [`useMutationObserver`](useMutationObserver.md) | Watch for changes being made to the DOM tree | AUTO |
| [`useParentElement`](useParentElement.md) | Get parent element of the given element | AUTO |
| [`useResizeObserver`](useResizeObserver.md) | Reports changes to the dimensions of an Element's content or the border-box | AUTO |
| [`useWindowFocus`](useWindowFocus.md) | Reactively track window focus with `window.onfocus` and `window.onblur` events | AUTO |
| [`useWindowScroll`](useWindowScroll.md) | Reactive window scroll | AUTO |
| [`useWindowSize`](useWindowSize.md) | Reactive window size | AUTO |

## Browser

| Function | Description | Invocation |
|----------|-------------|------------|
| [`useBluetooth`](useBluetooth.md) | Reactive [Web Bluetooth API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Bluetooth_API) | AUTO |
| [`useBreakpoints`](useBreakpoints.md) | Reactive viewport breakpoints | AUTO |
| [`useBroadcastChannel`](useBroadcastChannel.md) | Reactive [BroadcastChannel API](https://developer.mozilla.org/en-US/docs/Web/API/BroadcastChannel) | AUTO |
| [`useBrowserLocation`](useBrowserLocation.md) | Reactive browser location | AUTO |
| [`useClipboard`](useClipboard.md) | Reactive [Clipboard API](https://developer.mozilla.org/en-US/docs/Web/API/Clipboard_API) | AUTO |
| [`useClipboardItems`](useClipboardItems.md) | Reactive [Clipboard API](https://developer.mozilla.org/en-US/docs/Web/API/Clipboard_API) | AUTO |
| [`useColorMode`](useColorMode.md) | Reactive color mode (dark / light / customs) with auto data persistence | AUTO |
| [`useCssSupports`](useCssSupports.md) | SSR compatible and reactive [`CSS.supports`](https://developer.mozilla.org/docs/Web/API/CSS/supports_static) | AUTO |
| [`useCssVar`](useCssVar.md) | Manipulate CSS variables | AUTO |
| [`useDark`](useDark.md) | Reactive dark mode with auto data persistence | AUTO |
| [`useEventListener`](useEventListener.md) | Use EventListener with ease | AUTO |
| [`useEyeDropper`](useEyeDropper.md) | Reactive [EyeDropper API](https://developer.mozilla.org/en-US/docs/Web/API/EyeDropper_API) | AUTO |
| [`useFavicon`](useFavicon.md) | Reactive favicon | AUTO |
| [`useFileDialog`](useFileDialog.md) | Open file dialog with ease | AUTO |
| [`useFileSystemAccess`](useFileSystemAccess.md) | Create and read and write local files with [FileSystemAccessAPI](https://developer.mozilla.org/en-US/docs/Web/API/File_System_Access_API) | AUTO |
| [`useFullscreen`](useFullscreen.md) | Reactive [Fullscreen API](https://developer.mozilla.org/en-US/docs/Web/API/Fullscreen_API) | AUTO |
| [`useGamepad`](useGamepad.md) | Provides reactive bindings for the [Gamepad API](https://developer.mozilla.org/en-US/docs/Web/API/Gamepad_API) | AUTO |
| [`useImage`](useImage.md) | Reactive load an image in the browser | AUTO |
| [`useLiveAnnouncer`](useLiveAnnouncer.md) | Accessible way to announce messages to screen reader users (ARIA live regions) | AUTO |
| [`useMediaControls`](useMediaControls.md) | Reactive media controls for both `audio` and `video` elements | AUTO |
| [`useMediaQuery`](useMediaQuery.md) | Reactive [Media Query](https://developer.mozilla.org/en-US/docs/Web/CSS/Media_Queries/Testing_media_queries) | AUTO |
| [`useMemory`](useMemory.md) | Reactive Memory Info | AUTO |
| [`useObjectUrl`](useObjectUrl.md) | Reactive URL representing an object | AUTO |
| [`usePerformanceObserver`](usePerformanceObserver.md) | Observe performance metrics | AUTO |
| [`usePermission`](usePermission.md) | Reactive [Permissions API](https://developer.mozilla.org/en-US/docs/Web/API/Permissions_API) | AUTO |
| [`usePreferredColorScheme`](usePreferredColorScheme.md) | Reactive [prefers-color-scheme](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-color-scheme) media query | AUTO |
| [`usePreferredContrast`](usePreferredContrast.md) | Reactive [prefers-contrast](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-contrast) media query | AUTO |
| [`usePreferredDark`](usePreferredDark.md) | Reactive dark theme preference | AUTO |
| [`usePreferredLanguages`](usePreferredLanguages.md) | Reactive [Navigator Languages](https://developer.mozilla.org/en-US/docs/Web/API/NavigatorLanguage/languages) | AUTO |
| [`usePreferredReducedMotion`](usePreferredReducedMotion.md) | Reactive [prefers-reduced-motion](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion) media query | AUTO |
| [`usePreferredReducedTransparency`](usePreferredReducedTransparency.md) | Reactive [prefers-reduced-transparency](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-transparency) media query | AUTO |
| [`useScreenOrientation`](useScreenOrientation.md) | Reactive [Screen Orientation API](https://developer.mozilla.org/en-US/docs/Web/API/Screen_Orientation_API) | AUTO |
| [`useScreenSafeArea`](useScreenSafeArea.md) | Reactive `env(safe-area-inset-*)` | AUTO |
| [`useScriptTag`](useScriptTag.md) | Creates a script tag | AUTO |
| [`useShare`](useShare.md) | Reactive [Web Share API](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/share) | AUTO |
| [`useSSRWidth`](useSSRWidth.md) | Used to set a global viewport width which will be used when rendering SSR components that rely on the viewport width like [`useMediaQuery`](useMediaQuery.md) or [`useBreakpoints`](useBreakpoints.md) | AUTO |
| [`useStyleTag`](useStyleTag.md) | Inject reactive `style` element in head | AUTO |
| [`useTextareaAutosize`](useTextareaAutosize.md) | Automatically update the height of a textarea depending on the content | AUTO |
| [`useTextDirection`](useTextDirection.md) | Reactive [dir](https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/dir) of the element's text | AUTO |
| [`useTitle`](useTitle.md) | Reactive document title | AUTO |
| [`useUrlSearchParams`](useUrlSearchParams.md) | Reactive [URLSearchParams](https://developer.mozilla.org/en-US/docs/Web/API/URLSearchParams) | AUTO |
| [`useVibrate`](useVibrate.md) | Reactive [Vibration API](https://developer.mozilla.org/en-US/docs/Web/API/Vibration_API) | AUTO |
| [`useWakeLock`](useWakeLock.md) | Reactive [Screen Wake Lock API](https://developer.mozilla.org/en-US/docs/Web/API/Screen_Wake_Lock_API) | AUTO |
| [`useWebMCP`](useWebMCP.md) | Register a [WebMCP](https://github.com/webmachinelearning/webmcp) tool and tie its lifecycle to the current Vue scope | AUTO |
| [`useWebNotification`](useWebNotification.md) | Reactive [Notification](https://developer.mozilla.org/en-US/docs/Web/API/notification) | AUTO |
| [`useWebWorker`](useWebWorker.md) | Simple [Web Workers](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Using_web_workers) registration and communication | AUTO |
| [`useWebWorkerFn`](useWebWorkerFn.md) | Run expensive functions without blocking the UI | AUTO |

## Sensors

| Function | Description | Invocation |
|----------|-------------|------------|
| [`onClickOutside`](onClickOutside.md) | Listen for clicks outside of an element | AUTO |
| [`onElementRemoval`](onElementRemoval.md) | Fires when the element or any element containing it is removed from the DOM | AUTO |
| [`onKeyStroke`](onKeyStroke.md) | Listen for keyboard keystrokes | AUTO |
| [`onLongPress`](onLongPress.md) | Listen for a long press on an element | AUTO |
| [`onStartTyping`](onStartTyping.md) | Fires when users start typing on non-editable elements | AUTO |
| [`useBattery`](useBattery.md) | Reactive [Battery Status API](https://developer.mozilla.org/en-US/docs/Web/API/Battery_Status_API) | AUTO |
| [`useDeviceMotion`](useDeviceMotion.md) | Reactive [DeviceMotionEvent](https://developer.mozilla.org/en-US/docs/Web/API/DeviceMotionEvent) | AUTO |
| [`useDeviceOrientation`](useDeviceOrientation.md) | Reactive [DeviceOrientationEvent](https://developer.mozilla.org/en-US/docs/Web/API/DeviceOrientationEvent) | AUTO |
| [`useDevicePixelRatio`](useDevicePixelRatio.md) | Reactively track [`window.devicePixelRatio`](https://developer.mozilla.org/docs/Web/API/Window/devicePixelRatio) | AUTO |
| [`useDevicesList`](useDevicesList.md) | Reactive [enumerateDevices](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/enumerateDevices) listing available input/output devices | AUTO |
| [`useDisplayMedia`](useDisplayMedia.md) | Reactive [`mediaDevices.getDisplayMedia`](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getDisplayMedia) streaming | AUTO |
| [`useElementByPoint`](useElementByPoint.md) | Reactive element by point | AUTO |
| [`useElementHover`](useElementHover.md) | Reactive element's hover state | AUTO |
| [`useFocus`](useFocus.md) | Reactive utility to track or set the focus state of a DOM element | AUTO |
| [`useFocusWithin`](useFocusWithin.md) | Reactive utility to track if an element or one of its descendants has focus | AUTO |
| [`useFps`](useFps.md) | Reactive FPS (frames per second) | AUTO |
| [`useGeolocation`](useGeolocation.md) | Reactive [Geolocation API](https://developer.mozilla.org/en-US/docs/Web/API/Geolocation_API) | AUTO |
| [`useIdle`](useIdle.md) | Tracks whether the user is being inactive | AUTO |
| [`useInfiniteScroll`](useInfiniteScroll.md) | Infinite scrolling of the element | AUTO |
| [`useKeyModifier`](useKeyModifier.md) | Reactive [Modifier State](https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent/getModifierState) | AUTO |
| [`useMagicKeys`](useMagicKeys.md) | Reactive keys pressed state | AUTO |
| [`useMouse`](useMouse.md) | Reactive mouse position | AUTO |
| [`useMousePressed`](useMousePressed.md) | Reactive mouse pressing state | AUTO |
| [`useNavigatorLanguage`](useNavigatorLanguage.md) | Reactive [navigator.language](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/language) | AUTO |
| [`useNetwork`](useNetwork.md) | Reactive [Network status](https://developer.mozilla.org/en-US/docs/Web/API/Network_Information_API) | AUTO |
| [`useOnline`](useOnline.md) | Reactive online state | AUTO |
| [`usePageLeave`](usePageLeave.md) | Reactive state to show whether the mouse leaves the page | AUTO |
| [`useParallax`](useParallax.md) | Create parallax effect easily | AUTO |
| [`usePointer`](usePointer.md) | Reactive [pointer state](https://developer.mozilla.org/en-US/docs/Web/API/Pointer_events) | AUTO |
| [`usePointerLock`](usePointerLock.md) | Reactive [pointer lock](https://developer.mozilla.org/en-US/docs/Web/API/Pointer_Lock_API) | AUTO |
| [`usePointerSwipe`](usePointerSwipe.md) | Reactive swipe detection based on [PointerEvents](https://developer.mozilla.org/en-US/docs/Web/API/PointerEvent) | AUTO |
| [`useScroll`](useScroll.md) | Reactive scroll position and state | AUTO |
| [`useScrollLock`](useScrollLock.md) | Lock scrolling of the element | AUTO |
| [`useSpeechRecognition`](useSpeechRecognition.md) | Reactive [SpeechRecognition](https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition) | AUTO |
| [`useSpeechSynthesis`](useSpeechSynthesis.md) | Reactive [SpeechSynthesis](https://developer.mozilla.org/en-US/docs/Web/API/SpeechSynthesis) | AUTO |
| [`useSwipe`](useSwipe.md) | Reactive swipe detection based on [`TouchEvents`](https://developer.mozilla.org/en-US/docs/Web/API/TouchEvent) | AUTO |
| [`useTextSelection`](useTextSelection.md) | Reactively track user text selection based on [`Window.getSelection`](https://developer.mozilla.org/en-US/docs/Web/API/Window/getSelection) | AUTO |
| [`useUserMedia`](useUserMedia.md) | Reactive [`mediaDevices.getUserMedia`](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia) streaming | AUTO |

## Network

| Function | Description | Invocation |
|----------|-------------|------------|
| [`useEventSource`](useEventSource.md) | An [EventSource](https://developer.mozilla.org/en-US/docs/Web/API/EventSource) or [Server-Sent-Events](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events) instance opens a persistent connection to an HTTP server | AUTO |
| [`useFetch`](useFetch.md) | Reactive [Fetch API](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API) provides the ability to abort requests | AUTO |
| [`useWebSocket`](useWebSocket.md) | Reactive [WebSocket](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket/WebSocket) client | AUTO |

## Animation

| Function | Description | Invocation |
|----------|-------------|------------|
| [`useAnimate`](useAnimate.md) | Reactive [Web Animations API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Animations_API) | AUTO |
| [`useInterval`](useInterval.md) | Reactive counter that increases on every interval | AUTO |
| [`useIntervalFn`](useIntervalFn.md) | Wrapper for `setInterval` with controls | AUTO |
| [`useNow`](useNow.md) | Reactive current Date instance | AUTO |
| [`useRafFn`](useRafFn.md) | Call function on every `requestAnimationFrame` | AUTO |
| [`useTimeout`](useTimeout.md) | Reactive value that becomes `true` after a given time | AUTO |
| [`useTimeoutFn`](useTimeoutFn.md) | Wrapper for `setTimeout` with controls | AUTO |
| [`useTimestamp`](useTimestamp.md) | Reactive current timestamp | AUTO |
| [`useTransition`](useTransition.md) | Transition between values | AUTO |

## Component

| Function | Description | Invocation |
|----------|-------------|------------|
| [`computedInject`](computedInject.md) | Combine `computed` and `inject` | AUTO |
| [`createReusableTemplate`](createReusableTemplate.md) | Define and reuse template inside the component scope | AUTO |
| [`createTemplatePromise`](createTemplatePromise.md) | Template as Promise | AUTO |
| [`tryOnBeforeMount`](tryOnBeforeMount.md) | Safe `onBeforeMount` | AUTO |
| [`tryOnBeforeUnmount`](tryOnBeforeUnmount.md) | Safe `onBeforeUnmount` | AUTO |
| [`tryOnMounted`](tryOnMounted.md) | Safe `onMounted` | AUTO |
| [`tryOnScopeDispose`](tryOnScopeDispose.md) | Safe `onScopeDispose` | AUTO |
| [`tryOnUnmounted`](tryOnUnmounted.md) | Safe `onUnmounted` | AUTO |
| [`unrefElement`](unrefElement.md) | Retrieves the underlying DOM element from a Vue ref or component instance | AUTO |
| [`useCurrentElement`](useCurrentElement.md) | Get the DOM element of current component as a ref | AUTO |
| [`useMounted`](useMounted.md) | Mounted state in ref | AUTO |
| [`useTemplateRefsList`](useTemplateRefsList.md) | Shorthand for binding refs to template elements and components inside `v-for` | AUTO |
| [`useVirtualList`](useVirtualList.md) | Create virtual lists with ease | AUTO |
| [`useVModel`](useVModel.md) | Shorthand for v-model binding | AUTO |
| [`useVModels`](useVModels.md) | Shorthand for props v-model binding | AUTO |

## Watch

| Function | Description | Invocation |
|----------|-------------|------------|
| [`until`](until.md) | Promised one-time watch for changes | AUTO |
| [`watchArray`](watchArray.md) | Watch for an array with additions and removals | AUTO |
| [`watchAtMost`](watchAtMost.md) | `watch` with the number of times triggered | AUTO |
| [`watchDebounced`](watchDebounced.md) | Debounced watch | AUTO |
| [`watchDeep`](watchDeep.md) | Shorthand for watching value with `{deep: true}` | AUTO |
| [`watchIgnorable`](watchIgnorable.md) | Ignorable watch | AUTO |
| [`watchImmediate`](watchImmediate.md) | Shorthand for watching value with `{immediate: true}` | AUTO |
| [`watchOnce`](watchOnce.md) | Shorthand for watching value with `{ once: true }` | AUTO |
| [`watchPausable`](watchPausable.md) | Pausable watch | AUTO |
| [`watchThrottled`](watchThrottled.md) | Throttled watch | AUTO |
| [`watchTriggerable`](watchTriggerable.md) | Watch that can be triggered manually | AUTO |
| [`watchWithFilter`](watchWithFilter.md) | `watch` with additional EventFilter control | AUTO |
| [`whenever`](whenever.md) | Shorthand for watching value to be truthy | AUTO |

## Reactivity

| Function | Description | Invocation |
|----------|-------------|------------|
| [`computedAsync`](computedAsync.md) | Computed for async functions | AUTO |
| [`computedEager`](computedEager.md) | Eager computed without lazy evaluation | AUTO |
| [`computedWithControl`](computedWithControl.md) | Explicitly define the dependencies of computed | AUTO |
| [`createRef`](createRef.md) | Returns a `deepRef` or `shallowRef` depending on the `deep` param | AUTO |
| [`extendRef`](extendRef.md) | Add extra attributes to Ref | AUTO |
| [`reactify`](reactify.md) | Converts plain functions into reactive functions | AUTO |
| [`reactifyObject`](reactifyObject.md) | Apply `reactify` to an object | AUTO |
| [`reactiveComputed`](reactiveComputed.md) | Computed reactive object | AUTO |
| [`reactiveOmit`](reactiveOmit.md) | Reactively omit fields from a reactive object | AUTO |
| [`reactivePick`](reactivePick.md) | Reactively pick fields from a reactive object | AUTO |
| [`refAutoReset`](refAutoReset.md) | A ref which will be reset to the default value after some time | AUTO |
| [`refDebounced`](refDebounced.md) | Debounce execution of a ref value | AUTO |
| [`refDefault`](refDefault.md) | Apply default value to a ref | AUTO |
| [`refManualReset`](refManualReset.md) | Create a ref with manual reset functionality | AUTO |
| [`refThrottled`](refThrottled.md) | Throttle changing of a ref value | AUTO |
| [`refWithControl`](refWithControl.md) | Fine-grained controls over ref and its reactivity | AUTO |
| [`syncRef`](syncRef.md) | Two-way refs synchronization | AUTO |
| [`syncRefs`](syncRefs.md) | Keep target refs in sync with a source ref | AUTO |
| [`toReactive`](toReactive.md) | Converts ref to reactive | AUTO |
| [`toRef`](toRef.md) | Normalize value/ref/getter to `ref` or `computed` | EXPLICIT_ONLY |
| [`toRefs`](toRefs.md) | Extended [`toRefs`](https://vuejs.org/api/reactivity-utilities.html#torefs) that also accepts refs of an object | AUTO |

## Array

| Function | Description | Invocation |
|----------|-------------|------------|
| [`useArrayDifference`](useArrayDifference.md) | Reactive get array difference of two arrays | AUTO |
| [`useArrayEvery`](useArrayEvery.md) | Reactive `Array.every` | AUTO |
| [`useArrayFilter`](useArrayFilter.md) | Reactive `Array.filter` | AUTO |
| [`useArrayFind`](useArrayFind.md) | Reactive `Array.find` | AUTO |
| [`useArrayFindIndex`](useArrayFindIndex.md) | Reactive `Array.findIndex` | AUTO |
| [`useArrayFindLast`](useArrayFindLast.md) | Reactive `Array.findLast` | AUTO |
| [`useArrayIncludes`](useArrayIncludes.md) | Reactive `Array.includes` | AUTO |
| [`useArrayJoin`](useArrayJoin.md) | Reactive `Array.join` | AUTO |
| [`useArrayMap`](useArrayMap.md) | Reactive `Array.map` | AUTO |
| [`useArrayReduce`](useArrayReduce.md) | Reactive `Array.reduce` | AUTO |
| [`useArraySome`](useArraySome.md) | Reactive `Array.some` | AUTO |
| [`useArrayUnique`](useArrayUnique.md) | Reactive unique array | AUTO |
| [`useSorted`](useSorted.md) | Reactive sort array | AUTO |

## Time

| Function | Description | Invocation |
|----------|-------------|------------|
| [`useCountdown`](useCountdown.md) | Reactive countdown timer in seconds | AUTO |
| [`useDateFormat`](useDateFormat.md) | Get the formatted date according to the string of tokens passed in | AUTO |
| [`useTemporalNow`](useTemporalNow.md) | Reactive [Temporal API](https://tc39.es/proposal-temporal/docs/) with timezone conversion and calendar system support | AUTO |
| [`useTimeAgo`](useTimeAgo.md) | Reactive time ago | AUTO |
| [`useTimeAgoIntl`](useTimeAgoIntl.md) | Reactive time ago with i18n supported | AUTO |

## Utilities

| Function | Description | Invocation |
|----------|-------------|------------|
| [`createDisposableDirective`](createDisposableDirective.md) | Utility for authoring disposable directives | AUTO |
| [`createEventHook`](createEventHook.md) | Utility for creating event hooks | AUTO |
| [`createUnrefFn`](createUnrefFn.md) | Make a plain function accepting ref and raw values as arguments | AUTO |
| [`get`](get.md) | Shorthand for accessing `ref.value` | EXPLICIT_ONLY |
| [`isDefined`](isDefined.md) | Non-nullish checking type guard for Ref | AUTO |
| [`makeDestructurable`](makeDestructurable.md) | Make isomorphic destructurable for object and array at the same time | AUTO |
| [`set`](set.md) | Shorthand for `ref.value = x` | EXPLICIT_ONLY |
| [`useAsyncQueue`](useAsyncQueue.md) | Executes each asynchronous task sequentially and passes the current task result to the next task | AUTO |
| [`useBase64`](useBase64.md) | Reactive base64 transforming | AUTO |
| [`useCached`](useCached.md) | Cache a ref with a custom comparator | AUTO |
| [`useCloned`](useCloned.md) | Reactive clone of a ref | AUTO |
| [`useConfirmDialog`](useConfirmDialog.md) | Creates event hooks to support modals and confirmation dialog chains | AUTO |
| [`useCounter`](useCounter.md) | Basic counter with utility functions | AUTO |
| [`useCycleList`](useCycleList.md) | Cycle through a list of items | AUTO |
| [`useDebounceFn`](useDebounceFn.md) | Debounce execution of a function | AUTO |
| [`useEventBus`](useEventBus.md) | A basic event bus | AUTO |
| [`useMemoize`](useMemoize.md) | Cache results of functions depending on arguments and keep it reactive | AUTO |
| [`useOffsetPagination`](useOffsetPagination.md) | Reactive offset pagination | AUTO |
| [`usePrevious`](usePrevious.md) | Holds the previous value of a ref | AUTO |
| [`useStepper`](useStepper.md) | Provides helpers for building a multi-step wizard interface | AUTO |
| [`useSupported`](useSupported.md) | SSR compatibility `isSupported` | AUTO |
| [`useThrottleFn`](useThrottleFn.md) | Throttle execution of a function | AUTO |
| [`useTimeoutPoll`](useTimeoutPoll.md) | Use timeout to poll something | AUTO |
| [`useToggle`](useToggle.md) | A boolean switcher with utility functions | AUTO |
| [`useToNumber`](useToNumber.md) | Reactively convert a string ref to number | AUTO |
| [`useToString`](useToString.md) | Reactively convert a ref to string | AUTO |

## @Electron

| Function | Description | Invocation |
|----------|-------------|------------|
| [`useIpcRenderer`](useIpcRenderer.md) | Provides [ipcRenderer](https://www.electronjs.org/docs/api/ipc-renderer) and all of its APIs with Vue reactivity | EXTERNAL |
| [`useIpcRendererInvoke`](useIpcRendererInvoke.md) | Reactive [ipcRenderer.invoke API](https://www.electronjs.org/docs/api/ipc-renderer#ipcrendererinvokechannel-args) result | EXTERNAL |
| [`useIpcRendererOn`](useIpcRendererOn.md) | Use [ipcRenderer.on](https://www.electronjs.org/docs/api/ipc-renderer#ipcrendereronchannel-listener) with ease and [ipcRenderer.removeListener](https://www.electronjs.org/docs/api/ipc-renderer#ipcrendererremovelistenerchannel-listener) automatically on unmounted | EXTERNAL |
| [`useZoomFactor`](useZoomFactor.md) | Reactive [WebFrame](https://www.electronjs.org/docs/api/web-frame#webframe) zoom factor | EXTERNAL |
| [`useZoomLevel`](useZoomLevel.md) | Reactive [WebFrame](https://www.electronjs.org/docs/api/web-frame#webframe) zoom level | EXTERNAL |

## @Firebase

| Function | Description | Invocation |
|----------|-------------|------------|
| [`useAuth`](useAuth.md) | Reactive [Firebase Auth](https://firebase.google.com/docs/auth) binding | EXTERNAL |
| [`useFirestore`](useFirestore.md) | Reactive [Firestore](https://firebase.google.com/docs/firestore) binding | EXTERNAL |
| [`useRTDB`](useRTDB.md) | Reactive [Firebase Realtime Database](https://firebase.google.com/docs/database) binding | EXTERNAL |

## @Head

| Function | Description | Invocation |
|----------|-------------|------------|
| [`createHead`](https://github.com/vueuse/head#api) | Create the head manager instance. | EXTERNAL |
| [`useHead`](https://github.com/vueuse/head#api) | Update head meta tags reactively. | EXTERNAL |

## @Integrations

| Function | Description | Invocation |
|----------|-------------|------------|
| [`useAsyncValidator`](useAsyncValidator.md) | Wrapper for [`async-validator`](https://github.com/yiminghe/async-validator) | EXTERNAL |
| [`useAxios`](useAxios.md) | Wrapper for [`axios`](https://github.com/axios/axios) | EXTERNAL |
| [`useChangeCase`](useChangeCase.md) | Reactive wrapper for [`change-case`](https://github.com/blakeembrey/change-case) | EXTERNAL |
| [`useCookies`](useCookies.md) | Wrapper for [`universal-cookie`](https://www.npmjs.com/package/universal-cookie) | EXTERNAL |
| [`useDrauu`](useDrauu.md) | Reactive instance for [drauu](https://github.com/antfu/drauu) | EXTERNAL |
| [`useFocusTrap`](useFocusTrap.md) | Reactive wrapper for [`focus-trap`](https://github.com/focus-trap/focus-trap) | EXTERNAL |
| [`useFuse`](useFuse.md) | Easily implement fuzzy search using a composable with [Fuse.js](https://github.com/krisk/fuse) | EXTERNAL |
| [`useIDBKeyval`](useIDBKeyval.md) | Wrapper for [`idb-keyval`](https://www.npmjs.com/package/idb-keyval) | EXTERNAL |
| [`useJwt`](useJwt.md) | Wrapper for [`jwt-decode`](https://github.com/auth0/jwt-decode) | EXTERNAL |
| [`useNProgress`](useNProgress.md) | Reactive wrapper for [`nprogress`](https://github.com/rstacruz/nprogress) | EXTERNAL |
| [`useQRCode`](useQRCode.md) | Wrapper for [`qrcode`](https://github.com/soldair/node-qrcode) | EXTERNAL |
| [`useSortable`](useSortable.md) | Wrapper for [`sortable`](https://github.com/SortableJS/Sortable) | EXTERNAL |

## @Math

| Function | Description | Invocation |
|----------|-------------|------------|
| [`createGenericProjection`](createGenericProjection.md) | Generic version of `createProjection` | EXTERNAL |
| [`createProjection`](createProjection.md) | Reactive numeric projection from one domain to another | EXTERNAL |
| [`logicAnd`](logicAnd.md) | `AND` condition for refs | EXTERNAL |
| [`logicNot`](logicNot.md) | `NOT` condition for ref | EXTERNAL |
| [`logicOr`](logicOr.md) | `OR` conditions for refs | EXTERNAL |
| [`useAbs`](useAbs.md) | Reactive `Math.abs` | EXTERNAL |
| [`useAverage`](useAverage.md) | Get the average of an array reactively | EXTERNAL |
| [`useCeil`](useCeil.md) | Reactive `Math.ceil` | EXTERNAL |
| [`useClamp`](useClamp.md) | Reactively clamp a value between two other values | EXTERNAL |
| [`useFloor`](useFloor.md) | Reactive `Math.floor` | EXTERNAL |
| [`useMath`](useMath.md) | Reactive `Math` methods | EXTERNAL |
| [`useMax`](useMax.md) | Reactive `Math.max` | EXTERNAL |
| [`useMin`](useMin.md) | Reactive `Math.min` | EXTERNAL |
| [`usePrecision`](usePrecision.md) | Reactively set the precision of a number | EXTERNAL |
| [`useProjection`](useProjection.md) | Reactive numeric projection from one domain to another | EXTERNAL |
| [`useRound`](useRound.md) | Reactive `Math.round` | EXTERNAL |
| [`useSum`](useSum.md) | Get the sum of an array reactively | EXTERNAL |
| [`useTrunc`](useTrunc.md) | Reactive `Math.trunc` | EXTERNAL |

## @Motion

| Function | Description | Invocation |
|----------|-------------|------------|
| [`useElementStyle`](https://motion.vueuse.org/api/use-element-style) | Sync a reactive object to a target element CSS styling | EXTERNAL |
| [`useElementTransform`](https://motion.vueuse.org/api/use-element-transform) | Sync a reactive object to a target element CSS transform. | EXTERNAL |
| [`useMotion`](https://motion.vueuse.org/api/use-motion) | Putting your components in motion. | EXTERNAL |
| [`useMotionProperties`](https://motion.vueuse.org/api/use-motion-properties) | Access Motion Properties for a target element. | EXTERNAL |
| [`useMotionVariants`](https://motion.vueuse.org/api/use-motion-variants) | Handle the Variants state and selection. | EXTERNAL |
| [`useSpring`](https://motion.vueuse.org/api/use-spring) | Spring animations. | EXTERNAL |

## @Router

| Function | Description | Invocation |
|----------|-------------|------------|
| [`useRouteHash`](useRouteHash.md) | Shorthand for a reactive `route.hash` | EXTERNAL |
| [`useRouteParams`](useRouteParams.md) | Shorthand for a reactive `route.params` | EXTERNAL |
| [`useRouteQuery`](useRouteQuery.md) | Shorthand for a reactive `route.query` | EXTERNAL |

## @RxJS

| Function | Description | Invocation |
|----------|-------------|------------|
| [`from`](from.md) | Wrappers around RxJS's [`from()`](https://rxjs.dev/api/index/function/from) and [`fromEvent()`](https://rxjs.dev/api/index/function/fromEvent) to allow them to accept `ref`s | EXTERNAL |
| [`toObserver`](toObserver.md) | Sugar function to convert a `ref` into an RxJS [Observer](https://rxjs.dev/guide/observer) | EXTERNAL |
| [`useExtractedObservable`](useExtractedObservable.md) | Use an RxJS [`Observable`](https://rxjs.dev/guide/observable) as extracted from one or more composables | EXTERNAL |
| [`useObservable`](useObservable.md) | Use an RxJS [`Observable`](https://rxjs.dev/guide/observable) | EXTERNAL |
| [`useSubject`](useSubject.md) | Bind an RxJS [`Subject`](https://rxjs.dev/guide/subject) to a `ref` and propagate value changes both ways | EXTERNAL |
| [`useSubscription`](useSubscription.md) | Use an RxJS [`Subscription`](https://rxjs.dev/guide/subscription) without worrying about unsubscribing from it or creating memory leaks | EXTERNAL |
| [`watchExtractedObservable`](watchExtractedObservable.md) | Watch the values of an RxJS [`Observable`](https://rxjs.dev/guide/observable) as extracted from one or more composables | EXTERNAL |

## @SchemaOrg

| Function | Description | Invocation |
|----------|-------------|------------|
| [`createSchemaOrg`](https://vue-schema-org.netlify.app/api/core/create-schema-org.html) | Create the schema.org manager instance. | EXTERNAL |
| [`useSchemaOrg`](https://vue-schema-org.netlify.app/api/core/use-schema-org.html) | Update schema.org reactively. | EXTERNAL |

## @Sound

| Function | Description | Invocation |
|----------|-------------|------------|
| [`useSound`](https://github.com/vueuse/sound#examples) | Play sound effects reactively. | EXTERNAL |

## Deprecated function

VueUse also ships a reference for [`templateRef`](templateRef.md). Use Vue's built-in `useTemplateRef` when targeting Vue 3.5 or later.
