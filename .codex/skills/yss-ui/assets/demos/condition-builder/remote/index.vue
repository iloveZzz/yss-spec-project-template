<script setup lang="ts">
import { ref } from 'vue';
import { YConditionBuilder } from '@yss-ui/components';
import type { ConditionGroup } from '@yss-ui/components';
import { createInitial } from './constants';
import { useConditionRemote } from './hooks/useConditionRemote';

const model = ref<ConditionGroup>(createInitial());
const { loadFields, getOperators, loadValues } = useConditionRemote();
</script>

<template>
  <div>
    <YConditionBuilder
      v-model="model"
      :get-operators="getOperators"
      :load-fields="loadFields"
      :load-values="args => loadValues({ q: args.q, field: args.field, operator: args.operator })"
    />
  </div>
</template>

<style scoped lang="less"></style>
