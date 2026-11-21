import { useEffect, useState, type FormEvent } from "react";
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { KeyRound, Lock, Pencil, Search, Unlock, UserPlus, Users } from "lucide-react";
import {
  MIN_PASSWORD_LENGTH,
  ROLES,
  assignableRoles,
  type Branch,
  type Page,
  type Role,
  type User,
} from "@edusuite/shared";
import { useSession, useSignedInUser } from "../api/session.tsx";
import { ApiError } from "../api/client.ts";
import {
  Button,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  Field,
  Input,
  Modal,
  PageHeader,
  Select,
  Skeleton,
  Table,
  TBody,
  TD,
  TH,
  THead,
  TR,
  useToast,
} from "./ui/index.ts";

const ROLE_LABEL: Record<Role, string> = {
  superadmin: "सुपर एडमिन",
  branch_admin: "ब्रांच एडमिन",
  teacher: "शिक्षक",
  typist: "DTP / टाइपिस्ट",
  counselor: "काउंसलर",
};

const FIELD_LABEL: Record<string, string> = {
  email: "ईमेल",
  employeeCode: "कर्मचारी ID",
  phone: "मोबाइल नंबर",
};

/** Turns an API error into per-field messages (409 ALREADY_EXISTS, 400 VALIDATION_FAILED). */
function fieldErrors(err: unknown): Record<string, string> {
  if (!(err instanceof ApiError)) return {};
  const details = err.details as { field?: string; fields?: Array<{ path: string }> } | undefined;
  if (err.code === "ALREADY_EXISTS" && details?.field) {
    return { [details.field]: `यह ${FIELD_LABEL[details.field] ?? details.field} पहले से किसी और के नाम दर्ज है।` };
  }
  if (err.code === "VALIDATION_FAILED" && details?.fields) {
    return Object.fromEntries(details.fields.map((f) => [f.path, "यह जानकारी सही नहीं है।"]));
  }
  return {};
}

function useDebounced<T>(value: T, ms: number): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setV(value), ms);
    return () => clearTimeout(timer);
  }, [value, ms]);
  return v;
}

/**
 * Staff accounts (Phase 2, DN-009, DN-034). Talks only to /users and the
 * institute's branch list; the server enforces every rule, the screen only
 * hides what the role can't do.
 */
