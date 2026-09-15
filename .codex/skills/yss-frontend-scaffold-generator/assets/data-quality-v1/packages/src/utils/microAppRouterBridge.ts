import { isNavigationFailure, NavigationFailureType, type Router } from 'vue-router';

/** 主应用路由同步事件明细。 */
interface MicroAppRouteSyncDetail {
  appName?: string;
  path?: string;
}

/** 路由同步失败原因。 */
type MicroAppRouteSyncErrorReason = 'navigation' | 'chunk-load';

/** 路由桥接初始化参数。 */
interface MicroAppRouterBridgeOptions {
  router: Router;
  appName: string;
  activeRule: string;
}

/** 可供恢复标记使用的最小存储接口。 */
interface RecoveryStorage {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
}

/** Vite 预加载错误事件。 */
interface VitePreloadErrorEvent extends Event {
  payload?: unknown;
}

/** 自动恢复结果。 */
type ChunkRecoveryResult = 'not-chunk' | 'reloading' | 'exhausted';

/** 旧 chunk 自动刷新标记前缀。 */
const CHUNK_RELOAD_KEY_PREFIX = '__yss_micro_chunk_reload__';

/**
 * 规范化微应用激活前缀。
 * @param activeRule 原始激活前缀
 * @returns 无结尾斜杠的激活前缀
 */
function normalizeActiveRule(activeRule: string): string {
  const withLeadingSlash = activeRule.startsWith('/') ? activeRule : `/${activeRule}`;
  if (withLeadingSlash === '/') return '/';
  return withLeadingSlash.replace(/\/+$/, '');
}

/**
 * 将宿主地址解析为子应用完整路由。
 * @param activeRule 微应用激活前缀
 * @param locationLike 浏览器地址
 * @returns 子应用路由；不属于当前微应用时返回 null
 */
export function resolveMicroAppFullPath(
  activeRule: string,
  locationLike: Pick<Location, 'pathname' | 'search' | 'hash'>
): string | null {
  const base = normalizeActiveRule(activeRule);
  const { pathname, search, hash } = locationLike;
  const matchesBase = base === '/' || pathname === base || pathname.startsWith(`${base}/`);
  if (!matchesBase) return null;
  const subPath = base === '/' ? pathname || '/' : pathname.slice(base.length) || '/';
  return `${subPath}${search || ''}${hash || ''}`;
}

/**
 * 将主应用事件中的地址解析为子应用完整路由。
 * @param activeRule 微应用激活前缀
 * @param path 主应用完整地址
 * @param origin 当前页面 origin
 * @returns 子应用路由；不属于当前微应用时返回 null
 */
export function resolveMicroAppEventPath(activeRule: string, path: string, origin: string): string | null {
  try {
    const url = new URL(path, origin);
    if (url.origin !== origin) return null;
    return resolveMicroAppFullPath(activeRule, url);
  } catch {
    return null;
  }
}

/**
 * 提取错误信息。
 * @param error 未知错误
 * @returns 可展示的错误信息
 */
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as { message?: unknown }).message || '');
  }
  return String(error || '未知错误');
}

/**
 * 判断错误是否由旧 chunk 或动态导入资源失效导致。
 * @param error 未知错误
 * @returns 是否为可通过刷新恢复的资源错误
 */
export function isChunkLoadError(error: unknown): boolean {
  const message = getErrorMessage(error);
  return /ChunkLoadError|Loading chunk [\w-]+ failed|Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module|Unable to preload CSS|JavaScript-or-Wasm module script|MIME type.*text\/html/i.test(
    message
  );
}

/**
 * 创建当前路由的单次刷新标记。
 * @param appName 微应用标识
 * @param fullPath 子应用完整路由
 * @returns sessionStorage 标记键
 */
export function createChunkReloadKey(appName: string, fullPath: string): string {
  return `${CHUNK_RELOAD_KEY_PREFIX}:${appName}:${fullPath}`;
}

/**
 * 预占当前路由的自动刷新机会。
 * @param storage 会话存储
 * @param key 刷新标记键
 * @returns 本次是否允许刷新
 */
export function reserveChunkReload(storage: RecoveryStorage, key: string): boolean {
  try {
    if (storage.getItem(key)) return false;
    storage.setItem(key, '1');
    return true;
  } catch {
    return false;
  }
}

/**
 * 清理已成功路由的自动刷新标记。
 * @param storage 会话存储
 * @param key 刷新标记键
 */
function clearChunkReload(storage: RecoveryStorage, key: string): void {
  try {
    storage.removeItem(key);
  } catch {
    // 浏览器禁用会话存储时无需额外处理。
  }
}

