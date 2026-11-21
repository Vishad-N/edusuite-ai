import { useEffect, useId, useState } from "react";
import { useBlocker } from "react-router";
import { FilePlus2, FolderOpen, Save, Search, Trash2 } from "lucide-react";
import type { DocumentType, SavedDocument } from "@edusuite/shared";
import { ApiError } from "../api/client.ts";
import { fetchDocument, useDeleteDocument, useDocumentHistory, useSaveDocument } from "../api/documents.ts";
import { useSession, useSignedInUser } from "../api/session.tsx";
import { Button, ConfirmDialog, EmptyState, ErrorState, Input, Modal, Skeleton, useToast } from "./ui/index.ts";

type Props<T extends DocumentType> = {
  type: T;
  title: string;
  onTitleChange: (title: string) => void;
  /** The screen's current content, in the shape of the type's schema (packages/shared/documents.ts). */
  content: SavedDocument<T>["content"];
  /** Load a saved document into the screen. */
  onOpen: (content: SavedDocument<T>["content"], doc: SavedDocument<T>) => void;
  /** Reset the screen to a fresh, unsaved state. */
  onNew: () => void;
};

const time = (iso: string) => new Date(iso).toLocaleTimeString("hi-IN", { hour: "2-digit", minute: "2-digit" });
const dateTime = (iso: string) =>
  new Date(iso).toLocaleString("hi-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

/**
 * The same Save / Open / History bar on every tool screen (Track B, DN-041).
 * Tracks unsaved changes by comparing with the last save, saves with the
 * document's version so nobody's work is overwritten (DN-038), and asks
 * before leaving with unsaved changes.
 */
export function DocumentBar<T extends DocumentType>({ type, title, onTitleChange, content, onOpen, onNew }: Props<T>) {
  const { client } = useSession();
  const toast = useToast();
  const titleId = useId();
  const save = useSaveDocument<T>();

  const [current, setCurrent] = useState<{ id: string; updatedAt: string } | null>(null);
  const snapshot = JSON.stringify({ title, content });
  const [savedSnapshot, setSavedSnapshot] = useState(snapshot);
  // After "New" or "Open", the screen's next render is the new baseline (nothing unsaved yet).
  const [freshPending, setFreshPending] = useState(false);
  if (freshPending) {
    setFreshPending(false);
    setSavedSnapshot(snapshot);
  }
  const dirty = !freshPending && snapshot !== savedSnapshot;

  const [historyOpen, setHistoryOpen] = useState(false);
  const [conflict, setConflict] = useState(false);
  const [pendingDiscard, setPendingDiscard] = useState<null | (() => void)>(null);

  // Ask before navigating away with unsaved changes.
  const blocker = useBlocker(({ currentLocation, nextLocation }) => dirty && currentLocation.pathname !== nextLocation.pathname);

  const remember = (doc: SavedDocument<T>, savedTitle: string, savedContent: unknown) => {
    setCurrent({ id: doc.id, updatedAt: doc.updatedAt });
    setSavedSnapshot(JSON.stringify({ title: savedTitle, content: savedContent }));
  };

  const doSave = async (asNew = false) => {
    try {
      const doc = await save.mutateAsync({
        type,
        title: title.trim() || "बिना शीर्षक",
        content,
        id: asNew ? undefined : current?.id,
        expectedUpdatedAt: asNew ? undefined : current?.updatedAt,
      });
      remember(doc, title, content);
      setConflict(false);
      toast.show({ tone: "success", title: "सेव हो गया", description: doc.title });
    } catch (err) {
      if (err instanceof ApiError && err.code === "DOCUMENT_CHANGED") return setConflict(true);
      toast.show({ tone: "error", title: "सेव नहीं हुआ", description: err instanceof ApiError ? err.message : undefined });
    }
  };

  const open = async (id: string) => {
    try {
      const doc = await fetchDocument<T>(client, id);
      onTitleChange(doc.title);
      onOpen(doc.content, doc);
      setCurrent({ id: doc.id, updatedAt: doc.updatedAt });
      // The screen may rebuild the content slightly differently (key order, empty optional
      // fields); take its own state on the next render as the "saved" baseline.
      setFreshPending(true);
      setHistoryOpen(false);
      setConflict(false);
    } catch (err) {
      toast.show({ tone: "error", title: "दस्तावेज़ नहीं खुला", description: err instanceof ApiError ? err.message : undefined });
    }
  };

  /** Runs `action` now, or after confirming if there are unsaved changes. */
  const guard = (action: () => void) => (dirty ? setPendingDiscard(() => action) : action());

  const startNew = () => {
    onNew();
    setCurrent(null);
    setFreshPending(true);
  };

  return (
    <div className="flex flex-col gap-3 rounded-card border border-line bg-surface p-3 md:flex-row md:items-center no-print">
      <label htmlFor={titleId} className="sr-only">
        दस्तावेज़ का शीर्षक
      </label>
      <Input
        id={titleId}
        value={title}
        onChange={(e) => onTitleChange(e.target.value)}
        placeholder="शीर्षक लिखें"
        className="md:max-w-md"
      />
      <p aria-live="polite" className="text-caption text-muted md:flex-1">
        {save.isPending
          ? "सेव हो रहा है…"
          : dirty
            ? "बिना सेव किए बदलाव"
            : current
              ? `सेव हो गया · ${time(current.updatedAt)}`
              : "अभी सेव नहीं हुआ"}
      </p>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" icon={<FilePlus2 className="size-4" />} onClick={() => guard(startNew)}>
          नया
        </Button>
        <Button size="sm" icon={<FolderOpen className="size-4" />} onClick={() => setHistoryOpen(true)}>
          इतिहास
        </Button>
        <Button
          size="sm"
          variant="primary"
          icon={<Save className="size-4" />}
          loading={save.isPending}
          disabled={!dirty && Boolean(current)}
          onClick={() => void doSave()}
        >
          सेव करें
        </Button>
      </div>

      {historyOpen && (
        <HistoryModal
          type={type}
          currentId={current?.id}
          onClose={() => setHistoryOpen(false)}
          onPick={(id) => guard(() => void open(id))}
          onDeleted={(id) => {
            if (id === current?.id) setCurrent(null);
          }}
        />
      )}

      <ConfirmDialog
        open={conflict}
        title="किसी और ने इसी बीच बदलाव किया है"
        message="आपके बदलाव सेव नहीं हुए। आप नया संस्करण खोल सकते हैं (आपके बदलाव हट जाएँगे), या अपने बदलावों को नई कॉपी के रूप में सेव कर सकते हैं।"
        confirmLabel="नई कॉपी के रूप में सेव करें"
        cancelLabel="नया संस्करण खोलें"
        onConfirm={() => void doSave(true)}
        onCancel={() => {
          setConflict(false);
          if (current) void open(current.id);
        }}
      />

      <ConfirmDialog
        open={pendingDiscard !== null || blocker.state === "blocked"}
        title="बिना सेव किए बदलाव"
        message="आपके कुछ बदलाव अभी सेव नहीं हुए हैं। बिना सेव किए आगे बढ़ें?"
        confirmLabel="हाँ, बिना सेव आगे बढ़ें"
        cancelLabel="रुकें"
        tone="danger"
        onConfirm={() => {
          if (blocker.state === "blocked") blocker.proceed();
          pendingDiscard?.();
          setPendingDiscard(null);
        }}
        onCancel={() => {
          if (blocker.state === "blocked") blocker.reset();
          setPendingDiscard(null);
        }}
      />
    </div>
  );
}

function HistoryModal({
  type,
  currentId,
  onClose,
  onPick,
  onDeleted,
}: {
  type: DocumentType;
  currentId: string | undefined;
  onClose: () => void;
  onPick: (id: string) => void;
  onDeleted: (id: string) => void;
}) {
  const me = useSignedInUser();
  const toast = useToast();
  const [search, setSearch] = useState("");
  const [q, setQ] = useState("");
  const [mine, setMine] = useState(false);
  const [deleting, setDeleting] = useState<{ id: string; title: string } | null>(null);
  useEffect(() => {
    const timer = setTimeout(() => setQ(search.trim()), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const history = useDocumentHistory(type, { q, mine, enabled: true });
  const remove = useDeleteDocument(type);
  const items = history.data?.pages.flatMap((p) => p.items) ?? [];
  const isAdmin = me.role === "superadmin" || me.role === "branch_admin";

  return (
    <Modal open onClose={onClose} title="सेव किए गए दस्तावेज़" size="lg">
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" aria-hidden="true" />
            <Input type="search" aria-label="शीर्षक से खोजें" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="शीर्षक से खोजें" className="pl-9" />
          </div>
          <label className="flex items-center gap-2 text-label text-ink">
            <input type="checkbox" checked={mine} onChange={(e) => setMine(e.target.checked)} className="size-4" />
            केवल मेरे
          </label>
        </div>

        {history.isPending ? (
          <Skeleton lines={4} />
        ) : history.isError ? (
          <ErrorState title="सूची लोड नहीं हुई" message={history.error instanceof ApiError ? history.error.message : undefined} onRetry={() => void history.refetch()} />
        ) : items.length === 0 ? (
          <EmptyState title={q || mine ? "कुछ नहीं मिला" : "अभी कुछ सेव नहीं हुआ"} description={q || mine ? "खोज बदलकर देखें।" : "सेव करें बटन से अपना काम सेव करें।"} />
        ) : (
          <ul className="divide-y divide-line rounded-card border border-line">
            {items.map((d) => (
              <li key={d.id} className="flex items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-ink">
                    {d.title}
                    {d.id === currentId && <span className="ml-2 text-caption font-normal text-muted">(खुला है)</span>}
                  </p>
                  <p className="text-caption text-muted">
                    {d.createdBy.displayName} · {dateTime(d.updatedAt)}
                  </p>
                </div>
                <Button size="sm" onClick={() => onPick(d.id)}>
                  खोलें
                </Button>
                {(isAdmin || d.createdBy.id === me.id) && (
                  <Button size="sm" variant="ghost" icon={<Trash2 className="size-4" />} aria-label={`${d.title}: हटाएँ`} onClick={() => setDeleting({ id: d.id, title: d.title })}>
                    हटाएँ
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
        {history.hasNextPage && (
          <div className="flex justify-center">
            <Button onClick={() => void history.fetchNextPage()} loading={history.isFetchingNextPage}>
              और दिखाएँ
            </Button>
          </div>
        )}
      </div>
      <ConfirmDialog
        open={deleting !== null}
        title={`"${deleting?.title ?? ""}" हटाएँ?`}
        message="यह इतिहास से हट जाएगा और यहाँ से वापस नहीं खुलेगा।"
        confirmLabel="हाँ, हटाएँ"
        tone="danger"
        busy={remove.isPending}
        onCancel={() => setDeleting(null)}
        onConfirm={async () => {
          if (!deleting) return;
          try {
            await remove.mutateAsync(deleting.id);
            onDeleted(deleting.id);
            toast.show({ tone: "success", title: "हटा दिया गया" });
          } catch (err) {
            toast.show({ tone: "error", title: "हटाया नहीं जा सका", description: err instanceof ApiError ? err.message : undefined });
          } finally {
            setDeleting(null);
          }
        }}
      />
    </Modal>
  );
}
