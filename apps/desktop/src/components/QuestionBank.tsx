import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Library } from "lucide-react";
import type { BankQuestion } from "@edusuite/shared";
import { useSession, useSignedInUser } from "../api/session.tsx";
import { ApiError } from "../api/client.ts";
import { tx } from "../i18n/index.ts";
import { QuestionBankList } from "./QuestionBankList.tsx";
import { ConfirmDialog, PageHeader, useToast } from "./ui/index.ts";

/**
 * The institute's question bank (DN-074): every MCQ teachers saved from papers and
 * screenshot sets, searchable by text, subject and author. Reuse happens in the paper
 * editor ("प्रश्न बैंक से जोड़ें").
 */
export default function QuestionBank() {
  const user = useSignedInUser();
  const { client } = useSession();
  const queryClient = useQueryClient();
  const toast = useToast();
  const [deleting, setDeleting] = useState<BankQuestion | null>(null);
  const admin = user.role === "superadmin" || user.role === "branch_admin";

  return (
    <div className="space-y-6">
      <PageHeader
        title={tx("प्रश्न बैंक")}
        icon={<Library className="size-6" />}
        badge="MCQ"
        description={tx("संस्थान के सभी सेव किए MCQ। नया पेपर बनाते समय “प्रश्न बैंक से जोड़ें” से चुनें।")}
      />
      <QuestionBankList canDelete={(q) => admin || q.createdBy.id === user.id} onDelete={setDeleting} />
      <ConfirmDialog
        open={deleting !== null}
        title={tx("प्रश्न हटाएँ?")}
        message={tx("यह प्रश्न बैंक से हट जाएगा। पहले से बने पेपर नहीं बदलेंगे।")}
        confirmLabel={tx("हाँ, हटाएँ")}
        cancelLabel={tx("रद्द करें")}
        tone="danger"
        onCancel={() => setDeleting(null)}
        onConfirm={async () => {
          const q = deleting;
          setDeleting(null);
          if (!q) return;
          try {
            await client.delete(`/questions/${q.id}`);
            await queryClient.invalidateQueries({ queryKey: ["questions"] });
            toast.show({ tone: "success", title: tx("हटा दिया गया") });
          } catch (err) {
            toast.show({ tone: "error", title: tx("हटाया नहीं जा सका"), description: err instanceof ApiError ? err.message : undefined });
          }
        }}
      />
    </div>
  );
}
