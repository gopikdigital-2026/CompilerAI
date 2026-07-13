import { useState } from 'react';
import { WorkflowCanvas } from '../../components/workflow/WorkflowCanvas';
import { NodePalette } from '../../components/workflow/NodePalette';
import { NodeProperties } from '../../components/workflow/NodeProperties';
import { WorkflowToolbar } from '../../components/workflow/WorkflowToolbar';
import { MiniMap } from '../../components/workflow/MiniMap';
import { ValidationPanel } from '../../components/workflow/ValidationPanel';
import { VersionHistory } from '../../components/workflow/VersionHistory';
import { OptimizeModal } from '../../components/workflow/OptimizeModal';
import { useWorkflowDesigner } from '../../hooks/useWorkflowDesigner';

export default function WorkflowDesigner() {
  const w = useWorkflowDesigner();
  const [paletteSearch, setPaletteSearch] = useState('');

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Toolbar */}
      <WorkflowToolbar
        workflowName={w.workflowName}
        savedStatus={w.savedStatus}
        errorCount={w.errorCount}
        warningCount={w.warningCount}
        totalCost={w.totalCost}
        totalTime={w.totalTime}
        onNameChange={w.setWorkflowName}
        onSave={w.save}
        onShowVersions={() => { w.setShowVersions(!w.showVersions); w.setShowValidation(false); w.setShowOptimize(false); }}
        onShowValidation={() => { w.setShowValidation(!w.showValidation); w.setShowVersions(false); w.setShowOptimize(false); }}
        onOptimize={w.runOptimize}
        isOptimizing={w.isOptimizing}
      />

      {/* Body */}
      <div className="flex flex-1 min-h-0 relative">
        {/* Node palette */}
        <NodePalette searchQuery={paletteSearch} onSearchChange={setPaletteSearch} />

        {/* Canvas */}
        <div className="relative flex-1 min-w-0">
          <WorkflowCanvas
            nodes={w.nodes}
            edges={w.edges}
            selectedNodeId={w.selectedNodeId}
            selectedEdgeId={w.selectedEdgeId}
            onSelectNode={w.selectNode}
            onSelectEdge={w.selectEdge}
            onMoveNode={w.moveNode}
            onAddNode={w.addNode}
            onAddEdge={w.addEdge}
            onDeleteNode={w.deleteNode}
            onDeleteEdge={w.deleteEdge}
          >
            <MiniMap nodes={w.nodes} edges={w.edges} />
          </WorkflowCanvas>
        </div>

        {/* Right panels — validation / versions / optimize (overlays) */}
        {w.showValidation && (
          <ValidationPanel
            issues={w.validationIssues}
            onClose={() => w.setShowValidation(false)}
            onSelectNode={id => { w.selectNode(id); w.setShowValidation(false); }}
          />
        )}
        {w.showVersions && (
          <VersionHistory
            versions={w.versions}
            onClose={() => w.setShowVersions(false)}
          />
        )}
        {w.showOptimize && (
          <OptimizeModal
            suggestions={w.optimizations}
            isLoading={w.isOptimizing}
            onClose={() => w.setShowOptimize(false)}
          />
        )}

        {/* Node properties (shown when a node is selected and no overlay is open) */}
        {w.selectedNode && !w.showValidation && !w.showVersions && !w.showOptimize && (
          <NodeProperties
            node={w.selectedNode}
            onUpdate={w.updateNode}
            onDelete={w.deleteNode}
            onDuplicate={w.duplicateNode}
            onAddComment={w.addComment}
            onClose={() => w.selectNode(null)}
          />
        )}
      </div>
    </div>
  );
}
