import { SATYADHI_LOGO } from "../assets/logoData";

export const sampleInstitutes = [
  {
    id: "satyadhi-tech",
    name: "Satyadhi Sharma Tech",
    tagline: "Premier Institute & EdTech Platform for Competitive Exams",
    type: "Coaching & EdTech Studio",
    phone: "+91 97706 77070",
    city: "Indore (M.P.)",
    logo: SATYADHI_LOGO,
  },
  {
    id: "satyadhi-classes",
    name: "Satyadhi Sharma Classes",
    tagline: "Shiksha Ka Vishwas • MPPSC, SSC, Vyapam & State Exams",
    type: "Competitive Coaching",
    phone: "+91 98930 22334",
    city: "Indore",
    logo: SATYADHI_LOGO,
  },
  {
    id: "delhi-public",
    name: "Delhi Model Public Senior Secondary School",
    tagline: "Excellence in Education & Character",
    type: "K-12 School",
    phone: "+91 98111 22334",
    city: "New Delhi",
    logo: null,
  },
];

export const presentationPresets = [
  {
    title: "Photosynthesis & Light Reactions in Plants",
    grade: "Class 10 / 11",
    subject: "Biology / Science",
    subtitle: "Complete Conceptual Guide for CBSE & NEET",
    slidesCount: 5,
    slides: [
      {
        tag: "Introduction",
        title: "What is Photosynthesis?",
        points: [
          "Photosynthesis is the biochemical process by which autotrophic organisms convert light energy into chemical energy.",
          "Chemical Formula: 6CO₂ + 6H₂O + Light Energy → C₆H₁₂O₆ + 6O₂",
          "Occurs primarily inside chloroplast organelles within plant mesophyll cells.",
          "Releases oxygen as a vital byproduct, sustaining aerobic life on Earth.",
        ],
        takeaway: "Master the balanced chemical equation; it is frequently tested in 2-mark board questions.",
      },
      {
        tag: "Cellular Mechanism",
        title: "Chloroplast Anatomy & Pigments",
        points: [
          "Double-membrane bound organelle containing thylakoids stacked into grana.",
          "Stroma: Fluid matrix where the dark reaction (Calvin cycle) enzymes reside.",
          "Chlorophyll-a is the primary reaction center pigment capturing blue & red wavelengths.",
          "Accessory pigments (Chlorophyll-b, Carotenoids) broaden the light absorption spectrum.",
        ],
        takeaway: "Chlorophyll does not absorb green light—it reflects it, giving plants their green color.",
      },
      {
        tag: "Phase 1: Light Reaction",
        title: "The Light Dependent Reaction (Thylakoids)",
        points: [
          "Triggered when photons hit Photosystem II (P680) and Photosystem I (P700).",
          "Photolysis of water splits H₂O into Protons, Electrons, and free Oxygen gas.",
          "Non-cyclic electron transport chain produces high-energy ATP and NADPH molecules.",
          "Chemiosmotic hypothesis explains ATP synthesis driven by proton gradient across thylakoid membrane.",
        ],
        takeaway: "ATP and NADPH synthesized here are the essential 'assimilatory power' needed for Phase 2.",
      },
      {
        tag: "Phase 2: Dark Reaction",
        title: "The Calvin Cycle (Light Independent)",
        points: [
          "Occurs in the stroma and uses the ATP and NADPH generated in light reactions.",
          "Step 1: Carbon Fixation catalyzed by the most abundant enzyme on Earth: RuBisCO.",
          "Step 2: Reduction of 3-PGA to G3P (triose phosphate sugars).",
          "Step 3: Regeneration of RuBP (Ribulose 1,5-bisphosphate) consuming additional ATP.",
        ],
        takeaway: "RuBisCO has affinity for both CO₂ and O₂; under high temperature it causes photorespiration.",
      },
      {
        tag: "Summary & Exam Tips",
        title: "Key Differences & High-Yield Questions",
        points: [
          "Light Reaction vs Dark Reaction: Compare Site (Thylakoid vs Stroma) and Products.",
          "Blackman's Law of Limiting Factors: Temperature, Light Intensity, and CO₂ concentration.",
          "Common trap: 'Dark' reaction doesn't require darkness; it only doesn't directly absorb photons.",
          "NEET focus: Photolysis equation and ATP yield per glucose molecule synthesized.",
        ],
        takeaway: "Revise graph of light intensity vs rate of photosynthesis for board exams.",
      },
    ],
  },
  {
    title: "Newton's Laws of Motion & Friction",
    grade: "Class 9 & 11",
    subject: "Physics",
    subtitle: "Foundational Mechanics for CBSE & JEE Main",
    slidesCount: 4,
    slides: [
      {
        tag: "Law of Inertia",
        title: "First Law: Concept of Inertia & Force",
        points: [
          "Every body continues in its state of rest or uniform motion unless acted upon by a net external force.",
          "Inertia is the inherent resistance of matter to changes in its state of velocity.",
          "Mass is the quantitative measure of inertia (Higher mass = Higher inertia).",
          "Real-life examples: Passenger lurching forward when a fast bus suddenly brakes.",
        ],
        takeaway: "First law defines force qualitatively, while the second law provides its quantitative formula.",
      },
      {
        tag: "Rate of Momentum",
        title: "Second Law: F = dp/dt = ma",
        points: [
          "The rate of change of linear momentum (p = mv) is directly proportional to the applied net force.",
          "For constant mass systems: F_net = m · a (Force = Mass × Acceleration).",
          "SI Unit of Force: Newton (N), where 1 N = 1 kg·m/s².",
          "Impulse (J = F · Δt = Δp): Explains why a cricketer pulls his hands back while catching a high-speed ball.",
        ],
        takeaway: "Always draw Free Body Diagrams (FBD) showing all real contact and gravitational forces.",
      },
      {
        tag: "Action & Reaction",
        title: "Third Law & Conservation of Momentum",
        points: [
          "To every action, there is always an equal and opposite reaction.",
          "Crucial Rule: Action and reaction forces ALWAYS act on TWO DIFFERENT bodies, never on the same body.",
          "Hence, action-reaction pairs never cancel each other out.",
          "Applications: Rocket propulsion, recoil velocity of a firing gun, walking on rough ground.",
        ],
        takeaway: "Recoil of gun: v_gun = -(m_bullet · v_bullet) / M_gun by linear momentum conservation.",
      },
      {
        tag: "Contact Forces",
        title: "Friction: Static, Kinetic & Rolling",
        points: [
          "Friction is the opposing force that arises parallel to the contact surface during relative motion.",
          "Limiting Friction f_s(max) = μ_s · N (where N is normal reaction, μ_s is coefficient of static friction).",
          "Static friction is self-adjusting from 0 up to its maximum limiting value.",
          "Kinetic friction is slightly lower than static friction: μ_k < μ_s.",
        ],
        takeaway: "Friction opposes relative motion between surfaces, but enables walking and car acceleration.",
      },
    ],
  },
];

