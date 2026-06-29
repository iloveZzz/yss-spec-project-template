<template>
  <div>
    <YssFormily :schema="schema" :initial-values="{ province: '', city: '' }" />
  </div>
</template>
<script setup lang="ts">
import { YssFormily, type ISchema } from '@yss-ui/components';

/** 选项项类型 */
type Option = { label: string; value: string };

/**
 * 根据省份编码返回城市选项
 * @param province - 省份编码
 * @returns 城市下拉选项
 */
const getCityOptionsByProvince = (province: string): Option[] => {
  const map: Record<string, Option[]> = {
    beijing: [
      { label: '朝阳区', value: 'chaoyang' },
      { label: '海淀区', value: 'haidian' },
    ],
    shanghai: [
      { label: '浦东新区', value: 'pudong' },
      { label: '徐汇区', value: 'xuhui' },
    ],
    guangdong: [
      { label: '广州', value: 'guangzhou' },
      { label: '深圳', value: 'shenzhen' },
    ],
  };
  return map[province] || [];
};

const schema: ISchema = {
  type: 'object',
  properties: {
    layout: {
      type: 'void',
      'x-component': 'FormLayout',
      'x-component-props': { layout: 'horizontal', labelWidth: 90 },
      properties: {
        grid: {
          type: 'void',
          'x-component': 'FormGrid',
          // 'x-component-props': { maxColumns: 3, minColumns: 1, columnGap: 16, rowGap: 0, minWidth: 260 },
          properties: {
            province: {
              type: 'string',
              title: '省份',
              'x-decorator': 'FormItem',
              'x-component': 'Select',
              enum: [
                { label: '北京', value: 'beijing' },
                { label: '上海', value: 'shanghai' },
                { label: '广东', value: 'guangdong' },
              ],
            },
            city: {
              type: 'string',
              title: '城市',
              'x-decorator': 'FormItem',
              'x-component': 'Select',
              'x-component-props': { placeholder: '请选择' },
              'x-reactions': (field: any) => {
                const province: string = field.query('province').get('value') || '';
                const options = getCityOptionsByProvince(province);
                field.dataSource = options;
                field.value = '';
              },
            },
          },
        },
      },
    },
  },
};
</script>
