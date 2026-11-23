import React from "react";
import { GraduationCap, BookOpen, Camera, FileSpreadsheet, Lightbulb, FileQuestion, ChevronRight, CalendarClock } from "lucide-react";
import { DOCUMENT_TYPE_LABELS, visibleScreens } from "@edusuite/shared";
import { useSignedInUser } from "../api/session.tsx";
import { useDashboardStats } from "../api/stats.ts";
import { ApiError } from "../api/client.ts";
import { RecentDocuments } from "./RecentDocuments.tsx";
import { EmptyState, ErrorState, PageHeader, Skeleton } from "./ui/index.ts";

const TOOLS = [
  { id: "ocr_ppt", icon: Camera, title: "स्क्रीनशॉट से PPT", desc: "प्रश्नों के स्क्रीनशॉट से स्मार्टबोर्ड PPT बनाएँ।" },
  { id: "dpp", icon: FileSpreadsheet, title: "डेली DPP & OMR शीट", desc: "आज के लेक्चर के प्रश्न, नोटबुक पेज या OMR शीट प्रिंट करें।" },
  { id: "doubt", icon: Lightbulb, title: "डाउट सॉल्वर", desc: "कठिन प्रश्नों का चरणबद्ध हल और शॉर्टकट ट्रिक लिखें।" },
  { id: "lesson", icon: BookOpen, title: "लेसन प्लानर", desc: "अध्याय के लक्ष्य और दिन-वार योजना तैयार करें।" },
  { id: "test", icon: FileQuestion, title: "टेस्ट पेपर & आंसर-की", desc: "सेक्शन-वार पेपर और आंसर-की बनाएँ।" },
];

export default function TeacherDesk({ activeInstitute, onNavigate, currentUser }) {
  const user = useSignedInUser();
  const allowed = new Set(visibleScreens(user.role));
  const tools = TOOLS.filter((tool) => allowed.has(tool.id));
  const stats = useDashboardStats();
  const myCounts = stats.data
    ? Object.entries(stats.data.byType)
        .filter(([, c]) => c.mine > 0)
        .sort((a, b) => b[1].mine - a[1].mine)
    : [];

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<GraduationCap className="size-6" />}
        title={`शिक्षक पोर्टल · ${user.displayName}`}
        badge={currentUser?.roleLabel}
        description={`${activeInstitute.name} · ${user.branch.name}। अपना हाल का काम खोलें या किसी टूल से नया काम शुरू करें।`}
      />

      {/* Tools */}
      {tools.length > 0 && (
        <div className="space-y-3 rounded-card border border-line bg-surface p-4 text-ink">
          <h2 className="text-label font-semibold">त्वरित टूल्स</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {tools.map((tool) => {
              const Icon = tool.icon;
              return (
                <button
                  key={tool.id}
                  type="button"
                  onClick={() => onNavigate(tool.id)}
                  className="group flex flex-col justify-between rounded-card border border-line p-4 text-left transition hover:border-accent hover:bg-accent-subtle"
                >
                  <span>
                    <Icon className="mb-2 size-5" aria-hidden="true" />
                    <span className="block text-label font-semibold">{tool.title}</span>
                    <span className="mt-1 block text-caption text-muted">{tool.desc}</span>
                  </span>
                  <ChevronRight className="mt-3 size-4 self-end transition group-hover:translate-x-1" aria-hidden="true" />
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* My recent documents */}
        <div className="space-y-3 rounded-card border border-line bg-surface p-4 text-ink lg:col-span-7">
          <h2 className="text-label font-semibold">मेरे हाल के दस्तावेज़</h2>
          {stats.isPending ? (
            <Skeleton lines={4} />
          ) : stats.isError ? (
            <ErrorState
              title="दस्तावेज़ लोड नहीं हुए"
              message={stats.error instanceof ApiError ? stats.error.message : undefined}
              onRetry={() => void stats.refetch()}
            />
          ) : (
            <RecentDocuments
              items={stats.data.recentMine}
              showAuthor={false}
              emptyTitle="आपने अभी कुछ सेव नहीं किया"
              emptyDescription="किसी टूल में काम करके “सेव करें” दबाएँ; वह यहाँ दिखेगा।"
            />
          )}
        </div>

        <div className="space-y-6 lg:col-span-5">
          {/* My counts per type */}
          <div className="space-y-3 rounded-card border border-line bg-surface p-4 text-ink">
            <h2 className="text-label font-semibold">
              मेरा काम{stats.data ? ` · कुल ${stats.data.totals.mine.toLocaleString("hi-IN")}` : ""}
            </h2>
            {stats.data &&
              (myCounts.length === 0 ? (
                <p className="text-caption text-muted">अभी कोई दस्तावेज़ नहीं।</p>
              ) : (
                <ul className="divide-y divide-line">
                  {myCounts.map(([type, c]) => (
                    <li key={type} className="flex items-center justify-between py-2 text-label">
                      <span>{DOCUMENT_TYPE_LABELS[type]}</span>
                      <span className="font-semibold">{c.mine.toLocaleString("hi-IN")}</span>
                    </li>
                  ))}
                </ul>
              ))}
          </div>

          {/* DN-021: timetables and syllabus tracking aren't part of the plan yet. */}
          <div className="rounded-card border border-line bg-surface p-4 text-ink">
            <EmptyState
              icon={<CalendarClock className="size-6" />}
              title="टाइमटेबल और सिलेबस ट्रैकर जल्द आ रहा है"
              description="कक्षाओं का शेड्यूल और सिलेबस की प्रगति अभी इस ऐप में दर्ज नहीं होती।"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
