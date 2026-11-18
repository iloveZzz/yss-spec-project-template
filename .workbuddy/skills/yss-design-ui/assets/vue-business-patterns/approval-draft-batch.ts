import { defineComponent, h } from 'vue'
import { mount } from './mount'
import ApprovalDraft from './ApprovalDraft.vue'
import './draft.css'

const Page = defineComponent({ props: ['scene'], setup: props => () => h(ApprovalDraft, { scene: props.scene, mode: 'batch' }) })
mount(Page, '资料审批草稿 · 批量处理', 'draft')
