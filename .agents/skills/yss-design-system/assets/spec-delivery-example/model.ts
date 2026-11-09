export type Actor = { userId: string; teamId: string; role: 'editor' | 'observer' }
export type RequestRecord = {
  id: string
  teamId: string
  ownerId: string
  title: string
  note: string
  status: 'draft' | 'submitted'
  requiredAttachments: string[]
  attachments: string[]
}
export type Draft = Pick<RequestRecord, 'title' | 'note' | 'attachments'>
export type ExampleData = {
  actor: Actor
  requests: RequestRecord[]
  openRequestId: string | null
  failFirstSubmit: boolean
  failFirstRequirementsRead: boolean
}

export function canView(record: RequestRecord, actor: Actor): boolean {
  return record.teamId === actor.teamId &&
    (actor.role === 'observer' || (actor.role === 'editor' && record.ownerId === actor.userId))
}

export function canEdit(record: RequestRecord, actor: Actor): boolean {
  return canView(record, actor) && actor.role === 'editor' && record.status === 'draft'
}

export function validateTitle(value: string): string | null {
  return value.trim() ? null : '请输入申请标题'
}

export function missingAttachments(required: string[], present: string[]): string[] {
  return required.filter(name => !present.includes(name))
}
