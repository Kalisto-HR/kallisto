import SuperuserUsers from "../../components/superuser/SuperuserUsers";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createBanUserDraft, fetchSuperuserUsers, type SuperuserUserItem } from "../../services/admin/superuserService";

export function SuperuserUsersPage() {
  const [users, setUsers] = useState<SuperuserUserItem[]>([]);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    let active = true;
    void fetchSuperuserUsers({ page: 1, limit: 200 })
      .then((page) => {
        if (active) {
          setUsers(page.items);
          setTotal(page.total);
        }
      })
      .catch(() => {
        // Keep literal fallback UI if request fails.
      });
    return () => {
      active = false;
    };
  }, []);

  const summary = useMemo(() => {
    const activeCount = users.filter((u) => u.status === "active").length;
    const bannedCount = users.filter((u) => u.status === "banned").length;
    return {
      totalUsers: total.toLocaleString(),
      activeUsers: activeCount.toLocaleString(),
      bannedUsers: bannedCount.toLocaleString(),
      newToday: "0",
    };
  }, [users, total]);

  const searchUserById = useCallback(
    async (id: string) => {
      const needle = id.toLowerCase();
      const hit = users.find((u) => u.user_id.toLowerCase() === needle || u.user_id.toLowerCase().includes(needle));
      if (!hit) {
        return null;
      }

      return {
        id: hit.user_id,
        name: hit.name,
        email: hit.email ?? "N/A",
        phone: hit.phone ?? "N/A",
        status: hit.status,
        joinedDate: "N/A",
        lastLogin: hit.updated_at,
        totalApplications: 0,
        activeApplications: 0,
        creditBalance: 0,
        totalSpent: 0,
      };
    },
    [users],
  );

  return (
    <SuperuserUsers
      searchUserById={searchUserById as any}
      onCreateBanDraft={async (userId, reason, duration) => {
        await createBanUserDraft(userId, reason, duration);
      }}
      summary={summary}
    />
  );
}
