import { nextTick, ref } from 'vue';
import type { Ref } from 'vue';
import type { YTablePagination } from '@yss-ui/components';
import type { UserData, QueryParams, ApiResponse } from '../constant';
import { generateMockData } from '../constant';

/**
 * 表格数据管理 Hook
 * @param tableRef 表格组件引用
 */
export const useTableData = (tableRef: Ref<any>) => {
  /** 表格数据 */
  const tableData = ref<UserData[]>([]);

  /** 加载状态 */
  const loading = ref(false);

  /** 分页配置 */
  const pagination = ref<YTablePagination>({
    current: 1,
    pageSize: 20,
    total: 0,
    remote: true,
    showSizeChanger: true,
    showQuickJumper: true,
    size: 'small',
    pageSizeOptions: ['10', '20', '50', '100'],
  });

  /** 筛选参数 */
  const queryParams = ref<Omit<QueryParams, 'current' | 'pageSize'>>({});

  /** 全量模拟数据（模拟后端数据库） */
  const allMockData = generateMockData(156);

  /**
   * 模拟后端 API 请求
   * @param params 查询参数
   * @returns API 响应数据
   */
  const mockApiRequest = async (params: QueryParams): Promise<ApiResponse> => {
    // 模拟网络延迟
    await new Promise(resolve => setTimeout(resolve, 500));

    // 筛选数据
    let filteredData = [...allMockData];

    // 姓名筛选（模糊匹配）
    if (params.name) {
      filteredData = filteredData.filter(item => item.name.includes(params.name!));
    }

    // 年龄筛选（大于等于）
    if (params.minAge !== undefined && params.minAge !== null) {
      filteredData = filteredData.filter(item => item.age >= params.minAge!);
    }

    // 性别筛选（单选）
    if (params.gender) {
      filteredData = filteredData.filter(item => item.gender === params.gender);
    }

    // 状态筛选（多选）
    if (params.status?.length) {
      filteredData = filteredData.filter(item => params.status!.includes(item.status));
    }

    const total = filteredData.length;

    // 分页处理
    const start = (params.current - 1) * params.pageSize;
    const end = start + params.pageSize;
    const list = filteredData.slice(start, end);

    return { list, total };
  };

  /**
   * 获取表格数据
   */
  const fetchTableData = async () => {
    loading.value = true;
    try {
      const params: QueryParams = {
        current: pagination.value.current!,
        pageSize: pagination.value.pageSize!,
        ...queryParams.value,
      };

      const res = await mockApiRequest(params);

      tableData.value = res.list;
      pagination.value.total = res.total;

      // ✅ 关键修复：等待 DOM 更新后强制刷新表格
      // 在远程筛选+远程分页模式下，vxe-table 不会自动处理数据更新
      // 需要先等待 Vue 更新 DOM，然后手动触发表格重新渲染
      await nextTick();
      const $table = tableRef.value?.getTableInstance?.();
      if ($table) {
        // 方案组合：先重新计算，再更新数据，确保表格完全刷新
        await $table.recalculate(true);
        await nextTick();
        await $table.updateData();
      }
    } catch (error) {
      console.error('获取数据失败:', error);
      tableData.value = [];
      pagination.value.total = 0;
    } finally {
      loading.value = false;
    }
  };

  /**
   * 处理筛选条件变化
   * @param params 筛选参数
   */
  const handleFilterChange = (params: any) => {
    const { column, values, datas } = params || {};
    const field = column?.field;

    if (!field) return;

    // 姓名筛选（输入框）
    if (field === 'name') {
      const [keyword] = datas || [];
      queryParams.value.name = keyword || undefined;
    }

    // 年龄筛选（输入框）
    if (field === 'age') {
      const [minAge] = datas || [];
      queryParams.value.minAge = minAge ? Number(minAge) : undefined;
    }

    // 性别筛选（单选）
    if (field === 'gender') {
      const [selectedValue] = values || [];
      queryParams.value.gender = selectedValue || undefined;
    }

    // 状态筛选（多选）
    if (field === 'status') {
      queryParams.value.status = values?.length ? values : undefined;
    }

    // 筛选条件变化时，重置到第一页
    pagination.value.current = 1;

    // 重新获取数据
    fetchTableData();
  };

  /**
   * 处理分页变化
   * @param pageInfo 分页信息
   */
  const handlePageChange = (pageInfo: { current: number; pageSize: number }) => {
    pagination.value.current = pageInfo.current;
    pagination.value.pageSize = pageInfo.pageSize;
    fetchTableData();
  };

  /**
   * 更新筛选选项状态（用于自定义筛选输入框）
   * @param option 筛选选项
   */
  const updateFilterStatus = (option: any) => {
    const $table = tableRef.value?.getTableInstance?.();
    if ($table) {
      $table.updateFilterOptionStatus(option, !!option.data);
    }
  };

  return {
    tableData,
    loading,
    pagination,
    queryParams,
    fetchTableData,
    handleFilterChange,
    handlePageChange,
    updateFilterStatus,
  };
};
