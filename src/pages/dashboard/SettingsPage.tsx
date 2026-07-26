import React, { useState } from 'react';
import { Settings, User, Bell, Key, CreditCard, Shield, ChevronRight, Building2, Plus, Trash2, UserPlus, Check, Users, Plug, AlertCircle, Loader2 } from 'lucide-react';
import { useTranslation } from '../../hooks/useTranslation';
import { useProfile } from '../../hooks/useProfile';
import { useOrganization } from '../../hooks/useOrganization';
import { useApiKeys } from '../../hooks/useApiKeys';
import { useAuth } from '../../hooks/useAuth';
import type { MemberRole } from '../../types/database';

const SECTION_IDS = ['profile', 'organization', 'team', 'billing', 'api', 'security', 'notifications', 'integrations'] as const;
type SectionId = typeof SECTION_IDS[number];

const SECTION_ICONS: Record<SectionId, React.ReactNode> = {
  profile:       <User size={16} />,
  organization:  <Building2 size={16} />,
  team:          <Users size={16} />,
  billing:       <CreditCard size={16} />,
  api:           <Key size={16} />,
  security:      <Shield size={16} />,
  notifications: <Bell size={16} />,
  integrations:  <Plug size={16} />,
};

const SECTION_STATUS: Record<SectionId, 'available' | 'config-required' | 'coming-soon'> = {
  profile:       'available',
  organization:  'available',
  team:          'available',
  billing:       'config-required',
  api:           'available',
  security:      'coming-soon',
  notifications: 'available',
  integrations:  'config-required',
};

interface SettingsPageProps {
  initialSection?: SectionId;
}

