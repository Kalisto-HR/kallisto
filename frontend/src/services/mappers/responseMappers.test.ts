import { describe, expect, it } from "vitest";
import {
  normalizeSubmittedApplication,
  normalizeApplicationTestScoreImportResult,
  normalizeBasketCheckoutPreview,
  normalizeBasketPlan,
  normalizeEnvelope,
  normalizePagination,
  normalizeProfile,
  normalizeApplicantApplication,
  normalizeApplicantApplicationListItem,
  normalizeApplicantBasketState,
  normalizeApplicantTestScore,
  normalizeUniversity,
  normalizeUniversityListItem,
  toPortalRole,
} from "./responseMappers";

describe("response mappers", () => {
  it("normalizes envelopes and pagination payloads", () => {
    expect(normalizeEnvelope({ success: true, data: { ok: true }, message: "ready", timestamp: 12 })).toEqual({
      success: true,
      data: { ok: true },
      message: "ready",
      timestamp: 12,
    });
    expect(normalizeEnvelope(null)).toEqual({
      success: false,
      data: null,
      message: "Unexpected API response shape",
    });

    expect(normalizePagination({ items: [1], total: 4, page: 2, limit: 20, total_pages: 3 })).toEqual({
      items: [1],
      total: 4,
      page: 2,
      limit: 20,
      totalPages: 3,
    });
  });

  it("normalizes university, basket, and profile shapes", () => {
    expect(
      normalizeUniversityListItem({
        id: "uni-1",
        name: "Example",
        province: "Tashkent",
        city: "Tashkent",
        country: "UZ",
        ranking: 1,
        application_fee: 25,
        acceptance_rate: 65,
        tuition_fee: 1000,
        application_deadline: "2026-09-01",
        ielts_min: 6.5,
        toefl_min: 90,
        scholarship_available: true,
        city_type: "urban",
        campus_vibe: "modern",
      }),
    ).toEqual({
      id: "uni-1",
      name: "Example",
      description: null,
      province: "Tashkent",
      city: "Tashkent",
      country: "UZ",
      ranking: 1,
      applicationFee: 25,
      acceptanceRate: 65,
      tuitionFee: 1000,
      applicationDeadline: "2026-09-01",
      ieltsMin: 6.5,
      toeflMin: 90,
      scholarshipAvailable: true,
      cityType: "urban",
      campusVibe: "modern",
      programGroups: null,
    });

    expect(
      normalizeUniversity({
        id: "uni-1",
        name: "Example",
        manager_id: "mgr-1",
        application_schema: { sections: [] },
        university_profile: { summary: "ok" },
        metadata: { featured: true },
        created_at: "2026-01-01T00:00:00Z",
      }),
    ).toMatchObject({
      id: "uni-1",
      managerId: "mgr-1",
      name: "Example",
      applicationSchema: { sections: [] },
      universityProfile: { summary: "ok" },
      metadata: { featured: true },
      createdAt: "2026-01-01T00:00:00Z",
    });

    expect(
      normalizeBasketPlan({
        id: "plan-1",
        name: "Starter",
        capacity: 3,
        price: 120,
        per_app: 40,
        savings: 10,
        featured: true,
        description: "desc",
        price_caption: "caption",
      }),
    ).toEqual({
      id: "plan-1",
      name: "Starter",
      capacity: 3,
      price: 120,
      perApp: 40,
      savings: 10,
      featured: true,
      description: "desc",
      priceCaption: "caption",
    });

    expect(
      normalizeApplicantBasketState({
        items: [{ id: "uni-1", name: "Example" }],
        selected_plan_id: "plan-1",
        recommended_plan_id: "plan-2",
        total_universities: 1,
        max_plan_capacity: 3,
      }),
    ).toMatchObject({
      selectedPlanId: "plan-1",
      recommendedPlanId: "plan-2",
      totalUniversities: 1,
      maxPlanCapacity: 3,
    });

    expect(
      normalizeBasketCheckoutPreview({
        plan: { id: "plan-1", name: "Starter" },
        universities: [{ id: "uni-1", name: "Example" }],
        application_count: 1,
        estimated_total: 120,
        status: "preview",
        ready_for_payment_api: false,
        warnings: ["payments unavailable"],
      }),
    ).toMatchObject({
      applicationCount: 1,
      estimatedTotal: 120,
      status: "preview",
      readyForPaymentApi: false,
      warnings: ["payments unavailable"],
    });

    expect(
      normalizeProfile({
        id: "user-1",
        email: "vida@example.com",
        first_name: "Vida",
        last_name: "Test",
        data: { bio: "hello" },
        last_seen: "2026-03-01T00:00:00Z",
      }),
    ).toEqual({
      id: "user-1",
      email: "vida@example.com",
      firstName: "Vida",
      lastName: "Test",
      data: { bio: "hello" },
      lastSeen: "2026-03-01T00:00:00Z",
    });
  });

  it("normalizes application and test-score payloads", () => {
    expect(
      normalizeApplicantApplicationListItem({
        university_id: "uni-1",
        university_name: "Example",
        application_cycle: "2026",
        status: "draft",
        created_at: "2026-01-01",
        submitted_at: null,
      }),
    ).toEqual({
      universityId: "uni-1",
      universityName: "Example",
      applicationCycle: "2026",
      status: "draft",
      createdAt: "2026-01-01",
      submittedAt: null,
      statusProgress: 15,
      statusStage: "application_preparation",
      isFinal: false,
      isSuccessfulOutcome: false,
    });

    expect(
      normalizeApplicantApplication({
        user_id: "user-1",
        university_id: "uni-1",
        application_cycle: "2026",
        status: "submitted",
        data: { major: "CS" },
        submitted_at: "2026-03-01",
        created_at: "2026-01-01",
      }),
    ).toEqual({
      userId: "user-1",
      universityId: "uni-1",
      applicationCycle: "2026",
      status: "submitted",
      data: { major: "CS" },
      submittedAt: "2026-03-01",
      createdAt: "2026-01-01",
      statusProgress: 35,
      statusStage: "application_received",
      isFinal: false,
      isSuccessfulOutcome: false,
    });

    expect(
      normalizeApplicantTestScore({
        id: "score-1",
        user_id: "user-1",
        test_type: "IELTS",
        score: 7.5,
        out_of: 9,
        taken_on: "2026-02-01",
        created_at: "2026-02-02",
        updated_at: "2026-02-03",
      }),
    ).toEqual({
      id: "score-1",
      userId: "user-1",
      testType: "IELTS",
      otherTestName: null,
      score: 7.5,
      outOf: 9,
      takenOn: "2026-02-01",
      createdAt: "2026-02-02",
      updatedAt: "2026-02-03",
    });

    expect(
      normalizeApplicationTestScoreImportResult({
        imported_count: 1,
        test_scores: [{ id: "score-1", test_type: "SAT", score: 1450, out_of: 1600, normalized: 90 }],
      }),
    ).toEqual({
      importedCount: 1,
      testScores: [
        {
          id: "score-1",
          testType: "SAT",
          otherTestName: null,
          score: 1450,
          outOf: 1600,
          takenOn: null,
          normalized: 90,
        },
      ],
    });

    expect(
      normalizeSubmittedApplication({
        id: "submission-1",
        user_id: "user-1",
        university_id: "uni-1",
        application_cycle: "2026",
        applicant_info: { first_name: "Vida" },
        application_data: { major: "CS" },
        received_at: "2026-03-02",
        status: "submitted",
      }),
    ).toMatchObject({
      id: "submission-1",
      userId: "user-1",
      universityId: "uni-1",
      applicationCycle: "2026",
      applicantInfo: { first_name: "Vida" },
      applicationData: { major: "CS" },
      receivedAt: "2026-03-02",
      status: "submitted",
    });

    expect(toPortalRole("partner")).toBe("partner");
    expect(toPortalRole("staff")).toBe("staff");
    expect(toPortalRole("weird")).toBe("applicant");
  });
});
