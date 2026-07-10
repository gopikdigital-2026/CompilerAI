import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  getMyOrganizations,
  updateOrganization,
  getOrgMembers,
} from '../services/organizations.service';
import type { OrgWithRole, OrgMember } from '../types/database';

export function useOrganization() {
  const { user } = useAuth();
  const [organizations, setOrganizations] = useState<OrgWithRole[]>([]);
  const [activeOrg, setActiveOrg] = useState<OrgWithRole | null>(null);
  const [members, setMembers] = useState<OrgMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setOrganizations([]);
      setActiveOrg(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    getMyOrganizations()
      .then((orgs) => {
        setOrganizations(orgs);
        setActiveOrg(orgs[0] ?? null);
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [user?.id]);

  useEffect(() => {
    if (!activeOrg) { setMembers([]); return; }
    getOrgMembers(activeOrg.id)
      .then(setMembers)
      .catch(() => setMembers([]));
  }, [activeOrg?.id]);

  const saveOrg = useCallback(
    async (updates: Partial<Pick<OrgWithRole, 'name' | 'logo_url'>>) => {
      if (!activeOrg) return;
      const updated = await updateOrganization(activeOrg.id, updates);
      const withRole: OrgWithRole = { ...updated, role: activeOrg.role };
      setActiveOrg(withRole);
      setOrganizations((prev) => prev.map((o) => (o.id === updated.id ? withRole : o)));
    },
    [activeOrg?.id],
  );

  return { organizations, activeOrg, members, loading, error, saveOrg, setActiveOrg };
}
