import { describe, expect, it } from "vitest";
import { designNames, localizeDesign } from "./design-names";

const tenant = (over: Partial<Parameters<typeof designNames>[0] & object> = {}) => ({
  slug: "test-gp",
  nameEn: "Test Gram Panchayat",
  nameMr: "चाचणी ग्रामपंचायत",
  area: { taluka: { nameEn: "Baramati", nameMr: "बारामती" }, district: { nameEn: "Pune", nameMr: "पुणे" } },
  ...over,
});

describe("designNames", () => {
  it("does nothing for the design's own website", () => {
    expect(designNames(tenant({ slug: "savardari" }))).toBeNull();
    expect(designNames(null)).toBeNull();
  });

  it("names the right village, taluka and district in English and Marathi", () => {
    const names = designNames(tenant());
    const data = {
      title: { en: "Welcome to Savardari", mr: "सवरदरी मध्ये स्वागत" },
      body: { mr: "ग्रामपंचायत सवरदरी निसर्गसंवर्धन... खेड तालुक्यातील वाढत्या क्षेत्रामुळे सवरदरीचे स्वरूप समृद्ध आहे." },
      address: "Gram Panchayat: Savardari, Taluka: Khed, District: Pune",
      list: ["Khed", { x: "सवरदरी" }],
      count: 5,
    };
    const out = localizeDesign(data, names);
    expect(out.title.en).toBe("Welcome to Test Gram Panchayat");
    expect(out.title.mr).toBe("चाचणी ग्रामपंचायत मध्ये स्वागत");
    expect(out.body.mr).toContain("ग्रामपंचायत चाचणी ग्रामपंचायत निसर्गसंवर्धन");
    expect(out.body.mr).toContain("बारामती तालुक्यातील");
    expect(out.body.mr).toContain("चाचणी ग्रामपंचायतचे स्वरूप");
    expect(out.address).toBe("Gram Panchayat: Test Gram Panchayat, Taluka: Baramati, District: Pune");
    expect(out.list).toEqual(["Baramati", { x: "चाचणी ग्रामपंचायत" }]);
    expect(out.count).toBe(5);
    expect(JSON.stringify(out)).not.toMatch(/Savardari|सवरदरी|Khed|खेड/);
  });

  it("does not turn the Marathi word for village into Khed", () => {
    const out = localizeDesign({ t: "खेडेगाव आणि खेड" }, designNames(tenant()));
    expect(out.t).toBe("खेडेगाव आणि बारामती");
  });

  it("without area names only the village is swapped", () => {
    const out = localizeDesign({ t: "Savardari, Khed" }, designNames(tenant({ area: undefined })));
    expect(out.t).toBe("Test Gram Panchayat, Khed");
  });
});
