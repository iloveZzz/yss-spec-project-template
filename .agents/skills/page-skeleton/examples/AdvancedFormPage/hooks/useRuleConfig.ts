import { reactive, ref } from 'vue';
import { message } from 'ant-design-vue';
import type { ConditionGroup, OptionItem } from '@yss-ui/components';
import { FIELD_OPTIONS, RULE_OPERATOR_OPTIONS } from '../constant';

/** 创建空条件组。 */
const createEmptyGroup = (id: string): ConditionGroup => ({
  id,
  type: 'GROUP',
  logicalOp: 'AND',
  children: [],
});

/** 按关键词筛选条件字段。 */
const filterFields = (keyword: string): OptionItem[] => {
  const normalizedKeyword = keyword.trim().toLowerCase();
  if (!normalizedKeyword) return FIELD_OPTIONS;
  return FIELD_OPTIONS.filter(item =>
    [item.label, item.value].some(value =>
      String(value ?? '')
        .toLowerCase()
        .includes(normalizedKeyword)
    )
  );
};

/** 管理条件构建器与预览状态。 */
export const useRuleConfig = () => {
  const filterCondition = ref<ConditionGroup>(createEmptyGroup('filter-root'));
  const checkCondition = ref<ConditionGroup>(createEmptyGroup('check-root'));
  const filterPreview = ref('');
  const checkPreview = ref('');
  const loading = reactive({ filterPreview: false, checkPreview: false });

  /** 为 YConditionBuilder 加载可搜索字段。 */
  const loadFields = async (keyword: string): Promise<OptionItem[]> => filterFields(keyword);

  /** 生成条件 JSON 预览。 */
  const generatePreview = async (
    condition: ConditionGroup,
    target: 'filterPreview' | 'checkPreview'
  ): Promise<void> => {
    if (!condition.children.length) {
      message.warning('请先配置完整条件');
      return;
    }

    loading[target] = true;
    try {
      const preview = JSON.stringify(condition, null, 2);
      if (target === 'filterPreview') filterPreview.value = preview;
      else checkPreview.value = preview;
    } finally {
      loading[target] = false;
    }
  };

  /** 生成校验范围预览。 */
  const generateFilterPreview = (): Promise<void> => generatePreview(filterCondition.value, 'filterPreview');

  /** 生成校验表达式预览。 */
  const generateCheckPreview = (): Promise<void> => generatePreview(checkCondition.value, 'checkPreview');

  return {
    filterCondition,
    checkCondition,
    filterPreview,
    checkPreview,
    loading,
    operatorOptions: RULE_OPERATOR_OPTIONS,
    loadFields,
    generateFilterPreview,
    generateCheckPreview,
  };
};
