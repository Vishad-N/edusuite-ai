import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import type { BankQuestion, Page, QuestionBulkResult, QuestionInput, QuestionSubjects } from "@edusuite/shared";
import { useSession } from "./session.tsx";
import type { ApiClient } from "./client.ts";

/** The institute's question bank (DN-074). */
export type BankFilter = { q: string; subject: string; mine: boolean };

export function useBankQuestions(filter: BankFilter, enabled = true) {
  const { client } = useSession();
  return useInfiniteQuery({
    queryKey: ["questions", filter],
    enabled,
    initialPageParam: "",
    queryFn: ({ pageParam }) => {
      const params = new URLSearchParams({ limit: "25" });
      if (filter.q.trim()) params.set("q", filter.q.trim());
      if (filter.subject) params.set("subject", filter.subject);
      if (filter.mine) params.set("mine", "true");
      if (pageParam) params.set("cursor", pageParam);
      return client.get<Page<BankQuestion>>(`/questions?${params}`);
    },
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });
}

export function useBankSubjects(enabled = true) {
  const { client } = useSession();
  return useQuery({ queryKey: ["questions", "subjects"], enabled, queryFn: () => client.get<QuestionSubjects>("/questions/subjects") });
}

export function addToBank(client: ApiClient, questions: QuestionInput[]): Promise<QuestionBulkResult> {
  return client.post<QuestionBulkResult>("/questions/bulk", { questions });
}
