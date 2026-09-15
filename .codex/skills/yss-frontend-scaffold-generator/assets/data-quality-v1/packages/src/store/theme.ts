import { computed, ref } from 'vue';
import { defineStore } from 'pinia';
import { theme } from 'ant-design-vue';
import type { ThemeConfig } from 'ant-design-vue/es/config-provider/context';
import { applyYssTheme } from '@yss-ui/utils';
import baseline from '@/config/theme.json';
import type { MicroAppThemeConfigDto } from '@/types/microAppBridge';
export const useThemeStore = defineStore('theme', () => {
  const primary = ref(baseline.token.colorPrimary), dark = ref(false), compact = ref(false);
  const config = computed<ThemeConfig>(() => {
    const token: ThemeConfig['token'] = { ...baseline.token, colorPrimary: primary.value, colorInfo: primary.value };
    if (dark.value) for (const key of ['colorTextBase', 'colorBgBase', 'colorText', 'colorTextSecondary', 'colorBorder', 'colorBgLayout'] as const) delete token[key];
    return { token, algorithm: [dark.value ? theme.darkAlgorithm : theme.defaultAlgorithm, ...(compact.value ? [theme.compactAlgorithm] : [])], components: { ...baseline.components, Card: { ...baseline.components.Card, paddingLG: compact.value ? 16 : baseline.token.paddingLG }, Button: { colorPrimary: baseline.accessibility.primaryControl, colorPrimaryHover: baseline.accessibility.primaryControlHover } } };
  });
  function applyFromMain(dto?: MicroAppThemeConfigDto) {
    const incoming = dto?.token?.colorPrimary;
    if (typeof incoming === 'string' && /^#[0-9a-f]{6}$/i.test(incoming)) primary.value = incoming;
    if (dto?.mode) { dark.value = dto.mode.dark; compact.value = dto.mode.compact; }
  }
  function syncContainer(container: HTMLElement, values: ReturnType<typeof theme.useToken>['token']['value']) {
    // Only this micro application's own container is mutated; unmount removes it.

      for (const [key, value] of Object.entries(values)) {
        if (typeof value !== 'string' && typeof value !== 'number') continue;
        const name = key.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`);
        const unit = typeof value === 'number' && /^(font-size|border-radius|control-height|padding|margin|size)(-|$)/.test(name) ? 'px' : '';
        for (const prefix of ['brand', 'ant']) container.style.setProperty(`--${prefix}-${name}`, `${value}${unit}`);
      }
      const palette = applyYssTheme({ primary: primary.value, target: container, mirrorToLegacy: true });
      container.style.setProperty('--vxe-ui-font-primary-lighten-color', palette.primary[5]);
      container.style.setProperty('--vxe-ui-font-primary-darken-color', palette.primary[7]);
      container.style.setProperty('--vxe-ui-font-primary-color', primary.value);
      container.style.setProperty('--yss-card-padding', `${compact.value ? 16 : baseline.token.paddingLG}px`);
      container.dataset.theme = dark.value ? 'dark' : 'light';
  }
  return { primary, dark, compact, config, applyFromMain, syncContainer, setDark: (value: boolean) => { dark.value = value; }, setCompact: (value: boolean) => { compact.value = value; } };
});
