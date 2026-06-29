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
      :key="mode + '-' + loaded"
      :schema="schema"
      :initial-values="initialValues"
      :mode="mode"
      detail-as="descriptions"
      :detail-options="{ bordered: true }"
      :scope="{ dicts: { deptOptions } }"
    />
  </div>
</template>

<script setup lang="ts">
import { YssFormily, type ISchema } from '@yss-ui/components';
import { RadioButton, RadioGroup } from 'ant-design-vue';
import { computed, onMounted, ref } from 'vue';

const mode = ref(2);

// 远程字典（模拟接口）
type Option = { label: string; value: number };
const deptOptions = ref<Option[]>([]);
const deptMap = ref<Record<number, string>>({});
const loaded = ref(false);

const fetchDept = async () => {
  // 模拟接口
  const list: Option[] = await new Promise(resolve =>
    setTimeout(
      () =>
        resolve([
          { label: '研发部', value: 1 },
          { label: '产品部', value: 2 },
          { label: '设计部', value: 3 },
        ]),
      200
    )
  );
  deptOptions.value = list;
  deptMap.value = Object.fromEntries(list.map(i => [i.value, i.label]));
  loaded.value = true;
};
onMounted(fetchDept);

const initial = { name: '张三', deptId: 2 };
const initialValues = computed(() => (mode.value === 0 ? {} : initial));

const deptLabel = (v?: number) => (v === null ? '-' : (deptMap.value[v] ?? '-'));

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
            deptId: {
              type: 'number',
              title: '部门',
              'x-decorator': 'FormItem',
              'x-component': 'Select',
              // 远程字典通过 scope 注入，保证编辑时选项来源于接口
              enum: '{{ dicts.deptOptions }}',
              // 查看态翻译：优先走字段级 x-preview-format
              'x-preview-format': (v: number) => deptLabel(v),
            },
          },
        },
      },
    },
  },
};
</script>
