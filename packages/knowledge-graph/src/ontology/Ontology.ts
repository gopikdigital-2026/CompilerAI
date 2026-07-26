import type { EntityType, RelationshipType } from '../models.js';

export interface OntologyDefinition {
  entityTypes: Record<EntityType, EntityTypeDef>;
  relationshipTypes: Record<RelationshipType, RelationshipTypeDef>;
}

export interface EntityTypeDef {
  type: EntityType;
  label: string;
  description: string;
  requiredProperties: string[];
  optionalProperties: string[];
  allowedRelationships: RelationshipType[];
}

export interface RelationshipTypeDef {
  type: RelationshipType;
  label: string;
  description: string;
  sourceTypes: EntityType[];
  targetTypes: EntityType[];
  bidirectional: boolean;
}

const ENTITY_DEFS: Record<EntityType, EntityTypeDef> = {
  company: {
    type: 'company', label: 'Company', description: 'A business organization',
    requiredProperties: ['name'], optionalProperties: ['industry', 'size', 'website'],
    allowedRelationships: ['belongs_to', 'contains', 'created_by'],
  },
  user: {
    type: 'user', label: 'User', description: 'A platform user',
    requiredProperties: ['name'], optionalProperties: ['email', 'role', 'department'],
    allowedRelationships: ['belongs_to', 'created_by', 'assigned_to', 'participates_in'],
  },
  customer: {
    type: 'customer', label: 'Customer', description: 'A customer account',
    requiredProperties: ['name'], optionalProperties: ['email', 'phone', 'industry', 'revenue'],
    allowedRelationships: ['belongs_to', 'assigned_to', 'related_to', 'references'],
  },
  supplier: {
    type: 'supplier', label: 'Supplier', description: 'A supplier or vendor',
    requiredProperties: ['name'], optionalProperties: ['email', 'phone', 'category'],
    allowedRelationships: ['belongs_to', 'related_to', 'references'],
  },
  employee: {
    type: 'employee', label: 'Employee', description: 'An employee record',
    requiredProperties: ['name'], optionalProperties: ['email', 'department', 'position', 'salary'],
    allowedRelationships: ['belongs_to', 'assigned_to', 'participates_in', 'uses'],
  },
  project: {
    type: 'project', label: 'Project', description: 'A business project',
    requiredProperties: ['name'], optionalProperties: ['status', 'budget', 'deadline', 'description'],
    allowedRelationships: ['belongs_to', 'assigned_to', 'depends_on', 'related_to', 'contains', 'participates_in', 'uses'],
  },
  document: {
    type: 'document', label: 'Document', description: 'A document or file artifact',
    requiredProperties: ['title'], optionalProperties: ['content', 'format', 'size', 'author'],
    allowedRelationships: ['created_by', 'belongs_to', 'references', 'derives_from', 'contains'],
  },
  email: {
    type: 'email', label: 'Email', description: 'An email message',
    requiredProperties: ['subject'], optionalProperties: ['from', 'to', 'body', 'date'],
    allowedRelationships: ['created_by', 'references', 'responds_to', 'belongs_to'],
  },
  meeting: {
    type: 'meeting', label: 'Meeting', description: 'A meeting event',
    requiredProperties: ['title'], optionalProperties: ['date', 'duration', 'attendees', 'notes'],
    allowedRelationships: ['participates_in', 'created_by', 'belongs_to', 'references'],
  },
  ticket: {
    type: 'ticket', label: 'Ticket', description: 'A support or issue ticket',
    requiredProperties: ['title'], optionalProperties: ['status', 'priority', 'assignee', 'description'],
    allowedRelationships: ['belongs_to', 'assigned_to', 'responds_to', 'references', 'derives_from'],
  },
  incident: {
    type: 'incident', label: 'Incident', description: 'A critical incident',
    requiredProperties: ['title'], optionalProperties: ['severity', 'status', 'affectedSystems', 'rootCause'],
    allowedRelationships: ['belongs_to', 'assigned_to', 'responds_to', 'references', 'derives_from'],
  },
  repository: {
    type: 'repository', label: 'Repository', description: 'A code repository',
    requiredProperties: ['name'], optionalProperties: ['url', 'language', 'visibility'],
    allowedRelationships: ['belongs_to', 'contains', 'uses', 'references'],
  },
  file: {
    type: 'file', label: 'File', description: 'A file artifact',
    requiredProperties: ['name'], optionalProperties: ['path', 'size', 'mimeType'],
    allowedRelationships: ['belongs_to', 'references', 'contains', 'derives_from'],
  },
  workflow: {
    type: 'workflow', label: 'Workflow', description: 'An automation workflow',
    requiredProperties: ['name'], optionalProperties: ['status', 'trigger', 'description'],
    allowedRelationships: ['belongs_to', 'executes', 'uses', 'generates', 'references', 'depends_on'],
  },
  agent: {
    type: 'agent', label: 'Agent', description: 'An AI agent',
    requiredProperties: ['name'], optionalProperties: ['role', 'capabilities', 'status'],
    allowedRelationships: ['belongs_to', 'uses', 'executes', 'generates', 'participates_in'],
  },
  task: {
    type: 'task', label: 'Task', description: 'A unit of work',
    requiredProperties: ['title'], optionalProperties: ['status', 'priority', 'assignee', 'deadline'],
    allowedRelationships: ['belongs_to', 'assigned_to', 'depends_on', 'related_to', 'references'],
  },
  objective: {
    type: 'objective', label: 'Objective', description: 'A business objective or goal',
    requiredProperties: ['title'], optionalProperties: ['status', 'progress', 'deadline', 'description'],
    allowedRelationships: ['belongs_to', 'assigned_to', 'depends_on', 'related_to', 'contains'],
  },
};

