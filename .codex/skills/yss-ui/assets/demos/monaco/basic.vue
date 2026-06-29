<script setup lang="ts">
import { YMonaco } from '@yss-ui/components';
import { ref } from 'vue';

const code = ref<string>(
  "WITH MONTHS AS (\r\n    SELECT TO_CHAR(\r\n                   ADD_MONTHS(TRUNC(TO_DATE(#{bizDate}, 'YYYYMMDD'), 'YEAR'), LEVEL - 1),\r\n                   'YYYYMM'\r\n           ) AS PERMTH\r\n    FROM DUAL\r\n    CONNECT BY LEVEL <= 12\r\n),\r\n     INVEST_TYPES AS (\r\n         SELECT '股票' AS INVEST_TYPE, 1 AS RANK_ID FROM DUAL UNION ALL\r\n         SELECT '债券', 2 FROM DUAL UNION ALL\r\n         SELECT '基金', 3 FROM DUAL UNION ALL\r\n         SELECT '非标', 4 FROM DUAL UNION ALL\r\n         SELECT '黄金', 5 FROM DUAL\r\n     ),\r\n     CROSS_DATA AS (\r\n         SELECT\r\n             m.PERMTH,\r\n             t.INVEST_TYPE,\r\n             t.RANK_ID\r\n         FROM MONTHS m\r\n                  CROSS JOIN INVEST_TYPES t\r\n     )\r\nSELECT\r\n    cd.PERMTH,\r\n    cd.INVEST_TYPE,\r\n    d.ID,\r\n    NVL(TO_CHAR(d.NOTE), '') AS NOTE,\r\n    cd.RANK_ID\r\nFROM CROSS_DATA cd\r\n         LEFT JOIN T_ADS_BI_MTH_NOTE_I d\r\n                   ON cd.INVEST_TYPE = d.INVEST_TYPE\r\n                       AND cd.PERMTH = d.PERMTH\r\n                       AND d.STATUS = 1\r\nORDER BY cd.PERMTH, cd.RANK_ID"
);

function onRun(payload: { sql: string; isAll: boolean }) {
  // eslint-disable-next-line no-console
  console.log('[YMonaco Run]', payload.isAll ? 'ALL' : 'SELECTION', '\\n', payload.sql);
}

// 简单 schema：用于表/字段提示
const sqlSchema = {
  schema: 'public',
  tables: [
    {
      name: 'T_ADS_BI_MTH_NOTE_I',
      columns: [
        { name: 'ID', type: 'number' },
        { name: 'NOTE', type: 'varchar' },
        { name: 'INVEST_TYPE', type: 'varchar' },
        { name: 'PERMTH', type: 'varchar' },
        { name: 'STATUS', type: 'number' },
      ],
    },
    {
      name: 'CROSS_DATA',
      columns: [{ name: 'PERMTH' }, { name: 'INVEST_TYPE' }, { name: 'RANK_ID' }],
    },
  ],
};
</script>

<template>
  <YMonaco v-model="code" :sql-schema="sqlSchema" height="500px" @run="onRun" />
</template>

<style scoped></style>
