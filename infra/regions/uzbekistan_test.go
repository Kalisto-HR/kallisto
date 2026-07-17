package regions

import "testing"

func TestNormalizeUzbekistanRegionCode(t *testing.T) {
	tests := []struct {
		name string
		raw  string
		want string
		ok   bool
	}{
		{name: "canonical code", raw: "tashkent_city", want: "tashkent_city", ok: true},
		{name: "english display name", raw: "Samarkand Region", want: "samarqand", ok: true},
		{name: "uzbek display name", raw: "Qashqadaryo", want: "qashqadaryo", ok: true},
		{name: "unsupported", raw: "Canada", ok: false},
		{name: "empty", raw: "", ok: false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, ok := NormalizeUzbekistanRegionCode(tt.raw)
			if ok != tt.ok {
				t.Fatalf("ok = %v, want %v", ok, tt.ok)
			}
			if got != tt.want {
				t.Fatalf("got %q, want %q", got, tt.want)
			}
		})
	}
}

func TestIsSupportedUzbekistanRegionCode(t *testing.T) {
	if !IsSupportedUzbekistanRegionCode("andijan") {
		t.Fatal("andijan should be supported")
	}
	if IsSupportedUzbekistanRegionCode("unknown") {
		t.Fatal("unknown should not be supported")
	}
}
