import React, { useState } from "react";
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
import UserManagement from "./components/UserManagement";
import LoginScreen from "./components/LoginScreen";
import SettingsModal from "./components/SettingsModal";
import { sampleInstitutes, presentationPresets } from "./data/sampleData";
import { translations } from "./data/translations";
import { generatePptxFile } from "./utils/pptxGenerator";

export default function App() {
  const [institutes, setInstitutes] = useState(sampleInstitutes);
  const [activeInstitute, setActiveInstitute] = useState(sampleInstitutes[0]);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [apiKey, setApiKey] = useState(() => localStorage.getItem("edusuite_api_key") || "");
  const [lang, setLang] = useState(() => localStorage.getItem("satyadhi_lang") || "hi");

  // Daily Employee Authentication State (Requires login every day / each session)
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = sessionStorage.getItem("satyadhi_active_user");
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const handleLogin = (user) => {
    setCurrentUser(user);
    try {
      sessionStorage.setItem("satyadhi_active_user", JSON.stringify(user));
    } catch {
      // ignore
    }
  };

  const handleLogout = () => {
    try {
      sessionStorage.removeItem("satyadhi_active_user");
    } catch {
      // ignore
    }
    setCurrentUser(null);
  };

  const handleLanguageChange = (newLang) => {
    setLang(newLang);
    localStorage.setItem("satyadhi_lang", newLang);
  };

  const t = translations[lang] || translations.hi;

  const handleSaveApiKey = (key) => {
    setApiKey(key);
    localStorage.setItem("edusuite_api_key", key);
  };

  const handleUpdateInstitute = (updated) => {
    setActiveInstitute(updated);
    setInstitutes((prev) =>
      prev.map((inst) => (inst.id === updated.id ? updated : inst))
    );
  };

  const handleDownloadSamplePpt = async () => {
    const sample = presentationPresets[0];
    await generatePptxFile({
      ...sample,
      instituteName: activeInstitute.name,
    }, "navy");
  };

  if (!currentUser) {
    return (
      <LoginScreen
        onLogin={handleLogin}
        activeInstitute={activeInstitute}
      />
    );
  }

  return (
    <div className="h-screen w-screen flex flex-col bg-slate-100 text-slate-900 overflow-hidden font-sans">
      {/* Native Desktop Window Header */}
      <Header
        activeInstitute={activeInstitute}
        setActiveInstitute={setActiveInstitute}
        institutes={institutes}
        onOpenSettings={() => setIsSettingsOpen(true)}
        apiKeySet={Boolean(apiKey)}
        lang={lang}
        onLanguageChange={handleLanguageChange}
        t={t}
        currentUser={currentUser}
        onLogout={handleLogout}
      />

      {/* Main Workspace (Sidebar + Content Canvas) */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Navigation Sidebar */}
        <Sidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          t={t}
          lang={lang}
          currentUser={currentUser}
        />

        {/* Right Dynamic Content View */}
        <main className="flex-1 overflow-y-auto bg-slate-100/70 p-6 md:p-8">
          <div className="max-w-7xl mx-auto">
            {activeTab === "dashboard" && (
              <Dashboard
                activeInstitute={activeInstitute}
                onNavigate={setActiveTab}
                onDownloadSamplePpt={handleDownloadSamplePpt}
                t={t}
                lang={lang}
                currentUser={currentUser}
              />
            )}

            {activeTab === "users" && (
              <UserManagement
                currentUser={currentUser}
                activeInstitute={activeInstitute}
              />
            )}

            {activeTab === "teacher_desk" && (
              <TeacherDesk
                activeInstitute={activeInstitute}
                onNavigate={setActiveTab}
              />
            )}

            {activeTab === "ocr_ppt" && (
              <ScreenshotToPpt activeInstitute={activeInstitute} />
            )}

            {activeTab === "youtube" && (
              <YouTubeStudio activeInstitute={activeInstitute} />
            )}

            {activeTab === "book" && (
              <BookCreator activeInstitute={activeInstitute} />
            )}

            {activeTab === "ppt" && (
              <PptMaker activeInstitute={activeInstitute} onNavigate={setActiveTab} />
            )}

            {activeTab === "dpp" && (
              <NotebookDppMaker activeInstitute={activeInstitute} />
            )}

            {activeTab === "doubt" && (
              <DoubtSolver activeInstitute={activeInstitute} />
            )}

            {activeTab === "receipt" && (
              <IdAndFeeReceipt activeInstitute={activeInstitute} />
            )}

            {activeTab === "image" && (
              <ImageStudio activeInstitute={activeInstitute} />
            )}

            {activeTab === "test" && (
              <QuestionPaperMaker activeInstitute={activeInstitute} />
            )}

            {activeTab === "lesson" && (
              <LessonPlanner activeInstitute={activeInstitute} />
            )}

            {activeTab === "notice" && (
              <NoticeHub activeInstitute={activeInstitute} />
            )}
          </div>
        </main>
      </div>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        activeInstitute={activeInstitute}
        onUpdateInstitute={handleUpdateInstitute}
        apiKey={apiKey}
        onSaveApiKey={handleSaveApiKey}
      />
    </div>
  );
}
