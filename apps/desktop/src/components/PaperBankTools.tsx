import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Library, LibraryBig } from "lucide-react";
import { bankToPaperMcq, paperMcqToBank, type BankQuestion, type QuestionInput } from "@edusuite/shared";
import { useSession } from "../api/session.tsx";
import { ApiError } from "../api/client.ts";
import { addToBank } from "../api/questions.ts";
import { tx } from "../i18n/index.ts";
import { QuestionBankList } from "./QuestionBankList.tsx";
import { Button, Modal, useToast } from "./ui/index.ts";

type PaperQuestion = { q: string; options?: string[]; ans?: string };

type SetQuestion = { question: string; options: { A: string; B: string; C: string; D: string }; correct: "A" | "B" | "C" | "D"; trick?: string };

/** "प्रश्न बैंक में जोड़ें" for a screenshot MCQ set (DN-074): every question with text and four options. */
export function McqSetBankButton({ questions, subject, examTag }: { questions: SetQuestion[]; subject: string; examTag: string }) {
  const { client } = useSession();
  const queryClient = useQueryClient();
  const toast = useToast();
  const [saving, setSaving] = useState(false);

  const save = async () => {
    const subj = subject.trim() || examTag.trim();
    if (!subj) return toast.show({ tone: "error", title: tx("पहले सेट का विषय भरें।") });
    const ready = questions
      .filter((q) => q.question.trim() && Object.values(q.options).every((o) => o.trim()))
      .map((q): QuestionInput => ({ subject: subj, bodyHi: q.question, options: q.options, answer: q.correct, ...(q.trick?.trim() && { trick: q.trick }) }));
    if (ready.length === 0) return toast.show({ tone: "error", title: tx("कोई भी प्रश्न पूरा (प्रश्न और चारों विकल्प) नहीं है।") });
    setSaving(true);
    try {
      const res = await addToBank(client, ready.slice(0, 200));
      await queryClient.invalidateQueries({ queryKey: ["questions"] });
      toast.show({ tone: "success", title: tx("प्रश्न बैंक में {0} जुड़े, {1} पहले से थे।", [String(res.added), String(res.skipped)]) });
    } catch (err) {
      toast.show({ tone: "error", title: tx("प्रश्न बैंक में नहीं जुड़े"), description: err instanceof ApiError ? err.message : undefined });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Button size="sm" icon={<LibraryBig className="size-4" />} loading={saving} onClick={() => void save()}>
      {tx("प्रश्न बैंक में जोड़ें")}
    </Button>
  );
}

/**
 * The question bank inside the paper editor (DN-074): save this paper's MCQs to the bank,
 * or pick saved questions into the current section.
 */
export function PaperBankTools({
  subject,
  topic,
  sections,
  sectionName,
  onAdd,
}: {
  subject: string;
  topic: string;
  sections: Array<{ questions: PaperQuestion[] }>;
  sectionName: string;
  onAdd: (questions: Array<{ q: string; options: string[]; ans: string }>) => void;
}) {
  const { client } = useSession();
  const queryClient = useQueryClient();
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const [picking, setPicking] = useState(false);
  const [chosen, setChosen] = useState<Map<string, BankQuestion>>(new Map());

  const saveToBank = async () => {
    if (!subject.trim()) return toast.show({ tone: "error", title: tx("पहले पेपर का विषय भरें।") });
    const mcqs = sections
      .flatMap((s) => s.questions)
      .map((q) => paperMcqToBank(q, subject.trim(), topic.trim() || undefined))
      .filter((q): q is QuestionInput => q !== null);
    if (mcqs.length === 0) {
      return toast.show({ tone: "error", title: tx("इस पेपर में चार विकल्प और उत्तर वाला कोई MCQ नहीं है।") });
    }
    setSaving(true);
    try {
      const res = await addToBank(client, mcqs.slice(0, 200));
      await queryClient.invalidateQueries({ queryKey: ["questions"] });
      toast.show({ tone: "success", title: tx("प्रश्न बैंक में {0} जुड़े, {1} पहले से थे।", [String(res.added), String(res.skipped)]) });
    } catch (err) {
      toast.show({ tone: "error", title: tx("प्रश्न बैंक में नहीं जुड़े"), description: err instanceof ApiError ? err.message : undefined });
    } finally {
      setSaving(false);
    }
  };

  const toggle = (q: BankQuestion) =>
    setChosen((m) => {
      const next = new Map(m);
      if (next.has(q.id)) next.delete(q.id);
      else next.set(q.id, q);
      return next;
    });

  const close = () => {
    setPicking(false);
    setChosen(new Map());
  };

  return (
    <div className="flex flex-wrap gap-2 rounded-card border border-line bg-surface p-3">
      <Button size="sm" icon={<LibraryBig className="size-4" />} loading={saving} onClick={() => void saveToBank()}>
        {tx("MCQ प्रश्न बैंक में जोड़ें")}
      </Button>
      <Button size="sm" icon={<Library className="size-4" />} onClick={() => setPicking(true)}>
        {tx("प्रश्न बैंक से जोड़ें")}
      </Button>
      <Modal
        open={picking}
        onClose={close}
        size="lg"
        title={tx("प्रश्न बैंक से जोड़ें")}
        description={tx("चुने प्रश्न “{0}” में जुड़ेंगे।", [sectionName])}
        footer={
          <div className="flex justify-end gap-2">
            <Button onClick={close}>{tx("रद्द करें")}</Button>
            <Button
              variant="primary"
              disabled={chosen.size === 0}
              onClick={() => {
                onAdd([...chosen.values()].map(bankToPaperMcq));
                toast.show({ tone: "success", title: tx("{0} प्रश्न जोड़े गए", [String(chosen.size)]) });
                close();
              }}
            >
              {tx("{0} प्रश्न जोड़ें", [String(chosen.size)])}
            </Button>
          </div>
        }
      >
        {picking && <QuestionBankList selectable selected={new Set(chosen.keys())} onToggle={toggle} />}
      </Modal>
    </div>
  );
}
