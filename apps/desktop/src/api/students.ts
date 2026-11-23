import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  IDEMPOTENCY_HEADER,
  type FeeReceipt,
  type FeeReceiptCreate,
  type Page,
  type Student,
  type StudentCreate,
  type StudentUpdate,
} from "@edusuite/shared";
import { useSession } from "./session.tsx";

/** Students, fees and receipts (Phase 5, DN-061). */
export function useStudents(q: string, status: "active" | "left" | "") {
  const { client } = useSession();
  return useInfiniteQuery({
    queryKey: ["students", "list", q, status],
    initialPageParam: "",
    queryFn: ({ pageParam }) => {
      const params = new URLSearchParams({ limit: "30" });
      if (q.trim()) params.set("q", q.trim());
      if (status) params.set("status", status);
      if (pageParam) params.set("cursor", pageParam);
      return client.get<Page<Student>>(`/students?${params}`);
    },
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });
}

export function useNextRollNo(enabled: boolean) {
  const { client } = useSession();
  return useQuery({ queryKey: ["students", "next-roll-no"], queryFn: () => client.get<{ rollNo: string }>("/students/next-roll-no"), enabled, staleTime: 0 });
}

export function useSaveStudent() {
  const { client } = useSession();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string | null; body: StudentCreate | StudentUpdate }) =>
      id ? client.patch<Student>(`/students/${id}`, body) : client.post<Student>("/students", body),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["students"] }),
  });
}

export function useReceipts(studentId: string | null) {
  const { client } = useSession();
  return useQuery({
    queryKey: ["receipts", studentId],
    enabled: studentId !== null,
    queryFn: () => client.get<Page<FeeReceipt>>(`/fee-receipts?studentId=${studentId}&limit=100`),
  });
}

/**
 * Issues a receipt. The caller keeps one Idempotency-Key per filled form, so a
 * double click or a retried request never prints two receipts (plan §07).
 */
export function useIssueReceipt() {
  const { client } = useSession();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ body, key }: { body: FeeReceiptCreate; key: string }) => client.post<FeeReceipt>("/fee-receipts", body, { headers: { [IDEMPOTENCY_HEADER]: key } }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["students"] });
      void queryClient.invalidateQueries({ queryKey: ["receipts"] });
    },
  });
}

export function useCancelReceipt() {
  const { client } = useSession();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => client.post<FeeReceipt>(`/fee-receipts/${id}/cancel`, { reason }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["students"] });
      void queryClient.invalidateQueries({ queryKey: ["receipts"] });
    },
  });
}
