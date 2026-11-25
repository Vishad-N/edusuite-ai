import { useState } from "react";
import { useDeferredValue } from "react";
import { Trash2 } from "lucide-react";
import { QUESTION_LETTERS, type BankQuestion } from "@edusuite/shared";
import { useBankQuestions, useBankSubjects, type BankFilter } from "../api/questions.ts";
import { tx } from "../i18n/index.ts";
import { Button, EmptyState, ErrorState, Field, Input, Select, Skeleton } from "./ui/index.ts";

/**
 * Search and browse the question bank (DN-074). Used by the bank screen (with delete) and by
 * the paper editor's "add from bank" dialog (with checkboxes).
 */
export function QuestionBankList({
  selectable = false,
  selected,
  onToggle,
  canDelete,
  onDelete,
}: {
  selectable?: boolean;
  selected?: ReadonlySet<string>;
  onToggle?: (q: BankQuestion) => void;
  canDelete?: (q: BankQuestion) => boolean;
  onDelete?: (q: BankQuestion) => void;
}) {
  const [filter, setFilter] = useState<BankFilter>({ q: "", subject: "", mine: false });
  const deferred = useDeferredValue(filter);
  const subjects = useBankSubjects();
  const list = useBankQuestions(deferred);
  const items = list.data?.pages.flatMap((p) => p.items) ?? [];

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-[1fr_14rem_auto] md:items-end">
        <Field label={tx("प्रश्न खोजें")}>
          <Input type="search" value={filter.q} onChange={(e) => setFilter((f) => ({ ...f, q: e.target.value }))} placeholder={tx("प्रश्न या टॉपिक के शब्द")} />
        </Field>
        <Field label={tx("विषय")}>
          <Select value={filter.subject} onChange={(e) => setFilter((f) => ({ ...f, subject: e.target.value }))}>
            <option value="">{tx("सभी विषय")}</option>
            {(subjects.data ?? []).map((s) => (
              <option key={s.subject} value={s.subject}>
                {s.subject} ({s.count})
              </option>
            ))}
          </Select>
        </Field>
        <label className="flex items-center gap-2 pb-2 text-label">
          <input type="checkbox" checked={filter.mine} onChange={(e) => setFilter((f) => ({ ...f, mine: e.target.checked }))} /> {tx("केवल मेरे")}
        </label>
      </div>

      {list.isPending ? (
        <Skeleton lines={5} />
      ) : list.isError ? (
        <ErrorState title={tx("प्रश्न लोड नहीं हुए")} onRetry={() => void list.refetch()} />
      ) : items.length === 0 ? (
        <EmptyState
          title={filter.q || filter.subject || filter.mine ? tx("कुछ नहीं मिला") : tx("प्रश्न बैंक अभी खाली है")}
          description={tx("टेस्ट पेपर या स्क्रीनशॉट MCQ सेट से “प्रश्न बैंक में जोड़ें” दबाएँ।")}
        />
      ) : (
        <ol className="space-y-3" aria-label={tx("प्रश्न बैंक")}>
          {items.map((q) => (
            <li key={q.id} className="rounded-card border border-line bg-surface p-3">
              <div className="flex items-start gap-3">
                {selectable && (
                  <input
                    type="checkbox"
                    className="mt-1"
                    checked={selected?.has(q.id) ?? false}
                    onChange={() => onToggle?.(q)}
                    aria-label={tx("चुनें: {0}", [q.bodyHi.slice(0, 60)])}
                  />
                )}
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="text-body text-ink">{q.bodyHi}</p>
                  {q.bodyEn && (
                    <p className="text-caption text-muted" lang="en">
                      {q.bodyEn}
                    </p>
                  )}
                  <ul className="grid gap-1 text-label sm:grid-cols-2">
                    {QUESTION_LETTERS.map((l) => (
                      <li key={l} className={l === q.answer ? "font-semibold text-success" : "text-ink"}>
                        {l}) {q.options[l]}
                        {l === q.answer && <span className="sr-only"> ({tx("सही उत्तर")})</span>}
                      </li>
                    ))}
                  </ul>
                  <p className="text-caption text-muted">
                    {q.subject}
                    {q.topic ? ` · ${q.topic}` : ""} · {q.createdBy.displayName}
                  </p>
                </div>
                {onDelete && canDelete?.(q) && (
                  <Button size="sm" variant="ghost" icon={<Trash2 className="size-4" />} aria-label={tx("प्रश्न हटाएँ")} onClick={() => onDelete(q)}>
                    {tx("हटाएँ")}
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ol>
      )}
      {list.hasNextPage && (
        <Button variant="secondary" loading={list.isFetchingNextPage} onClick={() => void list.fetchNextPage()}>
          {tx("और दिखाएँ")}
        </Button>
      )}
    </div>
  );
}
