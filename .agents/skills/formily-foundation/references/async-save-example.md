# 异步保存回调

等待父回调完成的保存场景读取本例。`onSubmit` 必须返回实际保存 Promise；发送 `emit` 事件只返回 void，不能等待父组件的异步请求。

Orval 请求失败沿用 [错误处理](examples.md#8-orval-提交与错误处理)，由 mutator 统一提示，调用方恢复 loading 并传播 reject。

```vue
<script setup lang="ts">
import { YFormily, type ISchema } from '@yss-ui/components';

/** 表单保存回调 Props。 */
interface SaveFormProps {
  onSave: (values: Record<string, any>) => Promise<void>;
}

/** 表单保存回调。 */
const props = defineProps<SaveFormProps>();

/** 校验通过后提交表单数据。 */
const onSubmit = (values: Record<string, any>) => {
  return props.onSave(values);
};

/** 基础表单 Schema。 */
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
          'x-component-props': { maxColumns: 3, minColumns: 1, minWidth: 260 },
          properties: {
            name: { type: 'string', title: '名称', 'x-decorator': 'FormItem', 'x-component': 'Input', required: true, 'x-validator': [{ required: true, whitespace: true, message: '请输入名称' }] },
            submit: {
              type: 'void',
              'x-component': 'Submit',
              'x-content': '提交',
              'x-component-props': { onSubmit: '{{ onSubmit }}' },
            },
          },
        },
      },
    },
  },
};
</script>

<template>
  <YFormily :schema="schema" :scope="{ onSubmit }" />
</template>
```

