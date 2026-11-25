import { useState, type ChangeEvent } from "react";
import { useBlocker } from "react-router";
import { AlertTriangle, CheckCircle2, Download, FileUp, MonitorPlay, Sparkles } from "lucide-react";
import {
  DECK_QUIZ_MAX_PDF_BYTES,
  DeckQuizSchema,
  buildDeckQuizHtml,
  deckQuizFileName,
  type DeckQuiz as DeckQuizData,
  type FileInfo,
} from "@edusuite/shared";
import { uploadFile } from "../api/documents.ts";
import { useSession } from "../api/session.tsx";
import { AiGenerate } from "./AiGenerate.tsx";
import { Button, Card, CardBody, CardHeader, CardTitle, ConfirmDialog, Field, Input, Modal, PageHeader, useToast } from "./ui/index.ts";
import { tx } from "../i18n/index.ts";

type Props = { activeInstitute?: { name?: string | null; logo?: string | undefined } | null };
type Upload = { state: "idle" } | { state: "uploading"; name: string } | { state: "done"; file: FileInfo } | { state: "error"; name: string; message: string };

const LETTERS = ["a", "b", "c", "d"];
const mb = (bytes: number) => (bytes < 1024 * 1024 ? `${Math.max(1, Math.ceil(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`);

/**
 * Deck → interactive quiz (DN-055). The teacher uploads an MCQ deck (PDF), Claude
 * reads it into bilingual questions, the teacher confirms every answer the deck
 * didn't state, and the app builds one HTML quiz with this institute's name only.
 * The result isn't saved on the server yet: download it before leaving.
 */
