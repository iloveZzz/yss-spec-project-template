export const initialTreeData: any[] = [
  {
    key: 'all',
    title: '所有任务流',
    children: [
      { key: 'test', title: 'test' },
      { key: 'a', title: '委外管理平台' },
      { key: 'b', title: '投资管理演示' },
      { key: 'c', title: '数仓演示' },
      { key: 'd', title: '数据质量V2' },
    ],
  },
];

export const rows = Array.from({ length: 8 }).map((_, i) => ({
  id: i + 1,
  name: ['echo_date', 'ee', 'echo_params', 'd_i', 'U_condition', 'U_sub'][i % 6] + (i > 4 ? `_${i}` : ''),
}));
