// Unit tests for validation utilities
package validation

import (
	"testing"
)

func TestValidateUUID(t *testing.T) {
	tests := []struct {
		name      string
		value     string
		wantError bool
	}{
		{"valid UUID", "123e4567-e89b-12d3-a456-426614174000", false},
		{"empty string", "", true},
		{"invalid format", "not-a-uuid", true},
		{"lowercase", "abcdef01-2345-6789-abcd-ef0123456789", false},
		{"uppercase", "ABCDEF01-2345-6789-ABCD-EF0123456789", false},
		{"mixed case", "AbCdEf01-2345-6789-AbCd-Ef0123456789", false},
		{"missing dashes", "123e4567e89b12d3a456426614174000", true},
		{"too short", "123e4567-e89b-12d3-a456", true},
		{"too long", "123e4567-e89b-12d3-a456-426614174000-extra", true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := ValidateUUID(tt.value, "test_field")
			if tt.wantError && err == nil {
				t.Errorf("ValidateUUID(%q) = nil, want error", tt.value)
			}
			if !tt.wantError && err != nil {
				t.Errorf("ValidateUUID(%q) = %v, want nil", tt.value, err)
			}
			if err != nil && err.Field != "test_field" {
				t.Errorf("ValidateUUID(%q).Field = %q, want %q", tt.value, err.Field, "test_field")
			}
		})
	}
}

func TestValidateEmail(t *testing.T) {
	tests := []struct {
		name      string
		value     string
		wantError bool
	}{
		{"valid email", "user@example.com", false},
		{"valid email with subdomain", "user@mail.example.com", false},
		{"missing @", "userexample.com", true},
		{"missing domain", "user@", true},
		{"missing dot after @", "user@example", true},
		{"empty string", "", true},
		{"@ at end", "user@.", false},
		{"multiple @", "user@@example.com", false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := ValidateEmail(tt.value, "email")
			if tt.wantError && err == nil {
				t.Errorf("ValidateEmail(%q) = nil, want error", tt.value)
			}
			if !tt.wantError && err != nil {
				t.Errorf("ValidateEmail(%q) = %v, want nil", tt.value, err)
			}
		})
	}
}

func TestValidateRequired(t *testing.T) {
	tests := []struct {
		name      string
		value     string
		wantError bool
	}{
		{"non-empty string", "hello", false},
		{"empty string", "", true},
		{"whitespace only - spaces", "   ", true},
		{"whitespace only - tabs", "\t\t", true},
		{"whitespace only - mixed", " \t \n ", true},
		{"string with leading whitespace", "  hello", false},
		{"string with trailing whitespace", "hello  ", false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := ValidateRequired(tt.value, "field")
			if tt.wantError && err == nil {
				t.Errorf("ValidateRequired(%q) = nil, want error", tt.value)
			}
			if !tt.wantError && err != nil {
				t.Errorf("ValidateRequired(%q) = %v, want nil", tt.value, err)
			}
		})
	}
}

func TestValidateMinLength(t *testing.T) {
	tests := []struct {
		name      string
		value     string
		min       int
		wantError bool
	}{
		{"string equals min", "abc", 3, false},
		{"string greater than min", "abcdef", 3, false},
		{"string less than min", "ab", 3, true},
		{"empty string with min 0", "", 0, false},
		{"empty string with min 1", "", 1, true},
		{"min 0", "hello", 0, false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := ValidateMinLength(tt.value, "field", tt.min)
			if tt.wantError && err == nil {
				t.Errorf("ValidateMinLength(%q, %d) = nil, want error", tt.value, tt.min)
			}
			if !tt.wantError && err != nil {
				t.Errorf("ValidateMinLength(%q, %d) = %v, want nil", tt.value, tt.min, err)
			}
		})
	}
}

func TestValidateMaxLength(t *testing.T) {
	tests := []struct {
		name      string
		value     string
		max       int
		wantError bool
	}{
		{"string equals max", "abc", 3, false},
		{"string less than max", "ab", 3, false},
		{"string greater than max", "abcdef", 3, true},
		{"empty string with max 0", "", 0, false},
		{"empty string with max 5", "", 5, false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := ValidateMaxLength(tt.value, "field", tt.max)
			if tt.wantError && err == nil {
				t.Errorf("ValidateMaxLength(%q, %d) = nil, want error", tt.value, tt.max)
			}
			if !tt.wantError && err != nil {
				t.Errorf("ValidateMaxLength(%q, %d) = %v, want nil", tt.value, tt.max, err)
			}
		})
	}
}

func TestValidateInList(t *testing.T) {
	allowed := []string{"draft", "submitted", "accepted", "rejected"}

	tests := []struct {
		name      string
		value     string
		wantError bool
	}{
		{"value in list - first", "draft", false},
		{"value in list - middle", "submitted", false},
		{"value in list - last", "rejected", false},
		{"value not in list", "pending", true},
		{"empty string", "", true},
		{"case sensitive - uppercase", "DRAFT", true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := ValidateInList(tt.value, "status", allowed)
			if tt.wantError && err == nil {
				t.Errorf("ValidateInList(%q) = nil, want error", tt.value)
			}
			if !tt.wantError && err != nil {
				t.Errorf("ValidateInList(%q) = %v, want nil", tt.value, err)
			}
		})
	}
}

func TestValidate(t *testing.T) {
	t.Run("all nil returns empty slice", func(t *testing.T) {
		result := Validate(nil, nil, nil)
		if len(result) != 0 {
			t.Errorf("Validate(nil, nil, nil) returned %d errors, want 0", len(result))
		}
	})

	t.Run("mixed nil and errors returns only errors", func(t *testing.T) {
		err1 := &ValidationError{Field: "field1", Message: "error1"}
		err2 := &ValidationError{Field: "field2", Message: "error2"}

		result := Validate(nil, err1, nil, err2, nil)
		if len(result) != 2 {
			t.Errorf("Validate() returned %d errors, want 2", len(result))
		}
		if result[0] != err1 {
			t.Errorf("Validate()[0] = %v, want %v", result[0], err1)
		}
		if result[1] != err2 {
			t.Errorf("Validate()[1] = %v, want %v", result[1], err2)
		}
	})

	t.Run("all errors returns all", func(t *testing.T) {
		err1 := &ValidationError{Field: "field1", Message: "error1"}
		err2 := &ValidationError{Field: "field2", Message: "error2"}

		result := Validate(err1, err2)
		if len(result) != 2 {
			t.Errorf("Validate() returned %d errors, want 2", len(result))
		}
	})

	t.Run("empty input returns empty slice", func(t *testing.T) {
		result := Validate()
		if len(result) != 0 {
			t.Errorf("Validate() returned %d errors, want 0", len(result))
		}
	})
}

func TestValidationError_Error(t *testing.T) {
	err := &ValidationError{
		Field:   "email",
		Message: "is required",
	}

	expected := "email: is required"
	if err.Error() != expected {
		t.Errorf("ValidationError.Error() = %q, want %q", err.Error(), expected)
	}
}
