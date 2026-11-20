import React, { useState, useEffect } from "react";
import {
  Users,
  UserPlus,
  ShieldAlert,
  Crown,
  Key,
  Trash2,
  Edit2,
  CheckCircle2,
  XCircle,
  Eye,
  EyeOff,
  Building,
  Phone,
  Mail,
  Search,
  Filter,
  Sparkles,
  Lock,
  Unlock,
  AlertTriangle,
} from "lucide-react";
import confetti from "canvas-confetti";
import { getSavedUsers, saveUsers } from "../data/employeeAccounts";

export default function UserManagement({ currentUser, activeInstitute }) {
  const [users, setUsers] = useState(getSavedUsers);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [visiblePasswords, setVisiblePasswords] = useState({});

  // Form State
  const [formData, setFormData] = useState({
    name: "",
    fullName: "",
    role: "teacher",
    email: "",
    phone: "",
    password: "123",
    branch: "भंवरकुआं मेन ब्रांच, इंदौर",
  });

  useEffect(() => {
    saveUsers(users);
  }, [users]);

  // Open modal for new user
  const handleOpenAdd = () => {
    setEditingUser(null);
    setFormData({
      name: "",
      fullName: "",
      role: "teacher",
      email: "",
      phone: "",
      password: "123",
      branch: "भंवरकुआं मेन ब्रांच, इंदौर",
    });
    setIsModalOpen(true);
  };

  // Open modal for editing user
  const handleOpenEdit = (user) => {
    setEditingUser(user);
    setFormData({
      name: user.name,
      fullName: user.fullName || user.name,
      role: user.role,
      email: user.email,
      phone: user.phone || "",
      password: user.password,
      branch: user.branch || "भंवरकुआं मेन ब्रांच, इंदौर",
    });
    setIsModalOpen(true);
  };

  // Save new or updated user
  const handleSaveUser = (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.email.trim()) {
      alert("कृपया नाम और ईमेल/लॉगिन ID अनिवार्य रूप से भरें।");
      return;
    }

    const roleConfig = {
      superadmin: {
        roleLabel: "👑 सुपर एडमिन (Super Admin)",
        avatar: "👑",
        badgeColor: "bg-amber-400 text-slate-950 font-black",
      },
      admin: {
        roleLabel: "🛡️ ब्रांच एडमिन (Branch Admin)",
        avatar: "👨‍💼",
        badgeColor: "bg-red-600 text-white font-bold",
      },
      teacher: {
        roleLabel: "👨‍🏫 शिक्षक / फैकल्टी (Teacher)",
        avatar: "👨‍🏫",
        badgeColor: "bg-amber-500 text-slate-950 font-bold",
      },
      typist: {
        roleLabel: "⌨️ DTP / टाइपिस्ट (Typist)",
        avatar: "⌨️",
        badgeColor: "bg-blue-600 text-white font-bold",
      },
      counselor: {
        roleLabel: "🪪 एडमिशन काउंसलर (Staff User)",
        avatar: "🪪",
        badgeColor: "bg-emerald-600 text-white font-bold",
      },
    };

    const cfg = roleConfig[formData.role] || roleConfig.teacher;

    if (editingUser) {
      // Update existing
      const updated = users.map((u) =>
        u.id === editingUser.id
          ? {
              ...u,
              ...formData,
              roleLabel: cfg.roleLabel,
              avatar: cfg.avatar,
              badgeColor: cfg.badgeColor,
            }
          : u
      );
      setUsers(updated);
    } else {
      // Create new
      const newUser = {
        id: `USR-${Math.floor(1000 + Math.random() * 9000)}`,
        ...formData,
        roleLabel: cfg.roleLabel,
        avatar: cfg.avatar,
        badgeColor: cfg.badgeColor,
        status: "active",
        createdAt: new Date().toISOString().split("T")[0],
        canManageUsers: formData.role === "superadmin",
      };
      setUsers([newUser, ...users]);
      confetti({ particleCount: 30, spread: 60, origin: { y: 0.6 } });
    }

    setIsModalOpen(false);
  };

  // Toggle user status (Active / Blocked)
  const handleToggleStatus = (userId) => {
    const updated = users.map((u) => {
      if (u.id === userId) {
        if (u.role === "superadmin") {
          alert("सुपर एडमिन को ब्लॉक नहीं किया जा सकता।");
          return u;
        }
        return {
          ...u,
          status: u.status === "active" ? "blocked" : "active",
        };
      }
      return u;
    });
    setUsers(updated);
  };

  // Delete user
  const handleDeleteUser = (userId) => {
    const target = users.find((u) => u.id === userId);
    if (target?.role === "superadmin") {
      alert("सुपर एडमिन अकाउंट को डिलीट नहीं किया जा सकता।");
      return;
    }
    if (window.confirm(`क्या आप यूजर "${target?.name}" को सचमुच डिलीट करना चाहते हैं?`)) {
      setUsers(users.filter((u) => u.id !== userId));
    }
  };

  // Toggle password visibility
  const togglePasswordVisibility = (userId) => {
    setVisiblePasswords((prev) => ({
      ...prev,
      [userId]: !prev[userId],
    }));
  };

  // Filtered users
  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.phone && u.phone.includes(searchTerm));
    const matchesRole = roleFilter === "all" || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  return (
    <div className="space-y-6 select-none">
      {/* Top Banner: Super Admin Badge */}
      <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 text-white rounded-2xl p-6 shadow-xl border border-amber-500/30 relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-full bg-gradient-to-l from-amber-500/15 to-transparent pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-3 py-1 rounded-full text-xs font-black bg-amber-400 text-slate-950 flex items-center gap-1 shadow-md">
                <Crown className="w-3.5 h-3.5" /> सुपर एडमिन कंट्रोल पैनल (Master Access)
              </span>
              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-600 text-white">
                RBAC सुरक्षा
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight flex items-center gap-2">
              👑 यूजर व कर्मचारी प्रबंधन केंद्र
            </h1>
            <p className="text-xs md:text-sm text-slate-300 mt-1 max-w-2xl leading-relaxed">
              सत्याधी शर्मा क्लासेस के सभी शिक्षकों, DTP टाइपिस्ट, काउंसलर्स और एडमिन का पासवर्ड, परमिशन व अकाउंट यहाँ से नियंत्रित करें।
            </p>
          </div>

          <button
            onClick={handleOpenAdd}
            className="px-5 py-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs md:text-sm flex items-center gap-2 shadow-lg shadow-amber-400/20 transition transform active:scale-95 cursor-pointer whitespace-nowrap"
          >
            <UserPlus className="w-4 h-4 text-slate-950" />
            + नया यूजर / कर्मचारी जोड़ें
          </button>
        </div>
      </div>

      {/* Role Counts Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          {
            label: "कुल कर्मचारी (Total Users)",
            count: users.length,
            icon: Users,
            color: "text-blue-600 bg-blue-50 border-blue-200",
          },
          {
            label: "शिक्षक / फैकल्टी (Teachers)",
            count: users.filter((u) => u.role === "teacher").length,
            icon: Crown,
            color: "text-amber-600 bg-amber-50 border-amber-200",
          },
          {
            label: "DTP टाइपिस्ट (Typists)",
            count: users.filter((u) => u.role === "typist").length,
            icon: Edit2,
            color: "text-purple-600 bg-purple-50 border-purple-200",
          },
          {
            label: "स्टाफ & काउंसलर (Staff)",
            count: users.filter((u) => u.role === "counselor" || u.role === "admin").length,
            icon: ShieldAlert,
            color: "text-emerald-600 bg-emerald-50 border-emerald-200",
          },
        ].map((item, idx) => {
          const Icon = item.icon;
          return (
            <div
              key={idx}
              className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm flex items-center justify-between"
            >
              <div>
                <span className="text-xs font-semibold text-slate-500 block">
                  {item.label}
                </span>
                <span className="text-2xl font-black text-slate-900 mt-1 block">
                  {item.count}
                </span>
              </div>
              <span className={`p-3 rounded-xl border ${item.color}`}>
                <Icon className="w-5 h-5" />
              </span>
            </div>
          );
        })}
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1 max-w-md">
          <div className="relative w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="यूजर नाम, ईमेल या मोबाइल से खोजें..."
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 focus:outline-none focus:border-amber-400 bg-slate-50 focus:bg-white"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-xs font-bold text-slate-500">रोल फ़िल्टर:</span>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="p-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-700 focus:outline-none focus:border-amber-400"
          >
            <option value="all">सभी रोल्स (All Roles)</option>
            <option value="superadmin">👑 सुपर एडमिन (Super Admin)</option>
            <option value="teacher">👨‍🏫 शिक्षक (Teacher)</option>
            <option value="typist">⌨️ टाइपिस्ट (Typist)</option>
            <option value="counselor">🪪 काउंसलर / स्टाफ (Staff)</option>
            <option value="admin">🛡️ ब्रांच एडमिन (Admin)</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900 text-white uppercase text-[10px] tracking-wider font-bold">
              <tr>
                <th className="p-4">कर्मचारी / यूजर</th>
                <th className="p-4">रोल (Role)</th>
                <th className="p-4">लॉगिन ID / ईमेल</th>
                <th className="p-4">पासवर्ड (Super Admin)</th>
                <th className="p-4">कार्यरत ब्रांच</th>
                <th className="p-4 text-center">स्थिति (Status)</th>
                <th className="p-4 text-right">कार्रवाई (Action)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredUsers.map((user) => (
                <tr
                  key={user.id}
                  className={`hover:bg-slate-50/80 transition ${
                    user.status === "blocked" ? "opacity-60 bg-slate-50" : ""
                  }`}
                >
                  {/* User Name & Avatar */}
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <span className="w-9 h-9 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-lg shadow-sm">
                        {user.avatar || "👤"}
                      </span>
                      <div>
                        <div className="font-black text-slate-900 text-xs md:text-sm flex items-center gap-1.5">
                          {user.name}
                          {user.role === "superadmin" && (
                            <Crown className="w-3.5 h-3.5 text-amber-500 fill-amber-400" />
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {user.fullName || user.id}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Role Badge */}
                  <td className="p-4">
                    <span
                      className={`px-2.5 py-1 rounded-full text-[10px] ${
                        user.badgeColor || "bg-slate-100 text-slate-700 font-bold"
                      }`}
                    >
                      {user.roleLabel || user.role}
                    </span>
                  </td>

                  {/* Email & Phone */}
                  <td className="p-4">
                    <div className="font-semibold text-slate-800">
                      {user.email}
                    </div>
                    {user.phone && (
                      <div className="text-[11px] text-slate-400">
                        {user.phone}
                      </div>
                    )}
                  </td>

                  {/* Password with Reveal Button */}
                  <td className="p-4">
                    <div className="flex items-center gap-1.5 font-mono text-slate-700 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200 w-fit">
                      <span>
                        {visiblePasswords[user.id] ? user.password : "••••••"}
                      </span>
                      <button
                        type="button"
                        onClick={() => togglePasswordVisibility(user.id)}
                        className="text-slate-400 hover:text-slate-700 transition"
                        title={visiblePasswords[user.id] ? "छुपाएं" : "देखें"}
                      >
                        {visiblePasswords[user.id] ? (
                          <EyeOff className="w-3.5 h-3.5" />
                        ) : (
                          <Eye className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </td>

                  {/* Branch */}
                  <td className="p-4 text-slate-600 font-medium">
                    {user.branch || "भंवरकुआं मेन ब्रांच"}
                  </td>

                  {/* Status Toggle */}
                  <td className="p-4 text-center">
                    <button
                      type="button"
                      onClick={() => handleToggleStatus(user.id)}
                      className={`px-2.5 py-1 rounded-full font-bold text-[10px] inline-flex items-center gap-1 cursor-pointer transition ${
                        user.status === "active"
                          ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                          : "bg-rose-100 text-rose-800 hover:bg-rose-200"
                      }`}
                      title="स्थिति बदलने हेतु क्लिक करें"
                    >
                      {user.status === "active" ? (
                        <>
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" /> सक्रिय
                        </>
                      ) : (
                        <>
                          <XCircle className="w-3 h-3 text-rose-600" /> ब्लॉक
                        </>
                      )}
                    </button>
                  </td>

                  {/* Actions */}
                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(user)}
                        className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 transition"
                        title="यूजर एडिट करें"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      {user.role !== "superadmin" && (
                        <button
                          type="button"
                          onClick={() => handleDeleteUser(user.id)}
                          className="p-1.5 rounded-lg border border-rose-200 hover:bg-rose-50 text-rose-600 transition"
                          title="यूजर डिलीट करें"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit User Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-700 rounded-3xl p-6 md:p-8 text-white shadow-2xl space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Crown className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-black text-white">
                  {editingUser ? "यूजर विवरण अपडेट करें" : "नया यूजर / कर्मचारी जोड़ें"}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-400 hover:text-white text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveUser} className="space-y-4 text-xs">
              {/* Name */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-300 font-bold">शॉर्ट नाम (उदा. शर्मा सर):</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    placeholder="उदा. अमित सर"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white focus:outline-none focus:border-amber-400"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-300 font-bold">पूरा नाम (Full Name):</label>
                  <input
                    type="text"
                    value={formData.fullName}
                    onChange={(e) =>
                      setFormData({ ...formData, fullName: e.target.value })
                    }
                    placeholder="उदा. श्री अमित पटेल"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              {/* Role & Branch */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-300 font-bold">असाइंड रोल (User Role):</label>
                  <select
                    value={formData.role}
                    onChange={(e) =>
                      setFormData({ ...formData, role: e.target.value })
                    }
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white font-bold focus:outline-none focus:border-amber-400"
                  >
                    <option value="teacher">👨‍🏫 शिक्षक / फैकल्टी (Teacher)</option>
                    <option value="typist">⌨️ DTP / टाइपिस्ट (Typist)</option>
                    <option value="counselor">🪪 एडमिशन स्टाफ / काउंसलर (Staff)</option>
                    <option value="admin">🛡️ ब्रांच एडमिन (Branch Admin)</option>
                    <option value="superadmin">👑 सुपर एडमिन (Super Admin)</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-slate-300 font-bold">ब्रांच (Branch):</label>
                  <select
                    value={formData.branch}
                    onChange={(e) =>
                      setFormData({ ...formData, branch: e.target.value })
                    }
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white focus:outline-none focus:border-amber-400"
                  >
                    <option value="भंवरकुआं मेन ब्रांच, इंदौर">
                      भंवरकुआं मेन ब्रांच, इंदौर
                    </option>
                    <option value="गीता भवन ब्रांच, इंदौर">
                      गीता भवन ब्रांच, इंदौर
                    </option>
                    <option value="विजयनगर डिजिटल सेंटर, इंदौर">
                      विजयनगर डिजिटल सेंटर, इंदौर
                    </option>
                  </select>
                </div>
              </div>

              {/* Login Email & Phone */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-300 font-bold">लॉगिन ID / ईमेल:</label>
                  <input
                    type="text"
                    required
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    placeholder="उदा. amit@satyadhi.com या EMP-101"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white focus:outline-none focus:border-amber-400"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-300 font-bold">मोबाइल नंबर:</label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) =>
                      setFormData({ ...formData, phone: e.target.value })
                    }
                    placeholder="+91 98260 xxxxx"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1">
                <label className="text-slate-300 font-bold">लॉगिन पासवर्ड / पिन:</label>
                <input
                  type="text"
                  required
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  placeholder="डिफ़ॉल्ट पासवर्ड (उदा. 123)"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white font-mono focus:outline-none focus:border-amber-400"
                />
              </div>

              {/* Buttons */}
              <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold"
                >
                  रद्द करें
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black flex items-center gap-1.5 shadow-md"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  {editingUser ? "अपडेट सुरक्षित करें" : "यूजर सुरक्षित करें"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
