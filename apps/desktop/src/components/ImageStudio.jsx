import React, { useState } from "react";
import { Image as ImageIcon, FileText } from "lucide-react";
import { instituteLogo } from "../utils/branding.ts";
import { PosterCopyOutputSchema, can } from "@edusuite/shared";
import { useSignedInUser } from "../api/session.tsx";
import { DocumentBar } from "./DocumentBar.tsx";
import { AiGenerate } from "./AiGenerate.tsx";
import { Button, ConfirmDialog, Field, Input, PageHeader, Select, Textarea } from "./ui/index.ts";
import { tx } from "../i18n/index.ts";

/**
 * Poster kinds. Each has a badge shown on the poster and a plain starting template;
 * words in [brackets] are for staff to replace. These are templates, not AI.
 */
const CATEGORIES = () => ([
  { id: "admission", label: tx("प्रवेश व बैच"), icon: "🎓", badge: tx("प्रवेश प्रारंभ"), color: "#38bdf8", head: tx("नए बैच में प्रवेश प्रारंभ"), sub: tx("[कोर्स / कक्षा]"), tag: tx("[तारीख] से शुरू • सीमित सीटें") },
  { id: "topper", label: tx("रिज़ल्ट व टॉपर"), icon: "🏆", badge: tx("हमारे टॉपर्स"), color: "#f59e0b", head: tx("हमारे टॉपर्स को हार्दिक बधाई!"), sub: tx("[परीक्षा का नाम व वर्ष]"), tag: tx("[टॉपर का नाम] • [रैंक / अंक]") },
  { id: "science", label: tx("विषय पोस्टर"), icon: "🔬", badge: tx("अध्ययन सामग्री"), color: "#ef4444", head: tx("[विषय / टॉपिक]"), sub: tx("[मुख्य बिंदु]"), tag: tx("[कक्षा / बैच]") },
  { id: "event", label: tx("त्योहार व कार्यक्रम"), icon: "🎉", badge: tx("शुभकामनाएँ"), color: "#10b981", head: tx("[त्योहार / कार्यक्रम] की हार्दिक शुभकामनाएँ"), sub: tx("[संदेश]"), tag: tx("प्रबंधन, फैकल्टी एवं स्टाफ की ओर से") },
]);
const RATIOS = [
  { id: "1:1", label: "Square (1:1)", desc: "WhatsApp / Insta" },
  { id: "16:9", label: "Banner (16:9)", desc: "YouTube / Screen" },
  { id: "9:16", label: "Story (9:16)", desc: "Reels / Status" },
];
const HEX = /^#[0-9a-fA-F]{6}$/;

