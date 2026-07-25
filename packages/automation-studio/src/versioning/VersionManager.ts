import type { Workflow, WorkflowVersion, WorkflowSnapshot } from '../models/WorkflowDefinition.js';

export interface VersionDiff {
  fromVersion: number;
  toVersion: number;
  addedNodes: Array<{ id: string; type: string; label: string }>;
  removedNodes: Array<{ id: string; type: string; label: string }>;
  modifiedNodes: Array<{ id: string; changes: string[] }>;
  addedConnections: Array<{ from: string; to: string }>;
  removedConnections: Array<{ from: string; to: string }>;
  summary: string;
}

export interface VersionTag {
  version: number;
  tag: string;
  taggedAt: string;
  taggedBy: string;
}

export interface VersionHistoryEntry {
  version: number;
  status: string;
  publishedAt: string;
  publishedBy: string;
  changelog: string;
  tags: string[];
  nodeCount: number;
  connectionCount: number;
}

interface SnapshotNode {
  id: string;
  type: string;
  label: string;
  config: Record<string, unknown>;
}

interface SnapshotConnection {
  fromNodeId: string;
  toNodeId: string;
}

function getSnapshot(
  workflow: Workflow,
  version: number,
): WorkflowSnapshot | null {
  if (version === workflow.currentVersion) {
    return {
      nodes: workflow.nodes,
      connections: workflow.connections,
      version,
      capturedAt: '',
    };
  }
  const entry = workflow.versions.find((v) => v.version === version);
  return entry ? entry.snapshot : null;
}

export class VersionManager {
  private readonly versionTags: Map<string, VersionTag[]> = new Map();

  constructor(
    _idGen: () => string,
    private readonly clock: () => string,
  ) {}

  getHistory(workflow: Workflow): VersionHistoryEntry[] {
    const tagsFor = (version: number): string[] =>
      (this.versionTags.get(workflow.id) ?? [])
        .filter((t) => t.version === version)
        .map((t) => t.tag);

    const entries: VersionHistoryEntry[] = workflow.versions.map((v) => ({
      version: v.version,
      status: v.status,
      publishedAt: v.publishedAt ?? '',
      publishedBy: v.publishedBy ?? '',
      changelog: v.changelog,
      tags: tagsFor(v.version),
      nodeCount: v.snapshot.nodes.length,
      connectionCount: v.snapshot.connections.length,
    }));

    // Include the current working version as an implicit entry.
    if (!entries.some((e) => e.version === workflow.currentVersion)) {
      entries.push({
        version: workflow.currentVersion,
        status: workflow.status,
        publishedAt: workflow.publishedAt ?? '',
        publishedBy: workflow.publishedBy ?? '',
        changelog: 'Working draft',
        tags: tagsFor(workflow.currentVersion),
        nodeCount: workflow.nodes.length,
        connectionCount: workflow.connections.length,
      });
    }

    return entries.sort((a, b) => a.version - b.version);
  }

