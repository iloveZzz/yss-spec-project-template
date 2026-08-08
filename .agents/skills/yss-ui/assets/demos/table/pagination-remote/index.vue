<script setup lang="ts">
import { YTable } from '@yss-ui/components';
import { usePaginationRemote } from './hooks/usePaginationRemote';

defineOptions({ name: 'DemoTablePaginationRemote' });

const { loading, dataSource, pagination, columns, handlePageChange } = usePaginationRemote();
</script>

<template>
  <div style="padding: 12px">
    <YTable
      v-model:pagination="pagination"
      :data="dataSource"
      :columns="columns"
      :loading="loading"
      :pageable="true"
      height="420px"
      @page-change="handlePageChange"
    />
  </div>
</template>

<style scoped></style>