export function SettingsPage({ initialSection }: SettingsPageProps) {
  const { t, lang } = useTranslation();
  const s = t.settings;
  const { user } = useAuth();
  const { profile, loading: profileLoading, updateProfile } = useProfile();
  const { activeOrg, members, loading: orgLoading, saveOrg } = useOrganization();
  const { apiKeys, loading: keysLoading, create: createKey, revoke: revokeKey } = useApiKeys(activeOrg?.id);

  const [activeSection, setActiveSection] = useState<SectionId>(initialSection ?? 'profile');
  const [notifEnabled, setNotifEnabled] = useState([true, true, true, false, false]);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyValue, setNewKeyValue] = useState<string | null>(null);
  const [profileForm, setProfileForm] = useState({ full_name: '', job_title: '' });
  const [orgName, setOrgName] = useState('');
  const [profileSaved, setProfileSaved] = useState(false);
  const [orgSaved, setOrgSaved] = useState(false);

  // Sync form values when data loads — use .id as a stable key to avoid
  // re-syncing on every unrelated render while still catching actual data changes
  const profileId = profile?.id;
  const activeOrgId = activeOrg?.id;

  React.useEffect(() => {
    if (profile) setProfileForm({ full_name: profile.full_name ?? '', job_title: profile.job_title ?? '' });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileId]);

  React.useEffect(() => {
    if (activeOrg) setOrgName(activeOrg.name);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeOrgId]);

  const handleSaveProfile = async () => {
    await updateProfile(profileForm);
    setProfileSaved(true);
    setTimeout(() => setProfileSaved(false), 2000);
  };

  const handleSaveOrg = async () => {
    await saveOrg({ name: orgName });
    setOrgSaved(true);
    setTimeout(() => setOrgSaved(false), 2000);
  };

  const handleCreateKey = async () => {
    if (!newKeyName.trim()) return;
    const key = await createKey(newKeyName.trim());
    if (key) setNewKeyValue(key.key_preview);
    setNewKeyName('');
  };

  const getRoleLabel = (role: MemberRole) => {
    if (role === 'owner') return s.roleOwner;
    if (role === 'admin') return s.roleAdmin;
    return s.roleMember;
  };

  const getPlanLabel = (plan: string) => {
    if (plan === 'pro') return s.planProLabel;
    if (plan === 'enterprise') return s.planEnterpriseLabel;
    return s.planFreeLabel;
  };

  return (
    <div className="p-6 animate-fade-in">
      <div className="mb-5">
        <h2 className="text-xl font-semibold text-neutral-100">{s.title}</h2>
        <p className="text-sm text-neutral-500 mt-0.5">{s.subtitle}</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-5">
        <div className="lg:w-52 flex-shrink-0">
          <nav className="card p-2 space-y-0.5">
            {SECTION_IDS.map((id, i) => (
              <button
                key={id}
                onClick={() => setActiveSection(id)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm transition-all ${activeSection === id ? 'bg-brand-500/15 text-brand-400' : 'text-neutral-400 hover:text-neutral-100 hover:bg-surface-700'}`}
              >
                <div className="flex items-center gap-2.5">
                  {SECTION_ICONS[id]}
                  {s.sections[i]}
                  {SECTION_STATUS[id] === 'config-required' && (
                    <span className="w-1.5 h-1.5 rounded-full bg-warning-500" title={lang === 'es' ? 'Configuración necesaria' : 'Configuration required'} />
                  )}
                  {SECTION_STATUS[id] === 'coming-soon' && (
                    <span className="text-[9px] text-neutral-600 bg-surface-700 px-1 py-0.5 rounded">{lang === 'es' ? 'Próx.' : 'Soon'}</span>
                  )}
                </div>
                {activeSection === id && <ChevronRight size={14} />}
              </button>
            ))}
          </nav>
        </div>

        <div className="flex-1 card p-6 space-y-6">
          {/* Profile */}
          {activeSection === 'profile' && (
            <>
              <h3 className="text-base font-semibold text-neutral-100 pb-3 border-b border-surface-700">{s.profileTitle}</h3>
              {profileLoading ? (
                <div className="flex items-center gap-3 text-neutral-500">
                  <Loader2 size={16} className="animate-spin" />
                  <span className="text-sm">{t.common.loading}</span>
                </div>
              ) : (
                <div className="flex items-center gap-5">
                  <div className="w-16 h-16 rounded-2xl bg-brand-gradient flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-neutral-100">{profile?.full_name || user?.email}</p>
                    <p className="text-xs text-neutral-500 mt-0.5">{user?.email} · {activeOrg ? getPlanLabel(activeOrg.plan) : s.planFreeLabel}</p>
                    <button className="btn-secondary text-xs mt-2 py-1.5" disabled>{s.profileChangePhoto}</button>
                  </div>
                </div>
              )}
              {profileLoading ? null : (
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-neutral-400 mb-1.5">{s.profileFields[0]}</label>
                  <input
                    type="text"
                    value={profileForm.full_name}
                    onChange={(e) => setProfileForm({ ...profileForm, full_name: e.target.value })}
                    className="input-field text-sm py-2"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-400 mb-1.5">{s.profileFields[1]}</label>
                  <input type="email" value={user?.email ?? ''} disabled className="input-field text-sm py-2 opacity-50 cursor-not-allowed" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-400 mb-1.5">{s.profileFields[2]}</label>
                  <input
                    type="text"
                    value={profileForm.job_title}
                    onChange={(e) => setProfileForm({ ...profileForm, job_title: e.target.value })}
                    className="input-field text-sm py-2"
                  />
                </div>
              </div>
              )}
              <button onClick={handleSaveProfile} className="btn-primary text-sm">
                {profileSaved ? <><Check size={14} /> {lang === 'es' ? 'Guardado' : 'Saved'}</> : t.common.save}
              </button>
            </>
          )}

          {/* Organization */}
          {activeSection === 'organization' && (
            <>
              <h3 className="text-base font-semibold text-neutral-100 pb-3 border-b border-surface-700">{s.orgTitle}</h3>
              {activeOrg ? (
                <>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-medium text-neutral-400 mb-1.5">{s.orgNameLabel}</label>
                      <input
                        type="text"
                        value={orgName}
                        onChange={(e) => setOrgName(e.target.value)}
                        className="input-field text-sm py-2 max-w-sm"
                      />
                    </div>
                    <div className="flex items-center gap-3">
                      <div>
                        <p className="text-xs font-medium text-neutral-400 mb-1">{s.orgPlanBadge}</p>
                        <span className="badge-brand text-xs">{getPlanLabel(activeOrg.plan)}</span>
                      </div>
                      <div className="ml-6">
                        <p className="text-xs font-medium text-neutral-400 mb-1">{s.orgCreatedLabel}</p>
                        <p className="text-xs text-neutral-300">{new Date(activeOrg.created_at).toLocaleDateString(lang === 'es' ? 'es-ES' : 'en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                      </div>
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-sm font-semibold text-neutral-200">{s.orgMembersLabel}</h4>
                      <button className="btn-secondary text-xs py-1.5">
                        <UserPlus size={13} /> {s.orgInvite}
                      </button>
                    </div>
                    <div className="space-y-2">
                      {members.map((m) => (
                        <div key={m.id} className="flex items-center justify-between bg-surface-750 border border-surface-600 rounded-lg px-4 py-2.5">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-brand-gradient flex-shrink-0" />
                            <div>
                              <p className="text-sm font-medium text-neutral-200">{m.profile.full_name}</p>
                              <p className="text-xs text-neutral-500">{m.profile.job_title || ''}</p>
                            </div>
                          </div>
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${m.role === 'owner' ? 'bg-brand-500/15 text-brand-400' : 'bg-surface-700 text-neutral-400'}`}>
                            {getRoleLabel(m.role)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <button onClick={handleSaveOrg} className="btn-primary text-sm">
                    {orgSaved ? <><Check size={14} /> {lang === 'es' ? 'Guardado' : 'Saved'}</> : s.orgSave}
                  </button>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Building2 size={28} className="text-neutral-600 mb-3" />
                  <p className="text-sm text-neutral-500">{t.common.loading}</p>
                </div>
              )}
            </>
          )}

          {/* Billing — Not configured */}
          {activeSection === 'billing' && (
            <>
              <h3 className="text-base font-semibold text-neutral-100 pb-3 border-b border-surface-700">{s.billingTitle}</h3>
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-14 h-14 rounded-xl bg-warning-500/10 border border-warning-500/20 flex items-center justify-center mx-auto mb-4">
                  <CreditCard size={24} className="text-warning-400" />
                </div>
                <h4 className="text-sm font-semibold text-neutral-200 mb-2">
                  {lang === 'es' ? 'Facturación no configurada' : 'Billing not configured'}
                </h4>
                <p className="text-xs text-neutral-500 max-w-sm mb-4">
                  {lang === 'es'
                    ? 'Para activar la facturación, conecta Stripe mediante las variables de entorno VITE_STRIPE_PUBLISHABLE_KEY y la clave secreta en el servidor.'
                    : 'To enable billing, connect Stripe via the VITE_STRIPE_PUBLISHABLE_KEY environment variable and the secret key on the server.'}
                </p>
                <div className="bg-surface-750 border border-surface-600 rounded-lg px-4 py-3 text-left">
                  <p className="text-[10px] font-medium text-neutral-400 mb-1">
                    {lang === 'es' ? 'Variables necesarias:' : 'Required variables:'}
                  </p>
                  <ul className="space-y-1">
                    <li className="text-[10px] font-mono text-neutral-500">VITE_STRIPE_PUBLISHABLE_KEY</li>
                    <li className="text-[10px] font-mono text-neutral-500">STRIPE_SECRET_KEY (server)</li>
                    <li className="text-[10px] font-mono text-neutral-500">STRIPE_WEBHOOK_SECRET</li>
                  </ul>
                </div>
              </div>
            </>
          )}

          {/* Notifications */}
          {activeSection === 'notifications' && (
            <>
              <h3 className="text-base font-semibold text-neutral-100 pb-3 border-b border-surface-700">{s.notifTitle}</h3>
              <div className="space-y-4">
                {s.notifItems.map((notif, i) => (
                  <div key={notif.label} className="flex items-center justify-between py-3 border-b border-surface-700 last:border-0">
                    <div>
                      <p className="text-sm font-medium text-neutral-200">{notif.label}</p>
                      <p className="text-xs text-neutral-500 mt-0.5">{notif.description}</p>
                    </div>
                    <button
                      onClick={() => setNotifEnabled((prev) => prev.map((v, idx) => idx === i ? !v : v))}
                      className={`relative w-10 h-5 rounded-full transition-all duration-200 ${notifEnabled[i] ? 'bg-brand-500' : 'bg-surface-600'}`}
                    >
                      <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all duration-200 ${notifEnabled[i] ? 'left-5' : 'left-0.5'}`} />
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* API Keys */}
          {activeSection === 'api' && (
            <>
              <h3 className="text-base font-semibold text-neutral-100 pb-3 border-b border-surface-700">{s.apiTitle}</h3>

              {newKeyValue && (
                <div className="bg-success-500/10 border border-success-500/20 rounded-lg p-4 mb-4">
                  <p className="text-xs font-medium text-success-400 mb-2">{lang === 'es' ? 'Guarda esta clave ahora — no se mostrará de nuevo.' : 'Save this key now — it will not be shown again.'}</p>
                  <code className="text-xs font-mono text-neutral-200 bg-surface-700 px-3 py-1.5 rounded block break-all">{newKeyValue}</code>
                  <button onClick={() => setNewKeyValue(null)} className="text-xs text-neutral-500 hover:text-neutral-300 mt-2 transition-colors">{lang === 'es' ? 'Cerrar' : 'Dismiss'}</button>
                </div>
              )}

              <div className="space-y-3">
                {apiKeys.map((key) => (
                  <div key={key.id} className="bg-surface-750 border border-surface-600 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-neutral-200">{key.name}</span>
                      <button onClick={() => revokeKey(key.id)} className="text-xs text-error-400 hover:text-error-300 transition-colors flex items-center gap-1">
                        <Trash2 size={12} /> {s.apiRevoke}
                      </button>
                    </div>
                    <code className="text-xs font-mono text-neutral-400 bg-surface-700 px-2 py-1 rounded">{key.key_preview}</code>
                    <div className="flex items-center gap-4 mt-2">
                      <span className="text-[10px] text-neutral-600">{s.apiCreated} {new Date(key.created_at).toLocaleDateString()}</span>
                      {key.last_used_at && <span className="text-[10px] text-neutral-600">{s.apiLastUsed} {new Date(key.last_used_at).toLocaleDateString()}</span>}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-3 pt-2">
                <input
                  type="text"
                  placeholder={lang === 'es' ? 'Nombre de la clave...' : 'Key name...'}
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  className="input-field text-sm py-2 flex-1 max-w-xs"
                  onKeyDown={(e) => e.key === 'Enter' && handleCreateKey()}
                />
                <button onClick={handleCreateKey} disabled={!newKeyName.trim()} className="btn-primary text-sm disabled:opacity-50 disabled:cursor-not-allowed">
                  <Plus size={14} /> {s.apiGenerate}
                </button>
              </div>
            </>
          )}

          {/* Security */}
          {activeSection === 'security' && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-12 h-12 rounded-xl bg-surface-700 border border-surface-600 flex items-center justify-center mx-auto mb-4">
                <Shield size={20} className="text-neutral-500" />
              </div>
              <h3 className="text-sm font-semibold text-neutral-300 mb-2">{s.comingSoonTitle}</h3>
              <p className="text-xs text-neutral-500">{s.comingSoonDesc}</p>
            </div>
          )}

          {/* Integrations */}
          {activeSection === 'integrations' && (
            <>
              <h3 className="text-base font-semibold text-neutral-100 pb-3 border-b border-surface-700">
                {lang === 'es' ? 'Integraciones' : 'Integrations'}
              </h3>
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-14 h-14 rounded-xl bg-warning-500/10 border border-warning-500/20 flex items-center justify-center mx-auto mb-4">
                  <Plug size={24} className="text-warning-400" />
                </div>
                <h4 className="text-sm font-semibold text-neutral-200 mb-2">
                  {lang === 'es' ? 'Configuración necesaria' : 'Configuration required'}
                </h4>
                <p className="text-xs text-neutral-500 max-w-sm">
                  {lang === 'es'
                    ? 'Las integraciones con servicios externos requieren claves API y configuración del servidor.'
                    : 'External service integrations require API keys and server-side configuration.'}
                </p>
              </div>
            </>
          )}

          {/* Team */}
          {activeSection === 'team' && (
            <>
              <h3 className="text-base font-semibold text-neutral-100 pb-3 border-b border-surface-700">
                {lang === 'es' ? 'Equipo' : 'Team'}
              </h3>
              {orgLoading ? (
                <div className="flex items-center gap-3 text-neutral-500">
                  <Loader2 size={16} className="animate-spin" />
                  <span className="text-sm">{t.common.loading}</span>
                </div>
              ) : members.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="w-12 h-12 rounded-xl bg-surface-700 border border-surface-600 flex items-center justify-center mx-auto mb-4">
                    <Users size={20} className="text-neutral-500" />
                  </div>
                  <p className="text-sm text-neutral-400 mb-2">
                    {lang === 'es' ? 'No hay miembros en esta organización' : 'No members in this organization'}
                  </p>
                  <p className="text-xs text-neutral-500 mb-4">
                    {lang === 'es' ? 'Invita a tu equipo para empezar a colaborar.' : 'Invite your team to start collaborating.'}
                  </p>
                  <button className="btn-secondary text-xs py-1.5" disabled>
                    <UserPlus size={13} /> {s.orgInvite}
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-sm font-semibold text-neutral-200">{s.orgMembersLabel}</h4>
                    <button className="btn-secondary text-xs py-1.5" disabled title={lang === 'es' ? 'Próximamente' : 'Coming soon'}>
                      <UserPlus size={13} /> {s.orgInvite}
                    </button>
                  </div>
                  <div className="space-y-2">
                    {members.map((m) => (
                      <div key={m.id} className="flex items-center justify-between bg-surface-750 border border-surface-600 rounded-lg px-4 py-2.5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-brand-gradient flex-shrink-0" />
                          <div>
                            <p className="text-sm font-medium text-neutral-200">{m.profile.full_name}</p>
                            <p className="text-xs text-neutral-500">{m.profile.job_title || ''}</p>
                          </div>
                        </div>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${m.role === 'owner' ? 'bg-brand-500/15 text-brand-400' : 'bg-surface-700 text-neutral-400'}`}>
                          {getRoleLabel(m.role)}
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
