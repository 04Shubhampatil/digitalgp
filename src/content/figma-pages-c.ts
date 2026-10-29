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


export const FIGMA_PAGE_SECTIONS_C: Partial<Record<PageKey, FallbackSection[]>> = {
  schemes: [
    hero({
      eyebrow: t("Government Schemes & Beneficiary Information"),
      title: t("Empowering Lives. Building a Better"),
      titleAccent: t("Savardari."),
      body: t("Explore government schemes and their benefits. Check eligibility, apply online and track your application status"),
      imageUrl: P + "sch-hero.png",
    }),
    {
      sectionKey: "scheme-levels",
      sortOrder: 5,
      data: {
        items: [
          { level: "CENTRAL", label: t("Central Government Schemes"), count: 48 },
          { level: "STATE", label: t("State Government Schemes"), count: 36 },
          { level: "DISTRICT", label: t("District Level Schemes"), count: 22 },
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
        viewAll: { label: t("View All Schemes"), href: "page:schemes" },
      },
    },
    {
      sectionKey: "link-cards",
      sortOrder: 20,
      data: {
        heading: b("Scheme Information", "योजनेची माहिती"),
        items: [
          { title: b("Purpose of the Scheme", "योजनेचा उद्देश"), body: b("Understand the objective and goals", "उद्दिष्ट व ध्येये समजून घ्या"), cta: b("Know More", "अधिक जाणून घ्या"), href: "page:schemes" },
          { title: b("Eligibility Criteria", "पात्रतेचे निकष"), body: b("Check if you are eligible", "आपण पात्र आहात का ते तपासा"), cta: b("Know More", "अधिक जाणून घ्या"), href: "page:schemes" },
          { title: b("Application Procedure", "अर्जाची प्रक्रिया"), body: b("Step-by-step application process", "टप्प्याटप्प्याने अर्ज प्रक्रिया"), cta: b("Know More", "अधिक जाणून घ्या"), href: "page:schemes" },
          { title: b("Required Documents", "आवश्यक कागदपत्रे"), body: b("Documents required to apply", "अर्जासाठी लागणारी कागदपत्रे"), cta: b("Know More", "अधिक जाणून घ्या"), href: "page:schemes" },
          { title: b("Benefits of the Scheme", "योजनेचे लाभ"), body: b("Know the benefits you will receive", "आपल्याला मिळणारे लाभ जाणून घ्या"), cta: b("Know More", "अधिक जाणून घ्या"), href: "page:schemes" },
        ],
      },
    },
    // The ward-wise coverage map in the design needs beneficiary counts per ward; it is added once the
    // backend provides them. These totals are sample figures until real ones are published.
    {
      sectionKey: "top-stats",
      sortOrder: 30,
      data: {
        items: [
          { icon: "building", title: b("Total Schemes", "एकूण योजना"), value: "106", description: b("All Government Schemes", "सर्व शासकीय योजना"), background: "#E8F1EA", visible: true },
          { icon: "users", title: b("Total Beneficiaries", "एकूण लाभार्थी"), value: "2,845", description: b("In Savardari Village", "सावरदरी गावात"), background: "#E8F1EA", visible: true },
          { icon: "rupee", title: b("Total Amount Disbursed", "एकूण वितरित रक्कम"), value: "₹ 8.45 Cr", description: b("This Financial Year", "या आर्थिक वर्षात"), background: "#E8F1EA", visible: true },
          { icon: "shield", title: b("Coverage", "व्याप्ती"), value: "87%", description: b("Households Covered", "कुटुंबे समाविष्ट"), background: "#E8F1EA", visible: true },
        ],
      },
    },
    {
      sectionKey: "success-stories",
      sortOrder: 40,
      data: {
        items: [
          { imageId: PH + "sch-story-1.webp", title: b("PM Awas Yojana gave me a home of my own.", "प्रधानमंत्री आवास योजनेने मला स्वतःचे घर दिले."), description: b("I am very thankful to the government for providing affordable housing and a better future for my children. — Sunita Vishwakarma, Ward No. 3", "परवडणारे घर आणि माझ्या मुलांसाठी चांगले भविष्य दिल्याबद्दल मी शासनाची आभारी आहे. — सुनीता विश्वकर्मा, प्रभाग क्र. ३"), order: 1 },
          { imageId: PH + "sch-story-2.webp", title: b("PM-KISAN provided regular income & financial security.", "पीएम-किसानने नियमित उत्पन्न व आर्थिक सुरक्षा दिली."), description: b("It helps me support my family and manage farm expenses during difficult times. — Ramesh Kumar, Ward No. 2", "कठीण काळात कुटुंबाला आधार देण्यास व शेतीचा खर्च भागविण्यास हे मदत करते. — रमेश कुमार, प्रभाग क्र. २"), order: 2 },
          { imageId: PH + "sch-story-3.webp", title: b("PM Kisan Samman Nidhi is a great support.", "पीएम किसान सन्मान निधी मोठा आधार आहे."), description: b("The amount helps me in buying seeds and fertilizers for my farm. — Vithal Kale, Ward No. 1", "या रकमेतून मला शेतीसाठी बियाणे व खते घेता येतात. — विठ्ठल काळे, प्रभाग क्र. १"), order: 3 },
          { imageId: PH + "sch-story-4.webp", title: b("Scholarship Scheme helped me continue my education.", "शिष्यवृत्ती योजनेमुळे मला शिक्षण सुरू ठेवता आले."), description: b("It has been a huge support in achieving my dreams. — Anjali Patil, Ward No. 4", "माझी स्वप्ने पूर्ण करण्यात हा मोठा आधार ठरला. — अंजली पाटील, प्रभाग क्र. ४"), order: 4 },
        ],
      },
    },
    {
      sectionKey: "service-strip",
      sortOrder: 50,
      data: {
        heading: b("Scheme Services", "योजना सेवा"),
        items: [
          { label: b("Check Application Status", "अर्जाची स्थिती तपासा"), caption: b("Track your application", "आपल्या अर्जाचा मागोवा घ्या"), href: "page:grievance" },
          { label: b("Apply Online", "ऑनलाइन अर्ज करा"), caption: b("Apply for schemes", "योजनांसाठी अर्ज करा"), href: "page:services" },
          { label: b("Download Forms", "अर्ज डाउनलोड करा"), caption: b("Get application forms", "अर्जाचे नमुने मिळवा"), href: "page:announcements" },
          { label: b("Grievance Redressal", "तक्रार निवारण"), caption: b("Lodge a complaint", "तक्रार नोंदवा"), href: "page:grievance" },
          { label: b("Helpline Support", "हेल्पलाइन सहाय्य"), caption: b("Get help & support", "मदत व सहाय्य मिळवा"), href: "page:contact" },
        ],
      },
    },
  ],

  contact: [
    hero({
      eyebrow: t("Contact & Collaboration"),
      title: t("Let’s Build a Stronger Savardari Together"),
      body: t("We welcome your feedback, suggestions, and collaboration to make our village better, stronger, and more sustainable"),
      actions: [
        { label: t("Become a Volunteer"), href: "page:contact" },
        { label: t("Send Feedback"), href: "page:contact" },
      ],
      imageUrl: P + "con-hero.png",
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
        mapEmbedUrl: "https://maps.google.com/maps?q=Savardari%2C%20Khed%2C%20Pune&output=embed",
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
      // The design shows each volunteer area as a card with a description; the backend only stores the name.
      sectionKey: "volunteer-categories",
      sortOrder: 40,
      data: {
        items: [
          { title: b("Youth Volunteers", "युवा स्वयंसेवक"), order: 1 },
          { title: b("NGOs", "स्वयंसेवी संस्था"), order: 2 },
          { title: b("Social Organizations", "सामाजिक संस्था"), order: 3 },
          { title: b("Citizen Volunteers", "नागरिक स्वयंसेवक"), order: 4 },
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
      body: t("We are here to listen and act. Register your complaints, track status, share suggestions, and help us build a transparent and responsive Savardari"),
      actions: [
        { label: t("Register a Complaint"), href: "page:grievance" },
        { label: t("Track Complaint Status"), href: "page:grievance" },
      ],
      imageUrl: P + "gri-hero.png",
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
          { icon: "mail", title: b("Suggestion Box", "सूचना पेटी"), contactOrAction: b("Share your ideas", "आपल्या कल्पना सांगा"), description: b("Help us improve", "आम्हाला सुधारण्यास मदत करा"), visible: true },
          { icon: "file", title: b("Feedback Form", "अभिप्राय अर्ज"), contactOrAction: b("Your feedback matters", "आपला अभिप्राय महत्त्वाचा"), description: b("Tell us your experience", "आपला अनुभव सांगा"), visible: true },
        ],
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
          b("Track the status using Complaint ID / Mobile Number.", "तक्रार क्रमांक / मोबाईल क्रमांकाने स्थिती तपासा."),
          b("Get updates on resolution.", "निराकरणाबाबत अद्यतने मिळवा."),
        ],
      },
    },
    // The design also shows monthly complaint numbers and charts. They are only shown once real figures
    // come from the complaints database, so they are not part of the placeholder.
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
      body: t("Explore job opportunities, skill development programs, local talent, and resources that help our community grow and prosper"),
      actions: [
        { label: t("View Opportunities"), href: "page:employment" },
        { label: t("Village Talent Directory"), href: "page:employment" },
      ],
      imageUrl: P + "emp-hero.png",
    }),
    {
      sectionKey: "support-cards",
      sortOrder: 5,
      data: {
        items: [
          { icon: "briefcase", title: b("Local Employment", "स्थानिक रोजगार"), description: b("Find jobs & work opportunities", "नोकरी व कामाच्या संधी शोधा"), visible: true },
          { icon: "file", title: b("Government Tenders", "शासकीय निविदा"), description: b("Tenders & contract opportunities", "निविदा व कंत्राटाच्या संधी"), visible: true },
          { icon: "users", title: b("SHGs & MSMEs", "बचत गट व लघुउद्योग"), description: b("Support for Self-Help Groups & Businesses", "बचत गट व व्यवसायांना सहाय्य"), visible: true },
          { icon: "education", title: b("Training Programs", "प्रशिक्षण कार्यक्रम"), description: b("Skill development & youth training", "कौशल्य विकास व युवा प्रशिक्षण"), visible: true },
          { icon: "monitor", title: b("Digital Literacy", "डिजिटल साक्षरता"), description: b("Digital literacy campaigns", "डिजिटल साक्षरता मोहिमा"), visible: true },
          { icon: "link", title: b("Govt. Job Portals", "शासकीय रोजगार पोर्टल"), description: b("Access government employment portals", "शासकीय रोजगार पोर्टलवर जा"), visible: true },
        ],
      },
    },
    {
      sectionKey: "local-opportunities",
      sortOrder: 10,
      data: {
        items: [
          { icon: "briefcase", contactOrAction: "128", title: b("Active Job Openings", "सक्रिय रोजगार संधी"), description: b("Updated this week", "या आठवड्यात अद्ययावत"), visible: true },
          { icon: "building", contactOrAction: "42", title: b("Private Sector Jobs", "खाजगी क्षेत्रातील नोकऱ्या"), description: b("Multiple locations", "विविध ठिकाणी"), visible: true },
          { icon: "education", contactOrAction: "16", title: b("Apprenticeship Program", "शिकाऊ उमेदवारी कार्यक्रम"), description: b("For skill development", "कौशल्य विकासासाठी"), visible: true },
          { icon: "file", contactOrAction: "21", title: b("Contract Opportunities", "कंत्राटी संधी"), description: b("Apply for local tenders", "स्थानिक निविदांसाठी अर्ज करा"), visible: true },
        ],
      },
    },
    {
      sectionKey: "skill-directory",
      sortOrder: 20,
      data: {
        items: [
          { icon: "zap", skillName: b("Electricians", "इलेक्ट्रिशियन"), availableCount: 18, countIsApproximate: true, active: true },
          { icon: "droplets", skillName: b("Plumbers", "प्लंबर"), availableCount: 12, countIsApproximate: true, active: true },
          { icon: "hammer", skillName: b("Carpenters", "सुतार"), availableCount: 15, countIsApproximate: true, active: true },
          { icon: "star", skillName: b("Tailors", "शिंपी"), availableCount: 20, countIsApproximate: true, active: true },
          { icon: "wrench", skillName: b("Mechanics", "मेकॅनिक"), availableCount: 10, countIsApproximate: true, active: true },
          { icon: "building", skillName: b("Masons", "गवंडी"), availableCount: 14, countIsApproximate: true, active: true },
          { icon: "lightbulb", skillName: b("Painters", "रंगारी"), availableCount: 11, countIsApproximate: true, active: true },
          { icon: "users", skillName: b("More Skills", "इतर कौशल्ये"), link: "page:employment", active: true },
        ],
      },
    },
    {
      sectionKey: "assistance-items",
      sortOrder: 25,
      data: {
        items: [
          { icon: "rain", title: b("Daily Crop Market Prices", "दैनंदिन पीक बाजारभाव"), link: "page:environment", active: true },
          { icon: "sprout", title: b("Fertilizer Availability", "खतांची उपलब्धता"), link: "page:services", active: true },
          { icon: "wheat", title: b("Agricultural Advisory", "कृषी सल्ला"), link: "page:services", active: true },
          { icon: "cloud", title: b("Weather Updates", "हवामान अद्यतन"), link: "page:environment", active: true },
          { icon: "megaphone", title: b("Scheme Information", "योजनांची माहिती"), link: "page:schemes", active: true },
        ],
      },
    },
    {
      sectionKey: "training-programs",
      sortOrder: 30,
      data: {
        items: [
          { thumbnailImageId: PH + "emp-train-1.webp", title: b("Skill Development Programs", "कौशल्य विकास कार्यक्रम"), shortDescription: b("Enhance your skills & build a better future", "कौशल्ये वाढवा आणि चांगले भविष्य घडवा"), ctaText: b("View Details", "तपशील पहा"), ctaLink: "page:employment", order: 1, status: "active", featured: false },
          { thumbnailImageId: PH + "emp-train-2.webp", title: b("Youth Training Programs", "युवा प्रशिक्षण कार्यक्रम"), shortDescription: b("Special training programs for youth", "युवकांसाठी विशेष प्रशिक्षण कार्यक्रम"), ctaText: b("View Details", "तपशील पहा"), ctaLink: "page:employment", order: 2, status: "active", featured: false },
          { thumbnailImageId: PH + "emp-train-3.webp", title: b("Digital Literacy Campaign", "डिजिटल साक्षरता मोहीम"), shortDescription: b("Learn digital skills for modern world", "आधुनिक जगासाठी डिजिटल कौशल्ये शिका"), ctaText: b("View Details", "तपशील पहा"), ctaLink: "page:employment", order: 3, status: "active", featured: false },
          { thumbnailImageId: PH + "emp-train-4.webp", title: b("Entrepreneurship Development", "उद्योजकता विकास"), shortDescription: b("Start your own business with confidence", "आत्मविश्वासाने स्वतःचा व्यवसाय सुरू करा"), ctaText: b("View Details", "तपशील पहा"), ctaLink: "page:employment", order: 4, status: "active", featured: false },
        ],
      },
    },
    {
      sectionKey: "job-portals",
      sortOrder: 35,
      data: {
        items: [
          { logoId: PH + "emp-portal-1.webp", name: b("National Career Service", "राष्ट्रीय करिअर सेवा"), description: b("Find government & private sector jobs", "शासकीय व खाजगी क्षेत्रातील नोकऱ्या शोधा"), websiteUrl: "https://www.ncs.gov.in", order: 1, active: true },
          { logoId: PH + "emp-portal-2.webp", name: b("Maharashtra Rojgar Portal", "महाराष्ट्र रोजगार पोर्टल"), description: b("Government of Maharashtra", "महाराष्ट्र शासन"), websiteUrl: "https://rojgar.mahaswayam.gov.in", order: 2, active: true },
          { logoId: PH + "emp-portal-3.webp", name: b("PM Kaushal Vikas Yojana", "पंतप्रधान कौशल्य विकास योजना"), description: b("Skill development & training", "कौशल्य विकास व प्रशिक्षण"), websiteUrl: "https://www.pmkvyofficial.org", order: 3, active: true },
          { logoId: PH + "emp-portal-4.webp", name: b("Apprenticeship India", "अप्रेंटिसशिप इंडिया"), description: b("Find apprenticeship opportunities", "शिकाऊ उमेदवारीच्या संधी शोधा"), websiteUrl: "https://www.apprenticeshipindia.gov.in", order: 4, active: true },
        ],
      },
    },
    {
      sectionKey: "success-stories",
      sortOrder: 40,
      data: {
        items: [
          { imageId: PH + "emp-story-1.webp", title: b("From Homemaker to Entrepreneur", "गृहिणीपासून उद्योजिकेपर्यंत"), description: b("Sunita Tai started a tailoring business with SHG support and now employs 15 women in the village.", "सुनीताताईंनी बचत गटाच्या मदतीने शिवणकाम व्यवसाय सुरू केला आणि आज गावातील १५ महिलांना रोजगार देतात."), buttonText: b("Read More", "अधिक वाचा"), buttonLink: "page:culture", order: 1 },
          { imageId: PH + "emp-story-2.webp", title: b("Skilled Youth, Bright Future", "कुशल युवक, उज्ज्वल भविष्य"), description: b("Rohit completed electrician training and now runs a successful electrical services business.", "रोहितने इलेक्ट्रिशियन प्रशिक्षण पूर्ण केले आणि आता तो यशस्वी विद्युत सेवा व्यवसाय चालवतो."), buttonText: b("Read More", "अधिक वाचा"), buttonLink: "page:culture", order: 2 },
          { imageId: PH + "emp-story-3.webp", title: b("Digital Skills, New Opportunities", "डिजिटल कौशल्ये, नव्या संधी"), description: b("Pooja learned digital marketing through our training program and now works as a freelancer.", "पूजाने आमच्या प्रशिक्षण कार्यक्रमातून डिजिटल मार्केटिंग शिकले आणि आता ती फ्रीलान्सर म्हणून काम करते."), buttonText: b("Read More", "अधिक वाचा"), buttonLink: "page:culture", order: 3 },
          { imageId: PH + "emp-story-4.webp", title: b("Modern Farming, Better Income", "आधुनिक शेती, चांगले उत्पन्न"), description: b("Ramesh adopted modern farming techniques and increased his income by 60% in one season.", "रमेश यांनी आधुनिक शेती तंत्रे अवलंबली आणि एका हंगामात उत्पन्न ६०% ने वाढवले."), buttonText: b("Read More", "अधिक वाचा"), buttonLink: "page:culture", order: 4 },
        ],
      },
    },
  ],

  education: [
    hero({
      eyebrow: t("Education & Youth Corner"),
      title: t("Empowering Minds, Building Futures in Savardari"),
      body: t("We are committed to quality education, skill development, and holistic growth of our youth to build a brighter and stronger Savardari"),
      imageUrl: P + "edu-hero.png",
    }),
    {
      sectionKey: "support-cards",
      sortOrder: 5,
      data: {
        items: [
          { icon: "school", title: b("Schools in Village", "गावातील शाळा"), description: b("Explore schools and education facilities", "शाळा व शैक्षणिक सुविधा जाणून घ्या"), visible: true },
          { icon: "trophy", title: b("Student Achievements", "विद्यार्थ्यांचे यश"), description: b("Celebrating the success of our students", "आपल्या विद्यार्थ्यांच्या यशाचा गौरव"), visible: true },
          { icon: "education", title: b("Scholarship Schemes", "शिष्यवृत्ती योजना"), description: b("Find and apply for scholarships", "शिष्यवृत्ती शोधा व अर्ज करा"), visible: true },
          { icon: "compass", title: b("Career Guidance", "करिअर मार्गदर्शन"), description: b("Resources for a better career tomorrow", "उज्ज्वल करिअरसाठी साधने"), visible: true },
          { icon: "sports", title: b("Sports Activities", "क्रीडा उपक्रम"), description: b("Promoting sports and fitness", "खेळ व तंदुरुस्तीला प्रोत्साहन"), visible: true },
          { icon: "nss", title: b("NSS Activities", "एनएसएस उपक्रम"), description: b("National Service Scheme & youth initiatives", "राष्ट्रीय सेवा योजना व युवा उपक्रम"), visible: true },
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
        buttonLink: "page:education",
        achievementCards: [
          { icon: "book", title: b("Academic Excellence", "शैक्षणिक प्रावीण्य"), value: "95.6%" },
          { icon: "sports", title: b("Sports Achievement", "क्रीडा कामगिरी"), value: "State Level Runner" },
          { icon: "users", title: b("Cultural Participation", "सांस्कृतिक सहभाग"), value: "Active Participants" },
          { icon: "target", title: b("Future Goal", "भविष्यातील ध्येय"), value: "IAS Officer" },
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
      sectionKey: "youth-posts",
      sortOrder: 25,
      data: {
        items: [1, 2, 3, 4].map(() => ({
          tabKey: "blogs",
          type: "blog",
          title: b("Power of Education In Rural India", "ग्रामीण भारतातील शिक्षणाची ताकद"),
          coverImageId: PH + "edu-blog.webp",
          url: "page:education",
        })),
      },
    },
    {
      sectionKey: "scheme-cards",
      sortOrder: 30,
      data: {
        items: [
          { icon: "education", title: b("Scholarship Schemes", "शिष्यवृत्ती योजना"), description: b("Central & State Government scholarships for students", "विद्यार्थ्यांसाठी केंद्र व राज्य शासनाच्या शिष्यवृत्ती"), buttonText: b("Explore Now", "आता पहा"), buttonLink: "page:schemes", active: true },
          { icon: "growth", title: b("Skill Development", "कौशल्य विकास"), description: b("Courses & training programs for youth", "युवकांसाठी अभ्यासक्रम व प्रशिक्षण कार्यक्रम"), buttonText: b("Explore Now", "आता पहा"), buttonLink: "page:employment", active: true },
          { icon: "book", title: b("Competitive Exams", "स्पर्धा परीक्षा"), description: b("Resources & guidance for various exams", "विविध परीक्षांसाठी साधने व मार्गदर्शन"), buttonText: b("Explore Now", "आता पहा"), buttonLink: "page:education", active: true },
          { icon: "briefcase", title: b("Internships", "इंटर्नशिप"), description: b("Find internships & placement opportunities", "इंटर्नशिप व नोकरीच्या संधी शोधा"), buttonText: b("Explore Now", "आता पहा"), buttonLink: "page:employment", active: true },
          { icon: "users", title: b("Youth Clubs", "युवा मंडळे"), description: b("Join youth clubs & build leadership skills", "युवा मंडळात सहभागी व्हा आणि नेतृत्वकौशल्ये वाढवा"), buttonText: b("Explore Now", "आता पहा"), buttonLink: "page:education", active: true },
        ],
      },
    },
    {
      sectionKey: "success-stories",
      sortOrder: 40,
      data: {
        items: [
          { imageId: PH + "edu-story-1.webp", title: b("From Farmer to Agri Entrepreneur", "शेतकऱ्यापासून कृषी उद्योजकापर्यंत"), description: b("Ramesh Jadhav started organic farming and now supplies vegetables to Nagpur markets. An inspiration for rural youth.", "रमेश जाधव यांनी सेंद्रिय शेती सुरू केली आणि आता नागपूरच्या बाजारात भाजीपाला पुरवतात. ग्रामीण युवकांसाठी प्रेरणा."), buttonText: b("Read More", "अधिक वाचा"), buttonLink: "page:culture", order: 1 },
          { imageId: PH + "edu-story-2.webp", title: b("Young Coder of Savardari", "सावरदरीचा युवा कोडर"), description: b("Amit Dongre, a 12th student, developed a smart irrigation system and won a district-level innovation award.", "१२ वीतील अमित डोंगरे यांनी स्मार्ट सिंचन प्रणाली विकसित केली आणि जिल्हास्तरीय नावीन्य पुरस्कार जिंकला."), buttonText: b("Read More", "अधिक वाचा"), buttonLink: "page:culture", order: 2 },
          { imageId: PH + "edu-story-3.webp", title: b("Women Entrepreneur", "महिला उद्योजिका"), description: b("Pooja Wankhade runs a successful papad making business and empowers other women in the village.", "पूजा वानखडे यशस्वी पापड व्यवसाय चालवतात आणि गावातील इतर महिलांना सक्षम करतात."), buttonText: b("Read More", "अधिक वाचा"), buttonLink: "page:culture", order: 3 },
          { imageId: PH + "edu-story-4.webp", title: b("Sports Star", "क्रीडा तारा"), description: b("Rahul Tayade represented Maharashtra in the State-level Athletics Competition and won a silver medal.", "राहुल तायडे यांनी राज्यस्तरीय अॅथलेटिक्स स्पर्धेत महाराष्ट्राचे प्रतिनिधित्व करून रौप्यपदक जिंकले."), buttonText: b("Read More", "अधिक वाचा"), buttonLink: "page:culture", order: 4 },
        ],
      },
    },
  ],

  environment: [
    hero({
      eyebrow: t("Environment & Sustainability"),
      title: t("Building a Greener Savardari for a Sustainable Tomorrow"),
      body: t("We are committed to protecting our environment and building a sustainable future through community participation, innovation, and responsibility"),
      actions: [{ label: t("Adopt a Tree Now"), href: "page:environment" }],
      imageUrl: P + "env-hero.png",
    }),
    {
      sectionKey: "green-scoreboard",
      sortOrder: 5,
      data: {
        items: [
          { icon: "leaf", title: b("Trees Planted", "लावलेली झाडे"), value: "12,450", description: b("+120 this month", "या महिन्यात +१२०"), visible: true },
          { icon: "recycle", title: b("Waste Management Efficiency", "कचरा व्यवस्थापन कार्यक्षमता"), value: "95%", description: b("Excellent", "उत्कृष्ट"), visible: true },
          { icon: "ban", title: b("Plastic-Free Village Progress", "प्लास्टिकमुक्त गाव प्रगती"), value: "90%", description: b("On Track", "योग्य मार्गावर"), visible: true },
          { icon: "trophy", title: b("Environmental Achievements", "पर्यावरणीय उपलब्धी"), value: "28", description: b("Milestones", "टप्पे"), visible: true },
          { icon: "users", title: b("Community Participants", "समुदाय सहभागी"), value: "1,250+", description: b("Active Members", "सक्रिय सदस्य"), visible: true },
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
        buttonLink: "page:environment",
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
        ].map(([en, mr, dEn, dMr], i) => ({ imageId: `${PH}env-init-${i + 1}.webp`, title: b(en!, mr!), description: b(dEn!, dMr!), active: true })),
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
        buttonLink: "page:environment",
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
      body: t("Explore the vibrant life, cultural heritage, and development milestones of our village through images, videos, and media stories"),
      actions: [
        { label: t("Watch Documentary"), href: "page:gallery" },
        { label: t("View Photo Gallery"), href: "page:gallery" },
      ],
      imageUrl: P + "gal-hero.png",
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
      sectionKey: "before-after",
      sortOrder: 40,
      data: {
        heading: t("Then & Now — Transformation Journey"),
        items: [{ label: t(""), beforeUrl: P + "gal-before.png", afterUrl: P + "gal-after.png", height: 354 }],
      },
    },
    {
      sectionKey: "video-feature",
      sortOrder: 50,
      data: {
        heading: t("Mini Documentary"),
        title: t("Savardari: A Journey of Transformation & Progress"),
        body: t("A short documentary showcasing the efforts, achievements, and the bright future of our village."),
        duration: t("Duration: 02:00"),
        published: t("Published: April 10, 2024"),
        imageUrl: P + "gal-doc.png",
        action: { label: t("Watch Documentary"), href: "page:gallery" },
      },
    },
  ],
};
