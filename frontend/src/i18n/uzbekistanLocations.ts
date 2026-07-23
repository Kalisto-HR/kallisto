import type { SupportedLanguage } from "./index";

export interface UzbekistanDistrict {
  code: string;
  nameUz: string;
  nameRu: string;
  nameEn: string;
}

export interface UzbekistanRegion {
  code: string;
  nameUz: string;
  nameRu: string;
  nameEn: string;
  districts: UzbekistanDistrict[];
}

export const uzbekistanLocations: UzbekistanRegion[] = [
  {
    code: "UZ-TK",
    nameUz: "Toshkent shahri",
    nameRu: "Город Ташкент",
    nameEn: "Tashkent City",
    districts: [
      { code: "UZ-TK-BEKTEMIR", nameUz: "Bektemir tumani", nameRu: "Бектемирский район", nameEn: "Bektemir District" },
      { code: "UZ-TK-CHILONZOR", nameUz: "Chilonzor tumani", nameRu: "Чиланзарский район", nameEn: "Chilanzar District" },
      { code: "UZ-TK-MIRABAD", nameUz: "Mirobod tumani", nameRu: "Мирабадский район", nameEn: "Mirabad District" },
      { code: "UZ-TK-MIRZO-ULUGBEK", nameUz: "Mirzo Ulug‘bek tumani", nameRu: "Мирзо-Улугбекский район", nameEn: "Mirzo Ulugbek District" },
      { code: "UZ-TK-SHAYXONTOHUR", nameUz: "Shayxontohur tumani", nameRu: "Шайхантахурский район", nameEn: "Shaykhantakhur District" },
      { code: "UZ-TK-YUNUSABAD", nameUz: "Yunusobod tumani", nameRu: "Юнусабадский район", nameEn: "Yunusabad District" },
      { code: "UZ-TK-YAKKASAROY", nameUz: "Yakkasaroy tumani", nameRu: "Яккасарайский район", nameEn: "Yakkasaray District" },
    ],
  },
  {
    code: "UZ-TO",
    nameUz: "Toshkent viloyati",
    nameRu: "Ташкентская область",
    nameEn: "Tashkent Region",
    districts: [
      { code: "UZ-TO-ANGREN", nameUz: "Angren shahri", nameRu: "Город Ангрен", nameEn: "Angren City" },
      { code: "UZ-TO-CHIRCHIQ", nameUz: "Chirchiq shahri", nameRu: "Город Чирчик", nameEn: "Chirchiq City" },
      { code: "UZ-TO-OLMALIQ", nameUz: "Olmaliq shahri", nameRu: "Город Алмалык", nameEn: "Olmaliq City" },
      { code: "UZ-TO-QIBRAY", nameUz: "Qibray tumani", nameRu: "Кибрайский район", nameEn: "Qibray District" },
      { code: "UZ-TO-ZANGIOTA", nameUz: "Zangiota tumani", nameRu: "Зангиатинский район", nameEn: "Zangiota District" },
    ],
  },
  {
    code: "UZ-AN",
    nameUz: "Andijon viloyati",
    nameRu: "Андижанская область",
    nameEn: "Andijan Region",
    districts: [
      { code: "UZ-AN-ANDIJON", nameUz: "Andijon shahri", nameRu: "Город Андижан", nameEn: "Andijan City" },
      { code: "UZ-AN-ASAKA", nameUz: "Asaka tumani", nameRu: "Асакинский район", nameEn: "Asaka District" },
      { code: "UZ-AN-KHONABAD", nameUz: "Xonobod shahri", nameRu: "Город Ханабад", nameEn: "Khanabad City" },
    ],
  },
  {
    code: "UZ-BU",
    nameUz: "Buxoro viloyati",
    nameRu: "Бухарская область",
    nameEn: "Bukhara Region",
    districts: [
      { code: "UZ-BU-BUXORO", nameUz: "Buxoro shahri", nameRu: "Город Бухара", nameEn: "Bukhara City" },
      { code: "UZ-BU-GIJDUVON", nameUz: "G‘ijduvon tumani", nameRu: "Гиждуванский район", nameEn: "Gijduvan District" },
      { code: "UZ-BU-KOGON", nameUz: "Kogon shahri", nameRu: "Город Каган", nameEn: "Kogon City" },
    ],
  },
  {
    code: "UZ-FA",
    nameUz: "Farg‘ona viloyati",
    nameRu: "Ферганская область",
    nameEn: "Fergana Region",
    districts: [
      { code: "UZ-FA-FARGONA", nameUz: "Farg‘ona shahri", nameRu: "Город Фергана", nameEn: "Fergana City" },
      { code: "UZ-FA-QOQON", nameUz: "Qo‘qon shahri", nameRu: "Город Коканд", nameEn: "Kokand City" },
      { code: "UZ-FA-MARGILON", nameUz: "Marg‘ilon shahri", nameRu: "Город Маргилан", nameEn: "Margilan City" },
    ],
  },
  {
    code: "UZ-JI",
    nameUz: "Jizzax viloyati",
    nameRu: "Джизакская область",
    nameEn: "Jizzakh Region",
    districts: [
      { code: "UZ-JI-JIZZAX", nameUz: "Jizzax shahri", nameRu: "Город Джизак", nameEn: "Jizzakh City" },
      { code: "UZ-JI-ZOMIN", nameUz: "Zomin tumani", nameRu: "Зааминский район", nameEn: "Zomin District" },
      { code: "UZ-JI-GALLAOROL", nameUz: "G‘allaorol tumani", nameRu: "Галляаральский район", nameEn: "Gallaorol District" },
    ],
  },
  {
    code: "UZ-NG",
    nameUz: "Namangan viloyati",
    nameRu: "Наманганская область",
    nameEn: "Namangan Region",
    districts: [
      { code: "UZ-NG-NAMANGAN", nameUz: "Namangan shahri", nameRu: "Город Наманган", nameEn: "Namangan City" },
      { code: "UZ-NG-CHUST", nameUz: "Chust tumani", nameRu: "Чустский район", nameEn: "Chust District" },
      { code: "UZ-NG-POP", nameUz: "Pop tumani", nameRu: "Папский район", nameEn: "Pop District" },
    ],
  },
  {
    code: "UZ-NW",
    nameUz: "Navoiy viloyati",
    nameRu: "Навоийская область",
    nameEn: "Navoiy Region",
    districts: [
      { code: "UZ-NW-NAVOIY", nameUz: "Navoiy shahri", nameRu: "Город Навои", nameEn: "Navoiy City" },
      { code: "UZ-NW-ZARAFSHON", nameUz: "Zarafshon shahri", nameRu: "Город Зарафшан", nameEn: "Zarafshan City" },
      { code: "UZ-NW-KARMANA", nameUz: "Karmana tumani", nameRu: "Карманинский район", nameEn: "Karmana District" },
    ],
  },
  {
    code: "UZ-QA",
    nameUz: "Qashqadaryo viloyati",
    nameRu: "Кашкадарьинская область",
    nameEn: "Qashqadaryo Region",
    districts: [
      { code: "UZ-QA-QARSHI", nameUz: "Qarshi shahri", nameRu: "Город Карши", nameEn: "Qarshi City" },
      { code: "UZ-QA-SHAHRISABZ", nameUz: "Shahrisabz shahri", nameRu: "Город Шахрисабз", nameEn: "Shahrisabz City" },
      { code: "UZ-QA-KITOB", nameUz: "Kitob tumani", nameRu: "Китабский район", nameEn: "Kitob District" },
    ],
  },
  {
    code: "UZ-QR",
    nameUz: "Qoraqalpog‘iston Respublikasi",
    nameRu: "Республика Каракалпакстан",
    nameEn: "Republic of Karakalpakstan",
    districts: [
      { code: "UZ-QR-NUKUS", nameUz: "Nukus shahri", nameRu: "Город Нукус", nameEn: "Nukus City" },
      { code: "UZ-QR-CHIMBOY", nameUz: "Chimboy tumani", nameRu: "Чимбайский район", nameEn: "Chimboy District" },
      { code: "UZ-QR-TORTKOL", nameUz: "To‘rtko‘l tumani", nameRu: "Турткульский район", nameEn: "Turtkul District" },
    ],
  },
  {
    code: "UZ-SA",
    nameUz: "Samarqand viloyati",
    nameRu: "Самаркандская область",
    nameEn: "Samarqand Region",
    districts: [
      { code: "UZ-SA-SAMARQAND", nameUz: "Samarqand shahri", nameRu: "Город Самарканд", nameEn: "Samarqand City" },
      { code: "UZ-SA-KATTAQORGON", nameUz: "Kattaqo‘rg‘on shahri", nameRu: "Город Каттакурган", nameEn: "Kattakurgan City" },
      { code: "UZ-SA-URGUT", nameUz: "Urgut tumani", nameRu: "Ургутский район", nameEn: "Urgut District" },
    ],
  },
  {
    code: "UZ-SI",
    nameUz: "Sirdaryo viloyati",
    nameRu: "Сырдарьинская область",
    nameEn: "Sirdaryo Region",
    districts: [
      { code: "UZ-SI-GULISTON", nameUz: "Guliston shahri", nameRu: "Город Гулистан", nameEn: "Guliston City" },
      { code: "UZ-SI-SIRDARYO", nameUz: "Sirdaryo tumani", nameRu: "Сырдарьинский район", nameEn: "Sirdaryo District" },
      { code: "UZ-SI-YANGIYER", nameUz: "Yangiyer shahri", nameRu: "Город Янгиер", nameEn: "Yangiyer City" },
    ],
  },
  {
    code: "UZ-SU",
    nameUz: "Surxondaryo viloyati",
    nameRu: "Сурхандарьинская область",
    nameEn: "Surxondaryo Region",
    districts: [
      { code: "UZ-SU-TERMIZ", nameUz: "Termiz shahri", nameRu: "Город Термез", nameEn: "Termiz City" },
      { code: "UZ-SU-DENOV", nameUz: "Denov tumani", nameRu: "Денауский район", nameEn: "Denov District" },
      { code: "UZ-SU-SHEROBOD", nameUz: "Sherobod tumani", nameRu: "Шерабадский район", nameEn: "Sherobod District" },
    ],
  },
  {
    code: "UZ-XO",
    nameUz: "Xorazm viloyati",
    nameRu: "Хорезмская область",
    nameEn: "Xorazm Region",
    districts: [
      { code: "UZ-XO-URGANCH", nameUz: "Urganch shahri", nameRu: "Город Ургенч", nameEn: "Urganch City" },
      { code: "UZ-XO-XIVA", nameUz: "Xiva shahri", nameRu: "Город Хива", nameEn: "Khiva City" },
      { code: "UZ-XO-HAZORASP", nameUz: "Hazorasp tumani", nameRu: "Хазараспский район", nameEn: "Hazorasp District" },
    ],
  },
];

export function getLocalizedLocationName(
  item: Pick<UzbekistanRegion | UzbekistanDistrict, "nameEn" | "nameRu" | "nameUz">,
  language: string,
) {
  const normalized = language.split("-")[0] as SupportedLanguage;
  if (normalized === "ru") return item.nameRu;
  if (normalized === "uz") return item.nameUz;
  return item.nameEn;
}

export function getRegionByCode(code: string | null | undefined) {
  return uzbekistanLocations.find((region) => region.code === code) ?? null;
}

export function getDistrictByCode(regionCode: string | null | undefined, districtCode: string | null | undefined) {
  return getRegionByCode(regionCode)?.districts.find((district) => district.code === districtCode) ?? null;
}
