import type { Agent, Workflow, Integration, Notification } from '../types';

export const MOCK_AGENTS: Agent[] = [
  { id: '1', name: 'DataSync Agent', description: 'Syncs data across multiple sources in real-time', status: 'active', type: 'Data', lastRun: '2 min ago', runs: 1284 },
  { id: '2', name: 'EmailCraft AI', description: 'Generates and sends personalized email campaigns', status: 'active', type: 'Marketing', lastRun: '15 min ago', runs: 847 },
  { id: '3', name: 'ReportGen', description: 'Generates weekly analytics reports automatically', status: 'idle', type: 'Analytics', lastRun: '3 hours ago', runs: 312 },
  { id: '4', name: 'SupportBot', description: 'Handles customer support tickets intelligently', status: 'error', type: 'Support', lastRun: '1 day ago', runs: 5621 },
  { id: '5', name: 'PriceMonitor', description: 'Monitors competitor pricing and triggers alerts', status: 'active', type: 'Sales', lastRun: '5 min ago', runs: 2093 },
  { id: '6', name: 'CodeReviewer', description: 'Automated code review and security scanning', status: 'training', type: 'DevOps', lastRun: 'Never', runs: 0 },
];

export const MOCK_WORKFLOWS: Workflow[] = [
  { id: '1', name: 'Lead Nurture Pipeline', description: 'Full funnel automation from lead to customer', status: 'active', steps: 12, lastRun: '1 min ago', successRate: 94 },
  { id: '2', name: 'Data Ingestion ETL', description: 'Extract, transform and load from 5 sources', status: 'active', steps: 8, lastRun: '10 min ago', successRate: 99 },
  { id: '3', name: 'Invoice Processing', description: 'AI-powered invoice extraction and routing', status: 'paused', steps: 6, lastRun: '2 days ago', successRate: 87 },
  { id: '4', name: 'Content Distribution', description: 'Auto-publish content across all channels', status: 'draft', steps: 9, lastRun: 'Never', successRate: 0 },
  { id: '5', name: 'Incident Response', description: 'Automated incident detection and escalation', status: 'error', steps: 15, lastRun: '4 hours ago', successRate: 72 },
];

export const MOCK_INTEGRATIONS: Integration[] = [
  { id: '1', name: 'OpenAI', description: 'GPT-4 and embeddings API', category: 'AI', connected: true, icon: 'brain' },
  { id: '2', name: 'Anthropic', description: 'Claude models API', category: 'AI', connected: false, icon: 'sparkles' },
  { id: '3', name: 'Slack', description: 'Team messaging and notifications', category: 'Communication', connected: true, icon: 'message-square' },
  { id: '4', name: 'GitHub', description: 'Repository and CI/CD integration', category: 'DevOps', connected: true, icon: 'git-branch' },
  { id: '5', name: 'Stripe', description: 'Payment processing and subscriptions', category: 'Finance', connected: false, icon: 'credit-card' },
  { id: '6', name: 'PostgreSQL', description: 'Direct database connection', category: 'Database', connected: true, icon: 'database' },
  { id: '7', name: 'Zapier', description: 'Connect 5000+ apps', category: 'Automation', connected: false, icon: 'zap' },
  { id: '8', name: 'Notion', description: 'Docs and project management', category: 'Productivity', connected: false, icon: 'file-text' },
];

export const MOCK_NOTIFICATIONS: Notification[] = [
  { id: '1', title: 'Agent Error Detected', description: 'SupportBot encountered an unhandled exception', time: '5m ago', read: false, type: 'error' },
  { id: '2', title: 'Workflow Completed', description: 'Lead Nurture Pipeline processed 142 contacts', time: '1h ago', read: false, type: 'success' },
  { id: '3', title: 'New Integration Available', description: 'Google Workspace connector is now available', time: '3h ago', read: true, type: 'info' },
  { id: '4', title: 'Usage Alert', description: 'API usage at 80% of monthly limit', time: '6h ago', read: true, type: 'warning' },
];
