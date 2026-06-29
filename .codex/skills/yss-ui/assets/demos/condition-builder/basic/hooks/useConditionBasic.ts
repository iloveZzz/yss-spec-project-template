import type { OptionItem } from '@yss-ui/components';
import { fieldOptions, valueDict } from '../constants';

export const useConditionBasic = () => {
  const loadFields = async (q: string) => {
    const s = (q || '').toLowerCase();
    return fieldOptions.filter(o => o.label.toLowerCase().includes(s) || o.value.toLowerCase().includes(s));
  };

  const loadValues = async (args: { q: string; field: unknown }) => {
    const key = String(args.field || '');
    const list: OptionItem[] = valueDict[key] || [];
    const s = (args.q || '').toLowerCase();
    return list.filter(o => o.label.toLowerCase().includes(s) || o.value.toLowerCase().includes(s));
  };

  return { loadFields, loadValues };
};
