import { type YTableColumn, type YTablePagination } from '@yss-ui/components';
import { onMounted, reactive, ref, type Ref } from 'vue';

type Row = {
  _X_ROW_KEY: string;
  name: string;
  role: string;
  status: number;
  createTime: string;
};

type ApiResult<T> = {
  list: T[];
  pageIndex: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
};

export interface UsePaginationRemoteReturn {
  loading: Ref<boolean>;
  dataSource: Ref<Row[]>;
  pagination: Ref<YTablePagination>;
  columns: YTableColumn[];
  handlePageChange: (params: { current: number; pageSize: number }) => void;
}

/**
 * 远程分页表格 Demo 逻辑
 * @returns Demo 所需的响应式状态与方法
 */
export const usePaginationRemote = (): UsePaginationRemoteReturn => {
  const loading = ref(false);
  const dataSource = ref<Row[]>([]);

  const pagination = ref<YTablePagination>({});

  const columns = reactive<YTableColumn[]>([
    { type: 'seq', title: '序号', width: 60, align: 'center' },
    { field: 'name', title: '姓名', width: 140 },
    { field: 'role', title: '角色', width: 120 },
    { field: 'status', title: '状态', width: 100, align: 'center' },
    { field: 'createTime', title: '创建时间', width: 180 },
  ]);

  /** 模拟接口 */
  const mockRequest = (params: { pageIndex: number; pageSize: number }): Promise<ApiResult<Row>> => {
    const { pageIndex, pageSize } = params;
    const totalCount = 237;
    const start = (pageIndex - 1) * pageSize;
    const end = Math.min(start + pageSize, totalCount);
    const list: Row[] = Array.from({ length: Math.max(0, end - start) }).map((_, i) => {
      const idx = start + i + 1;
      return {
        _X_ROW_KEY: String(idx),
        name: `用户 ${idx}`,
        role: ['前端', '后端', '测试'][idx % 3],
        status: idx % 2,
        createTime: '2024-01-01 00:00:00',
      };
    });
    return new Promise(resolve => {
      setTimeout(() => {
        resolve({
          list,
          pageIndex,
          pageSize,
          totalCount,
          totalPages: Math.ceil(totalCount / pageSize),
        });
      }, 400);
    });
  };

  const fetchTable = async ({ current, pageSize }: { current: number; pageSize: number }) => {
    loading.value = true;
    try {
      const res = await mockRequest({ pageIndex: current, pageSize });
      dataSource.value = res.list;
      pagination.value = {
        ...pagination.value,
        current: res.pageIndex,
        pageSize: res.pageSize,
        total: res.totalCount,
      };
    } finally {
      loading.value = false;
    }
  };

  const handlePageChange = ({ current, pageSize }: { current: number; pageSize: number }) => {
    fetchTable({ current, pageSize });
  };

  onMounted(() => {
    fetchTable({ current: 1, pageSize: 20 });
  });

  return {
    loading,
    dataSource,
    pagination,
    columns,
    handlePageChange,
  };
};
