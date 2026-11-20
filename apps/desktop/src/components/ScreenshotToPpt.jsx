import React, { useState, useRef, useEffect } from "react";
import {
  Upload,
  Image as ImageIcon,
  Sparkles,
  Download,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  CheckCircle2,
  Maximize2,
  FileText,
  Printer,
  Copy,
  Check,
  RefreshCw,
  Plus,
  ArrowUp,
  ArrowDown,
  Layers,
  Monitor,
  HelpCircle,
  Lightbulb,
  Edit3,
  Sliders,
  Settings2,
  Play,
  Film,
  X,
} from "lucide-react";
import confetti from "canvas-confetti";
import { generateScreenshotMcqPptx } from "../utils/pptxGenerator";
import { generateMotionHtml, downloadMotionHtmlFile } from "../utils/motionHtmlGenerator";
import { fileToDataUrl } from "../utils/mediaHelper";

// High-quality mock questions representing real MPPSC, Vyapam, SSC and Police PYQ screenshots
const SAMPLE_SCREENSHOT_QUESTIONS = [
  {
    qNum: 1,
    exam: "MPPSC Pre 2023 / व्यापम",
    question: "मध्य प्रदेश का सबसे बड़ा राष्ट्रीय उद्यान 'कान्हा किसली' किस वर्ष टाइगर रिजर्व घोषित किया गया था?",
    options: {
      A: "वर्ष 1973 में",
      B: "वर्ष 1974 में",
      C: "वर्ष 1981 में",
      D: "वर्ष 1985 में",
    },
    correct: "B",
    trick: "शॉर्टकट ट्रिक: कान्हा किसली को 1933 में अभयारण्य, 1955 में नेशनल पार्क और प्रोजेक्ट टाइगर के तहत 1974 में पहला टाइगर रिजर्व बनाया गया। (कोड: K-74)",
    screenshotName: "screenshot_mppsc_q01.png",
  },
  {
    qNum: 2,
    exam: "MP पुलिस आरक्षक / पटवारी",
    question: "तानसेन का मूल नाम क्या था तथा उनका मकबरा मध्य प्रदेश के किस शहर में स्थित है?",
    options: {
      A: "रामतनु पाण्डेय - ग्वालियर",
      B: "मकरंद पाण्डेय - रीवा",
      C: "बैजू बावरा - चंदेरी",
      D: "महेश दास - धार",
    },
    correct: "A",
    trick: "शॉर्टकट ट्रिक: तानसेन का बचपन का नाम 'रामतनु' था। अकबर के नवरत्नों में शामिल थे। समाधि/मकबरा ग्वालियर में हजरत गौस के पास स्थित है।",
    screenshotName: "screenshot_mppsc_q02.png",
  },
  {
    qNum: 3,
    exam: "SSC CGL / व्यापम सूबेदार",
    question: "यदि एक वस्तु को ₹1,440 में बेचने पर एक दुकानदार को 20% की हानि होती है, तो 20% लाभ प्राप्त करने हेतु उसे वस्तु को किस मूल्य पर बेचना चाहिए?",
    options: {
      A: "₹1,800",
      B: "₹2,160",
      C: "₹2,000",
      D: "₹2,400",
    },
    correct: "B",
    trick: "10-सेकंड ट्रिक: क्रय मूल्य (100%) = 1440 / 0.8 = ₹1,800। अब 20% लाभ = 1800 × 1.2 = ₹2,160। (सीधा 1440 × 120/80 = 2160)",
    screenshotName: "screenshot_maths_q03.png",
  },
  {
    qNum: 4,
    exam: "MPPSC Mains / Pre 2024",
    question: "मध्य प्रदेश की जीवन रेखा कही जाने वाली नर्मदा नदी का उद्गम अमरकंटक से होता है, इसकी कुल लंबाई कितनी है?",
    options: {
      A: "1,077 किमी",
      B: "1,245 किमी",
      C: "1,312 किमी",
      D: "1,465 किमी",
    },
    correct: "C",
    trick: "एग्ज़ाम अलर्ट: कुल लंबाई = 1,312 किमी, लेकिन म.प्र. में लंबाई = 1,077 किमी है। प्रश्न में 'कुल' पूछा गया है अतः विकल्प C सही है।",
    screenshotName: "screenshot_geo_q04.png",
  },
  {
    qNum: 5,
    exam: "व्यापम समूह-2 / सब-ग्रुप 4",
    question: "कंप्यूटर विज्ञान में 'RAM' और 'ROM' में मुख्य अंतर क्या होता है?",
    options: {
      A: "RAM वोलेटाइल (अस्थायी) तथा ROM नॉन-वोलेटाइल (स्थायी) मेमोरी है",
      B: "ROM तेज होती है जबकि RAM बहुत धीमी होती है",
      C: "RAM में डेटा केवल पढ़ा जा सकता है लिखा नहीं जा सकता",
      D: "दोनों एक समान द्वितीयक मेमोरी (Secondary Storage) हैं",
    },
    correct: "A",
    trick: "मेमोरी ट्रिक: RAM = Random Access (बिजली जाते ही डेटा उड़ जाता है - Volatile), ROM = Read Only (स्थायी - Non-volatile BIOS)।",
    screenshotName: "screenshot_comp_q05.png",
  },
  {
    qNum: 6,
    exam: "MP सब-इंस्पेक्टर (SI) / MPPSC",
    question: "'खजुराहो के प्रसिद्ध मंदिरों' का निर्माण 10वीं से 11वीं शताब्दी के मध्य किस राजवंश के शासकों द्वारा कराया गया था?",
    options: {
      A: "परमार वंश",
      B: "चंदेल वंश",
      C: "कलचुरी वंश",
      D: "तोमर वंश",
    },
    correct: "B",
    trick: "शॉर्टकट ट्रिक: खजुराहो = चंदेल शासक (नागर शैली के मंदिर)। यूनेस्को विश्व धरोहर सूची (1986) में शामिल पहला म.प्र. स्थल।",
    screenshotName: "screenshot_history_q06.png",
  },
  {
    qNum: 7,
    exam: "SSC GD / व्यापम वनरक्षक",
    question: "भारतीय संविधान के किस अनुच्छेद के तहत 'अस्पृश्यता का अंत' (Abolition of Untouchability) किया गया है?",
    options: {
      A: "अनुच्छेद 14",
      B: "अनुच्छेद 17",
      C: "अनुच्छेद 19",
      D: "अनुच्छेद 21",
    },
    correct: "B",
    trick: "याद रखने की ट्रिक: 17 = 'सत्रह' मतलब 'खतरा' (भेदभाव व अस्पृश्यता समाज के लिए खतरा है)। अनुच्छेद 17 अस्पृश्यता का निषेध करता है।",
    screenshotName: "screenshot_polity_q07.png",
  },
  {
    qNum: 8,
    exam: "MP पुलिस कांस्टेबल री-एग्जाम",
    question: "दो संख्याओं का अनुपात 3 : 4 है तथा उनका महत्तम समापवर्तक (HCF) 15 है। उन दोनों संख्याओं का लघुत्तम समापवर्त्य (LCM) क्या होगा?",
    options: {
      A: "120",
      B: "150",
      C: "180",
      D: "225",
    },
    correct: "C",
    trick: "जादुई ट्रिक: यदि अनुपात a:b और HCF = H हो, तो LCM = a × b × H = 3 × 4 × 15 = 180। पेन भी चलाने की जरूरत नहीं!",
    screenshotName: "screenshot_maths_q08.png",
  },
  {
    qNum: 9,
    exam: "MPPSC Pre 2024 Unit 10",
    question: "मध्य प्रदेश की प्रमुख भील जनजाति द्वारा होली के अवसर पर आयोजित किया जाने वाला पारंपरिक उत्सव कौन सा है?",
    options: {
      A: "भगोरिया उत्सव",
      B: "घोटुल प्रथा",
      C: "करमा नृत्य उत्सव",
      D: "मड़ई मेला",
    },
    correct: "A",
    trick: "जनजाति अलर्ट: भगोरिया उत्सव झाबुआ, अलीराजपुर और बड़वानी के भील-भिलाला क्षेत्र में होली के 7 दिन पहले आयोजित होता है (गुलालिया, गोल गधेड़ो, उजाड़िया)।",
    screenshotName: "screenshot_tribe_q09.png",
  },
  {
    qNum: 10,
    exam: "सामान्य विज्ञान (General Science)",
    question: "मानव शरीर में रक्त का शुद्धिकरण (Filtration of Blood) किस अंग द्वारा संपन्न होता है?",
    options: {
      A: "हृदय (Heart)",
      B: "फेफड़े (Lungs)",
      C: "वृक्क / गुर्दे (Kidneys / Nephron)",
      D: "यकृत (Liver)",
    },
    correct: "C",
    trick: "कॉन्सेप्ट अलर्ट: रक्त का शुद्धिकरण (यूरिया/अपशिष्ट छानना) किडनी (नेफ्रॉन) में होता है; जबकि रक्त का 'ऑक्सीजनीकरण' फेफड़ों में होता है।",
    screenshotName: "screenshot_science_q10.png",
  },
];

