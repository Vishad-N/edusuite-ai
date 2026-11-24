import { useEffect, useMemo, useState, type ComponentType } from "react";
import {
  createHashRouter,
  Navigate,
  Outlet,
  RouterProvider,
  useLocation,
  useNavigate,
  useOutletContext,
  useParams,
} from "react-router";
import { useQuery } from "@tanstack/react-query";
import { SCREEN_PERMISSIONS, can, visibleScreens, type Institute, type Role, type ScreenId, type SessionUser } from "@edusuite/shared";
import Header from "./components/Header";
import Sidebar from "./components/Sidebar";
import Dashboard from "./components/Dashboard";
import BookCreator from "./components/BookCreator";
import PptMaker from "./components/PptMaker";
import ImageStudio from "./components/ImageStudio";
import QuestionPaperMaker from "./components/QuestionPaperMaker";
import LessonPlanner from "./components/LessonPlanner";
import NoticeHub from "./components/NoticeHub";
import YouTubeStudio from "./components/YouTubeStudio";
import NotebookDppMaker from "./components/NotebookDppMaker";
import IdAndFeeReceipt from "./components/IdAndFeeReceipt";
import DoubtSolver from "./components/DoubtSolver";
import ScreenshotToPpt from "./components/ScreenshotToPpt";
import TeacherDesk from "./components/TeacherDesk";
import UserManagement from "./components/UserManagement.tsx";
import PlatformCredits from "./components/PlatformCredits.tsx";
import DeckQuiz from "./components/DeckQuiz.tsx";
import LoginScreen from "./components/LoginScreen.tsx";
import SettingsModal from "./components/SettingsModal.tsx";
import { translations } from "./data/translations";
import { useSession, useSignedInUser } from "./api/session.tsx";
import { Skeleton } from "./components/ui/index.ts";
import { setUiLanguage, tx } from "./i18n/index.ts";

/** Props every screen receives (the same names the screens used before the router). */
export type ScreenProps = {
  activeInstitute: LegacyInstitute;
  onNavigate: (screen: string) => void;
  t: (typeof translations)["hi"];
  lang: "hi" | "en";
  currentUser: LegacyUser;
};

// Screens are still JSX without prop types; they receive ScreenProps.
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- untyped JSX components (converted as each is migrated, DN-011)
type AnyScreen = ComponentType<any>;

const SCREENS: Record<ScreenId, AnyScreen> = {
  dashboard: Dashboard,
  platform: PlatformCredits,
  users: UserManagement,
  teacher_desk: TeacherDesk,
  ocr_ppt: ScreenshotToPpt,
  deck_quiz: DeckQuiz,
  youtube: YouTubeStudio,
  ppt: PptMaker,
  doubt: DoubtSolver,
  book: BookCreator,
  dpp: NotebookDppMaker,
  test: QuestionPaperMaker,
  lesson: LessonPlanner,
  receipt: IdAndFeeReceipt,
  image: ImageStudio,
  notice: NoticeHub,
};

/** What the older screens expect in `activeInstitute`, now filled from the API. */
export type LegacyInstitute = { id: string; name: string; tagline: string; phone: string; city: string; logo?: string };

/** What the older screens expect in `currentUser`. */
export type LegacyUser = { id: string; name: string; fullName: string; role: Role; roleLabel: string; avatar: string };

const ROLE_LABELS: Record<Role, { hi: string; en: string; avatar: string }> = {
  superadmin: { hi: "सुपर एडमिन", en: "Super Admin", avatar: "👑" },
  branch_admin: { hi: "ब्रांच एडमिन", en: "Branch Admin", avatar: "🛡️" },
  teacher: { hi: "शिक्षक", en: "Teacher", avatar: "👨‍🏫" },
  typist: { hi: "DTP / टाइपिस्ट", en: "DTP / Typist", avatar: "⌨️" },
  counselor: { hi: "काउंसलर", en: "Counselor", avatar: "🪪" },
  platform_admin: { hi: "EduSuite ऑपरेटर", en: "EduSuite Operator", avatar: "🛰️" },
};

export function roleLabel(role: Role, lang: "hi" | "en"): string {
  return ROLE_LABELS[role][lang];
}

function toLegacyUser(user: SessionUser, lang: "hi" | "en"): LegacyUser {
  return {
    id: user.id,
    name: user.displayName,
    fullName: user.fullName,
    role: user.role,
    roleLabel: ROLE_LABELS[user.role][lang],
    avatar: ROLE_LABELS[user.role].avatar,
  };
}

function screenPath(screen: string): string {
  return screen === "dashboard" ? "/" : `/${screen}`;
}

