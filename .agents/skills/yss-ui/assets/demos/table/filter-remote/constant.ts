import type { YTableColumn } from '@yss-ui/components';

/**
 * 用户数据类型
 */
export interface UserData {
  _X_ROW_KEY: string;
  name: string;
  age: number;
  gender: string;
  status: string;
  department: string;
}

/**
 * 查询参数类型
 */
export interface QueryParams {
  current: number;
  pageSize: number;
  name?: string;
  minAge?: number;
  gender?: string;
  status?: string[];
}

/**
 * API 响应类型
 */
export interface ApiResponse {
  list: UserData[];
  total: number;
}

/**
 * 表格列配置
 */
export const tableColumns: YTableColumn[] = [
  {
    title: '姓名',
    field: 'name',
    width: 120,
    filterable: true,
    filters: [{ data: '' }],
    // ✅ 关键：远程筛选必须返回 true，禁用本地筛选，让数据直接显示
    filterMethod: () => true,
  },
  {
    title: '年龄',
    field: 'age',
    width: 100,
    filterable: true,
    filters: [{ data: '' }],
    // ✅ 关键：远程筛选必须返回 true，禁用本地筛选，让数据直接显示
    filterMethod: () => true,
  },
  {
    title: '性别',
    field: 'gender',
    width: 100,
    isTransform: true,
    filterable: true,
    filterMultiple: false,
    filters: [
      { label: '男', value: 'male' },
      { label: '女', value: 'female' },
    ],
    props: { fieldNames: { label: 'label', value: 'value' } },
    // ✅ 关键：远程筛选必须返回 true，禁用本地筛选，让数据直接显示
    filterMethod: () => true,
  },
  {
    title: '状态',
    field: 'status',
    width: 120,
    isTransform: true,
    filterable: true,
    filterMultiple: true,
    filters: [
      { label: '在职', value: 'active' },
      { label: '离职', value: 'inactive' },
      { label: '试用期', value: 'probation' },
    ],
    props: { fieldNames: { label: 'label', value: 'value' } },
    // ✅ 关键：远程筛选必须返回 true，禁用本地筛选，让数据直接显示
    filterMethod: () => true,
  },
  {
    title: '部门',
    field: 'department',
    minWidth: 150,
  },
];

/**
 * 字典映射数据
 */
export const optionsMap = {
  gender: [
    { label: '男', value: 'male' },
    { label: '女', value: 'female' },
  ],
  status: [
    { label: '在职', value: 'active' },
    { label: '离职', value: 'inactive' },
    { label: '试用期', value: 'probation' },
  ],
};

/**
 * 生成模拟用户数据
 * @param count 数据条数
 * @returns 用户数据数组
 */
export const generateMockData = (count: number): UserData[] => {
  const names = ['张三', '李四', '王五', '赵六', '钱七', '孙八', '周九', '吴十', '郑十一', '刘十二'];
  const genders = ['male', 'female'];
  const statuses = ['active', 'inactive', 'probation'];
  const departments = ['技术部', '产品部', '运营部', '市场部', '人力资源部'];

  return Array.from({ length: count }, (_, i) => ({
    _X_ROW_KEY: String(i + 1),
    name: `${names[i % names.length]}${Math.floor(i / names.length) + 1}`,
    age: Math.floor(Math.random() * 30) + 20,
    gender: genders[i % 2],
    status: statuses[i % 3],
    department: departments[i % departments.length],
  }));
};