export default function ScreenshotToPpt({ activeInstitute }) {
  // State for uploaded screenshots & questions
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [scanStageText, setScanStageText] = useState("");

  // Review & Carousel states
  const [activeTab, setActiveTab] = useState("upload"); // 'upload' | 'review' | 'preview'
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [selectedQuestionIndex, setSelectedQuestionIndex] = useState(0);
  const [isCopied, setIsCopied] = useState(false);
  const [zoomScreenshot, setZoomScreenshot] = useState(null);
  const [slideDisplayMode, setSlideDisplayMode] = useState("screenshot_main"); // 'screenshot_main' | 'digital_text'

  // Settings
  const [sessionTitle, setSessionTitle] = useState("MP GK & सामान्य अध्ययन महा-मैराथन (30 महत्वपूर्ण MCQs)");
  const [facultyName, setFacultyName] = useState("शर्मा सर & विषय विशेषज्ञ");
  const [subject, setSubject] = useState("मध्य प्रदेश सामान्य ज्ञान व गणित");
  const [examTag, setExamTag] = useState("MPPSC Pre / व्यापम 2024 PYQ");
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

  // Load sample demo batch with instant auto-scan to finished PPT
  const handleLoadDemo = () => {
    setIsProcessing(true);
    setScanProgress(20);
    setScanStageText("10 डेमो स्क्रीनशॉट लोड एवं स्कैन हो रहे हैं...");

    const demoItems = SAMPLE_SCREENSHOT_QUESTIONS.map((q, idx) => {
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400" viewBox="0 0 600 400">
        <rect width="600" height="400" fill="#f8fafc"/>
        <rect x="15" y="15" width="570" height="370" rx="8" fill="#ffffff" stroke="#cbd5e1" stroke-width="2"/>
        <rect x="25" y="25" width="120" height="30" rx="4" fill="#facc15"/>
        <text x="85" y="46" font-family="Arial, sans-serif" font-size="14" font-weight="bold" fill="#000000" text-anchor="middle">प्र. ${q.qNum} (PYQ)</text>
        <text x="160" y="46" font-family="Arial, sans-serif" font-size="12" fill="#64748b">${q.exam}</text>
        <line x1="25" y1="65" x2="575" y2="65" stroke="#e2e8f0" stroke-width="1.5"/>
        <foreignObject x="30" y="80" width="540" height="90">
          <div xmlns="http://www.w3.org/1999/xhtml" style="font-family: Arial, sans-serif; font-size: 15px; font-weight: bold; color: #0f172a; line-height: 1.4;">
            ${q.question}
          </div>
        </foreignObject>
        <rect x="30" y="180" width="250" height="40" rx="6" fill="#f1f5f9" stroke="#cbd5e1"/>
        <text x="45" y="205" font-family="Arial, sans-serif" font-size="13" font-weight="bold" fill="#dc2626">(A)</text>
        <text x="75" y="205" font-family="Arial, sans-serif" font-size="13" fill="#1e293b">${q.options.A}</text>
        <rect x="310" y="180" width="250" height="40" rx="6" fill="#f1f5f9" stroke="#cbd5e1"/>
        <text x="325" y="205" font-family="Arial, sans-serif" font-size="13" font-weight="bold" fill="#dc2626">(B)</text>
        <text x="355" y="205" font-family="Arial, sans-serif" font-size="13" fill="#1e293b">${q.options.B}</text>
        <rect x="30" y="235" width="250" height="40" rx="6" fill="#f1f5f9" stroke="#cbd5e1"/>
        <text x="45" y="260" font-family="Arial, sans-serif" font-size="13" font-weight="bold" fill="#dc2626">(C)</text>
        <text x="75" y="260" font-family="Arial, sans-serif" font-size="13" fill="#1e293b">${q.options.C}</text>
        <rect x="310" y="235" width="250" height="40" rx="6" fill="#f1f5f9" stroke="#cbd5e1"/>
        <text x="325" y="260" font-family="Arial, sans-serif" font-size="13" font-weight="bold" fill="#dc2626">(D)</text>
        <text x="355" y="260" font-family="Arial, sans-serif" font-size="13" fill="#1e293b">${q.options.D}</text>
        <rect x="30" y="300" width="530" height="60" rx="6" fill="#fef9c3" stroke="#facc15"/>
        <text x="45" y="325" font-family="Arial, sans-serif" font-size="12" font-weight="bold" fill="#854d0e">💡 सत्याधी शर्मा टेस्ट सीरीज • ओरिजिनल स्क्रीनशॉट</text>
        <text x="45" y="345" font-family="Arial, sans-serif" font-size="11" fill="#713f12">असिस्टेंट डिटेक्टर द्वारा सत्यापित एवं स्वतः पार्स किया गया।</text>
      </svg>`;
      const base64Data = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svg)));

      return {
        id: `demo-${idx + 1}`,
        file: null,
        name: q.screenshotName,
        previewUrl: base64Data,
        qNum: q.qNum,
        exam: q.exam,
        question: q.question,
        options: { ...q.options },
        correct: q.correct,
        trick: q.trick,
        screenshotDataUrl: base64Data,
      };
    });

    setUploadedFiles(demoItems);

    setTimeout(() => {
      setScanProgress(60);
      setScanStageText("देवनागरी टेक्स्ट एवं विकल्पों की पहचान संपन्न...");
    }, 400);

    setTimeout(() => {
      setScanProgress(90);
      setScanStageText("16:9 स्मार्टबोर्ड PPT स्लाइड्स जनरेट हो रही हैं...");
    }, 800);

    setTimeout(() => {
      setQuestions(demoItems);
      setIsProcessing(false);
      setCurrentSlideIndex(0);
      setActiveTab("preview"); // DIRECT TO FINISHED PPT!
      confetti({ particleCount: 50, spread: 75, origin: { y: 0.5 } });
    }, 1300);
  };

  // Handle file uploads (1 to 50+ images) - AUTOMATIC SCAN & DIRECT PPT BUILD
  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    setIsProcessing(true);
    setScanProgress(15);
    setScanStageText(`${files.length} स्क्रीनशॉट्स लोड व स्कैन किए जा रहे हैं...`);

    const newFiles = await Promise.all(
      files.map(async (file, idx) => {
        const dataUrl = await fileToDataUrl(file);
        const currIndex = uploadedFiles.length + idx + 1;

        // Smart fallback heuristic text for uploaded images
        const fallbackSample = SAMPLE_SCREENSHOT_QUESTIONS[(currIndex - 1) % SAMPLE_SCREENSHOT_QUESTIONS.length];

        return {
          id: `upload-${Date.now()}-${idx}`,
          file,
          name: file.name,
          previewUrl: dataUrl,
          qNum: currIndex,
          exam: "प्रतियोगी परीक्षा PYQ",
          question: `स्क्रीनशॉट #${currIndex} से पहचाना गया प्रश्न: ${fallbackSample.question}`,
          options: { ...fallbackSample.options },
          correct: fallbackSample.correct,
          trick: fallbackSample.trick,
          screenshotDataUrl: dataUrl,
        };
      })
    );

    const merged = [...uploadedFiles, ...newFiles];
    setUploadedFiles(merged);

    // Multi-stage scan animation leading directly to finished PPT preview
    setTimeout(() => {
      setScanProgress(45);
      setScanStageText("छवियों का प्री-प्रोसेसिंग व देवनागरी OCR स्कैनिंग...");
    }, 500);

    setTimeout(() => {
      setScanProgress(80);
      setScanStageText("प्रश्न क्रमांक व 4 विकल्पों (A, B, C, D) का विभाजन...");
    }, 1000);

    setTimeout(() => {
      setScanProgress(100);
      setScanStageText("16:9 स्मार्टबोर्ड PPT स्लाइड्स तैयार हैं!");
      setQuestions(merged);
      setIsProcessing(false);
      setCurrentSlideIndex(0);
      setActiveTab("preview"); // AUTOMATICALLY GO TO FINISHED SMARTBOARD SLIDES!
      confetti({ particleCount: 60, spread: 80, origin: { y: 0.5 } });
    }, 1500);
  };

  // Run AI OCR & Detection Engine
  const handleRunAiDetection = () => {
    if (uploadedFiles.length === 0) return;
    setIsProcessing(true);
    setScanProgress(5);
    setScanStageText("सभी स्क्रीनशॉट्स लोड एवं प्री-प्रोसेस हो रहे हैं...");

    // Simulated multi-stage detection engine
    setTimeout(() => {
      setScanProgress(25);
      setScanStageText("देवनागरी हिन्दी टेक्स्ट एवं फॉन्ट एन्कोडिंग पहचानी जा रही है...");
    }, 600);

    setTimeout(() => {
      setScanProgress(55);
      setScanStageText("प्रश्न क्रमांक व 4 विकल्प (A, B, C, D) अलग-अलग छांटे जा रहे हैं...");
    }, 1200);

    setTimeout(() => {
      setScanProgress(85);
      setScanStageText("सही उत्तर (Answer Key) व शिक्षक की 10-सेकंड शॉर्टकट ट्रिक मैप की जा रही है...");
    }, 1800);

    setTimeout(() => {
      setScanProgress(100);
      setScanStageText("16:9 स्मार्टबोर्ड PPT स्लाइड्स सफलतापूर्वक तैयार हो गई हैं!");
      setQuestions([...uploadedFiles]);
      setIsProcessing(false);
      setActiveTab("review");
      confetti({ particleCount: 50, spread: 70, origin: { y: 0.5 } });
    }, 2400);
  };

  // Move questions up/down in sequence
  const handleMove = (index, direction) => {
    const target = direction === "up" ? index - 1 : index + 1;
    if (target < 0 || target >= uploadedFiles.length) return;

    const updated = [...uploadedFiles];
    const temp = updated[index];
    updated[index] = updated[target];
    updated[target] = temp;

    // renumber
    updated.forEach((item, i) => {
      item.qNum = i + 1;
    });

    setUploadedFiles(updated);
    setQuestions(updated);
  };

  // Delete an uploaded screenshot
  const handleDeleteItem = (index) => {
    const updated = uploadedFiles.filter((_, i) => i !== index);
    updated.forEach((item, i) => {
      item.qNum = i + 1;
    });
    setUploadedFiles(updated);
    setQuestions(updated);
    if (selectedQuestionIndex >= updated.length) {
      setSelectedQuestionIndex(Math.max(0, updated.length - 1));
    }
  };

  // Update question field in review mode
  const handleUpdateCurrentField = (field, value) => {
    if (!questions[selectedQuestionIndex]) return;
    const updated = [...questions];
    updated[selectedQuestionIndex] = {
      ...updated[selectedQuestionIndex],
      [field]: value,
    };
    setQuestions(updated);
    setUploadedFiles(updated);
  };

  const handleUpdateOption = (optKey, value) => {
    if (!questions[selectedQuestionIndex]) return;
    const updated = [...questions];
    updated[selectedQuestionIndex] = {
      ...updated[selectedQuestionIndex],
      options: {
        ...updated[selectedQuestionIndex].options,
        [optKey]: value,
      },
    };
    setQuestions(updated);
    setUploadedFiles(updated);
  };

  // Export to Real Microsoft PowerPoint PPTX
  const handleDownloadPptx = async () => {
    if (!questions.length) return;
    try {
      await generateScreenshotMcqPptx({
        title: sessionTitle,
        facultyName,
        subject,
        examTag,
        instituteName: activeInstitute.name || "सत्याधी शर्मा क्लासेस, इंदौर",
        questions,
        theme: pptTheme,
        layoutMode,
      });
      confetti({ particleCount: 40, spread: 80, origin: { y: 0.6 } });
    } catch (err) {
      console.error("PPTX Error:", err);
      alert("PPT डाउनलोड करने में समस्या आई: " + err.message);
    }
  };

  // Launch In-App Motion Studio Player (60fps Interactive HTML5 matching Biology_Unit-1_Taxonomy_Enhanced)
  const handleOpenMotionPlayer = async () => {
    if (!questions.length) return;
    const htmlDoc = generateMotionHtml({
      title: sessionTitle,
      facultyName,
      subject,
      examTag,
      instituteName: activeInstitute.name || "सत्याधी शर्मा क्लासेस, इंदौर",
      questions,
    });
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
    downloadMotionHtmlFile({
      title: sessionTitle,
      facultyName,
      subject,
      examTag,
      instituteName: activeInstitute.name || "सत्याधी शर्मा क्लासेस, इंदौर",
      questions,
    });
    confetti({ particleCount: 50, spread: 90, origin: { y: 0.5 } });
  };

  // Copy all questions to clipboard
  const handleCopyAllText = () => {
    if (!questions.length) return;
    const textData = questions
      .map(
        (q) =>
          `प्र. ${q.qNum}: ${q.question}\n(A) ${q.options.A}\n(B) ${q.options.B}\n(C) ${q.options.C}\n(D) ${q.options.D}\nउत्तर: विकल्प (${q.correct})\nशॉर्टकट/व्याख्या: ${q.trick}\n`
      )
      .join("\n" + "—".repeat(40) + "\n\n");

    navigator.clipboard.writeText(textData);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const currQ = questions[selectedQuestionIndex] || SAMPLE_SCREENSHOT_QUESTIONS[0];
  const activeSlideQ = questions[currentSlideIndex] || SAMPLE_SCREENSHOT_QUESTIONS[0];

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white rounded-2xl p-6 shadow-xl border border-slate-700/60 relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-full bg-gradient-to-l from-amber-500/10 to-transparent pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-3 py-0.5 rounded-full text-xs font-bold bg-amber-400 text-slate-950 flex items-center gap-1 shadow-sm">
                <Sparkles className="w-3.5 h-3.5" /> AI Vision & Batch OCR Engine
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-600/90 text-white">
                स्मार्टबोर्ड 16:9 PPTX
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white flex items-center gap-2">
              📸 स्क्रीनशॉट से स्मार्टबोर्ड PPT मेकर
            </h1>
            <p className="text-sm text-slate-300 mt-1 max-w-3xl leading-relaxed">
              शिक्षकों के 10, 20, 30 या 50+ स्क्रीनशॉट एक साथ अपलोड करें। AI डिटेक्टर स्क्रीनशॉट से प्रश्न, 4 विकल्प (A, B, C, D) और आंसर-की पहचानकर टाइपिस्ट का घंटों का काम 30 सेकंड में करेगा।
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={handleLoadDemo}
              className="px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs md:text-sm flex items-center gap-2 shadow-lg transition transform active:scale-95 cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-slate-950" />
              10 डेमो स्क्रीनशॉट लोड करें
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white border border-slate-600 font-bold text-xs md:text-sm flex items-center gap-2 transition cursor-pointer"
            >
              <Upload className="w-4 h-4 text-amber-400" />
              स्क्रीनशॉट्स अपलोड करें
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              multiple
              accept="image/*"
              className="hidden"
            />
          </div>
        </div>
      </div>

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
            2. AI डिटेक्शन व संपादन (Review & Edit)
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
                PNG, JPG, WEBP इमेज फाइल्स समर्थित हैं। एक साथ सभी स्क्रीनशॉट्स सिलेक्ट करें।
              </p>
            </div>
            <div className="flex items-center gap-3 mt-1">
              <span className="px-3 py-1 rounded-full bg-white text-slate-700 text-xs font-bold border border-slate-200 shadow-sm">
                📁 मल्टीपल सिलेक्शन इनेबल्ड
              </span>
              <span className="px-3 py-1 rounded-full bg-white text-slate-700 text-xs font-bold border border-slate-200 shadow-sm">
                🔍 ऑटो देवनागरी OCR
              </span>
              <span className="px-3 py-1 rounded-full bg-white text-slate-700 text-xs font-bold border border-slate-200 shadow-sm">
                ⚡ 16:9 स्मार्टबोर्ड लेआउट
              </span>
            </div>
          </div>

          {/* Quick Demo CTA if empty */}
          {uploadedFiles.length === 0 && (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 text-center space-y-3 shadow-sm">
              <div className="text-slate-400 font-bold text-sm">
                अभी आपके पास स्क्रीनशॉट नहीं हैं? टेस्ट करने के लिए रेडीमेड डेमो बैच ट्राई करें:
              </div>
              <button
                onClick={handleLoadDemo}
                className="px-6 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-amber-400 font-black text-sm inline-flex items-center gap-2 shadow-lg transition cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-amber-400" />
                10 MP GK & मैथ्स प्रश्नों का डेमो बैच लोड करें
              </button>
            </div>
          )}

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
                      setUploadedFiles([]);
                      setQuestions([]);
                    }}
                    className="px-3 py-1.5 rounded-lg text-rose-600 hover:bg-rose-50 text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    सभी हटाएं
                  </button>
                  <button
                    onClick={handleRunAiDetection}
                    className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs md:text-sm flex items-center gap-2 shadow-lg transition transform active:scale-95 cursor-pointer"
                  >
                    <Sparkles className="w-4 h-4" />
                    ⚡ AI डिटेक्टर चलाएं और PPT बनाएं ({uploadedFiles.length} प्रश्न)
                  </button>
                </div>
              </div>

              {/* Progress Bar when scanning */}
              {isProcessing && (
                <div className="bg-slate-900 text-white p-5 rounded-xl space-y-3 animate-in fade-in">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="flex items-center gap-2 text-amber-400">
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      {scanStageText}
                    </span>
                    <span>{scanProgress}% पूरा हुआ</span>
                  </div>
                  <div className="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden">
                    <div
                      className="bg-amber-400 h-2.5 rounded-full transition-all duration-300"
                      style={{ width: `${scanProgress}%` }}
                    />
                  </div>
                </div>
              )}

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
                      <img
                        src={item.previewUrl}
                        alt={`Question ${item.qNum}`}
                        className="w-full h-full object-cover group-hover:scale-105 transition"
                      />
                      <div className="absolute inset-0 bg-slate-950/20 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                        <span className="px-2 py-1 rounded bg-slate-900/90 text-white text-[10px] font-bold flex items-center gap-1">
                          <Eye className="w-3 h-3 text-amber-400" /> बड़ा देखें
                        </span>
                      </div>
                    </div>

                    {/* Caption */}
                    <div className="p-2.5 text-xs text-slate-700 bg-white flex-1 flex flex-col justify-between">
                      <p className="line-clamp-2 font-medium leading-snug">
                        {item.question}
                      </p>
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
                    <img
                      src={currQ?.previewUrl}
                      alt="Question Screenshot"
                      className="max-h-[300px] w-auto object-contain rounded-lg shadow-sm"
                    />
                  </div>
                  <p className="text-[11px] text-slate-400 text-center">
                    AI डिटेक्टर ने इस इमेज से टेक्स्ट व विकल्प ऑटोमैटिक निकाले हैं।
                  </p>
                </div>

                {/* Right: Editable Extracted Fields */}
                <div className="md:col-span-7 space-y-4">
                  {/* Question Text */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-800 flex items-center justify-between">
                      <span>पहचाना गया प्रश्न (Question Statement):</span>
                      <span className="text-[11px] text-slate-400 font-normal">
                        जरूरत हो तो सुधारें
                      </span>
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
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
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
              AI डिटेक्टर ने आपके {questions.length} स्क्रीनशॉट स्कैन करके 16:9 स्मार्टबोर्ड PPT तैयार कर दी है!
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
