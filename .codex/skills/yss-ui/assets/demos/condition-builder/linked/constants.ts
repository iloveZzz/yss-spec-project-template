import type { ConditionGroup, OperatorOption, OptionItem } from '@yss-ui/components';

export const operatorsByField: Record<string, OperatorOption[]> = {
  age: [
    { label: '=', value: '=', kind: 'single' },
    { label: '>', value: '>', kind: 'single' },
    { label: 'BETWEEN', value: 'BETWEEN', kind: 'between' },
  ],
  name: [
    { label: '=', value: '=', kind: 'single' },
    { label: 'LIKE', value: 'LIKE', kind: 'single' },
    { label: 'IS NULL', value: 'IS NULL', kind: 'none' },
  ],
  city: [
    { label: 'IN', value: 'IN', kind: 'multiple' },
    { label: 'NOT IN', value: 'NOT IN', kind: 'multiple' },
  ],
};

export const fieldOptions: OptionItem[] = [
  { label: '年龄', value: 'age' },
  { label: '姓名', value: 'name' },
  { label: '城市', value: 'city' },
];

export const valueDictByField: Record<string, OptionItem[]> = {
  name: [
    { label: '张三', value: '张三' },
    { label: '李四', value: '李四' },
    { label: '王五', value: '王五' },
  ],
  city: [
    { label: '北京', value: '北京' },
    { label: '上海', value: '上海' },
    { label: '深圳', value: '深圳' },
  ],
  age: [
    { label: '18', value: '18' },
    { label: '25', value: '25' },
    { label: '30', value: '30' },
  ],
};

export {};

export const createInitial = (): ConditionGroup => ({
  id: 'root',
  type: 'GROUP',
  logicalOp: 'AND',
  children: [],
});
