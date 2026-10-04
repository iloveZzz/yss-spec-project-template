## 标准代码骨架

```vue
<script setup lang="ts">
import { YButton, YFormily, type ISchema } from '@yss-ui/components';
import { Steps as ASteps } from 'ant-design-vue';
import { computed, reactive, ref } from 'vue';

/** YFormily 对外提交能力。 */
interface YssFormilyExpose {
  submit: () => Promise<Record<string, any>>;
}

/** 分步表单数据。 */
interface StepFormData {
  step1: { name: string };
  step2: { level: string };
}

/** 分步表单提交回调 Props。 */
interface StepFlowProps {
  onSubmit: (values: StepFormData) => Promise<void>;
}

/** 分步表单提交回调。 */
const props = defineProps<StepFlowProps>();
/** 当前步骤，从 0 开始。 */
const currentStep = ref(0);
/** 最终提交状态。 */
const submitting = ref(false);
/** 第一步表单实例。 */
const step1Ref = ref<YssFormilyExpose>();
/** 第二步表单实例。 */
const step2Ref = ref<YssFormilyExpose>();
/** 步骤导航配置。 */
const stepItems = [{ title: '基础信息' }, { title: '策略配置' }, { title: '确认提交' }];
/** 跨步唯一数据源。 */
const formData = reactive<StepFormData>({
  step1: { name: '' },
  step2: { level: 'normal' },
});

/** 创建符合业务三层布局约定的步骤 Schema。 */
const createStepSchema = (properties: Record<string, ISchema>): ISchema => ({
  type: 'object',
  properties: {
    layout: {
      type: 'void',
      'x-component': 'FormLayout',
      'x-component-props': { layout: 'horizontal', labelWidth: 120, labelAlign: 'right' },
      properties: {
        grid: {
          type: 'void',
          'x-component': 'FormGrid',
          'x-component-props': { maxColumns: 2, minColumns: 1, minWidth: 320 },
          properties,
        },
      },
    },
  },
});

/** 第一步 Schema。 */
const step1Schema = createStepSchema({
  name: {
    type: 'string',
    title: '任务名称',
    required: true,
    'x-validator': [{ required: true, whitespace: true, message: '请输入任务名称' }],
    'x-decorator': 'FormItem',
    'x-component': 'Input',
  },
});
/** 第二步 Schema。 */
const step2Schema = createStepSchema({
  level: {
    type: 'string',
    title: '策略等级',
    required: true,
    enum: [
      { label: '普通', value: 'normal' },
      { label: '严格', value: 'strict' },
    ],
    'x-decorator': 'FormItem',
    'x-component': 'Select',
  },
});
/** 确认步骤 Schema。 */
const confirmSchema = createStepSchema({
  name: { type: 'string', title: '任务名称', 'x-decorator': 'FormItem', 'x-component': 'Input' },
  level: { type: 'string', title: '策略等级', 'x-decorator': 'FormItem', 'x-component': 'Input' },
});
/** 确认步骤展示数据。 */
const confirmValues = computed(() => ({ name: formData.step1.name, level: formData.step2.level }));

/** 校验当前步骤，成功后前进。 */
const next = async () => {
  const currentRef = currentStep.value === 0 ? step1Ref.value : step2Ref.value;
  if (!currentRef) return;
  try {
    await currentRef.submit();
    currentStep.value += 1;
  } catch {
    return;
  }
};

/** 返回上一步。 */
const back = () => {
  currentStep.value = Math.max(0, currentStep.value - 1);
};

/** 提交全部步骤数据。 */
const submitAll = async () => {
  submitting.value = true;
  try {
    await props.onSubmit({ step1: { ...formData.step1 }, step2: { ...formData.step2 } });
  } finally {
    submitting.value = false;
  }
};
</script>

<template>
  <ASteps :current="currentStep" :items="stepItems" />

  <YFormily v-if="currentStep === 0" ref="step1Ref" v-model="formData.step1" :schema="step1Schema" />
  <YFormily v-else-if="currentStep === 1" ref="step2Ref" v-model="formData.step2" :schema="step2Schema" />
  <YFormily
    v-else
    :schema="confirmSchema"
    :initial-values="confirmValues"
    :mode="2"
    :detail-options="{ bordered: true, maxColumns: 2, minColumns: 1, minWidth: 320 }"
  />

  <YButton :disabled="currentStep === 0" @click="back">上一步</YButton>
  <YButton v-if="currentStep < 2" type="primary" @click="next">下一步</YButton>
  <YButton v-else type="primary" :loading="submitting" @click="submitAll">提交</YButton>
</template>
```

当 schema、步骤状态和页面编排难以独立理解或验证时，分别拆到 `constant.ts`、`hooks/useStepFlow.ts`；以职责清晰和状态可测试为准，不按固定行数拆分。
