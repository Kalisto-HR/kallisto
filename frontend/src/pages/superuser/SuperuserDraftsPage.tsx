import SuperuserDraftsApprovals from "../../components/superuser/SuperuserDraftsApprovals";
import { useCallback, useEffect, useState } from "react";
import {
  approveSuperuserDraft,
  fetchSuperuserDrafts,
  rejectSuperuserDraft,
  type SuperuserDraftItem,
} from "../../services/admin/superuserService";

export function SuperuserDraftsPage() {
  const [drafts, setDrafts] = useState<SuperuserDraftItem[]>([]);

  const loadDrafts = useCallback(async () => {
    const page = await fetchSuperuserDrafts({ page: 1, limit: 100 });
    setDrafts(page.items);
  }, []);

  useEffect(() => {
    void loadDrafts().catch(() => {
      // Keep literal fallback UI if request fails.
    });
  }, [loadDrafts]);

  const mapDraftType = (value: string) => {
    switch (value) {
      case "application_review":
      case "university_update":
        return "university-profile-update";
      case "blacklist_entry":
        return "ban-user";
      case "announcement":
        return "suspend-university";
      default:
        return value;
    }
  };

  const mapped = drafts.map((item) => ({
    id: item.id,
    type: mapDraftType(item.type),
    status: item.status === "pending_review" || item.status === "draft" ? "pending" : item.status,
    title: item.title,
    description: item.description,
    requester: item.requester,
    requesterEmail: item.requester_email,
    targetEntity: item.target_entity,
    targetId: item.target_id,
    createdAt: item.created_at,
    reviewedAt: item.reviewed_at,
    executedAt: item.executed_at,
    reviewedBy: item.reviewed_by,
    priority: item.priority,
    changes: item.changes,
    comments: item.comments,
  }));

  return (
    <SuperuserDraftsApprovals
      draftsData={mapped.length > 0 ? (mapped as any) : undefined}
      onApproveDraft={async (draftId, notes) => {
        await approveSuperuserDraft(draftId, notes);
        await loadDrafts();
      }}
      onRejectDraft={async (draftId, reason) => {
        await rejectSuperuserDraft(draftId, reason);
        await loadDrafts();
      }}
    />
  );
}