export default function DeckQuiz({ activeInstitute }: Props) {
  const { client } = useSession();
  const toast = useToast();
  const instituteName = activeInstitute?.name?.trim() || "";

  const [upload, setUpload] = useState<Upload>({ state: "idle" });
  const [exam, setExam] = useState("");
  const [subject, setSubject] = useState("");
  const [quiz, setQuiz] = useState<DeckQuizData | null>(null);
  /** Indexes of questions whose inferred answer the teacher has checked. */
  const [confirmed, setConfirmed] = useState<Set<number>>(new Set());
  const [downloaded, setDownloaded] = useState(false);
  const [preview, setPreview] = useState<{ url?: string; doc?: string } | null>(null);

  const blocker = useBlocker(({ currentLocation, nextLocation }) => quiz !== null && !downloaded && currentLocation.pathname !== nextLocation.pathname);

  const unchecked = quiz ? quiz.questions.filter((q, i) => !q.answerInDeck && !confirmed.has(i)).length : 0;
  const brand = { instituteName, exam, subject, logo: activeInstitute?.logo };

  const pick = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.type !== "application/pdf") return setUpload({ state: "error", name: file.name, message: tx("केवल PDF फ़ाइल चुनें।") });
    if (file.size > DECK_QUIZ_MAX_PDF_BYTES) {
      return setUpload({ state: "error", name: file.name, message: tx("फ़ाइल {0} की है; {1} तक की PDF चुनें।", [mb(file.size), mb(DECK_QUIZ_MAX_PDF_BYTES)]) });
    }
    setUpload({ state: "uploading", name: file.name });
    try {
      setUpload({ state: "done", file: await uploadFile(client, file) });
    } catch (err) {
      setUpload({ state: "error", name: file.name, message: err instanceof Error && err.message ? tx("सर्वर पर अपलोड नहीं हुआ ({0})।", [err.message]) : tx("सर्वर पर अपलोड नहीं हुआ।") });
    }
  };

  const onResult = (result: unknown) => {
    const parsed = DeckQuizSchema.safeParse(result);
    if (!parsed.success) {
      toast.show({ tone: "error", title: tx("क्विज़ का डेटा सही नहीं आया"), description: tx("फिर से कोशिश करें।") });
      return;
    }
    setQuiz(parsed.data);
    setConfirmed(new Set());
    setDownloaded(false);
  };

  const setAnswer = (qi: number, answer: number) => {
    if (!quiz) return;
    setQuiz({ ...quiz, questions: quiz.questions.map((q, i) => (i === qi ? { ...q, answer } : q)) });
    setConfirmed((s) => new Set(s).add(qi));
    setDownloaded(false);
  };
  const toggleConfirmed = (qi: number) =>
    setConfirmed((s) => {
      const next = new Set(s);
      if (next.has(qi)) next.delete(qi);
      else next.add(qi);
      return next;
    });

  const open = async () => {
    if (!quiz) return;
    const html = buildDeckQuizHtml(quiz, brand);
    // In the desktop app the quiz runs on the isolated player origin with no network (DN-036).
    const motion = window.edusuite?.motion;
    setPreview(motion ? { url: await motion.open(html) } : { doc: html });
  };

  const download = async () => {
    if (!quiz) return;
    const html = buildDeckQuizHtml(quiz, brand);
    let name = deckQuizFileName(quiz);
    const bridge = window.edusuite?.file;
    if (bridge) {
      const res = await bridge.saveAs(name, new TextEncoder().encode(html));
      if (!res.saved) return;
      name = res.fileName ?? name;
    } else {
      const url = URL.createObjectURL(new Blob([html], { type: "text/html;charset=utf-8" }));
      const a = Object.assign(document.createElement("a"), { href: url, download: name });
      a.click();
      URL.revokeObjectURL(url);
    }
    setDownloaded(true);
    toast.show({ tone: "success", title: tx("क्विज़ फ़ाइल सेव हो गई"), description: name });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={tx("डेक से इंटरैक्टिव क्विज़")}
        icon={<Sparkles className="size-6" />}
        badge="HTML"
        description={tx("अपने संस्थान का MCQ डेक (PDF) दें। AI हर प्रश्न को हिन्दी और English में, उत्तर, व्याख्या और मुख्य बिंदुओं के साथ एक क्विज़ फ़ाइल में बदलता है।")}
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
        <Card>
          <CardHeader>
            <CardTitle>{tx("1. डेक और विवरण")}</CardTitle>
          </CardHeader>
          <CardBody className="space-y-4">
            <Field label={tx("MCQ डेक (PDF)")} hint={tx("{0} तक। विज्ञापन और बैनर वाली स्लाइड छोड़ दी जाती हैं।", [mb(DECK_QUIZ_MAX_PDF_BYTES)])}>
              <Input type="file" accept="application/pdf" onChange={(e) => void pick(e)} disabled={upload.state === "uploading"} />
            </Field>
            {upload.state === "uploading" && <p role="status" className="text-caption text-muted">“{upload.name}{tx("” सर्वर पर भेजी जा रही है…")}</p>}
            {upload.state === "done" && (
              <p role="status" className="flex items-center gap-1 text-caption text-success">
                <FileUp className="size-4" aria-hidden /> {upload.file.name} · {mb(upload.file.bytes)} {tx("अपलोड हो गई")}
              </p>
            )}
            {upload.state === "error" && (
              <p role="alert" className="text-caption text-danger">
                {upload.name}: {upload.message}
              </p>
            )}
            <Field label={tx("परीक्षा")} hint={tx("क्विज़ पर दिखेगी, जैसे SSC CGL")}>
              <Input value={exam} maxLength={100} onChange={(e) => setExam(e.target.value)} />
            </Field>
            <Field label={tx("विषय / यूनिट")} hint={tx("जैसे जीव विज्ञान · यूनिट-1")}>
              <Input value={subject} maxLength={150} onChange={(e) => setSubject(e.target.value)} />
            </Field>
            <AiGenerate
              label={tx("क्विज़ बनाएँ")}
              build={() =>
                upload.state === "done" && exam.trim().length >= 2 && subject.trim().length >= 2
                  ? { type: "deck_quiz", input: { fileId: upload.file.id, exam: exam.trim(), subject: subject.trim() } }
                  : null
              }
              onResult={onResult}
              hint={tx("बड़े डेक में कुछ मिनट लग सकते हैं। यह स्क्रीन खुली रखें।")}
            />
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{tx("2. उत्तर जाँचें, फिर खोलें या डाउनलोड करें")}</CardTitle>
          </CardHeader>
          <CardBody className="space-y-4">
            {!quiz && <p className="text-body text-muted">{tx("क्विज़ बनने के बाद सभी प्रश्न यहाँ दिखेंगे।")}</p>}
            {quiz && (
              <>
                <div className="flex flex-wrap items-center gap-3">
                  <p className="me-auto text-label">
                    <b>{quiz.title.hi || quiz.title.en}</b> · {quiz.questions.length} {tx("प्रश्न")}
                  </p>
                  <Button variant="secondary" icon={<MonitorPlay className="size-4" />} onClick={() => void open()}>
                    {tx("क्विज़ खोलें")}
                  </Button>
                  <Button variant="primary" icon={<Download className="size-4" />} disabled={unchecked > 0} onClick={() => void download()}>
                    {tx("HTML डाउनलोड करें")}
                  </Button>
                </div>
                {unchecked > 0 ? (
                  <p role="status" className="flex items-start gap-2 rounded-control border border-warning bg-warning-subtle p-3 text-label">
                    <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden />
                    {tx("डेक में")} {unchecked} {tx("प्रश्नों का उत्तर नहीं लिखा था, उन्हें AI ने तय किया है। हर “जाँचना बाकी” प्रश्न देखें, ज़रूरत हो तो सही विकल्प चुनें, फिर “उत्तर सही है” पर टिक करें। उसके बाद डाउनलोड होगा।")}
                  </p>
                ) : (
                  <p role="status" className="flex items-center gap-2 text-label text-success">
                    <CheckCircle2 className="size-4" aria-hidden /> {tx("सभी उत्तर जाँचे जा चुके हैं।")}
                  </p>
                )}
                {quiz.issues.length > 0 && (
                  <div className="rounded-control border border-line p-3">
                    <p className="text-label font-semibold">{tx("डेक में मिली समस्याएँ")}</p>
                    <ul className="mt-1 list-disc ps-5 text-caption text-muted" lang="en">
                      {quiz.issues.map((issue, i) => (
                        <li key={i}>{issue}</li>
                      ))}
                    </ul>
                  </div>
                )}
                <ol className="space-y-3">
                  {quiz.questions.map((q, qi) => {
                    const needsCheck = !q.answerInDeck;
                    const ok = confirmed.has(qi);
                    return (
                      <li key={qi} className={`rounded-card border p-3 ${needsCheck && !ok ? "border-warning" : "border-line"}`}>
                        <div className="flex flex-wrap items-start gap-2">
                          <span className="text-label font-semibold">{tx("प्र")} {qi + 1}.</span>
                          <div className="min-w-0 flex-1">
                            <p className="text-body">{q.q.hi}</p>
                            <p className="text-caption text-muted" lang="en">
                              {q.q.en}
                            </p>
                          </div>
                          {needsCheck && (
                            <span className={`rounded-control px-2 py-0.5 text-caption font-semibold ${ok ? "bg-success-subtle text-success" : "bg-warning-subtle text-warning"}`}>
                              {ok ? tx("जाँच लिया") : tx("जाँचना बाकी")}
                            </span>
                          )}
                        </div>
                        <fieldset className="mt-2 grid gap-1 sm:grid-cols-2">
                          <legend className="sr-only">{tx("प्रश्न")} {qi + 1} {tx("का सही उत्तर")}</legend>
                          {q.options.map((o, oi) => (
                            <label key={oi} className={`flex cursor-pointer items-start gap-2 rounded-control border p-2 text-label ${q.answer === oi ? "border-success bg-success-subtle" : "border-line"}`}>
                              <input type="radio" name={`q${qi}`} checked={q.answer === oi} onChange={() => setAnswer(qi, oi)} className="mt-1" />
                              <span>
                                ({LETTERS[oi]}) {o.hi}
                                {o.en && o.en !== o.hi && <span className="block text-caption text-muted" lang="en">{o.en}</span>}
                              </span>
                            </label>
                          ))}
                        </fieldset>
                        <p className="mt-2 text-caption text-muted">{tx("व्याख्या:")} {q.explanation.hi}</p>
                        {q.note && (
                          <p className="mt-1 text-caption text-warning" lang="en">
                            {tx("डेक की समस्या:")} {q.note}
                          </p>
                        )}
                        {needsCheck && (
                          <label className="mt-2 flex items-center gap-2 text-label">
                            <input type="checkbox" checked={ok} onChange={() => toggleConfirmed(qi)} /> {tx("उत्तर सही है")}
                          </label>
                        )}
                      </li>
                    );
                  })}
                </ol>
              </>
            )}
          </CardBody>
        </Card>
      </div>

      <Modal open={preview !== null} onClose={() => setPreview(null)} title={tx("क्विज़ (पूर्वावलोकन)")} size="lg">
        {preview && (
          <iframe
            title={tx("क्विज़ पूर्वावलोकन")}
            {...(preview.url ? { src: preview.url } : { srcDoc: preview.doc })}
            className="h-[75vh] w-full rounded-card border-0 bg-black"
            // No allow-same-origin: with allow-scripts it would let the frame remove its own sandbox.
            sandbox="allow-scripts"
            allow="fullscreen"
          />
        )}
      </Modal>

      <ConfirmDialog
        open={blocker.state === "blocked"}
        title={tx("क्विज़ अभी डाउनलोड नहीं हुआ")}
        message={tx("यह क्विज़ सर्वर पर सेव नहीं होता। बिना डाउनलोड किए जाएँगे तो इसे दोबारा बनाना होगा (क्रेडिट फिर लगेंगे)।")}
        confirmLabel={tx("हाँ, छोड़ दें")}
        cancelLabel={tx("रुकें")}
        tone="danger"
        onConfirm={() => blocker.state === "blocked" && blocker.proceed()}
        onCancel={() => blocker.state === "blocked" && blocker.reset()}
      />
    </div>
  );
}
