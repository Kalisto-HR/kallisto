package regions

import "strings"

var supportedUzbekistanRegionCodes = map[string]struct{}{
	"tashkent_city":   {},
	"karakalpakstan":  {},
	"andijan":         {},
	"bukhara":         {},
	"fergana":         {},
	"jizzakh":         {},
	"khorezm":         {},
	"namangan":        {},
	"navoiy":          {},
	"qashqadaryo":     {},
	"samarqand":       {},
	"sirdaryo":        {},
	"surxondaryo":     {},
	"tashkent_region": {},
}

var uzbekistanRegionAliases = map[string]string{
	"tashkent city":     "tashkent_city",
	"tashkent":          "tashkent_city",
	"toshkent shahri":   "tashkent_city",
	"karakalpakstan":    "karakalpakstan",
	"qoraqalpogiston":   "karakalpakstan",
	"andijan":           "andijan",
	"andijon":           "andijan",
	"bukhara":           "bukhara",
	"buxoro":            "bukhara",
	"fergana":           "fergana",
	"fargona":           "fergana",
	"jizzakh":           "jizzakh",
	"jizzax":            "jizzakh",
	"khorezm":           "khorezm",
	"xorazm":            "khorezm",
	"namangan":          "namangan",
	"navoiy":            "navoiy",
	"navoi":             "navoiy",
	"kashkadarya":       "qashqadaryo",
	"qashqadaryo":       "qashqadaryo",
	"samarkand":         "samarqand",
	"samarqand":         "samarqand",
	"syrdarya":          "sirdaryo",
	"sirdaryo":          "sirdaryo",
	"surkhandarya":      "surxondaryo",
	"surxondaryo":       "surxondaryo",
	"tashkent region":   "tashkent_region",
	"toshkent viloyati": "tashkent_region",
}

func IsSupportedUzbekistanRegionCode(value string) bool {
	_, ok := supportedUzbekistanRegionCodes[strings.ToLower(strings.TrimSpace(value))]
	return ok
}

func NormalizeUzbekistanRegionCode(value string) (string, bool) {
	normalized := strings.ToLower(strings.TrimSpace(value))
	if IsSupportedUzbekistanRegionCode(normalized) {
		return normalized, true
	}
	if code, ok := uzbekistanRegionAliases[normalized]; ok {
		return code, true
	}
	for _, suffix := range []string{" region", " oblast", " province", " viloyati"} {
		trimmed := strings.TrimSpace(strings.TrimSuffix(normalized, suffix))
		if code, ok := uzbekistanRegionAliases[trimmed]; ok {
			return code, true
		}
	}
	return "", false
}
