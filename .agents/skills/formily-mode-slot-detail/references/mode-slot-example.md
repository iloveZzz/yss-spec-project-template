## 标准代码骨架

```vue
<script setup lang="ts">
import { YMonaco, YFormily, type ISchema } from '@yss-ui/components';
import { ref } from 'vue';

/** YFormily 业务模式。 */
type FormMode = 0 | 1 | 2;

/** 当前表单模式。 */
const mode = ref<FormMode>(0);

/** 编辑和查看回填值。 */
const initialValues = {
  user: { email: 'user@example.com' },
  sql: 'select * from users',
};

/** 编辑与详情共用的 Schema。 */
const schema: ISchema = {
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
          properties: {
            user: {
              type: 'object',
              properties: {
                email: {
                  type: 'string',
                  title: '邮箱',
                  'x-decorator': 'FormItem',
                  'x-component': 'Input',
                },
              },
            },
            sql: {
              type: 'string',
              title: 'SQL',
              'x-decorator': 'FormItem',
              'x-decorator-props': { gridSpan: 2 },
              'x-component': 'Slot',
              'x-component-props': { name: 'sql' },
            },
          },
        },
      },
    },
  },
};
</script>

<template>
  <YFormily
    :schema="schema"
    :initial-values="initialValues"
    :mode="mode"
    :detail-options="{ bordered: true, maxColumns: 3, minColumns: 1, minWidth: 260 }"
  >
    <template #sql="{ value, onChange }">
      <YMonaco :model-value="value" language="sql" @change="onChange" />
    </template>

    <template #detail-user-email="{ value }">
      <a :href="`mailto:${value}`">{{ value }}</a>
    </template>

    <template #detail-sql="{ value }">
      <YMonaco :model-value="value" language="sql" readonly />
    </template>
  </YFormily>
</template>
```
