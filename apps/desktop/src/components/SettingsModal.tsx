import { useState, type FormEvent, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { LOGO_MAX_BYTES, LOGO_MIMES, scopeFor, type Branch, type Institute, type SessionUser } from "@edusuite/shared";
import { uploadFile } from "../api/documents.ts";
import { useInstituteLogo } from "../api/logo.ts";
import { initialsLogo } from "../utils/branding.ts";
import { useSession } from "../api/session.tsx";
import { ApiError } from "../api/client.ts";
import { Button, ErrorState, Field, Input, Modal, Skeleton, useToast } from "./ui/index.ts";
import { tx } from "../i18n/index.ts";

type Props = { open: boolean; onClose: () => void; user: SessionUser };

/**
 * Institute and branch settings (plan §09 "Institute and branch settings").
 * A super admin edits the institute's name and branding; a branch admin edits
 * only their own branch. There is no AI key here: keys live only on the
 * server (Phase 2 definition of done).
 */
export default function SettingsModal({ open, onClose, user }: Props) {
  const instituteWide = scopeFor(user.role, "institute.settings") === "institute";
  return instituteWide ? (
    <InstituteSettings open={open} onClose={onClose} instituteId={user.institute.id} />
  ) : (
    <BranchSettings open={open} onClose={onClose} instituteId={user.institute.id} branchId={user.branch.id} />
  );
}

type InstituteValues = { name: string; tagline: string; phone: string; city: string; logoFileId: string };

function InstituteSettings({ open, onClose, instituteId }: { open: boolean; onClose: () => void; instituteId: string }) {
  const { client } = useSession();
  const queryClient = useQueryClient();
  const toast = useToast();
  const institute = useQuery({
    queryKey: ["institute", instituteId],
    queryFn: () => client.get<Institute>(`/institutes/${instituteId}`),
    enabled: open,
  });
  const save = useMutation({
    mutationFn: (v: InstituteValues) =>
      client.patch<Institute>(`/institutes/${instituteId}`, {
        name: v.name,
        branding: { tagline: v.tagline, phone: v.phone, city: v.city, ...(v.logoFileId && { logoFileId: v.logoFileId }) },
      }),
    onSuccess: (data) => {
      queryClient.setQueryData(["institute", instituteId], data);
      toast.show({ tone: "success", title: tx("संस्थान की जानकारी सेव हो गई") });
      onClose();
    },
  });

  const formId = "institute-settings";
  return (
    <SettingsShell
      open={open}
      onClose={onClose}
      busy={save.isPending}
      formId={formId}
      title={tx("संस्थान की जानकारी")}
      description={tx("यह नाम और जानकारी रसीदों, प्रिंट और हेडर में दिखती है।")}
    >
      {institute.isPending ? (
        <Skeleton lines={4} />
      ) : institute.isError ? (
        <ErrorState title={tx("जानकारी लोड नहीं हुई")} onRetry={() => void institute.refetch()} />
      ) : (
        // Keyed by the data so the form starts fresh from what the server has.
        <InstituteForm
          key={JSON.stringify(institute.data)}
          id={formId}
          institute={institute.data}
          error={save.error}
          onSubmit={(v) => save.mutate(v)}
        />
      )}
    </SettingsShell>
  );
}

function InstituteForm({
  id,
  institute,
  error,
  onSubmit,
}: {
  id: string;
  institute: Institute;
  error: unknown;
  onSubmit: (v: InstituteValues) => void;
}) {
  const b = institute.branding;
  const [v, setV] = useState<InstituteValues>({
    name: institute.name,
    tagline: b.tagline ?? "",
    phone: b.phone ?? "",
    city: b.city ?? "",
    logoFileId: b.logoFileId ?? "",
  });
  const set = (key: keyof InstituteValues) => (e: { target: { value: string } }) => setV((f) => ({ ...f, [key]: e.target.value }));
  return (
    <form
      id={id}
      className="flex flex-col gap-4"
      onSubmit={(e: FormEvent) => {
        e.preventDefault();
        onSubmit(v);
      }}
    >
      <ErrorLine error={error} />
      <Field label={tx("संस्थान का नाम")} required>
        <Input value={v.name} onChange={set("name")} />
      </Field>
      <Field label={tx("टैगलाइन / ध्येय वाक्य")}>
        <Input value={v.tagline} onChange={set("tagline")} />
      </Field>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Field label={tx("फ़ोन / व्हाट्सएप")}>
          <Input value={v.phone} onChange={set("phone")} inputMode="tel" />
        </Field>
        <Field label={tx("शहर")}>
          <Input value={v.city} onChange={set("city")} />
        </Field>
      </div>
      <LogoPicker name={v.name} fileId={v.logoFileId} onChange={(logoFileId) => setV((f) => ({ ...f, logoFileId }))} />
    </form>
  );
}

/**
 * The institute's logo (DN-071): PNG, JPG or WebP up to 1 MB. It replaces the initials badge on
 * every printout and export once settings are saved.
 */
function LogoPicker({ name, fileId, onChange }: { name: string; fileId: string; onChange: (fileId: string) => void }) {
  const { client } = useSession();
  const preview = useInstituteLogo(fileId || undefined);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const inputId = "institute-logo-file";

  const pick = async (file: File | undefined) => {
    setError("");
    if (!file) return;
    if (!(LOGO_MIMES as readonly string[]).includes(file.type)) return setError(tx("केवल PNG, JPG या WebP चुनें।"));
    if (file.size > LOGO_MAX_BYTES) return setError(tx("लोगो 1 MB से छोटा होना चाहिए।"));
    setBusy(true);
    try {
      const uploaded = await uploadFile(client, file);
      onChange(uploaded.id);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : tx("लोगो अपलोड नहीं हुआ। फिर से कोशिश करें।"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex items-center gap-4 rounded-card border border-line p-3">
      <img
        src={fileId ? (preview ?? initialsLogo(name)) : initialsLogo(name)}
        alt={fileId ? tx("संस्थान का लोगो") : tx("लोगो नहीं है; नाम के अक्षर दिखते हैं")}
        className="size-16 rounded-control border border-line object-contain bg-surface"
      />
      <div className="flex flex-col gap-2">
        <span className="text-label font-semibold text-ink">{tx("संस्थान का लोगो")}</span>
        <span className="text-caption text-muted">{tx("PNG, JPG या WebP, 1 MB तक। रसीदों, प्रिंट, PPT और क्विज़ पर दिखता है।")}</span>
        <div className="flex gap-2">
          <label
            htmlFor={inputId}
            className="inline-flex cursor-pointer items-center rounded-control border border-line-strong bg-surface px-3 py-1.5 text-label font-semibold text-ink hover:bg-page focus-within:outline-2"
          >
            {busy ? tx("अपलोड हो रहा है…") : fileId ? tx("लोगो बदलें") : tx("लोगो चुनें")}
            <input
              id={inputId}
              type="file"
              accept={LOGO_MIMES.join(",")}
              className="sr-only"
              disabled={busy}
              onChange={(e) => {
                void pick(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
          </label>
          {fileId && (
            <Button type="button" variant="ghost" onClick={() => onChange("")}>
              {tx("लोगो हटाएँ")}
            </Button>
          )}
        </div>
        {error && (
          <p role="alert" className="text-caption text-danger">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}

type BranchValues = { name: string; city: string };

function BranchSettings({
  open,
  onClose,
  instituteId,
  branchId,
}: {
  open: boolean;
  onClose: () => void;
  instituteId: string;
  branchId: string;
}) {
  const { client } = useSession();
  const queryClient = useQueryClient();
  const toast = useToast();
  const branches = useQuery({
    queryKey: ["branches", instituteId],
    queryFn: () => client.get<Branch[]>(`/institutes/${instituteId}/branches`),
    enabled: open,
  });
  const branch = branches.data?.find((b) => b.id === branchId);
  const save = useMutation({
    mutationFn: (v: BranchValues) =>
      client.patch<Branch>(`/institutes/${instituteId}/branches/${branchId}`, {
        name: v.name,
        city: v.city.trim() ? v.city : null,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["branches", instituteId] });
      toast.show({ tone: "success", title: tx("ब्रांच की जानकारी सेव हो गई"), description: tx("हेडर में नया नाम अगले लॉगिन से दिखेगा।") });
      onClose();
    },
  });

  const formId = "branch-settings";
  return (
    <SettingsShell
      open={open}
      onClose={onClose}
      busy={save.isPending}
      formId={formId}
      title={tx("ब्रांच की जानकारी")}
      description={tx("आप केवल अपनी ब्रांच की जानकारी बदल सकते हैं।")}
    >
      {branches.isPending ? (
        <Skeleton lines={2} />
      ) : !branch ? (
        <ErrorState title={tx("ब्रांच की जानकारी लोड नहीं हुई")} onRetry={() => void branches.refetch()} />
      ) : (
        <BranchForm key={JSON.stringify(branch)} id={formId} branch={branch} error={save.error} onSubmit={(v) => save.mutate(v)} />
      )}
    </SettingsShell>
  );
}

function BranchForm({
  id,
  branch,
  error,
  onSubmit,
}: {
  id: string;
  branch: Branch;
  error: unknown;
  onSubmit: (v: BranchValues) => void;
}) {
  const [v, setV] = useState<BranchValues>({ name: branch.name, city: branch.city ?? "" });
  return (
    <form
      id={id}
      className="flex flex-col gap-4"
      onSubmit={(e: FormEvent) => {
        e.preventDefault();
        onSubmit(v);
      }}
    >
      <ErrorLine error={error} />
      <Field label={tx("ब्रांच का नाम")} required>
        <Input value={v.name} onChange={(e) => setV((f) => ({ ...f, name: e.target.value }))} />
      </Field>
      <Field label={tx("शहर")}>
        <Input value={v.city} onChange={(e) => setV((f) => ({ ...f, city: e.target.value }))} />
      </Field>
      <p className="text-caption text-muted">{tx("ब्रांच कोड (")}{branch.code}{tx(") रसीद नंबरों में आता है, इसलिए बदला नहीं जा सकता।")}</p>
    </form>
  );
}

function SettingsShell({
  open,
  onClose,
  busy,
  formId,
  title,
  description,
  children,
}: {
  open: boolean;
  onClose: () => void;
  busy: boolean;
  formId: string;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      dismissible={!busy}
      title={title}
      description={description}
      footer={
        <>
          <Button onClick={onClose} disabled={busy}>
            {tx("रद्द करें")}
          </Button>
          <Button variant="primary" type="submit" form={formId} loading={busy}>
            {tx("सेव करें")}
          </Button>
        </>
      }
    >
      {children}
    </Modal>
  );
}

function ErrorLine({ error }: { error: unknown }) {
  if (!(error instanceof ApiError)) return null;
  return (
    <p role="alert" className="rounded-control border border-danger bg-danger-subtle p-3 text-label text-danger">
      {error.message}
    </p>
  );
}