export const sampleQuestionPapers = [
  {
    title: "Unit Test - Periodic Classification & Chemical Bonding",
    grade: "Class 10 / 11",
    subject: "Chemistry",
    duration: "90 Minutes",
    totalMarks: 40,
    sections: [
      {
        name: "Section A: Multiple Choice Questions (1 Mark Each)",
        questions: [
          {
            q: "Which element has the highest electronegativity according to the Pauling scale?",
            options: ["A) Oxygen", "B) Chlorine", "C) Fluorine", "D) Nitrogen"],
            ans: "C) Fluorine (Value: 4.0)",
          },
          {
            q: "The bond angle in a water molecule (H₂O) is approximately:",
            options: ["A) 180°", "B) 109.5°", "C) 104.5°", "D) 120°"],
            ans: "C) 104.5° due to two lone pair-lone pair repulsions in VSEPR theory.",
          },
          {
            q: "Atomic radius across a period from left to right generally:",
            options: ["A) Increases", "B) Decreases", "C) Remains constant", "D) First decreases then increases"],
            ans: "B) Decreases due to increase in effective nuclear charge (Z_eff).",
          },
        ],
      },
      {
        name: "Section B: Short Answer Questions (3 Marks Each)",
        questions: [
          {
            q: "Define ionization enthalpy. Why is the second ionization enthalpy of Sodium significantly higher than its first?",
            ans: "After losing one electron, Na⁺ acquires a stable octet noble gas electronic configuration [Ne]. Removing an electron from a stable noble gas core requires exceptionally high energy.",
          },
          {
            q: "State Modern Periodic Law. How does it resolve the anomalies present in Mendeleev's Periodic Table?",
            ans: "Modern Periodic Law states that physical and chemical properties of elements are periodic functions of their atomic numbers (Z), solving issues like position of isotopes and inverted atomic weight pairs.",
          },
        ],
      },
      {
        name: "Section C: Long Answer / Conceptual (5 Marks Each)",
        questions: [
          {
            q: "Using VSEPR theory, predict the molecular geometry, hybridization of the central atom, and lone pairs for: (i) NH₃, (ii) SF₆, and (iii) PCl₅.",
            ans: "(i) NH₃: sp³ hybridized, 1 lone pair, Trigonal Pyramidal. (ii) SF₆: sp³d² hybridized, 0 lone pairs, Regular Octahedral. (iii) PCl₅: sp³d hybridized, 0 lone pairs, Trigonal Bipyramidal with axial bonds longer than equatorial bonds.",
          },
        ],
      },
    ],
  },
];

