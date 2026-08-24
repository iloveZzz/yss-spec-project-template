import type { YTableColumn } from '@yss-ui/components';
import type { QualityBusinessRuleVO } from '@/api/generated/quality/schemas';

/** 质量规则列表行数据。 */
export type QualityRuleItem = QualityBusinessRuleVO;

/** 质量规则查询表单。 */
export interface SearchFormData {
  ruleName: string;
}

/** 状态文案映射。 */
export const STATUS_LABELS: Record<number, string> = {
  0: '禁用',
  1: '启用',
};

/** 质量规则表格列。 */
export const TABLE_COLUMNS: YTableColumn[] = [
  { field: 'ruleName', title: '质量规则名称', minWidth: 180, slots: { default: 'ruleName' } },
  { field: 'ruleCode', title: '规则编码', minWidth: 160 },
  {
    field: 'status',
    title: '状态',
    width: 100,
    formatter: ({ cellValue }: { cellValue?: number }) => STATUS_LABELS[cellValue ?? -1] ?? '-',
  },
];
