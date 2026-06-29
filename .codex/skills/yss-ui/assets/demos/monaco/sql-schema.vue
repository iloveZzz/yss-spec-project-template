<script setup lang="ts">
import { YMonaco } from '@yss-ui/components';
import { ref } from 'vue';

const sql = ref<string>('SELECT u.id, u.name FROM users u JOIN orders o ON u.id = o.user_id');

const sqlSchema = {
  schema: 'public',
  tables: [
    { name: 'users', columns: [{ name: 'id' }, { name: 'name' }, { name: 'age' }] },
    { name: 'orders', columns: [{ name: 'order_id' }, { name: 'user_id' }, { name: 'amount' }] },
  ],
};
</script>

<template>
  <YMonaco v-model="sql" language="sql" :sql-schema="sqlSchema" :height="300" />
</template>

<style scoped></style>