export default function ImageStudio({ activeInstitute }) {
  const [category, setCategory] = useState("admission");
  const [aspectRatio, setAspectRatio] = useState("1:1");
  const [headline, setHeadline] = useState("");
  const [subheading, setSubheading] = useState("");
  const [tagline, setTagline] = useState("");
  const [accentColor, setAccentColor] = useState("#38bdf8");
  const [docTitle, setDocTitle] = useState("");
  const [pendingTemplate, setPendingTemplate] = useState(null);

  const cat = CATEGORIES().find((c) => c.id === category) ?? CATEGORIES()[0];

  // What gets saved (shape: PosterContentSchema in packages/shared/documents.ts).
  const documentContent = { category, aspectRatio, headline, subheading, tagline, accentColor };

  const load = (content) => {
    setCategory(content?.category ?? "admission");
    setAspectRatio(content?.aspectRatio ?? "1:1");
    setHeadline(content?.headline ?? "");
    setSubheading(content?.subheading ?? "");
    setTagline(content?.tagline ?? "");
    setAccentColor(content?.accentColor && HEX.test(content.accentColor) ? content.accentColor : "#38bdf8");
  };

  const applyTemplate = (c) => {
    setCategory(c.id);
    setHeadline(c.head);
    setSubheading(c.sub);
    setTagline(c.tag);
    setAccentColor(c.color);
    setPendingTemplate(null);
  };

  const hasText = headline.trim() || subheading.trim() || tagline.trim();

  // AI poster copy (DN-060): only roles with image_studio.ai_copy (counselors use templates, DN-008).
  const canAiCopy = can(useSignedInUser().role, "image_studio.ai_copy");
  const [brief, setBrief] = useState("");
  const [aiLanguage, setAiLanguage] = useState("hi");
  const fillFromAi = (result) => {
    const parsed = PosterCopyOutputSchema.safeParse(result);
    if (!parsed.success) return;
    setHeadline(parsed.data.headline);
    setSubheading(parsed.data.subheading);
    setTagline(parsed.data.tagline);
    if (!docTitle.trim()) setDocTitle(parsed.data.headline);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<ImageIcon className="size-6" />}
        title={tx("पोस्टर & बैनर स्टूडियो")}
        badge="WhatsApp / Insta / YouTube"
        description={tx("प्रवेश, टॉपर, विषय और त्योहार के पोस्टर बनाएँ, सेव करें और बाद में फिर से खोलें।")}
      />

      <DocumentBar
        type="poster"
        title={docTitle}
        onTitleChange={setDocTitle}
        content={documentContent}
        onOpen={(content) => load(content)}
        onNew={() => {
          load(null);
          setDocTitle("");
        }}
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Controls */}
        <div className="lg:col-span-5 space-y-4">
          <div className="space-y-3 rounded-card border border-line bg-surface p-4 text-ink">
            <h3 className="text-label font-semibold">{tx("पोस्टर का प्रकार")}</h3>
            <div role="group" aria-label={tx("पोस्टर का प्रकार")} className="grid grid-cols-2 gap-2">
              {CATEGORIES().map((c) => (
                <Button key={c.id} size="sm" variant={category === c.id ? "primary" : "secondary"} aria-pressed={category === c.id} onClick={() => setCategory(c.id)}>
                  <span aria-hidden="true">{c.icon}</span> {c.label}
                </Button>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-2 border-t border-line pt-3">
              <Button size="sm" icon={<FileText className="size-4" />} onClick={() => (hasText ? setPendingTemplate(cat) : applyTemplate(cat))}>
                "{cat.label}{tx("\" का ढाँचा भरें")}
              </Button>
              <span className="text-caption text-muted">{tx("[ब्रैकेट] वाली जगह अपनी जानकारी भरें।")}</span>
            </div>
          </div>

          {canAiCopy && (
            <div className="space-y-3 rounded-card border border-line bg-surface p-4 text-ink">
              <h3 className="text-label font-semibold">{tx("AI से पोस्टर के शब्द")}</h3>
              <Field label={tx("पोस्टर किस बारे में है")} hint={tx("असली जानकारी लिखें: कोर्स, तारीख, परिणाम। AI इसके बाहर कोई दावा नहीं जोड़ता।")}>
                <Textarea rows={3} value={brief} maxLength={800} onChange={(e) => setBrief(e.target.value)} placeholder={tx("उदा. MPPSC प्री 2027 का नया बैच 1 जुलाई से, सुबह 8 बजे")} />
              </Field>
              <Field label={tx("भाषा")}>
                <Select value={aiLanguage} onChange={(e) => setAiLanguage(e.target.value)}>
                  <option value="hi">{tx("हिन्दी")}</option>
                  <option value="en">English</option>
                  <option value="both">{tx("हिन्दी + English")}</option>
                </Select>
              </Field>
              <AiGenerate
                label={tx("AI से हेडलाइन और लाइनें")}
                build={() => (brief.trim().length >= 5 ? { type: "poster_copy", input: { category: cat.label, brief: brief.trim(), language: aiLanguage } } : null)}
                confirmReplace={hasText ? { title: tx("लिखे शब्द बदल जाएँगे"), message: tx("AI हेडलाइन, उप-शीर्षक और कॉल-टू-एक्शन की जगह नए शब्द लिखेगा।") } : null}
                onResult={fillFromAi}
              />
            </div>
          )}

          <div className="space-y-4 rounded-card border border-line bg-surface p-4 text-ink">
            <Field label={tx("मुख्य हेडलाइन")}>
              <Input value={headline} onChange={(e) => setHeadline(e.target.value)} />
            </Field>
            <Field label={tx("उप-शीर्षक / कक्षा विवरण")}>
              <Input value={subheading} onChange={(e) => setSubheading(e.target.value)} />
            </Field>
            <Field label={tx("कॉल-टू-एक्शन / तारीख / ऑफ़र")}>
              <Input value={tagline} onChange={(e) => setTagline(e.target.value)} />
            </Field>
            <div className="flex items-end gap-3">
              <Field label={tx("मुख्य रंग")} className="w-32">
                <Input type="color" value={accentColor} onChange={(e) => setAccentColor(e.target.value)} className="h-10 p-1" />
              </Field>
              <span className="pb-2 text-caption text-muted">{accentColor}</span>
            </div>
            <div role="group" aria-label={tx("आकार")} className="space-y-2 border-t border-line pt-3">
              <p className="text-label font-semibold">{tx("आकार")}</p>
              <div className="grid grid-cols-3 gap-2">
                {RATIOS.map((r) => (
                  <Button key={r.id} size="sm" variant={aspectRatio === r.id ? "primary" : "secondary"} aria-pressed={aspectRatio === r.id} onClick={() => setAspectRatio(r.id)}>
                    <span className="flex flex-col leading-tight">
                      <span>{r.label}</span>
                      <span className="text-caption font-normal">{r.desc}</span>
                    </span>
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Live Visual Canvas Preview */}
        <div className="lg:col-span-7 space-y-3">
          <p className="text-caption text-muted">{tx("पोस्टर का स्क्रीनशॉट लेकर उपयोग करें; PNG डाउनलोड बाद में आएगा।")}</p>
          <div className="flex min-h-[460px] items-center justify-center rounded-card border border-line bg-inverse p-6">
            <div
              className={`w-full max-w-lg transition-all rounded-2xl p-6 md:p-8 flex flex-col justify-between shadow-2xl relative overflow-hidden border border-slate-700/60 ${
                aspectRatio === "16:9" ? "aspect-[16/9]" : aspectRatio === "9:16" ? "aspect-[9/16] max-w-xs" : "aspect-square"
              }`}
              style={{ background: `radial-gradient(circle at 80% 20%, ${accentColor}25 0%, #090d16 85%)` }}
            >
              <div className="flex items-center gap-2.5 z-10">
                <img src={instituteLogo(activeInstitute)} alt="" className="w-7 h-7 rounded-full object-contain bg-amber-300 ring-2 ring-amber-400/50 shadow" />
                <span className="text-xs font-extrabold tracking-wider uppercase text-slate-100">{activeInstitute.name}</span>
              </div>

              <div className="my-auto py-4 z-10 text-center space-y-3">
                <div
                  className="inline-block px-3 py-1 rounded-full text-[11px] font-bold tracking-widest uppercase border"
                  style={{ color: accentColor, borderColor: `${accentColor}40`, backgroundColor: `${accentColor}15` }}
                >
                  {cat.badge}
                </div>
                <p className="text-2xl md:text-3xl font-black text-white tracking-tight leading-tight uppercase drop-shadow-md">{headline || tx("मुख्य हेडलाइन")}</p>
                {subheading && <p className="text-xs md:text-sm text-slate-200 max-w-sm mx-auto font-medium">{subheading}</p>}
                {tagline && (
                  <div className="pt-2">
                    <div className="inline-block px-4 py-2 rounded-xl bg-slate-900/90 border border-slate-700 text-xs font-bold text-amber-300 shadow-lg">{tagline}</div>
                  </div>
                )}
              </div>

              {(activeInstitute.phone || activeInstitute.city) && (
                <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-300 z-10">
                  <span>{activeInstitute.phone && `📞 ${activeInstitute.phone}`}</span>
                  <span>{activeInstitute.city && `📍 ${activeInstitute.city}`}</span>
                </div>
              )}

              <div className="absolute -bottom-16 -right-16 w-52 h-52 rounded-full border pointer-events-none" style={{ borderColor: `${accentColor}20` }}></div>
            </div>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={pendingTemplate !== null}
        title={tx("लिखा हुआ पाठ बदल जाएगा")}
        message={tx("\"{0}\" का ढाँचा अभी लिखी हेडलाइन, उप-शीर्षक, कॉल-टू-एक्शन और रंग की जगह ले लेगा। आगे बढ़ें?", [pendingTemplate?.label ?? ""])}
        confirmLabel={tx("हाँ, ढाँचा भरें")}
        tone="danger"
        onConfirm={() => pendingTemplate && applyTemplate(pendingTemplate)}
        onCancel={() => setPendingTemplate(null)}
      />
    </div>
  );
}
