import React, { useState, useRef, useEffect } from "react";
import {
  Upload,
  Download,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  CheckCircle2,
  Maximize2,
  Copy,
  Check,
  Plus,
  ArrowUp,
  ArrowDown,
  Layers,
  Monitor,
  Lightbulb,
  Edit3,
  Settings2,
  Play,
  Film,
  X,
} from "lucide-react";
import { generateScreenshotMcqPptx } from "../utils/pptxGenerator";
import { generateMotionHtml, downloadMotionHtmlFile } from "../utils/motionHtmlGenerator";
import { fileToDataUrl } from "../utils/mediaHelper";
import { useSession } from "../api/session.tsx";
import { fileUrl, uploadFile } from "../api/documents.ts";
import { ApiError } from "../api/client.ts";
import { DocumentBar } from "./DocumentBar.tsx";
import { Button, PageHeader, useToast } from "./ui/index.ts";

/** Screenshot types the files API accepts (DN-040). */
const ACCEPTED_IMAGES = "image/png,image/jpeg,image/webp";

const EMPTY_QUESTION = { qNum: 1, exam: "", question: "", options: { A: "", B: "", C: "", D: "" }, correct: "A", trick: "", previewUrl: "" };

const blobToDataUrl = (blob) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });

/** Upload status shown on each screenshot card. */
const UPLOAD_LABEL = { uploading: "सर्वर पर भेजा जा रहा है…", error: "सर्वर पर सेव नहीं हुआ", missing: "स्क्रीनशॉट लोड नहीं हुआ", done: "" };

