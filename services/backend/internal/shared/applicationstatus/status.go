package applicationstatus

const (
	StatusDraft                         = "draft"
	StatusSubmitted                     = "submitted"
	StatusUnderReview                   = "under_review"
	StatusAdditionalInformationRequired = "additional_information_required"
	StatusDecisionPending               = "decision_pending"
	StatusAccepted                      = "accepted"
	StatusWaitlisted                    = "waitlisted"
	StatusRejected                      = "rejected"
)

var allStatuses = map[string]struct{}{
	StatusDraft:                         {},
	StatusSubmitted:                     {},
	StatusUnderReview:                   {},
	StatusAdditionalInformationRequired: {},
	StatusDecisionPending:               {},
	StatusAccepted:                      {},
	StatusWaitlisted:                    {},
	StatusRejected:                      {},
}

var reviewableStatuses = map[string]struct{}{
	StatusSubmitted:                     {},
	StatusUnderReview:                   {},
	StatusAdditionalInformationRequired: {},
	StatusDecisionPending:               {},
	StatusAccepted:                      {},
	StatusWaitlisted:                    {},
	StatusRejected:                      {},
}

var transitions = map[string]map[string]struct{}{
	StatusDraft: {
		StatusSubmitted: {},
	},
	StatusSubmitted: {
		StatusUnderReview:                   {},
		StatusAdditionalInformationRequired: {},
		StatusDecisionPending:               {},
		StatusAccepted:                      {},
		StatusWaitlisted:                    {},
		StatusRejected:                      {},
	},
	StatusUnderReview: {
		StatusAdditionalInformationRequired: {},
		StatusDecisionPending:               {},
		StatusAccepted:                      {},
		StatusWaitlisted:                    {},
		StatusRejected:                      {},
	},
	StatusAdditionalInformationRequired: {
		StatusUnderReview:     {},
		StatusDecisionPending: {},
		StatusAccepted:        {},
		StatusWaitlisted:      {},
		StatusRejected:        {},
	},
	StatusDecisionPending: {
		StatusAccepted:   {},
		StatusWaitlisted: {},
		StatusRejected:   {},
	},
}

func IsValid(status string) bool {
	_, ok := allStatuses[status]
	return ok
}

func IsReviewable(status string) bool {
	_, ok := reviewableStatuses[status]
	return ok
}

func IsFinal(status string) bool {
	return status == StatusAccepted || status == StatusWaitlisted || status == StatusRejected
}

func IsSuccessfulOutcome(status string) bool {
	return status == StatusAccepted
}

func CanTransition(from, to string) bool {
	allowedTargets, ok := transitions[from]
	if !ok {
		return false
	}
	_, ok = allowedTargets[to]
	return ok
}

func Progress(status string) int {
	switch status {
	case StatusDraft:
		return 15
	case StatusSubmitted:
		return 35
	case StatusUnderReview, StatusAdditionalInformationRequired:
		return 55
	case StatusDecisionPending:
		return 80
	case StatusWaitlisted:
		return 90
	case StatusAccepted:
		return 100
	case StatusRejected:
		return 80
	default:
		return 0
	}
}

func Stage(status string) string {
	switch status {
	case StatusDraft:
		return "application_preparation"
	case StatusSubmitted:
		return "application_received"
	case StatusUnderReview, StatusAdditionalInformationRequired:
		return "review_in_progress"
	case StatusDecisionPending:
		return "decision_pending"
	case StatusAccepted, StatusWaitlisted, StatusRejected:
		return "final_decision"
	default:
		return "unknown"
	}
}