function useLanguage(): ["hi" | "en", (lang: "hi" | "en") => void] {
  const [lang, setLang] = useState<"hi" | "en">(() => {
    try {
      return localStorage.getItem("edusuite_lang") === "en" ? "en" : "hi";
    } catch {
      return "hi";
    }
  });
  // tx() reads this; set during render, so every screen below renders in the new language (DN-064).
  setUiLanguage(lang);
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);
  const change = (next: "hi" | "en") => {
    setLang(next);
    try {
      localStorage.setItem("edusuite_lang", next);
    } catch {
      // Language still changes for this run.
    }
  };
  return [lang, change];
}

function FullScreenLoading() {
  return (
    <div className="flex h-screen w-screen items-center justify-center bg-page">
      <Skeleton lines={3} label={tx("सत्र जाँचा जा रहा है…")} className="w-72" />
    </div>
  );
}

/** Signed-out visitors go to /login and come back to the same screen afterwards. */
function RequireAuth() {
  const { state } = useSession();
  const location = useLocation();
  if (state.status === "loading") return <FullScreenLoading />;
  if (state.status === "signedOut") {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  return <AppShell />;
}

function LoginRoute() {
  const { state, login } = useSession();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from;
  if (state.status === "loading") return <FullScreenLoading />;
  if (state.status === "signedIn") return <Navigate to={from && from !== "/login" ? from : "/"} replace />;
  return <LoginScreen onLogin={login} endedBecause={state.endedBecause} />;
}

function AppShell() {
  const user = useSignedInUser();
  const { client, logout } = useSession();
  const navigate = useNavigate();
  const location = useLocation();
  const [lang, setLang] = useLanguage();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const t = translations[lang] ?? translations.hi;

  const institute = useQuery({
    queryKey: ["institute", user.institute.id],
    queryFn: () => client.get<Institute>(`/institutes/${user.institute.id}`),
  });

  const activeInstitute: LegacyInstitute = useMemo(
    () => ({
      id: user.institute.id,
      name: institute.data?.name ?? user.institute.name,
      tagline: institute.data?.branding.tagline ?? "",
      phone: institute.data?.branding.phone ?? "",
      city: institute.data?.branding.city ?? "",
    }),
    [institute.data, user.institute],
  );

  const currentUser = toLegacyUser(user, lang);
  const activeTab = location.pathname === "/" ? "dashboard" : location.pathname.slice(1);
  const onNavigate = (screen: string) => navigate(screenPath(screen));
  const canEditSettings = can(user.role, "institute.settings");

  const screenProps: ScreenProps = {
    activeInstitute,
    onNavigate,
    t,
    lang,
    currentUser,
  };

  return (
    <div className="h-screen w-screen flex flex-col bg-slate-100 text-slate-900 overflow-hidden font-sans">
      <Header
        instituteName={activeInstitute.name}
        branchName={user.branch.name}
        phone={activeInstitute.phone}
        lang={lang}
        onLanguageChange={setLang}
        t={t}
        currentUser={currentUser}
        onLogout={async () => {
          await logout();
          navigate("/login", { replace: true });
        }}
        onOpenSettings={canEditSettings ? () => setSettingsOpen(true) : undefined}
      />
      <div className="flex-1 flex overflow-hidden">
        <Sidebar
          activeTab={activeTab}
          setActiveTab={onNavigate}
          t={t}
          allowedScreens={visibleScreens(user.role)}
          instituteName={activeInstitute.name}
          branchName={user.branch.name}
        />
        <main className="flex-1 overflow-y-auto bg-slate-100/70 p-6 md:p-8">
          <div className="max-w-7xl mx-auto">
            <Outlet context={screenProps} />
          </div>
        </main>
      </div>
      {canEditSettings && (
        <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} user={user} />
      )}
    </div>
  );
}

/** Renders the screen named in the URL, if the role may open it (permissions.ts). */
function ScreenRoute({ forced }: { forced?: ScreenId }) {
  const user = useSignedInUser();
  const params = useParams();
  const screen = (forced ?? params.screen) as ScreenId;
  const props = useOutletContextProps();
  const allowed = visibleScreens(user.role);
  if (!(screen in SCREEN_PERMISSIONS) || !allowed.includes(screen)) {
    // Roles without a dashboard (the EduSuite operator, DN-053) land on their first screen.
    const home = allowed.includes("dashboard") ? "/" : allowed[0] ? `/${allowed[0]}` : "/login";
    return <Navigate to={home} replace />;
  }
  const Screen = SCREENS[screen];
  return <Screen {...props} />;
}

function useOutletContextProps(): ScreenProps {
  return useOutletContext<ScreenProps>();
}

const router = createHashRouter([
  { path: "/login", element: <LoginRoute /> },
  {
    path: "/",
    element: <RequireAuth />,
    children: [
      { index: true, element: <ScreenRoute forced="dashboard" /> },
      { path: ":screen", element: <ScreenRoute /> },
    ],
  },
  { path: "*", element: <Navigate to="/" replace /> },
]);

export default function App() {
  return <RouterProvider router={router} />;
}
