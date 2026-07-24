export type TemplateDomain = 'document' | 'incidents' | 'sales' | 'hr' | 'support' | 'finance' | 'devops' | 'marketing';

export interface WorkflowTemplate {
  id: string;
  name: string;
  domain: TemplateDomain;
  description: string;
  instruction: string; // the NL instruction this template represents
  tags: string[];
  requiredConnectors: string[];
  estimatedSteps: number;
}
