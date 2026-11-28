import { type InjectionKey, type Ref } from 'vue'

export interface FormSectionEntry {
  readonly rootEl: Ref<HTMLElement | null>
  readonly open: Ref<boolean>
  readonly reveal: () => Promise<void>
}

export interface FormSectionRegistry {
  register(entry: FormSectionEntry): () => void
  revealContaining(node: Element): Promise<void>
  revealAll(): Promise<void>
}

export const FORM_SECTION_REGISTRY_KEY: InjectionKey<FormSectionRegistry> = Symbol(
  'scrm-form-section-registry',
)
