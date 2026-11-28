<script setup lang="ts">
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import type { ViewNode } from './surface'

defineProps<{ node: ViewNode }>()
</script>

<template>
  <Card v-if="node.kind === 'Card'" class="px-6">
    <SurfaceNode v-for="child in node.children" :key="child.id" :node="child" />
  </Card>
  <div v-else-if="node.kind === 'Column'" class="flex min-w-0 flex-col items-start gap-4">
    <SurfaceNode v-for="child in node.children" :key="child.id" :node="child" />
  </div>
  <p v-else-if="node.kind === 'Text'" :class="node.caption ? 'text-sm text-muted-foreground' : 'text-base leading-relaxed'">
    {{ node.text }}
  </p>
  <Button v-else-if="node.kind === 'Button'" type="button" :variant="node.variant" @click="node.activate()">
    {{ node.label }}
  </Button>
  <component :is="node.view" v-else-if="node.kind === 'custom'" v-bind="node.props">
    <SurfaceNode v-for="child in node.children" :key="child.id" :node="child" />
  </component>
</template>