  diff(workflow: Workflow, fromVersion: number, toVersion: number): VersionDiff {
    const fromSnap = getSnapshot(workflow, fromVersion);
    const toSnap = getSnapshot(workflow, toVersion);

    const fromNodes = new Map((fromSnap?.nodes ?? []).map((n) => [n.id, n as SnapshotNode]));
    const toNodes = new Map((toSnap?.nodes ?? []).map((n) => [n.id, n as SnapshotNode]));

    const fromConns = new Set(
      (fromSnap?.connections ?? []).map(
        (c) => `${(c as SnapshotConnection).fromNodeId}->${(c as SnapshotConnection).toNodeId}`,
      ),
    );
    const toConns = new Set(
      (toSnap?.connections ?? []).map(
        (c) => `${(c as SnapshotConnection).fromNodeId}->${(c as SnapshotConnection).toNodeId}`,
      ),
    );

    const addedNodes: Array<{ id: string; type: string; label: string }> = [];
    const removedNodes: Array<{ id: string; type: string; label: string }> = [];
    const modifiedNodes: Array<{ id: string; changes: string[] }> = [];

    for (const [id, node] of toNodes) {
      if (!fromNodes.has(id)) {
        addedNodes.push({ id, type: node.type, label: node.label });
      } else {
        const before = fromNodes.get(id)!;
        const changes: string[] = [];
        if (before.label !== node.label) changes.push('label changed');
        if (JSON.stringify(before.config) !== JSON.stringify(node.config)) {
          changes.push('config changed');
        }
        if (changes.length > 0) modifiedNodes.push({ id, changes });
      }
    }
    for (const [id, node] of fromNodes) {
      if (!toNodes.has(id)) {
        removedNodes.push({ id, type: node.type, label: node.label });
      }
    }

    const addedConnections: Array<{ from: string; to: string }> = [];
    const removedConnections: Array<{ from: string; to: string }> = [];
    for (const key of toConns) {
      if (!fromConns.has(key)) {
        const [from, to] = key.split('->');
        addedConnections.push({ from, to });
      }
    }
    for (const key of fromConns) {
      if (!toConns.has(key)) {
        const [from, to] = key.split('->');
        removedConnections.push({ from, to });
      }
    }

    const summaryParts: string[] = [];
    if (addedNodes.length) summaryParts.push(`+${addedNodes.length} nodes`);
    if (removedNodes.length) summaryParts.push(`-${removedNodes.length} nodes`);
    if (modifiedNodes.length) summaryParts.push(`~${modifiedNodes.length} nodes`);
    if (addedConnections.length) summaryParts.push(`+${addedConnections.length} edges`);
    if (removedConnections.length) summaryParts.push(`-${removedConnections.length} edges`);

    return {
      fromVersion,
      toVersion,
      addedNodes,
      removedNodes,
      modifiedNodes,
      addedConnections,
      removedConnections,
      summary: summaryParts.length ? summaryParts.join(', ') : 'no changes',
    };
  }

  tagVersion(workflow: Workflow, version: number, tag: string, taggedBy: string): Workflow {
    const existing = this.versionTags.get(workflow.id) ?? [];
    if (existing.some((t) => t.version === version && t.tag === tag)) {
      return workflow; // already tagged
    }
    existing.push({ version, tag, taggedAt: this.clock(), taggedBy });
    this.versionTags.set(workflow.id, existing);
    return { ...workflow, tags: [...new Set([...workflow.tags, tag])] };
  }

  untagVersion(workflow: Workflow, version: number, tag: string): Workflow {
    const existing = this.versionTags.get(workflow.id) ?? [];
    this.versionTags.set(
      workflow.id,
      existing.filter((t) => !(t.version === version && t.tag === tag)),
    );
    return { ...workflow, tags: workflow.tags.filter((t) => t !== tag) };
  }

  getTags(workflow: Workflow): VersionTag[] {
    return this.versionTags.get(workflow.id) ?? [];
  }

  findByTag(workflow: Workflow, tag: string): VersionHistoryEntry | null {
    const tags = this.versionTags.get(workflow.id) ?? [];
    const found = tags.find((t) => t.tag === tag);
    if (!found) return null;
    return this.getHistory(workflow).find((e) => e.version === found.version) ?? null;
  }

  restore(workflow: Workflow, targetVersion: number, restoredBy: string): Workflow {
    const versionEntry = workflow.versions.find((v) => v.version === targetVersion);
    if (!versionEntry) {
      return workflow;
    }
    const now = this.clock();
    const snapshot: WorkflowSnapshot = {
      nodes: versionEntry.snapshot.nodes.map((n) => ({ ...n })),
      connections: versionEntry.snapshot.connections.map((c) => ({ ...c })),
      version: targetVersion,
      capturedAt: now,
    };

    const newVersion: WorkflowVersion = {
      version: workflow.currentVersion + 1,
      status: 'draft',
      publishedAt: null,
      publishedBy: null,
      changelog: `Restored from version ${targetVersion}`,
      snapshot,
    };

    return {
      ...workflow,
      status: 'draft',
      currentVersion: newVersion.version,
      nodes: snapshot.nodes,
      connections: snapshot.connections,
      versions: [...workflow.versions, newVersion],
      lastModifiedBy: restoredBy,
      updatedAt: now,
    };
  }

  createSnapshot(workflow: Workflow): WorkflowSnapshot {
    return {
      nodes: workflow.nodes.map((n) => ({ ...n })),
      connections: workflow.connections.map((c) => ({ ...c })),
      version: workflow.currentVersion,
      capturedAt: this.clock(),
    };
  }
}
