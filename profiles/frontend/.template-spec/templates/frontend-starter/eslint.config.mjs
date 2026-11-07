import pluginVue from 'eslint-plugin-vue'
import { withVueTs, vueTsConfigs } from '@vue/eslint-config-typescript'

export default withVueTs(
  { ignores: ['dist/**', 'node_modules/**', '.agents/**', '.claude/**', '.workbuddy/**'] },
  pluginVue.configs['flat/essential'],
  vueTsConfigs.recommended,
  {
    // Keep page entry filenames and vendored component names.
    files: ['src/views/**/index.vue', 'src/components/ui/**/*.vue'],
    rules: { 'vue/multi-word-component-names': 'off' },
  },
)
