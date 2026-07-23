import type { WorkflowTemplate } from '../models/TemplateModels';
import { TemplateNotFoundError } from '../errors/AutomationStudioErrors';

const TEMPLATES: WorkflowTemplate[] = [
  {
    id: 'tpl_customer_service',
    name: 'Atención al Cliente',
    description: 'Triages incoming customer messages, classifies intent, routes to the right agent, and sends a response notification.',
    category: 'customer_service',
    icon: 'headphones',
    tags: ['support', 'customer', 'triage'],
    nodes: [
      { type: 'trigger', label: 'New Ticket', positionX: 100, positionY: 100, config: { eventType: 'email' } },
      { type: 'ai_agent', label: 'Classify Intent', positionX: 350, positionY: 100, config: { agentId: 'classifier-agent', prompt: 'Classify the customer ticket intent' } },
      { type: 'decision', label: 'Is Urgent?', positionX: 600, positionY: 100, config: { expression: 'intent.priority === "urgent"' } },
      { type: 'human_approval', label: 'Approve Response', positionX: 850, positionY: 200, config: { approverId: 'support-lead', message: 'Review urgent customer response' } },
      { type: 'notification', label: 'Notify Team', positionX: 850, positionY: 50, config: { channel: 'slack', recipient: '#support', message: 'New urgent ticket' } },
      { type: 'end', label: 'Complete', positionX: 1100, positionY: 125, config: {} },
    ],
    connections: [
      { fromLabel: 'New Ticket', toLabel: 'Classify Intent', fromPort: 'out', toPort: 'in' },
      { fromLabel: 'Classify Intent', toLabel: 'Is Urgent?', fromPort: 'out', toPort: 'in' },
      { fromLabel: 'Is Urgent?', toLabel: 'Notify Team', fromPort: 'true', toPort: 'in' },
      { fromLabel: 'Is Urgent?', toLabel: 'Approve Response', fromPort: 'false', toPort: 'in' },
      { fromLabel: 'Notify Team', toLabel: 'Complete', fromPort: 'out', toPort: 'in' },
      { fromLabel: 'Approve Response', toLabel: 'Complete', fromPort: 'approved', toPort: 'in' },
    ],
  },
  {
    id: 'tpl_email_classification',
    name: 'Clasificación de Correos',
    description: 'Automatically classifies incoming emails into categories and routes them accordingly.',
    category: 'email_classification',
    icon: 'mail',
    tags: ['email', 'classification', 'routing'],
    nodes: [
      { type: 'trigger', label: 'New Email', positionX: 100, positionY: 100, config: { eventType: 'email' } },
      { type: 'ai_agent', label: 'Classify Email', positionX: 350, positionY: 100, config: { agentId: 'email-classifier', prompt: 'Classify this email' } },
      { type: 'condition', label: 'Is Spam?', positionX: 600, positionY: 100, config: { expression: 'category === "spam"' } },
      { type: 'notification', label: 'Alert Inbox', positionX: 850, positionY: 100, config: { channel: 'email', recipient: 'inbox', message: 'New classified email' } },
      { type: 'end', label: 'Done', positionX: 1100, positionY: 100, config: {} },
    ],
    connections: [
      { fromLabel: 'New Email', toLabel: 'Classify Email', fromPort: 'out', toPort: 'in' },
      { fromLabel: 'Classify Email', toLabel: 'Is Spam?', fromPort: 'out', toPort: 'in' },
      { fromLabel: 'Is Spam?', toLabel: 'Alert Inbox', fromPort: 'out', toPort: 'in' },
      { fromLabel: 'Alert Inbox', toLabel: 'Done', fromPort: 'out', toPort: 'in' },
    ],
  },
  {
    id: 'tpl_document_management',
    name: 'Gestión Documental',
    description: 'Processes incoming documents: extracts metadata, classifies, and routes for storage or review.',
    category: 'document_management',
    icon: 'file-text',
    tags: ['documents', 'ocr', 'storage'],
    nodes: [
      { type: 'trigger', label: 'Document Upload', positionX: 100, positionY: 100, config: { eventType: 'webhook' } },
      { type: 'tool', label: 'Extract Text', positionX: 350, positionY: 100, config: { toolId: 'ocr-tool', config: {} } },
      { type: 'ai_agent', label: 'Classify Document', positionX: 600, positionY: 100, config: { agentId: 'doc-classifier', prompt: 'Classify the document type' } },
      { type: 'decision', label: 'Needs Review?', positionX: 850, positionY: 100, config: { expression: 'confidence < 0.8' } },
      { type: 'human_approval', label: 'Review Document', positionX: 1100, positionY: 150, config: { approverId: 'doc-reviewer', message: 'Review this document' } },
      { type: 'tool', label: 'Store Document', positionX: 1100, positionY: 50, config: { toolId: 'storage-tool', config: {} } },
      { type: 'end', label: 'Complete', positionX: 1350, positionY: 100, config: {} },
    ],
    connections: [
      { fromLabel: 'Document Upload', toLabel: 'Extract Text', fromPort: 'out', toPort: 'in' },
      { fromLabel: 'Extract Text', toLabel: 'Classify Document', fromPort: 'out', toPort: 'in' },
      { fromLabel: 'Classify Document', toLabel: 'Needs Review?', fromPort: 'out', toPort: 'in' },
      { fromLabel: 'Needs Review?', toLabel: 'Review Document', fromPort: 'true', toPort: 'in' },
      { fromLabel: 'Needs Review?', toLabel: 'Store Document', fromPort: 'false', toPort: 'in' },
      { fromLabel: 'Review Document', toLabel: 'Complete', fromPort: 'approved', toPort: 'in' },
      { fromLabel: 'Store Document', toLabel: 'Complete', fromPort: 'out', toPort: 'in' },
    ],
  },
  {
    id: 'tpl_invoice_approval',
    name: 'Aprobación de Facturas',
    description: 'Processes invoices: validates data, routes for approval based on amount, and notifies finance team.',
    category: 'invoice_approval',
    icon: 'receipt',
    tags: ['finance', 'invoice', 'approval'],
    nodes: [
      { type: 'trigger', label: 'Invoice Received', positionX: 100, positionY: 100, config: { eventType: 'email' } },
      { type: 'tool', label: 'Extract Invoice Data', positionX: 350, positionY: 100, config: { toolId: 'invoice-ocr', config: {} } },
      { type: 'decision', label: 'Amount > 5000?', positionX: 600, positionY: 100, config: { expression: 'amount > 5000' } },
      { type: 'human_approval', label: 'Manager Approval', positionX: 850, positionY: 150, config: { approverId: 'finance-manager', message: 'Approve high-value invoice' } },
      { type: 'tool', label: 'Auto-Approve', positionX: 850, positionY: 50, config: { toolId: 'auto-approve', config: {} } },
      { type: 'notification', label: 'Notify Finance', positionX: 1100, positionY: 100, config: { channel: 'email', recipient: 'finance@company.com', message: 'Invoice processed' } },
      { type: 'end', label: 'Complete', positionX: 1350, positionY: 100, config: {} },
    ],
    connections: [
      { fromLabel: 'Invoice Received', toLabel: 'Extract Invoice Data', fromPort: 'out', toPort: 'in' },
      { fromLabel: 'Extract Invoice Data', toLabel: 'Amount > 5000?', fromPort: 'out', toPort: 'in' },
      { fromLabel: 'Amount > 5000?', toLabel: 'Manager Approval', fromPort: 'true', toPort: 'in' },
      { fromLabel: 'Amount > 5000?', toLabel: 'Auto-Approve', fromPort: 'false', toPort: 'in' },
      { fromLabel: 'Manager Approval', toLabel: 'Notify Finance', fromPort: 'approved', toPort: 'in' },
      { fromLabel: 'Auto-Approve', toLabel: 'Notify Finance', fromPort: 'out', toPort: 'in' },
      { fromLabel: 'Notify Finance', toLabel: 'Complete', fromPort: 'out', toPort: 'in' },
    ],
  },
  {
    id: 'tpl_hr',
    name: 'RRHH — Onboarding',
    description: 'Automates employee onboarding: creates accounts, assigns equipment, and sends welcome notifications.',
    category: 'hr',
    icon: 'users',
    tags: ['hr', 'onboarding', 'automation'],
    nodes: [
      { type: 'trigger', label: 'New Hire', positionX: 100, positionY: 100, config: { eventType: 'manual' } },
      { type: 'tool', label: 'Create Accounts', positionX: 350, positionY: 100, config: { toolId: 'account-creator', config: {} } },
      { type: 'human_approval', label: 'Approve Equipment', positionX: 600, positionY: 100, config: { approverId: 'it-manager', message: 'Approve equipment for new hire' } },
      { type: 'notification', label: 'Welcome Email', positionX: 850, positionY: 100, config: { channel: 'email', recipient: 'newhire@company.com', message: 'Welcome to the team!' } },
      { type: 'end', label: 'Complete', positionX: 1100, positionY: 100, config: {} },
    ],
    connections: [
      { fromLabel: 'New Hire', toLabel: 'Create Accounts', fromPort: 'out', toPort: 'in' },
      { fromLabel: 'Create Accounts', toLabel: 'Approve Equipment', fromPort: 'out', toPort: 'in' },
      { fromLabel: 'Approve Equipment', toLabel: 'Welcome Email', fromPort: 'approved', toPort: 'in' },
      { fromLabel: 'Welcome Email', toLabel: 'Complete', fromPort: 'out', toPort: 'in' },
    ],
  },
  {
    id: 'tpl_sales',
    name: 'Ventas — Lead Scoring',
    description: 'Scores incoming leads using AI, routes high-priority leads to sales reps, and sends notifications.',
    category: 'sales',
    icon: 'trending-up',
    tags: ['sales', 'leads', 'scoring'],
    nodes: [
      { type: 'trigger', label: 'New Lead', positionX: 100, positionY: 100, config: { eventType: 'webhook' } },
      { type: 'ai_agent', label: 'Score Lead', positionX: 350, positionY: 100, config: { agentId: 'lead-scorer', prompt: 'Score this lead from 1-100' } },
      { type: 'decision', label: 'Score > 70?', positionX: 600, positionY: 100, config: { expression: 'score > 70' } },
      { type: 'notification', label: 'Notify Sales Rep', positionX: 850, positionY: 50, config: { channel: 'slack', recipient: '#sales', message: 'Hot lead!' } },
      { type: 'tool', label: 'Add to CRM', positionX: 850, positionY: 150, config: { toolId: 'crm-tool', config: {} } },
      { type: 'end', label: 'Complete', positionX: 1100, positionY: 100, config: {} },
    ],
    connections: [
      { fromLabel: 'New Lead', toLabel: 'Score Lead', fromPort: 'out', toPort: 'in' },
      { fromLabel: 'Score Lead', toLabel: 'Score > 70?', fromPort: 'out', toPort: 'in' },
      { fromLabel: 'Score > 70?', toLabel: 'Notify Sales Rep', fromPort: 'true', toPort: 'in' },
      { fromLabel: 'Score > 70?', toLabel: 'Add to CRM', fromPort: 'false', toPort: 'in' },
      { fromLabel: 'Notify Sales Rep', toLabel: 'Complete', fromPort: 'out', toPort: 'in' },
      { fromLabel: 'Add to CRM', toLabel: 'Complete', fromPort: 'out', toPort: 'in' },
    ],
  },
  {
    id: 'tpl_it_support',
    name: 'Soporte Técnico',
    description: 'Automates IT support ticket triage: classifies issue, suggests solutions, and escalates if needed.',
    category: 'it_support',
    icon: 'monitor',
    tags: ['it', 'support', 'tickets'],
    nodes: [
      { type: 'trigger', label: 'New Ticket', positionX: 100, positionY: 100, config: { eventType: 'webhook' } },
      { type: 'ai_agent', label: 'Diagnose Issue', positionX: 350, positionY: 100, config: { agentId: 'it-diagnostic', prompt: 'Diagnose the IT issue' } },
      { type: 'decision', label: 'Can Auto-Resolve?', positionX: 600, positionY: 100, config: { expression: 'autoResolvable === true' } },
      { type: 'tool', label: 'Run Fix Script', positionX: 850, positionY: 50, config: { toolId: 'fix-script', config: {} } },
      { type: 'human_approval', label: 'Escalate', positionX: 850, positionY: 150, config: { approverId: 'it-lead', message: 'Escalate ticket to human agent' } },
      { type: 'notification', label: 'Notify User', positionX: 1100, positionY: 100, config: { channel: 'email', recipient: 'user@company.com', message: 'Your ticket has been updated' } },
      { type: 'end', label: 'Complete', positionX: 1350, positionY: 100, config: {} },
    ],
    connections: [
      { fromLabel: 'New Ticket', toLabel: 'Diagnose Issue', fromPort: 'out', toPort: 'in' },
      { fromLabel: 'Diagnose Issue', toLabel: 'Can Auto-Resolve?', fromPort: 'out', toPort: 'in' },
      { fromLabel: 'Can Auto-Resolve?', toLabel: 'Run Fix Script', fromPort: 'true', toPort: 'in' },
      { fromLabel: 'Can Auto-Resolve?', toLabel: 'Escalate', fromPort: 'false', toPort: 'in' },
      { fromLabel: 'Run Fix Script', toLabel: 'Notify User', fromPort: 'out', toPort: 'in' },
      { fromLabel: 'Escalate', toLabel: 'Notify User', fromPort: 'approved', toPort: 'in' },
      { fromLabel: 'Notify User', toLabel: 'Complete', fromPort: 'out', toPort: 'in' },
    ],
  },
];

export class TemplateLibrary {
  private templates = new Map<string, WorkflowTemplate>(TEMPLATES.map((t) => [t.id, t]));

  getAll(): WorkflowTemplate[] {
    return Array.from(this.templates.values());
  }

  getById(id: string): WorkflowTemplate {
    const tpl = this.templates.get(id);
    if (!tpl) throw new TemplateNotFoundError(`Template not found: ${id}`);
    return tpl;
  }

  getByCategory(category: string): WorkflowTemplate[] {
    return this.getAll().filter((t) => t.category === category);
  }

  search(query: string): WorkflowTemplate[] {
    const q = query.toLowerCase();
    return this.getAll().filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        t.tags.some((tag) => tag.toLowerCase().includes(q)),
    );
  }
}
