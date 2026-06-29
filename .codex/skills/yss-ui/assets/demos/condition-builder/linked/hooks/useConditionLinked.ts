import type { OperatorOption, OptionItem } from '@yss-ui/components';
import { operatorsByField, fieldOptions, valueDictByField } from '../constants';

export const useConditionLinked = () => {
  const loadFields = async (q: string) => {
    const s = (q || '').toLowerCase();
    return fieldOptions.filter(o => o.label.toLowerCase().includes(s) || o.value.toLowerCase().includes(s));
  };

  const getOperators = async (field: unknown): Promise<OperatorOption[]> => {
    const key = String(field || '');
    return operatorsByField[key] || [];
  };

  const loadValues = async (args: { q: string; field: unknown; operator?: string }) => {
    const key = String(args.field || '');
    const list: OptionItem[] = valueDictByField[key] || [];
    const s = (args.q || '').toLowerCase();
    if (args.operator === 'LIKE') {
      return [
        { label: '%测试%', value: '%测试%' },
        { label: '%用户%', value: '%用户%' },
      ];
    }
    return list.filter(o => o.label.toLowerCase().includes(s) || o.value.toLowerCase().includes(s));
  };

  return { loadFields, getOperators, loadValues };
};