export default function ScreenshotToPpt({ activeInstitute }) {
  const { client } = useSession();
  const toast = useToast();

  // One list: each screenshot is one question. The teacher types the question
  // text, options and answer (AI reading of screenshots arrives in Phase 4).
  const [questions, setQuestions] = useState([]);
  const uploadedFiles = questions;

  // Review & Carousel states
  const [activeTab, setActiveTab] = useState("upload"); // 'upload' | 'review' | 'preview'
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [selectedQuestionIndex, setSelectedQuestionIndex] = useState(0);
  const [isCopied, setIsCopied] = useState(false);
  const [zoomScreenshot, setZoomScreenshot] = useState(null);
  const [exportError, setExportError] = useState("");
  const [docTitle, setDocTitle] = useState("");

  // Settings
  const [sessionTitle, setSessionTitle] = useState("");
  const [facultyName, setFacultyName] = useState("");
  const [subject, setSubject] = useState("");
  const [examTag, setExamTag] = useState("");
  const [pptTheme, setPptTheme] = useState("satyadhi_dark"); // 'satyadhi_dark' | 'clean_white' | 'emerald'
  const [layoutMode, setLayoutMode] = useState("split"); // 'split' | 'screenshot_left' | 'classic_full'

  // Motion Player Modal states
  const [showMotionPlayer, setShowMotionPlayer] = useState(false);
  const [motionHtmlDoc, setMotionHtmlDoc] = useState("");
  const [motionPlayerUrl, setMotionPlayerUrl] = useState("");

  const fileInputRef = useRef(null);

  // Keyboard navigation for Smartboard (Arrow keys & Spacebar)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (activeTab !== "preview" || questions.length === 0) return;
      if (e.key === "ArrowRight" || e.key === "PageDown") {
        setCurrentSlideIndex((prev) => Math.min(questions.length - 1, prev + 1));
      } else if (e.key === "ArrowLeft" || e.key === "PageUp") {
        setCurrentSlideIndex((prev) => Math.max(0, prev - 1));
      } else if (e.key === " " || e.key === "Enter") {
        setShowAnswer((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeTab, questions.length]);

  // What gets saved (shape: McqSetContentSchema in packages/shared/documents.ts).
  const documentContent = {
    sessionTitle,
    facultyName,
    subject,
    examTag,
    theme: pptTheme,
    layoutMode,
    questions: questions.map((q, i) => ({
      qNum: i + 1,
      ...(q.exam && { exam: q.exam }),
      question: q.question,
      options: q.options,
      correct: q.correct,
      ...(q.trick && { trick: q.trick }),
      ...(q.screenshotFileId && { screenshotFileId: q.screenshotFileId }),
    })),
  };

  const patchQuestion = (id, patch) => setQuestions((all) => all.map((q) => (q.id === id ? { ...q, ...patch } : q)));

  /** Sends one screenshot to storage (presign → upload → verify) and records its file id. */
  const uploadScreenshot = async (item) => {
    patchQuestion(item.id, { upload: "uploading" });
    try {
      const info = await uploadFile(client, item.file);
      patchQuestion(item.id, { upload: "done", screenshotFileId: info.id });
    } catch (err) {
      patchQuestion(item.id, { upload: "error" });
      toast.show({
        tone: "error",
        title: `${item.name}: सर्वर पर सेव नहीं हुआ`,
        description: err instanceof ApiError ? err.message : "इंटरनेट जाँचकर फिर से कोशिश करें।",
      });
    }
  };

  // Each chosen screenshot becomes a question with empty text; uploads run one by one.
  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = "";
    if (!files.length) return;
    const items = await Promise.all(
      files.map(async (file, idx) => {
        const dataUrl = await fileToDataUrl(file);
        return {
          ...EMPTY_QUESTION,
          options: { ...EMPTY_QUESTION.options },
          id: `upload-${Date.now()}-${idx}`,
          file,
          name: file.name,
          previewUrl: dataUrl,
          screenshotDataUrl: dataUrl,
          upload: "uploading",
        };
      }),
    );
    setQuestions((all) => [...all, ...items].map((q, i) => ({ ...q, qNum: i + 1 })));
    setSelectedQuestionIndex(questions.length);
    setActiveTab("review");
    for (const item of items) await uploadScreenshot(item);
  };

  // Move questions up/down in sequence
  const handleMove = (index, direction) => {
    const target = direction === "up" ? index - 1 : index + 1;
    if (target < 0 || target >= questions.length) return;
    const updated = [...questions];
    [updated[index], updated[target]] = [updated[target], updated[index]];
    setQuestions(updated.map((q, i) => ({ ...q, qNum: i + 1 })));
  };

  // Delete an uploaded screenshot
  const handleDeleteItem = (index) => {
    const updated = questions.filter((_, i) => i !== index).map((q, i) => ({ ...q, qNum: i + 1 }));
    setQuestions(updated);
    if (selectedQuestionIndex >= updated.length) setSelectedQuestionIndex(Math.max(0, updated.length - 1));
    if (currentSlideIndex >= updated.length) setCurrentSlideIndex(Math.max(0, updated.length - 1));
  };

  // Update question field in review mode
  const handleUpdateCurrentField = (field, value) => {
    const q = questions[selectedQuestionIndex];
    if (q) patchQuestion(q.id, { [field]: value });
  };

  const handleUpdateOption = (optKey, value) => {
    const q = questions[selectedQuestionIndex];
    if (q) patchQuestion(q.id, { options: { ...q.options, [optKey]: value } });
  };

  /** Loads a saved set; screenshots are fetched from storage after the text is shown. */
  const openSaved = (content) => {
    setSessionTitle(content.sessionTitle);
    setFacultyName(content.facultyName ?? "");
    setSubject(content.subject ?? "");
    setExamTag(content.examTag ?? "");
    setPptTheme(content.theme ?? "satyadhi_dark");
    setLayoutMode(content.layoutMode ?? "split");
    const items = content.questions.map((q, i) => ({
      ...EMPTY_QUESTION,
      id: `saved-${Date.now()}-${i}`,
      name: `प्रश्न ${i + 1}`,
      qNum: i + 1,
      exam: q.exam ?? "",
      question: q.question,
      options: { ...q.options },
      correct: q.correct,
      trick: q.trick ?? "",
      ...(q.screenshotFileId && { screenshotFileId: q.screenshotFileId, upload: "done" }),
    }));
    setQuestions(items);
    setSelectedQuestionIndex(0);
    setCurrentSlideIndex(0);
    setActiveTab(items.length ? "review" : "upload");
    for (const item of items) {
      if (!item.screenshotFileId) continue;
      void fileUrl(client, item.screenshotFileId)
        .then(({ url }) => fetch(url))
        .then((res) => (res.ok ? res.blob() : Promise.reject(new Error(String(res.status)))))
        .then(blobToDataUrl)
        .then((dataUrl) => patchQuestion(item.id, { previewUrl: dataUrl, screenshotDataUrl: dataUrl }))
        .catch(() => patchQuestion(item.id, { upload: "missing" }));
    }
  };

  const startNew = () => {
    setQuestions([]);
    setSessionTitle("");
    setFacultyName("");
    setSubject("");
    setExamTag("");
    setPptTheme("satyadhi_dark");
    setLayoutMode("split");
    setDocTitle("");
    setSelectedQuestionIndex(0);
    setCurrentSlideIndex(0);
    setActiveTab("upload");
  };

  const exportData = () => ({
    title: sessionTitle,
    facultyName,
    subject,
    examTag,
    instituteName: activeInstitute.name,
    questions,
  });

  // Export to Real Microsoft PowerPoint PPTX
  const handleDownloadPptx = async () => {
    if (!questions.length) return;
    setExportError("");
    try {
      await generateScreenshotMcqPptx({ ...exportData(), theme: pptTheme, layoutMode });
    } catch {
      setExportError("PowerPoint फ़ाइल नहीं बन सकी। फिर से कोशिश करें।");
    }
  };

  // Launch In-App Motion Studio Player (60fps Interactive HTML5 matching Biology_Unit-1_Taxonomy_Enhanced)
  const handleOpenMotionPlayer = async () => {
    if (!questions.length) return;
    const htmlDoc = generateMotionHtml(exportData());
    // In the desktop app the player runs on its own isolated origin with no
    // network access (DN-036). A plain browser (vite dev) falls back to srcDoc.
    const motion = window.edusuite?.motion;
    setMotionPlayerUrl(motion ? await motion.open(htmlDoc) : "");
    setMotionHtmlDoc(motion ? "" : htmlDoc);
    setShowMotionPlayer(true);
  };

  // 1-Click Download of Standalone Interactive Motion Presentation (.html)
  const handleDownloadMotionHtml = () => {
    if (!questions.length) return;
    downloadMotionHtmlFile(exportData());
  };

  // Copy all questions to clipboard
  const handleCopyAllText = async () => {
    if (!questions.length) return;
    const textData = questions
      .map(
        (q) =>
          `प्र. ${q.qNum}: ${q.question}\n(A) ${q.options.A}\n(B) ${q.options.B}\n(C) ${q.options.C}\n(D) ${q.options.D}\nउत्तर: विकल्प (${q.correct})\nशॉर्टकट/व्याख्या: ${q.trick}\n`
      )
      .join("\n" + "—".repeat(40) + "\n\n");
    await navigator.clipboard.writeText(textData);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const currQ = questions[selectedQuestionIndex] || EMPTY_QUESTION;
  const activeSlideQ = questions[currentSlideIndex] || EMPTY_QUESTION;

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<Upload className="size-6" />}
        title="स्क्रीनशॉट से स्मार्टबोर्ड PPT मेकर"
        badge="स्मार्टबोर्ड 16:9 PPTX"
        description="प्रश्नों के स्क्रीनशॉट अपलोड करें, हर स्क्रीनशॉट के साथ प्रश्न, 4 विकल्प और सही उत्तर लिखें, और स्मार्टबोर्ड PPT या मोशन फ़ाइल बनाएँ। स्क्रीनशॉट से अपने-आप प्रश्न पढ़ने (AI) की सुविधा अगले चरण में आएगी।"
        actions={
          <>
            <Button variant="primary" icon={<Upload className="size-4" />} onClick={() => fileInputRef.current?.click()}>
              स्क्रीनशॉट अपलोड करें
            </Button>
            <input type="file" ref={fileInputRef} onChange={handleFileUpload} multiple accept={ACCEPTED_IMAGES} className="hidden" />
          </>
        }
      />

      <DocumentBar
        type="mcq_set"
        title={docTitle}
        onTitleChange={setDocTitle}
        content={documentContent}
        onOpen={(content) => openSaved(content)}
        onNew={startNew}
      />

      {exportError && (
        <p role="alert" className="rounded-control border border-danger bg-danger-subtle p-3 text-label text-danger">
          {exportError}
        </p>
      )}

      {/* Main Tab Navigation */}
      <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-2 rounded-xl shadow-sm">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab("upload")}
            className={`px-4 py-2 rounded-lg font-bold text-xs md:text-sm flex items-center gap-2 transition cursor-pointer ${
              activeTab === "upload"
                ? "bg-amber-400 text-slate-950 shadow-sm"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <Upload className="w-4 h-4" />
            1. स्क्रीनशॉट अपलोड ({uploadedFiles.length})
          </button>
          <button
            onClick={() => setActiveTab("review")}
            disabled={uploadedFiles.length === 0}
            className={`px-4 py-2 rounded-lg font-bold text-xs md:text-sm flex items-center gap-2 transition cursor-pointer ${
              activeTab === "review"
                ? "bg-amber-400 text-slate-950 shadow-sm"
                : uploadedFiles.length === 0
                ? "text-slate-300 cursor-not-allowed"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <Edit3 className="w-4 h-4" />
            2. प्रश्न लिखें व सुधारें
          </button>
          <button
            onClick={() => setActiveTab("preview")}
            disabled={questions.length === 0}
            className={`px-4 py-2 rounded-lg font-bold text-xs md:text-sm flex items-center gap-2 transition cursor-pointer ${
              activeTab === "preview"
                ? "bg-amber-400 text-slate-950 shadow-sm"
                : questions.length === 0
                ? "text-slate-300 cursor-not-allowed"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <Monitor className="w-4 h-4" />
            3. स्मार्टबोर्ड लाइव प्रिव्यू (16:9 Slides)
          </button>
        </div>

        {/* Global Action Download button */}
        {questions.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleCopyAllText}
              className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold text-xs flex items-center gap-1.5 transition"
              title="सभी प्रश्नों का टेक्स्ट कॉपी करें"
            >
              {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              {isCopied ? "कॉपी हो गया!" : "टेक्स्ट कॉपी"}
            </button>
            <button
              onClick={handleOpenMotionPlayer}
              className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition cursor-pointer"
              title="60fps मोशन प्लेयर चलाएं"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              ▶️ मोशन प्लेयर
            </button>
            <button
              onClick={handleDownloadMotionHtml}
              className="px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-sm transition cursor-pointer"
              title="इंटरएक्टिव HTML5 मोशन फ़ाइल डाउनलोड करें"
            >
              <Film className="w-3.5 h-3.5" />
              ✨ मोशन फ़ाइल (.html)
            </button>
            <button
              onClick={handleDownloadPptx}
              className="px-3.5 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-md transition cursor-pointer"
              title="Microsoft PowerPoint फाइल डाउनलोड करें"
            >
              <Download className="w-3.5 h-3.5" />
              PowerPoint (.pptx)
            </button>
          </div>
        )}
      </div>

      {/* TAB 1: UPLOAD & GALLERY */}
      {activeTab === "upload" && (
        <div className="space-y-6">
          {/* Drag & Drop Hero Box */}
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-amber-400/80 bg-amber-50/40 hover:bg-amber-50/80 rounded-2xl p-8 text-center cursor-pointer transition flex flex-col items-center justify-center gap-3 group"
          >
            <div className="w-16 h-16 rounded-2xl bg-amber-400 text-slate-950 flex items-center justify-center shadow-md group-hover:scale-105 transition transform">
              <Upload className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900">
                यहाँ अपने 10, 20, 30 या 50 प्रश्नों के स्क्रीनशॉट चुनें या ड्रैग करें
              </h3>
              <p className="text-xs md:text-sm text-slate-500 mt-1">
                PNG, JPG या WEBP, हर फ़ाइल 10 MB तक। एक साथ सभी स्क्रीनशॉट्स सिलेक्ट करें।
              </p>
            </div>
            <div className="flex items-center gap-3 mt-1">
              <span className="px-3 py-1 rounded-full bg-white text-slate-700 text-xs font-bold border border-slate-200 shadow-sm">
                📁 मल्टीपल सिलेक्शन इनेबल्ड
              </span>
              <span className="px-3 py-1 rounded-full bg-white text-slate-700 text-xs font-bold border border-slate-200 shadow-sm">
                ⚡ 16:9 स्मार्टबोर्ड लेआउट
              </span>
            </div>
          </div>

          {/* Uploaded Gallery Grid */}
          {uploadedFiles.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <span className="w-7 h-7 rounded-lg bg-amber-100 text-amber-700 font-bold text-xs flex items-center justify-center">
                    {uploadedFiles.length}
                  </span>
                  <h3 className="font-black text-slate-900 text-base">
                    अपलोड किए गए प्रश्न स्क्रीनशॉट्स ({uploadedFiles.length} प्रश्न लोड हुए)
                  </h3>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setQuestions([]);
                      setSelectedQuestionIndex(0);
                      setCurrentSlideIndex(0);
                    }}
                    className="px-3 py-1.5 rounded-lg text-rose-600 hover:bg-rose-50 text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    सभी हटाएं
                  </button>
                  <button
                    onClick={() => setActiveTab("review")}
                    className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs md:text-sm flex items-center gap-2 shadow-lg transition transform active:scale-95 cursor-pointer"
                  >
                    <Edit3 className="w-4 h-4" />
                    प्रश्न लिखें ({uploadedFiles.length})
                  </button>
                </div>
              </div>

              {/* Grid of uploaded items with re-order buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {uploadedFiles.map((item, index) => (
                  <div
                    key={item.id}
                    className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50 hover:shadow-md transition flex flex-col group relative"
                  >
                    {/* Top Index Badge */}
                    <div className="px-3 py-1.5 bg-slate-900 text-white text-xs font-bold flex items-center justify-between">
                      <span className="text-amber-400">Q. {item.qNum}</span>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleMove(index, "up")}
                          disabled={index === 0}
                          className="p-1 hover:text-amber-300 disabled:opacity-30 transition"
                          title="ऊपर करें"
                        >
                          <ArrowUp className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => handleMove(index, "down")}
                          disabled={index === uploadedFiles.length - 1}
                          className="p-1 hover:text-amber-300 disabled:opacity-30 transition"
                          title="नीचे करें"
                        >
                          <ArrowDown className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => handleDeleteItem(index)}
                          className="p-1 hover:text-rose-400 transition"
                          title="डिलीट करें"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    {/* Image Preview */}
                    <div
                      onClick={() => setZoomScreenshot(item.previewUrl)}
                      className="h-32 bg-slate-200 overflow-hidden cursor-pointer flex items-center justify-center relative"
                    >
                      {item.previewUrl ? (
                        <img
                          src={item.previewUrl}
                          alt={`प्रश्न ${item.qNum} का स्क्रीनशॉट`}
                          className="w-full h-full object-cover group-hover:scale-105 transition"
                        />
                      ) : (
                        <span className="text-[11px] text-slate-600">{item.screenshotFileId ? "लोड हो रहा है…" : "स्क्रीनशॉट नहीं"}</span>
                      )}
                      <div className="absolute inset-0 bg-slate-950/20 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                        <span className="px-2 py-1 rounded bg-slate-900/90 text-white text-[10px] font-bold flex items-center gap-1">
                          <Eye className="w-3 h-3 text-amber-400" /> बड़ा देखें
                        </span>
                      </div>
                    </div>

                    {/* Caption */}
                    <div className="p-2.5 text-xs text-slate-700 bg-white flex-1 flex flex-col justify-between">
                      <p className="line-clamp-2 font-medium leading-snug">
                        {item.question || <span className="text-slate-500">प्रश्न अभी नहीं लिखा</span>}
                      </p>
                      {UPLOAD_LABEL[item.upload] && (
                        <p role={item.upload === "uploading" ? undefined : "alert"} className={`mt-1 text-[11px] font-semibold ${item.upload === "uploading" ? "text-slate-600" : "text-red-700"}`}>
                          {UPLOAD_LABEL[item.upload]}
                          {item.upload === "error" && item.file && (
                            <button type="button" onClick={() => void uploadScreenshot(item)} className="ml-2 underline">
                              फिर से भेजें
                            </button>
                          )}
                        </p>
                      )}
                      <div className="mt-2 pt-1 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                        <span className="font-semibold text-emerald-600">
                          उत्तर: ({item.correct})
                        </span>
                        <span className="text-slate-400 truncate max-w-[100px]">
                          {item.name}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: REVIEW & EDIT STATION */}
      {activeTab === "review" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Question Index Selector */}
          <div className="lg:col-span-3 bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-3 h-fit">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-black text-slate-900 text-sm flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-amber-500" />
                प्रश्न सूची ({questions.length})
              </h3>
              <span className="text-[11px] font-bold text-slate-500">
                क्लिक करके चुनें
              </span>
            </div>

            <div className="max-h-[500px] overflow-y-auto space-y-1.5 pr-1">
              {questions.map((q, idx) => (
                <button
                  key={q.id || idx}
                  onClick={() => setSelectedQuestionIndex(idx)}
                  className={`w-full text-left p-2.5 rounded-xl text-xs transition flex items-center justify-between cursor-pointer ${
                    selectedQuestionIndex === idx
                      ? "bg-slate-900 text-white font-bold shadow-sm"
                      : "bg-slate-50 hover:bg-slate-100 text-slate-700"
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <span
                      className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-black ${
                        selectedQuestionIndex === idx
                          ? "bg-amber-400 text-slate-950"
                          : "bg-slate-200 text-slate-700"
                      }`}
                    >
                      {idx + 1}
                    </span>
                    <span className="truncate">{q.question}</span>
                  </div>
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] font-bold shrink-0 ${
                      selectedQuestionIndex === idx
                        ? "bg-emerald-500 text-white"
                        : "bg-emerald-100 text-emerald-800"
                    }`}
                  >
                    ({q.correct})
                  </span>
                </button>
              ))}
            </div>

            <div className="pt-2 border-t border-slate-100">
              <button
                onClick={() => setActiveTab("preview")}
                className="w-full py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition"
              >
                <Monitor className="w-4 h-4" />
                स्मार्टबोर्ड प्रिव्यू देखें
              </button>
            </div>
          </div>

          {/* Middle/Right Column: Two-way Compare & Edit Station */}
          <div className="lg:col-span-9 space-y-5">
            {/* Split Station: Screenshot on Left, Editable Fields on Right */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-lg bg-amber-400 text-slate-950 font-black text-xs">
                    Q. {currQ?.qNum || selectedQuestionIndex + 1} of {questions.length}
                  </span>
                  <input
                    type="text"
                    value={currQ?.exam || ""}
                    onChange={(e) => handleUpdateCurrentField("exam", e.target.value)}
                    placeholder="एग्ज़ाम टैग (उदा. MPPSC Pre 2024)"
                    className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded-md border border-slate-200 focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() =>
                      setSelectedQuestionIndex((prev) => Math.max(0, prev - 1))
                    }
                    disabled={selectedQuestionIndex === 0}
                    className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-30 text-xs font-bold text-slate-700 flex items-center gap-1"
                  >
                    <ChevronLeft className="w-4 h-4" /> पिछला
                  </button>
                  <button
                    onClick={() =>
                      setSelectedQuestionIndex((prev) =>
                        Math.min(questions.length - 1, prev + 1)
                      )
                    }
                    disabled={selectedQuestionIndex === questions.length - 1}
                    className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-30 text-xs font-bold text-slate-700 flex items-center gap-1"
                  >
                    अगला <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
                {/* Left: Original Screenshot */}
                <div className="md:col-span-5 space-y-2">
                  <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                    <span>मूल स्क्रीनशॉट (Original Screenshot)</span>
                    <button
                      onClick={() => setZoomScreenshot(currQ?.previewUrl)}
                      className="text-amber-600 hover:text-amber-700 text-[11px] font-bold flex items-center gap-1"
                    >
                      <Maximize2 className="w-3 h-3" /> ज़ूम करें
                    </button>
                  </label>
                  <div className="rounded-xl border border-slate-200 bg-slate-900/5 p-2 flex items-center justify-center min-h-[260px] overflow-hidden">
                    {currQ.previewUrl ? (
                      <img
                        src={currQ.previewUrl}
                        alt={`प्रश्न ${currQ.qNum} का स्क्रीनशॉट`}
                        className="max-h-[300px] w-auto object-contain rounded-lg shadow-sm"
                      />
                    ) : (
                      <span className="text-xs text-slate-600">{currQ.screenshotFileId ? "लोड हो रहा है…" : "स्क्रीनशॉट नहीं"}</span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400 text-center">
                    स्क्रीनशॉट देखकर दाईं ओर प्रश्न, विकल्प और सही उत्तर लिखें।
                    {(currQ.upload === "error" || currQ.upload === "missing") && <span className="block font-semibold text-red-700">{UPLOAD_LABEL[currQ.upload]}</span>}
                  </p>
                </div>

                {/* Right: Editable Extracted Fields */}
                <div className="md:col-span-7 space-y-4">
                  {/* Question Text */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-800 flex items-center justify-between">
                      <span>प्रश्न (Question Statement):</span>
                    </label>
                    <textarea
                      rows={3}
                      value={currQ?.question || ""}
                      onChange={(e) =>
                        handleUpdateCurrentField("question", e.target.value)
                      }
                      className="w-full p-2.5 rounded-xl border border-slate-200 text-xs md:text-sm font-semibold text-slate-900 bg-slate-50 focus:bg-white focus:outline-none focus:border-amber-400 leading-relaxed"
                    />
                  </div>

                  {/* 4 Options Grid */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-800">
                      4 विकल्प (Options A, B, C, D) & सही उत्तर चुनें:
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {["A", "B", "C", "D"].map((optKey) => {
                        const isCorrect = currQ?.correct === optKey;
                        return (
                          <div
                            key={optKey}
                            className={`flex items-center gap-2 p-2 rounded-xl border transition ${
                              isCorrect
                                ? "border-emerald-500 bg-emerald-50/70"
                                : "border-slate-200 bg-slate-50"
                            }`}
                          >
                            <button
                              type="button"
                              onClick={() =>
                                handleUpdateCurrentField("correct", optKey)
                              }
                              className={`w-6 h-6 rounded-full font-black text-xs flex items-center justify-center shrink-0 transition ${
                                isCorrect
                                  ? "bg-emerald-600 text-white"
                                  : "bg-slate-200 text-slate-700 hover:bg-slate-300"
                              }`}
                              title="इसे सही उत्तर बनाएं"
                            >
                              {optKey}
                            </button>
                            <input
                              type="text"
                              value={currQ?.options?.[optKey] || ""}
                              onChange={(e) =>
                                handleUpdateOption(optKey, e.target.value)
                              }
                              className="w-full text-xs font-medium text-slate-800 bg-transparent focus:outline-none"
                            />
                            {isCorrect && (
                              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Shortcut Trick / Solution */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-amber-800 flex items-center gap-1">
                      <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
                      शिक्षक की शॉर्टकट ट्रिक / व्याख्या (PPT के नोट्स में जाएगी):
                    </label>
                    <textarea
                      rows={2}
                      value={currQ?.trick || ""}
                      onChange={(e) =>
                        handleUpdateCurrentField("trick", e.target.value)
                      }
                      placeholder="10-सेकंड की शॉर्ट ट्रिक या कॉन्सेप्ट जो शिक्षक क्लास में समझाएंगे..."
                      className="w-full p-2 rounded-xl border border-amber-200 bg-amber-50/50 text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-amber-400"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Smartboard Presentation Settings Box */}
            <div className="bg-slate-900 text-white rounded-2xl p-5 space-y-4 shadow-md border border-slate-800">
              <h4 className="font-bold text-sm text-amber-400 flex items-center gap-2">
                <Settings2 className="w-4 h-4" />
                स्मार्टबोर्ड PPT फॉर्मेटिंग एवं थीम सेटिंग्स
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
                <div>
                  <label htmlFor="mcq-subject" className="text-slate-400 block mb-1">विषय:</label>
                  <input
                    id="mcq-subject"
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white font-medium focus:outline-none focus:border-amber-400"
                  />
                </div>
                <div>
                  <label htmlFor="mcq-exam-tag" className="text-slate-400 block mb-1">परीक्षा टैग:</label>
                  <input
                    id="mcq-exam-tag"
                    type="text"
                    value={examTag}
                    onChange={(e) => setExamTag(e.target.value)}
                    placeholder="उदा. MPPSC Pre 2024 PYQ"
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white font-medium focus:outline-none focus:border-amber-400"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">क्लास टाइटल:</label>
                  <input
                    type="text"
                    value={sessionTitle}
                    onChange={(e) => setSessionTitle(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white font-medium focus:outline-none focus:border-amber-400"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">फैकल्टी का नाम:</label>
                  <input
                    type="text"
                    value={facultyName}
                    onChange={(e) => setFacultyName(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white font-medium focus:outline-none focus:border-amber-400"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">थीम / बैकग्राउंड:</label>
                  <select
                    value={pptTheme}
                    onChange={(e) => setPptTheme(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white font-medium focus:outline-none focus:border-amber-400"
                  >
                    <option value="satyadhi_dark">🌟 सत्याधी डार्क (स्मार्टबोर्ड बेस्ट)</option>
                    <option value="clean_white">☀️ क्लीन वाइट बोर्ड</option>
                    <option value="emerald">🟢 क्लासिकल ग्रीन बोर्ड</option>
                  </select>
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">स्लाइड लेआउट:</label>
                  <select
                    value={layoutMode}
                    onChange={(e) => setLayoutMode(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white font-medium focus:outline-none focus:border-amber-400"
                  >
                    <option value="split">✍️ प्रश्न + शिक्षक पेन स्पेस (Split)</option>
                    <option value="screenshot_left">🖼️ मूल स्क्रीनशॉट + विकल्प</option>
                    <option value="classic_full">📋 फुलस्क्रीन 2x2 विकल्प</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: SMARTBOARD 16:9 LIVE CAROUSEL PREVIEW */}
      {activeTab === "preview" && (
        <div className="space-y-5">
          {/* Top Carousel Controller Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center gap-3">
              <span className="px-3 py-1 rounded-lg bg-slate-900 text-amber-400 font-black text-xs">
                Slide {currentSlideIndex + 1} / {questions.length}
              </span>
              <span className="text-xs font-bold text-slate-700">
                {activeSlideQ?.exam || "प्रतियोगी परीक्षा PYQ"}
              </span>

              {/* Layout Switcher */}
              <div className="hidden md:flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
                <button
                  type="button"
                  onClick={() => setLayoutMode("screenshot_left")}
                  className={`px-2 py-1 rounded text-xs font-bold transition ${
                    layoutMode === "screenshot_left"
                      ? "bg-amber-400 text-slate-950 shadow-sm"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  🖼️ मूल स्क्रीनशॉट
                </button>
                <button
                  type="button"
                  onClick={() => setLayoutMode("split")}
                  className={`px-2 py-1 rounded text-xs font-bold transition ${
                    layoutMode === "split"
                      ? "bg-amber-400 text-slate-950 shadow-sm"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  ✍️ डिजिटल टेक्स्ट
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowAnswer((prev) => !prev)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
                  showAnswer
                    ? "bg-emerald-600 text-white shadow-sm"
                    : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                }`}
              >
                {showAnswer ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                {showAnswer ? "उत्तर छुपाएं" : "👁️ उत्तर दिखाएं (Reveal)"}
              </button>

              <button
                onClick={() =>
                  setCurrentSlideIndex((prev) => Math.max(0, prev - 1))
                }
                disabled={currentSlideIndex === 0}
                className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-30 text-slate-700 transition"
                title="पिछली स्लाइड (या बायां तीर दबाएं)"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() =>
                  setCurrentSlideIndex((prev) =>
                    Math.min(questions.length - 1, prev + 1)
                  )
                }
                disabled={currentSlideIndex === questions.length - 1}
                className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-30 text-slate-700 transition"
                title="अगली स्लाइड (या दायां तीर दबाएं)"
              >
                <ChevronRight className="w-4 h-4" />
              </button>

              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center gap-1"
                title="और स्क्रीनशॉट जोड़ें"
              >
                <Plus className="w-3.5 h-3.5" /> + जोड़ें
              </button>

              <button
                onClick={handleOpenMotionPlayer}
                className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition cursor-pointer"
                title="इंटरएक्टिव 60fps मोशन प्लेयर चलाएं"
              >
                <Play className="w-3.5 h-3.5 fill-current" /> मोशन प्लेयर चलाएं
              </button>

              <button
                onClick={handleDownloadMotionHtml}
                className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-sm transition cursor-pointer"
                title="इंटरएक्टिव HTML5 मोशन फ़ाइल डाउनलोड करें"
              >
                <Film className="w-3.5 h-3.5" /> मोशन (.html)
              </button>

              <button
                onClick={handleDownloadPptx}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs flex items-center gap-2 shadow-sm transition cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" /> .pptx डाउनलोड
              </button>
            </div>
          </div>

          {/* Banner notification for teachers */}
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-2.5 px-4 text-xs flex items-center justify-between text-emerald-800">
            <span className="flex items-center gap-2 font-bold">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              {questions.length} प्रश्नों की 16:9 स्मार्टबोर्ड स्लाइड्स तैयार हैं।
            </span>
            <span className="text-[11px] text-slate-500 hidden sm:inline">
              (कीबोर्ड एरो कीज ← / → से स्लाइड बदलें)
            </span>
          </div>

          {/* 16:9 Smartboard Slide Canvas */}
          <div
            className={`w-full aspect-[16/9] rounded-2xl shadow-2xl p-6 md:p-8 flex flex-col justify-between border select-none transition-all ${
              pptTheme === "satyadhi_dark"
                ? "bg-[#0F172A] text-white border-slate-700"
                : pptTheme === "clean_white"
                ? "bg-slate-50 text-slate-900 border-slate-300"
                : "bg-[#064E3B] text-white border-emerald-700"
            }`}
          >
            {/* Top Slide Strip */}
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-3">
                <span className="px-3 py-1 rounded-md bg-[#FACC15] text-slate-950 font-black text-xs md:text-sm shadow-sm">
                  Q. {activeSlideQ?.qNum || currentSlideIndex + 1} / {questions.length}
                </span>
                <span className="text-xs md:text-sm font-semibold text-white/70">
                  🎯 {activeSlideQ?.exam}
                </span>
              </div>
              <div className="flex items-center gap-2 text-right">
                <span className="text-xs font-bold text-[#FACC15]">
                  {activeInstitute.name || "सत्याधी शर्मा क्लासेस, इंदौर"}
                </span>
              </div>
            </div>

            {/* Slide Body: Layout based on layoutMode */}
            {layoutMode === "screenshot_left" && activeSlideQ?.previewUrl ? (
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 my-auto items-center">
                {/* Left 7 cols: Original Screenshot Image */}
                <div className="md:col-span-7 bg-white/5 border border-white/15 rounded-2xl p-3 flex flex-col items-center justify-center min-h-[300px] max-h-[380px] overflow-hidden relative group">
                  <img
                    src={activeSlideQ.previewUrl}
                    alt={`Question ${activeSlideQ.qNum}`}
                    className="max-h-[340px] w-auto max-w-full object-contain rounded-lg shadow-md"
                  />
                  <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition">
                    <button
                      onClick={() => setZoomScreenshot(activeSlideQ.previewUrl)}
                      className="px-2 py-1 rounded bg-slate-900/90 text-white text-[10px] font-bold flex items-center gap-1 shadow"
                    >
                      <Maximize2 className="w-3 h-3 text-amber-400" /> ज़ूम करें
                    </button>
                  </div>
                </div>

                {/* Right 5 cols: Options + Teacher Stylus Pen Space */}
                <div className="md:col-span-5 space-y-3">
                  <div className="space-y-2">
                    {["A", "B", "C", "D"].map((optKey) => {
                      const isCorrect = activeSlideQ?.correct === optKey;
                      const highlight = showAnswer && isCorrect;

                      return (
                        <div
                          key={optKey}
                          className={`p-2.5 rounded-xl border flex items-center gap-2.5 transition-all ${
                            highlight
                              ? "bg-emerald-600 text-white border-emerald-400 shadow-lg scale-102 font-bold"
                              : pptTheme === "clean_white"
                              ? "bg-white text-slate-800 border-slate-200"
                              : "bg-slate-800/80 text-white border-slate-700/80"
                          }`}
                        >
                          <span
                            className={`w-6 h-6 rounded-full font-black text-xs flex items-center justify-center shrink-0 ${
                              highlight
                                ? "bg-white text-emerald-800"
                                : "bg-[#FACC15] text-slate-950"
                            }`}
                          >
                            {optKey}
                          </span>
                          <span className="text-xs md:text-sm font-medium leading-tight">
                            {activeSlideQ?.options?.[optKey]}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Teacher Stylus Solution Space */}
                  <div className="rounded-xl border-2 border-dashed border-white/20 bg-white/5 p-2.5 text-center">
                    <span className="text-[11px] font-bold text-[#FACC15] block">
                      ✏️ शिक्षक हल क्षेत्र (Teacher Pen Area)
                    </span>
                    <span className="text-[10px] text-white/50 block">
                      डिजिटल बोर्ड स्टाइलस से यहाँ व्याख्या लिखें
                    </span>
                  </div>

                  {/* Reveal Answer Box when toggled */}
                  {showAnswer && (
                    <div className="p-2.5 rounded-xl bg-amber-400/15 border border-amber-400/50 text-xs animate-in fade-in">
                      <span className="font-bold text-[#FACC15]">
                        💡 शॉर्टकट ट्रिक:
                      </span>{" "}
                      <span className="text-white/90">{activeSlideQ?.trick}</span>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 my-auto items-center">
                {/* Question & Options Column */}
                <div
                  className={`${
                    layoutMode === "split" ? "md:col-span-8" : "md:col-span-12"
                  } space-y-4`}
                >
                  {/* Big Readable Question Heading */}
                  <div
                    className={`p-4 rounded-xl border ${
                      pptTheme === "clean_white"
                        ? "bg-white border-slate-200 text-slate-900"
                        : "bg-white/5 border-white/10 text-white"
                    }`}
                  >
                    <h2 className="text-base md:text-xl lg:text-2xl font-black leading-snug">
                      {activeSlideQ?.question}
                    </h2>
                  </div>

                  {/* 4 Options */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {["A", "B", "C", "D"].map((optKey) => {
                      const isCorrect = activeSlideQ?.correct === optKey;
                      const highlight = showAnswer && isCorrect;

                      return (
                        <div
                          key={optKey}
                          className={`p-3 rounded-xl border flex items-center gap-3 transition-all ${
                            highlight
                              ? "bg-emerald-600 text-white border-emerald-400 shadow-lg scale-102 font-bold"
                              : pptTheme === "clean_white"
                              ? "bg-white text-slate-800 border-slate-200"
                              : "bg-slate-800/80 text-white border-slate-700/80"
                          }`}
                        >
                          <span
                            className={`w-7 h-7 rounded-full font-black text-xs flex items-center justify-center shrink-0 ${
                              highlight
                                ? "bg-white text-emerald-800"
                                : "bg-[#FACC15] text-slate-950"
                            }`}
                          >
                            {optKey}
                          </span>
                          <span className="text-xs md:text-sm leading-tight">
                            {activeSlideQ?.options?.[optKey]}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Reveal Answer Box when toggled */}
                  {showAnswer && (
                    <div className="p-3 rounded-xl bg-amber-400/15 border border-amber-400/50 text-xs animate-in fade-in">
                      <span className="font-bold text-[#FACC15]">
                        💡 शिक्षक शॉर्टकट ट्रिक / परीक्षा अलर्ट:
                      </span>{" "}
                      <span className="text-white/90">{activeSlideQ?.trick}</span>
                    </div>
                  )}
                </div>

                {/* Right Column: Teacher Smartboard Pen Space */}
                {layoutMode === "split" && (
                  <div className="md:col-span-4 h-full min-h-[220px] rounded-xl border-2 border-dashed border-white/20 bg-white/5 p-4 flex flex-col justify-between text-center">
                    <div>
                      <span className="text-xs font-bold text-[#FACC15] uppercase tracking-wider block">
                        ✏️ शिक्षक रफ वर्क / हल (Pen Space)
                      </span>
                      <span className="text-[11px] text-white/50 block mt-0.5">
                        (डिजिटल बोर्ड स्टायलस से हल करने का स्थान)
                      </span>
                    </div>

                    {activeSlideQ?.previewUrl && (
                      <div className="my-auto opacity-75 hover:opacity-100 transition p-2 bg-black/20 rounded-lg">
                        <img
                          src={activeSlideQ.previewUrl}
                          alt="Original"
                          className="max-h-24 mx-auto rounded object-contain"
                        />
                        <span className="text-[10px] text-white/50 block mt-1">
                          मूल स्क्रीनशॉट
                        </span>
                      </div>
                    )}

                    <div className="text-[10px] text-white/40 border-t border-white/10 pt-1">
                      सत्याधी शर्मा स्मार्ट क्लासरूम
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Bottom Slide Footer */}
            <div className="flex items-center justify-between pt-2 border-t border-white/10 text-[11px] text-white/50">
              <span>सत्याधी शर्मा क्लासेस • भंवरकुआं मेन ब्रांच, इंदौर</span>
              <span>हेल्पलाइन: +91 97706 77070 | Live MCQ Marathon</span>
            </div>
          </div>
        </div>
      )}

      {/* Interactive HTML5 Motion Presentation Fullscreen Modal (matching Biology_Unit-1_Taxonomy_Enhanced) */}
      {showMotionPlayer && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center p-2 sm:p-4">
          <div className="w-full max-w-7xl h-[95vh] bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in">
            {/* Modal Header Bar */}
            <div className="bg-slate-950 px-4 py-3 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                <div>
                  <h3 className="text-white font-black text-sm md:text-base flex items-center gap-2">
                    <Film className="w-4 h-4 text-amber-400" />
                    सत्याधी मोशन स्टूडियो • 60fps इंटरएक्टिव क्लासरूम प्रजेंटेशन
                  </h3>
                  <p className="text-slate-400 text-xs hidden sm:block">
                    Web Audio API साउंड इफेक्ट्स, 10s टाइमर, चेक/क्रॉस मोशन और स्मार्टबोर्ड ऑटो-स्केलिंग
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleDownloadMotionHtml}
                  className="px-3.5 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-md transition cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" /> मोशन फ़ाइल (.html) डाउनलोड
                </button>
                <button
                  onClick={() => setShowMotionPlayer(false)}
                  className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
                  title="बंद करें"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Embedded Live Motion Player: isolated origin in the desktop app, srcDoc in a plain browser */}
            <div className="flex-1 w-full h-full bg-black relative">
              <iframe
                title="Satyadhi Motion Interactive Player"
                {...(motionPlayerUrl ? { src: motionPlayerUrl } : { srcDoc: motionHtmlDoc })}
                className="w-full h-full border-0"
                // No allow-same-origin: with allow-scripts it would let the frame remove its own sandbox.
                sandbox="allow-scripts"
                allow="fullscreen"
              />
            </div>
          </div>
        </div>
      )}

      {/* Image Zoom Modal */}
      {zoomScreenshot && (
        <div
          onClick={() => setZoomScreenshot(null)}
          className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="max-w-3xl max-h-[85vh] bg-white rounded-2xl p-4 shadow-2xl overflow-hidden relative"
          >
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
              <h4 className="font-bold text-sm text-slate-800">
                मूल प्रश्न स्क्रीनशॉट (Zoom View)
              </h4>
              <button
                onClick={() => setZoomScreenshot(null)}
                className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700"
              >
                बंद करें ✕
              </button>
            </div>
            <img
              src={zoomScreenshot}
              alt="Zoomed Screenshot"
              className="max-h-[70vh] w-auto mx-auto object-contain rounded-lg"
            />
          </div>
        </div>
      )}
    </div>
  );
}
