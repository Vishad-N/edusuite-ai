import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { DocumentSummary, DocumentType, FileInfo, FilePresignResponse, FileUrl, Page, SavedDocument } from "@edusuite/shared";
import type { ApiClient } from "./client.ts";
import { useSession } from "./session.tsx";

/** History for one document type (newest first, cursor pages). */
export function useDocumentHistory(type: DocumentType, opts: { q: string; mine: boolean; enabled: boolean }) {
  const { client } = useSession();
  return useInfiniteQuery({
    queryKey: ["documents", type, opts.q, opts.mine],
    enabled: opts.enabled,
    initialPageParam: "",
    queryFn: ({ pageParam }) => {
      const params = new URLSearchParams({ type, limit: "20", ...(opts.q && { q: opts.q }), ...(opts.mine && { mine: "true" }) });
      if (pageParam) params.set("cursor", pageParam);
      return client.get<Page<DocumentSummary>>(`/documents?${params}`);
    },
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });
}

export type SaveInput<T extends DocumentType> = {
  type: T;
  title: string;
  content: SavedDocument<T>["content"];
  /** Present when updating an existing document. */
  id?: string | undefined;
  /** The updatedAt the screen loaded or last saved (compare-and-set, DN-038). */
  expectedUpdatedAt?: string | undefined;
};

/** Creates a new document, or updates one if `id` is set. */
export function useSaveDocument<T extends DocumentType>() {
  const { client } = useSession();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: SaveInput<T>) =>
      input.id
        ? client.patch<SavedDocument<T>>(`/documents/${input.id}`, {
            title: input.title,
            content: input.content,
            expectedUpdatedAt: input.expectedUpdatedAt,
          })
        : client.post<SavedDocument<T>>("/documents", { type: input.type, title: input.title, content: input.content }),
    onSuccess: (doc) => {
      void queryClient.invalidateQueries({ queryKey: ["documents", doc.type] });
      void queryClient.invalidateQueries({ queryKey: ["stats"] });
    },
  });
}

export function useDeleteDocument(type: DocumentType) {
  const { client } = useSession();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => client.delete(`/documents/${id}`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["documents", type] });
      void queryClient.invalidateQueries({ queryKey: ["stats"] });
    },
  });
}

export function fetchDocument<T extends DocumentType>(client: ApiClient, id: string): Promise<SavedDocument<T>> {
  return client.get<SavedDocument<T>>(`/documents/${id}`);
}

/**
 * Uploads one file: presign → PUT straight to storage → complete (the API
 * checks size and file signature, DN-040). Returns the verified file.
 */
export async function uploadFile(client: ApiClient, file: File, fetchImpl: typeof fetch = fetch): Promise<FileInfo> {
  const presign = await client.post<FilePresignResponse>("/files/presign", { name: file.name, mime: file.type, bytes: file.size });
  const put = await fetchImpl(presign.uploadUrl, { method: presign.method, headers: presign.headers, body: file });
  if (!put.ok) throw new Error(`upload failed (${put.status})`);
  return client.post<FileInfo>(`/files/${presign.fileId}/complete`);
}

export function fileUrl(client: ApiClient, id: string): Promise<FileUrl> {
  return client.get<FileUrl>(`/files/${id}/url`);
}
