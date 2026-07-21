/**
 * 规则配置表单Schema
 * 包含：Grid布局、表单分组、字段联动 (Reactions)、Slot插槽
 */
import type { FormOptions } from '../constant';

/**
 * 规则配置Schema
 * @param formOptions 表单选项数据
 */
export const ruleConfigSchema = (formOptions: FormOptions): Record<string, any> => ({
  type: 'object',
  properties: {
    layout: {
      type: 'void',
      'x-component': 'FormLayout',
      'x-component-props': {
        layout: 'horizontal',
        labelWidth: 110, // ← 根据最长 label 确定（一般 5 个字约 100px，这里稍大）
        labelAlign: 'right', // ← 必须右对齐
      },
      properties: {
        grid: {
          type: 'void',
          'x-component': 'FormGrid',
          'x-component-props': {
            maxColumns: 3,
            minColumns: 1,
            columnGap: 16,
            rowGap: 0,
          },
          properties: {
            // -------------------------------------------------------------
            // 分组1：规则配置
            // -------------------------------------------------------------
            ruleConfigHeader: {
              type: 'void',
              title: '规则配置',
              'x-decorator': 'FormItem',
              'x-decorator-props': {
                feedbackLayout: 'none',
                colon: false,
                gridSpan: 3,
                labelWidth: 0,
                wrapperCol: { span: 24 },
              },
              'x-component': 'GroupHeader', // 自定义组件 or 标题组件
            },
            intensity: {
              type: 'string',
              title: '规则强度',
              required: true,
              'x-decorator': 'FormItem',
              'x-component': 'Radio.Group',
              enum: formOptions.intensity,
            },
            // 开关字段，控制其他字段显示
            errorStorage: {
              type: 'boolean',
              title: '异常存储',
              required: true,
              'x-decorator': 'FormItem',
              'x-component': 'Switch',
              'x-component-props': {
                checkedChildren: '开',
                unCheckedChildren: '关',
              },
            },
            // 受控字段：异常限制 (当 errorStorage=true 时显示)
            errorStorageLimit: {
              type: 'number',
              title: '异常限制',
              'x-decorator': 'FormItem',
              'x-component': 'InputNumber',
              'x-component-props': {
                placeholder: '请输入异常限制',
                style: { width: '100%' },
              },
              'x-reactions': {
                dependencies: ['errorStorage'],
                fulfill: {
                  state: {
                    visible: '{{$deps[0]}}',
                  },
                },
              },
            },

            // -------------------------------------------------------------
            // 分组2：异常数据存储
            // 这里的 GroupHeader 本身也受 errorStorage 控制显示
            // -------------------------------------------------------------
            exceptionDataHeader: {
              type: 'void',
              title: '异常数据存储',
              'x-decorator': 'FormItem',
              'x-decorator-props': {
                feedbackLayout: 'none',
                colon: false,
                gridSpan: 3,
                labelWidth: 0,
                wrapperCol: { span: 24 },
              },
              'x-component': 'GroupHeader',
              'x-reactions': {
                dependencies: ['errorStorage'],
                fulfill: {
                  state: {
                    visible: '{{$deps[0]}}',
                  },
                },
              },
            },
            errorStorageType: {
              type: 'string',
              title: '存储方式',
              required: true,
              'x-decorator': 'FormItem',
              'x-component': 'Select',
              'x-component-props': {
                placeholder: '请选择存储方式',
              },
              enum: formOptions.errorStorageType,
              'x-reactions': {
                dependencies: ['errorStorage'],
                fulfill: {
                  state: {
                    visible: '{{$deps[0]}}',
                  },
                },
              },
            },
            errorStorageName: {
              type: 'string',
              title: '存储名称',
              required: true,
              'x-decorator': 'FormItem',
              'x-decorator-props': {
                gridSpan: 1,
              },
              'x-component': 'Input',
              'x-component-props': {
                placeholder: '请选择异常数据存储名称',
              },
              'x-reactions': {
                dependencies: ['errorStorage'],
                fulfill: {
                  state: {
                    visible: '{{$deps[0]}}',
                  },
                },
              },
            },
            errorStoragePath: {
              type: 'string',
              title: '存储地址',
              'x-decorator': 'FormItem',
              'x-decorator-props': {
                gridSpan: 1,
              },
              'x-component': 'Input',
              'x-component-props': {
                placeholder: '请输入异常数据存储地址',
              },
              // 也可以配置 reactions
            },

            // -------------------------------------------------------------
            // 分组3：校验规则 (使用 Slot 自定义渲染)
            // -------------------------------------------------------------
            filterHeader: {
              type: 'void',
              title: '校验规则',
              'x-decorator': 'FormItem',
              'x-decorator-props': {
                feedbackLayout: 'none',
                colon: false,
                gridSpan: 3,
                labelWidth: 0,
                wrapperCol: { span: 24 },
              },
              'x-component': 'GroupHeader',
            },
            // Slot：校验范围构建器
            conditionFilter: {
              type: 'object',
              title: '校验范围',
              'x-decorator': 'FormItem',
              'x-decorator-props': {
                gridSpan: 3, // 占满一行
              },
              'x-component': 'Slot', // 关键：使用 Slot 组件
              'x-component-props': {
                name: 'conditionFilter', // 对应 <template #conditionFilter>
              },
            },
            // Slot：SQL 预览
            sqlField: {
              type: 'string',
              title: '预览',
              'x-decorator': 'FormItem',
              'x-decorator-props': {
                gridSpan: 3,
              },
              'x-component': 'Slot',
              'x-component-props': {
                name: 'sqlField',
              },
            },

            // -------------------------------------------------------------
            // 分组4：校验设置
            // -------------------------------------------------------------
            checkHeader: {
              type: 'void',
              title: '校验设置',
              'x-decorator': 'FormItem',
              'x-decorator-props': {
                feedbackLayout: 'none',
                colon: false,
                gridSpan: 3,
                labelWidth: 0,
                wrapperCol: { span: 24 },
              },
              'x-component': 'GroupHeader',
            },
            checkCondition: {
              type: 'object',
              title: '校验配置',
              'x-decorator': 'FormItem',
              'x-decorator-props': {
                gridSpan: 3,
              },
              'x-component': 'Slot',
              'x-component-props': {
                name: 'checkCondition',
              },
            },
            checkSqlField: {
              type: 'string',
              title: '预览',
              'x-decorator': 'FormItem',
              'x-decorator-props': {
                gridSpan: 3,
              },
              'x-component': 'Slot',
              'x-component-props': {
                name: 'checkSqlField',
              },
            },
          },
        },
      },
    },
  },
});
