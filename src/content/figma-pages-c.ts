/**
 * PLACEHOLDER CONTENT — Employment, Education, Environment and Gallery pages from the Figma file
 * (qBVt7yv0KG41onObVWfnP1). Same rules as figma-pages.ts: used only where the backend has no
 * published section for the key; delete a page's entry once real content is loaded. Pictures are
 * the Figma frames saved under public/images/figma/pages.
 */
import type { PageKey } from "@/config/pages";
import type { FallbackSection } from "./fallback";

const t = (en: string) => ({ en });
/** Bilingual text with an explicit Marathi translation. */
const b = (en: string, mr: string) => ({ en, mr });
const P = "/images/figma/pages/";
const PH = "/images/figma/photos/";
const hero = (data: Record<string, unknown>): FallbackSection => ({ sectionKey: "page-hero", sortOrder: 0, data: { noTenantName: true, ...data } });

/**
 * "View Details" targets of the Environment initiative cards, in card order (placeholder-only: the
 * backend item has no link field yet). Cards without their own section on the page lead to the photo
 * gallery, where the works are shown.
 */
const INITIATIVE_LINKS = [
  "page:environment#tree-adoption",
  "page:gallery#photo-gallery",
  "page:gallery#photo-gallery",
  "page:gallery#photo-gallery",
  "page:gallery#photo-gallery",
  "page:gallery#photo-gallery",
  "page:gallery#photo-gallery",
  "page:environment#weather-update",
  "page:environment#market-prices",
];


