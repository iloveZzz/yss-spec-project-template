import { type YTableActionConfig, type YTableColumn } from '@yss-ui/components';
import { reactive, ref, type Ref } from 'vue';

export interface UseBasicTableReturn {
  loading: Ref<boolean>;
  pagination: Ref<{
    current: number;
    pageSize: number;
    total: number;
    showSizeChanger: boolean;
    showQuickJumper: boolean;
    pageSizeOptions: string[];
  }>;
  columns: YTableColumn[];
  actionConfig: YTableActionConfig;
  columnsWithAction: YTableColumn[];
  tableData: Ref<any[]>;
  handleCellClick: (params: any) => void;
  handleCurrentRowChange: (params: any) => void;
  handlePageChange: (payload: any) => void;
  onCreate: () => void;
  onBatch: () => void;
  onView: (row: any) => void;
  onEdit: (row: any) => void;
  onDelete: (row: any) => void;
}

/**
 * Basic 表格 Demo 逻辑
 * @returns Demo 所需的响应式状态与方法
 */
export const useBasicTable = (): UseBasicTableReturn => {
  const loading = ref(false);
  const pagination = ref({
    current: 1,
    pageSize: 5,
    total: 0,
    showSizeChanger: true,
    showQuickJumper: true,
    pageSizeOptions: ['5', '10', '20', '50'],
  });

  const columns = reactive<YTableColumn[]>([
    {
      type: 'seq' as const,
      title: '序号',
      width: 60,
      align: 'center' as const,
      fixed: 'left' as const,
    },
    {
      field: 'name',
      title: '姓名',
      width: 120,
      sortable: true,
    },
    {
      field: 'role',
      title: '角色',
      width: 100,
    },
    {
      field: 'status',
      title: '状态',
      width: 80,
      align: 'center' as const,
    },
    {
      field: 'createTime',
      title: '备注',
      width: 160,
    },
    {
      field: 'createTime1',
      title: '备注2',
      width: 160,
    },
    {
      field: 'createTime2',
      title: '备注2',
      width: 160,
    },
    {
      field: 'createTime3',
      title: '备注2',
      width: 160,
    },
  ]);

  const actionConfig = reactive<YTableActionConfig>({
    displayLimit: 2,
    width: 140,
    fixed: 'right',
    buttons: [
      { key: 'view', text: '查看', clickFn: scope => onView(scope.row) },
      { key: 'edit', text: '编辑', clickFn: scope => onEdit(scope.row) },
      {
        key: 'delete',
        text: '删除',
        isConfirm: true,
        confirmProps: { title: '确认删除该条数据吗？' },
        clickFn: scope => onDelete(scope.row),
      },
    ],
  });

  const columnsWithAction = reactive<YTableColumn[]>([
    ...columns,
    {
      type: 'action' as const,
      title: '操作',
      align: 'center' as const,
      actionConfig: {
        displayLimit: 2,
        width: 130,
        moreRenderType: 'ellipsis',
        buttons: [
          { key: 'view', text: '查看', clickFn: scope => onView(scope.row) },
          { key: 'edit', text: '编辑', clickFn: scope => onEdit(scope.row) },
          {
            key: 'delete',
            text: '删除',
            isConfirm: true,
            confirmProps: { title: '确认删除该条数据吗？' },
            clickFn: scope => onDelete(scope.row),
          },
        ],
      },
    },
  ]);

  const tableData = ref([
    {
      name: '张三',
      department: '技术部',
      role: '前端工程师',
      status: 1,
      createTime: '2024-01-15 10:30:00',
    },
    {
      name: '李四xxxxx',
      department: '产品部',
      role: '产品经理',
      status: 1,
      createTime: '2024-01-16 09:20:00',
    },
    {
      name: '王五',
      department: '设计部',
      role: 'UI设计师',
      status: 0,
      createTime: '2024-01-17 14:15:00',
    },
    {
      name: '赵六',
      department: '技术部',
      role: '后端工程师',
      status: 1,
      createTime: '2024-01-18 11:45:00',
    },
    {
      name: '孙七',
      department: '运营部',
      role: '运营专员',
      status: 1,
      createTime: '2024-01-19 16:20:00',
    },
  ]);

  const handleCellClick = (params: any) => {
    // eslint-disable-next-line no-console
    console.info(`点击了 ${params.row.name} 的 ${params.column.title}`);
  };

  const handleCurrentRowChange = (_params: any) => {
    // 当前行变更
  };

  const handlePageChange = (_payload: any) => {
    // 分页改变
  };

  const onCreate = () => alert('点击了新增');
  const onBatch = () => alert('点击了批量操作');
  const onView = (row: any) => alert(`查看：${row.name}`);
  const onEdit = (row: any) => alert(`编辑：${row.name}`);
  const onDelete = (row: any) => alert(`删除：${row.name}`);

  return {
    loading,
    pagination,
    columns,
    actionConfig,
    columnsWithAction,
    tableData,
    handleCellClick,
    handleCurrentRowChange,
    handlePageChange,
    onCreate,
    onBatch,
    onView,
    onEdit,
    onDelete,
  };
};
