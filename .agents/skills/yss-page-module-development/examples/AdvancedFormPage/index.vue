<script setup lang="ts">
import { onMounted, computed, ref, reactive } from 'vue';
import { Steps, Spin } from 'ant-design-vue';
import { YCard, YButton, YConditionBuilder, YFormily } from '@yss-ui/components';
import { QUALITY_RULE_STEPS, RULE_STEPS } from './constant';
import { ruleConfigSchema } from './schemas/ruleConfigSchema';
import { useRuleConfig } from './hooks/useRuleConfig';

defineOptions({ name: 'AdvancedFormPage' });

// 状态管理
const currentStep = ref(RULE_STEPS.RULE_CONFIG);
const formData = ref<any>({
  intensity: 'WEAK',
  errorStorage: true,
  errorStorageLimit: 1000,
  errorStorageType: 'FILE_SYSTEM',
});

// 表单选项
const formOptions = reactive({
  intensity: [
    { label: '弱规则', value: 'WEAK' },
    { label: '强规则', value: 'STRONG' },
  ],
  errorStorageType: [
    { label: '文件服务', value: 'FILE_SYSTEM' },
    { label: '数据落地表', value: 'DATATABLE_SYSTEM' },
  ],
});

// 引入业务 Hook
const {
  conditionData,
  sqlFieldValue,
  checkConditionData,
  checkSqlFieldValue,
  ruleOperatorOptions,
  getFilterFields,
  getCheckFields,
  handleGenerateSqlCondition,
  handleGenerateCheckSqlCondition,
  loading: ruleConfigLoading,
  loadRuleOperatorOptions,
} = useRuleConfig();

// Refs
const ruleConfigFormRef = ref();
const conditionFilterRef = ref();
const checkConditionRef = ref();

// 初始化
onMounted(() => {
  loadRuleOperatorOptions();
});

// 计算属性：Schema
const ruleConfigSchemaComputed = computed(() => ruleConfigSchema(formOptions));

// 按钮事件处理
/**
 * 生成校验范围SQL（带前置表单校验）
 * CRITICAL: 必须先触发表单校验，通过后再执行业务逻辑
 */
const handleGenerateSqlConditionWithValidate = async () => {
  // 1. 先触发 YFormily 表单校验
  const formValid = await ruleConfigFormRef.value?.submit();
  if (!formValid) {
    // 表单校验失败，YFormily 会自动显示错误信息
    return;
  }

  // 2. 再校验条件构建器本身（如果有）
  const isValid = conditionFilterRef.value?.validate?.() ?? true;
  if (!isValid) {
    return;
  }

  // 3. 调用生成逻辑
  await handleGenerateSqlCondition();
};

/**
 * 生成校验表达式SQL（带前置表单校验）
 */
const handleGenerateCheckSqlConditionWithValidate = async () => {
  // 同样的逻辑
  const formValid = await ruleConfigFormRef.value?.submit();
  if (!formValid) return;

  const isValid = checkConditionRef.value?.validate?.() ?? true;
  if (!isValid) return;

  await handleGenerateCheckSqlCondition();
};
</script>

<template>
  <div class="complex-form-create">
    <!-- 1. 步骤条 -->
    <YCard class="steps-card">
      <Steps :current="currentStep - 1">
        <Steps.Step v-for="item in QUALITY_RULE_STEPS" :key="item.value" :title="item.title" />
      </Steps>
    </YCard>

    <!-- 2. 表单内容区 -->
    <YCard class="content-card">
      <!-- 这里只展示第二步：规则配置 -->
      <div v-show="currentStep === RULE_STEPS.RULE_CONFIG">
        <YFormily ref="ruleConfigFormRef" v-model="formData" :schema="ruleConfigSchemaComputed">
          <!-- 插槽1：校验范围构建器 -->
          <template #conditionFilter>
            <YConditionBuilder
              ref="conditionFilterRef"
              v-model="conditionData"
              :load-fields="getFilterFields"
              :operator-options="ruleOperatorOptions"
            />
          </template>

          <!-- 插槽2：SQL 预览区 -->
          <template #sqlField>
            <div class="sql-preview-section">
              <div class="sql-preview-content">
                <pre v-if="sqlFieldValue" class="sql-code">{{ sqlFieldValue }}</pre>
                <div v-else class="sql-placeholder">
                  <span>SQL预览（配置校验范围后自动生成）</span>
                </div>
              </div>
              <div class="sql-preview-actions">
                <YButton
                  type="primary"
                  :loading="ruleConfigLoading.generateSqlCondition"
                  @click="handleGenerateSqlConditionWithValidate"
                >
                  生成校验范围
                </YButton>
              </div>
            </div>
          </template>

          <!-- 插槽3：校验配置构建器 -->
          <template #checkCondition>
            <YConditionBuilder
              ref="checkConditionRef"
              v-model="checkConditionData"
              :load-fields="getCheckFields"
              :operator-options="ruleOperatorOptions"
            />
          </template>

          <!-- 插槽4：校验SQL 预览区 -->
          <template #checkSqlField>
            <div class="sql-preview-section">
              <!-- 复用样式结构，实际项目中可封装为组件 -->
              <div class="sql-preview-content">
                <pre v-if="checkSqlFieldValue" class="sql-code">{{ checkSqlFieldValue }}</pre>
                <div v-else class="sql-placeholder">
                  <span>SQL预览（配置校验表达式后自动生成）</span>
                </div>
              </div>
              <div class="sql-preview-actions">
                <YButton
                  type="primary"
                  :loading="ruleConfigLoading.generateCheckSqlCondition"
                  @click="handleGenerateCheckSqlConditionWithValidate"
                >
                  生成校验表达式
                </YButton>
              </div>
            </div>
          </template>
        </YFormily>
      </div>
    </YCard>

    <!-- 3. 底部按钮 -->
    <div class="footer-actions">
      <YButton>上一步</YButton>
      <YButton type="primary">完成</YButton>
    </div>
  </div>
</template>

<style lang="less" scoped>
@import './style.less';
</style>
