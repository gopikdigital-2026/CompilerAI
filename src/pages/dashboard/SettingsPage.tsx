import React, { useState, useEffect, useCallback } from 'react';
import {
  User, Bell, Key, CreditCard, Shield, ChevronRight, Building2,
  Plus, Trash2, UserPlus, Check, Users, Plug, Loader2, AlertCircle,
  Lock, Mail, Monitor, Clock, Copy, X, AlertTriangle,
} from 'lucide-react';
import { useTranslation } from '../../hooks/useTranslation';
import { useProfile } from '../../hooks/useProfile';
import { useOrganization } from '../../hooks/useOrganization';
import { useApiKeys } from '../../hooks/useApiKeys';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';
import type { MemberRole, NotificationPreferences, ProfilePreferences } from '../../types/database';

const SECTION_IDS = ['profile', 'organization', 'team', 'billing', 'api', 'security', 'notifications', 'integrations'] as const;
type SectionId = typeof SECTION_IDS[number];

const SECTION_ICONS: Record<SectionId, React.ReactNode> = {
  profile: <User size={16} />, organization: <Building2 size={16} />, team: <Users size={16} />,
  billing: <CreditCard size={16} />, api: <Key size={16} />, security: <Shield size={16} />,
  notifications: <Bell size={16} />, integrations: <Plug size={16} />,
};

const SECTION_STATUS: Record<SectionId, 'available' | 'config-required' | 'coming-soon'> = {
  profile: 'available', organization: 'available', team: 'available',
  billing: 'config-required', api: 'available', security: 'available',
  notifications: 'available', integrations: 'config-required',
};

const STATUS_LABELS: Record<string, { es: string; en: string; color: string }> = {
  available: { es: 'Operativo', en: 'Operational', color: 'text-success-400' },
  'config-required': { es: 'Configuración necesaria', en: 'Configuration required', color: 'text-warning-400' },
  'coming-soon': { es: 'En desarrollo', en: 'In development', color: 'text-neutral-500' },
};

const TIMEZONES = ['UTC', 'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles', 'Europe/Madrid', 'Europe/London', 'Europe/Paris', 'Europe/Berlin', 'Asia/Tokyo', 'Asia/Shanghai', 'Australia/Sydney'];
const AI_MODELS = ['gpt-4o', 'gpt-4o-mini', 'claude-3-5-sonnet', 'claude-3-5-haiku', 'gemini-1.5-pro'];
const COMPANY_SIZES = ['1-10', '11-50', '51-200', '201-500', '501-1000', '1000+'];
const SECTORS = ['Tecnología', 'Finanzas', 'Salud', 'Educación', 'Retail', 'Manufactura', 'Consultoría', 'Otros'];
const COUNTRIES = ['ES', 'US', 'MX', 'AR', 'CO', 'CL', 'PE', 'UK', 'FR', 'DE', 'IT', 'JP'];
const INTEGRATIONS_LIST = [
  { id: 'github', name: 'GitHub', desc: 'Sincronización de repositorios y PRs', icon: 'git-branch' },
  { id: 'google', name: 'Google Workspace', desc: 'Calendar, Drive y Gmail', icon: 'calendar' },
  { id: 'slack', name: 'Slack', desc: 'Notificaciones y comandos', icon: 'message-square' },
  { id: 'jira', name: 'Jira', desc: 'Seguimiento de issues', icon: 'check-square' },
  { id: 'hubspot', name: 'HubSpot', desc: 'CRM y automatizaciones', icon: 'users' },
  { id: 'notion', name: 'Notion', desc: 'Documentos y bases de datos', icon: 'file-text' },
  { id: 'salesforce', name: 'Salesforce', desc: 'CRM empresarial', icon: 'cloud' },
  { id: 'microsoft365', name: 'Microsoft 365', desc: 'Teams, Outlook y SharePoint', icon: 'mail' },
];

interface SettingsPageProps { initialSection?: SectionId; }

