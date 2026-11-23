import React, { useState } from "react";
import { Video, Copy, Check, Sliders, FileText, Wand2 } from "lucide-react";
import { instituteLogo } from "../utils/branding.ts";
import { DocumentBar } from "./DocumentBar.tsx";
import { Button, Field, Input, PageHeader, Textarea } from "./ui/index.ts";

const THEMES = [
  { id: "red-dark", label: "Red & Black" },
  { id: "yellow-black", label: "Yellow & Navy" },
  { id: "blue-gold", label: "Royal Blue & Gold" },
];

const splitTags = (value) =>
  value
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);

function CopyButton({ text, label, disabled }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      size="sm"
      disabled={disabled}
      icon={copied ? <Check className="size-4" /> : <Copy className="size-4" />}
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
    >
      {copied ? "कॉपी हो गया!" : label}
    </Button>
  );
}

export default function YouTubeStudio({ activeInstitute }) {
  const [headline, setHeadline] = useState("");
  const [punchline, setPunchline] = useState("");
  const [facultyName, setFacultyName] = useState("");
  const [liveBadge, setLiveBadge] = useState("");
  const [tagline, setTagline] = useState("");
  const [bgTheme, setBgTheme] = useState("red-dark"); // "red-dark" | "blue-gold" | "yellow-black"
  const [videoTitle, setVideoTitle] = useState("");
  const [description, setDescription] = useState("");
  const [tagsText, setTagsText] = useState("");
  const [docTitle, setDocTitle] = useState("");

  const tags = splitTags(tagsText);

  // What gets saved (shape: YoutubeContentSchema in packages/shared/documents.ts).
  const documentContent = {
    headline,
    punchline,
    facultyName,
    liveBadge,
    tagline,
    bgTheme,
    title: videoTitle,
    description,
    tags,
  };

  const suggestedTitle = [headline, punchline, activeInstitute.name].map((s) => s.trim()).filter(Boolean).join(" | ");

  const load = (content) => {
    setHeadline(content?.headline ?? "");
    setPunchline(content?.punchline ?? "");
    setFacultyName(content?.facultyName ?? "");
    setLiveBadge(content?.liveBadge ?? "");
    setTagline(content?.tagline ?? "");
    setBgTheme(content?.bgTheme ?? "red-dark");
    setVideoTitle(content?.title ?? "");
    setDescription(content?.description ?? "");
    setTagsText((content?.tags ?? []).join(", "));
  };

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<Video className="size-6" />}
        title="YouTube लाइव क्लास & थंबनेल स्टूडियो"
        badge="16:9"
        description="YouTube लाइव कक्षाओं के लिए 16:9 थंबनेल का डिज़ाइन, वीडियो टाइटल, डिस्क्रिप्शन और टैग्स तैयार करें, सेव करें और बाद में फिर से खोलें।"
      />

      <DocumentBar
        type="youtube"
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
        {/* Left Inputs */}
        <div className="lg:col-span-5 space-y-4">
          <div className="space-y-4 rounded-card border border-line bg-surface p-4 text-ink">
            <h3 className="flex items-center gap-2 text-label font-semibold">
              <Sliders className="size-4" aria-hidden="true" />
              थंबनेल एवं लाइव क्लास सेटिंग्स
            </h3>
            <Field label="मुख्य बड़ा टाइटल (Headline)">
              <Input value={headline} onChange={(e) => setHeadline(e.target.value)} placeholder="उदा. MP GK महामैराथन 2026" />
            </Field>
            <Field label="पंचलाइन (Subtitle)">
              <Input value={punchline} onChange={(e) => setPunchline(e.target.value)} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="शिक्षक / फैकल्टी">
                <Input value={facultyName} onChange={(e) => setFacultyName(e.target.value)} />
              </Field>
              <Field label="लाइव टाइमिंग बैज">
                <Input value={liveBadge} onChange={(e) => setLiveBadge(e.target.value)} placeholder="उदा. 🔴 LIVE @ 8:00 PM" />
              </Field>
            </div>
            <Field label="नीचे का बैज">
              <Input value={tagline} onChange={(e) => setTagline(e.target.value)} placeholder="उदा. PDF नोट्स फ्री" />
            </Field>
            <div role="group" aria-label="थंबनेल कलर थीम" className="space-y-2 border-t border-line pt-3">
              <p className="text-label font-semibold">थंबनेल कलर थीम</p>
              <div className="grid grid-cols-3 gap-2">
                {THEMES.map((th) => (
                  <Button key={th.id} size="sm" variant={bgTheme === th.id ? "primary" : "secondary"} aria-pressed={bgTheme === th.id} onClick={() => setBgTheme(th.id)}>
                    {th.label}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right: Live 16:9 Thumbnail Canvas & SEO Metadata */}
        <div className="lg:col-span-7 space-y-5">
          <div className="flex items-center justify-between text-label font-semibold text-ink">
            <span>16:9 थंबनेल प्रिव्यू</span>
            <span className="text-caption text-muted">थंबनेल का स्क्रीनशॉट लेकर उपयोग करें; PNG डाउनलोड बाद में आएगा।</span>
          </div>

          {/* 16:9 Thumbnail Canvas */}
          <div
            className={`w-full aspect-[16/9] rounded-2xl p-5 md:p-7 flex flex-col justify-between shadow-2xl relative overflow-hidden border-2 transition-all select-none ${
              bgTheme === "yellow-black"
                ? "bg-gradient-to-tr from-slate-950 via-[#10141f] to-amber-950 border-amber-400"
                : bgTheme === "blue-gold"
                  ? "bg-gradient-to-tr from-slate-950 via-blue-950 to-indigo-950 border-blue-400"
                  : "bg-gradient-to-tr from-slate-950 via-[#1a080c] to-rose-950 border-rose-500"
            }`}
          >
            {/* Top Bar with Logo & Live Badge */}
            <div className="flex items-center justify-between z-10">
              <div className="flex items-center gap-2.5">
                <img
                  src={instituteLogo(activeInstitute)}
                  alt=""
                  className="w-10 h-10 rounded-full bg-amber-300 ring-2 ring-amber-400 shadow-lg object-contain"
                />
                <div>
                  <p className="text-xs font-black uppercase text-amber-300 tracking-wider">{activeInstitute.name}</p>
                  <p className="text-[10px] text-slate-300 font-medium">YouTube Live</p>
                </div>
              </div>
              {liveBadge && (
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-600 text-white text-xs font-black uppercase tracking-wider shadow-lg shadow-rose-600/40">
                  <span>{liveBadge}</span>
                </div>
              )}
            </div>

            {/* Middle Big Bold Hindi Typography */}
            <div className="my-auto py-2 z-10 space-y-2">
              <p className="text-2xl md:text-3xl lg:text-4xl font-black text-amber-300 tracking-tight leading-tight uppercase drop-shadow-[0_4px_10px_rgba(0,0,0,0.9)]">
                {headline || "मुख्य टाइटल"}
              </p>
              {punchline && <div className="inline-block px-3 py-1 rounded-xl bg-white text-slate-950 text-xs md:text-sm font-black shadow-xl">⚡ {punchline}</div>}
            </div>

            {/* Bottom Bar: Faculty & Badge */}
            <div className="pt-3 border-t border-white/10 flex items-center justify-between z-10">
              <div>
                {facultyName && <p className="text-xs font-bold text-white">{facultyName}</p>}
                <p className="text-[10px] text-slate-300">{activeInstitute.city}</p>
              </div>
              {tagline && <div className="px-3 py-1 rounded-lg bg-amber-400 text-slate-950 text-[11px] font-black uppercase tracking-wider shadow">🎁 {tagline}</div>}
            </div>

            <div className="absolute -bottom-16 -right-16 w-60 h-60 bg-rose-500/20 rounded-full blur-3xl pointer-events-none"></div>
          </div>

          {/* YouTube title, description and tags */}
          <div className="space-y-4 rounded-card border border-line bg-surface p-4 text-ink">
            <h3 className="flex items-center gap-2 text-label font-semibold">
              <FileText className="size-4" aria-hidden="true" />
              YouTube वीडियो टाइटल, डिस्क्रिप्शन और टैग्स
            </h3>
            <Field label="वीडियो टाइटल" hint={`${videoTitle.length}/100 अक्षर (YouTube की सीमा 100)`}>
              <Input value={videoTitle} maxLength={200} onChange={(e) => setVideoTitle(e.target.value)} />
            </Field>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" icon={<Wand2 className="size-4" />} disabled={!suggestedTitle} onClick={() => setVideoTitle(suggestedTitle)}>
                थंबनेल से टाइटल भरें
              </Button>
              <CopyButton text={videoTitle} label="टाइटल कॉपी करें" disabled={!videoTitle.trim()} />
            </div>
            <Field label="वीडियो डिस्क्रिप्शन">
              <Textarea rows={6} value={description} onChange={(e) => setDescription(e.target.value)} />
            </Field>
            <CopyButton text={description} label="डिस्क्रिप्शन कॉपी करें" disabled={!description.trim()} />
            <Field label="टैग्स" hint="कॉमा (,) से अलग करें">
              <Input value={tagsText} onChange={(e) => setTagsText(e.target.value)} placeholder="उदा. mppsc 2026, mp gk, live class" />
            </Field>
            <CopyButton text={tags.join(", ")} label="टैग्स कॉपी करें" disabled={tags.length === 0} />
          </div>
        </div>
      </div>
    </div>
  );
}
