package validation

var uzbekistanRegionDistricts = map[string]map[string]struct{}{
	"UZ-TK": {"UZ-TK-BEKTEMIR": {}, "UZ-TK-CHILONZOR": {}, "UZ-TK-MIRABAD": {}, "UZ-TK-MIRZO-ULUGBEK": {}, "UZ-TK-SHAYXONTOHUR": {}, "UZ-TK-YUNUSABAD": {}, "UZ-TK-YAKKASAROY": {}},
	"UZ-TO": {"UZ-TO-ANGREN": {}, "UZ-TO-CHIRCHIQ": {}, "UZ-TO-OLMALIQ": {}, "UZ-TO-QIBRAY": {}, "UZ-TO-ZANGIOTA": {}},
	"UZ-AN": {"UZ-AN-ANDIJON": {}, "UZ-AN-ASAKA": {}, "UZ-AN-KHONABAD": {}},
	"UZ-BU": {"UZ-BU-BUXORO": {}, "UZ-BU-GIJDUVON": {}, "UZ-BU-KOGON": {}},
	"UZ-FA": {"UZ-FA-FARGONA": {}, "UZ-FA-QOQON": {}, "UZ-FA-MARGILON": {}},
	"UZ-JI": {"UZ-JI-JIZZAX": {}, "UZ-JI-ZOMIN": {}, "UZ-JI-GALLAOROL": {}},
	"UZ-NG": {"UZ-NG-NAMANGAN": {}, "UZ-NG-CHUST": {}, "UZ-NG-POP": {}},
	"UZ-NW": {"UZ-NW-NAVOIY": {}, "UZ-NW-ZARAFSHON": {}, "UZ-NW-KARMANA": {}},
	"UZ-QA": {"UZ-QA-QARSHI": {}, "UZ-QA-SHAHRISABZ": {}, "UZ-QA-KITOB": {}},
	"UZ-QR": {"UZ-QR-NUKUS": {}, "UZ-QR-CHIMBOY": {}, "UZ-QR-TORTKOL": {}},
	"UZ-SA": {"UZ-SA-SAMARQAND": {}, "UZ-SA-KATTAQORGON": {}, "UZ-SA-URGUT": {}},
	"UZ-SI": {"UZ-SI-GULISTON": {}, "UZ-SI-SIRDARYO": {}, "UZ-SI-YANGIYER": {}},
	"UZ-SU": {"UZ-SU-TERMIZ": {}, "UZ-SU-DENOV": {}, "UZ-SU-SHEROBOD": {}},
	"UZ-XO": {"UZ-XO-URGANCH": {}, "UZ-XO-XIVA": {}, "UZ-XO-HAZORASP": {}},
}

func IsUzbekistanRegionCode(value string) bool {
	_, ok := uzbekistanRegionDistricts[value]
	return ok
}

func IsUzbekistanDistrictCode(value string) bool {
	for _, districts := range uzbekistanRegionDistricts {
		if _, ok := districts[value]; ok {
			return true
		}
	}
	return false
}

func IsUzbekistanDistrictInRegion(regionCode, districtCode string) bool {
	districts, ok := uzbekistanRegionDistricts[regionCode]
	if !ok {
		return false
	}
	_, ok = districts[districtCode]
	return ok
}
