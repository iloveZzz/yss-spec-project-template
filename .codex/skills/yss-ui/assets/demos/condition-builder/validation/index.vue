<script setup lang="ts">
import { ref, computed } from 'vue';
import { YConditionBuilder, YButton } from '@yss-ui/components';
import { message } from 'ant-design-vue';
import type { ConditionGroup } from '@yss-ui/components';
import { operatorOptions, createInitial } from './constants.ts';
import { useConditionBasic } from './hooks/useConditionBasic';

const model = ref<ConditionGroup>(createInitial());
const { loadFields, loadValues } = useConditionBasic();
const conditionBuilderRef = ref<any>(null);

/** 格式化输出的 JSON 参数 */
const formattedJson = computed(() => {
  return JSON.stringify(model.value, null, 2);
});

/** 处理组件的 validate 事件 */
const handleValidate = (v: boolean) => {
  console.info(v, '组件 validate 事件返回值');
};

/** 手动触发校验 */
const handleManualValidate = () => {
  if (conditionBuilderRef.value?.validate) {
    const isValid = conditionBuilderRef.value.validate();
    if (isValid) {
      message.success('校验通过！所有条件都已填写完整');
    } else {
      message.error('校验失败！请完善条件表达式');
    }
  }
};
</script>

<template>
  <div class="demo-container">
    <div class="condition-builder-wrapper">
      <YConditionBuilder
        ref="conditionBuilderRef"
        v-model="model"
        :operator-options="operatorOptions"
        :load-fields="loadFields"
        :load-values="args => loadValues({ q: args.q, field: args.field as string })"
        @validate="handleValidate"
      />
      <div class="action-bar">
        <YButton size="small" type="primary" @click="handleManualValidate">提交校验</YButton>
      </div>
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

.action-bar {
  margin-top: var(--spacing-md, 16px);
  display: flex;
  justify-content: flex-end;
  gap: var(--spacing-sm, 8px);
}

.hint-text {
  font-size: 12px;
  color: var(--color-text-tertiary, #86909c);
  margin-right: auto;
  align-self: center;
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
