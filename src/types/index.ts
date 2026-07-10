export type NavSection = {
  label: string;
  items: NavItem[];
};

export type NavItem = {
  id: string;
  label: string;
  icon: string;
  path: string;
  badge?: string;
};

export type Notification = {
  id: string;
  title: string;
  description: string;
  time: string;
  read: boolean;
  type: 'info' | 'success' | 'warning' | 'error';
};

export type StatCard = {
  id: string;
  label: string;
  value: string;
  change: string;
  trend: 'up' | 'down' | 'neutral';
  icon: string;
};

export type Agent = {
  id: string;
  name: string;
  description: string;
  status: 'active' | 'idle' | 'error' | 'training';
  type: string;
  lastRun: string;
  runs: number;
};

export type Workflow = {
  id: string;
  name: string;
  description: string;
  status: 'active' | 'paused' | 'draft' | 'error';
  steps: number;
  lastRun: string;
  successRate: number;
};

export type Integration = {
  id: string;
  name: string;
  description: string;
  category: string;
  connected: boolean;
  icon: string;
};
