import type { OperatorOption, OptionItem } from '@yss-ui/components';

const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

export const useConditionRemote = () => {
  const loadFields = async (q: string) => {
    await delay(200);
    const all: OptionItem[] = [
      { label: '部门', value: 'dept' },
      { label: '地区', value: 'region' },
      { label: '评分', value: 'score' },
    ];
    const s = (q || '').toLowerCase();
    return all.filter(o => o.label.toLowerCase().includes(s) || o.value.toLowerCase().includes(s));
  };

  const getOperators = async (field: unknown): Promise<OperatorOption[]> => {
    await delay(150);
    const map: Record<string, OperatorOption[]> = {
      dept: [
        { label: 'IN', value: 'IN', kind: 'multiple' },
        { label: 'NOT IN', value: 'NOT IN', kind: 'multiple' },
        { label: 'IS NULL', value: 'IS NULL', kind: 'none' },
      ],
      region: [
        { label: '=', value: '=', kind: 'single' },
        { label: '!=', value: '!=', kind: 'single' },
      ],
      score: [
        { label: '>', value: '>', kind: 'single' },
        { label: 'BETWEEN', value: 'BETWEEN', kind: 'between' },
      ],
    };
    return map[String(field || '')] || [{ label: '=', value: '=', kind: 'single' }];
  };

  const loadValues = async (args: { q: string; field: unknown; operator?: string }) => {
    await delay(220);
    const key = String(args.field || '');
    const s = (args.q || '').toLowerCase();
    if (key === 'dept') {
      const all: OptionItem[] = [
        { label: '研发', value: '研发' },
        { label: '市场', value: '市场' },
        { label: '运营', value: '运营' },
      ];
      return all.filter(o => o.label.toLowerCase().includes(s) || o.value.toLowerCase().includes(s));
    }
    if (key === 'region') {
      const all: OptionItem[] = [
        { label: '华北', value: '华北' },
        { label: '华东', value: '华东' },
        { label: '华南', value: '华南' },
      ];
      return all.filter(o => o.label.toLowerCase().includes(s) || o.value.toLowerCase().includes(s));
    }
    if (key === 'score') {
      if (args.operator === 'BETWEEN') {
        return [
          { label: '60', value: '60' },
          { label: '80', value: '80' },
          { label: '90', value: '90' },
        ];
      }
      return [
        { label: '60', value: '60' },
        { label: '70', value: '70' },
        { label: '80', value: '80' },
      ].filter(o => o.label.toLowerCase().includes(s) || o.value.toLowerCase().includes(s));
    }
    return [];
  };

  return { loadFields, getOperators, loadValues };
};
