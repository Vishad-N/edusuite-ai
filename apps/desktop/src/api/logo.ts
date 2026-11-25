import { useQuery } from "@tanstack/react-query";
import { useSession } from "./session.tsx";
import { fileUrl } from "./documents.ts";

export const blobToDataUrl = (blob: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });

/**
 * The institute's uploaded logo as a data URL (DN-071), or undefined while loading or when
 * there is none. A data URL, not the signed link, because the logo is embedded in PPTX,
 * motion files and printouts long after the 5-minute link expires.
 */
export function useInstituteLogo(fileId: string | undefined): string | undefined {
  const { client } = useSession();
  const logo = useQuery({
    queryKey: ["logo", fileId],
    enabled: Boolean(fileId),
    staleTime: Infinity,
    retry: 1,
    queryFn: async () => {
      const { url } = await fileUrl(client, fileId!);
      const res = await fetch(url);
      if (!res.ok) throw new Error(`logo download failed (${res.status})`);
      return blobToDataUrl(await res.blob());
    },
  });
  return fileId ? logo.data : undefined;
}
