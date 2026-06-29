<script setup lang="ts">
import { YMonaco } from '@yss-ui/components';
import { Select } from 'ant-design-vue';
import { ref, watch } from 'vue';

const refEditor = ref<InstanceType<typeof YMonaco> | null>(null);
const lang = ref<'javascript' | 'json' | 'sql'>('json');
const theme = ref<'vs' | 'vs-dark'>('vs');
const code = ref<string>(`{\n  "name": "yss-ui",\n  "version": "1.0.0"\n}\n`);

const langOptions = [
  { label: 'Javascript', value: 'javascript' },
  { label: 'Typescript', value: 'typescript' },
  { label: 'JSON', value: 'json' },
  { label: 'SQL', value: 'sql' },
  { label: 'Python', value: 'python' },
  { label: 'Java', value: 'java' },
  { label: 'Go', value: 'go' },
  { label: 'HTML', value: 'html' },
  { label: 'CSS', value: 'css' },
  { label: 'YAML', value: 'yaml' },
  { label: 'Markdown', value: 'markdown' },
  { label: 'Shell', value: 'shell' },
  { label: 'Ruby', value: 'ruby' },
  { label: 'Rust', value: 'rust' },
  { label: 'PHP', value: 'php' },
  { label: 'YAML', value: 'yaml' },
];

const themeOptions = [
  { label: 'Vs', value: 'vs' },
  { label: 'Vs-dark', value: 'vs-dark' },
];

watch(theme, newVal => {
  refEditor.value?.setTheme(newVal);
});
</script>

<template>
  <div style="display: flex; gap: 8px; align-items: center; margin-bottom: 8px">
    <Select v-model:value="lang" :options="langOptions" style="width: 120px" />
    <Select v-model:value="theme" :options="themeOptions" style="width: 120px" />
  </div>
  <YMonaco ref="refEditor" v-model="code" :language="lang" :theme="theme" :height="260" />
</template>

<style scoped></style>
