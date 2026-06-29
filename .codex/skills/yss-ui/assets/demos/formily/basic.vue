<template>
  <div>
    <YssFormily :schema="schema" :initial-values="initialValues" :scope="scope">
      <template #agreeSlot="{ field }">
        <a-checkbox v-model:checked="field.value">我已阅读并同意</a-checkbox>
      </template>
    </YssFormily>
  </div>
</template>
<script setup lang="ts">
import { YssFormily, type ISchema } from '@yss-ui/components';
import { Checkbox as ACheckbox, message } from 'ant-design-vue';
// 全局注册标签名给 dumi/示例用（若项目有全局注册可移除）
const aCheckbox = ACheckbox;

const initialValues = {
  userType: 'personal',
  status: true,
  agree: true,
  hobbies: ['read'],
};

/**
 * 查询（带校验必填项）
 */
const handleQuery = async (values: Record<string, any>) => {
  message.success(JSON.stringify(values));
};

/**
 * 作用域注入
 */
const scope = {
  handleQuery,
};

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
          // 默认三列，具备响应式能力：窄屏降级为两列/一列
          // 'x-component-props': { maxColumns: 3, minColumns: 1, columnGap: 16, rowGap: 0, minWidth: 260 },
          properties: {
            userType: {
              type: 'string',
              title: '用户类型',
              'x-decorator': 'FormItem',
              'x-component': 'Radio.Group',
              enum: [
                { label: '个人', value: 'personal' },
                { label: '企业', value: 'company' },
              ],
              'x-decorator-props': { gridSpan: 1 },
            },
            name: {
              type: 'string',
              title: '姓名',
              required: true,
              'x-decorator': 'FormItem',
              'x-component': 'Input',
              'x-visible': "{{ $values.userType === 'personal' }}",
              'x-decorator-props': { gridSpan: 1 },
            },
            companyName: {
              type: 'string',
              title: '公司名称',
              'x-decorator': 'FormItem',
              'x-component': 'Input',
              'x-visible': "{{ $values.userType === 'company' }}",
              'x-decorator-props': { gridSpan: 1 },
            },
            age: {
              type: 'number',
              title: '年龄',
              'x-decorator': 'FormItem',
              'x-component': 'Input',
              'x-disabled': '{{ $values.status === false }}',
              'x-decorator-props': { gridSpan: 1 },
            },
            status: {
              type: 'boolean',
              title: '状态',
              'x-decorator': 'FormItem',
              'x-component': 'Switch',
              'x-decorator-props': { gridSpan: 1 },
            },

            agree: {
              type: 'boolean',
              title: '同意协议',
              'x-decorator': 'FormItem',
              // 使用自定义插槽渲染，避开 onChange 合并问题
              'x-component': 'Slot',
              'x-component-props': { name: 'agreeSlot', params: ['field'] },
              'x-decorator-props': { gridSpan: 1 },
            },
            hobbies: {
              type: 'array',
              title: '兴趣',
              'x-decorator': 'FormItem',
              'x-component': 'Checkbox.Group',
              enum: [
                { label: '阅读', value: 'read' },
                { label: '运动', value: 'sport' },
                { label: '音乐', value: 'music' },
              ],
              'x-decorator-props': { gridSpan: 1 },
            },
            level: {
              type: 'number',
              title: '熟练度',
              'x-decorator': 'FormItem',
              'x-component': 'Slider',
              'x-decorator-props': { gridSpan: 1 },
            },
            visitTime: {
              type: 'string',
              title: '到访时间',
              'x-decorator': 'FormItem',
              'x-component': 'TimePicker',
              'x-decorator-props': { gridSpan: 1 },
            },
            city: {
              type: 'string',
              title: '城市',
              'x-decorator': 'FormItem',
              'x-component': 'Select',
              enum: [
                { label: '北京', value: 'beijing' },
                { label: '上海', value: 'shanghai' },
                { label: '广州', value: 'guangzhou' },
              ],
              'x-decorator-props': { gridSpan: 1 },
            },
            // 仅日期（YYYY-MM-DD）
            date: {
              type: 'string',
              title: '日期',
              'x-decorator': 'FormItem',
              'x-component': 'DatePicker',
              'x-component-props': { valueFormat: 'YYYY-MM-DD' },
              'x-decorator-props': { gridSpan: 1 },
            },
            // 日期+时间
            datetime: {
              type: 'string',
              title: '日期时间',
              'x-decorator': 'FormItem',
              'x-component': 'DatePicker',
              'x-component-props': { showTime: true, valueFormat: 'YYYY-MM-DD HH:mm:ss' },
              'x-decorator-props': { gridSpan: 1 },
            },
            // 日期范围
            daterange: {
              type: 'array',
              title: '日期范围',
              'x-decorator': 'FormItem',
              'x-component': 'DatePicker.RangePicker',
              'x-component-props': { valueFormat: 'YYYY-MM-DD' },
              'x-decorator-props': { gridSpan: 2 },
            },
            // 月份
            month: {
              type: 'string',
              title: '月份',
              'x-decorator': 'FormItem',
              'x-component': 'DatePicker',
              'x-component-props': { picker: 'month', valueFormat: 'YYYY-MM' },
              'x-decorator-props': { gridSpan: 1 },
            },
            // 仅时分秒（你已有 visitTime，可保留二选一）
            timeOnly: {
              type: 'string',
              title: '时间',
              'x-decorator': 'FormItem',
              'x-component': 'TimePicker',
              'x-component-props': { valueFormat: 'HH:mm:ss' },
              'x-decorator-props': { gridSpan: 1 },
            },
            // 数字输入
            amount: {
              type: 'number',
              title: '金额',
              'x-decorator': 'FormItem',
              'x-component': 'InputNumber',
              'x-component-props': { min: 0, precision: 2 },
              'x-decorator-props': { gridSpan: 1 },
            },
            // 密码
            password: {
              type: 'string',
              title: '密码',
              'x-decorator': 'FormItem',
              'x-component': 'Password',
              'x-decorator-props': { gridSpan: 1 },
            },
            // 评分（业务层自定义适配的 Rate）
            score: {
              type: 'number',
              title: '评分',
              'x-decorator': 'FormItem',
              'x-component': 'Rate',
              'x-decorator-props': { gridSpan: 1 },
            },
            // 上传（Demo 用，生产建议二次封装）
            attachment: {
              type: 'array',
              title: '附件',
              'x-decorator': 'FormItem',
              'x-component': 'Upload',
              'x-component-props': {
                action: 'https://jsonplaceholder.typicode.com/posts/',
                multiple: true,
                listType: 'text',
              },
              'x-decorator-props': { gridSpan: 2 },
            },
            // 树选择
            dept: {
              type: 'string',
              title: 'TreeSelect',
              'x-decorator': 'FormItem',
              'x-component': 'TreeSelect',
              'x-component-props': {
                treeDefaultExpandAll: true,
                treeData: [
                  {
                    title: '总部',
                    value: 'hq',
                    children: [
                      { title: '研发', value: 'rd' },
                      { title: '市场', value: 'mk' },
                    ],
                  },
                ],
              },
              'x-decorator-props': { gridSpan: 1 },
            },
            // 级联
            region: {
              type: 'array',
              title: 'Cascader',
              'x-decorator': 'FormItem',
              'x-component': 'Cascader',
              'x-component-props': {
                options: [
                  { label: '浙江', value: 'zj', children: [{ label: '杭州', value: 'hz' }] },
                  { label: '江苏', value: 'js', children: [{ label: '南京', value: 'nj' }] },
                ],
              },
              'x-decorator-props': { gridSpan: 1 },
            },
            // 输入框组（InputGroup / Compact）
            inputGroup: {
              type: 'void',
              title: '输入框组',
              'x-decorator': 'FormItem',
              'x-component': 'InputGroup',
              'x-decorator-props': { gridSpan: 1 },
              properties: {
                groupType: {
                  type: 'string',
                  'x-component': 'Select',
                  'x-component-props': {
                    options: [
                      { label: 'Zhejiang', value: 'Zhejiang' },
                      { label: 'Jiangsu', value: 'Jiangsu' },
                    ],
                    style: { width: '120px' },
                  },
                },
                groupContent: {
                  type: 'string',
                  'x-component': 'Input',
                  'x-component-props': {
                    style: { width: '50%' },
                    placeholder: '请输入',
                  },
                },
              },
            },
          },
        },
        // 查询/重置 按钮组（放在 grid 外面，独占一行，右对齐）
        actions: {
          type: 'void',
          'x-decorator': 'FormItem',
          'x-decorator-props': { colon: false },
          'x-component': 'AutoButtonGroup',
          properties: {
            query: {
              type: 'void',
              'x-component': 'Submit',
              'x-content': '查询',
              'x-component-props': {
                onSubmit: '{{ handleQuery }}',
              },
            },
            reset: {
              type: 'void',
              'x-component': 'Reset',
              'x-content': '重置',
            },
          },
        },
      },
    },
  },
};
</script>
