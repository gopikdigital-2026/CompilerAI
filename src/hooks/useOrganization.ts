import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from './useAuth';
import {
  getMyOrganizations,
  updateOrganization,
  getOrgMembers,
} from '../services/organizations.service';
import type { OrgWithRole, OrgMember } from '../types/database';

export function useOrganization() {
  const { user } = useAuth();
  const userId = user?.id ?? null;

  const [organizations, setOrganizations] = useState<OrgWithRole[]>([]);
  const [activeOrg, setActiveOrg] = useState<OrgWithRole | null>(null);
  const [members, setMembers] = useState<OrgMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Track activeOrg.id separately so effects don't reference the object directly
  const activeOrgId = activeOrg?.id ?? null;
  const activeOrgRef = useRef(activeOrg);
  activeOrgRef.current = activeOrg;

  useEffect(() => {
    if (!userId) {
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
  }, [userId]);

  useEffect(() => {
    if (!activeOrgId) { setMembers([]); return; }
    getOrgMembers(activeOrgId)
      .then(setMembers)
      .catch(() => setMembers([]));
  }, [activeOrgId]);

  const saveOrg = useCallback(
    async (updates: Partial<Pick<OrgWithRole, 'name' | 'logo_url'>>) => {
      const org = activeOrgRef.current;
      if (!org) return;
      const updated = await updateOrganization(org.id, updates);
      const withRole: OrgWithRole = { ...updated, role: org.role };
      setActiveOrg(withRole);
      setOrganizations((prev) => prev.map((o) => (o.id === updated.id ? withRole : o)));
    },
    [],
  );

  return { organizations, activeOrg, members, loading, error, saveOrg, setActiveOrg };
}
