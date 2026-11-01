import { mountWorkspace, singlePageDefinition } from './workspace'
export function mount(page: any, title: string, appearance: 'standard' | 'glass' | 'draft' = 'standard', id = 'main') {
  return mountWorkspace(singlePageDefinition(page, title, appearance, id))
}
