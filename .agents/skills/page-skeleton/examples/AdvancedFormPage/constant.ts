import type { OperatorOption, OptionItem } from '@yss-ui/components';

/** 表单字典选项。 */
export interface FormOptions {
  intensity: Array<{ label: string; value: string }>;
  errorStorageType: Array<{ label: string; value: string }>;
}

/** 规则配置表单字典。 */
export const FORM_OPTIONS: FormOptions = {
  intensity: [
    { label: '弱规则', value: 'WEAK' },
    { label: '强规则', value: 'STRONG' },
  ],
  errorStorageType: [
    { label: '文件服务', value: 'FILE_SYSTEM' },
    { label: '数据落地表', value: 'DATATABLE_SYSTEM' },
  ],
};

/** 条件构建器可选字段。 */
export const FIELD_OPTIONS: OptionItem[] = [
  { label: '用户编号', value: 'userId' },
  { label: '金额', value: 'amount' },
  { label: '状态', value: 'status' },
];

/** 条件构建器操作符。 */
export const RULE_OPERATOR_OPTIONS: OperatorOption[] = [
  { label: '等于', value: '=', kind: 'single' },
  { label: '大于', value: '>', kind: 'single' },
  { label: '介于', value: 'between', kind: 'between' },
  { label: '包含于', value: 'in', kind: 'multiple' },
];
