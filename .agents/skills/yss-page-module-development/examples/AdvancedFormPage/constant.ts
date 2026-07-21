/**
 * 复杂表单页面 - 常量配置
 */

/** 步骤枚举 */
export enum RULE_STEPS {
  BASE_INFO = 1,
  RULE_CONFIG = 2,
  RULE_RESULT = 3,
}

/** 步骤配置 */
export const QUALITY_RULE_STEPS = [
  { value: RULE_STEPS.BASE_INFO, title: '基本信息' },
  { value: RULE_STEPS.RULE_CONFIG, title: '规则配置' },
  { value: RULE_STEPS.RULE_RESULT, title: '规则结果' },
];

/** 条件组节点接口 */
export interface ConditionGroup {
  id: string;
  type: 'GROUP' | 'LEAF';
  logicalOp: 'AND' | 'OR';
  children: any[];
}

/** 表单选项接口 */
export interface FormOptions {
  intensity: Array<{ label: string; value: any }>;
  errorStorageType: Array<{ label: string; value: string }>;
  [key: string]: any;
}
