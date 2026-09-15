import { createApp, type App as VueApp } from 'vue';
import { createPinia } from 'pinia';
import Antd from 'ant-design-vue';
import { YButton } from '@yss-ui/components';
import { renderWithQiankun, qiankunWindow } from 'vite-plugin-qiankun/dist/helper';
import 'ant-design-vue/dist/reset.css';
import '@yss-ui/components/dist/style.css';
import './styles/index.less';
import App from './App.vue';
import { createAppRouter } from './router';
import { useThemeStore } from './store/theme';
import { setupMicroAppRouterBridge } from './utils/microAppRouterBridge';
import { MICRO_APP_BRIDGE_VERSION, type MicroAppLifecycleProps } from './types/microAppBridge';
let app: VueApp | undefined;
let dispose: (() => void) | undefined;
let applyTheme: ReturnType<typeof useThemeStore>['applyFromMain'] | undefined;
function assertBridge(props: MicroAppLifecycleProps) {
  if (props.bridgeVersion !== undefined && props.bridgeVersion !== MICRO_APP_BRIDGE_VERSION) throw new Error('Unsupported micro app bridge version');
}
async function mount(props: MicroAppLifecycleProps = {}) {
  assertBridge(props);
  if (app) throw new Error('Micro app is already mounted');
  const host = props.container?.querySelector('#app') || (!props.container ? document.querySelector('#app') : null);
  if (!host) throw new Error('Micro app mount container #app is missing');
  const root = document.createElement('div'); root.className = 'yss-microapp-root'; host.appendChild(root);
  const isMicro = Boolean(qiankunWindow.__POWERED_BY_QIANKUN__);
  const router = createAppRouter(isMicro ? props.routerBase || '__BASE_ROUTE__' : '/');
  const pinia = createPinia();
  app = createApp(App, { standalone: !isMicro && import.meta.env.VITE_STANDALONE_LAYOUT !== 'false', popupContainer: root });
  app.use(pinia).use(router).use(Antd);
  app.component("YButton", YButton);
  const store = useThemeStore(pinia); store.applyFromMain(props.themeConfig); applyTheme = store.applyFromMain;
  const stopBridge = isMicro ? setupMicroAppRouterBridge({ router, appName: '__MICROAPP_NAME__', activeRule: props.routerBase || '__BASE_ROUTE__' }) : () => {};
  dispose = () => { stopBridge(); router.options.history.destroy(); root.remove(); };
  try { await router.isReady(); app.mount(root); } catch (error) { unmount(); throw error; }
}
function unmount() { app?.unmount(); dispose?.(); app = undefined; dispose = undefined; applyTheme = undefined; }
function update(props: MicroAppLifecycleProps) { assertBridge(props); applyTheme?.(props.themeConfig); }
renderWithQiankun({ bootstrap: async () => {}, mount, unmount, update });
if (!qiankunWindow.__POWERED_BY_QIANKUN__) void mount();