export function SettingsPage({ initialSection }: SettingsPageProps) {
  const { t, lang } = useTranslation();
  const s = t.settings;
  const { user } = useAuth();
  const { profile, loading: profileLoading, error: profileError, updateProfile } = useProfile();
  const { activeOrg, members, loading: orgLoading, error: orgError, saveOrg, changeMemberRole, removeMemberById } = useOrganization();
  const { apiKeys, loading: keysLoading, error: keysError, create: createKey, revoke: revokeKey } = useApiKeys(activeOrg?.id);

  const [activeSection, setActiveSection] = useState<SectionId>(initialSection ?? 'profile');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savedFlash, setSavedFlash] = useState(false);

  // Profile form
  const [profileForm, setProfileForm] = useState({
    full_name: '', job_title: '', language: 'es', timezone: 'UTC',
    ai_model: 'gpt-4o-mini', ai_temperature: '0.7', ai_max_tokens: '4096',
  });

  // Notification prefs
  const [notifPrefs, setNotifPrefs] = useState<NotificationPreferences>({
    email_enabled: true, in_app_enabled: true, execution_completed: true,
    critical_errors: true, automations: false, team_activity: false,
    security_alerts: true, product_updates: false,
  });

  // Org form
  const [orgForm, setOrgForm] = useState({ name: '', sector: '', company_size: '', country: '', timezone: 'UTC' });

  // API key form
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeySecret, setNewKeySecret] = useState<string | null>(null);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [creatingKey, setCreatingKey] = useState(false);

  // Security
  const [passwordForm, setPasswordForm] = useState({ current: '', new: '', confirm: '' });
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSaved, setPasswordSaved] = useState(false);
  const [emailVerified] = useState(user?.email_confirmed_at != null);

  // Confirm modals
  const [confirmAction, setConfirmAction] = useState<{ type: 'revoke-key' | 'remove-member' | 'logout-all'; id?: string; name?: string } | null>(null);

  // Sync profile form when data loads
  const profileId = profile?.id;
  useEffect(() => {
    if (!profile) return;
    const prefs = (profile.preferences ?? {}) as ProfilePreferences;
    setProfileForm({
      full_name: profile.full_name ?? '',
      job_title: profile.job_title ?? '',
      language: prefs.language ?? lang,
      timezone: prefs.timezone ?? 'UTC',
      ai_model: prefs.ai_model ?? 'gpt-4o-mini',
      ai_temperature: String(prefs.ai_temperature ?? 0.7),
      ai_max_tokens: String(prefs.ai_max_tokens ?? 4096),
    });
    if (prefs.notifications) setNotifPrefs(prefs.notifications);
  }, [profileId, lang]); // eslint-disable-line react-hooks/exhaustive-deps

  // Sync org form
  const activeOrgId = activeOrg?.id;
  useEffect(() => {
    if (!activeOrg) return;
    const settings = (activeOrg.settings ?? {}) as Record<string, string>;
    setOrgForm({
      name: activeOrg.name ?? '',
      sector: settings.sector ?? '',
      company_size: settings.company_size ?? '',
      country: settings.country ?? '',
      timezone: settings.timezone ?? 'UTC',
    });
  }, [activeOrgId]); // eslint-disable-line react-hooks/exhaustive-deps

  const isOrgAdmin = activeOrg?.role === 'owner' || activeOrg?.role === 'admin';

  const handleSaveProfile = async () => {
    setSaving(true); setSaveError(null);
    try {
      await updateProfile({
        full_name: profileForm.full_name,
        job_title: profileForm.job_title,
        preferences: {
          language: profileForm.language,
          timezone: profileForm.timezone,
          ai_model: profileForm.ai_model,
          ai_temperature: parseFloat(profileForm.ai_temperature),
          ai_max_tokens: parseInt(profileForm.ai_max_tokens, 10),
          notifications: notifPrefs,
        } as ProfilePreferences,
      });
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 2500);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Error');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveNotifs = async () => {
    setSaving(true); setSaveError(null);
    try {
      const prefs = (profile?.preferences ?? {}) as ProfilePreferences;
      await updateProfile({
        preferences: { ...prefs, notifications: notifPrefs },
      });
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 2500);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Error');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveOrg = async () => {
    if (!isOrgAdmin) return;
    setSaving(true); setSaveError(null);
    try {
      await saveOrg({
        name: orgForm.name,
        sector: orgForm.sector,
        company_size: orgForm.company_size,
        country: orgForm.country,
        timezone: orgForm.timezone,
      });
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 2500);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Error');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateKey = async () => {
    if (!newKeyName.trim() || creatingKey) return;
    setCreatingKey(true); setSaveError(null);
    try {
      const result = await createKey(newKeyName.trim());
      if (result?.secret) setNewKeySecret(result.secret);
      setNewKeyName('');
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Error');
    } finally {
      setCreatingKey(false);
    }
  };

  const handleRevokeKey = async (keyId: string) => {
    setRevokingId(keyId);
    try { await revokeKey(keyId); }
    catch (e) { setSaveError(e instanceof Error ? e.message : 'Error'); }
    finally { setRevokingId(null); setConfirmAction(null); }
  };

  const handleRemoveMember = async (membershipId: string) => {
    try { await removeMemberById(membershipId); }
    catch (e) { setSaveError(e instanceof Error ? e.message : 'Error'); }
    finally { setConfirmAction(null); }
  };

  const handleChangePassword = async () => {
    setPasswordError(null);
    if (passwordForm.new !== passwordForm.confirm) {
      setPasswordError(lang === 'es' ? 'Las contraseñas no coinciden' : 'Passwords do not match');
      return;
    }
    if (passwordForm.new.length < 6) {
      setPasswordError(lang === 'es' ? 'La contraseña debe tener al menos 6 caracteres' : 'Password must be at least 6 characters');
      return;
    }
    try {
      const { error } = await supabase.auth.updateUser({ password: passwordForm.new });
      if (error) throw error;
      setPasswordForm({ current: '', new: '', confirm: '' });
      setPasswordSaved(true);
      setTimeout(() => setPasswordSaved(false), 2500);
    } catch (e) {
      setPasswordError(e instanceof Error ? e.message : 'Error');
    }
  };

  const handleLogoutAllSessions = async () => {
    try {
      const { error } = await supabase.auth.signOut({ scope: 'global' });
      if (error) throw error;
      setConfirmAction(null);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Error');
    }
  };

  const getRoleLabel = (role: MemberRole) => {
    if (role === 'owner') return lang === 'es' ? 'Propietario' : 'Owner';
    if (role === 'admin') return lang === 'es' ? 'Administrador' : 'Admin';
    if (role === 'viewer') return lang === 'es' ? 'Lector' : 'Viewer';
    return lang === 'es' ? 'Miembro' : 'Member';
  };

  const getPlanLabel = (plan: string) => {
    if (plan === 'pro') return s.planProLabel;
    if (plan === 'enterprise') return s.planEnterpriseLabel;
    return s.planFreeLabel;
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).catch(() => {});
  };

  const ownersCount = members.filter((m) => m.role === 'owner').length;

  return (
    <div className="p-6 animate-fade-in">
      <div className="mb-5">
        <h2 className="text-xl font-semibold text-neutral-100">{s.title}</h2>
        <p className="text-sm text-neutral-500 mt-0.5">{s.subtitle}</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-5">
        {/* Sidebar nav */}
        <div className="lg:w-52 flex-shrink-0">
          <nav className="card p-2 space-y-0.5" aria-label="Settings sections">
            {SECTION_IDS.map((id, i) => {
              const status = SECTION_STATUS[id];
              const statusLabel = STATUS_LABELS[status];
              return (
                <button
                  key={id}
                  onClick={() => setActiveSection(id)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm transition-all focus-visible:ring-2 focus-visible:ring-brand-500 outline-none ${activeSection === id ? 'bg-brand-500/15 text-brand-400' : 'text-neutral-400 hover:text-neutral-100 hover:bg-surface-700'}`}
                  aria-current={activeSection === id ? 'page' : undefined}
                >
                  <div className="flex items-center gap-2.5">
                    {SECTION_ICONS[id]}
                    {s.sections[i]}
                    {status === 'config-required' && (
                      <span className="w-1.5 h-1.5 rounded-full bg-warning-500" title={statusLabel[lang]} />
                    )}
                    {status === 'coming-soon' && (
                      <span className="text-[9px] text-neutral-600 bg-surface-700 px-1 py-0.5 rounded">{lang === 'es' ? 'Próx.' : 'Soon'}</span>
                    )}
                  </div>
                  {activeSection === id && <ChevronRight size={14} />}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1 card p-6 space-y-6">
          {/* Status badge */}
          <div className="flex items-center gap-2">
            <span className={`text-xs font-medium ${STATUS_LABELS[SECTION_STATUS[activeSection]].color}`}>
              {STATUS_LABELS[SECTION_STATUS[activeSection]][lang]}
            </span>
          </div>

          {/* Save error */}
          {saveError && (
            <div className="flex items-center gap-2 px-4 py-3 bg-error-500/10 border border-error-500/20 rounded-lg text-sm text-error-400">
              <AlertCircle size={15} /> {saveError}
              <button onClick={() => setSaveError(null)} className="ml-auto text-error-400 hover:text-error-300"><X size={14} /></button>
            </div>
          )}

          {/* Saved flash */}
          {savedFlash && (
            <div className="flex items-center gap-2 px-4 py-3 bg-success-500/10 border border-success-500/20 rounded-lg text-sm text-success-400 animate-fade-in">
              <Check size={15} /> {lang === 'es' ? 'Cambios guardados' : 'Changes saved'}
            </div>
          )}

          {/* ── Profile ── */}
          {activeSection === 'profile' && (
            <>
              <h3 className="text-base font-semibold text-neutral-100 pb-3 border-b border-surface-700">{s.profileTitle}</h3>
              {profileLoading ? (
                <div className="flex items-center gap-3 text-neutral-500"><Loader2 size={16} className="animate-spin" /><span className="text-sm">{t.common.loading}</span></div>
              ) : profileError ? (
                <div className="flex items-center gap-2 px-4 py-3 bg-error-500/10 border border-error-500/20 rounded-lg text-sm text-error-400"><AlertCircle size={15} /> {profileError}</div>
              ) : (
                <>
                  {/* Avatar */}
                  <div className="flex items-center gap-5">
                    <div className="w-16 h-16 rounded-2xl bg-brand-gradient flex-shrink-0 flex items-center justify-center text-xl font-bold text-white">
                      {(profileForm.full_name || user?.email || '?').charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-neutral-100">{profileForm.full_name || user?.email}</p>
                      <p className="text-xs text-neutral-500 mt-0.5">{user?.email} · {activeOrg ? getPlanLabel(activeOrg.plan) : s.planFreeLabel}</p>
                      <button className="btn-secondary text-xs mt-2 py-1.5" disabled title={lang === 'es' ? 'Requiere configuración de Storage' : 'Requires Storage configuration'}>
                        {s.profileChangePhoto}
                      </button>
                    </div>
                  </div>

                  {/* Fields */}
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-neutral-400 mb-1.5">{s.profileFields[0]}</label>
                      <input type="text" value={profileForm.full_name} onChange={(e) => setProfileForm({ ...profileForm, full_name: e.target.value })} className="input-field text-sm py-2" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-neutral-400 mb-1.5">{s.profileFields[1]}</label>
                      <input type="email" value={user?.email ?? ''} disabled className="input-field text-sm py-2 opacity-50 cursor-not-allowed" />
                      <p className="text-[10px] text-neutral-600 mt-1">{lang === 'es' ? 'El correo se gestiona desde la autenticación' : 'Email is managed by authentication'}</p>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-neutral-400 mb-1.5">{s.profileFields[2]}</label>
                      <input type="text" value={profileForm.job_title} onChange={(e) => setProfileForm({ ...profileForm, job_title: e.target.value })} className="input-field text-sm py-2" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-neutral-400 mb-1.5">{lang === 'es' ? 'Idioma' : 'Language'}</label>
                      <select value={profileForm.language} onChange={(e) => setProfileForm({ ...profileForm, language: e.target.value })} className="input-field text-sm py-2">
                        <option value="es">Español</option>
                        <option value="en">English</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-neutral-400 mb-1.5">{lang === 'es' ? 'Zona horaria' : 'Timezone'}</label>
                      <select value={profileForm.timezone} onChange={(e) => setProfileForm({ ...profileForm, timezone: e.target.value })} className="input-field text-sm py-2">
                        {TIMEZONES.map((tz) => <option key={tz} value={tz}>{tz}</option>)}
                      </select>
                    </div>
                  </div>

                  {/* AI Preferences */}
                  <div className="pt-2 border-t border-surface-700">
                    <h4 className="text-sm font-semibold text-neutral-200 mb-3">{lang === 'es' ? 'Preferencias de IA' : 'AI Preferences'}</h4>
                    <div className="grid sm:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-neutral-400 mb-1.5">{lang === 'es' ? 'Modelo' : 'Model'}</label>
                        <select value={profileForm.ai_model} onChange={(e) => setProfileForm({ ...profileForm, ai_model: e.target.value })} className="input-field text-sm py-2">
                          {AI_MODELS.map((m) => <option key={m} value={m}>{m}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-neutral-400 mb-1.5">{lang === 'es' ? 'Temperatura' : 'Temperature'}</label>
                        <input type="number" step="0.1" min="0" max="2" value={profileForm.ai_temperature} onChange={(e) => setProfileForm({ ...profileForm, ai_temperature: e.target.value })} className="input-field text-sm py-2" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-neutral-400 mb-1.5">Max tokens</label>
                        <input type="number" step="256" min="256" max="32768" value={profileForm.ai_max_tokens} onChange={(e) => setProfileForm({ ...profileForm, ai_max_tokens: e.target.value })} className="input-field text-sm py-2" />
                      </div>
                    </div>
                  </div>

                  <button onClick={handleSaveProfile} disabled={saving} className="btn-primary text-sm disabled:opacity-50 disabled:cursor-not-allowed">
                    {saving ? <Loader2 size={14} className="animate-spin" /> : savedFlash ? <><Check size={14} /> {lang === 'es' ? 'Guardado' : 'Saved'}</> : t.common.save}
                  </button>
                </>
              )}
            </>
          )}

          {/* ── Organization ── */}
          {activeSection === 'organization' && (
            <>
              <h3 className="text-base font-semibold text-neutral-100 pb-3 border-b border-surface-700">{s.orgTitle}</h3>
              {orgLoading ? (
                <div className="flex items-center gap-3 text-neutral-500"><Loader2 size={16} className="animate-spin" /><span className="text-sm">{t.common.loading}</span></div>
              ) : orgError ? (
                <div className="flex items-center gap-2 px-4 py-3 bg-error-500/10 border border-error-500/20 rounded-lg text-sm text-error-400"><AlertCircle size={15} /> {orgError}</div>
              ) : activeOrg ? (
                <>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-medium text-neutral-400 mb-1.5">{s.orgNameLabel}</label>
                      <input type="text" value={orgForm.name} onChange={(e) => setOrgForm({ ...orgForm, name: e.target.value })} disabled={!isOrgAdmin} className="input-field text-sm py-2 max-w-sm disabled:opacity-50" />
                    </div>
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-neutral-400 mb-1.5">{lang === 'es' ? 'Sector' : 'Sector'}</label>
                        <select value={orgForm.sector} onChange={(e) => setOrgForm({ ...orgForm, sector: e.target.value })} disabled={!isOrgAdmin} className="input-field text-sm py-2 disabled:opacity-50">
                          <option value="">{lang === 'es' ? 'Seleccionar...' : 'Select...'}</option>
                          {SECTORS.map((s) => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-neutral-400 mb-1.5">{lang === 'es' ? 'Tamaño' : 'Size'}</label>
                        <select value={orgForm.company_size} onChange={(e) => setOrgForm({ ...orgForm, company_size: e.target.value })} disabled={!isOrgAdmin} className="input-field text-sm py-2 disabled:opacity-50">
                          <option value="">{lang === 'es' ? 'Seleccionar...' : 'Select...'}</option>
                          {COMPANY_SIZES.map((s) => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-neutral-400 mb-1.5">{lang === 'es' ? 'País' : 'Country'}</label>
                        <select value={orgForm.country} onChange={(e) => setOrgForm({ ...orgForm, country: e.target.value })} disabled={!isOrgAdmin} className="input-field text-sm py-2 disabled:opacity-50">
                          <option value="">{lang === 'es' ? 'Seleccionar...' : 'Select...'}</option>
                          {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-neutral-400 mb-1.5">{lang === 'es' ? 'Zona horaria' : 'Timezone'}</label>
                        <select value={orgForm.timezone} onChange={(e) => setOrgForm({ ...orgForm, timezone: e.target.value })} disabled={!isOrgAdmin} className="input-field text-sm py-2 disabled:opacity-50">
                          {TIMEZONES.map((tz) => <option key={tz} value={tz}>{tz}</option>)}
                        </select>
                      </div>
                    </div>
                    <div className="flex items-center gap-6 pt-2">
                      <div>
                        <p className="text-xs font-medium text-neutral-400 mb-1">{s.orgPlanBadge}</p>
                        <span className="badge-brand text-xs">{getPlanLabel(activeOrg.plan)}</span>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-neutral-400 mb-1">{s.orgCreatedLabel}</p>
                        <p className="text-xs text-neutral-300">{new Date(activeOrg.created_at).toLocaleDateString(lang === 'es' ? 'es-ES' : 'en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-neutral-400 mb-1">{lang === 'es' ? 'ID' : 'ID'}</p>
                        <p className="text-xs text-neutral-500 font-mono">{activeOrg.id.slice(0, 8)}...</p>
                      </div>
                    </div>
                  </div>

                  {!isOrgAdmin && (
                    <div className="flex items-center gap-2 px-4 py-3 bg-surface-750 border border-surface-600 rounded-lg text-xs text-neutral-500">
                      <Lock size={14} /> {lang === 'es' ? 'Solo el propietario o administrador pueden editar la organización.' : 'Only the owner or admin can edit the organization.'}
                    </div>
                  )}

                  <button onClick={handleSaveOrg} disabled={saving || !isOrgAdmin} className="btn-primary text-sm disabled:opacity-50 disabled:cursor-not-allowed">
                    {saving ? <Loader2 size={14} className="animate-spin" /> : s.orgSave}
                  </button>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Building2 size={28} className="text-neutral-600 mb-3" />
                  <p className="text-sm text-neutral-500">{lang === 'es' ? 'Sin organización' : 'No organization'}</p>
                </div>
              )}
            </>
          )}

          {/* ── Team ── */}
          {activeSection === 'team' && (
            <>
              <h3 className="text-base font-semibold text-neutral-100 pb-3 border-b border-surface-700">{lang === 'es' ? 'Equipo' : 'Team'}</h3>
              {orgLoading ? (
                <div className="flex items-center gap-3 text-neutral-500"><Loader2 size={16} className="animate-spin" /><span className="text-sm">{t.common.loading}</span></div>
              ) : members.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Users size={28} className="text-neutral-600 mb-3" />
                  <p className="text-sm text-neutral-400 mb-2">{lang === 'es' ? 'No hay miembros' : 'No members'}</p>
                  <p className="text-xs text-neutral-500 mb-4">{lang === 'es' ? 'Invita a tu equipo para colaborar.' : 'Invite your team to collaborate.'}</p>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-sm font-semibold text-neutral-200">{s.orgMembersLabel}</h4>
                    <button className="btn-secondary text-xs py-1.5" disabled title={lang === 'es' ? 'Las invitaciones requieren configuración de email' : 'Invitations require email configuration'}>
                      <UserPlus size={13} /> {s.orgInvite}
                    </button>
                  </div>
                  <div className="space-y-2">
                    {members.map((m) => (
                      <div key={m.id} className="flex items-center justify-between bg-surface-750 border border-surface-600 rounded-lg px-4 py-2.5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-brand-gradient flex-shrink-0 flex items-center justify-center text-xs font-bold text-white">
                            {(m.profile.full_name || '?').charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-neutral-200">{m.profile.full_name}</p>
                            <p className="text-xs text-neutral-500">{m.profile.job_title || ''}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {isOrgAdmin && m.role !== 'owner' && (
                            <select
                              value={m.role}
                              onChange={(e) => changeMemberRole(m.id, e.target.value as MemberRole)}
                              className="input-field text-xs py-1 px-2"
                            >
                              <option value="admin">{lang === 'es' ? 'Administrador' : 'Admin'}</option>
                              <option value="member">{lang === 'es' ? 'Miembro' : 'Member'}</option>
                              <option value="viewer">{lang === 'es' ? 'Lector' : 'Viewer'}</option>
                            </select>
                          )}
                          {!isOrgAdmin && (
                            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${m.role === 'owner' ? 'bg-brand-500/15 text-brand-400' : 'bg-surface-700 text-neutral-400'}`}>
                              {getRoleLabel(m.role)}
                            </span>
                          )}
                          {isOrgAdmin && m.role !== 'owner' && (
                            <button
                              onClick={() => setConfirmAction({ type: 'remove-member', id: m.id, name: m.profile.full_name })}
                              className="text-error-400 hover:text-error-300 transition-colors"
                              title={lang === 'es' ? 'Eliminar miembro' : 'Remove member'}
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  {!isOrgAdmin && (
                    <p className="text-xs text-neutral-500 flex items-center gap-1.5">
                      <Lock size={12} /> {lang === 'es' ? 'Solo administradores pueden gestionar miembros.' : 'Only admins can manage members.'}
                    </p>
                  )}
                </>
              )}
            </>
          )}

          {/* ── Billing ── */}
          {activeSection === 'billing' && (
            <>
              <h3 className="text-base font-semibold text-neutral-100 pb-3 border-b border-surface-700">{s.billingTitle}</h3>
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="w-14 h-14 rounded-xl bg-warning-500/10 border border-warning-500/20 flex items-center justify-center mx-auto mb-4">
                  <CreditCard size={24} className="text-warning-400" />
                </div>
                <h4 className="text-sm font-semibold text-neutral-200 mb-2">{lang === 'es' ? 'Facturación no configurada' : 'Billing not configured'}</h4>
                <p className="text-xs text-neutral-500 max-w-sm mb-4">
                  {lang === 'es' ? 'Para activar la facturación, conecta Stripe mediante las variables de entorno.' : 'To enable billing, connect Stripe via environment variables.'}
                </p>
                <div className="bg-surface-750 border border-surface-600 rounded-lg px-4 py-3 text-left mb-4">
                  <p className="text-[10px] font-medium text-neutral-400 mb-1">{lang === 'es' ? 'Variables necesarias:' : 'Required variables:'}</p>
                  <ul className="space-y-1">
                    <li className="text-[10px] font-mono text-neutral-500">VITE_STRIPE_PUBLISHABLE_KEY</li>
                    <li className="text-[10px] font-mono text-neutral-500">STRIPE_SECRET_KEY (server)</li>
                    <li className="text-[10px] font-mono text-neutral-500">STRIPE_WEBHOOK_SECRET</li>
                  </ul>
                </div>
                <div className="bg-surface-750 border border-surface-600 rounded-lg px-4 py-3 text-left w-full max-w-md">
                  <p className="text-[10px] font-medium text-brand-400 mb-2">{lang === 'es' ? 'Vista de demostración' : 'Demo view'}</p>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-neutral-400">{lang === 'es' ? 'Plan actual' : 'Current plan'}</span>
                      <span className="text-neutral-200 font-medium">{activeOrg ? getPlanLabel(activeOrg.plan) : s.planFreeLabel}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-neutral-400">{lang === 'es' ? 'Precio' : 'Price'}</span>
                      <span className="text-neutral-200">{activeOrg?.plan === 'pro' ? '$49/mo' : activeOrg?.plan === 'enterprise' ? 'Custom' : '$0'}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-neutral-400">{lang === 'es' ? 'Estado' : 'Status'}</span>
                      <span className="text-warning-400">{lang === 'es' ? 'Modo demostración' : 'Demo mode'}</span>
                    </div>
                  </div>
                  <p className="text-[10px] text-neutral-600 mt-2">{lang === 'es' ? 'Datos simulados — no reales.' : 'Simulated data — not real.'}</p>
                </div>
              </div>
            </>
          )}

          {/* ── API Keys ── */}
          {activeSection === 'api' && (
            <>
              <h3 className="text-base font-semibold text-neutral-100 pb-3 border-b border-surface-700">{s.apiTitle}</h3>
              {keysError && (
                <div className="flex items-center gap-2 px-4 py-3 bg-error-500/10 border border-error-500/20 rounded-lg text-sm text-error-400"><AlertCircle size={15} /> {keysError}</div>
              )}

              {/* New key secret — shown once */}
              {newKeySecret && (
                <div className="bg-success-500/10 border border-success-500/20 rounded-lg p-4 mb-4">
                  <p className="text-xs font-medium text-success-400 mb-2 flex items-center gap-1.5">
                    <Check size={14} /> {lang === 'es' ? 'Clave creada — guárdala ahora, no se mostrará de nuevo.' : 'Key created — save it now, it will not be shown again.'}
                  </p>
                  <div className="flex items-center gap-2">
                    <code className="text-xs font-mono text-neutral-200 bg-surface-700 px-3 py-1.5 rounded block break-all flex-1">{newKeySecret}</code>
                    <button onClick={() => copyToClipboard(newKeySecret)} className="btn-secondary text-xs px-2 py-1.5" title={lang === 'es' ? 'Copiar' : 'Copy'}><Copy size={13} /></button>
                  </div>
                  <button onClick={() => setNewKeySecret(null)} className="text-xs text-neutral-500 hover:text-neutral-300 mt-2 transition-colors">{lang === 'es' ? 'Entendido' : 'Dismiss'}</button>
                </div>
              )}

              {/* Keys list */}
              {keysLoading ? (
                <div className="flex items-center gap-3 text-neutral-500"><Loader2 size={16} className="animate-spin" /><span className="text-sm">{t.common.loading}</span></div>
              ) : apiKeys.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Key size={24} className="text-neutral-600 mb-3" />
                  <p className="text-sm text-neutral-400 mb-1">{lang === 'es' ? 'No hay claves API' : 'No API keys'}</p>
                  <p className="text-xs text-neutral-500">{lang === 'es' ? 'Crea una clave para acceder a la API.' : 'Create a key to access the API.'}</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {apiKeys.map((key) => (
                    <div key={key.id} className="bg-surface-750 border border-surface-600 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-neutral-200">{key.name}</span>
                        <button
                          onClick={() => setConfirmAction({ type: 'revoke-key', id: key.id, name: key.name })}
                          disabled={revokingId === key.id}
                          className="text-xs text-error-400 hover:text-error-300 transition-colors flex items-center gap-1 disabled:opacity-50"
                        >
                          {revokingId === key.id ? <Loader2 size={12} className="animate-spin" /> : <><Trash2 size={12} /> {s.apiRevoke}</>}
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
              )}

              {/* Create key */}
              <div className="flex items-center gap-3 pt-2">
                <input
                  type="text"
                  placeholder={lang === 'es' ? 'Nombre de la clave...' : 'Key name...'}
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  className="input-field text-sm py-2 flex-1 max-w-xs"
                  onKeyDown={(e) => e.key === 'Enter' && handleCreateKey()}
                />
                <button onClick={handleCreateKey} disabled={!newKeyName.trim() || creatingKey} className="btn-primary text-sm disabled:opacity-50 disabled:cursor-not-allowed">
                  {creatingKey ? <Loader2 size={14} className="animate-spin" /> : <><Plus size={14} /> {s.apiGenerate}</>}
                </button>
              </div>
            </>
          )}

          {/* ── Security ── */}
          {activeSection === 'security' && (
            <>
              <h3 className="text-base font-semibold text-neutral-100 pb-3 border-b border-surface-700">{lang === 'es' ? 'Seguridad' : 'Security'}</h3>

              {/* Email verification */}
              <div className="flex items-center justify-between py-3 border-b border-surface-700">
                <div className="flex items-center gap-3">
                  <Mail size={16} className="text-neutral-500" />
                  <div>
                    <p className="text-sm font-medium text-neutral-200">{lang === 'es' ? 'Verificación de correo' : 'Email verification'}</p>
                    <p className="text-xs text-neutral-500">{user?.email}</p>
                  </div>
                </div>
                <span className={`text-xs font-medium px-2 py-1 rounded-full ${emailVerified ? 'bg-success-500/15 text-success-400' : 'bg-warning-500/15 text-warning-400'}`}>
                  {emailVerified ? (lang === 'es' ? 'Verificado' : 'Verified') : (lang === 'es' ? 'Pendiente' : 'Pending')}
                </span>
              </div>

              {/* Password change */}
              <div className="pt-2">
                <h4 className="text-sm font-semibold text-neutral-200 mb-3 flex items-center gap-2"><Lock size={15} /> {lang === 'es' ? 'Cambiar contraseña' : 'Change password'}</h4>
                {passwordError && (
                  <div className="flex items-center gap-2 px-4 py-3 bg-error-500/10 border border-error-500/20 rounded-lg text-sm text-error-400 mb-3"><AlertCircle size={15} /> {passwordError}</div>
                )}
                {passwordSaved && (
                  <div className="flex items-center gap-2 px-4 py-3 bg-success-500/10 border border-success-500/20 rounded-lg text-sm text-success-400 mb-3"><Check size={15} /> {lang === 'es' ? 'Contraseña actualizada' : 'Password updated'}</div>
                )}
                <div className="grid sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-neutral-400 mb-1.5">{lang === 'es' ? 'Actual' : 'Current'}</label>
                    <input type="password" value={passwordForm.current} onChange={(e) => setPasswordForm({ ...passwordForm, current: e.target.value })} className="input-field text-sm py-2" autoComplete="current-password" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-neutral-400 mb-1.5">{lang === 'es' ? 'Nueva' : 'New'}</label>
                    <input type="password" value={passwordForm.new} onChange={(e) => setPasswordForm({ ...passwordForm, new: e.target.value })} className="input-field text-sm py-2" autoComplete="new-password" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-neutral-400 mb-1.5">{lang === 'es' ? 'Confirmar' : 'Confirm'}</label>
                    <input type="password" value={passwordForm.confirm} onChange={(e) => setPasswordForm({ ...passwordForm, confirm: e.target.value })} className="input-field text-sm py-2" autoComplete="new-password" />
                  </div>
                </div>
                <button onClick={handleChangePassword} disabled={!passwordForm.new || !passwordForm.confirm} className="btn-primary text-sm mt-3 disabled:opacity-50 disabled:cursor-not-allowed">
                  {lang === 'es' ? 'Actualizar contraseña' : 'Update password'}
                </button>
              </div>

              {/* MFA */}
              <div className="flex items-center justify-between py-3 border-t border-surface-700">
                <div className="flex items-center gap-3">
                  <Shield size={16} className="text-neutral-500" />
                  <div>
                    <p className="text-sm font-medium text-neutral-200">{lang === 'es' ? 'Autenticación multifactor' : 'Multi-factor authentication'}</p>
                    <p className="text-xs text-neutral-500">{lang === 'es' ? 'No configurada' : 'Not configured'}</p>
                  </div>
                </div>
                <button className="btn-secondary text-xs py-1.5" disabled title={lang === 'es' ? 'Requiere configuración adicional' : 'Requires additional configuration'}>
                  {lang === 'es' ? 'Configurar' : 'Set up'}
                </button>
              </div>

              {/* Sessions */}
              <div className="flex items-center justify-between py-3 border-t border-surface-700">
                <div className="flex items-center gap-3">
                  <Monitor size={16} className="text-neutral-500" />
                  <div>
                    <p className="text-sm font-medium text-neutral-200">{lang === 'es' ? 'Sesiones activas' : 'Active sessions'}</p>
                    <p className="text-xs text-neutral-500">{lang === 'es' ? 'Cierra todas las sesiones excepto esta' : 'Sign out of all sessions except this one'}</p>
                  </div>
                </div>
                <button onClick={() => setConfirmAction({ type: 'logout-all' })} className="btn-secondary text-xs py-1.5 text-error-400 hover:text-error-300">
                  {lang === 'es' ? 'Cerrar todas' : 'Sign out all'}
                </button>
              </div>
            </>
          )}

          {/* ── Notifications ── */}
          {activeSection === 'notifications' && (
            <>
              <h3 className="text-base font-semibold text-neutral-100 pb-3 border-b border-surface-700">{s.notifTitle}</h3>
              <div className="space-y-1">
                {[
                  { key: 'email_enabled' as const, label: lang === 'es' ? 'Correo electrónico' : 'Email', desc: lang === 'es' ? 'Recibir notificaciones por email' : 'Receive email notifications' },
                  { key: 'in_app_enabled' as const, label: lang === 'es' ? 'Dentro de la app' : 'In-app', desc: lang === 'es' ? 'Notificaciones dentro de CompilerAI' : 'Notifications within CompilerAI' },
                  { key: 'execution_completed' as const, label: lang === 'es' ? 'Ejecuciones completadas' : 'Execution completed', desc: lang === 'es' ? 'Cuando una ejecución termina' : 'When an execution finishes' },
                  { key: 'critical_errors' as const, label: lang === 'es' ? 'Errores críticos' : 'Critical errors', desc: lang === 'es' ? 'Errores que requieren atención' : 'Errors requiring attention' },
                  { key: 'automations' as const, label: lang === 'es' ? 'Automatizaciones' : 'Automations', desc: lang === 'es' ? 'Actividad de automatizaciones' : 'Automation activity' },
                  { key: 'team_activity' as const, label: lang === 'es' ? 'Actividad de equipo' : 'Team activity', desc: lang === 'es' ? 'Cambios de miembros y roles' : 'Member and role changes' },
                  { key: 'security_alerts' as const, label: lang === 'es' ? 'Alertas de seguridad' : 'Security alerts', desc: lang === 'es' ? 'Obligatorio por seguridad' : 'Mandatory for security' },
                  { key: 'product_updates' as const, label: lang === 'es' ? 'Novedades de producto' : 'Product updates', desc: lang === 'es' ? 'Actualizaciones y nuevas funciones' : 'Updates and new features' },
                ].map((item) => {
                  const isMandatory = item.key === 'security_alerts';
                  const enabled = notifPrefs[item.key];
                  return (
                    <div key={item.key} className="flex items-center justify-between py-3 border-b border-surface-700 last:border-0">
                      <div>
                        <p className="text-sm font-medium text-neutral-200">{item.label}</p>
                        <p className="text-xs text-neutral-500 mt-0.5">{item.desc}</p>
                      </div>
                      {isMandatory ? (
                        <span className="text-xs text-neutral-500 italic">{lang === 'es' ? 'Obligatorio' : 'Mandatory'}</span>
                      ) : (
                        <button
                          onClick={() => setNotifPrefs((prev) => ({ ...prev, [item.key]: !prev[item.key] }))}
                          className={`relative w-10 h-5 rounded-full transition-all duration-200 ${enabled ? 'bg-brand-500' : 'bg-surface-600'} focus-visible:ring-2 focus-visible:ring-brand-500 outline-none`}
                          role="switch"
                          aria-checked={!!enabled}
                          aria-label={item.label}
                        >
                          <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all duration-200 ${enabled ? 'left-5' : 'left-0.5'}`} />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
              <button onClick={handleSaveNotifs} disabled={saving} className="btn-primary text-sm disabled:opacity-50 disabled:cursor-not-allowed">
                {saving ? <Loader2 size={14} className="animate-spin" /> : savedFlash ? <><Check size={14} /> {lang === 'es' ? 'Guardado' : 'Saved'}</> : t.common.save}
              </button>
            </>
          )}

          {/* ── Integrations ── */}
          {activeSection === 'integrations' && (
            <>
              <h3 className="text-base font-semibold text-neutral-100 pb-3 border-b border-surface-700">{lang === 'es' ? 'Integraciones' : 'Integrations'}</h3>
              <div className="space-y-3">
                {INTEGRATIONS_LIST.map((int) => (
                  <div key={int.id} className="flex items-center justify-between bg-surface-750 border border-surface-600 rounded-lg px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-surface-700 border border-surface-600 flex items-center justify-center text-neutral-400">
                        <Plug size={16} />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-neutral-200">{int.name}</p>
                        <p className="text-xs text-neutral-500">{int.desc}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-neutral-500 italic">{lang === 'es' ? 'Desconectada' : 'Disconnected'}</span>
                      <button className="btn-secondary text-xs py-1.5" disabled title={lang === 'es' ? 'Requiere configuración del servidor' : 'Requires server configuration'}>
                        {lang === 'es' ? 'Conectar' : 'Connect'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-2 px-4 py-3 bg-surface-750 border border-surface-600 rounded-lg text-xs text-neutral-500">
                <AlertCircle size={14} /> {lang === 'es' ? 'Las integraciones requieren claves API y configuración del servidor. Ninguna está conectada.' : 'Integrations require API keys and server configuration. None are connected.'}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Confirm modal ── */}
      {confirmAction && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-fade-in" onClick={() => setConfirmAction(null)}>
          <div className="card p-6 max-w-sm w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-error-500/10 border border-error-500/20 flex items-center justify-center flex-shrink-0">
                <AlertTriangle size={18} className="text-error-400" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-neutral-100">
                  {confirmAction.type === 'revoke-key' ? (lang === 'es' ? 'Revocar clave API' : 'Revoke API key') :
                   confirmAction.type === 'remove-member' ? (lang === 'es' ? 'Eliminar miembro' : 'Remove member') :
                   (lang === 'es' ? 'Cerrar todas las sesiones' : 'Sign out all sessions')}
                </h3>
                <p className="text-xs text-neutral-500 mt-1">
                  {confirmAction.type === 'revoke-key' ? (lang === 'es' ? `¿Seguro que quieres revocar "${confirmAction.name}"? Esta acción no se puede deshacer.` : `Are you sure you want to revoke "${confirmAction.name}"? This cannot be undone.`) :
                   confirmAction.type === 'remove-member' ? (lang === 'es' ? `¿Eliminar a "${confirmAction.name}" de la organización?` : `Remove "${confirmAction.name}" from the organization?`) :
                   (lang === 'es' ? 'Se cerrarán todas las sesiones excepto esta.' : 'All sessions except this one will be closed.')}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 justify-end">
              <button onClick={() => setConfirmAction(null)} className="btn-secondary text-sm">{lang === 'es' ? 'Cancelar' : 'Cancel'}</button>
              <button
                onClick={() => {
                  if (confirmAction.type === 'revoke-key' && confirmAction.id) handleRevokeKey(confirmAction.id);
                  else if (confirmAction.type === 'remove-member' && confirmAction.id) handleRemoveMember(confirmAction.id);
                  else if (confirmAction.type === 'logout-all') handleLogoutAllSessions();
                }}
                className="btn-primary text-sm bg-error-500 hover:bg-error-600"
              >
                {confirmAction.type === 'revoke-key' ? (lang === 'es' ? 'Revocar' : 'Revoke') :
                 confirmAction.type === 'remove-member' ? (lang === 'es' ? 'Eliminar' : 'Remove') :
                 (lang === 'es' ? 'Cerrar sesiones' : 'Sign out')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
