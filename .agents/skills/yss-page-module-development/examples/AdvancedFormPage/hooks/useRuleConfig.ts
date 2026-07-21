/**
 * 规则配置Hook
 * 处理表单逻辑、SQL解析、条件初始化等
 */
import { reactive, ref, watch } from 'vue';
import { message } from 'ant-design-vue';
// 假设有 API 客户端
import { getPomApi } from '@/api/generated/quality';
import type { ConditionGroup } from '../constant';

export function useRuleConfig() {
  const api = getPomApi();

  /** 校验范围条件数据 (树形结构) */
  const conditionData = ref<ConditionGroup>({
    id: 'root',
    type: 'GROUP',
    logicalOp: 'AND',
    children: [],
  });

  /** 校验范围SQL预览值 */
  const sqlFieldValue = ref('');

  /** 校验配置条件数据 */
  const checkConditionData = ref<ConditionGroup>({
    id: 'root2',
    type: 'GROUP',
    logicalOp: 'AND',
    children: [],
  });

  /** 校验配置SQL预览值 */
  const checkSqlFieldValue = ref('');

  /** 字段选项（给 YConditionBuilder 使用） */
  const filterFieldsOptions = ref<Array<{ label: string; value: string; type?: string }>>([]);
  const checkFieldsOptions = ref<Array<{ label: string; value: string }>>([]);

  /** 规则操作符选项 */
  const ruleOperatorOptions = ref<any[]>([]);

  /** 加载状态 */
  const loading = reactive({
    generateSqlCondition: false,
    generateCheckSqlCondition: false,
    loadFields: false,
  });

  /**
   * 加载字段选项
   */
  const loadFieldOptions = async (exceptionCountSql: string) => {
    // 模拟 API 调用逻辑
    if (!exceptionCountSql) {
      message.warning('请先填写异常行数SQL');
      return;
    }
    // ... API调用逻辑
  };

  /**
   * 初始化条件构建器数据
   */
  const initConditionData = (conditionJson?: string, checkJson?: string) => {
    if (conditionJson) {
      try {
        const parsed = JSON.parse(conditionJson);
        conditionData.value = parsed;
      } catch (e) {
        console.error('解析失败', e);
      }
    }
    if (checkJson) {
      try {
        const parsed = JSON.parse(checkJson);
        checkConditionData.value = parsed;
      } catch (e) {
        console.error('解析失败', e);
      }
    }
  };

  /**
   * 生成校验范围SQL
   * (由前端 JSON 结构 -> 调用后端 -> 返回 SQL)
   */
  const handleGenerateSqlCondition = async (silent = false) => {
    if (!conditionData.value?.children?.length) {
      if (!silent) message.warning('请先配置校验范围');
      return null;
    }

    try {
      loading.generateSqlCondition = true;
      const res = await api.parserSql(JSON.stringify(conditionData.value));
      if (res?.data) {
        sqlFieldValue.value = res.data;
        if (!silent) message.success('生成成功');
        return res.data;
      }
      return null;
    } catch (e) {
      console.error(e);
      return null;
    } finally {
      loading.generateSqlCondition = false;
    }
  };

  /**
   * 生成校验表达式SQL
   */
  const handleGenerateCheckSqlCondition = async (silent = false) => {
    if (!checkConditionData.value?.children?.length) {
      if (!silent) message.warning('请先配置校验表达式');
      return null;
    }
    // API logic...
    return null; // Mock
  };

  /**
   * 模拟加载操作符
   */
  const loadRuleOperatorOptions = async () => {
    // Mock data
    ruleOperatorOptions.value = [
      { label: '等于', value: '=', kind: 'single' },
      { label: '大于', value: '>', kind: 'single' },
      { label: '包含', value: 'in', kind: 'multi' },
    ];
  };

  // 辅助函数：根据输入筛选选项
  const filterOptions = (options: any[], q: string) => {
    if (!q) return options;
    return options.filter(i => i.label?.includes(q) || i.value?.includes(q));
  };

  return {
    conditionData,
    sqlFieldValue,
    checkConditionData,
    checkSqlFieldValue,
    filterFieldsOptions,
    checkFieldsOptions,
    ruleOperatorOptions,
    loading,
    getFilterFields: async (q: string) => filterOptions(filterFieldsOptions.value, q),
    getCheckFields: async (q: string) => filterOptions(checkFieldsOptions.value, q),
    loadFieldOptions,
    loadRuleOperatorOptions,
    initConditionData,
    handleGenerateSqlCondition,
    handleGenerateCheckSqlCondition,
  };
}