const RELATIONSHIP_DEFS: Record<RelationshipType, RelationshipTypeDef> = {
  belongs_to: {
    type: 'belongs_to', label: 'Belongs To', description: 'Ownership or containment relationship',
    sourceTypes: Object.keys(ENTITY_DEFS) as EntityType[],
    targetTypes: ['company', 'project', 'user', 'customer'],
    bidirectional: false,
  },
  created_by: {
    type: 'created_by', label: 'Created By', description: 'Entity was created by a user or agent',
    sourceTypes: Object.keys(ENTITY_DEFS) as EntityType[],
    targetTypes: ['user', 'agent', 'employee'],
    bidirectional: false,
  },
  assigned_to: {
    type: 'assigned_to', label: 'Assigned To', description: 'Entity is assigned to a user, agent, or employee',
    sourceTypes: ['ticket', 'incident', 'task', 'project', 'objective'],
    targetTypes: ['user', 'agent', 'employee', 'customer'],
    bidirectional: false,
  },
  depends_on: {
    type: 'depends_on', label: 'Depends On', description: 'Entity depends on another entity',
    sourceTypes: ['project', 'task', 'workflow', 'objective', 'incident'],
    targetTypes: Object.keys(ENTITY_DEFS) as EntityType[],
    bidirectional: false,
  },
  related_to: {
    type: 'related_to', label: 'Related To', description: 'Generic relationship between entities',
    sourceTypes: Object.keys(ENTITY_DEFS) as EntityType[],
    targetTypes: Object.keys(ENTITY_DEFS) as EntityType[],
    bidirectional: true,
  },
  responds_to: {
    type: 'responds_to', label: 'Responds To', description: 'Entity is a response to another entity',
    sourceTypes: ['email', 'ticket', 'incident', 'task'],
    targetTypes: ['email', 'ticket', 'incident', 'task'],
    bidirectional: false,
  },
  contains: {
    type: 'contains', label: 'Contains', description: 'Entity contains another entity',
    sourceTypes: ['project', 'repository', 'document', 'company', 'objective'],
    targetTypes: ['file', 'document', 'task', 'repository', 'email', 'meeting'],
    bidirectional: false,
  },
  references: {
    type: 'references', label: 'References', description: 'Entity references another entity',
    sourceTypes: Object.keys(ENTITY_DEFS) as EntityType[],
    targetTypes: Object.keys(ENTITY_DEFS) as EntityType[],
    bidirectional: false,
  },
  participates_in: {
    type: 'participates_in', label: 'Participates In', description: 'Entity participates in a project or meeting',
    sourceTypes: ['user', 'employee', 'agent', 'customer'],
    targetTypes: ['project', 'meeting'],
    bidirectional: true,
  },
  uses: {
    type: 'uses', label: 'Uses', description: 'Entity uses a tool, connector, or resource',
    sourceTypes: ['agent', 'workflow', 'employee', 'user', 'project'],
    targetTypes: ['repository', 'file', 'document', 'agent'],
    bidirectional: false,
  },
  generates: {
    type: 'generates', label: 'Generates', description: 'Entity generates output',
    sourceTypes: ['agent', 'workflow'],
    targetTypes: ['document', 'file', 'email', 'task'],
    bidirectional: false,
  },
  executes: {
    type: 'executes', label: 'Executes', description: 'Agent or workflow executes a task or workflow',
    sourceTypes: ['agent', 'workflow'],
    targetTypes: ['task', 'workflow'],
    bidirectional: false,
  },
  derives_from: {
    type: 'derives_from', label: 'Derives From', description: 'Entity is derived from another entity',
    sourceTypes: ['document', 'file', 'ticket', 'incident'],
    targetTypes: ['document', 'file', 'ticket', 'incident', 'email'],
    bidirectional: false,
  },
};

export class Ontology {
  readonly definition: OntologyDefinition;

  constructor() {
    this.definition = {
      entityTypes: ENTITY_DEFS,
      relationshipTypes: RELATIONSHIP_DEFS,
    };
  }

  getEntityDef(type: EntityType): EntityTypeDef | undefined {
    return ENTITY_DEFS[type];
  }

  getRelationshipDef(type: RelationshipType): RelationshipTypeDef | undefined {
    return RELATIONSHIP_DEFS[type];
  }

  validateEntity(type: EntityType, properties: Record<string, unknown>): { valid: boolean; missing: string[] } {
    const def = ENTITY_DEFS[type];
    if (!def) return { valid: false, missing: [] };
    const missing = def.requiredProperties.filter((p) => properties[p] === undefined || properties[p] === null);
    return { valid: missing.length === 0, missing };
  }

  validateRelationship(
    type: RelationshipType,
    sourceType: EntityType,
    targetType: EntityType,
  ): { valid: boolean; reason?: string } {
    const def = RELATIONSHIP_DEFS[type];
    if (!def) return { valid: false, reason: `Unknown relationship type: ${type}` };
    if (!def.sourceTypes.includes(sourceType)) {
      return { valid: false, reason: `Relationship '${type}' cannot start from '${sourceType}'` };
    }
    if (!def.targetTypes.includes(targetType)) {
      return { valid: false, reason: `Relationship '${type}' cannot point to '${targetType}'` };
    }
    return { valid: true };
  }

  isBidirectional(type: RelationshipType): boolean {
    return RELATIONSHIP_DEFS[type]?.bidirectional ?? false;
  }

  getAllEntityTypes(): EntityType[] {
    return Object.keys(ENTITY_DEFS) as EntityType[];
  }

  getAllRelationshipTypes(): RelationshipType[] {
    return Object.keys(RELATIONSHIP_DEFS) as RelationshipType[];
  }
}
