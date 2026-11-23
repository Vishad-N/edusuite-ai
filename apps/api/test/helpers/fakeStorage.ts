import type { Storage } from "../../src/files/storage";

/** In-memory stand-in for Garage, so file rules can be tested without a storage server. */
export class FakeStorage implements Storage {
  readonly configured = true;
  readonly objects = new Map<string, Uint8Array>();
  readonly signed: Array<{ op: "put" | "get"; key: string; mime?: string; bytes?: number }> = [];

  async presignPut(key: string, mime: string, bytes: number): Promise<string> {
    this.signed.push({ op: "put", key, mime, bytes });
    return `http://fake-storage.test/put/${encodeURIComponent(key)}`;
  }

  async presignGet(key: string): Promise<string> {
    this.signed.push({ op: "get", key });
    return `http://fake-storage.test/get/${encodeURIComponent(key)}`;
  }

  async size(key: string): Promise<number | null> {
    return this.objects.get(key)?.byteLength ?? null;
  }

  async readHead(key: string, n: number): Promise<Uint8Array> {
    return (this.objects.get(key) ?? new Uint8Array()).slice(0, n);
  }

  async read(key: string): Promise<Uint8Array> {
    const o = this.objects.get(key);
    if (!o) throw new Error("NoSuchKey");
    return o;
  }

  async delete(key: string): Promise<void> {
    this.objects.delete(key);
  }

  /** What the desktop app's PUT to the presigned link would do. */
  upload(key: string, data: Uint8Array): void {
    this.objects.set(key, data);
  }
}

export const PNG_BYTES = (size = 64): Uint8Array => {
  const b = new Uint8Array(size);
  b.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  return b;
};
