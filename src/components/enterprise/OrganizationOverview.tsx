import { useState } from 'react';
import { Users, Building2, Shield, Clock, CheckCircle } from 'lucide-react';
import { ORG_USERS, ORG_RECORDS, ACTIVITY_FEED } from '../../lib/enterpriseMocks';
import type { UserRole } from '../../types/enterprise';

const ROLE_CONFIG: Record<UserRole, { label: string; color: string; bg: string }> = {
  admin:     { label: 'Admin',     color: '#f87171', bg: 'rgba(248,113,113,0.1)' },
  developer: { label: 'Dev',       color: '#60a5fa', bg: 'rgba(96,165,250,0.1)' },
  analyst:   { label: 'Analista',  color: '#a78bfa', bg: 'rgba(167,139,250,0.1)' },
  viewer:    { label: 'Viewer',    color: '#94a3b8', bg: 'rgba(148,163,184,0.1)' },
};

const PLAN_CONFIG = {
  starter:    { label: 'Starter',    color: '#94a3b8', bg: 'rgba(148,163,184,0.1)' },
  pro:        { label: 'Pro',        color: '#60a5fa', bg: 'rgba(96,165,250,0.1)' },
  enterprise: { label: 'Enterprise', color: '#fbbf24', bg: 'rgba(251,191,36,0.1)'  },
};

const ACT_COLORS = {
  create: '#34d399', update: '#60a5fa', delete: '#f87171', run: '#a78bfa', auth: '#94a3b8',
};

function timeAgo(iso: string) {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60)    return `${diff}s`;
  if (diff < 3600)  return `${Math.floor(diff / 60)}min`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
}

type Tab = 'users' | 'orgs' | 'activity';

export function OrganizationOverview() {
  const [tab, setTab] = useState<Tab>('users');

  return (
    <div className="p-6 space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        <StatCard icon={<Users size={16} />} label="Usuarios" value={ORG_USERS.length} color="#60a5fa" />
        <StatCard icon={<Building2 size={16} />} label="Organizaciones" value={ORG_RECORDS.length} color="#a78bfa" />
        <StatCard icon={<Shield size={16} />} label="Admins" value={ORG_USERS.filter(u => u.role === 'admin').length} color="#f87171" />
        <StatCard icon={<CheckCircle size={16} />} label="Activos ahora" value={ORG_USERS.filter(u => u.status === 'active').length} color="#34d399" />
      </div>

      {/* Tab bar */}
      <div className="flex items-center gap-1 bg-surface-950 border border-surface-800 p-1 rounded-xl w-fit">
        {([['users', 'Usuarios'], ['orgs', 'Organizaciones'], ['activity', 'Actividad']] as [Tab, string][]).map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              tab === id
                ? 'bg-surface-700 text-neutral-100 shadow'
                : 'text-neutral-500 hover:text-neutral-300'
            }`}>
            {label}
          </button>
        ))}
      </div>

      {/* Users table */}
      {tab === 'users' && (
        <div className="bg-surface-800 border border-surface-700 rounded-2xl overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-surface-700">
                <Th>Usuario</Th><Th>Rol</Th><Th>Organización</Th><Th>Último acceso</Th><Th>Estado</Th>
              </tr>
            </thead>
            <tbody>
              {ORG_USERS.map(u => (
                <tr key={u.id} className="border-b border-surface-700/50 hover:bg-surface-700/30 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0" style={{ background: u.avatarColor }}>
                        {u.name.split(' ').map(w => w[0]).join('').slice(0, 2)}
                      </div>
                      <div>
                        <p className="font-semibold text-neutral-200">{u.name}</p>
                        <p className="text-neutral-600">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold" style={{ background: ROLE_CONFIG[u.role].bg, color: ROLE_CONFIG[u.role].color }}>
                      {ROLE_CONFIG[u.role].label}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-neutral-400">{u.org}</td>
                  <td className="px-4 py-3 text-neutral-500">{timeAgo(u.lastActive)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <div className={`w-1.5 h-1.5 rounded-full ${u.status === 'active' ? 'bg-green-500' : 'bg-neutral-600'}`} />
                      <span className={u.status === 'active' ? 'text-green-400' : 'text-neutral-600'}>
                        {u.status === 'active' ? 'Activo' : 'Inactivo'}
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Orgs table */}
      {tab === 'orgs' && (
        <div className="bg-surface-800 border border-surface-700 rounded-2xl overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-surface-700">
                <Th>Organización</Th><Th>Plan</Th><Th>Miembros</Th><Th>Workflows</Th><Th>Agentes</Th><Th>Creada</Th>
              </tr>
            </thead>
            <tbody>
              {ORG_RECORDS.map(o => {
                const plan = PLAN_CONFIG[o.plan];
                return (
                  <tr key={o.id} className="border-b border-surface-700/50 hover:bg-surface-700/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-surface-700 flex items-center justify-center">
                          <Building2 size={13} className="text-neutral-400" />
                        </div>
                        <span className="font-semibold text-neutral-200">{o.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold" style={{ background: plan.bg, color: plan.color }}>
                        {plan.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-neutral-300 font-mono">{o.members}</td>
                    <td className="px-4 py-3 text-neutral-300 font-mono">{o.workflows}</td>
                    <td className="px-4 py-3 text-neutral-300 font-mono">{o.agents}</td>
                    <td className="px-4 py-3 text-neutral-500">{o.createdAt}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Activity feed */}
      {tab === 'activity' && (
        <div className="bg-surface-800 border border-surface-700 rounded-2xl divide-y divide-surface-700">
          {ACTIVITY_FEED.map(ev => (
            <div key={ev.id} className="flex items-center gap-3 px-5 py-3 hover:bg-surface-700/30 transition-colors">
              <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: ACT_COLORS[ev.type] }} />
              <div className="flex-1 min-w-0">
                <p className="text-[11px] text-neutral-300">
                  <span className="font-semibold text-neutral-200">{ev.user}</span>
                  {' '}{ev.action}{' '}
                  <span className="text-blue-400">"{ev.resource}"</span>
                </p>
              </div>
              <div className="flex items-center gap-1 text-[10px] text-neutral-600 flex-shrink-0">
                <Clock size={10} /> {timeAgo(ev.timestamp)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: number; color: string }) {
  return (
    <div className="bg-surface-800 border border-surface-700 rounded-xl px-4 py-3 flex items-center gap-3">
      <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${color}18`, color }}>
        {icon}
      </div>
      <div>
        <p className="text-lg font-bold text-neutral-100">{value}</p>
        <p className="text-[10px] text-neutral-500">{label}</p>
      </div>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-neutral-600">{children}</th>;
}
