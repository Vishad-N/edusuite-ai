import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  AiJobType,
  CreditBalance,
  CreditEntry,
  CreditGrant,
  CreditPrice,
  CreditPriceUpdate,
  Page,
  PlatformInstitute,
} from "@edusuite/shared";
import { useSession } from "./session.tsx";
import { tx } from "../i18n/index.ts";

/** The signed-in institute's credit balance and prices (DN-053). */
export function useCredits(enabled = true) {
  const { client } = useSession();
  return useQuery({ queryKey: ["credits"], queryFn: () => client.get<CreditBalance>("/credits"), enabled });
}

// ---------- EduSuite operator ----------

export function usePlatformInstitutes() {
  const { client } = useSession();
  return useQuery({ queryKey: ["platform", "institutes"], queryFn: () => client.get<PlatformInstitute[]>("/platform/institutes") });
}

export function usePlatformLedger(instituteId: string | null) {
  const { client } = useSession();
  return useInfiniteQuery({
    queryKey: ["platform", "ledger", instituteId],
    enabled: instituteId !== null,
    initialPageParam: "",
    queryFn: ({ pageParam }) => {
      const params = new URLSearchParams({ limit: "25" });
      if (pageParam) params.set("cursor", pageParam);
      return client.get<Page<CreditEntry>>(`/platform/institutes/${instituteId}/credits?${params}`);
    },
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });
}

export function useGrantCredits() {
  const { client } = useSession();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ instituteId, ...body }: CreditGrant & { instituteId: string }) =>
      client.post<CreditEntry>(`/platform/institutes/${instituteId}/credits`, body),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["platform"] }),
  });
}

export function usePlatformPrices() {
  const { client } = useSession();
  return useQuery({ queryKey: ["platform", "prices"], queryFn: () => client.get<CreditPrice[]>("/platform/credit-prices") });
}

export function useSetPrice() {
  const { client } = useSession();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ jobType, ...body }: CreditPriceUpdate & { jobType: AiJobType }) =>
      client.put<CreditPrice>(`/platform/credit-prices/${jobType}`, body),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["platform", "prices"] }),
  });
}

/** Names of AI job types, for prices and history; getters so they follow the UI language (DN-064). */
export const JOB_TYPE_LABELS: Record<AiJobType, string> = {
  get ppt_outline() { return tx("लेक्चर PPT ढाँचा"); },
  get paper_generate() { return tx("टेस्ट पेपर"); },
  get mcq_extract() { return tx("स्क्रीनशॉट से MCQ (प्रति स्क्रीनशॉट)"); },
  get dpp_generate() { return "DPP"; },
  get lesson_plan() { return tx("लेसन प्लान"); },
  get doubt_solve() { return tx("डाउट हल"); },
  get youtube_meta() { return tx("YouTube टाइटल व विवरण"); },
  get notice_draft() { return tx("नोटिस"); },
  get book_chapter() { return tx("किताब अध्याय"); },
  get poster_copy() { return tx("पोस्टर टेक्स्ट"); },
  get deck_quiz() { return tx("PDF डेक से इंटरैक्टिव क्विज़"); },
};
