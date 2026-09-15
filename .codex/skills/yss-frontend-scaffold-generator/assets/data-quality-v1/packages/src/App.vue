<script setup lang="ts">
import ThemeScope from '@/components/ThemeScope.vue';
import zhCN from 'ant-design-vue/es/locale/zh_CN';
import { useThemeStore } from '@/store/theme';
const store = useThemeStore();
defineProps<{ standalone: boolean; popupContainer: HTMLElement }>();
</script>
<template>
  <a-config-provider :locale="zhCN" :theme="store.config" :get-popup-container="() => popupContainer">
    <ThemeScope :container="popupContainer"><div class="yss-app-shell">
      <header v-if="standalone" class="app-header"><strong>__APP_NAME__</strong><span class="theme-controls"><a-switch :checked="store.dark" checked-children="暗色" un-checked-children="浅色" @change="store.setDark(Boolean($event))" /><a-switch :checked="store.compact" checked-children="紧凑" un-checked-children="默认" @change="store.setCompact(Boolean($event))" /></span></header>
      <main class="app-content"><router-view /></main>
    </div></ThemeScope>
  </a-config-provider>
</template>
