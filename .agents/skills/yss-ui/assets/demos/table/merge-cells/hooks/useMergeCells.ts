import { type YTableColumn } from '@yss-ui/components';
import { reactive, ref, watchEffect, type Ref } from 'vue';

const mergeFields = ['date', 'province', 'city'] as const;
type MergeField = (typeof mergeFields)[number];

export interface UseMergeCellsReturn {
  columns: YTableColumn[];
  tableData: Ref<any[]>;
  spanMethod: (params: { row: any; rowIndex: number; column: any }) => { rowspan: number; colspan: number } | undefined;
}

/**
 * 单元格合并 Demo 逻辑
 * @returns Demo 所需的响应式状态与方法
 */
export const useMergeCells = (): UseMergeCellsReturn => {
  const columns = reactive<YTableColumn[]>([
    { type: 'seq', title: '序号', width: 60, align: 'center' },
    { field: 'date', title: '日期', width: 120 },
    { field: 'province', title: '省份', width: 100 },
    { field: 'city', title: '城市', width: 100 },
    { field: 'name', title: '客户', width: 120 },
    { field: 'product', title: '商品', width: 140 },
    { field: 'quantity', title: '数量', width: 80, align: 'right' },
    { field: 'price', title: '单价', width: 100, align: 'right' },
    { field: 'amount', title: '金额', minWidth: 120, align: 'right' },
  ]);

  const tableData = ref([
    {
      date: '2024-01-01',
      province: '浙江',
      city: '杭州',
      name: '张三',
      product: '笔记本电脑',
      quantity: 2,
      price: 5000,
      amount: 10000,
    },
    {
      date: '2024-01-01',
      province: '浙江',
      city: '杭州',
      name: '李四',
      product: '鼠标',
      quantity: 1,
      price: 100,
      amount: 100,
    },
    {
      date: '2024-01-01',
      province: '浙江',
      city: '宁波',
      name: '王五',
      product: '键盘',
      quantity: 1,
      price: 300,
      amount: 300,
    },
    {
      date: '2024-01-01',
      province: '浙江',
      city: '宁波',
      isSubtotal: true,
      name: '',
      product: '小计',
      quantity: null,
      price: null,
      amount: 10400,
    },
    {
      date: '2024-01-02',
      province: '江苏',
      city: '南京',
      name: '赵六',
      product: '耳机',
      quantity: 1,
      price: 200,
      amount: 200,
    },
    {
      date: '2024-01-02',
      province: '江苏',
      city: '南京',
      name: '孙七',
      product: '显示器',
      quantity: 1,
      price: 1500,
      amount: 1500,
    },
    {
      date: '2024-01-02',
      province: '江苏',
      city: '苏州',
      name: '周八',
      product: 'U 盘',
      quantity: 3,
      price: 50,
      amount: 150,
    },
    {
      date: '2024-01-02',
      province: '江苏',
      city: '苏州',
      isSubtotal: true,
      name: '',
      product: '小计',
      quantity: null,
      price: null,
      amount: 1850,
    },
    {
      date: '2024-01-02',
      province: '合计',
      city: '',
      isTotalRow: true,
      name: '',
      product: '',
      quantity: null,
      price: null,
      amount: 12250,
    },
  ]);

  const rowspanMaps = reactive<Record<MergeField, number[]>>({
    date: [],
    province: [],
    city: [],
  });

  const computeRowspanMap = (data: any[], field: MergeField) => {
    const res: number[] = Array(data.length).fill(1);
    let start = 0;
    while (start < data.length) {
      let end = start + 1;
      while (end < data.length && data[end]?.[field] === data[start]?.[field]) {
        end++;
      }
      const span = end - start;
      res[start] = span;
      for (let i = start + 1; i < end; i++) res[i] = 0;
      start = end;
    }
    return res;
  };

  watchEffect(() => {
    const data = tableData.value;
    (mergeFields as readonly MergeField[]).forEach(f => {
      rowspanMaps[f] = computeRowspanMap(data, f);
    });
  });

  const spanMethod = ({ row, rowIndex, column }: any) => {
    const field: string | undefined = column?.field;
    if (field && (mergeFields as readonly string[]).includes(field)) {
      const span = (rowspanMaps as any)[field]?.[rowIndex];
      if (span === 0) return { rowspan: 0, colspan: 0 };
      if (span > 1) return { rowspan: span, colspan: 1 };
    }

    if (row?.isSubtotal) {
      if (field === 'product') return { rowspan: 1, colspan: 2 };
      if (field === 'quantity') return { rowspan: 0, colspan: 0 };
    }

    if (row?.isTotalRow) {
      if (field === 'province') return { rowspan: 1, colspan: 5 };
      if (['city', 'name', 'product', 'quantity'].includes(field as string)) {
        return { rowspan: 0, colspan: 0 };
      }
    }

    return undefined;
  };

  return {
    columns,
    tableData,
    spanMethod,
  };
};
