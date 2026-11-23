import React, { useState } from "react";
import { MessageSquareShare, Copy, Check, Printer, FileText } from "lucide-react";
import { instituteLogo } from "../utils/branding.ts";
import { NoticeDraftOutputSchema } from "@edusuite/shared";
import { DocumentBar } from "./DocumentBar.tsx";
import { AiGenerate } from "./AiGenerate.tsx";
import { Button, ConfirmDialog, Field, Input, PageHeader, Select, Textarea } from "./ui/index.ts";

/**
 * Starting points for common notices, filled with this institute's own name and phone.
 * Words in [brackets] are for staff to replace. These are plain templates, not AI.
 */
function templates(inst) {
  const name = inst.name;
  const phone = inst.phone ? ` ${inst.phone}` : " [फ़ोन नंबर]";
  return [
    {
      category: "फीस रिमाइंडर",
      title: "फीस जमा करने की सूचना",
      whatsappText: `📢 *${name} – फीस रिमाइंडर*\n\nप्रिय विद्यार्थी / अभिभावक,\nचालू बैच की किस्त *[तारीख]* तक जमा करना अनिवार्य है।\n\n💳 भुगतान: [UPI / काउंटर]\nकिसी भी जानकारी के लिए संपर्क करें:${phone}\n\nधन्यवाद,\n*${name}*`,
      formalText: `विषय: फीस जमा करने की समय-सीमा\n\nसभी विद्यार्थियों एवं अभिभावकों को सूचित किया जाता है कि चालू सत्र की बकाया फीस [तारीख] तक जमा करें।\n\nभुगतान के तरीके: [UPI / काउंटर]\nसंपर्क:${phone}`,
    },
    {
      category: "अभिभावक-शिक्षक बैठक",
      title: "अभिभावक-शिक्षक बैठक की सूचना",
      whatsappText: `🤝 *अभिभावक-शिक्षक बैठक*\n\nआदरणीय अभिभावक,\nआपके बच्चे की प्रगति पर चर्चा के लिए बैठक रखी गई है।\n\n🗓️ *तारीख:* [तारीख]\n⏰ *समय:* [समय]\n📍 *स्थान:* [स्थान]\n\n*${name}*`,
      formalText: `विषय: अभिभावक-शिक्षक बैठक\n\nसभी अभिभावकों को सूचित किया जाता है कि [तारीख] को [समय] बजे [स्थान] पर अभिभावक-शिक्षक बैठक आयोजित की जाएगी। टेस्ट परिणाम और फैकल्टी की राय व्यक्तिगत रूप से साझा की जाएगी।\n\nसंपर्क:${phone}`,
    },
    {
      category: "प्रवेश सूचना",
      title: "नए बैच में प्रवेश प्रारंभ",
      whatsappText: `🚀 *नए बैच शुरू*\n\n*${name}*\n\n📚 कोर्स: [कोर्स / परीक्षा]\n📅 बैच शुरू: [तारीख]\n📞 पूछताछ / डेमो क्लास:${phone}\n📍 पता: [पता]`,
      formalText: `विषय: नए बैच में प्रवेश प्रारंभ\n\n[कोर्स / परीक्षा] के नए बैच [तारीख] से प्रारंभ हो रहे हैं। प्रवेश के लिए संस्थान के कार्यालय में संपर्क करें।\n\nसंपर्क:${phone}`,
    },
  ];
}

