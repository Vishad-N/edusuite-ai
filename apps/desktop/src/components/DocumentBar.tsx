import { useEffect, useId, useState } from "react";
import { useBlocker, useSearchParams } from "react-router";
import { CloudOff, FilePlus2, FolderOpen, History, Save, Search, Trash2 } from "lucide-react";
import { parseDocumentContent, type DocumentType, type SavedDocument } from "@edusuite/shared";
import { deleteDraft, draftKey, loadDraft, saveDraft, useOnline, type Draft } from "../api/drafts.ts";
import { ApiError } from "../api/client.ts";
import { fetchDocument, useDeleteDocument, useDocumentHistory, useSaveDocument } from "../api/documents.ts";
import { useSession, useSignedInUser } from "../api/session.tsx";
import { Button, ConfirmDialog, EmptyState, ErrorState, Input, Modal, Skeleton, useToast } from "./ui/index.ts";
import { tx, uiLocale } from "../i18n/index.ts";

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

const time = (iso: string) => new Date(iso).toLocaleTimeString(uiLocale(), { hour: "2-digit", minute: "2-digit" });
const dateTime = (iso: string) =>
  new Date(iso).toLocaleString(uiLocale(), { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

/**
 * The same Save / Open / History bar on every tool screen (Track B, DN-041).
 * Tracks unsaved changes by comparing with the last save, saves with the
 * document's version so nobody's work is overwritten (DN-038), and asks
 * before leaving with unsaved changes. Unsaved work is also kept on this PC as a draft,
 * offered back after a crash, and saved when the connection returns (DN-075).
 */
export function DocumentBar<T extends DocumentType>({ type, title, onTitleChange, content, onOpen, onNew }: Props<T>) {
  const { client } = useSession();
  const me = useSignedInUser();
  const toast = useToast();
  const titleId = useId();
  const save = useSaveDocument<T>();
  const online = useOnline();
  const key = draftKey(me.id, type);
  /** A draft from an earlier run, waiting for "restore" or "discard". */
  const [offer, setOffer] = useState<Draft | null>(null);
  const [draftLoaded, setDraftLoaded] = useState(false);
  /** Save was pressed while offline; save when the connection is back. */
  const [wantSave, setWantSave] = useState(false);

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

  const offlineToast = () =>
    toast.show({ tone: "info", title: tx("इंटरनेट नहीं है। काम इस कंप्यूटर पर सुरक्षित है और इंटरनेट आते ही अपने-आप सेव होगा।") });

  const doSave = async (asNew = false) => {
    if (!online) {
      setWantSave(true);
      return offlineToast();
    }
    try {
      const doc = await save.mutateAsync({
        type,
        title: title.trim() || tx("बिना शीर्षक"),
        content,
        id: asNew ? undefined : current?.id,
        expectedUpdatedAt: asNew ? undefined : current?.updatedAt,
      });
      remember(doc, title, content);
      setConflict(false);
      setWantSave(false);
      toast.show({ tone: "success", title: tx("सेव हो गया"), description: doc.title });
    } catch (err) {
      if (err instanceof ApiError && err.code === "DOCUMENT_CHANGED") return setConflict(true);
      if (err instanceof ApiError && err.code === "NETWORK_ERROR") {
        setWantSave(true);
        return offlineToast();
      }
      toast.show({ tone: "error", title: tx("सेव नहीं हुआ"), description: err instanceof ApiError ? err.message : undefined });
    }
  };

  const open = async (id: string) => {
    try {
      const doc = await fetchDocument<T>(client, id);
      if (doc.type !== type) {
        toast.show({ tone: "error", title: tx("यह दस्तावेज़ इस स्क्रीन का नहीं है") });
        return;
      }
      onTitleChange(doc.title);
      onOpen(doc.content, doc);
      setCurrent({ id: doc.id, updatedAt: doc.updatedAt });
      // The screen may rebuild the content slightly differently (key order, empty optional
      // fields); take its own state on the next render as the "saved" baseline.
      setFreshPending(true);
      setHistoryOpen(false);
      setConflict(false);
    } catch (err) {
      toast.show({ tone: "error", title: tx("दस्तावेज़ नहीं खुला"), description: err instanceof ApiError ? err.message : undefined });
    }
  };

  // A link like #/ppt?open=<id> (Dashboard, TeacherDesk) opens that document once, then
  // drops the parameter so a reload or "New" doesn't open it again.
  const [searchParams, setSearchParams] = useSearchParams();
  const linkedId = searchParams.get("open");
  useEffect(() => {
    if (!linkedId) return;
    setSearchParams(
      (params) => {
        params.delete("open");
        return params;
      },
      { replace: true },
    );
    void open(linkedId);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- runs once per linked id
  }, [linkedId]);

  // Drafts (DN-075): look for one left from an earlier run, then keep the current unsaved
  // work on this PC while it differs from what the server has.
  useEffect(() => {
    let cancelled = false;
    void loadDraft(key).then((d) => {
      if (cancelled) return;
      if (d && parseDocumentContent(type, d.content).success) setOffer(d);
      else if (d) void deleteDraft(key);
      setDraftLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, [key, type]);

  useEffect(() => {
    if (!draftLoaded || offer) return;
    if (!dirty) {
      void deleteDraft(key);
      return;
    }
    const timer = setTimeout(() => {
      void saveDraft(key, { title, content, docId: current?.id, docUpdatedAt: current?.updatedAt, savedAt: new Date().toISOString(), wantSave });
    }, 800);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- snapshot stands for title + content
  }, [snapshot, dirty, draftLoaded, offer, wantSave, current, key]);

  // Back online with a save the user asked for: do it now.
  useEffect(() => {
    if (online && wantSave && dirty && !save.isPending) void doSave();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only when the connection changes
  }, [online]);

  const restoreDraft = () => {
    const d = offer;
    setOffer(null);
    if (!d) return;
    const parsed = parseDocumentContent(type, d.content);
    if (!parsed.success) return void deleteDraft(key);
    const restoredContent = parsed.data as SavedDocument<T>["content"];
    onTitleChange(d.title);
    onOpen(restoredContent, { id: d.docId ?? "", type, title: d.title, content: restoredContent, updatedAt: d.docUpdatedAt ?? d.savedAt } as unknown as SavedDocument<T>);
    setCurrent(d.docId && d.docUpdatedAt ? { id: d.docId, updatedAt: d.docUpdatedAt } : null);
    // Never equal to the screen's state, so it shows as unsaved until saved.
    setSavedSnapshot("\u0000restored-draft");
    setWantSave(Boolean(d.wantSave));
    toast.show({ tone: "success", title: tx("बिना सेव किया काम वापस आ गया। सेव करना न भूलें।") });
  };

  const discardDraft = () => {
    setOffer(null);
    void deleteDraft(key);
  };

  /** Runs `action` now, or after confirming if there are unsaved changes. */
  const guard = (action: () => void) => (dirty ? setPendingDiscard(() => action) : action());

  const startNew = () => {
    onNew();
    setCurrent(null);
    setFreshPending(true);
  };

  return (
    <div className="space-y-2 no-print">
      {offer && (
        <div role="status" className="flex flex-col gap-2 rounded-card border border-warning bg-warning-subtle p-3 md:flex-row md:items-center">
          <History className="size-4 shrink-0 text-warning" aria-hidden="true" />
          <p className="text-label text-ink md:flex-1">
            {tx("पिछली बार का बिना सेव किया काम मिला: “{0}” ({1})।", [offer.title || tx("बिना शीर्षक"), dateTime(offer.savedAt)])}
          </p>
          <div className="flex gap-2">
            <Button size="sm" variant="primary" onClick={() => guard(restoreDraft)}>
              {tx("वापस लाएँ")}
            </Button>
            <Button size="sm" variant="ghost" onClick={discardDraft}>
              {tx("हटाएँ")}
            </Button>
          </div>
        </div>
      )}
    <div className="flex flex-col gap-3 rounded-card border border-line bg-surface p-3 md:flex-row md:items-center">
      <label htmlFor={titleId} className="sr-only">
        {tx("दस्तावेज़ का शीर्षक")}
      </label>
      <Input
        id={titleId}
        value={title}
        onChange={(e) => onTitleChange(e.target.value)}
        placeholder={tx("शीर्षक लिखें")}
        className="md:max-w-md"
      />
      <p aria-live="polite" className="text-caption text-muted md:flex-1">
        {!online && (
          <span className="me-1 inline-flex items-center gap-1 font-semibold text-warning">
            <CloudOff className="size-3.5" aria-hidden="true" />
            {tx("ऑफ़लाइन")}
          </span>
        )}
        {save.isPending
          ? tx("सेव हो रहा है…")
          : wantSave && dirty
            ? tx("इंटरनेट आते ही सेव होगा; काम इस कंप्यूटर पर सुरक्षित है")
            : dirty
            ? tx("बिना सेव किए बदलाव")
            : current
              ? tx("सेव हो गया · {0}", [time(current.updatedAt)])
              : tx("अभी सेव नहीं हुआ")}
      </p>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" icon={<FilePlus2 className="size-4" />} onClick={() => guard(startNew)}>
          {tx("नया")}
        </Button>
        <Button size="sm" icon={<FolderOpen className="size-4" />} onClick={() => setHistoryOpen(true)}>
          {tx("इतिहास")}
        </Button>
        <Button
          size="sm"
          variant="primary"
          icon={<Save className="size-4" />}
          loading={save.isPending}
          disabled={!dirty && Boolean(current)}
          onClick={() => void doSave()}
        >
          {tx("सेव करें")}
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
        title={tx("किसी और ने इसी बीच बदलाव किया है")}
        message={tx("आपके बदलाव सेव नहीं हुए। आप नया संस्करण खोल सकते हैं (आपके बदलाव हट जाएँगे), या अपने बदलावों को नई कॉपी के रूप में सेव कर सकते हैं।")}
        confirmLabel={tx("नई कॉपी के रूप में सेव करें")}
        cancelLabel={tx("नया संस्करण खोलें")}
        onConfirm={() => void doSave(true)}
        onCancel={() => {
          setConflict(false);
          if (current) void open(current.id);
        }}
      />

      <ConfirmDialog
        open={pendingDiscard !== null || blocker.state === "blocked"}
        title={tx("बिना सेव किए बदलाव")}
        message={tx("आपके कुछ बदलाव अभी सेव नहीं हुए हैं। बिना सेव किए आगे बढ़ें?")}
        confirmLabel={tx("हाँ, बिना सेव आगे बढ़ें")}
        cancelLabel={tx("रुकें")}
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
    <Modal open onClose={onClose} title={tx("सेव किए गए दस्तावेज़")} size="lg">
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" aria-hidden="true" />
            <Input type="search" aria-label={tx("शीर्षक से खोजें")} value={search} onChange={(e) => setSearch(e.target.value)} placeholder={tx("शीर्षक से खोजें")} className="pl-9" />
          </div>
          <label className="flex items-center gap-2 text-label text-ink">
            <input type="checkbox" checked={mine} onChange={(e) => setMine(e.target.checked)} className="size-4" />
            {tx("केवल मेरे")}
          </label>
        </div>

        {history.isPending ? (
          <Skeleton lines={4} />
        ) : history.isError ? (
          <ErrorState title={tx("सूची लोड नहीं हुई")} message={history.error instanceof ApiError ? history.error.message : undefined} onRetry={() => void history.refetch()} />
        ) : items.length === 0 ? (
          <EmptyState title={q || mine ? tx("कुछ नहीं मिला") : tx("अभी कुछ सेव नहीं हुआ")} description={q || mine ? tx("खोज बदलकर देखें।") : tx("सेव करें बटन से अपना काम सेव करें।")} />
        ) : (
          <ul className="divide-y divide-line rounded-card border border-line">
            {items.map((d) => (
              <li key={d.id} className="flex items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-ink">
                    {d.title}
                    {d.id === currentId && <span className="ml-2 text-caption font-normal text-muted">{tx("(खुला है)")}</span>}
                  </p>
                  <p className="text-caption text-muted">
                    {d.createdBy.displayName} · {dateTime(d.updatedAt)}
                  </p>
                </div>
                <Button size="sm" onClick={() => onPick(d.id)}>
                  {tx("खोलें")}
                </Button>
                {(isAdmin || d.createdBy.id === me.id) && (
                  <Button size="sm" variant="ghost" icon={<Trash2 className="size-4" />} aria-label={tx("{0}: हटाएँ", [d.title])} onClick={() => setDeleting({ id: d.id, title: d.title })}>
                    {tx("हटाएँ")}
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
        {history.hasNextPage && (
          <div className="flex justify-center">
            <Button onClick={() => void history.fetchNextPage()} loading={history.isFetchingNextPage}>
              {tx("और दिखाएँ")}
            </Button>
          </div>
        )}
      </div>
      <ConfirmDialog
        open={deleting !== null}
        title={tx("\"{0}\" हटाएँ?", [deleting?.title ?? ""])}
        message={tx("यह इतिहास से हट जाएगा और यहाँ से वापस नहीं खुलेगा।")}
        confirmLabel={tx("हाँ, हटाएँ")}
        tone="danger"
        busy={remove.isPending}
        onCancel={() => setDeleting(null)}
        onConfirm={async () => {
          if (!deleting) return;
          try {
            await remove.mutateAsync(deleting.id);
            onDeleted(deleting.id);
            toast.show({ tone: "success", title: tx("हटा दिया गया") });
          } catch (err) {
            toast.show({ tone: "error", title: tx("हटाया नहीं जा सका"), description: err instanceof ApiError ? err.message : undefined });
          } finally {
            setDeleting(null);
          }
        }}
      />
    </Modal>
  );
}