export const sampleBooks = [
  {
    id: "science-mastery",
    title: "सामान्य विज्ञान एवं जीव विज्ञान (General Science Master Guide)",
    subtitle: "Complete Theory, Key Diagrams, Formulae & 500+ Practice MCQs",
    targetExam: "MPPSC, SSC, Railway & Vyapam Exams",
    subject: "General Science (Biology, Chemistry, Physics)",
    author: "Satyadhi Sharma Research & Faculty Cell",
    edition: "2026-27 Smart Digital Edition",
    totalPages: 148,
    coverColor: "from-amber-500 via-orange-600 to-amber-700",
    chapters: [
      {
        number: 1,
        title: "कोशिका विज्ञान एवं आनुवंशिकी (Cell Biology & Genetics)",
        subtitle: "Fundamental Unit of Life, Organelles & DNA Structure",
        theory: [
          "कोशिका (Cell) जीवन की सबसे छोटी संरचनात्मक एवं कार्यात्मक इकाई है। 1665 में रॉबर्ट हुक (Robert Hooke) ने कॉर्क में मृत कोशिका की खोज की थी, जबकि जीवित कोशिका को सबसे पहले एंटोनी वॉन ल्यूवेनहॉक (Antonie van Leeuwenhoek) ने 1674 में देखा।",
          "कोशिका सिद्धांत (Cell Theory): 1838-39 में एम. जे. श्लीडेन एवं थियोडोर श्वान ने प्रतिपादित किया। बाद में रुडोल्फ विर्चो (1855) ने जोड़ा—'Omnis cellula e cellula' (सभी नई कोशिकाएं पूर्ववर्ती कोशिकाओं से बनती हैं)।",
          "माइटोकॉन्ड्रिया (Mitochondria): इसे 'कोशिका का पावरहाउस' (Powerhouse of the Cell) कहा जाता है। इसमें कोशिकीय श्वसन द्वारा ATP (Adenosine Triphosphate) ऊर्जा का निर्माण होता है। इसमें स्वयं का वृत्ताकार DNA तथा 70S राइबोसोम पाया जाता है।",
          "राइबोसोम (Ribosome): इसे 'प्रोटीन की फैक्ट्री' कहते हैं। यह झिल्ली-रहित अंगक है। यूकैरियोटिक कोशिकाओं में 80S तथा प्रोकैरियोटिक कोशिकाओं में 70S राइबोसोम उपस्थित होते हैं।",
          "लाइसोसोम (Lysosome): इसे 'आत्मघाती थैली' (Suicidal Bag) कहा जाता है। इसमें शक्तिशाली जल-अपघटनी एंजाइम (Hydrolytic Enzymes) भरे होते हैं जो अम्लीय माध्यम में सक्रिय होते हैं।",
        ],
        highlights: [
          "🌟 परीक्षा उपयोगी तथ्य: सबसे बड़ी ज्ञात कोशिका शुतुरमुर्ग का अंडा (Ostrich egg) है तथा मानव शरीर की सबसे लम्बी कोशिका तंत्रिका कोशिका (Neuron) है।",
          "💡 मेमरी ट्रिक: Karyon का अर्थ केंद्रक होता है; Pro-karyote = आदिम/अविकसित केंद्रक, Eu-karyote = सुविकसित केंद्रक।",
        ],
        practiceQuestions: [
          {
            q: "किस कोशिकांग को 'कोशिका का ट्रैफिक पुलिस' कहा जाता है?",
            options: ["A) माइटोकॉन्ड्रिया", "B) गॉल्जीकाय (Golgi Apparatus)", "C) राइबोसोम", "D) लाइसोसोम"],
            ans: "B) गॉल्जीकाय (यह प्रोटीनों की पैकेजिंग एवं परिवहन नियंत्रित करता है)।",
          },
          {
            q: "मानव गुणसूत्र में ऑटोसोम्स (Autosomes) की संख्या कितनी होती है?",
            options: ["A) 44 (22 जोड़े)", "B) 46 (23 जोड़े)", "C) 2 (1 जोड़ा)", "D) 23"],
            ans: "A) 44 गुणसूत्र (22 जोड़े) ऑटोसोम होते हैं, जबकि 23वां जोड़ा लिंग गुणसूत्र (Allosome) होता है।",
          },
        ],
      },
      {
        number: 2,
        title: "मानव पाचन तंत्र एवं पोषण (Human Digestive System & Nutrition)",
        subtitle: "Digestive Tract, Enzymes, Vitamins & Metabolic Pathways",
        theory: [
          "पाचन (Digestion) एक भौतिक-रासायनिक प्रक्रिया है जिसमें जटिल अघुलनशील भोज्य पदार्थों को सरल अवशोषण योग्य अणुओं में परिवर्तित किया जाता है।",
          "मुख गुहा (Mouth Cavity): लार ग्रंथियों (Salivary Glands) द्वारा टायलिन/लार एमाइलेज (Salivary Amylase) स्रावित होता है, जो स्टार्च को माल्टोज में तोड़ता है। लार का pH मान लगभग 6.8 होता है।",
          "आमाशय (Stomach): जठर रस में हाइड्रोक्लोरिक अम्ल (HCl), पेप्सिन एवं रेनिन एंजाइम होते हैं। HCl भोजन के जीवाणुओं को नष्ट करता है तथा पेप्सिनोजन को सक्रिय पेप्सिन में बदलता है।",
          "यकृत (Liver): मानव शरीर की सबसे बड़ी ग्रंथि (लगभग 1.5 kg)। यकृत पित्त रस (Bile Juice) का निर्माण करता है, जो पित्ताशय (Gallbladder) में संचित होता है। पित्त रस में कोई पाचक एंजाइम नहीं होता, किंतु यह वसा का पायसीकरण (Emulsification) करता है।",
          "विटामिन (Vitamins): फंक (Funk) ने 1912 में खोज की। जल में घुलनशील: B एवं C; वसा में घुलनशील: A, D, E, K (ट्रिक: KEDA)।",
        ],
        highlights: [
          "🌟 बार-बार पूछे जाने वाले प्रश्न: विटामिन B12 (Cyanocobalamin) में कोबाल्ट (Cobalt) धातु पाई जाती है।",
          "💡 एग्जाम टिप: भोजन का सर्वाधिक पाचन एवं अवशोषण छोटी आंत के इलियम (Ileum) भाग में उपस्थित विली (Villi) द्वारा होता है।",
        ],
        practiceQuestions: [
          {
            q: "दूध के प्रोटीन (केसीन) को पचाने वाला एंजाइम कौन सा है?",
            options: ["A) पेप्सिन", "B) रेनिन (Rennin)", "C) ट्रिप्सिन", "D) एमाइलेज"],
            ans: "B) रेनिन (शिशुओं में दूध पाचन में सहायक)।",
          },
          {
            q: "रतौंधी (Night Blindness) किस विटामिन की कमी के कारण होता है?",
            options: ["A) विटामिन C", "B) विटामिन D", "C) विटामिन A (Retinol)", "D) विटामिन B1"],
            ans: "C) विटामिन A (रेटिनॉल) की कमी से रोडोप्सिन वर्णक का संश्लेषण बाधित होता है।",
          },
        ],
      },
      {
        number: 3,
        title: "मानव परिसंचरण तंत्र एवं रक्त (Circulatory System & Blood)",
        subtitle: "Heart Mechanics, Blood Groups, Rh Factor & Vessels",
        theory: [
          "विलियम हार्वे (William Harvey) ने 1628 में रक्त परिसंचरण तंत्र की खोज की थी। मानव परिसंचरण बंद एवं दोहरा (Closed & Double Circulation) होता है।",
          "रक्त (Blood): एक तरल संयोजी ऊतक (Fluid Connective Tissue) है। सामान्य वयस्क में 5-6 लीटर रक्त होता है। इसका pH मान 7.4 (हल्का क्षारीय) होता है।",
          "रक्त के घटक: 55% प्लाज्मा तथा 45% रक्त कणिकाएं (RBC, WBC, प्लेटलेट्स)। RBC का जीवनकाल 120 दिन होता है तथा इसका कब्रिस्तान प्लीहा (Spleen) कहलाता है।",
          "हृदय स्पंदन (Heartbeat): सामान्य दर 72 स्पंदन/मिनट। पेसमेकर (SA Node - Sinoatrial Node) को हृदय का पेसमेकर कहा जाता है, जो दाएं अलिंद में स्थित होता है।",
        ],
        highlights: [
          "🌟 रक्त समूह: कार्ल लैंडस्टीनर ने A, B, O रक्त समूह खोजे। AB+ सर्वग्राही (Universal Recipient) तथा O- सर्वदाता (Universal Donor) होता है।",
        ],
        practiceQuestions: [
          {
            q: "शरीर का कौन सा अंग रक्त बैंक (Blood Bank of Body) कहलाता है?",
            options: ["A) यकृत", "B) प्लीहा (Spleen/तिल्ली)", "C) हृदय", "D) वृक्क (Kidney)"],
            ans: "B) प्लीहा (Spleen) को शरीर का ब्लड बैंक तथा RBC का श्मशान कहा जाता है।",
          },
        ],
      },
    ],
  },
  {
    id: "mppsc-special",
    title: "MPPSC Special: मध्य प्रदेश सामान्य ज्ञान एवं कला-संस्कृति",
    subtitle: "Complete MP GK: Geography, Dynasties, Tribes & Schemes",
    targetExam: "MPPSC Pre & Mains, MP Police, Patwari & State Exams",
    subject: "Madhya Pradesh General Knowledge (MP GK)",
    author: "Satyadhi Sharma MPPSC Faculty Board",
    edition: "2026-27 Comprehensive Edition",
    totalPages: 210,
    coverColor: "from-sky-600 via-indigo-700 to-slate-900",
    chapters: [
      {
        number: 1,
        title: "मध्य प्रदेश का भौगोलिक स्वरूप एवं नदियां (Geography & River Systems)",
        subtitle: "Plateaus, Soil Types, Drainage Basin & Waterfalls",
        theory: [
          "मध्य प्रदेश को भारत का 'हृदय प्रदेश' (Heart of India) पंडित जवाहरलाल नेहरू ने कहा था। यह पूर्णतः भू-आवेष्टित (Landlocked) राज्य है, जिसकी सीमा 5 राज्यों से लगती है।",
          "नर्मदा नदी: मध्य प्रदेश की जीवन रेखा। उद्गम अमरकंटक (अनूपपुर) से। कुल लंबाई 1312 किमी (MP में 1077 किमी)। यह पूर्व से पश्चिम की ओर भ्रंश घाटी (Rift Valley) में बहती हुई खंभात की खाड़ी (अरब सागर) में गिरती है और एश्चुअरी बनाती है।",
          "चंबल नदी: उद्गम जानापाव पहाड़ी (महू, इंदौर)। यह यमुना की सहायक नदी है और बीहड़/खड्ड (Badland Topography) निर्माण के लिए प्रसिद्ध है।",
          "मध्य प्रदेश का सर्वोच्च शिखर: धूपगढ़ (1350 मीटर), जो सतपुड़ा पर्वत श्रेणी की महादेव पहाड़ियों पर पचमढ़ी में स्थित है।",
        ],
        highlights: [
          "🌟 परीक्षा सूत्र: मध्य प्रदेश को 'नदियों का मायका' भी कहा जाता है क्योंकि यहां से 200 से अधिक नदियां प्रवाहित होती हैं।",
          "💡 इंदौर स्पेशल: कान्ह और सरस्वती नदियां इंदौर शहर से प्रवाहित होती हैं, जिनका संगम कृष्णपुरा छत्री के समीप है।",
        ],
        practiceQuestions: [
          {
            q: "कपिलधारा एवं दुग्धधारा जलप्रपात किस नदी पर स्थित हैं?",
            options: ["A) चंबल नदी", "B) नर्मदा नदी", "C) सोन नदी", "D) बेतवा नदी"],
            ans: "B) नर्मदा नदी (अमरकंटक, अनूपपुर के समीप)।",
          },
          {
            q: "मध्य प्रदेश की सबसे ऊंची चोटी 'धूपगढ़' किस जिले में स्थित है?",
            options: ["A) छिंदवाड़ा", "B) होशंगाबाद (नर्मदापुरम)", "C) अनूपपुर", "D) सीहोर"],
            ans: "B) नर्मदापुरम (पचमढ़ी)।",
          },
        ],
      },
    ],
  },
];
