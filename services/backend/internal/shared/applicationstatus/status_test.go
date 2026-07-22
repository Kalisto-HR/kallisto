package applicationstatus

import "testing"

func TestStatusValidationUsesExactApplicationStatuses(t *testing.T) {
	valid := []string{
		StatusDraft,
		StatusSubmitted,
		StatusUnderReview,
		StatusAdditionalInformationRequired,
		StatusDecisionPending,
		StatusAccepted,
		StatusWaitlisted,
		StatusRejected,
	}

	for _, status := range valid {
		if !IsValid(status) {
			t.Fatalf("expected %s to be valid", status)
		}
	}

	if IsValid("pending_review") {
		t.Fatal("pending_review must not be a valid application status")
	}
}

func TestApplicationStatusTransitions(t *testing.T) {
	if !CanTransition(StatusSubmitted, StatusUnderReview) {
		t.Fatal("submitted should transition to under_review")
	}
	if !CanTransition(StatusUnderReview, StatusAdditionalInformationRequired) {
		t.Fatal("under_review should transition to additional_information_required")
	}
	if !CanTransition(StatusDecisionPending, StatusAccepted) {
		t.Fatal("decision_pending should transition to accepted")
	}
	if CanTransition(StatusAccepted, StatusRejected) {
		t.Fatal("final statuses should not transition without elevated correction")
	}
	if CanTransition(StatusSubmitted, StatusDraft) {
		t.Fatal("submitted should not transition back to draft")
	}
}

func TestApplicationStatusProgressAndOutcome(t *testing.T) {
	if Progress(StatusDraft) != 15 {
		t.Fatalf("unexpected draft progress: %d", Progress(StatusDraft))
	}
	if Progress(StatusAccepted) != 100 {
		t.Fatalf("unexpected accepted progress: %d", Progress(StatusAccepted))
	}
	if !IsFinal(StatusRejected) {
		t.Fatal("rejected should be a final status")
	}
	if IsSuccessfulOutcome(StatusRejected) {
		t.Fatal("rejected should not be a successful outcome")
	}
}
