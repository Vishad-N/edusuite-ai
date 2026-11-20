import React from "react";
import {
  LayoutDashboard,
  Presentation,
  Image as ImageIcon,
  FileQuestion,
  BookOpen,
  MessageSquareShare,
  HelpCircle,
  BookMarked,
  Video,
  FileSpreadsheet,
  CreditCard,
  Lightbulb,
  Camera,
  GraduationCap,
  Users,
  Crown,
} from "lucide-react";

export default function Sidebar({ activeTab, setActiveTab, t, lang, currentUser }) {
  const isSuperAdmin = currentUser?.role === "superadmin" || currentUser?.canManageUsers;

  const navGroups = [
    {
      group: t.grpDashboard,
      items: [
        {
          id: "dashboard",
          label: t.navDashboard,
          icon: LayoutDashboard,
          badge: "Home",
        },
        ...(isSuperAdmin
          ? [
              {
                id: "users",
                label: "यूजर व स्टाफ प्रबंधन",
                icon: Crown,
                badge: "Admin",
              },
            ]
          : []),
        {
          id: "teacher_desk",
          label: t.navTeacherDesk || "शिक्षक पोर्टल (Faculty Desk)",
          icon: GraduationCap,
          badge: "टीचर",
        },
      ],
    },
    {
      group: t.grpDigital,
      items: [
        {
          id: "ocr_ppt",
          label: t.navScreenshotPpt || "स्क्रीनशॉट से PPT",
          icon: Camera,
          badge: "नया",
        },
        {
          id: "youtube",
          label: t.navYoutube,
          icon: Video,
          badge: "16:9",
        },
        {
          id: "ppt",
          label: t.navPpt,
          icon: Presentation,
          badge: "PPTX",
        },
        {
          id: "doubt",
          label: t.navDoubt,
          icon: Lightbulb,
          badge: "AI",
        },
      ],
    },
    {
      group: t.grpStudy,
      items: [
        {
          id: "book",
          label: t.navBook,
          icon: BookMarked,
          badge: "Book",
        },
        {
          id: "dpp",
          label: t.navDpp,
          icon: FileSpreadsheet,
          badge: "DPP",
        },
        {
          id: "test",
          label: t.navTest,
          icon: FileQuestion,
          badge: "Exam",
        },
        {
          id: "lesson",
          label: t.navLesson,
          icon: BookOpen,
          badge: null,
        },
      ],
    },
    {
      group: t.grpAdmin,
      items: [
        {
          id: "receipt",
          label: t.navReceipt,
          icon: CreditCard,
          badge: "Admin",
        },
        {
          id: "image",
          label: t.navImage,
          icon: ImageIcon,
          badge: "HD",
        },
        {
          id: "notice",
          label: t.navNotice,
          icon: MessageSquareShare,
          badge: "WA",
        },
      ],
    },
  ];

  return (
    <aside className="w-64 bg-white border-r border-slate-200 flex flex-col justify-between shrink-0 select-none overflow-y-auto shadow-sm">
      {/* Navigation Links */}
      <div className="p-3 space-y-4">
        {navGroups.map((grp, gIdx) => (
          <div key={gIdx} className="space-y-1">
            <div className="px-3 py-1 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              {grp.group}
            </div>

            {grp.items.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-left transition-all group ${
                    isActive
                      ? "bg-amber-400 text-slate-950 font-bold shadow-sm"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-100 font-medium"
                  }`}
                >
                  <Icon
                    className={`w-4 h-4 shrink-0 transition-transform ${
                      isActive ? "text-slate-950" : "text-slate-500 group-hover:text-slate-800"
                    }`}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-xs truncate">{item.label}</span>
                      {item.badge && (
                        <span
                          className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase ${
                            isActive
                              ? "bg-slate-950 text-amber-300"
                              : "bg-slate-100 text-slate-600 group-hover:bg-slate-200"
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {/* Bottom Profile / Institute Info */}
      <div className="p-3 border-t border-slate-200 bg-slate-50 space-y-2 shrink-0">
        <div className="flex items-center gap-2.5 px-2 py-1">
          <div className="w-8 h-8 rounded-lg bg-amber-400 flex items-center justify-center text-slate-950 font-black text-xs shadow-sm">
            SSC
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="text-xs font-bold text-slate-900 truncate">
              {t.sidebarInstitute}
            </h4>
            <p className="text-[10px] text-slate-500">
              {t.sidebarSub}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between px-2 pt-1 border-t border-slate-200 text-[10px] text-slate-500">
          <span>{t.sidebarSystem}</span>
          <span className="text-amber-700 font-semibold cursor-pointer hover:underline">
            {t.guide}
          </span>
        </div>
      </div>
    </aside>
  );
}
