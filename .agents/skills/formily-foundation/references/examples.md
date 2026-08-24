# YFormily 代码示例库

本参考只保留可直接复用且已与当前源码核对的模式。基础 Props、实例方法与详情配置以最新 `llms-full.txt` 和 `packages/components/src/formily` 为准；不要从旧 demo 推断未公开 API。

## 目录

1. [基础表单与提交](#1-基础表单与提交)
2. [表达式显隐与禁用](#2-表达式显隐与禁用)
3. [x-reactions 级联选项](#3-x-reactions-级联选项)
4. [新增编辑查看与双通道插槽](#4-新增编辑查看与双通道插槽)
5. [Schema Slot 自定义字段](#5-schema-slot-自定义字段)
6. [分步表单路由](#6-分步表单路由)
7. [动态 Schema 与动态插槽](#7-动态-schema-与动态插槽)
8. [Orval 提交与错误处理](#8-orval-提交与错误处理)

## 1. 基础表单与提交

`Submit` 必须通过表达式拿到 `onSubmit`。业务列表查询区不使用 schema 内按钮组，查询/重置按钮应放到外部操作区。

```vue
<script setup lang="ts">
import { YFormily, type ISchema } from '@yss-ui/components';

/** 表单提交事件。 */
const emit = defineEmits<{ submit: [values: Record<string, any>] }>();

/** 校验通过后向上层提交。 */
const onSubmit = (values: Record<string, any>) => {
  emit('submit', values);
};

/** 纯 Formily 表单 Schema。 */
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
            name: {
              type: 'string',
              title: '姓名',
              required: true,
              'x-decorator': 'FormItem',
              'x-component': 'Input',
              'x-component-props': { placeholder: '请输入姓名', allowClear: true },
              'x-validator': [
                { required: true, whitespace: true, message: '请输入姓名' },
                {
                  validator: (value: string) => {
                    const str = (value || '').trim();
                    if (!str) return true;
                    if (str.length < 2 || str.length > 50) return '姓名长度需在2到50之间';
                    return true;
                  },
                },
              ],
            },
            gender: {
              type: 'string',
              title: '性别',
              enum: [
                { label: '男', value: 'male' },
                { label: '女', value: 'female' },
              ],
              'x-decorator': 'FormItem',
              'x-component': 'Select',
            },
            actions: {
              type: 'void',
              'x-decorator': 'FormItem',
              'x-decorator-props': { gridSpan: 2, colon: false },
              'x-component': 'AutoButtonGroup',
              properties: {
                reset: { type: 'void', 'x-component': 'Reset', 'x-content': '重置' },
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
    },
  },
};
</script>

<template>
  <YFormily :schema="schema" :scope="{ onSubmit }" :initial-values="{ gender: 'male' }" />
</template>
```

## 2. 表达式显隐与禁用

只依赖 `$values` 的显隐和禁用直接写表达式，初始化和后续变更都会生效，不要为此创建 `effects`。

```vue
<script setup lang="ts">
import { YFormily, type ISchema } from '@yss-ui/components';

/** 简单表达式联动 Schema。 */
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
            needCompany: {
              type: 'boolean',
              title: '是否任职',
              'x-decorator': 'FormItem',
              'x-component': 'Switch',
            },
            companyName: {
              type: 'string',
              title: '公司名称',
              required: true,
              'x-decorator': 'FormItem',
              'x-component': 'Input',
              'x-visible': '{{ $values.needCompany === true }}',
            },
            systemCode: {
              type: 'string',
              title: '系统编码',
              'x-decorator': 'FormItem',
              'x-component': 'Input',
              'x-disabled': '{{ $values.needCompany === false }}',
            },
          },
        },
      },
    },
  },
};
</script>

<template>
  <YFormily :schema="schema" :initial-values="{ needCompany: false }" />
</template>
```

## 3. x-reactions 级联选项

级联项更新时，仅当旧值不在新选项中才清空。无条件 `field.value = undefined` 会破坏合法回填值。

```vue
<script setup lang="ts">
import { YFormily, type Field, type ISchema } from '@yss-ui/components';

/** 城市选项。 */
interface CityOption {
  label: string;
  value: string;
}

/** 省份到城市的静态映射。 */
const cityMap: Record<string, CityOption[]> = {
  zhejiang: [{ label: '杭州', value: 'hangzhou' }],
  jiangsu: [{ label: '南京', value: 'nanjing' }],
};

/** 基于省份同步当前城市字段。 */
const syncCityReaction = (field: Field) => {
  const province = field.query('province').get('value') as string | undefined;
  const options = province ? cityMap[province] ?? [] : [];
  field.dataSource = options;
  if (!options.some(item => item.value === field.value)) field.value = undefined;
};

/** 级联选择 Schema。 */
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
            province: {
              type: 'string',
              title: '省份',
              enum: [
                { label: '浙江', value: 'zhejiang' },
                { label: '江苏', value: 'jiangsu' },
              ],
              'x-decorator': 'FormItem',
              'x-component': 'Select',
            },
            city: {
              type: 'string',
              title: '城市',
              'x-decorator': 'FormItem',
              'x-component': 'Select',
              'x-reactions': syncCityReaction,
            },
          },
        },
      },
    },
  },
};
</script>

<template>
  <YFormily :schema="schema" :initial-values="{ province: 'zhejiang', city: 'hangzhou' }" />
</template>
```

需要首屏与变更都执行的表单级副作用时，读取 `../../formily-linkage-effects/SKILL.md`，成对使用 `onFieldInit` 与 `onFieldValueChange`。

## 4. 新增编辑查看与双通道插槽

`mode=2` 直接进入 Descriptions；不存在 `detail-as` 开关。默认响应式详情用 `maxColumns/minColumns/minWidth`，`columns` 只在 `responsive: false` 时生效。

```vue
<script setup lang="ts">
import { YMonaco, YFormily, type ISchema } from '@yss-ui/components';
import { ref } from 'vue';

/** 表单模式。 */
type FormMode = 0 | 1 | 2;

/** 当前模式。 */
const mode = ref<FormMode>(1);
/** 编辑与查看回填值。 */
const initialValues = { user: { email: 'user@example.com' }, sql: 'select 1' };
/** 三态共用 Schema。 */
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
    :key="mode"
    :schema="schema"
    :initial-values="initialValues"
    :mode="mode"
    :detail-options="{ bordered: true, maxColumns: 2, minColumns: 1, minWidth: 320 }"
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

## 5. Schema Slot 自定义字段

`value/onChange` 默认注入；只有确实需要 `field` 或全表值时才配置 `params: ['field', '$values']`。

```vue
<script setup lang="ts">
import { YButton, YFormily, type ISchema } from '@yss-ui/components';
import { Input as AInput } from 'ant-design-vue';

/** 模拟选人并把主键写回字段。 */
const selectUser = (onChange: (value?: string) => void) => {
  onChange('user-001');
};

/** 自定义选人字段 Schema。 */
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
            category: {
              type: 'string',
              title: '分类',
              'x-decorator': 'FormItem',
              'x-component': 'Input',
            },
            userId: {
              type: 'string',
              title: '关联用户',
              'x-decorator': 'FormItem',
              'x-component': 'Slot',
              'x-component-props': { name: 'userSelector', params: ['$values'] },
            },
          },
        },
      },
    },
  },
};
</script>

<template>
  <YFormily :schema="schema">
    <template #userSelector="{ value, onChange, values }">
      <AInput :value="value" readonly />
      <YButton @click="selectUser(onChange)">选择用户</YButton>
      <YButton v-if="value" @click="onChange(undefined)">清除</YButton>
      <span>当前分类：{{ values.category ?? '无' }}</span>
    </template>
  </YFormily>
</template>
```

## 6. 分步表单路由

完整实现读取 `../../formily-step-flow/SKILL.md`，必须遵循以下边界：

- 从 `ant-design-vue` 导入 `Steps as ASteps`；组件库没有 `YSteps`。
- 每步使用独立 YFormily ref 与 `v-model`，统一收敛到一个 `reactive` 数据源。
- `await formRef.submit()` 成功后前进，校验失败会 reject；不要写 `ok !== false`。
- 确认步骤读取前序数据的 `computed` 聚合，不要绑定空的 `step3`。
- 最终提交只聚合真实业务步骤；API 错误交给 `mutator.ts` 提示。

## 7. 动态 Schema 与动态插槽

动态 schema 优先由 `computed` 派生，避免在 `onMounted` 中清空后原地修改深层 `properties`。

```vue
<script setup lang="ts">
import { YMonaco, YFormily, type ISchema } from '@yss-ui/components';
import { computed, ref } from 'vue';

/** 后端动态字段描述。 */
interface PluginParam {
  field: string;
  name: string;
  type: 'string' | 'boolean' | 'input-code';
  required?: boolean;
}

/** 动态字段配置。 */
const pluginParams = ref<PluginParam[]>([
  { field: 'tableName', name: '表名', type: 'string', required: true },
  { field: 'enabled', name: '是否启用', type: 'boolean' },
  { field: 'customSql', name: '自定义 SQL', type: 'input-code', required: true },
]);
/** 动态表单值。 */
const formValues = ref<Record<string, any>>({});

/** 将动态字段描述转换为 Formily 字段节点。 */
const createFieldSchema = (param: PluginParam): ISchema => ({
  type: param.type === 'boolean' ? 'boolean' : 'string',
  title: param.name,
  required: param.required ?? false,
  'x-decorator': 'FormItem',
  'x-component': param.type === 'boolean' ? 'Switch' : param.type === 'input-code' ? 'Slot' : 'Input',
  'x-component-props': param.type === 'input-code' ? { name: `${param.field}Slot` } : { placeholder: `请输入${param.name}` },
});

/** 动态字段名到 Schema 的映射。 */
const dynamicProperties = computed<Record<string, ISchema>>(() =>
  Object.fromEntries(pluginParams.value.map(param => [param.field, createFieldSchema(param)]))
);
/** 完整动态表单 Schema。 */
const schema = computed<ISchema>(() => ({
  type: 'object',
  properties: {
    layout: {
      type: 'void',
      'x-component': 'FormLayout',
      'x-component-props': { layout: 'vertical' },
      properties: {
        grid: {
          type: 'void',
          'x-component': 'FormGrid',
          'x-component-props': { maxColumns: 1, minColumns: 1, minWidth: 260 },
          properties: dynamicProperties.value,
        },
      },
    },
  },
}));
/** 需要代码编辑器插槽的字段名。 */
const codeEditorFields = computed(() =>
  pluginParams.value.filter(param => param.type === 'input-code').map(param => param.field)
);
</script>

<template>
  <YFormily v-model="formValues" :schema="schema">
    <template v-for="fieldKey in codeEditorFields" :key="fieldKey" #[`${fieldKey}Slot`]="{ value, onChange }">
      <YMonaco :model-value="value" language="sql" :height="160" @change="onChange" />
    </template>
  </YFormily>
</template>
```

## 8. Orval 提交与错误处理

底层 `mutator.ts` 已对网络错误和 `success === false` 统一执行 `message.error` 并 reject。业务提交只处理成功动作与 loading，不写重复失败提示。若需要统一提示 Formily 客户端校验失败，使用 `onFormSubmitValidateFailed`；不要在会同时接收 API reject 的 `onFormSubmitFailed` 或 `Submit.onSubmitFailed` 中调用 `message.error`。

```typescript
import { message } from 'ant-design-vue';
import { ref } from 'vue';

/** 保存状态。 */
const saving = ref(false);

/** 提交表单；saveRecord 代表项目中实际生成的 Orval 方法。 */
const handleSubmit = async (values: Record<string, any>) => {
  saving.value = true;
  try {
    await saveRecord(values);
    message.success('保存成功');
    emit('success');
  } finally {
    saving.value = false;
  }
};
```

禁止以下模式：

- `if (res.success) { ... } else { message.error(...) }`
- `catch (error) { message.error(...) }`
- API reject 后仍继续关闭弹窗、切换步骤或刷新成功态

如果必须做回滚，可以在 `catch` 中回滚后继续 `throw error`，但仍不重复提示。
