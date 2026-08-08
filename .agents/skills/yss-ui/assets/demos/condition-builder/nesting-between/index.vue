<script setup lang="ts">
import { ref } from 'vue';
import { YConditionBuilder } from '@yss-ui/components';
import type { ConditionGroup } from '@yss-ui/components';
import { operatorOptions, initialNested } from './constants';
import { useConditionNesting } from './hooks/useConditionNesting';

const model = ref<ConditionGroup>(initialNested);
const { loadFields, loadValues } = useConditionNesting();
</script>

<template>
  <div>
    <YConditionBuilder
      v-model="model"
      :operator-options="operatorOptions"
      :load-fields="loadFields"
      :load-values="args => loadValues({ q: args.q, field: args.field })"
      :max-depth="4"
    />
  </div>
</template>

<style scoped lang="less"></style>