export default function UserManagement() {
  const me = useSignedInUser();
  const { client } = useSession();
  const queryClient = useQueryClient();
  const toast = useToast();

  const [search, setSearch] = useState("");
  const [role, setRole] = useState<Role | "">("");
  const [status, setStatus] = useState<"" | "active" | "blocked">("");
  const q = useDebounced(search.trim(), 300);

  const [editing, setEditing] = useState<User | "new" | null>(null);
  const [blocking, setBlocking] = useState<User | null>(null);
  const [resetting, setResetting] = useState<User | null>(null);

  const params = new URLSearchParams({ limit: "25", ...(q && { q }), ...(role && { role }), ...(status && { status }) });
  const users = useInfiniteQuery({
    queryKey: ["users", q, role, status],
    queryFn: ({ pageParam }) =>
      client.get<Page<User>>(`/users?${params}${pageParam ? `&cursor=${encodeURIComponent(pageParam)}` : ""}`),
    initialPageParam: "",
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });

  const branches = useQuery({
    queryKey: ["branches", me.institute.id],
    queryFn: () => client.get<Branch[]>(`/institutes/${me.institute.id}/branches`),
  });
  const branchName = (id: string) => branches.data?.find((b) => b.id === id)?.name ?? "—";

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["users"] });

  const blockMutation = useMutation({
    mutationFn: (u: User) => client.post<User>(`/users/${u.id}/${u.status === "active" ? "block" : "unblock"}`),
    onSuccess: (u) => {
      toast.show({ tone: "success", title: u.status === "blocked" ? `${u.displayName} ब्लॉक किए गए` : `${u.displayName} फिर से सक्रिय` });
      setBlocking(null);
      void refresh();
    },
    onError: (err) => {
      setBlocking(null);
      toast.show({ tone: "error", title: "बदलाव नहीं हुआ", description: err instanceof ApiError ? err.message : undefined });
    },
  });

  const items = users.data?.pages.flatMap((p) => p.items) ?? [];

  return (
    <div className="space-y-6 text-ink">
      <PageHeader
        icon={<Users className="size-6" />}
        title="यूजर व स्टाफ प्रबंधन"
        badge={me.role === "superadmin" ? "पूरा संस्थान" : me.branch.name}
        description="शिक्षकों, DTP टाइपिस्ट और काउंसलर्स के खाते बनाएँ, बदलें, ब्लॉक करें या पासवर्ड रीसेट करें। खाते हटाए नहीं जाते, ब्लॉक किए जाते हैं।"
        actions={
          <Button variant="primary" icon={<UserPlus className="size-4" />} onClick={() => setEditing("new")}>
            नया यूजर जोड़ें
          </Button>
        }
      />

      <div className="flex flex-col gap-3 rounded-card border border-line bg-surface p-4 md:flex-row md:items-end">
        <Field label="खोजें" className="md:flex-1">
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" aria-hidden="true" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="नाम, ईमेल या कर्मचारी ID" className="pl-9" type="search" />
          </div>
        </Field>
        <Field label="भूमिका" className="md:w-48">
          <Select value={role} onChange={(e) => setRole(e.target.value as Role | "")}>
            <option value="">सभी भूमिकाएँ</option>
            {assignableRoles(me.role).map((r) => (
              <option key={r} value={r}>
                {ROLE_LABEL[r]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="स्थिति" className="md:w-40">
          <Select value={status} onChange={(e) => setStatus(e.target.value as "" | "active" | "blocked")}>
            <option value="">सभी</option>
            <option value="active">सक्रिय</option>
            <option value="blocked">ब्लॉक</option>
          </Select>
        </Field>
      </div>

      {users.isPending ? (
        <div className="rounded-card border border-line bg-surface p-6">
          <Skeleton lines={5} label="यूजर्स लोड हो रहे हैं…" />
        </div>
      ) : users.isError ? (
        <ErrorState
          title="यूजर सूची लोड नहीं हुई"
          message={users.error instanceof ApiError ? users.error.message : undefined}
          code={users.error instanceof ApiError ? users.error.code : undefined}
          onRetry={() => void users.refetch()}
        />
      ) : items.length === 0 ? (
        <div className="rounded-card border border-line bg-surface">
          <EmptyState
            title={q || role || status ? "कोई यूजर नहीं मिला" : "अभी कोई यूजर नहीं"}
            description={q || role || status ? "खोज या फ़िल्टर बदलकर देखें।" : "पहला स्टाफ खाता बनाएँ।"}
            action={
              !(q || role || status) && (
                <Button variant="primary" onClick={() => setEditing("new")}>
                  नया यूजर जोड़ें
                </Button>
              )
            }
          />
        </div>
      ) : (
        <>
          <Table caption="स्टाफ खाते">
            <THead>
              <TR>
                <TH>नाम</TH>
                <TH>भूमिका</TH>
                <TH>लॉगिन ID</TH>
                <TH>ब्रांच</TH>
                <TH>स्थिति</TH>
                <TH className="text-right">कार्रवाई</TH>
              </TR>
            </THead>
            <TBody>
              {items.map((u) => {
                const isMe = u.id === me.id;
                return (
                  <TR key={u.id}>
                    <TD>
                      <div className="font-semibold">{u.displayName}</div>
                      <div className="text-caption text-muted">{u.fullName}</div>
                    </TD>
                    <TD>{ROLE_LABEL[u.role]}</TD>
                    <TD>
                      <div className="font-medium">{u.employeeCode}</div>
                      <div className="text-caption text-muted">{u.email}</div>
                      {u.phone && <div className="text-caption text-muted">{u.phone}</div>}
                    </TD>
                    <TD>{branchName(u.branchId)}</TD>
                    <TD>
                      {/* Text, not colour alone, so it survives Windows contrast themes. */}
                      <span className={u.status === "active" ? "font-semibold text-success" : "font-semibold text-danger"}>
                        {u.status === "active" ? "सक्रिय" : "ब्लॉक"}
                      </span>
                      {u.lockedUntil && <div className="text-caption text-warning">गलत प्रयासों के कारण अस्थायी रूप से लॉक</div>}
                    </TD>
                    <TD>
                      <div className="flex justify-end gap-1">
                        <Button size="sm" variant="ghost" icon={<Pencil className="size-4" />} onClick={() => setEditing(u)} aria-label={`${u.displayName}: बदलें`}>
                          बदलें
                        </Button>
                        <Button size="sm" variant="ghost" icon={<KeyRound className="size-4" />} onClick={() => setResetting(u)} aria-label={`${u.displayName}: पासवर्ड रीसेट`}>
                          पासवर्ड
                        </Button>
                        {!isMe && (
                          <Button
                            size="sm"
                            variant="ghost"
                            icon={u.status === "active" ? <Lock className="size-4" /> : <Unlock className="size-4" />}
                            onClick={() => setBlocking(u)}
                            aria-label={`${u.displayName}: ${u.status === "active" ? "ब्लॉक करें" : "सक्रिय करें"}`}
                          >
                            {u.status === "active" ? "ब्लॉक" : "सक्रिय करें"}
                          </Button>
                        )}
                      </div>
                    </TD>
                  </TR>
                );
              })}
            </TBody>
          </Table>
          {users.hasNextPage && (
            <div className="flex justify-center">
              <Button onClick={() => void users.fetchNextPage()} loading={users.isFetchingNextPage}>
                और दिखाएँ
              </Button>
            </div>
          )}
        </>
      )}

      {editing && (
        <UserForm
          user={editing === "new" ? null : editing}
          branches={branches.data ?? []}
          onClose={() => setEditing(null)}
          onSaved={(u, created) => {
            setEditing(null);
            toast.show({ tone: "success", title: created ? `${u.displayName} का खाता बन गया` : "बदलाव सेव हो गए" });
            void refresh();
          }}
        />
      )}
      {resetting && <ResetPasswordDialog user={resetting} onClose={() => setResetting(null)} />}
      <ConfirmDialog
        open={blocking !== null}
        title={blocking?.status === "active" ? `${blocking.displayName} को ब्लॉक करें?` : `${blocking?.displayName ?? ""} को फिर से सक्रिय करें?`}
        message={
          blocking?.status === "active"
            ? "वे तुरंत लॉग-आउट हो जाएँगे और दोबारा लॉगिन नहीं कर पाएँगे, जब तक आप उन्हें फिर से सक्रिय न करें।"
            : "वे फिर से लॉगिन कर पाएँगे।"
        }
        confirmLabel={blocking?.status === "active" ? "हाँ, ब्लॉक करें" : "हाँ, सक्रिय करें"}
        tone={blocking?.status === "active" ? "danger" : "default"}
        busy={blockMutation.isPending}
        onCancel={() => setBlocking(null)}
        onConfirm={() => blocking && blockMutation.mutate(blocking)}
      />
    </div>
  );
}

function UserForm({
  user,
  branches,
  onClose,
  onSaved,
}: {
  user: User | null;
  branches: Branch[];
  onClose: () => void;
  onSaved: (user: User, created: boolean) => void;
}) {
  const me = useSignedInUser();
  const { client } = useSession();
  const isMe = user?.id === me.id;
  const roles = assignableRoles(me.role);
  // A branch admin creates users only in the branch they're working at.
  const branchChoices = me.role === "superadmin" ? branches : branches.filter((b) => b.id === me.branch.id);

  const [form, setForm] = useState({
    employeeCode: user?.employeeCode ?? "",
    displayName: user?.displayName ?? "",
    fullName: user?.fullName ?? "",
    email: user?.email ?? "",
    phone: user?.phone?.replace(/^\+91/, "") ?? "",
    role: (user?.role ?? roles[roles.length - 1] ?? "teacher") as Role,
    branchId: user?.branchId ?? me.branch.id,
    password: "",
  });
  const set = (key: keyof typeof form) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const save = useMutation({
    mutationFn: () => {
      const common = {
        displayName: form.displayName,
        fullName: form.fullName,
        email: form.email,
        branchId: form.branchId,
        ...(!isMe && { role: form.role }),
      };
      return user
        ? client.patch<User>(`/users/${user.id}`, { ...common, phone: form.phone.trim() ? form.phone : null })
        : client.post<User>("/users", {
            ...common,
            employeeCode: form.employeeCode,
            password: form.password,
            ...(form.phone.trim() && { phone: form.phone }),
          });
    },
    onSuccess: (u) => onSaved(u, !user),
  });
  const errors = fieldErrors(save.error);
  const general = save.error instanceof ApiError && Object.keys(errors).length === 0 ? save.error.message : "";

  const submit = (e: FormEvent) => {
    e.preventDefault();
    save.mutate();
  };

  const formId = "user-form";
  return (
    <Modal
      open
      onClose={onClose}
      dismissible={!save.isPending}
      title={user ? `${user.displayName}: विवरण बदलें` : "नया यूजर जोड़ें"}
      size="lg"
      footer={
        <>
          <Button onClick={onClose} disabled={save.isPending}>
            रद्द करें
          </Button>
          <Button variant="primary" type="submit" form={formId} loading={save.isPending}>
            {user ? "बदलाव सेव करें" : "खाता बनाएँ"}
          </Button>
        </>
      }
    >
      <form id={formId} onSubmit={submit} className="grid grid-cols-1 gap-4 md:grid-cols-2" noValidate>
        {general && (
          <p role="alert" className="md:col-span-2 rounded-control border border-danger bg-danger-subtle p-3 text-label text-danger">
            {general}
          </p>
        )}
        <Field label="कर्मचारी ID" hint={user ? "ID बाद में बदली नहीं जा सकती" : "उदा. IND-T-12"} error={errors.employeeCode} required>
          <Input value={form.employeeCode} onChange={set("employeeCode")} disabled={Boolean(user)} autoComplete="off" />
        </Field>
        <Field label="छोटा नाम" hint="ऐप में यही नाम दिखेगा" error={errors.displayName} required>
          <Input value={form.displayName} onChange={set("displayName")} />
        </Field>
        <Field label="पूरा नाम" error={errors.fullName} required className="md:col-span-2">
          <Input value={form.fullName} onChange={set("fullName")} />
        </Field>
        <Field label="ईमेल" error={errors.email} required>
          <Input type="email" value={form.email} onChange={set("email")} autoComplete="off" />
        </Field>
        <Field label="मोबाइल नंबर" hint="10 अंक (वैकल्पिक)" error={errors.phone}>
          <Input inputMode="numeric" value={form.phone} onChange={set("phone")} />
        </Field>
        <Field label="भूमिका" hint={isMe ? "आप अपनी भूमिका खुद नहीं बदल सकते" : undefined} error={errors.role} required>
          <Select value={form.role} onChange={set("role")} disabled={isMe}>
            {(isMe ? ROLES.filter((r) => r === form.role) : roles).map((r) => (
              <option key={r} value={r}>
                {ROLE_LABEL[r]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="ब्रांच" error={errors.branchId} required>
          <Select value={form.branchId} onChange={set("branchId")} disabled={branchChoices.length <= 1}>
            {branchChoices.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </Select>
        </Field>
        {!user && (
          <Field label="पासवर्ड" hint={`कम से कम ${MIN_PASSWORD_LENGTH} अक्षर। यूजर को सुरक्षित तरीके से बताएँ।`} error={errors.password} required className="md:col-span-2">
            <Input type="password" value={form.password} onChange={set("password")} autoComplete="new-password" />
          </Field>
        )}
      </form>
    </Modal>
  );
}

function ResetPasswordDialog({ user, onClose }: { user: User; onClose: () => void }) {
  const { client } = useSession();
  const toast = useToast();
  const [password, setPassword] = useState("");
  const tooShort = password.length > 0 && password.length < MIN_PASSWORD_LENGTH;
  const reset = useMutation({
    mutationFn: () => client.post<void>(`/users/${user.id}/reset-password`, { password }),
    onSuccess: () => {
      toast.show({ tone: "success", title: `${user.displayName} का पासवर्ड बदल गया`, description: "वे सभी डिवाइस से लॉग-आउट हो गए हैं।" });
      onClose();
    },
  });
  const formId = "reset-form";
  return (
    <Modal
      open
      onClose={onClose}
      dismissible={!reset.isPending}
      title={`${user.displayName}: नया पासवर्ड`}
      description="पुराना पासवर्ड तुरंत बंद हो जाएगा और यूजर हर डिवाइस से लॉग-आउट हो जाएँगे।"
      size="sm"
      footer={
        <>
          <Button onClick={onClose} disabled={reset.isPending}>
            रद्द करें
          </Button>
          <Button variant="primary" type="submit" form={formId} loading={reset.isPending} disabled={password.length < MIN_PASSWORD_LENGTH}>
            पासवर्ड बदलें
          </Button>
        </>
      }
    >
      <form
        id={formId}
        onSubmit={(e) => {
          e.preventDefault();
          reset.mutate();
        }}
      >
        <Field
          label="नया पासवर्ड"
          hint={`कम से कम ${MIN_PASSWORD_LENGTH} अक्षर`}
          error={tooShort ? `कम से कम ${MIN_PASSWORD_LENGTH} अक्षर चाहिए` : reset.error instanceof ApiError ? reset.error.message : undefined}
          required
        >
          <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" autoFocus />
        </Field>
      </form>
    </Modal>
  );
}
