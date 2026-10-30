/**
 * PLACEHOLDER CONTENT — Infrastructure, Finance and Our Village pages from the Figma file
 * (qBVt7yv0KG41onObVWfnP1). Same rules as figma-pages.ts. These pages are mostly illustrations in
 * the design (maps, dashboards, galleries), so they use `image-crops` frames with the Figma pictures
 * until real content and data replace them.
 */
import type { PageKey } from "@/config/pages";
import type { FallbackSection } from "./fallback";

const t = (en: string) => ({ en });
const P = "/images/figma/pages/";

const FAC = (label: string, value: string) => ({ label: t(label), value: t(value) });
/** Bilingual text with an explicit Marathi translation. */
const b = (en: string, mr: string) => ({ en, mr });
const PH = "/images/figma/photos/";

export const FIGMA_PAGE_SECTIONS_B: Partial<Record<PageKey, FallbackSection[]>> = {
  infrastructure: [
    {
      sectionKey: "page-hero",
      sortOrder: 0,
      data: {
        eyebrow: t("Village Infrastructure & Public Facilities"),
        title: t("Stronger Infrastructure, Better Living —"),
        titleAccent: t("Building a Better Savardari"),
        body: t("Explore the infrastructure and public facilities available in our village that ensure a better quality of life and sustainable development for all"),
        imageUrl: P + "infra-hero.png",
      },
    },
    {
      sectionKey: "facility-grid",
      sortOrder: 5,
      data: {
        heading: t("Public Facilities Overview"),
        items: [
          FAC("Drinking Water Supply", "100% Coverage"),
          FAC("Sanitation Facilities", "98% Coverage"),
          FAC("Road & Streets", "45.6 km"),
          FAC("Street Lighting", "100% LED"),
          FAC("Schools", "2 Schools"),
          FAC("Anganwadi Centres", "2 Centres"),
          FAC("Primary Health Centre", "1 PHC"),
          FAC("Public Library", "1 Library"),
          FAC("Playground", "1 Playground"),
          FAC("SHG Centres", "5 Centres"),
          FAC("Bus Stop & Transport Facilities", "3 Bus Stops"),
          FAC("Health Camps", "12 Camps (FY 24-25)"),
          FAC("Vaccination Programmes", "100% Coverage"),
          FAC("Community Halls", "2 Halls"),
          FAC("Other Public Facilities", "8+ Services"),
        ],
      },
    },
    // The map is a photograph; its legend, the dashboard and the two lists are data (same shapes as the backend sections).
    { sectionKey: "infra-map", sortOrder: 10, data: { mapImageId: PH + "infra-map.webp", markers: [] } },
    {
      sectionKey: "map-filters",
      sortOrder: 15,
      data: {
        items: [
          { icon: "water", name: b("Drinking Water", "पिण्याचे पाणी"), colour: "#0A84FF", visible: true },
          { icon: "sanitation", name: b("Sanitation", "स्वच्छता"), colour: "#16A34A", visible: true },
          { icon: "road", name: b("Roads", "रस्ते"), colour: "#F59E0B", visible: true },
          { icon: "light", name: b("Street Lighting", "पथदिवे"), colour: "#22C55E", visible: true },
          { icon: "school", name: b("Education", "शिक्षण"), colour: "#3B82F6", visible: true },
          { icon: "health", name: b("Health", "आरोग्य"), colour: "#EF4444", visible: true },
          { icon: "bus", name: b("Transport", "वाहतूक"), colour: "#2563EB", visible: true },
          { icon: "users", name: b("Community", "समाज"), colour: "#EC4899", visible: true },
          { icon: "info", name: b("Others", "इतर"), colour: "#6B7280", visible: true },
        ],
      },
    },
    {
      sectionKey: "status-cards",
      sortOrder: 20,
      data: {
        items: [
          { icon: "water", title: b("Water Supply", "पाणी पुरवठा"), smallLabel: b("Supply Availability", "पुरवठ्याची उपलब्धता"), primaryValue: "98%", statusText: b("Sufficient", "पुरेसा"), bottomLabel: b("Villages with Full Supply", "पूर्ण पुरवठा असलेली गावे"), bottomValue: "5 / 5", buttonText: b("View Details", "तपशील पहा"), buttonLink: "page:infrastructure", theme: "blue" },
          { icon: "zap", title: b("Electricity Supply", "वीज पुरवठा"), smallLabel: b("Current Status", "सध्याची स्थिती"), primaryValue: "24x7", statusText: b("Normal", "सामान्य"), bottomLabel: b("Power Outages (This Month)", "वीज खंडित (या महिन्यात)"), bottomValue: "0", buttonText: b("View Details", "तपशील पहा"), buttonLink: "page:infrastructure", theme: "orange" },
          { icon: "sanitation", title: b("Sanitation Services", "स्वच्छता सेवा"), smallLabel: b("Toilet Utilization", "शौचालय वापर"), primaryValue: "100%", statusText: b("Active", "सक्रिय"), bottomLabel: b("Waste Collected (Today)", "कचरा संकलन (आज)"), bottomValue: "1.2 Ton", buttonText: b("View Details", "तपशील पहा"), buttonLink: "page:infrastructure", theme: "green" },
          { icon: "light", title: b("Street Lighting", "पथदिवे"), smallLabel: b("Operational Status", "कार्यरत स्थिती"), primaryValue: "100%", statusText: b("All Lights Functional", "सर्व दिवे सुरू"), bottomLabel: b("Total LED Lights", "एकूण LED दिवे"), bottomValue: "250", buttonText: b("View Details", "तपशील पहा"), buttonLink: "page:infrastructure", theme: "orange" },
          { icon: "road", title: b("Road Maintenance", "रस्ते देखभाल"), smallLabel: b("This Month", "या महिन्यात"), primaryValue: "12 km", statusText: b("Roads Maintained", "रस्ते दुरुस्त"), bottomLabel: b("Potholes Repaired", "खड्डे दुरुस्त"), bottomValue: "18", buttonText: b("View Details", "तपशील पहा"), buttonLink: "page:infrastructure", theme: "orange" },
        ],
      },
    },
    {
      sectionKey: "latest-announcements",
      sortOrder: 30,
      data: {
        enabled: true,
        heading: b("Latest Announcements", "ताज्या घोषणा"),
        buttonText: b("View All Updates", "सर्व अद्यतने पहा"),
        buttonLink: "page:announcements",
        items: [
          { icon: "megaphone", title: b("Swachhata Abhiyan Launch in Ward 7", "वॉर्ड ७ मध्ये स्वच्छता अभियानाचा शुभारंभ"), date: b("May 10, 2024", "१० मे, २०२४") },
          { icon: "water", title: b("UE Zone: Water Interruption this Week", "या आठवड्यात पाणीपुरवठा खंडित"), date: b("May 08, 2024", "८ मे, २०२४") },
          { icon: "health", title: b("Free Health Checkup Camp on Sunday", "रविवारी मोफत आरोग्य तपासणी शिबिर"), date: b("Apr 30, 2024", "३० एप्रिल, २०२४") },
          { icon: "school", title: b("Skill Development Workshop: May 10–15", "कौशल्य विकास कार्यशाळा: १०–१५ मे"), date: b("Apr 28, 2024", "२८ एप्रिल, २०२४") },
          { icon: "road", title: b("Maintenance Work: Drainage in Sai Enclave", "देखभाल काम: साई एन्क्लेव्हमधील गटार"), date: b("Apr 25, 2024", "२५ एप्रिल, २०२४") },
        ],
      },
    },
    {
      sectionKey: "upcoming-events",
      sortOrder: 35,
      data: {
        enabled: true,
        heading: b("Upcoming Events", "आगामी कार्यक्रम"),
        buttonText: b("View All Events", "सर्व कार्यक्रम पहा"),
        buttonLink: "page:announcements",
        items: [
          { icon: "leaf", title: b("Community Cleanliness Drive in Sector 5", "सेक्टर ५ मध्ये सामुदायिक स्वच्छता मोहीम"), date: b("Jun 5, 2024", "५ जून, २०२४") },
          { icon: "sprout", title: b("Green Marathon Awareness Program", "ग्रीन मॅरेथॉन जनजागृती कार्यक्रम"), date: b("Jun 12, 2024", "१२ जून, २०२४") },
          { icon: "tree", title: b("Tree Plantation Drive in Urban Park", "शहरी उद्यानात वृक्षारोपण मोहीम"), date: b("Jun 18, 2024", "१८ जून, २०२४") },
          { icon: "award", title: b("Rajyotsava Celebration — Cultural Program", "राज्योत्सव — सांस्कृतिक कार्यक्रम"), date: b("Jun 22, 2024", "२२ जून, २०२४") },
          { icon: "file", title: b("Pre-Monsoon Building Check-up Camp", "मान्सूनपूर्व इमारत तपासणी शिबिर"), date: b("Jun 28, 2024", "२८ जून, २०२४") },
        ],
      },
    },
  ],

  finance: [
    {
      sectionKey: "page-hero",
      sortOrder: 0,
      data: {
        eyebrow: t("Financial Information & Budget Transperancy"),
        title: t("Transparent Today, Stronger Tomorrow —"),
        titleAccent: t("Savardari’s Commitment to Accountability"),
        body: t("We are committed to complete transparency in financial management and the responsible use of public funds for the development of our village"),
        imageUrl: P + "fin-hero.png",
      },
    },
    {
      sectionKey: "top-stats",
      sortOrder: 5,
      data: {
        items: [
          { icon: "wallet", title: b("Total Balance", "एकूण शिल्लक"), value: "₹12,567", description: b("↑ 5.2% vs LM", "↑ ५.२% मागील महिन्याच्या तुलनेत"), visible: true },
          { icon: "growth", title: b("Growth", "वाढ"), value: "₹2,345", description: b("↑ 8.1% vs LM", "↑ ८.१% मागील महिन्याच्या तुलनेत"), visible: true },
          { icon: "file", title: b("Total Sales", "एकूण विक्री"), value: "₹1,24,567", description: b("↑ 10.2% vs LM", "↑ १०.२% मागील महिन्याच्या तुलनेत"), visible: true },
          { icon: "users", title: b("New Members", "नवीन सदस्य"), value: "₹3,456", description: b("↑ 4.7% vs LM", "↑ ४.७% मागील महिन्याच्या तुलनेत"), visible: true },
        ],
      },
    },
    {
      sectionKey: "income-sources",
      sortOrder: 10,
      data: {
        enabled: true,
        heading: b("Sources of Income", "उत्पन्नाचे स्रोत"),
        categories: [
          { name: b("Government Grants", "शासकीय अनुदान"), amount: "18000000.00", percentage: 61.6 },
          { name: b("Local Taxes & Fees", "स्थानिक कर आणि शुल्क"), amount: "4500000.00", percentage: 15.4 },
          { name: b("State Finance Commission", "राज्य वित्त आयोग"), amount: "3000000.00", percentage: 10.3 },
          { name: b("Central Finance Commission", "केंद्रीय वित्त आयोग"), amount: "2000000.00", percentage: 6.8 },
          { name: b("Donations & Contributions", "देणग्या आणि योगदान"), amount: "1000000.00", percentage: 3.4 },
          { name: b("Other Income", "इतर उत्पन्न"), amount: "700000.00", percentage: 2.5 },
        ],
        supportCard: { enabled: true, icon: "rupee", title: b("Government Support", "शासकीय सहाय्य"), description: b("61.6% of our income comes from government grants and funding.", "आमच्या उत्पन्नाचा ६१.६% भाग शासकीय अनुदान आणि निधीतून येतो."), buttonText: b("View Income Details", "उत्पन्न तपशील पहा"), buttonLink: "page:finance" },
      },
    },
    {
      sectionKey: "expenditure",
      sortOrder: 20,
      data: {
        heading: b("Where Your Money Goes", "तुमचा पैसा कुठे जातो"),
        subtitle: b("See how public funds are utilized for the development and welfare of Savardari", "सवरदरीच्या विकासासाठी आणि कल्याणासाठी सार्वजनिक निधी कसा वापरला जातो ते पहा"),
        backgroundColour: "#FCF7EE",
        categories: [
          { name: b("Infrastructure Development", "पायाभूत सुविधा विकास"), amount: "7200000.00", percentage: 30, colour: "#16A34A" },
          { name: b("Sanitation & Cleanliness", "स्वच्छता आणि सफाई"), amount: "4800000.00", percentage: 20, colour: "#2563EB" },
          { name: b("Education", "शिक्षण"), amount: "3600000.00", percentage: 15, colour: "#F97316" },
          { name: b("Water Supply", "पाणी पुरवठा"), amount: "2400000.00", percentage: 10, colour: "#7C3AED" },
          { name: b("Health & Nutrition", "आरोग्य आणि पोषण"), amount: "2400000.00", percentage: 10, colour: "#14B8A6" },
          { name: b("Agriculture & Livelihood", "शेती आणि उपजीविका"), amount: "1900000.00", percentage: 8, colour: "#EAB308" },
          { name: b("Others / Administration", "इतर / प्रशासन"), amount: "1700000.00", percentage: 7, colour: "#6B7280" },
        ],
        sideCard: { enabled: true, icon: "sprout", title: b("Our Focus", "आमचे लक्ष"), description: b("Maximum investment in infrastructure, sanitation, and education for a better tomorrow.", "उत्तम उद्यासाठी पायाभूत सुविधा, स्वच्छता आणि शिक्षणात सर्वाधिक गुंतवणूक."), buttonText: b("View Expenditure Details", "खर्च तपशील पहा"), buttonLink: "page:finance" },
      },
    },
    {
      sectionKey: "budget-visualizer",
      sortOrder: 30,
      data: {
        enabled: true,
        heading: b("Interactive Budget Visualizer", "परस्परसंवादी अंदाजपत्रक दर्शक"),
        subtitle: b("Explore our budget data through interactive charts and graphs", "आकृत्या आणि आलेखांद्वारे अंदाजपत्रकाची माहिती पहा"),
        backgroundColour: "#FFFFFF",
        tabs: [
          { tabKey: "sector", name: b("Expenditure by Sector", "क्षेत्रानुसार खर्च"), enabled: true },
          { tabKey: "income-expense", name: b("Income vs Expenditure", "उत्पन्न विरुद्ध खर्च"), enabled: true },
          { tabKey: "trend", name: b("Yearly Budget Trend", "वार्षिक अंदाजपत्रक कल"), enabled: true },
        ],
        overviewCard: {
          title: b("Budget Overview (FY 2024-25)", "अंदाजपत्रक आढावा (आ.व. २०२४-२५)"),
          fields: [
            { label: b("Total Income", "एकूण उत्पन्न"), valueType: "dynamic", prefixSuffix: "₹", colour: "#135130" },
            { label: b("Total Expenditure", "एकूण खर्च"), valueType: "dynamic", prefixSuffix: "₹", colour: "#DC2626" },
            { label: b("Surplus / Balance", "शिल्लक"), valueType: "auto", prefixSuffix: "₹", colour: "#7C3AED" },
            { label: b("Budget Utilization", "अंदाजपत्रक वापर"), valueType: "auto", prefixSuffix: "%", colour: "#2563EB" },
          ],
        },
        charts: [
          {
            tabKey: "sector",
            type: "bar",
            labels: ["Infrastructure", "Sanitation", "Education", "Water Supply", "Health", "Agriculture", "Others"],
            series: [{ name: b("Expenditure", "खर्च"), colour: "#16A34A", values: [7200000, 4800000, 3600000, 2400000, 2400000, 1900000, 1700000] }],
          },
          {
            tabKey: "income-expense",
            type: "bar",
            labels: ["Q1", "Q2", "Q3", "Q4"],
            series: [
              { name: b("Income", "उत्पन्न"), colour: "#135130", values: [6200000, 7100000, 6800000, 8400000] },
              { name: b("Expenditure", "खर्च"), colour: "#DC2626", values: [5400000, 6600000, 6100000, 7700000] },
            ],
          },
          {
            tabKey: "trend",
            type: "line",
            labels: ["2020-21", "2021-22", "2022-23", "2023-24", "2024-25"],
            series: [
              { name: b("Income", "उत्पन्न"), colour: "#135130", values: [19000000, 21500000, 24000000, 26500000, 28500000] },
              { name: b("Expenditure", "खर्च"), colour: "#DC2626", values: [17500000, 19800000, 22300000, 24100000, 25800000] },
            ],
          },
        ],
        downloadReport: { enabled: false, buttonText: b("Download Budget Report", "अंदाजपत्रक अहवाल डाउनलोड"), icon: "download" },
      },
    },
    {
      sectionKey: "documents",
      sortOrder: 40,
      data: {
        heading: b("Plans, Reports & Documents", "आराखडे, अहवाल आणि दस्तऐवज"),
        subtitle: b("Access important plans, reports, and documents", "महत्त्वाचे आराखडे, अहवाल आणि दस्तऐवज पहा"),
        backgroundColour: "#FFFFFF",
        // Placeholder entries have no file yet, so they appear as cards without a download link.
        items: [
          { title: b("Annual Budget", "वार्षिक अंदाजपत्रक"), sample: true },
          { title: b("Budget Utilization", "अंदाजपत्रक वापर"), sample: true },
          { title: b("Financial Statement (FY 2023-24)", "वित्तीय विवरण (आ.व. २०२३-२४)"), sample: true },
          { title: b("Audit Report", "लेखापरीक्षण अहवाल"), sample: true },
          { title: b("Master Plan (2021-26)", "मास्टर प्लॅन (२०२१-२६)"), sample: true },
        ],
      },
    },
  ],

  culture: [
    {
      sectionKey: "page-hero",
      sortOrder: 0,
      data: {
        eyebrow: t("Our Village — Identity & Culture"),
        title: t("Proud of Our Heritage. Inspired by Our Culture — This is"),
        body: t("Discover the rich history, vibrant culture, and warm hospitality that makes Savardari a unique and wonderful place to live and visit"),
        actions: [
          { label: t("Explore History"), href: "page:about" },
          { label: t("View Homestay Options"), href: "page:contact" },
        ],
        imageUrl: P + "vil-hero.png",
      },
    },
    {
      sectionKey: "village-intro",
      sortOrder: 10,
      data: {
        iconId: PH + "vil-intro-icon.webp",
        title: b("History of Savardari", "सावरदरीचा इतिहास"),
        description: b(
          "Savardari is a village rich in cultural roots, spiritual heritage, and a tradition of social progress. Learn more about its journey through our history, from its origin to its evolution.",
          "सावरदरी हे सांस्कृतिक मुळे, आध्यात्मिक वारसा आणि सामाजिक प्रगतीची परंपरा लाभलेले गाव आहे. आपल्या इतिहासातून त्याचा प्रवास, उगमापासून विकासापर्यंत, जाणून घ्या.",
        ),
        buttonLabel: b("Explore History", "इतिहास पहा"),
        buttonLink: "page:about",
      },
    },
    {
      sectionKey: "heritage-cards",
      sortOrder: 20,
      data: {
        items: [
          { title: b("Savardari Temple", "सावरदरी मंदिर"), description: b("Historic & architecturally rich", "ऐतिहासिक व वास्तुकलेने समृद्ध"), imageId: PH + "vil-heritage-1.webp" },
          { title: b("Shiva Temple", "शिव मंदिर"), description: b("Peaceful & spiritual vibes", "शांत व आध्यात्मिक वातावरण"), imageId: PH + "vil-heritage-2.webp" },
          { title: b("Vishaal Swami Temple", "विशाल स्वामी मंदिर"), description: b("Center of devotion", "भक्तीचे केंद्र"), imageId: PH + "vil-heritage-3.webp" },
        ],
      },
    },
    {
      sectionKey: "culture-cards",
      sortOrder: 30,
      data: {
        enabled: true,
        items: [
          { title: b("Folk Art & Music", "लोककला व संगीत"), description: b("Celebrating our traditional folk art, music & performances", "आपल्या पारंपरिक लोककला, संगीत व सादरीकरणांचा उत्सव"), imageId: PH + "vil-culture-1.webp" },
          { title: b("Traditional Dance", "पारंपरिक नृत्य"), description: b("Showcasing our vibrant cultural & dance forms.", "आपल्या रंगतदार सांस्कृतिक व नृत्य प्रकारांचे दर्शन."), imageId: PH + "vil-culture-2.webp" },
          { title: b("Local Festivals", "स्थानिक सण"), description: b("Cherished celebrations that bring our community together", "समाजाला एकत्र आणणारे लाडके उत्सव"), imageId: PH + "vil-culture-3.webp" },
          { title: b("Local Cuisine", "स्थानिक खाद्यसंस्कृती"), description: b("Delicious traditional food that reflects our culture.", "आपली संस्कृती दर्शविणारे स्वादिष्ट पारंपरिक पदार्थ."), imageId: PH + "vil-culture-4.webp" },
        ],
      },
    },
    {
      sectionKey: "homestay",
      sortOrder: 40,
      data: {
        heading: b("Homestay in Savardari", "सावरदरीतील होमस्टे"),
        description: b("Experience the warmth of rural hospitality. Stay with local families and enjoy the simple, peaceful village life.", "ग्रामीण आदरातिथ्याची उब अनुभवा. स्थानिक कुटुंबांसोबत राहा आणि साध्या, शांत ग्रामीण जीवनाचा आनंद घ्या."),
        buttonLabel: b("View Homestay Options", "होमस्टे पर्याय पहा"),
        buttonLink: "page:contact",
        imageId: PH + "vil-homestay.webp",
        features: [
          { icon: "house", title: b("Comfortable Rooms", "आरामदायी खोल्या") },
          { icon: "wheat", title: b("Home-cooked Meals", "घरगुती जेवण") },
          { icon: "star", title: b("Cultural Experience", "सांस्कृतिक अनुभव") },
          { icon: "map", title: b("Guided Village Tours", "मार्गदर्शित गाव फेरी") },
        ],
      },
    },
    {
      sectionKey: "leader-cards",
      sortOrder: 60,
      data: {
        items: [
          { photoId: PH + "vil-leader-1.webp", name: b("Shri. Vishwanathrao Deshmukh", "श्री. विश्वनाथराव देशमुख"), designation: b("Freedom Fighter", "स्वातंत्र्य सैनिक"), description: b("Played an important role in India's independence movement.", "भारताच्या स्वातंत्र्य चळवळीत महत्त्वाची भूमिका बजावली.") },
          { photoId: PH + "vil-leader-2.webp", name: b("Dr. Shankar Rao", "डॉ. शंकर राव"), designation: b("Eminent Educationist", "ख्यातनाम शिक्षणतज्ज्ञ"), description: b("Dedicated his life to improving education in rural areas.", "ग्रामीण भागातील शिक्षण सुधारण्यासाठी आयुष्य समर्पित केले.") },
          { photoId: PH + "vil-leader-3.webp", name: b("Smt. Anjali Tai Wankhade", "सौ. अंजलीताई वानखडे"), designation: b("Social Worker", "समाजसेविका"), description: b("Working for women empowerment and community development.", "महिला सक्षमीकरण व सामुदायिक विकासासाठी कार्यरत.") },
          { photoId: PH + "vil-leader-4.webp", name: b("Shri. Madhavrao Ingle", "श्री. माधवराव इंगळे"), designation: b("Folk Artist", "लोककलाकार"), description: b("Preserving and promoting traditional art and culture.", "पारंपरिक कला व संस्कृतीचे जतन व संवर्धन.") },
        ],
      },
    },
    {
      // The "Voice of the Village" video card is left out: there is no real video yet.
      sectionKey: "fpo-gallery-voice",
      sortOrder: 70,
      data: {
        enabled: true,
        fpo: {
          iconId: PH + "vil-fpo-logo.webp",
          title: b("Farmer Producer Organization (FPO)", "शेतकरी उत्पादक संस्था (FPO)"),
          description: b("Savardari FPO empowers farmers by collectivizing resources, improving market access, and increasing income.", "सावरदरी FPO संसाधने एकत्र करून, बाजारपेठेपर्यंत पोहोच सुधारून आणि उत्पन्न वाढवून शेतकऱ्यांना सक्षम करते."),
          points: [b("Better Market Linkage", "उत्तम बाजार जोडणी"), b("Quality Inputs & Services", "दर्जेदार निविष्ठा व सेवा"), b("Training & Capacity Building", "प्रशिक्षण व क्षमता वाढ"), b("Sustainable Farming", "शाश्वत शेती")],
        },
        gallery: {
          title: b("Virtual Gallery", "आभासी दालन"),
          description: b("Explore historical photos and memories of our village.", "आपल्या गावाची ऐतिहासिक छायाचित्रे व आठवणी पाहा."),
          imageIds: [1, 2, 3, 4].map((n) => `${PH}vil-gallery-${n}.webp`),
        },
      },
    },
    {
      sectionKey: "success-stories",
      sortOrder: 80,
      data: {
        items: [
          { imageId: PH + "vil-story-1.webp", title: b("From Farmer to Entrepreneur", "शेतकऱ्यापासून उद्योजकापर्यंत"), description: b("Ramesh transformed his farm into a successful organic farming business and inspires many.", "रमेश यांनी आपल्या शेतीचे रूपांतर यशस्वी सेंद्रिय शेती व्यवसायात केले आणि अनेकांना प्रेरणा दिली."), buttonText: b("Read Story", "कथा वाचा"), buttonLink: "page:culture", order: 1 },
          { imageId: PH + "vil-story-2.webp", title: b("Empowering Rural Women", "ग्रामीण महिलांचे सक्षमीकरण"), description: b("The SHG women of Savardari are creating handmade products and earning with pride.", "सावरदरीतील बचत गटाच्या महिला हस्तनिर्मित वस्तू बनवून अभिमानाने कमाई करतात."), buttonText: b("Read Story", "कथा वाचा"), buttonLink: "page:culture", order: 2 },
          { imageId: PH + "vil-story-3.webp", title: b("Youth Making a Difference", "बदल घडविणारे युवक"), description: b("Local youth are using digital skills to build careers and support the village.", "स्थानिक युवक डिजिटल कौशल्यांतून करिअर घडवून गावाला हातभार लावत आहेत."), buttonText: b("Read Story", "कथा वाचा"), buttonLink: "page:culture", order: 3 },
          { imageId: PH + "vil-story-4.webp", title: b("Preserving Our Heritage", "आपला वारसा जपताना"), description: b("Our community is working together to preserve our culture for future generations.", "आपला समाज पुढील पिढ्यांसाठी संस्कृती जपण्यासाठी एकत्र काम करत आहे."), buttonText: b("Read Story", "कथा वाचा"), buttonLink: "page:culture", order: 4 },
        ],
      },
    },
  ],
};
