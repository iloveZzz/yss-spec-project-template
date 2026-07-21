import type { YTableColumn } from '@yss-ui/components';

/**
 * 质量规则数据项接口
 */
export interface QualityRuleItem {
  /** 规则ID */
  id: string;
  /** 规则编码 */
  ruleCode?: string;
  /** 规则名称 */
  ruleName: string;
  /** 模板ID */
  templateId?: string | number;
  /** 规则模板名称 */
  templateName: string;
  /** 数据源名称 */
  datasourceName: string;
  /** 规则强度名称 */
  intensityName: string;
  /** 规则类型名称 */
  ruleTypeName: string;
  /** 校验开关状态: 0=禁用, 1=启用 */
  status: 0 | 1;
  /** 创建人 */
  createdBy: string;
  /** 创建时间 */
  createdDate: string;
  [key: string]: any;
}

/**
 * 树节点数据接口
 */
export interface TreeNodeData {
  /** 节点ID */
  id: string;
  /** 节点名称 */
  name?: string;
  /** 目录编码 */
  dirCode?: string;
  /** 树类型: 1=规则分类树, 2=数据源树 */
  treeType?: '1' | '2';
  /** 数据源名称（数据源树使用） */
  datasourceName?: string;
  /** 数据库名称（数据源树使用） */
  databaseName?: string;
  /** 数据库类型（数据源树使用） */
  dataBaseType?: string;
  [key: string]: any;
}

/**
 * 搜索表单数据接口
 */
export interface SearchFormData {
  /** 规则名称 */
  ruleName: string;
}

/**
 * 表格列配置
 */
export const TABLE_COLUMNS: YTableColumn[] = [
  {
    field: 'ruleName',
    title: '质量规则名称',
    minWidth: 130,
    fixed: 'left',
    slots: { default: 'ruleName' },
  },
  {
    field: 'templateName',
    title: '规则模板',
    minWidth: 130,
  },
  {
    field: 'datasourceName',
    title: '数据源名称',
    minWidth: 120,
  },
  {
    field: 'intensityName',
    title: '规则强度',
    minWidth: 100,
  },
  {
    field: 'ruleTypeName',
    title: '规则类型',
    minWidth: 120,
  },
  {
    field: 'status',
    title: '校验开关',
    width: 90,
    slots: { default: 'status' },
  },
  {
    field: 'createdBy',
    title: '创建人',
    width: 120,
  },
  {
    field: 'createdDate',
    title: '创建时间',
    width: 140,
  },
  {
    field: 'lastModifiedDate',
    title: '最近修改时间',
    width: 140,
  },
  {
    field: 'lastModifiedBy',
    title: '最近修改人',
    width: 140,
  },
];

/**
 * 规则类型常量
 */
export const RULE_TYPE = {
  /** 业务校验 */
  BUSINESS: 'BUSINESS',
  /** 技术校验 */
  TECH: 'TECH',
} as const;
