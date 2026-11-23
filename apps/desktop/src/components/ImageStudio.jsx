import React, { useState } from "react";
import { Image as ImageIcon, FileText } from "lucide-react";
import { instituteLogo } from "../utils/branding.ts";
import { DocumentBar } from "./DocumentBar.tsx";
import { Button, ConfirmDialog, Field, Input, PageHeader } from "./ui/index.ts";

/**
 * Poster kinds. Each has a badge shown on the poster and a plain starting template;
 * words in [brackets] are for staff to replace. These are templates, not AI.
 */
const CATEGORIES = [
  { id: "admission", label: "प्रवेश व बैच", icon: "🎓", badge: "प्रवेश प्रारंभ", color: "#38bdf8", head: "नए बैच में प्रवेश प्रारंभ", sub: "[कोर्स / कक्षा]", tag: "[तारीख] से शुरू • सीमित सीटें" },
  { id: "topper", label: "रिज़ल्ट व टॉपर", icon: "🏆", badge: "हमारे टॉपर्स", color: "#f59e0b", head: "हमारे टॉपर्स को हार्दिक बधाई!", sub: "[परीक्षा का नाम व वर्ष]", tag: "[टॉपर का नाम] • [रैंक / अंक]" },
  { id: "science", label: "विषय पोस्टर", icon: "🔬", badge: "अध्ययन सामग्री", color: "#ef4444", head: "[विषय / टॉपिक]", sub: "[मुख्य बिंदु]", tag: "[कक्षा / बैच]" },
  { id: "event", label: "त्योहार व कार्यक्रम", icon: "🎉", badge: "शुभकामनाएँ", color: "#10b981", head: "[त्योहार / कार्यक्रम] की हार्दिक शुभकामनाएँ", sub: "[संदेश]", tag: "प्रबंधन, फैकल्टी एवं स्टाफ की ओर से" },
];
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

  const cat = CATEGORIES.find((c) => c.id === category) ?? CATEGORIES[0];

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

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<ImageIcon className="size-6" />}
        title="पोस्टर & बैनर स्टूडियो"
        badge="WhatsApp / Insta / YouTube"
        description="प्रवेश, टॉपर, विषय और त्योहार के पोस्टर बनाएँ, सेव करें और बाद में फिर से खोलें।"
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
            <h3 className="text-label font-semibold">पोस्टर का प्रकार</h3>
            <div role="group" aria-label="पोस्टर का प्रकार" className="grid grid-cols-2 gap-2">
              {CATEGORIES.map((c) => (
                <Button key={c.id} size="sm" variant={category === c.id ? "primary" : "secondary"} aria-pressed={category === c.id} onClick={() => setCategory(c.id)}>
                  <span aria-hidden="true">{c.icon}</span> {c.label}
                </Button>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-2 border-t border-line pt-3">
              <Button size="sm" icon={<FileText className="size-4" />} onClick={() => (hasText ? setPendingTemplate(cat) : applyTemplate(cat))}>
                "{cat.label}" का ढाँचा भरें
              </Button>
              <span className="text-caption text-muted">[ब्रैकेट] वाली जगह अपनी जानकारी भरें।</span>
            </div>
          </div>

          <div className="space-y-4 rounded-card border border-line bg-surface p-4 text-ink">
            <Field label="मुख्य हेडलाइन">
              <Input value={headline} onChange={(e) => setHeadline(e.target.value)} />
            </Field>
            <Field label="उप-शीर्षक / कक्षा विवरण">
              <Input value={subheading} onChange={(e) => setSubheading(e.target.value)} />
            </Field>
            <Field label="कॉल-टू-एक्शन / तारीख / ऑफ़र">
              <Input value={tagline} onChange={(e) => setTagline(e.target.value)} />
            </Field>
            <div className="flex items-end gap-3">
              <Field label="मुख्य रंग" className="w-32">
                <Input type="color" value={accentColor} onChange={(e) => setAccentColor(e.target.value)} className="h-10 p-1" />
              </Field>
              <span className="pb-2 text-caption text-muted">{accentColor}</span>
            </div>
            <div role="group" aria-label="आकार" className="space-y-2 border-t border-line pt-3">
              <p className="text-label font-semibold">आकार</p>
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
          <p className="text-caption text-muted">पोस्टर का स्क्रीनशॉट लेकर उपयोग करें; PNG डाउनलोड बाद में आएगा।</p>
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
                <p className="text-2xl md:text-3xl font-black text-white tracking-tight leading-tight uppercase drop-shadow-md">{headline || "मुख्य हेडलाइन"}</p>
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
        title="लिखा हुआ पाठ बदल जाएगा"
        message={`"${pendingTemplate?.label ?? ""}" का ढाँचा अभी लिखी हेडलाइन, उप-शीर्षक, कॉल-टू-एक्शन और रंग की जगह ले लेगा। आगे बढ़ें?`}
        confirmLabel="हाँ, ढाँचा भरें"
        tone="danger"
        onConfirm={() => pendingTemplate && applyTemplate(pendingTemplate)}
        onCancel={() => setPendingTemplate(null)}
      />
    </div>
  );
}
