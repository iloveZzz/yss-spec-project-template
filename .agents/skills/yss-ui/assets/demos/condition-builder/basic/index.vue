<script setup lang="ts">
import { ref, computed } from 'vue';
import { YConditionBuilder } from '@yss-ui/components';
import type { ConditionGroup } from '@yss-ui/components';
import { operatorOptions, createInitial } from './constants';
import { useConditionBasic } from './hooks/useConditionBasic';

const model = ref<ConditionGroup>(createInitial());
const { loadFields, loadValues } = useConditionBasic();

/** 格式化输出的 JSON 参数 */
const formattedJson = computed(() => {
  return JSON.stringify(model.value, null, 2);
});
</script>

<template>
  <div class="demo-container">
    <div class="condition-builder-wrapper">
      <YConditionBuilder
        v-model="model"
        :operator-options="operatorOptions"
        :load-fields="loadFields"
        :load-values="args => loadValues({ q: args.q, field: args.field })"
      />
    </div>

    <div class="output-section">
      <h4 class="output-title">输出参数 JSON：</h4>
      <pre class="json-output">{{ formattedJson }}</pre>
    </div>
  </div>
</template>

<style scoped lang="less">
.demo-container {
  gap: var(--spacing-lg, 24px);
}

.condition-builder-wrapper {
  min-height: 200px;
}

.output-section {
  padding-top: var(--spacing-lg, 24px);
}

.output-title {
  margin: 0 0 var(--spacing-md, 16px) 0;
  font-size: 14px;
  font-weight: 500;
  color: var(--color-text-primary, #1d2129);
}

.json-output {
  background-color: var(--color-fill-1, #f7f8fa);
  border: 1px solid var(--color-border-2, #e5e6eb);
  border-radius: var(--radius-md, 6px);
  padding: var(--spacing-md, 16px);
  margin: 0;
  font-family: Monaco, Menlo, 'Ubuntu Mono', monospace;
  font-size: 12px;
  line-height: 1.5;
  color: var(--color-text-primary, #1d2129);
  overflow: auto auto;
  white-space: pre-wrap;
  word-break: break-word;
  max-height: 400px;
}

/* 响应式设计 */
@media (min-width: 768px) {
  .demo-container {
    flex-direction: row;
    gap: var(--spacing-xl, 32px);
  }

  .condition-builder-wrapper {
    flex: 1;
  }

  .output-section {
    flex: 0 0 400px;
    border-top: none;
    padding-top: 0;
  }
}

/* --- 暗色模式适配 --- */
[data-prefers-color='dark'] {
  .output-title {
    color: rgba(255, 255, 255, 0.85);
  }
  .json-output {
    background-color: #141414;
    border-color: #303030;
    color: rgba(255, 255, 255, 0.85);
  }
}
</style>
