import React, { useState } from 'react';
import { Settings, User, Bell, Key, CreditCard, Shield, Palette, ChevronRight, Building2, Star, Plus, Trash2, UserPlus, Check } from 'lucide-react';
import { useTranslation } from '../../hooks/useTranslation';
import { useProfile } from '../../hooks/useProfile';
import { useOrganization } from '../../hooks/useOrganization';
import { useApiKeys } from '../../hooks/useApiKeys';
import { useAuth } from '../../hooks/useAuth';
import type { MemberRole } from '../../types/database';

const SECTION_IDS = ['profile', 'organization', 'plan', 'billing', 'notifications', 'api', 'security', 'appearance'] as const;
type SectionId = typeof SECTION_IDS[number];

const SECTION_ICONS: Record<SectionId, React.ReactNode> = {
  profile:      <User size={16} />,
  organization: <Building2 size={16} />,
  plan:         <Star size={16} />,
  billing:      <CreditCard size={16} />,
  notifications: <Bell size={16} />,
  api:          <Key size={16} />,
  security:     <Shield size={16} />,
  appearance:   <Palette size={16} />,
};

export function SettingsPage() {
  const { t, lang } = useTranslation();
  const s = t.settings;
  const { user } = useAuth();
  const { profile, updateProfile } = useProfile();
  const { activeOrg, members, saveOrg } = useOrganization();
  const { apiKeys, create: createKey, revoke: revokeKey } = useApiKeys(activeOrg?.id);

  const [activeSection, setActiveSection] = useState<SectionId>('profile');
  const [notifEnabled, setNotifEnabled] = useState([true, true, true, false, false]);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyValue, setNewKeyValue] = useState<string | null>(null);
  const [profileForm, setProfileForm] = useState({ full_name: '', job_title: '' });
  const [orgName, setOrgName] = useState('');
  const [profileSaved, setProfileSaved] = useState(false);
  const [orgSaved, setOrgSaved] = useState(false);

  // Sync form values when data loads
  React.useEffect(() => {
    if (profile) setProfileForm({ full_name: profile.full_name ?? '', job_title: profile.job_title ?? '' });
  }, [profile?.id]);

  React.useEffect(() => {
    if (activeOrg) setOrgName(activeOrg.name);
  }, [activeOrg?.id]);

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
              <div className="flex items-center gap-5">
                <div className="w-16 h-16 rounded-2xl bg-brand-gradient flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-neutral-100">{profile?.full_name || user?.email}</p>
                  <p className="text-xs text-neutral-500 mt-0.5">{user?.email} · {activeOrg ? getPlanLabel(activeOrg.plan) : s.planFreeLabel}</p>
                  <button className="btn-secondary text-xs mt-2 py-1.5">{s.profileChangePhoto}</button>
                </div>
              </div>
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

          {/* Plan */}
          {activeSection === 'plan' && (
            <>
              <h3 className="text-base font-semibold text-neutral-100 pb-3 border-b border-surface-700">{s.planTitle}</h3>
              <p className="text-xs font-medium text-neutral-400 mb-4">{s.planCurrentLabel}: <span className="text-brand-400 font-semibold">{activeOrg ? getPlanLabel(activeOrg.plan) : s.planFreeLabel}</span></p>
              <div className="grid sm:grid-cols-3 gap-4">
                {([
                  { key: 'free', label: s.planFreeLabel, features: s.planFreeFeatures, price: '$0' },
                  { key: 'pro', label: s.planProLabel, features: s.planProFeatures, price: '$49' },
                  { key: 'enterprise', label: s.planEnterpriseLabel, features: s.planEnterpriseFeatures, price: lang === 'es' ? 'Personalizado' : 'Custom' },
                ] as const).map((plan) => {
                  const isActive = (activeOrg?.plan ?? 'free') === plan.key;
                  return (
                    <div key={plan.key} className={`rounded-xl border p-4 transition-all ${isActive ? 'border-brand-500/50 bg-brand-500/10' : 'border-surface-600 bg-surface-750 hover:border-surface-500'}`}>
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-sm font-semibold text-neutral-100">{plan.label}</p>
                        {isActive && <span className="text-[10px] bg-brand-500 text-white px-1.5 py-0.5 rounded-full font-medium">{lang === 'es' ? 'Actual' : 'Current'}</span>}
                      </div>
                      <p className="text-xl font-bold text-neutral-100 mb-3">{plan.price}<span className="text-xs font-normal text-neutral-500">{plan.key !== 'enterprise' ? '/mo' : ''}</span></p>
                      <ul className="space-y-1.5 mb-4">
                        {plan.features.map((f) => (
                          <li key={f} className="flex items-start gap-2 text-xs text-neutral-400">
                            <Check size={11} className="text-brand-400 mt-0.5 flex-shrink-0" />
                            {f}
                          </li>
                        ))}
                      </ul>
                      {!isActive && (
                        <button className={`w-full text-xs py-2 rounded-lg font-medium transition-all ${plan.key === 'pro' ? 'btn-primary' : 'btn-secondary'}`}>
                          {s.planUpgrade}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {/* Billing */}
          {activeSection === 'billing' && (
            <>
              <h3 className="text-base font-semibold text-neutral-100 pb-3 border-b border-surface-700">{s.billingTitle}</h3>
              <div className="bg-brand-500/10 border border-brand-500/20 rounded-xl p-5 mb-5">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-sm font-semibold text-neutral-100">{s.billingPlan}</p>
                    <p className="text-xs text-neutral-400 mt-0.5">{s.billingNext} 1 {lang === 'es' ? 'Agosto' : 'August'} 2025</p>
                  </div>
                  <span className="text-xl font-bold text-brand-400">$49<span className="text-sm font-normal text-neutral-500">/mo</span></span>
                </div>
                <div className="space-y-2">
                  {s.billingUsageLabels.map((label, i) => {
                    const used = [12, 84700][i];
                    const limit = [25, 200000][i];
                    return (
                      <div key={label}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-neutral-400">{label}</span>
                          <span className="text-xs text-neutral-400">{used.toLocaleString()} / {limit.toLocaleString()}</span>
                        </div>
                        <div className="h-1.5 bg-surface-700 rounded-full overflow-hidden">
                          <div className="h-full bg-brand-500 rounded-full" style={{ width: `${(used / limit) * 100}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              <button className="btn-primary text-sm">{s.billingUpgrade}</button>
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

          {/* Security / Appearance */}
          {(activeSection === 'security' || activeSection === 'appearance') && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-12 h-12 rounded-xl bg-surface-700 border border-surface-600 flex items-center justify-center mx-auto mb-4">
                <Settings size={20} className="text-neutral-500" />
              </div>
              <h3 className="text-sm font-semibold text-neutral-300 mb-2">{s.comingSoonTitle}</h3>
              <p className="text-xs text-neutral-500">{s.comingSoonDesc}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
