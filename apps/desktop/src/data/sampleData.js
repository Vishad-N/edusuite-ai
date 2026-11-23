// Sample slide decks still used by the Dashboard's sample-PPT download (see DN-049).

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
