<script setup lang="ts">
import { computed } from 'vue'
import { columnVisibilityFeature, createSortedRowModel, rowSortingFeature, sortFn_alphanumeric, tableFeatures, useTable } from '@tanstack/vue-table'
import { Button } from '../button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../table'

type Cell = string | number | boolean | null
const props = withDefaults(defineProps<{
  columns: { key: string; label: string }[]
  rows: Record<string, Cell>[]
  emptyText?: string
}>(), { rows: () => [], columns: () => [], emptyText: '暂无数据' })
const features = tableFeatures({ columnVisibilityFeature, rowSortingFeature, sortedRowModel: createSortedRowModel(), sortFns: { alphanumeric: sortFn_alphanumeric } })
const columns = computed(() => props.columns.map(column => ({
  id: column.key, header: column.label, accessorFn: (row: Record<string, Cell>) => row[column.key],
  sortFn: sortFn_alphanumeric,
})))
const table = useTable({ features, get data() { return props.rows }, get columns() { return columns.value } })
</script>

<template>
  <Table>
    <TableHeader><TableRow v-for="group in table.getHeaderGroups()" :key="group.id">
      <TableHead v-for="header in group.headers" :key="header.id" :aria-sort="header.column.getIsSorted() === 'asc' ? 'ascending' : header.column.getIsSorted() === 'desc' ? 'descending' : 'none'">
        <Button type="button" variant="ghost" @click="header.column.toggleSorting()">{{ header.column.columnDef.header }}</Button>
      </TableHead>
    </TableRow></TableHeader>
    <TableBody>
      <TableRow v-for="row in table.getRowModel().rows" :key="row.id">
        <TableCell v-for="cell in row.getVisibleCells()" :key="cell.id">{{ cell.getValue() }}</TableCell>
      </TableRow>
      <TableRow v-if="!rows.length"><TableCell :colspan="Math.max(1,columns.length)">{{ emptyText }}</TableCell></TableRow>
    </TableBody>
  </Table>
</template>
