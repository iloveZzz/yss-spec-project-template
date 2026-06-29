import type { ConditionGroup, OperatorOption, OptionItem } from '@yss-ui/components';

export const operatorOptions: OperatorOption[] = [
  { label: '=', value: '=', kind: 'single' },
  { label: 'BETWEEN', value: 'BETWEEN', kind: 'between' },
  { label: 'IS NULL', value: 'IS NULL', kind: 'none' },
];

export const fieldOptions: OptionItem[] = [
  { label: '日期', value: 'date' },
  { label: '评分', value: 'score' },
];

export const initialNested: ConditionGroup = {
  id: 'root',
  type: 'GROUP',
  logicalOp: 'AND',
  children: [
    {
      id: 'g1',
      type: 'GROUP',
      logicalOp: 'OR',
      children: [
        {
          id: 'l1',
          type: 'LEAF',
          field: 'date',
          operator: 'BETWEEN',
          value: ['2024-01-01', '2024-06-01'],
        },
        { id: 'l2', type: 'LEAF', field: 'score', operator: '=', value: '80' },
      ],
    },
  ],
};
