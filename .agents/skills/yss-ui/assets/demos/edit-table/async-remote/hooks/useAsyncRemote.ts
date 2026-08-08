import type { YEditTableColumn, YTableActionConfig } from '@yss-ui/components';
import { message } from 'ant-design-vue';
import { onMounted, reactive, ref } from 'vue';

/**
 * 异步远程联动 Hook
 */
export const useAsyncRemote = () => {
  const loading = ref(false);
  const productNameLoadingRow = ref<any | null>(null);
  const datasetId = ref<'A' | 'B'>('A');

  const optionsMap = reactive<Record<string, any[]>>({ product: [] });
  const serverProductNameMap = ref<Record<string, { label: string; value: string }[]>>({});

  const data = ref<any[]>([
    { product: 'p1', productName: '', quantity: 1, price: 199, total: 199, enabled: true, remark: '' },
    { product: 'p2', productName: '', quantity: 2, price: 299, total: 598, enabled: true, remark: '' },
  ]);

  /**
   * 模拟：获取产品下拉
   */
  const apiFetchProducts = (): Promise<{ label: string; value: string }[]> => {
    return new Promise(resolve => {
      setTimeout(() => {
        resolve([
          { label: '企业邮箱', value: 'p1' },
          { label: '云存储', value: 'p2' },
          { label: '在线协作', value: 'p3' },
        ]);
      }, 300);
    });
  };

  /**
   * 模拟：根据当前 datasetId 返回整套"产品名称"映射
   */
  const apiFetchProductNameMap = (): Promise<Record<string, { label: string; value: string }[]>> => {
    return new Promise(resolve => {
      setTimeout(() => {
        if (datasetId.value === 'A') {
          resolve({
            p1: [
              { label: '标准版 A', value: 'p1-a1' },
              { label: '旗舰版 A', value: 'p1-a2' },
            ],
            p2: [
              { label: '基础版 A', value: 'p2-a1' },
              { label: '容量加强版 A', value: 'p2-a2' },
            ],
            p3: [
              { label: '团队版 A', value: 'p3-a1' },
              { label: '企业版 A', value: 'p3-a2' },
            ],
          });
        } else {
          resolve({
            p1: [
              { label: '标准版 B', value: 'p1-b1' },
              { label: '旗舰版 B', value: 'p1-b2' },
            ],
            p2: [
              { label: '基础版 B', value: 'p2-b1' },
              { label: '容量加强版 B', value: 'p2-b2' },
            ],
            p3: [
              { label: '团队版 B', value: 'p3-b1' },
              { label: '企业版 B', value: 'p3-b2' },
            ],
          });
        }
      }, 500);
    });
  };

  /**
   * 首次拉取"产品"与"产品名称映射"
   */
  const bootstrapRemote = async () => {
    loading.value = true;
    try {
      optionsMap.product = await apiFetchProducts();
      serverProductNameMap.value = await apiFetchProductNameMap();
    } finally {
      loading.value = false;
    }
  };

  const columns: YEditTableColumn[] = [
    {
      title: '产品（接口返回）',
      field: 'product',
      component: 'form-item-select',
      isTransform: true,
      props: { fieldNames: { label: 'label', value: 'value' } },
      width: 180,
    },
    {
      title: '产品名称（随服务端变化）',
      field: 'productName',
      component: 'form-item-select',
      isTransform: true,
      props: { fieldNames: { label: 'label', value: 'value' } },
      cellProps: ({ row }) => ({ loading: productNameLoadingRow.value === row }),
      minWidth: 200,
      filterOptions: ({ row }: any) => {
        const product = row?.product;
        return serverProductNameMap.value?.[product] || [];
      },
    },
    { title: '数量', field: 'quantity', component: 'form-item-input-number', width: 120, props: { min: 1 } },
    { title: '单价(¥)', field: 'price', component: 'form-item-input-number', width: 140, props: { min: 0, step: 1 } },
    { title: '总价(¥)', field: 'total', component: 'form-item-input-number', width: 140, props: { disabled: true } },
    {
      title: '启用',
      field: 'enabled',
      component: 'form-item-switch',
      width: 120,
      props: { trueText: '启用', falseText: '停用' },
    },
    { title: '备注', field: 'remark', component: 'form-item-input', minWidth: 200 },
  ];

  const editRules: Record<string, any[]> = {
    product: [{ required: true }],
    productName: [{ required: true }],
    quantity: [{ required: true }],
  };

  const add = () => {
    const item: any = {};
    columns.forEach(c => {
      if (!c.field) return;
      const comp = (c as any).component;
      if (comp === 'form-item-switch') item[c.field] = false;
      else if (comp === 'form-item-input-number') item[c.field] = 0;
      else item[c.field] = '';
    });
    item.quantity = 1;
    item.enabled = true;
    data.value.push(item);
  };

  const onUpdateRow = async ({ row, key, value: _value }: { row: any; key: string; value: any }) => {
    if (key === 'product') {
      row.productName = '';
      productNameLoadingRow.value = row;
      try {
        datasetId.value = datasetId.value === 'A' ? 'B' : 'A';
        serverProductNameMap.value = await apiFetchProductNameMap();
        message.success(`已切换服务端数据集为 ${datasetId.value}`);
      } finally {
        productNameLoadingRow.value = null;
      }
    }
    if (key === 'quantity' || key === 'price') {
      const q = Number(row.quantity) || 0;
      const p = Number(row.price) || 0;
      row.total = Number((q * p).toFixed(2));
    }
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

  const actionConfig: YTableActionConfig = {
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
  };

  onMounted(() => {
    bootstrapRemote();
  });

  return {
    data,
    columns,
    optionsMap,
    serverProductNameMap,
    editRules,
    actionConfig,
    add,
    onUpdateRow,
  };
};