export const FIGMA_PAGE_SECTIONS_C: Partial<Record<PageKey, FallbackSection[]>> = {
  schemes: [
    hero({
      eyebrow: t("Government Schemes & Beneficiary Information"),
      title: t("Empowering Lives. Building a Better"),
      titleAccent: t("Savardari."),
      titleLines: true,
      body: t("Explore government schemes and their benefits. Check eligibility, apply online and track your application status"),
      imageUrl: P + "sch-hero-torn.png",
      imageBleed: { left: 553, width: 887, height: 532 },
    }),
    {
      sectionKey: "scheme-levels",
      sortOrder: 5,
      data: {
        items: [
          { level: "CENTRAL", label: t("Central Government Schemes"), count: 48, iconUrl: P + "sch-level-1.png" },
          { level: "STATE", label: t("State Government Schemes"), count: 36, iconUrl: P + "sch-level-2.png" },
          { level: "DISTRICT", label: t("District Level Schemes"), count: 22, iconUrl: P + "sch-level-3.png" },
        ],
      },
    },
    {
      sectionKey: "scheme-showcase",
      sortOrder: 10,
      data: {
        heading: t("Featured Schemes"),
        benefitsLabel: t("Benefits"),
        items: [
          { name: t("Pradhan Mantri Awas Yojana"), category: t("Housing"), level: t("Central"), description: t("Provides pucca houses to homeless families"), benefitValue: t("₹1.20 Lakh"), benefitCaption: t("Financial Assistance") },
          { name: t("MGNREGA"), category: t("Employment"), level: t("Central"), description: t("Provides 100 days of wage employment in a financial year"), benefitValue: t("₹221/Day"), benefitCaption: t("Wage rate") },
          { name: t("PM Kisan Samman Nidhi"), category: t("Agriculture"), level: t("Central"), description: t("Financial Support to small and marginal farmers"), benefitValue: t("₹6000/Year"), benefitCaption: t("Direct Bank Transfer") },
          { name: t("Mukhyamantri Uddhav Balasaheb Thackeray Awas Yojana"), category: t("Housing"), level: t("State"), description: t("Provides houses to eligible beneficiaries in Maharashtra"), benefitValue: t("₹1.50 Lakh"), benefitCaption: t("Financial Assistance") },
          { name: t("Social Justice Scholarship"), category: t("Education"), level: t("State"), description: t("Scholarships for students from backward classes"), benefitValue: t("Up to ₹75,000"), benefitCaption: t("Scholarship Amount") },
        ],
        viewAll: { label: t("View All Schemes"), href: "page:schemes#scheme-levels" },
        detailsHref: "page:schemes#link-cards",
      },
    },
    {
      sectionKey: "link-cards",
      sortOrder: 20,
      data: {
        heading: b("Scheme Information", "योजनेची माहिती"),
        layout: "list",
        items: [
          { title: b("Purpose of the Scheme", "योजनेचा उद्देश"), body: b("Understand the objective and goals", "उद्दिष्ट व ध्येये समजून घ्या"), cta: b("Know More", "अधिक जाणून घ्या"), href: "page:schemes#scheme-showcase", iconUrl: P + "sch-info-1.png" },
          { title: b("Eligibility Criteria", "पात्रतेचे निकष"), body: b("Check if you are eligible", "आपण पात्र आहात का ते तपासा"), cta: b("Know More", "अधिक जाणून घ्या"), href: "page:schemes#scheme-showcase", iconUrl: P + "sch-info-2.png" },
          { title: b("Application Procedure", "अर्जाची प्रक्रिया"), body: b("Step-by-step application process", "टप्प्याटप्प्याने अर्ज प्रक्रिया"), cta: b("Know More", "अधिक जाणून घ्या"), href: "page:services#rts-grid", iconUrl: P + "sch-info-3.png" },
          { title: b("Required Documents", "आवश्यक कागदपत्रे"), body: b("Documents required to apply", "अर्जासाठी लागणारी कागदपत्रे"), cta: b("Know More", "अधिक जाणून घ्या"), href: "page:announcements#deadlines-downloads", iconUrl: P + "sch-info-4.png" },
          { title: b("Benefits of the Scheme", "योजनेचे लाभ"), body: b("Know the benefits you will receive", "आपल्याला मिळणारे लाभ जाणून घ्या"), cta: b("Know More", "अधिक जाणून घ्या"), href: "page:schemes#live-stats", iconUrl: P + "sch-info-5.png" },
        ],
      },
    },
    {
      sectionKey: "coverage-map",
      sortOrder: 25,
      data: {
        heading: b("Scheme Coverage Map", "योजना व्याप्ती नकाशा"),
        subheading: b("Ward-wise coverage of beneficiaries for major government schemes", "प्रमुख शासकीय योजनांच्या लाभार्थ्यांची प्रभागनिहाय व्याप्ती"),
        mapImageId: P + "sch-coverage-map.png",
        wards: [
          { wardNo: "1", households: 210, beneficiaries: 540 },
          { wardNo: "2", households: 96, beneficiaries: 240 },
          { wardNo: "3", households: 28, beneficiaries: 70 },
          { wardNo: "4", households: 54, beneficiaries: 130 },
          { wardNo: "5", households: 150, beneficiaries: 380 },
        ],
      },
    },
    // These totals are live where the backend can compute them and sample figures otherwise.
    {
      sectionKey: "live-stats",
      sortOrder: 30,
      data: {
        source: "schemes",
        variant: "card",
        items: [
          { live: "totalSchemes", icon: "building", iconUrl: P + "sch-stat-1.png", title: b("Total Schemes", "एकूण योजना"), value: "106", description: b("All Government Schemes", "सर्व शासकीय योजना"), background: "#E8F1EA", visible: true },
          { live: "totalBeneficiaries", icon: "users", iconUrl: P + "sch-stat-2.png", title: b("Total Beneficiaries", "एकूण लाभार्थी"), value: "2,845", description: b("In Savardari Village", "सावरदरी गावात"), background: "#E8F1EA", visible: true },
          { live: "amountDisbursedThisFinancialYear", format: "money", icon: "rupee", iconUrl: P + "sch-stat-3.png", title: b("Total Amount Disbursed", "एकूण वितरित रक्कम"), value: "₹ 8.45 Cr", description: b("This Financial Year", "या आर्थिक वर्षात"), background: "#E8F1EA", visible: true },
          { live: "coveragePercent", format: "percent", icon: "shield", iconUrl: P + "sch-stat-4.png", title: b("Coverage", "व्याप्ती"), value: "87%", description: b("Households Covered", "कुटुंबे समाविष्ट"), background: "#E8F1EA", visible: true },
        ],
      },
    },
    {
      sectionKey: "success-stories",
      sortOrder: 40,
      data: {
        layout: "quote",
        heading: b("Success Stories", "यशोगाथा"),
        subheading: b("Real stories of beneficiaries whose lives have been transformed by government schemes.", "शासकीय योजनांमुळे जीवन बदललेल्या लाभार्थ्यांच्या खऱ्या कथा."),
        items: [
          { imageId: PH + "sch-story-1.webp", title: b("PM Awas Yojana gave me a home of my own.", "प्रधानमंत्री आवास योजनेने मला स्वतःचे घर दिले."), description: b("I am very thankful to the government for providing affordable housing and a better future for my children.", "परवडणारे घर आणि माझ्या मुलांसाठी चांगले भविष्य दिल्याबद्दल मी शासनाची आभारी आहे."), name: b("Sunita Vishwakarma", "सुनीता विश्वकर्मा"), ward: b("Ward No. 3", "प्रभाग क्र. ३"), tag: b("PM Awas Yojana", "प्रधानमंत्री आवास योजना"), order: 1 },
          { imageId: PH + "sch-story-2.webp", title: b("PM-KISAN provided regular income & financial security.", "पीएम-किसानने नियमित उत्पन्न व आर्थिक सुरक्षा दिली."), description: b("It helps me support my family and manage farm expenses during difficult times.", "कठीण काळात कुटुंबाला आधार देण्यास व शेतीचा खर्च भागविण्यास हे मदत करते."), name: b("Ramesh Kumar", "रमेश कुमार"), ward: b("Ward No. 2", "प्रभाग क्र. २"), tag: b("PM-KISAN", "पीएम-किसान"), order: 2 },
          { imageId: PH + "sch-story-3.webp", title: b("PM Kisan Samman Nidhi is a great support.", "पीएम किसान सन्मान निधी मोठा आधार आहे."), description: b("The amount helps me in buying seeds and fertilizers for my farm.", "या रकमेतून मला शेतीसाठी बियाणे व खते घेता येतात."), name: b("Vithal Kale", "विठ्ठल काळे"), ward: b("Ward No. 1", "प्रभाग क्र. १"), tag: b("PM Kisan Samman Nidhi", "पीएम किसान सन्मान निधी"), order: 3 },
          { imageId: PH + "sch-story-4.webp", title: b("Scholarship Scheme helped me continue my education.", "शिष्यवृत्ती योजनेमुळे मला शिक्षण सुरू ठेवता आले."), description: b("It has been a huge support in achieving my dreams.", "माझी स्वप्ने पूर्ण करण्यात हा मोठा आधार ठरला."), name: b("Anjali Patil", "अंजली पाटील"), ward: b("Ward No. 4", "प्रभाग क्र. ४"), tag: b("Social Justice Scholarship", "सामाजिक न्याय शिष्यवृत्ती"), order: 4 },
        ],
      },
    },
    {
      sectionKey: "service-strip",
      sortOrder: 50,
      data: {
        spaceAfter: 29,
        items: [
          { label: b("Check Application Status", "अर्जाची स्थिती तपासा"), caption: b("Track your applications", "आपल्या अर्जांचा मागोवा घ्या"), href: "page:grievance#grievance-track", iconUrl: P + "sch-svc-1.png" },
          { label: b("Apply Online", "ऑनलाइन अर्ज करा"), caption: b("Apply for schemes", "योजनांसाठी अर्ज करा"), href: "page:services", iconUrl: P + "sch-svc-2.png" },
          { label: b("Download Forms", "अर्ज डाउनलोड करा"), caption: b("Get application forms", "अर्जाचे नमुने मिळवा"), href: "page:announcements", iconUrl: P + "sch-svc-3.png" },
          { label: b("Grievance Redressal", "तक्रार निवारण"), caption: b("Lodge a complaint", "तक्रार नोंदवा"), href: "page:grievance", iconUrl: P + "sch-svc-4.png" },
          { label: b("Helpline Support", "हेल्पलाइन सहाय्य"), caption: b("Get help & support", "मदत व सहाय्य मिळवा"), href: "page:contact", iconUrl: P + "sch-svc-5.png" },
        ],
      },
    },
  ],

  contact: [
    hero({
      eyebrow: t("Contact & Collaboration"),
      title: t("Let’s Build a Stronger Savardari Together"),
      titleParts: [{ text: b("Let’s Build a Stronger", "चला, एकत्र मिळून अधिक सक्षम") }, { text: b("Savardari", "सवरदरी"), accent: true }, { text: b("Together", "घडवूया") }],
      titleLarge: true,
      imageBleed: { left: 553, width: 887, height: 538, textBox: 538 },
      body: t("We welcome your feedback, suggestions, and collaboration to make our village better, stronger, and more sustainable"),
      actions: [
        { label: t("Become a Volunteer"), href: "page:contact#volunteer-registration" },
        { label: t("Send Feedback"), href: "page:contact#feedback-form" },
      ],
      imageUrl: P + "con-hero-torn.png",
    }),
    {
      sectionKey: "callout",
      sortOrder: 5,
      data: {
        text: t("We believe in people’s participation, strong partnerships, and transparent communication for inclusive and sustainable village development"),
      },
    },
    {
      sectionKey: "contact-cards-figma",
      sortOrder: 10,
      data: {
        heading: t("Contact Information"),
        phone: "+919767694340",
        email: "savardarigrampanchayat@gmail.com",
        address: t("Gram Panchayat: Savardari, Taluka: Khed, District: Pune – 410501"),
        hours: t("Monday to Friday: 9:45 am to 6:15 pm\nWeekends and Sundays: Closed"),
        labels: { inquiries: t("General Inquiries"), hours: t("Office Hours"), address: t("Office Address"), follow: t("Follow Us") },
      },
    },
    {
      // Map address: the placeholder points at the village's search result until the real embed link is published.
      sectionKey: "office-location",
      sortOrder: 20,
      data: {
        title: b("Our Office Location", "आमचे कार्यालय स्थान"),
        address: b("Gram Panchayat: Savardari, Taluka: Khed, District: Pune – 410501", "ग्रामपंचायत: सावरदरी, तालुका: खेड, जिल्हा: पुणे – ४१०५०१"),
        // The final embed address (maps.google.com/maps?…&output=embed redirects here with a SAMEORIGIN redirect response).
        mapEmbedUrl: "https://www.google.com/maps/embed?origin=mfe&pb=!1m2!2m1!1sSavardari,+Khed,+Pune",
      },
    },
    {
      sectionKey: "feedback-form",
      sortOrder: 21,
      data: {
        enabled: true,
        showOnWebsite: true,
        heading: b("Send Us Your Feedback", "आम्हाला आपला अभिप्राय पाठवा"),
        recipientEmail: "savardarigrampanchayat@gmail.com",
        submitButtonText: b("Submit Feedback", "अभिप्राय पाठवा"),
      },
    },
    {
      sectionKey: "partners",
      sortOrder: 30,
      data: {
        items: [
          { logoId: PH + "con-partner-icon-1.webp", title: b("HCD Partners", "HCD भागीदार"), description: b("Strategic HCD partners for execution, health, water and livelihood initiatives", "अंमलबजावणी, आरोग्य, पाणी व उपजीविका उपक्रमांसाठी धोरणात्मक HCD भागीदार"), partnerLogoIds: ["con-logo-1a", "con-logo-1b", "con-logo-1c"].map((n) => `${PH}${n}.webp`) },
          { logoId: PH + "con-partner-icon-2.webp", title: b("CSR Partners & Donors", "CSR भागीदार व देणगीदार"), description: b("Support from corporates for sustainable development and community impact", "शाश्वत विकास व सामुदायिक परिणामासाठी कंपन्यांचे सहाय्य"), partnerLogoIds: ["con-logo-2a", "con-logo-2b", "con-logo-2c"].map((n) => `${PH}${n}.webp`) },
          { logoId: PH + "con-partner-icon-3.webp", title: b("Government Engagements", "शासकीय सहभाग"), description: b("Collaborations with government programs and stakeholders for local impact", "स्थानिक परिणामासाठी शासकीय कार्यक्रम व भागधारकांसोबत सहयोग"), partnerLogoIds: ["con-logo-3a", "con-logo-3b", "con-logo-3c"].map((n) => `${PH}${n}.webp`) },
        ],
      },
    },
    {
      sectionKey: "volunteer-categories",
      sortOrder: 40,
      data: {
        items: [
          { title: b("Youth Volunteers", "युवा स्वयंसेवक"), description: b("Energetic youth can contribute in education, cleanliness, and awareness drives.", "उत्साही युवक शिक्षण, स्वच्छता आणि जनजागृती मोहिमांमध्ये योगदान देऊ शकतात."), order: 1 },
          { title: b("NGOs", "स्वयंसेवी संस्था"), description: b("NGOs can partner with us for community development programs.", "स्वयंसेवी संस्था सामुदायिक विकास कार्यक्रमांसाठी आमच्यासोबत भागीदार होऊ शकतात."), order: 2 },
          { title: b("Social Organizations", "सामाजिक संस्था"), description: b("Work together on social welfare, health, and rural development initiatives.", "सामाजिक कल्याण, आरोग्य आणि ग्रामीण विकास उपक्रमांमध्ये एकत्र काम करा."), order: 3 },
          { title: b("Citizen Volunteers", "नागरिक स्वयंसेवक"), description: b("Every citizen can play a role in building a better and stronger Savardari.", "चांगली आणि मजबूत सावरदरी घडवण्यात प्रत्येक नागरिक भूमिका बजावू शकतो."), order: 4 },
        ],
      },
    },
    {
      sectionKey: "volunteer-registration",
      sortOrder: 45,
      data: {
        enabled: true,
        showOnWebsite: true,
        heading: b("Become a Volunteer", "स्वयंसेवक व्हा"),
        description: b("Join hand with us and contribute towards the development of Savardari", "आमच्यासोबत सहभागी व्हा आणि सावरदरीच्या विकासात योगदान द्या"),
        recipientEmail: "savardarigrampanchayat@gmail.com",
        submitButtonText: b("Register Now", "आता नोंदणी करा"),
      },
    },
  ],

  grievance: [
    hero({
      eyebrow: t("Grievance Redressal & Citizen Feedback"),
      title: t("Your Voice, Our Commitment to Better Savardari"),
      // Figma: eyebrow in title case; "Savardari" in green.
      titleParts: [{ text: b("Your Voice, Our Commitment to Better", "तुमचा आवाज, उत्तम") }, { text: b("Savardari", "सवरदरीसाठी"), accent: true }, { text: b("", "आमची बांधिलकी") }],
      eyebrowAsTyped: true,
      imageBleed: { left: 553, width: 887, height: 539 },
      body: t("We are here to listen and act. Register your complaints, track status, share suggestions, and help us build a transparent and responsive Savardari"),
      actions: [
        { label: t("Register a Complaint"), href: "page:grievance#grievance-register" },
        { label: t("Track Complaint Status"), href: "page:grievance#grievance-track" },
      ],
      imageUrl: P + "gri-hero-torn.png",
    }),
    {
      sectionKey: "callout",
      sortOrder: 5,
      data: {
        text: t("Your feedback and suggestions help us improve services and develop a better Savardari for everyone. Together, we can build a stronger and more prosperous Savardari"),
        highlight: t("stronger and more prosperous Savardari"),
      },
    },
    // Real form: category, name, phone, email, description. The design also shows type, subject,
    // location and an attachment; those fields are not in the backend contract yet.
    { sectionKey: "grievance-register", sortOrder: 10, data: { heading: t("Register Your Complaint") } },
    {
      sectionKey: "support-cards",
      sortOrder: 20,
      data: {
        items: [
          { icon: "headset", title: b("Toll-Free Helpline", "टोल-फ्री हेल्पलाइन"), contactOrAction: "1800 123 6789", description: b("Mon - Sat: 10:30 AM - 5:00 PM", "सोम - शनि: सकाळी १०:३० - सायं. ५:००"), visible: true },
          { icon: "whatsapp", title: b("WhatsApp Support", "व्हॉट्सअॅप सहाय्य"), contactOrAction: "+91 98765 43210", description: b("Chat with us on WhatsApp", "व्हॉट्सअॅपवर आमच्याशी बोला"), visible: true },
          { icon: "bot", title: b("WhatsApp Chatbot", "व्हॉट्सअॅप चॅटबॉट"), contactOrAction: b("24/7 Assistance", "२४/७ सहाय्य") , description: b("Get instant answers", "तात्काळ उत्तरे मिळवा"), visible: true },
          // `link` is placeholder-only (the backend card has no link field); the helpline and WhatsApp cards
          // get tel: / wa.me links from their numbers in the renderer.
          { icon: "mail", title: b("Suggestion Box", "सूचना पेटी"), contactOrAction: b("Share your ideas", "आपल्या कल्पना सांगा"), description: b("Help us improve", "आम्हाला सुधारण्यास मदत करा"), link: "page:contact#feedback-form", visible: true },
          { icon: "file", title: b("Feedback Form", "अभिप्राय अर्ज"), contactOrAction: b("Your feedback matters", "आपला अभिप्राय महत्त्वाचा"), description: b("Tell us your experience", "आपला अनुभव सांगा"), link: "page:contact#feedback-form", visible: true },
        ],
        variant: "contact",
      },
    },
    {
      sectionKey: "grievance-track",
      sortOrder: 30,
      data: {
        heading: t("Track Your Complaint"),
        howTitle: b("How It Works?", "हे कसे चालते?"),
        howSteps: [
          b("Register your complaint online.", "आपली तक्रार ऑनलाइन नोंदवा."),
          b("Receive a unique Complaint ID.", "विशिष्ट तक्रार क्रमांक मिळवा."),
          // The design says "Complaint ID / Mobile Number"; the tracking API accepts the complaint ID only.
          b("Track the status using your Complaint ID.", "तक्रार क्रमांकाने स्थिती तपासा."),
          b("Get updates on resolution.", "निराकरणाबाबत अद्यतने मिळवा."),
        ],
      },
    },
    // Figures come from the complaints database (GET /public/:slug/stats/grievances).
    {
      sectionKey: "monthly-report",
      sortOrder: 50,
      data: { heading: b("Monthly Performance Report", "मासिक कामगिरी अहवाल") },
    },
    {
      sectionKey: "escalation-matrix",
      sortOrder: 40,
      data: {
        steps: [
          { title: b("Complaint Registered", "तक्रार नोंदवली"), description: b("Complaint submitted by citizen", "नागरिकाने तक्रार सादर केली") },
          { title: b("Verification", "पडताळणी"), description: b("Complaint is verified by assigned officer", "नेमलेल्या अधिकाऱ्याकडून तक्रारीची पडताळणी") },
          { title: b("In-Progress", "प्रक्रियेत"), description: b("Action is taken and being processed", "कार्यवाही सुरू आहे") },
          { title: b("Escalation", "वरिष्ठांकडे पाठवणी"), description: b("Escalated to higher authority if required", "आवश्यक असल्यास वरिष्ठ प्राधिकरणाकडे पाठवले जाते") },
          { title: b("Resolved", "निराकरण झाले"), description: b("Complaint resolved & citizen notified", "तक्रारीचे निराकरण व नागरिकाला सूचना") },
        ],
      },
    },
  ],

  employment: [
    hero({
      eyebrow: t("Employment & Skill Development"),
      title: t("Creating Opportunities, Empowering Lives in Savardari"),
      // Figma: "Empowering Lives" and "Savardari" in green; cut-out photo at x=553, 887×539, to the right edge.
      titleParts: [{ text: b("Creating Opportunities,", "संधी निर्माण करणे,") }, { text: b("Empowering Lives", "सवरदरीतील जीवन सक्षम करणे"), accent: true }, { text: b("in", "") }, { text: b("Savardari", ""), accent: true }],
      imageBleed: { left: 553, width: 887, height: 539 },
      body: t("Explore job opportunities, skill development programs, local talent, and resources that help our community grow and prosper"),
      actions: [
        { label: t("View Opportunities"), href: "page:employment#local-opportunities" },
        { label: t("Village Talent Directory"), href: "page:employment#skill-directory" },
      ],
      imageUrl: P + "emp-hero-torn.png",
    }),
    {
      // Figma: one white strip overlapping the hero; each tile jumps to its block on this page.
      sectionKey: "support-cards",
      sortOrder: 5,
      data: {
        layout: "strip",
        items: [
          { icon: "briefcase", iconImage: P + "emp-strip-0.png", title: b("Local Employment", "स्थानिक रोजगार"), description: b("Find jobs & work opportunities", "नोकरी व कामाच्या संधी शोधा"), link: "page:employment#local-opportunities", visible: true },
          { icon: "file", iconImage: P + "emp-strip-1.png", title: b("Government Tenders", "शासकीय निविदा"), description: b("Tenders & contract opportunities", "निविदा व कंत्राटाच्या संधी"), link: "page:employment#local-opportunities", visible: true },
          { icon: "users", iconImage: P + "emp-strip-2.png", title: b("SHGs & MSMEs", "बचत गट व लघुउद्योग"), description: b("Support for Self-Help Groups & Businesses", "बचत गट व व्यवसायांना सहाय्य"), link: "page:employment#skill-directory", visible: true },
          { icon: "education", iconImage: P + "emp-strip-3.png", title: b("Training Programs", "प्रशिक्षण कार्यक्रम"), description: b("Skill development & youth training", "कौशल्य विकास व युवा प्रशिक्षण"), link: "page:employment#training-programs", visible: true },
          { icon: "monitor", iconImage: P + "emp-strip-4.png", title: b("Digital Literacy", "डिजिटल साक्षरता"), description: b("Digital literacy campaigns", "डिजिटल साक्षरता मोहिमा"), link: "page:employment#training-programs", visible: true },
          { icon: "link", iconImage: P + "emp-strip-5.png", title: b("Govt. Job Portals", "शासकीय रोजगार पोर्टल"), description: b("Access government employment portals", "शासकीय रोजगार पोर्टलवर जा"), link: "page:employment#gov-job-portals", visible: true },
        ],
      },
    },
    {
      sectionKey: "local-opportunities",
      sortOrder: 10,
      data: {
        heading: b("Local Opportunities", "स्थानिक संधी"),
        items: [
          { icon: "file", iconImage: P + "emp-opp-0.png", colour: "#138808", contactOrAction: "128", title: b("Active Job Openings", "सक्रिय रोजगार संधी"), description: b("Updated this week", "या आठवड्यात अद्ययावत"), visible: true },
          { icon: "briefcase", iconImage: P + "emp-opp-1.png", colour: "#6d3fc0", contactOrAction: "42", title: b("Private Sector Jobs", "खाजगी क्षेत्रातील नोकऱ्या"), description: b("Multiple locations", "विविध ठिकाणी"), visible: true },
          { icon: "handshake", iconImage: P + "emp-opp-2.png", colour: "#1a62e0", contactOrAction: "16", title: b("Apprenticeship Program", "शिकाऊ उमेदवारी कार्यक्रम"), description: b("For skill development", "कौशल्य विकासासाठी"), visible: true },
          { icon: "megaphone", iconImage: P + "emp-opp-3.png", colour: "#f5871f", contactOrAction: "21", title: b("Contract Opportunities", "कंत्राटी संधी"), description: b("Apply for local tenders", "स्थानिक निविदांसाठी अर्ज करा"), visible: true },
        ],
        // No job listing page yet: the government job portals below list the openings.
        viewAll: { label: b("View All Opportunities", "सर्व संधी पहा"), href: "page:employment#gov-job-portals" },
      },
    },
    {
      sectionKey: "skill-directory",
      sortOrder: 20,
      data: {
        heading: b("Village Talent Directory", "गाव कौशल्य निर्देशिका"),
        subheading: b("Find skilled professionals in our village for your needs", "आपल्या गरजांसाठी गावातील कुशल व्यावसायिक शोधा"),
        items: [
          { icon: "zap", iconImage: P + "emp-skill-0.png", skillName: b("Electricians", "इलेक्ट्रिशियन"), availableCount: 18, countIsApproximate: false, active: true },
          { icon: "droplets", iconImage: P + "emp-skill-1.png", skillName: b("Plumbers", "प्लंबर"), availableCount: 12, countIsApproximate: false, active: true },
          { icon: "hammer", iconImage: P + "emp-skill-2.png", skillName: b("Carpenters", "सुतार"), availableCount: 15, countIsApproximate: false, active: true },
          { icon: "star", iconImage: P + "emp-skill-3.png", skillName: b("Tailors", "शिंपी"), availableCount: 20, countIsApproximate: false, active: true },
          { icon: "wrench", iconImage: P + "emp-skill-4.png", skillName: b("Mechanics", "मेकॅनिक"), availableCount: 10, countIsApproximate: false, active: true },
          { icon: "building", iconImage: P + "emp-skill-5.png", skillName: b("Masons", "गवंडी"), availableCount: 14, countIsApproximate: false, active: true },
          { icon: "lightbulb", iconImage: P + "emp-skill-6.png", skillName: b("Painters", "रंगारी"), availableCount: 11, countIsApproximate: false, active: true },
          // No full directory page yet: the Panchayat office keeps the list (Contact page).
          { icon: "users", iconImage: P + "emp-skill-7.png", skillName: b("More Skills", "इतर कौशल्ये"), link: "page:contact", active: true },
        ],
        viewAll: { label: b("View Full Directory", "संपूर्ण निर्देशिका पहा"), href: "page:contact" },
      },
    },
    {
      sectionKey: "assistance-items",
      sortOrder: 25,
      data: {
        heading: b("Farmer Assistance Centre", "शेतकरी सहाय्य केंद्र"),
        subheading: b("Important information & resources for farmers.", "शेतकऱ्यांसाठी महत्त्वाची माहिती व साधने."),
        items: [
          { icon: "rain", iconImage: P + "emp-farm-0.png", colour: "#f5871f", title: b("Daily Crop Market Prices", "दैनंदिन पीक बाजारभाव"), description: b("Check latest market rates in your region", "आपल्या भागातील ताजे बाजारभाव पहा"), link: "page:environment#market-prices", active: true },
          { icon: "sprout", iconImage: P + "emp-farm-1.png", colour: "#1a62e0", title: b("Fertilizer Availability", "खतांची उपलब्धता"), description: b("Find fertilizers near to your location", "जवळपास उपलब्ध खते शोधा"), link: "page:services", active: true },
          { icon: "wheat", iconImage: P + "emp-farm-2.png", colour: "#3f9b2f", title: b("Agricultural Advisory", "कृषी सल्ला"), description: b("Expert advice for better farming", "चांगल्या शेतीसाठी तज्ज्ञ सल्ला"), link: "page:services", active: true },
          { icon: "cloud", iconImage: P + "emp-farm-3.png", colour: "#6d3fc0", title: b("Weather Updates", "हवामान अद्यतन"), description: b("Get latest weather & forecast", "ताजे हवामान व अंदाज मिळवा"), link: "page:environment#weather-update", active: true },
          { icon: "megaphone", iconImage: P + "emp-farm-4.png", colour: "#f59e0b", title: b("Scheme Information", "योजनांची माहिती"), description: b("Latest schemes and market updates", "नवीन योजना व बाजार अद्यतने"), link: "page:schemes", active: true },
        ],
        viewAll: { label: b("Visit Farmer Assistance Center", "शेतकरी सहाय्य केंद्राला भेट द्या"), href: "page:services" },
      },
    },
    {
      sectionKey: "training-programs",
      sortOrder: 30,
      data: {
        heading: b("Training Programs & Digital Literacy", "प्रशिक्षण कार्यक्रम आणि डिजिटल साक्षरता"),
        items: [
          { thumbnailImageId: PH + "emp-train-1.webp", title: b("Skill Development Programs", "कौशल्य विकास कार्यक्रम"), shortDescription: b("Enhance your skills & build a better future", "कौशल्ये वाढवा आणि चांगले भविष्य घडवा"), ctaText: b("View Details", "तपशील पहा"), ctaLink: "page:contact", order: 1, status: "active", featured: false },
          { thumbnailImageId: PH + "emp-train-2.webp", title: b("Youth Training Programs", "युवा प्रशिक्षण कार्यक्रम"), shortDescription: b("Special training programs for youth", "युवकांसाठी विशेष प्रशिक्षण कार्यक्रम"), ctaText: b("View Details", "तपशील पहा"), ctaLink: "page:education#scheme-cards", order: 2, status: "active", featured: false },
          { thumbnailImageId: PH + "emp-train-3.webp", title: b("Digital Literacy Campaign", "डिजिटल साक्षरता मोहीम"), shortDescription: b("Learn digital skills for modern world", "आधुनिक जगासाठी डिजिटल कौशल्ये शिका"), ctaText: b("View Details", "तपशील पहा"), ctaLink: "page:services", order: 3, status: "active", featured: false },
          { thumbnailImageId: PH + "emp-train-4.webp", title: b("Entrepreneurship Development", "उद्योजकता विकास"), shortDescription: b("Start your own business with confidence", "आत्मविश्वासाने स्वतःचा व्यवसाय सुरू करा"), ctaText: b("View Details", "तपशील पहा"), ctaLink: "page:schemes", order: 4, status: "active", featured: false },
        ],
      },
    },
    {
      sectionKey: "job-portals",
      sortOrder: 35,
      data: {
        heading: b("Government Job Portals", "शासकीय रोजगार पोर्टल"),
        subheading: b("Access official government employment portals", "अधिकृत शासकीय रोजगार पोर्टल वापरा"),
        items: [
          { logoId: PH + "emp-portal-1.webp", name: b("National Career Service", "राष्ट्रीय करिअर सेवा"), description: b("Find government & private sector jobs", "शासकीय व खाजगी क्षेत्रातील नोकऱ्या शोधा"), websiteUrl: "https://www.ncs.gov.in", order: 1, active: true },
          { logoId: PH + "emp-portal-2.webp", name: b("Maharashtra Rojgar Portal", "महाराष्ट्र रोजगार पोर्टल"), description: b("Government of Maharashtra", "महाराष्ट्र शासन"), websiteUrl: "https://rojgar.mahaswayam.gov.in", order: 2, active: true },
          { logoId: PH + "emp-portal-3.webp", name: b("PM Kaushal Vikas Yojana", "पंतप्रधान कौशल्य विकास योजना"), description: b("Skill development & training", "कौशल्य विकास व प्रशिक्षण"), websiteUrl: "https://www.pmkvyofficial.org", order: 3, active: true },
          { logoId: PH + "emp-portal-4.webp", name: b("Apprenticeship India", "अप्रेंटिसशिप इंडिया"), description: b("Find apprenticeship opportunities", "शिकाऊ उमेदवारीच्या संधी शोधा"), websiteUrl: "https://www.apprenticeshipindia.gov.in", order: 4, active: true },
        ],
        // The National Career Service portal links every government job portal.
        viewAll: { label: b("View All Portals", "सर्व पोर्टल पहा"), href: "https://www.ncs.gov.in" },
      },
    },
    {
      sectionKey: "success-stories",
      sortOrder: 40,
      data: {
        heading: b("Success Stories of Savardari", "सावरदरीच्या यशोगाथा"),
        variant: "employment",
        // No story pages yet: "Read More" opens the story in a dialog; "View All" opens the stories list page.
        viewAll: { label: b("View All Success Stories", "सर्व यशोगाथा पहा"), href: "list:success-stories" },
        items: [
          { imageId: PH + "emp-story-1.webp", title: b("From Homemaker to Entrepreneur", "गृहिणीपासून उद्योजिकेपर्यंत"), description: b("Sunita Tai started a tailoring business with SHG support and now employs 15 women in the village.", "सुनीताताईंनी बचत गटाच्या मदतीने शिवणकाम व्यवसाय सुरू केला आणि आज गावातील १५ महिलांना रोजगार देतात."), buttonText: b("Read More", "अधिक वाचा"), order: 1 },
          { imageId: PH + "emp-story-2.webp", title: b("Skilled Youth, Bright Future", "कुशल युवक, उज्ज्वल भविष्य"), description: b("Rohit completed electrician training and now runs a successful electrical services business.", "रोहितने इलेक्ट्रिशियन प्रशिक्षण पूर्ण केले आणि आता तो यशस्वी विद्युत सेवा व्यवसाय चालवतो."), buttonText: b("Read More", "अधिक वाचा"), order: 2 },
          { imageId: PH + "emp-story-3.webp", title: b("Digital Skills, New Opportunities", "डिजिटल कौशल्ये, नव्या संधी"), description: b("Pooja learned digital marketing through our training program and now works as a freelancer.", "पूजाने आमच्या प्रशिक्षण कार्यक्रमातून डिजिटल मार्केटिंग शिकले आणि आता ती फ्रीलान्सर म्हणून काम करते."), buttonText: b("Read More", "अधिक वाचा"), order: 3 },
          { imageId: PH + "emp-story-4.webp", title: b("Modern Farming, Better Income", "आधुनिक शेती, चांगले उत्पन्न"), description: b("Ramesh adopted modern farming techniques and increased his income by 60% in one season.", "रमेश यांनी आधुनिक शेती तंत्रे अवलंबली आणि एका हंगामात उत्पन्न ६०% ने वाढवले."), buttonText: b("Read More", "अधिक वाचा"), order: 4 },
        ],
      },
    },
  ],

  education: [
    hero({
      eyebrow: t("Education & Youth Corner"),
      title: t("Empowering Minds, Building Futures in Savardari"),
      // Figma: only "Building Futures" in green.
      titleParts: [{ text: b("Empowering Minds,", "मने सक्षम करणे,") }, { text: b("Building Futures", "सवरदरीचे भविष्य घडवणे"), accent: true }, { text: b("in Savardari", "") }],
      imageBleed: { left: 553, width: 887, height: 539 },
      body: t("We are committed to quality education, skill development, and holistic growth of our youth to build a brighter and stronger Savardari"),
      imageUrl: P + "edu-hero-torn.png",
    }),
    {
      // Figma: one white strip overlapping the hero; each tile jumps to its block.
      sectionKey: "support-cards",
      sortOrder: 5,
      data: {
        layout: "strip",
        overlap: 111,
        iconSize: 92,
        spacious: true,
        items: [
          { icon: "school", iconImage: P + "edu-strip-0.png", title: b("Schools in Village", "गावातील शाळा"), description: b("Explore schools and education facilities", "शाळा व शैक्षणिक सुविधा जाणून घ्या"), link: "page:infrastructure#facility-grid", visible: true },
          { icon: "trophy", iconImage: P + "edu-strip-1.png", title: b("Student Achievements", "विद्यार्थ्यांचे यश"), description: b("Celebrating the success of our students", "आपल्या विद्यार्थ्यांच्या यशाचा गौरव"), link: "page:education#student-spotlight", visible: true },
          { icon: "education", iconImage: P + "edu-strip-2.png", title: b("Scholarship Schemes", "शिष्यवृत्ती योजना"), description: b("Find and apply for scholarships", "शिष्यवृत्ती शोधा व अर्ज करा"), link: "page:education#scheme-cards", visible: true },
          { icon: "compass", iconImage: P + "edu-strip-3.png", title: b("Career Guidance", "करिअर मार्गदर्शन"), description: b("Resources for a better career tomorrow", "उज्ज्वल करिअरसाठी साधने"), link: "page:education#scheme-cards", visible: true },
          { icon: "sports", iconImage: P + "edu-strip-4.png", title: b("Sports Activities", "क्रीडा उपक्रम"), description: b("Promoting sports and fitness", "खेळ व तंदुरुस्तीला प्रोत्साहन"), link: "page:education#youth-posts", visible: true },
          { icon: "nss", iconImage: P + "edu-strip-5.png", title: b("NSS Activities", "एनएसएस उपक्रम"), description: b("National Service Scheme & youth initiatives", "राष्ट्रीय सेवा योजना व युवा उपक्रम"), link: "page:education#youth-posts", visible: true },
        ],
      },
    },
    {
      // The design shows a sample student. The guardian-consent flag is set because this is placeholder
      // design content; real student spotlights need the guardian's consent recorded by the admin.
      sectionKey: "student-spotlight",
      sortOrder: 10,
      data: {
        photoId: PH + "edu-student.webp",
        name: b("Ananya Deshmukh", "अनन्या देशमुख"),
        classAndSchool: b("Class 10th | Zilla Parishad High School, Savardari", "इयत्ता १० वी | जिल्हा परिषद हायस्कूल, सावरदरी"),
        achievements: b("Secured 1st Rank in District with 95.6% in SSC Board Examination 2024", "एसएससी बोर्ड परीक्षा २०२४ मध्ये ९५.६ गुणांसह जिल्ह्यात प्रथम क्रमांक"),
        quote: b("Education is the most powerful weapon which you can use to change the world.", "शिक्षण हे जग बदलण्यासाठी वापरता येणारे सर्वात प्रभावी शस्त्र आहे."),
        buttonText: b("View All Students", "सर्व विद्यार्थी पहा"),
        // No "all students" page exists yet; the button leads to the youth posts below (see docs/backend-needs).
        buttonLink: "page:education#youth-posts",
        achievementCards: [
          { icon: "book", iconImage: P + "edu-stat-0.png", title: b("Academic Excellence", "शैक्षणिक प्रावीण्य"), value: "95.6%" },
          { icon: "sports", iconImage: P + "edu-stat-1.png", title: b("Sports Achievement", "क्रीडा कामगिरी"), value: b("State Level Runner", "राज्यस्तरीय धावपटू") },
          { icon: "users", iconImage: P + "edu-stat-2.png", title: b("Cultural Participation", "सांस्कृतिक सहभाग"), value: b("Active Participants", "सक्रिय सहभागी") },
          { icon: "target", iconImage: P + "edu-stat-3.png", title: b("Future Goal", "भविष्यातील ध्येय"), value: b("IAS Officer", "आयएएस अधिकारी") },
        ],
        guardianConsent: { confirmed: true, confirmedBy: "Design placeholder", confirmedAt: "2024-01-01T00:00:00.000Z" },
      },
    },
    {
      sectionKey: "youth-speak-tabs",
      sortOrder: 20,
      data: {
        items: [
          { tabKey: "blogs", name: b("Blogs", "ब्लॉग"), active: true },
          { tabKey: "videos", name: b("Videos", "व्हिडिओ"), active: true },
          { tabKey: "youtube", name: b("YouTube", "यूट्यूब"), active: true },
          { tabKey: "reels", name: b("Reels", "रील्स"), active: true },
          { tabKey: "ideas", name: b("Creative Ideas", "सर्जनशील कल्पना"), active: true },
        ],
      },
    },
    {
      // Figma shows one sample post per type (same picture, author and date); two pages of them so the
      // arrow and "View All Contribution" have something to show. Placeholder posts have no link yet.
      sectionKey: "youth-posts",
      sortOrder: 25,
      data: {
        items: [0, 1, 2, 3, 4, 5, 6, 7].map((i) => {
          const kind = (["blog", "youtube", "reel", "idea"] as const)[i % 4]!;
          return {
            tabKey: { blog: "blogs", youtube: "youtube", reel: "reels", idea: "ideas" }[kind],
            type: kind,
            title: b("Power of Education In Rural India", "ग्रामीण भारतातील शिक्षणाची ताकद"),
            coverImageId: PH + "edu-blog.webp",
            author: b("Rutuja Wankhade", "ऋतुजा वानखडे"),
            date: "2024-03-25",
          };
        }),
      },
    },
    {
      sectionKey: "scheme-cards",
      sortOrder: 30,
      data: {
        heading: b("Schemes & Opportunities for Youth", "युवकांसाठी योजना आणि संधी"),
        items: [
          { icon: "education", title: b("Scholarship Schemes", "शिष्यवृत्ती योजना"), description: b("Central & State Government scholarships for students", "विद्यार्थ्यांसाठी केंद्र व राज्य शासनाच्या शिष्यवृत्ती"), buttonText: b("Explore Now", "आता पहा"), buttonLink: "page:schemes", active: true },
          { icon: "award", title: b("Skill Development", "कौशल्य विकास"), description: b("Courses & training programs for youth", "युवकांसाठी अभ्यासक्रम व प्रशिक्षण कार्यक्रम"), buttonText: b("Explore Now", "आता पहा"), buttonLink: "page:employment#training-programs", active: true },
          { icon: "file", title: b("Competitive Exams", "स्पर्धा परीक्षा"), description: b("Resources & guidance for various exams", "विविध परीक्षांसाठी साधने व मार्गदर्शन"), buttonText: b("Explore Now", "आता पहा"), buttonLink: "page:education#youth-posts", active: true },
          { icon: "briefcase", title: b("Internships", "इंटर्नशिप"), description: b("Find internships & placement opportunities", "इंटर्नशिप व नोकरीच्या संधी शोधा"), buttonText: b("Explore Now", "आता पहा"), buttonLink: "page:employment#local-opportunities", active: true },
          { icon: "users", title: b("Youth Clubs", "युवा मंडळे"), description: b("Join youth clubs & build leadership skills", "युवा मंडळात सहभागी व्हा आणि नेतृत्वकौशल्ये वाढवा"), buttonText: b("Explore Now", "आता पहा"), buttonLink: "page:education#youth-posts", active: true },
        ],
      },
    },
    {
      sectionKey: "success-stories",
      sortOrder: 40,
      data: {
        heading: b("Success Stories from Savardari", "सावरदरीतील यशोगाथा"),
        variant: "education",
        // No story pages yet: "Read More" opens the story in a dialog; "View All" opens the stories list page.
        viewAll: { label: b("View All Success Stories", "सर्व यशोगाथा पहा"), href: "list:success-stories" },
        items: [
          { imageId: PH + "edu-story-1.webp", title: b("From Farmer to Agri Entrepreneur", "शेतकऱ्यापासून कृषी उद्योजकापर्यंत"), description: b("Ramesh Jadhav started organic farming and now supplies vegetables to Nagpur markets. An inspiration for rural youth.", "रमेश जाधव यांनी सेंद्रिय शेती सुरू केली आणि आता नागपूरच्या बाजारात भाजीपाला पुरवतात. ग्रामीण युवकांसाठी प्रेरणा."), buttonText: b("Read More", "अधिक वाचा"), order: 1 },
          { imageId: PH + "edu-story-2.webp", title: b("Young Coder of Savardari", "सावरदरीचा युवा कोडर"), description: b("Amit Dongre, a 12th student, developed a smart irrigation system and won a district-level innovation award.", "१२ वीतील अमित डोंगरे यांनी स्मार्ट सिंचन प्रणाली विकसित केली आणि जिल्हास्तरीय नावीन्य पुरस्कार जिंकला."), buttonText: b("Read More", "अधिक वाचा"), order: 2 },
          { imageId: PH + "edu-story-3.webp", title: b("Women Entrepreneur", "महिला उद्योजिका"), description: b("Pooja Wankhade runs a successful papad making business and empowers other women in the village.", "पूजा वानखडे यशस्वी पापड व्यवसाय चालवतात आणि गावातील इतर महिलांना सक्षम करतात."), buttonText: b("Read More", "अधिक वाचा"), order: 3 },
          { imageId: PH + "edu-story-4.webp", title: b("Sports Star", "क्रीडा तारा"), description: b("Rahul Tayade represented Maharashtra in the State-level Athletics Competition and won a silver medal.", "राहुल तायडे यांनी राज्यस्तरीय अॅथलेटिक्स स्पर्धेत महाराष्ट्राचे प्रतिनिधित्व करून रौप्यपदक जिंकले."), buttonText: b("Read More", "अधिक वाचा"), order: 4 },
        ],
      },
    },
  ],

  environment: [
    hero({
      eyebrow: t("Environment & Sustainability"),
      title: t("Building a Greener Savardari for a Sustainable Tomorrow"),
      titleParts: [{ text: b("Building a Greener", "शाश्वत उद्यासाठी हिरवीगार") }, { text: b("Savardari", "सवरदरी"), accent: true }, { text: b("for a Sustainable Tomorrow", "घडवूया") }],
      imageBleed: { left: 599, width: 841, height: 539 },
      body: t("We are committed to protecting our environment and building a sustainable future through community participation, innovation, and responsibility"),
      actions: [{ label: t("Adopt a Tree Now"), href: "page:environment#adopt-a-tree" }],
      imageUrl: P + "env-hero-torn.png",
    }),
    {
      // Figma "Our Key Initiatives" panel under the hero. No backend section exists for it yet
      // (docs/backend-needs-public-site.md); each tile jumps to the matching section of this page.
      sectionKey: "key-initiatives",
      sortOrder: 3,
      data: {
        heading: b("Our Key Initiatives", "आमचे प्रमुख उपक्रम"),
        items: [
          { icon: "tree", iconImage: P + "env-ki-0.png", title: b("Tree Plantation\nCampaigns", "वृक्षलागवड मोहिमा"), link: "page:environment#tree-adoption" },
          { icon: "recycle", iconImage: P + "env-ki-1.png", title: b("Plastic-Free\nVillage", "प्लास्टिकमुक्त गाव"), link: "page:environment#sustainability-initiatives" },
          { icon: "trash", iconImage: P + "env-ki-2.png", title: b("Waste Management (Solid & Liquid)", "कचरा व्यवस्थापन (घन व द्रव)"), link: "page:environment#sustainability-initiatives" },
          { icon: "droplets", iconImage: P + "env-ki-3.png", title: b("Rainwater\nHarvesting", "पर्जन्यजल संधारण"), link: "page:environment#sustainability-initiatives" },
          { icon: "sun", iconImage: P + "env-ki-4.png", title: b("Solar Energy\nProjects", "सौरऊर्जा प्रकल्प"), link: "page:environment#sustainability-initiatives" },
          { icon: "water", iconImage: P + "env-ki-5.png", title: b("Water Conservation\nProgrammes", "जलसंधारण कार्यक्रम"), link: "page:environment#sustainability-initiatives" },
          { icon: "sprout", iconImage: P + "env-ki-6.png", title: b("Organic Farming\nPromotion", "सेंद्रिय शेतीला प्रोत्साहन"), link: "page:environment#sustainability-initiatives" },
          { icon: "cloud", iconImage: P + "env-ki-7.png", title: b("Weather Updates &\nForecasts", "हवामान अद्यतने व अंदाज"), link: "page:environment#weather-update" },
          { icon: "chart", iconImage: P + "env-ki-8.png", title: b("Crop Information &\nStatistics", "पीक माहिती व आकडेवारी"), link: "page:environment#sustainability-initiatives" },
          { icon: "growth", iconImage: P + "env-ki-9.png", title: b("Agricultural Market\nPrices", "शेतमाल बाजारभाव"), link: "page:environment#market-prices" },
        ],
      },
    },
    {
      sectionKey: "green-scoreboard",
      sortOrder: 5,
      data: {
        items: [
          { icon: "leaf", iconImage: P + "env-score-0.png", title: b("Trees Planted", "लावलेली झाडे"), value: "12,450", description: b("+120 this month", "या महिन्यात +१२०"), visible: true },
          { icon: "recycle", iconImage: P + "env-score-1.png", title: b("Waste Management Efficiency", "कचरा व्यवस्थापन कार्यक्षमता"), value: "95%", description: b("Excellent", "उत्कृष्ट"), visible: true },
          { icon: "ban", iconImage: P + "env-score-2.png", title: b("Plastic-Free Village Progress", "प्लास्टिकमुक्त गाव प्रगती"), value: "90%", description: b("On Track", "योग्य मार्गावर"), visible: true },
          { icon: "trophy", iconImage: P + "env-score-3.png", title: b("Environmental Achievements", "पर्यावरणीय उपलब्धी"), value: "28", description: b("Milestones", "टप्पे"), visible: true },
          { icon: "users", iconImage: P + "env-score-4.png", title: b("Community Participants", "समुदाय सहभागी"), value: "1,250+", description: b("Active Members", "सक्रिय सदस्य"), visible: true },
        ],
      },
    },
    {
      sectionKey: "tree-adoption",
      sortOrder: 10,
      data: {
        enabled: true,
        title: b("Adopt a Tree", "एक झाड दत्तक घ्या"),
        description: b("Be a part of our green mission. Adopt a tree, nurture it, and watch it grow while contributing to a healthier environment.", "आमच्या हरित मोहिमेचा भाग व्हा. झाड दत्तक घ्या, त्याचे संगोपन करा आणि निरोगी पर्यावरणासाठी योगदान देत त्याची वाढ पहा."),
        bullets: [b("Choose a tree to adopt", "दत्तक घ्यायचे झाड निवडा"), b("Get regular updates on its growth", "त्याच्या वाढीची नियमित माहिती मिळवा"), b("Contribute to a greener Savardari", "हरित सावरदरीसाठी योगदान द्या")],
        illustrationId: PH + "env-tree.webp",
        buttonText: b("Adopt a Tree Now", "आता झाड दत्तक घ्या"),
        // No adoption endpoint yet: the volunteer form collects the request (see docs/backend-needs).
        buttonLink: "page:contact#volunteer-registration",
        stats: [
          { icon: "tree", title: b("Trees Adopted", "दत्तक घेतलेली झाडे"), value: "385", subText: b("+25 this month", "या महिन्यात +२५") },
          { icon: "sprout", title: b("Survival Rate", "जगण्याचा दर"), value: "92%", subText: b("Excellent", "उत्कृष्ट") },
          { icon: "cloud", title: b("CO₂ Impact", "CO₂ प्रभाव"), value: "18.6", subText: b("Tons Reduced", "टन घट") },
        ],
      },
    },
    {
      sectionKey: "sustainability-initiatives",
      sortOrder: 20,
      data: {
        items: [
          ["Tree Plantation Campaigns", "वृक्षलागवड मोहिमा", "Regular plantation drives in schools, roads, and community spaces.", "शाळा, रस्ते आणि सार्वजनिक जागांमध्ये नियमित वृक्षारोपण मोहिमा."],
          ["Plastic-Free Village", "प्लास्टिकमुक्त गाव", "Promoting eco-friendly alternatives and reducing single-use plastic.", "पर्यावरणपूरक पर्यायांना प्रोत्साहन आणि एकदा वापरायच्या प्लास्टिकमध्ये घट."],
          ["Waste Management (Solid & Liquid)", "कचरा व्यवस्थापन (घन व द्रव)", "Efficient waste segregation, composting, and wastewater treatment.", "कार्यक्षम कचरा वर्गीकरण, कंपोस्टिंग आणि सांडपाणी प्रक्रिया."],
          ["Rainwater Harvesting", "पर्जन्यजल संधारण", "Collecting and storing rainwater to ensure water availability.", "पाण्याची उपलब्धता राखण्यासाठी पावसाचे पाणी साठवणे."],
          ["Solar Energy Projects", "सौरऊर्जा प्रकल्प", "Using clean solar energy for street lights and public facilities.", "पथदिवे व सार्वजनिक सुविधांसाठी स्वच्छ सौरऊर्जेचा वापर."],
          ["Water Conservation Programmes", "जलसंधारण कार्यक्रम", "Awareness and initiatives to save and manage water resources.", "जलस्रोतांचे जतन व व्यवस्थापन करण्यासाठी जनजागृती व उपक्रम."],
          ["Organic Farming Promotion", "सेंद्रिय शेतीला प्रोत्साहन", "Encouraging natural farming and reducing chemical usage.", "नैसर्गिक शेतीला प्रोत्साहन आणि रासायनिक वापरात घट."],
          ["Weather Updates & Forecasts", "हवामान अद्यतने व अंदाज", "Stay informed about weather conditions and seasonal forecasts.", "हवामानाची स्थिती व हंगामी अंदाजाची माहिती मिळवा."],
          ["Crop Types & Statistics", "पिकांचे प्रकार व आकडेवारी", "Information on major crops, production, and yield statistics.", "प्रमुख पिके, उत्पादन व उत्पन्नाच्या आकडेवारीची माहिती."],
        ].map(([en, mr, dEn, dMr], i) => ({ imageId: `${PH}env-init-${i + 1}.webp`, title: b(en!, mr!), description: b(dEn!, dMr!), active: true, link: INITIATIVE_LINKS[i] })),
      },
    },
    {
      sectionKey: "market-prices",
      sortOrder: 30,
      data: {
        title: b("Daily Agricultural Market Prices", "दैनंदिन शेतमाल बाजारभाव"),
        lastUpdatedAt: "2024-05-15T08:30:00+05:30",
        marketName: b("Wardha Market", "वर्धा बाजार"),
        currency: "INR",
        rows: [
          { commodity: b("Soybean", "सोयाबीन"), unit: "Quintal", minPrice: 4200, maxPrice: 4600, modalPrice: 4400 },
          { commodity: b("Cotton", "कापूस"), unit: "Quintal", minPrice: 6200, maxPrice: 6800, modalPrice: 6500 },
          { commodity: b("Wheat", "गहू"), unit: "Quintal", minPrice: 2100, maxPrice: 2300, modalPrice: 2200 },
          { commodity: b("Tur (Pigeon Pea)", "तूर"), unit: "Quintal", minPrice: 6500, maxPrice: 7200, modalPrice: 6800 },
          { commodity: b("Gram (Chickpea)", "हरभरा"), unit: "Quintal", minPrice: 5000, maxPrice: 5600, modalPrice: 5300 },
        ],
        buttonText: b("View All Prices", "सर्व भाव पहा"),
        // There is no separate price list yet: the link jumps to this table (an anchor, not a reload).
        buttonLink: "page:environment#market-prices",
        // Placeholder flag: the design's sample date must not show the "prices may be out of date" warning.
        designSample: true,
      },
    },
    {
      sectionKey: "weather-update",
      sortOrder: 40,
      data: {
        title: b("Weather Update", "हवामान अद्यतन"),
        location: b("Current weather and 5-day forecast for Savardari", "सावरदरीचे सध्याचे हवामान आणि ५ दिवसांचा अंदाज"),
        current: { temperature: "32", humidity: "58", wind: "12 km/h", feelsLike: "35", condition: b("Partly Cloudy", "अंशतः ढगाळ") },
        forecast: [
          { date: "2024-05-16", icon: "cloud", maxTemp: "33", minTemp: "22" },
          { date: "2024-05-17", icon: "sun", maxTemp: "34", minTemp: "23" },
          { date: "2024-05-18", icon: "sun", maxTemp: "35", minTemp: "24" },
          { date: "2024-05-19", icon: "sun", maxTemp: "36", minTemp: "24" },
          { date: "2024-05-20", icon: "cloud", maxTemp: "35", minTemp: "23" },
        ],
      },
    },
  ],

  gallery: [
    hero({
      eyebrow: t("Gallery & Media"),
      title: t("Capturing the Journey of Savardari"),
      titleParts: [{ text: b("Capturing the Journey of", "") }, { text: b("Savardari", "सवरदरीचा"), accent: true }, { text: b("", "प्रवास टिपताना") }],
      titleLarge: true,
      imageBleed: { left: 535, width: 905, height: 542 },
      body: t("Explore the vibrant life, cultural heritage, and development milestones of our village through images, videos, and media stories"),
      actions: [
        { label: t("Watch Documentary"), href: "page:gallery#mini-documentary" },
        { label: t("View Photo Gallery"), href: "page:gallery#photo-gallery" },
      ],
      imageUrl: P + "gal-hero-torn.png",
    }),
    {
      sectionKey: "photo-gallery",
      sortOrder: 10,
      data: {
        categories: [
          { key: "festivals", name: b("Festivals", "सण-उत्सव"), order: 1 },
          { key: "events", name: b("Events", "कार्यक्रम"), order: 2 },
          { key: "development", name: b("Development Works", "विकास कामे"), order: 3 },
          { key: "community", name: b("Community", "समुदाय"), order: 4 },
          { key: "infrastructure", name: b("Infrastructure", "पायाभूत सुविधा"), order: 5 },
          { key: "environment", name: b("Environment", "पर्यावरण"), order: 6 },
        ],
        photos: [1, 2, 3, 4].map((n) => ({ imageId: `${P}gal-p${n}.png`, title: b("Holi Celebration", "होळी उत्सव"), categoryKey: "festivals", date: "2024-03-25", order: n })),
      },
    },
    {
      // Video links are not known yet: the cards point at YouTube until real links are published.
      sectionKey: "video-gallery",
      sortOrder: 20,
      data: {
        items: [1, 2, 3, 4].map((n) => ({
          thumbnailId: `${P}gal-p${n}.png`,
          title: b("Village Development Journey", "गाव विकासाचा प्रवास"),
          videoUrl: "https://www.youtube.com",
          date: "2024-03-25",
          duration: "02:34",
          order: n,
        })),
      },
    },
    {
      // Article links point at the newspapers' websites until the real article addresses are published.
      sectionKey: "press-coverage",
      sortOrder: 30,
      data: {
        items: [
          ["Lokmat Times", "Gram Panchayat Savardari is setting an example", "ग्रामपंचायत सावरदरी आदर्श निर्माण करत आहे", "2025-05-15", "https://www.lokmattimes.com"],
          ["Loksatta", "Gram Panchayat Savardari wins hearts!", "ग्रामपंचायत सावरदरीने जिंकली मने!", "2025-05-10", "https://www.loksatta.com"],
          ["The Free Press Journal", "A model village that inspires many", "अनेकांना प्रेरणा देणारे आदर्श गाव", "2025-05-08", "https://www.freepressjournal.in"],
          ["Navbharat", "Innovation and tradition come together in Savardari", "सावरदरीत नावीन्य आणि परंपरेचा संगम", "2025-05-05", "https://navbharatlive.com"],
          ["Pudhari", "Proud moment for the entire community", "संपूर्ण समुदायासाठी अभिमानाचा क्षण", "2025-05-02", "https://pudhari.news"],
        ].map(([name, en, mr, date, url], i) => ({ logoId: `${PH}press-${i + 1}.webp`, mediaName: name!, title: b(en!, mr!), date: date!, url: url!, order: i + 1 })),
      },
    },
    {
      // Same shape as the backend `then-and-now` section (slider).
      sectionKey: "then-and-now",
      sortOrder: 40,
      data: {
        heading: b("Then & Now — Transformation Journey", "तेव्हा आणि आता — परिवर्तनाचा प्रवास"),
        autoPlay: false,
        transitionMs: 3000,
        comparisons: [{ beforeImageId: P + "gal-before.png", afterImageId: P + "gal-after.png", heading: t(""), order: 1 }],
      },
    },
    {
      // Same shape as the backend `mini-documentary` section. The real documentary link is not known yet
      // (content need): until then the button opens YouTube in a new tab. `thumbnailUrl` and `duration`
      // are placeholder-only fields (the backend section has neither).
      sectionKey: "mini-documentary",
      sortOrder: 50,
      data: {
        heading: b("Mini Documentary", "लघु माहितीपट"),
        title: b("Savardari: A Journey of Transformation & Progress", "सावरदरी: परिवर्तन व प्रगतीचा प्रवास"),
        description: b("A short documentary showcasing the efforts, achievements, and the bright future of our village.", "आपल्या गावाचे प्रयत्न, यश आणि उज्ज्वल भविष्य दाखवणारा लघु माहितीपट."),
        source: "link",
        videoUrl: "https://www.youtube.com",
        publishedDate: "2024-04-10",
        playback: { autoplay: false, controls: true, muted: false, loop: false },
        autoThumbnail: false,
        thumbnailUrl: P + "gal-doc.png",
        duration: "02:00",
      },
    },
  ],
};