/**
 * 获取当前宿主完整地址。
 * @returns pathname、query 和 hash
 */
function getHostFullPath(): string {
  return `${window.location.pathname}${window.location.search}${window.location.hash}`;
}

/**
 * 安装 qiankun 子应用路由桥接和旧 chunk 恢复逻辑。
 * @param options 路由桥接参数
 * @returns 清理全部监听器的函数
 */
export function setupMicroAppRouterBridge(options: MicroAppRouterBridgeOptions): () => void {
  const { router, appName, activeRule } = options;
  let reloadScheduled = false;
  let lastErrorSignature = '';

  /** 向主应用报告无法自动恢复的路由错误。 */
  const reportError = (reason: MicroAppRouteSyncErrorReason, error: unknown) => {
    const message = getErrorMessage(error) || '微应用路由切换失败';
    const path = getHostFullPath();
    const signature = `${reason}:${path}:${message}`;
    if (signature === lastErrorSignature) return;
    lastErrorSignature = signature;
    window.dispatchEvent(
      new CustomEvent('microapp-route-sync-error', {
        detail: { appName, path, reason, message },
      })
    );
  };

  /** 尝试通过单次刷新恢复旧 chunk 加载失败。 */
  const recoverChunkError = (error: unknown, targetFullPath: string): ChunkRecoveryResult => {
    if (!isChunkLoadError(error)) return 'not-chunk';
    if (reloadScheduled) return 'reloading';
    const key = createChunkReloadKey(appName, targetFullPath);
    if (!reserveChunkReload(window.sessionStorage, key)) {
      reportError('chunk-load', error);
      return 'exhausted';
    }
    reloadScheduled = true;
    window.location.reload();
    return 'reloading';
  };

  /** 同步子应用路由，并显式处理导航失败。 */
  const syncRouter = (targetFullPath: string) => {
    if (router.currentRoute.value.fullPath === targetFullPath) return;
    void router
      .replace(targetFullPath)
      .then(failure => {
        if (!failure) return;
        if (
          isNavigationFailure(failure, NavigationFailureType.duplicated) ||
          isNavigationFailure(failure, NavigationFailureType.cancelled)
        ) {
          return;
        }
        reportError('navigation', failure);
      })
      .catch((error: unknown) => {
        if (recoverChunkError(error, targetFullPath) === 'not-chunk') {
          reportError('navigation', error);
        }
      });
  };

  /** 从浏览器当前地址同步路由。 */
  const syncRouterFromLocation = () => {
    const targetFullPath = resolveMicroAppFullPath(activeRule, window.location);
    if (targetFullPath) syncRouter(targetFullPath);
  };

  /** 处理主应用主动路由同步事件。 */
  const handleMainAppRouteSync = (event: Event) => {
    const detail = (event as CustomEvent<MicroAppRouteSyncDetail>).detail;
    if (detail?.appName !== appName || !detail.path) return;
    const targetFullPath = resolveMicroAppEventPath(activeRule, detail.path, window.location.origin);
    if (targetFullPath) syncRouter(targetFullPath);
  };

  /** 处理 Vite 动态资源预加载错误。 */
  const handlePreloadError = (event: Event) => {
    const preloadEvent = event as VitePreloadErrorEvent;
    const targetFullPath = resolveMicroAppFullPath(activeRule, window.location) || router.currentRoute.value.fullPath;
    if (recoverChunkError(preloadEvent.payload ?? preloadEvent, targetFullPath) === 'reloading') {
      event.preventDefault();
    }
  };

  /** Vue Router 异步组件加载失败兜底。 */
  const removeRouterError = router.onError(error => {
    const targetFullPath = resolveMicroAppFullPath(activeRule, window.location) || router.currentRoute.value.fullPath;
    if (recoverChunkError(error, targetFullPath) === 'not-chunk') {
      reportError('navigation', error);
    }
  });

  /** 成功进入目标页面后允许未来部署再次执行一次恢复刷新。 */
  const removeAfterEach = router.afterEach((to, _from, failure) => {
    if (failure) return;
    clearChunkReload(window.sessionStorage, createChunkReloadKey(appName, to.fullPath));
    lastErrorSignature = '';
  });

  window.addEventListener('popstate', syncRouterFromLocation);
  window.addEventListener('microapp-route-sync', handleMainAppRouteSync);
  window.addEventListener('vite:preloadError', handlePreloadError);
  syncRouterFromLocation();

  return () => {
    window.removeEventListener('popstate', syncRouterFromLocation);
    window.removeEventListener('microapp-route-sync', handleMainAppRouteSync);
    window.removeEventListener('vite:preloadError', handlePreloadError);
    removeRouterError();
    removeAfterEach();
  };
}
