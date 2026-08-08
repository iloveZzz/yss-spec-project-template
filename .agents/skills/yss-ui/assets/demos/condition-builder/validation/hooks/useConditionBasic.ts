import type { OptionItem } from '@yss-ui/components';
import { fieldOptions, valueDict } from '../constants';

export const useConditionBasic = () => {
  const loadFields = async (q: string): Promise<OptionItem[]> => {
    await new Promise(resolve => setTimeout(resolve, 300));
    if (!q) return fieldOptions;
    return fieldOptions.filter(opt => opt.label.includes(q) || opt.value.includes(q));
  };

  const loadValues = async ({ q, field }: { q: string; field: string }): Promise<OptionItem[]> => {
    await new Promise(resolve => setTimeout(resolve, 300));
    const options = valueDict[field] || [];
    if (!q) return options;
    return options.filter(opt => opt.label.includes(q) || opt.value.includes(q));
  };

  return {
    loadFields,
    loadValues,
  };
};
