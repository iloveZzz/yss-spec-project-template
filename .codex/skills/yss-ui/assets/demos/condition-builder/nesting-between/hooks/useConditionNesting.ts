import type { OptionItem } from '@yss-ui/components';
import { fieldOptions } from '../constants';

export const useConditionNesting = () => {
  const loadFields = async (q: string) => {
    const s = (q || '').toLowerCase();
    return fieldOptions.filter(o => o.label.toLowerCase().includes(s) || o.value.toLowerCase().includes(s));
  };

  const loadValues = async (args: { q: string; field: unknown }) => {
    const key = String(args.field || '');
    const s = (args.q || '').toLowerCase();
    if (key === 'date') {
      const all: OptionItem[] = ['2024-01-01', '2024-06-01', '2024-12-31'].map(v => ({ label: v, value: v }));
      return all.filter(o => o.value.toLowerCase().includes(s));
    }
    if (key === 'score') {
      const all: OptionItem[] = ['60', '80', '90'].map(v => ({ label: v, value: v }));
      return all.filter(o => o.value.toLowerCase().includes(s));
    }
    return [];
  };

  return { loadFields, loadValues };
};
