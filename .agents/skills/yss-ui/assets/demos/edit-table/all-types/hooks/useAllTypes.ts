import type { YEditTableColumn, YTableActionConfig } from '@yss-ui/components';
import { reactive, ref } from 'vue';

/**
 * 在树/级联结构中查找指定值的 label
 */
const findTreeLabel = (list: any[], value: any, fm: any): string | undefined => {
  for (const item of list || []) {
    if (`${item[fm.value]}` === `${value}`) return item[fm.label];
    const child = findTreeLabel(item[fm.children] || [], value, fm);
    if (child) return child;
  }
};

/**
 * 根据路径获取级联选择的 labels
 */
const getCascaderPathLabels = (list: any[], path: any[], fm: any): string[] | string => {
  const labels: string[] = [];
  let current = list;
  for (const val of path || []) {
    const hit = (current || []).find((n: any) => `${n[fm.value]}` === `${val}`);
    if (!hit) break;
    labels.push(hit[fm.label]);
    current = hit[fm.children] || [];
  }
  // 自定义处理：仅展示最后一级
  return labels?.at(-1) || '';
};

/**
 * 所有类型的编辑表格 Hook
 */
export const useAllTypes = () => {
  const data = ref<any[]>([
    {
      name: '张三',
      age: 28,
      status: '1',
      skills: ['vue', 'ts'],
      date: '2024-10-01',
      dateRange: ['2024-10-01', '2024-10-07'],
      time: '13:30:45',
      dept: 'beijing',
      area: ['zhejiang', 'hangzhou', 'xihu'],
      done: true,
      enabled: false,
    },
  ]);

  const columns: YEditTableColumn[] = [
    { title: '姓名', field: 'name', component: 'form-item-input', minWidth: 140 },
    { title: '年龄', field: 'age', component: 'form-item-input-number', width: 120, props: { min: 0 } },
    {
      title: '状态(字典)',
      field: 'status',
      component: 'form-item-select',
      isTransform: true,
      props: { fieldNames: { label: 'dictName', value: 'dictValue' } },
      width: 140,
    },
    {
      title: '技能(多选)',
      field: 'skills',
      component: 'form-item-select',
      props: { multiple: true, maxTagCount: 'responsive' },
      options: [
        { label: 'Vue', value: 'vue' },
        { label: 'React', value: 'react' },
        { label: 'TypeScript', value: 'ts' },
        { label: 'Node.js', value: 'node' },
      ],
      minWidth: 200,
    },
    { title: '日期', field: 'date', component: 'form-item-date', width: 160, props: { format: 'YYYY-MM-DD' } },
    {
      title: '日期范围',
      field: 'dateRange',
      component: 'form-item-date-range',
      width: 240,
      props: { format: 'YYYY-MM-DD', valueFormat: 'YYYY-MM-DD' },
    },
    { title: '时间(HH:mm:ss)', field: 'time', component: 'form-item-time', width: 160, props: { format: 'HH:mm:ss' } },
    {
      title: '部门(树选择)',
      field: 'dept',
      component: 'form-item-tree-select',
      minWidth: 180,
      props: {
        fieldNames: { label: 'label', value: 'value', children: 'children' },
        treeDefaultExpandAll: true,
        allowClear: true,
      },
      formatter: ({ cellValue }: any) =>
        findTreeLabel(optionsMap.dept, cellValue, { label: 'label', value: 'value', children: 'children' }) ||
        cellValue,
    },
    {
      title: '地区(级联)',
      field: 'area',
      component: 'form-item-cascader',
      minWidth: 200,
      props: { fieldNames: { label: 'label', value: 'value', children: 'children' } },
    },
    {
      title: '地区(级联)formatter 展示最后一级',
      field: 'area1',
      component: 'form-item-cascader',
      minWidth: 200,
      props: { fieldNames: { label: 'label', value: 'value', children: 'children' } },
      formatter: ({ cellValue }) => {
        return Array.isArray(cellValue)
          ? getCascaderPathLabels(optionsMap.area, cellValue, { label: 'label', value: 'value', children: 'children' })
          : cellValue;
      },
    },
    { title: '是否完成', field: 'done', component: 'form-item-checkbox', width: 120 },
    {
      title: '启用',
      field: 'enabled',
      component: 'form-item-switch',
      width: 120,
      props: { trueText: '自定义文案是', falseText: '自定义文案否', style: { width: '34px' } },
    },
    { type: 'action', title: '操作', width: 100, fixed: 'right', align: 'center' },
  ];

  const optionsMap = {
    status: [
      { dictName: '已完成', dictValue: '0' },
      { dictName: '进行中', dictValue: '1' },
      { dictName: '未开始', dictValue: '2' },
      { dictName: '已取消', dictValue: '3' },
    ],
    dept: [
      {
        label: '总部',
        value: 'hq',
        children: [
          { label: '北京', value: 'beijing' },
          { label: '上海', value: 'shanghai' },
        ],
      },
      {
        label: '分部',
        value: 'branch',
        children: [
          { label: '杭州', value: 'hangzhou' },
          { label: '深圳', value: 'shenzhen' },
        ],
      },
    ],
    area: [
      {
        label: '浙江省',
        value: 'zhejiang',
        children: [
          {
            label: '杭州市',
            value: 'hangzhou',
            children: [
              { label: '西湖区', value: 'xihu' },
              { label: '滨江区', value: 'binjiang' },
            ],
          },
        ],
      },
      {
        label: '广东省',
        value: 'guangdong',
        children: [
          {
            label: '深圳市',
            value: 'shenzhen',
            children: [
              { label: '南山区', value: 'nanshan' },
              { label: '福田区', value: 'futian' },
            ],
          },
        ],
      },
    ],
    area1: [
      {
        label: '浙江省',
        value: 'zhejiang',
        children: [
          {
            label: '杭州市',
            value: 'hangzhou',
            children: [
              { label: '西湖区', value: 'xihu' },
              { label: '滨江区', value: 'binjiang' },
            ],
          },
        ],
      },
      {
        label: '广东省',
        value: 'guangdong',
        children: [
          {
            label: '深圳市',
            value: 'shenzhen',
            children: [
              { label: '南山区', value: 'nanshan' },
              { label: '福田区', value: 'futian' },
            ],
          },
        ],
      },
    ],
  };

  const add = () => {
    const r: any = {};
    columns.forEach(c => {
      if (!c.field) return;
      const comp = (c as any).component;
      const p = (c as any).props || {};
      if (comp === 'form-item-select' && p.multiple) r[c.field] = [];
      else if (comp === 'form-item-date-range') r[c.field] = [];
      else if (comp === 'form-item-checkbox' || comp === 'form-item-switch') r[c.field] = false;
      else r[c.field] = '';
    });
    data.value.push(r);
  };

  const onDelete = (listRef: { value: any[] }, payload: any) => {
    const { scope, close, hideLoading } = payload || {};
    const { rowIndex } = scope || {};
    setTimeout(() => {
      listRef.value.splice(rowIndex, 1);
      hideLoading?.();
      close?.();
    }, 300);
  };

  const actionConfig = reactive<YTableActionConfig>({
    buttons: [
      {
        key: 'remove',
        text: '删除',
        type: 'link',
        isConfirm: true,
        confirmProps: { title: '是否删除此行？', needLoading: true },
        clickFn: (scope: any, _btn: any, { close, hideLoading }: any) => onDelete(data, { scope, close, hideLoading }),
      },
    ],
  });

  return {
    data,
    columns,
    optionsMap,
    actionConfig,
    add,
  };
};
