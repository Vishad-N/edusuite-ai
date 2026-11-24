import { useNavigate } from "react-router";
import { DOCUMENT_SCREENS, type DocumentSummary } from "@edusuite/shared";
import { documentTypeLabel } from "../i18n/labels.ts";
import { Button, EmptyState } from "./ui/index.ts";
import { tx, uiLocale } from "../i18n/index.ts";

const when = (iso: string) => new Date(iso).toLocaleString(uiLocale(), { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

/** A short list of saved documents; "खोलें" opens each in its own tool screen. */
export function RecentDocuments({
  items,
  showAuthor = true,
  emptyTitle,
  emptyDescription,
}: {
  items: DocumentSummary[];
  showAuthor?: boolean;
  emptyTitle: string;
  emptyDescription: string;
}) {
  const navigate = useNavigate();
  if (items.length === 0) return <EmptyState title={emptyTitle} description={emptyDescription} />;
  return (
    <ul className="divide-y divide-line rounded-card border border-line">
      {items.map((d) => (
        <li key={d.id} className="flex items-center gap-3 px-4 py-3">
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold text-ink">{d.title}</p>
            <p className="text-caption text-muted">
              {documentTypeLabel(d.type)}
              {showAuthor && ` · ${d.createdBy.displayName}`} · {when(d.updatedAt)}
            </p>
          </div>
          <Button size="sm" aria-label={tx("{0}: खोलें", [d.title])} onClick={() => navigate(`/${DOCUMENT_SCREENS[d.type]}?open=${d.id}`)}>
            {tx("खोलें")}
          </Button>
        </li>
      ))}
    </ul>
  );
}
