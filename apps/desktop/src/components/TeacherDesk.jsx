import React, { useState } from "react";
import {
  GraduationCap,
  Calendar,
  Clock,
  BookOpen,
  Camera,
  Presentation,
  FileSpreadsheet,
  Lightbulb,
  FileQuestion,
  CheckCircle2,
  AlertCircle,
  Video,
  Award,
  Users,
  ChevronRight,
  TrendingUp,
  Download,
  Share2,
  Sparkles,
  Edit3,
} from "lucide-react";
import confetti from "canvas-confetti";

export default function TeacherDesk({ activeInstitute, onNavigate }) {
  // Active faculty selection
  const [selectedFaculty, setSelectedFaculty] = useState("sharma_sir");

  const faculties = [
    {
      id: "sharma_sir",
      name: "शर्मा सर (संस्थापक & मुख्य मार्गदर्शक)",
      subject: "मध्य प्रदेश सामान्य ज्ञान (MP GK) & भारतीय इतिहास",
      experience: "14+ वर्ष अनुभव",
      batchesCount: 5,
      todayClasses: 3,
      badge: "मुख्य फैकल्टी",
      avatar: "👨‍🏫",
      upcomingClass: "11:00 AM - MP GK (1857 की क्रांति व म.प्र. का योगदान) • हॉल नं. 3",
    },
    {
      id: "thakur_sir",
      name: "ठाकुर सर (गणित विशेषज्ञ)",
      subject: "प्रतियोगी अंकगणित (Maths) & एडवांस्ड ट्रिक्स",
      experience: "9+ वर्ष अनुभव",
      batchesCount: 4,
      todayClasses: 2,
      badge: "मैथ्स गुरु",
      avatar: "📐",
      upcomingClass: "02:00 PM - प्रतिशत व लाभ-हानि 10-सेकंड शॉर्ट ट्रिक्स • हॉल नं. 1",
    },
    {
      id: "patidar_sir",
      name: "पाटीदार सर (संविधान & राजव्यवस्था)",
      subject: "भारतीय संविधान, राजव्यवस्था & समसामयिकी (Current Affairs)",
      experience: "8+ वर्ष अनुभव",
      batchesCount: 4,
      todayClasses: 2,
      badge: "पॉलिटी एक्सपर्ट",
      avatar: "⚖️",
      upcomingClass: "04:00 PM - मौलिक अधिकार व नीति निदेशक तत्व • हॉल नं. 2",
    },
    {
      id: "verma_madam",
      name: "डॉ. रीना वर्मा (विज्ञान & पर्यावरण)",
      subject: "सामान्य विज्ञान (Biology, Physics, Chemistry) & पर्यावरण",
      experience: "7+ वर्ष अनुभव",
      batchesCount: 3,
      todayClasses: 1,
      badge: "साइंस फैकल्टी",
      avatar: "🔬",
      upcomingClass: "06:00 PM - मानव शरीर क्रिया विज्ञान (NEET & MPPSC) • हॉल नं. 4",
    },
  ];

  const currentFaculty =
    faculties.find((f) => f.id === selectedFaculty) || faculties[0];

  // Syllabus tracker data
  const [syllabusList, setSyllabusList] = useState([
    {
      topic: "मध्य प्रदेश का इतिहास व प्रमुख राजवंश (परमार, चंदेल, होलकर)",
      progress: 85,
      status: "पूर्ण होने वाला है",
      statusColor: "text-emerald-600 bg-emerald-50",
      targetExam: "MPPSC Pre 2026",
    },
    {
      topic: "म.प्र. का भूगोल, नदियां, जलप्रपात व राष्ट्रीय उद्यान",
      progress: 70,
      status: "प्रगति पर",
      statusColor: "text-blue-600 bg-blue-50",
      targetExam: "MP पुलिस आरक्षक / पटवारी",
    },
    {
      topic: "म.प्र. की प्रमुख जनजातियां, लोकनृत्य व बोलियां (Unit-10)",
      progress: 45,
      status: "चालू है",
      statusColor: "text-amber-600 bg-amber-50",
      targetExam: "MPPSC Special",
    },
    {
      topic: "म.प्र. की अर्थव्यवस्था, खनिज व कृषि परिदृश्य",
      progress: 20,
      status: "आगामी सप्ताह",
      statusColor: "text-purple-600 bg-purple-50",
      targetExam: "व्यापम संयुक्त भर्ती",
    },
  ]);

  // Today's Teaching Schedule
  const todaySchedule = [
    {
      time: "08:00 AM - 10:00 AM",
      batch: "MPPSC प्रीलिम्स फाउंडेशन बैच (सुबह)",
      room: "स्मार्ट क्लासरूम हॉल नं. 3",
      topic: "होलकर राजवंश व देवी अहिल्याबाई का शासनकाल",
      status: "संपन्न (Completed)",
      dppGiven: true,
      pptUsed: true,
    },
    {
      time: "11:00 AM - 01:00 PM",
      batch: "MP पुलिस आरक्षक & सब-इंस्पेक्टर (टारगेट बैच)",
      room: "डिजिटल बोर्ड हॉल नं. 1",
      topic: "1857 की क्रांति में म.प्र. के अमर सेनानी (तात्या टोपे, भीमा नायक)",
      status: "लाइव होने वाला है (Next Up)",
      dppGiven: false,
      pptUsed: true,
    },
    {
      time: "07:00 PM - 08:30 PM",
      batch: "YouTube लाइव महा-मैराथन (सत्याधी शर्मा ऑफिशियल)",
      room: "स्टूडियो 1 (Live YouTube Stream)",
      topic: "MP GK के 100 सबसे महत्वपूर्ण PYQs (लाइव टेस्ट)",
      status: "शाम को लाइव",
      dppGiven: true,
      pptUsed: true,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner: Teacher Portal Welcome */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white rounded-2xl p-6 shadow-xl border border-slate-700/60 relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-full bg-gradient-to-l from-amber-500/10 to-transparent pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-3 py-0.5 rounded-full text-xs font-bold bg-amber-400 text-slate-950 flex items-center gap-1 shadow-sm">
                <GraduationCap className="w-3.5 h-3.5" /> शिक्षक व फैकल्टी पोर्टल (Faculty Desk)
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-600 text-white">
                सत्र 2026-27
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white flex items-center gap-2">
              👨‍🏫 {currentFaculty.name}
            </h1>
            <p className="text-xs md:text-sm text-slate-300 mt-1 max-w-2xl leading-relaxed">
              विषय: <strong className="text-amber-400">{currentFaculty.subject}</strong> • {currentFaculty.experience} • {activeInstitute.name || "सत्याधी शर्मा क्लासेस, इंदौर"}
            </p>
          </div>

          {/* Faculty Switcher Pill */}
          <div className="bg-slate-800/90 border border-slate-700 p-2 rounded-xl flex flex-col gap-1.5 shrink-0">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-1">
              फैकल्टी प्रोफाइल चुनें:
            </span>
            <select
              value={selectedFaculty}
              onChange={(e) => setSelectedFaculty(e.target.value)}
              className="bg-slate-900 text-white font-bold text-xs p-2 rounded-lg border border-slate-600 focus:outline-none focus:border-amber-400"
            >
              {faculties.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.avatar} {f.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Teacher's 1-Click Launchpad Tools (Most Used by Teachers Daily) */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div>
            <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-500" />
              शिक्षक त्वरित कार्य केंद्र (Teacher's Daily Action Hub)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              अपनी क्लास, DPP, नोट्स या टेस्ट पेपर के लिए सीधे संबंधित टूल पर जाएँ:
            </p>
          </div>
          <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200">
            5 मुख्य टूल्स
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5">
          {/* Tool 1: Screenshot to Smartboard PPT */}
          <div
            onClick={() => onNavigate && onNavigate("ocr_ppt")}
            className="p-4 rounded-xl border border-amber-200 bg-gradient-to-b from-amber-50/60 to-white hover:border-amber-400 hover:shadow-md transition cursor-pointer flex flex-col justify-between group"
          >
            <div>
              <div className="w-10 h-10 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center font-bold shadow-sm mb-3 group-hover:scale-105 transition">
                <Camera className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full inline-block mb-1">
                ★ 30 स्क्रीनशॉट PPT
              </span>
              <h4 className="font-black text-slate-900 text-sm group-hover:text-amber-700 transition">
                स्क्रीनशॉट से PPT बनाएं
              </h4>
              <p className="text-[11px] text-slate-600 mt-1 leading-snug">
                प्रश्नों के स्क्रीनशॉट अपलोड करें और स्मार्टबोर्ड PPT 30 सेकंड में बनाएं।
              </p>
            </div>
            <div className="mt-3 pt-2 border-t border-amber-100 flex items-center justify-between text-xs font-bold text-amber-700">
              <span>अभी बनाएं</span>
              <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition" />
            </div>
          </div>

          {/* Tool 2: Daily DPP & Notes Maker */}
          <div
            onClick={() => onNavigate && onNavigate("dpp")}
            className="p-4 rounded-xl border border-teal-200 bg-gradient-to-b from-teal-50/60 to-white hover:border-teal-400 hover:shadow-md transition cursor-pointer flex flex-col justify-between group"
          >
            <div>
              <div className="w-10 h-10 rounded-xl bg-teal-500 text-white flex items-center justify-center font-bold shadow-sm mb-3 group-hover:scale-105 transition">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-teal-800 bg-teal-100 px-2 py-0.5 rounded-full inline-block mb-1">
                क्लास DPP & OMR
              </span>
              <h4 className="font-black text-slate-900 text-sm group-hover:text-teal-700 transition">
                डेली DPP & OMR शीट
              </h4>
              <p className="text-[11px] text-slate-600 mt-1 leading-snug">
                आज के लेक्चर के 10 प्रश्न व छात्रों के लिए कॉर्नेल नोट्स प्रिंट करें।
              </p>
            </div>
            <div className="mt-3 pt-2 border-t border-teal-100 flex items-center justify-between text-xs font-bold text-teal-700">
              <span>प्रिंट करें</span>
              <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition" />
            </div>
          </div>

          {/* Tool 3: Doubt Solver & Short Tricks */}
          <div
            onClick={() => onNavigate && onNavigate("doubt")}
            className="p-4 rounded-xl border border-violet-200 bg-gradient-to-b from-violet-50/60 to-white hover:border-violet-400 hover:shadow-md transition cursor-pointer flex flex-col justify-between group"
          >
            <div>
              <div className="w-10 h-10 rounded-xl bg-violet-600 text-white flex items-center justify-center font-bold shadow-sm mb-3 group-hover:scale-105 transition">
                <Lightbulb className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-violet-800 bg-violet-100 px-2 py-0.5 rounded-full inline-block mb-1">
                10-Sec Tricks
              </span>
              <h4 className="font-black text-slate-900 text-sm group-hover:text-violet-700 transition">
                डाउट सॉल्वर & ट्रिक्स
              </h4>
              <p className="text-[11px] text-slate-600 mt-1 leading-snug">
                कठिन प्रश्नों का चरणबद्ध हिन्दी हल और जादुई शॉर्टकट ट्रिक्स खोजें।
              </p>
            </div>
            <div className="mt-3 pt-2 border-t border-violet-100 flex items-center justify-between text-xs font-bold text-violet-700">
              <span>ट्रिक देखें</span>
              <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition" />
            </div>
          </div>

          {/* Tool 4: Lecture Planner & Digital Board Notes */}
          <div
            onClick={() => onNavigate && onNavigate("lesson")}
            className="p-4 rounded-xl border border-blue-200 bg-gradient-to-b from-blue-50/60 to-white hover:border-blue-400 hover:shadow-md transition cursor-pointer flex flex-col justify-between group"
          >
            <div>
              <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold shadow-sm mb-3 group-hover:scale-105 transition">
                <BookOpen className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-blue-800 bg-blue-100 px-2 py-0.5 rounded-full inline-block mb-1">
                30-दिन सिलेबस
              </span>
              <h4 className="font-black text-slate-900 text-sm group-hover:text-blue-700 transition">
                लेक्चर प्लानर & नोट्स
              </h4>
              <p className="text-[11px] text-slate-600 mt-1 leading-snug">
                पूरे महीने की क्लास डायरी, लर्निंग ऑब्जेक्टिव व बोर्ड नोट्स तैयार करें।
              </p>
            </div>
            <div className="mt-3 pt-2 border-t border-blue-100 flex items-center justify-between text-xs font-bold text-blue-700">
              <span>डायरी खोलें</span>
              <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition" />
            </div>
          </div>

          {/* Tool 5: Sunday Test Paper Maker */}
          <div
            onClick={() => onNavigate && onNavigate("test")}
            className="p-4 rounded-xl border border-emerald-200 bg-gradient-to-b from-emerald-50/60 to-white hover:border-emerald-400 hover:shadow-md transition cursor-pointer flex flex-col justify-between group"
          >
            <div>
              <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold shadow-sm mb-3 group-hover:scale-105 transition">
                <FileQuestion className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full inline-block mb-1">
                संडे टेस्ट & की
              </span>
              <h4 className="font-black text-slate-900 text-sm group-hover:text-emerald-700 transition">
                टेस्ट पेपर & आंसर-की
              </h4>
              <p className="text-[11px] text-slate-600 mt-1 leading-snug">
                MPPSC/व्यापम पैटर्न पर 50-100 प्रश्नों का पेपर व मूल्यांकन कुंजी बनाएं।
              </p>
            </div>
            <div className="mt-3 pt-2 border-t border-emerald-100 flex items-center justify-between text-xs font-bold text-emerald-700">
              <span>पेपर बनाएं</span>
              <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition" />
            </div>
          </div>
        </div>
      </div>

      {/* Two Column Layout: Today's Class Schedule vs Syllabus Progress */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Today's Classroom & YouTube Schedule */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-amber-500" />
              <h3 className="font-black text-slate-900 text-base">
                आज का टीचिंग शेड्यूल ({currentFaculty.todayClasses} सेशंस)
              </h3>
            </div>
            <span className="text-xs font-bold text-slate-500">
              लाइव अपडेट
            </span>
          </div>

          <div className="space-y-3">
            {todaySchedule.map((item, idx) => (
              <div
                key={idx}
                className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-slate-50 transition space-y-2"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <span className="font-black text-xs text-amber-700 bg-amber-100 px-2.5 py-1 rounded-md w-fit">
                    ⏰ {item.time}
                  </span>
                  <span
                    className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                      item.status.includes("Completed")
                        ? "bg-slate-200 text-slate-700"
                        : item.status.includes("Next Up")
                        ? "bg-emerald-100 text-emerald-800 animate-pulse"
                        : "bg-blue-100 text-blue-800"
                    }`}
                  >
                    ● {item.status}
                  </span>
                </div>

                <div>
                  <h4 className="font-black text-slate-900 text-sm">
                    {item.batch}
                  </h4>
                  <p className="text-xs text-slate-600 mt-0.5">
                    विषय / टॉपिक: <strong className="text-slate-800">{item.topic}</strong>
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    📍 {item.room}
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-3 text-[11px] text-slate-600">
                    <span className="flex items-center gap-1">
                      {item.pptUsed ? "✅ PPT तैयार" : "⚠️ PPT पेंडिंग"}
                    </span>
                    <span className="flex items-center gap-1">
                      {item.dppGiven ? "✅ DPP प्रिंटेड" : "⚠️ DPP पेंडिंग"}
                    </span>
                  </div>
                  <button
                    onClick={() => onNavigate && onNavigate("ocr_ppt")}
                    className="text-amber-700 hover:text-amber-800 font-bold text-xs flex items-center gap-1"
                  >
                    क्लास PPT खोलें →
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Faculty Syllabus Tracker & Notes Hub */}
        <div className="lg:col-span-5 space-y-6">
          {/* Syllabus Progress Card */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-600" />
                <h3 className="font-black text-slate-900 text-sm">
                  फैकल्टी सिलेबस ट्रैकर (Syllabus Progress)
                </h3>
              </div>
              <span className="text-xs font-bold text-emerald-700">
                औसत 65% पूर्ण
              </span>
            </div>

            <div className="space-y-3.5">
              {syllabusList.map((syl, sIdx) => (
                <div key={sIdx} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-800 leading-snug max-w-[75%]">
                      {syl.topic}
                    </span>
                    <span className="font-black text-slate-900">
                      {syl.progress}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-2 rounded-full transition-all duration-500 ${
                        syl.progress > 75
                          ? "bg-emerald-500"
                          : syl.progress > 50
                          ? "bg-blue-500"
                          : "bg-amber-400"
                      }`}
                      style={{ width: `${syl.progress}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-500">
                    <span>{syl.targetExam}</span>
                    <span className={`px-1.5 py-0.2 rounded font-semibold ${syl.statusColor}`}>
                      {syl.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Notice for Teachers */}
          <div className="bg-slate-900 text-white rounded-2xl p-5 space-y-3 border border-slate-800 shadow-md">
            <div className="flex items-center gap-2 text-amber-400 font-bold text-xs uppercase tracking-wider">
              <AlertCircle className="w-4 h-4" /> शिक्षक दिशा-निर्देश (Faculty Notice)
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              कृपया सभी शिक्षक बंधु अपनी आगामी YouTube लाइव क्लास के लिए 16:9 थंबनेल और स्मार्टबोर्ड PPT क्लास शुरू होने से 1 घंटा पूर्व तैयार कर लें, ताकि क्लासरूम ऑपरेटर और ब्रॉडकास्ट टीम समय पर स्ट्रीम सेट कर सके।
            </p>
            <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs">
              <span className="text-slate-400">सत्याधी शर्मा क्लासेस, इंदौर</span>
              <button
                onClick={() => onNavigate && onNavigate("ocr_ppt")}
                className="px-3 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs transition"
              >
                स्मार्टबोर्ड PPT बनाएं →
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
