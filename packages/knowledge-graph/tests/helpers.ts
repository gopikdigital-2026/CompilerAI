function requiredProp(type: string): string {
  if (type === 'email') return 'subject';
  if (['document', 'meeting', 'ticket', 'incident', 'task', 'objective'].includes(type)) return 'title';
  return 'name';
}

export function makeEntityProps(type: string, name: string): Record<string, unknown> {
  const prop = requiredProp(type);
  return { [prop]: name, name };
}

export function makeEntity(id: string, type: import('../src/models.js').EntityType, name: string, orgId: string = 'org-1', tags: string[] = ['test']): import('../src/models.js').Entity {
  const now = new Date().toISOString();
  return {
    id,
    type,
    properties: makeEntityProps(type, name),
    tags,
    metadata: {},
    createdAt: now,
    updatedAt: now,
    organizationId: orgId,
  };
}

export function makeRel(
  id: string,
  type: import('../src/models.js').RelationshipType,
  sourceId: string,
  targetId: string,
  orgId: string = 'org-1',
  bidirectional: boolean = false,
): import('../src/models.js').Relationship {
  return {
    id,
    type,
    sourceId,
    targetId,
    properties: {},
    bidirectional,
    createdAt: new Date().toISOString(),
    organizationId: orgId,
  };
}
