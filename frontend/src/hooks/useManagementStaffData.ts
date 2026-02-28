import { useCallback, useEffect, useState } from "react";
import {
  createManagementStaff,
  fetchManagementStaff,
  resendManagementStaffInvite,
  updateManagementStaff,
  updateManagementStaffStatus,
  type CreateManagementStaffPayload,
  type ManagementStaffQuery,
  type UpdateManagementStaffPayload,
} from "../services/admin/managerService";
import type { ManagementStaffPagePayload, ManagementStaffStatus } from "../types/domain";

const defaultPayload: ManagementStaffPagePayload = {
  items: [],
  total: 0,
  page: 1,
  limit: 20,
  totalPages: 1,
  invitations: [],
  roles: [],
};

export function useManagementStaffData(universityId?: string) {
  const [payload, setPayload] = useState<ManagementStaffPagePayload>(defaultPayload);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState<ManagementStaffQuery>({ page: 1, limit: 20, role: "all", status: "all" });

  const load = useCallback(async () => {
    if (!universityId) {
      setPayload(defaultPayload);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const nextPayload = await fetchManagementStaff(universityId, query);
      setPayload(nextPayload);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load staff");
    } finally {
      setLoading(false);
    }
  }, [query, universityId]);

  useEffect(() => {
    void load();
  }, [load]);

  const createStaff = async (staff: CreateManagementStaffPayload) => {
    if (!universityId) return;
    await createManagementStaff(universityId, staff);
    await load();
  };

  const editStaff = async (staffId: string, updates: UpdateManagementStaffPayload) => {
    if (!universityId) return;
    await updateManagementStaff(universityId, staffId, updates);
    await load();
  };

  const setStaffStatus = async (staffId: string, status: ManagementStaffStatus, reason?: string) => {
    if (!universityId) return;
    await updateManagementStaffStatus(universityId, staffId, status, reason);
    await load();
  };

  const resendInvite = async (staffId: string) => {
    if (!universityId) return;
    await resendManagementStaffInvite(universityId, staffId);
    await load();
  };

  return {
    payload,
    loading,
    error,
    query,
    setQuery,
    refresh: load,
    createStaff,
    editStaff,
    setStaffStatus,
    resendInvite,
  };
}
