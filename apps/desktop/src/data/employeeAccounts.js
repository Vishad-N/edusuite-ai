export const INITIAL_EMPLOYEES = [
  {
    id: "SUPER-001",
    name: "शर्मा सर (Super Admin)",
    fullName: "श्री सत्येन्द्र शर्मा (डायरेक्टर & सुपर एडमिन)",
    role: "superadmin",
    roleLabel: "👑 सुपर एडमिन (Super Admin)",
    email: "superadmin@satyadhi.com",
    phone: "+91 97706 77070",
    password: "123",
    branch: "हेड ऑफिस, भंवरकुआं, इंदौर",
    avatar: "👑",
    badgeColor: "bg-amber-400 text-slate-950 font-black",
    status: "active",
    createdAt: "2026-01-01",
    canManageUsers: true,
  },
  {
    id: "ADM-002",
    name: "ब्रांच मैनेजर",
    fullName: "राजेश वर्मा (भंवरकुआं ब्रांच एडमिन)",
    role: "admin",
    roleLabel: "🛡️ ब्रांच एडमिन (Branch Admin)",
    email: "admin@satyadhi.com",
    phone: "+91 98260 11223",
    password: "123",
    branch: "भंवरकुआं मेन ब्रांच, इंदौर",
    avatar: "👨‍💼",
    badgeColor: "bg-red-600 text-white font-bold",
    status: "active",
    createdAt: "2026-02-15",
    canManageUsers: false,
  },
  {
    id: "TCH-003",
    name: "ठाकुर सर (Teacher)",
    fullName: "ठाकुर सर (सीनियर मैथ्स फैकल्टी)",
    role: "teacher",
    roleLabel: "👨‍🏫 शिक्षक / फैकल्टी (Teacher)",
    email: "teacher@satyadhi.com",
    phone: "+91 98930 22334",
    password: "123",
    branch: "भंवरकुआं मेन ब्रांच, इंदौर",
    avatar: "👨‍🏫",
    badgeColor: "bg-amber-500 text-slate-950 font-bold",
    status: "active",
    createdAt: "2026-03-01",
    canManageUsers: false,
  },
  {
    id: "DTP-004",
    name: "राहुल जोशी (Typist)",
    fullName: "राहुल जोशी (DTP & PPT ऑपरेटर)",
    role: "typist",
    roleLabel: "⌨️ DTP / टाइपिस्ट (Typist)",
    email: "typist@satyadhi.com",
    phone: "+91 91111 22334",
    password: "123",
    branch: "डिजिटल मीडिया सेल, इंदौर",
    avatar: "⌨️",
    badgeColor: "bg-blue-600 text-white font-bold",
    status: "active",
    createdAt: "2026-04-10",
    canManageUsers: false,
  },
  {
    id: "STF-005",
    name: "प्रिया सिंह (Counselor)",
    fullName: "प्रिया सिंह (काउंसलर & फीस काउंटर)",
    role: "counselor",
    roleLabel: "🪪 एडमिशन काउंसलर (Staff User)",
    email: "staff@satyadhi.com",
    phone: "+91 98260 55443",
    password: "123",
    branch: "हेल्पडेस्क काउंटर, इंदौर",
    avatar: "🪪",
    badgeColor: "bg-emerald-600 text-white font-bold",
    status: "active",
    createdAt: "2026-05-01",
    canManageUsers: false,
  },
];

// Load persisted users or fall back to initial
export function getSavedUsers() {
  try {
    const raw = localStorage.getItem("satyadhi_users_db");
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {
    // fallback
  }
  return INITIAL_EMPLOYEES;
}

export function saveUsers(users) {
  try {
    localStorage.setItem("satyadhi_users_db", JSON.stringify(users));
  } catch (err) {
    console.error("Failed to save users:", err);
  }
}

export const DEFAULT_EMPLOYEES = INITIAL_EMPLOYEES;
