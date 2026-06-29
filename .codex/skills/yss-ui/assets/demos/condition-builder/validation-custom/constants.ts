import type { ConditionGroup, OperatorOption, OptionItem } from '@yss-ui/components';

export const operatorOptions: OperatorOption[] = [
  { label: '=', value: '=', kind: 'single' },
  { label: '!=', value: '!=', kind: 'single' },
  { label: '>', value: '>', kind: 'single' },
  { label: 'BETWEEN', value: 'BETWEEN', kind: 'between' },
  { label: 'IS NULL', value: 'IS NULL', kind: 'none' },
];

export const fieldOptions: OptionItem[] = [
  { label: '年龄', value: 'age' },
  { label: '姓名', value: 'name' },
  { label: '城市', value: 'city' },
];

export const valueDict: Record<string, OptionItem[]> = {
  name: [
    { label: '张三', value: 'zhangsan' },
    { label: '李四', value: 'lisi' },
    { label: '王五', value: 'wangwu' },
  ],
  city: [
    { label: '北京', value: 'beijing' },
    { label: '上海', value: 'shanghai' },
    { label: '广州', value: 'guangzhou' },
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
