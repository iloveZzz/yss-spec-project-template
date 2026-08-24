<script setup lang="ts">
import { computed, ref } from 'vue';
import { YButton, YCard, YConditionBuilder, YFormily } from '@yss-ui/components';
import { FORM_OPTIONS } from './constant';
import { useRuleConfig } from './hooks/useRuleConfig';
import { ruleConfigSchema } from './schemas/ruleConfigSchema';

defineOptions({ name: 'AdvancedFormPage' });

/** YFormily 校验实例。 */
interface FormilyRef {
  submit: () => Promise<Record<string, unknown>>;
}

/** YConditionBuilder 校验实例。 */
interface ConditionBuilderRef {
  validate: () => boolean;
}

const formData = ref<Record<string, unknown>>({
  intensity: 'WEAK',
  errorStorage: true,
  errorStorageLimit: 1000,
  errorStorageType: 'FILE_SYSTEM',
});
const schema = computed(() => ruleConfigSchema(FORM_OPTIONS));
const formRef = ref<FormilyRef>();
const filterBuilderRef = ref<ConditionBuilderRef>();
const checkBuilderRef = ref<ConditionBuilderRef>();
const {
  filterCondition,
  checkCondition,
  filterPreview,
  checkPreview,
  loading,
  operatorOptions,
  loadFields,
  generateFilterPreview,
  generateCheckPreview,
} = useRuleConfig();

/** 校验表单与指定条件构建器。 */
const validateBeforeGenerate = async (builder?: ConditionBuilderRef): Promise<boolean> => {
  if (!formRef.value || !builder) return false;
  try {
    await formRef.value.submit();
  } catch {
    return false;
  }
  return builder.validate();
};

/** 校验后生成校验范围预览。 */
const handleGenerateFilterPreview = async (): Promise<void> => {
  if (await validateBeforeGenerate(filterBuilderRef.value)) await generateFilterPreview();
};

/** 校验后生成校验表达式预览。 */
const handleGenerateCheckPreview = async (): Promise<void> => {
  if (await validateBeforeGenerate(checkBuilderRef.value)) await generateCheckPreview();
};
</script>

<template>
  <div class="rule-config-page">
    <YCard class="rule-config-page__content">
      <YFormily ref="formRef" v-model="formData" :schema="schema">
        <template #conditionFilter>
          <YConditionBuilder
            ref="filterBuilderRef"
            v-model="filterCondition"
            :load-fields="loadFields"
            :operator-options="operatorOptions"
          />
        </template>
        <template #filterPreview>
          <div class="rule-config-page__preview">
            <pre>{{ filterPreview || '配置校验范围后生成预览' }}</pre>
            <YButton type="primary" :loading="loading.filterPreview" @click="handleGenerateFilterPreview">
              生成校验范围
            </YButton>
          </div>
        </template>
        <template #checkCondition>
          <YConditionBuilder
            ref="checkBuilderRef"
            v-model="checkCondition"
            :load-fields="loadFields"
            :operator-options="operatorOptions"
          />
        </template>
        <template #checkPreview>
          <div class="rule-config-page__preview">
            <pre>{{ checkPreview || '配置校验表达式后生成预览' }}</pre>
            <YButton type="primary" :loading="loading.checkPreview" @click="handleGenerateCheckPreview">
              生成校验表达式
            </YButton>
          </div>
        </template>
      </YFormily>
    </YCard>
  </div>
</template>

<style scoped lang="less">
@import url('./style.less');
</style>
