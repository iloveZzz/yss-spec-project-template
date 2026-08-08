<template>
  <div>
    <div style="margin-bottom: 12px">
      <RadioGroup v-model:value="mode">
        <RadioButton :value="0">新增</RadioButton>
        <RadioButton :value="1">编辑</RadioButton>
        <RadioButton :value="2">查看</RadioButton>
      </RadioGroup>
    </div>
    <YssFormily
      :key="mode"
      :schema="schema"
      :initial-values="initialValues"
      :mode="mode"
      detail-as="descriptions"
      :detail-options="{ bordered: true }"
    >
      <!-- 自定义组件插槽：富文本/SQL 编辑器等复杂组件均可在此替换 -->
      <template #richEditor="{ field }">
        <div v-if="mode !== 2">
          <textarea
            :value="field.value"
            rows="6"
            style="width: 100%"
            @input="field.setValue(($event.target as HTMLTextAreaElement).value)"
          ></textarea>
        </div>
        <div v-else style="white-space: pre-wrap">
          {{ field.value || '-' }}
        </div>
      </template>
    </YssFormily>
  </div>
</template>

<script setup lang="ts">
import { YssFormily, type ISchema } from '@yss-ui/components';
import { RadioButton, RadioGroup } from 'ant-design-vue';
import { computed, ref } from 'vue';

const mode = ref(2);

const initial = { name: '张三', content: '这是一段富文本/SQL 的示例内容' };
const initialValues = computed(() => (mode.value === 0 ? {} : initial));

const schema: ISchema = {
  type: 'object',
  properties: {
    layout: {
      type: 'void',
      'x-component': 'FormLayout',
      'x-component-props': { layout: 'horizontal', labelWidth: 90 },
      properties: {
        grid: {
          type: 'void',
          'x-component': 'FormGrid',
          properties: {
            name: { type: 'string', title: '姓名', 'x-decorator': 'FormItem', 'x-component': 'Input' },
            content: {
              type: 'string',
              title: '内容',
              'x-decorator': 'FormItem',
              // 使用 Slot 作为自定义组件渲染载体
              'x-component': 'Slot',
              'x-component-props': { name: 'richEditor', params: ['field'] },
              // 查看态描述列表中的文本渲染（可按需替换为富文本预览、代码高亮等）
              'x-preview-format': (v: string) => v || '-',
            },
          },
        },
      },
    },
  },
};
</script>