export default function NoticeHub({ activeInstitute }) {
  const [mode, setMode] = useState("whatsapp"); // "whatsapp" | "formal"
  const [copied, setCopied] = useState(false);
  const [category, setCategory] = useState("");
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [whatsappText, setWhatsappText] = useState("");
  const [formalText, setFormalText] = useState("");
  const [docTitle, setDocTitle] = useState("");
  const [pendingTemplate, setPendingTemplate] = useState(null);
  // AI draft (DN-060): what the notice must say; not saved.
  const [details, setDetails] = useState("");
  const [aiLanguage, setAiLanguage] = useState("hi");
  const fillFromAi = (result) => {
    const parsed = NoticeDraftOutputSchema.safeParse(result);
    if (!parsed.success) return;
    setTitle(parsed.data.title);
    setWhatsappText(parsed.data.whatsappText);
    setFormalText(parsed.data.formalText);
    if (!docTitle.trim()) setDocTitle(parsed.data.title);
  };

  // What gets saved (shape: NoticeContentSchema in packages/shared/documents.ts).
  const documentContent = { category, title, date, whatsappText, formalText };

  const load = (content) => {
    setCategory(content?.category ?? "");
    setTitle(content?.title ?? "");
    setDate(content?.date ?? "");
    setWhatsappText(content?.whatsappText ?? "");
    setFormalText(content?.formalText ?? "");
  };

  const applyTemplate = (t) => {
    load({ ...t, date });
    if (!docTitle.trim()) setDocTitle(t.title);
    setPendingTemplate(null);
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(mode === "whatsapp" ? whatsappText : formalText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const hasText = whatsappText.trim() || formalText.trim();
  const shownText = mode === "whatsapp" ? whatsappText : formalText;

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<MessageSquareShare className="size-6" />}
        title="नोटिस & व्हाट्सएप सर्कुलर"
        badge="Parent Broadcast"
        description="फीस रिमाइंडर, अभिभावक-शिक्षक बैठक, छुट्टी और परीक्षा की सूचनाएँ लिखें, व्हाट्सएप के लिए कॉपी या प्रिंट करें, सेव करें और बाद में फिर से खोलें।"
        actions={
          <>
            <Button icon={<Printer className="size-4" />} onClick={() => window.print()}>
              प्रिंट करें
            </Button>
            <Button
              variant="primary"
              disabled={!shownText.trim()}
              icon={copied ? <Check className="size-4" /> : <Copy className="size-4" />}
              onClick={() => void handleCopy()}
            >
              {copied ? "कॉपी हो गया!" : mode === "whatsapp" ? "व्हाट्सएप के लिए कॉपी करें" : "सर्कुलर कॉपी करें"}
            </Button>
          </>
        }
      />

      <DocumentBar
        type="notice"
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
        {/* Editor */}
        <div className="lg:col-span-5 space-y-4 no-print">
          <div className="space-y-3 rounded-card border border-line bg-surface p-4 text-ink">
            <h3 className="text-label font-semibold">तैयार ढाँचे से शुरू करें</h3>
            <p className="text-caption text-muted">[ब्रैकेट] वाली जगह अपनी जानकारी भरें।</p>
            <div className="flex flex-wrap gap-2">
              {templates(activeInstitute).map((t) => (
                <Button key={t.category} size="sm" icon={<FileText className="size-4" />} onClick={() => (hasText ? setPendingTemplate(t) : applyTemplate(t))}>
                  {t.category}
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-3 rounded-card border border-line bg-surface p-4 text-ink">
            <h3 className="text-label font-semibold">AI से सूचना लिखवाएँ</h3>
            <Field label="सूचना में क्या कहना है" hint="तारीख, समय, राशि, किसके लिए; जो नहीं लिखेंगे वह [ब्रैकेट] में आएगा">
              <Textarea rows={3} value={details} maxLength={2000} onChange={(e) => setDetails(e.target.value)} placeholder="उदा. 26 नवंबर को गुरु नानक जयंती पर सभी बैच की छुट्टी रहेगी" />
            </Field>
            <Field label="भाषा">
              <Select value={aiLanguage} onChange={(e) => setAiLanguage(e.target.value)}>
                <option value="hi">हिन्दी</option>
                <option value="en">English</option>
                <option value="both">हिन्दी + English</option>
              </Select>
            </Field>
            <AiGenerate
              label="AI से सूचना बनाएँ"
              build={() =>
                details.trim().length >= 5
                  ? {
                      type: "notice_draft",
                      input: {
                        details: details.trim(),
                        ...(category.trim() && { category: category.trim() }),
                        ...(date.trim() && { date: date.trim() }),
                        language: aiLanguage,
                      },
                    }
                  : null
              }
              confirmReplace={hasText ? { title: "लिखा संदेश बदल जाएगा", message: "AI का मसौदा अभी लिखे शीर्षक, व्हाट्सएप संदेश और सर्कुलर की जगह ले लेगा।" } : null}
              onResult={fillFromAi}
              hint="श्रेणी और तारीख नीचे भरें तो AI उन्हें भी इस्तेमाल करेगा। भेजने से पहले जाँच लें।"
            />
          </div>

          <div className="space-y-4 rounded-card border border-line bg-surface p-4 text-ink">
            <div className="grid grid-cols-2 gap-3">
              <Field label="श्रेणी">
                <Input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="उदा. छुट्टी" />
              </Field>
              <Field label="तारीख">
                <Input value={date} onChange={(e) => setDate(e.target.value)} placeholder="उदा. 25 नवंबर 2026" />
              </Field>
            </div>
            <Field label="सूचना का शीर्षक">
              <Input value={title} onChange={(e) => setTitle(e.target.value)} />
            </Field>
            <Field label="व्हाट्सएप संदेश" hint="*शब्द* व्हाट्सएप में बोल्ड दिखता है">
              <Textarea rows={8} value={whatsappText} onChange={(e) => setWhatsappText(e.target.value)} />
            </Field>
            <Field label="औपचारिक सर्कुलर (प्रिंट के लिए)">
              <Textarea rows={8} value={formalText} onChange={(e) => setFormalText(e.target.value)} />
            </Field>
          </div>
        </div>

        {/* Preview Panel */}
        <div className="lg:col-span-7 space-y-4">
          <div role="group" aria-label="प्रिव्यू" className="flex flex-wrap items-center gap-2 no-print">
            <Button size="sm" variant={mode === "whatsapp" ? "primary" : "secondary"} aria-pressed={mode === "whatsapp"} onClick={() => setMode("whatsapp")}>
              💬 व्हाट्सएप संदेश
            </Button>
            <Button size="sm" variant={mode === "formal" ? "primary" : "secondary"} aria-pressed={mode === "formal"} onClick={() => setMode("formal")}>
              📜 औपचारिक सर्कुलर
            </Button>
          </div>

          {mode === "whatsapp" ? (
            <div className="space-y-3 rounded-card border border-line bg-surface p-6 text-ink">
              <p className="text-caption text-muted">व्हाट्सएप ग्रुप या ब्रॉडकास्ट में सीधे पेस्ट करें।</p>
              <div className="max-w-md rounded-2xl border border-success bg-success-subtle p-4 text-label whitespace-pre-wrap select-text">
                {whatsappText || "व्हाट्सएप संदेश यहाँ दिखेगा।"}
              </div>
            </div>
          ) : (
            <div className="p-8 rounded-2xl bg-white text-slate-900 border border-slate-200 shadow-xl space-y-4 select-text">
              <div className="text-center border-b-2 border-slate-800 pb-3">
                <div className="flex items-center justify-center gap-3 mb-1">
                  <img src={instituteLogo(activeInstitute)} alt="" className="w-10 h-10 rounded-full object-contain bg-amber-300 ring-2 ring-amber-400 shadow" />
                  <div className="text-left">
                    <h2 className="text-base font-black uppercase text-slate-900">{activeInstitute.name}</h2>
                    <p className="text-[11px] text-slate-600">
                      {[activeInstitute.city, activeInstitute.phone && `फ़ोन: ${activeInstitute.phone}`].filter(Boolean).join(" • ")}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex justify-between gap-4 text-xs text-slate-700">
                <span className="font-bold">{title}</span>
                {date && <span>दिनांक: {date}</span>}
              </div>

              <div className="text-sm whitespace-pre-wrap leading-relaxed text-slate-800">{formalText || "औपचारिक सर्कुलर यहाँ दिखेगा।"}</div>

              <div className="pt-8 flex justify-end">
                <div className="text-right text-xs">
                  <div className="h-10"></div>
                  <div className="font-bold border-t border-slate-400 pt-1">अधिकृत हस्ताक्षर</div>
                  <div className="text-[10px] text-slate-500">{activeInstitute.name}</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={pendingTemplate !== null}
        title="लिखा हुआ संदेश बदल जाएगा"
        message={`"${pendingTemplate?.category ?? ""}" का ढाँचा अभी लिखे शीर्षक, श्रेणी और दोनों संदेशों की जगह ले लेगा। आगे बढ़ें?`}
        confirmLabel="हाँ, ढाँचा भरें"
        tone="danger"
        onConfirm={() => pendingTemplate && applyTemplate(pendingTemplate)}
        onCancel={() => setPendingTemplate(null)}
      />
    </div>
  );
}
