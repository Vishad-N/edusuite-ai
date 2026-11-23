import { useQuery } from "@tanstack/react-query";
import type { DashboardStats } from "@edusuite/shared";
import { useSession } from "./session.tsx";

/** Counts and recent documents for the Dashboard and TeacherDesk (GET /stats/dashboard, DN-051). */
export function useDashboardStats() {
  const { client } = useSession();
  return useQuery({
    queryKey: ["stats", "dashboard"],
    queryFn: () => client.get<DashboardStats>("/stats/dashboard"),
  });
}
