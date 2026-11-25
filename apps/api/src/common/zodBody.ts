import type { PipeTransform } from "@nestjs/common";
import type { ZodType } from "zod";
import { ApiHttpException } from "./errors";

/**
 * Validates a request body with a shared zod schema. On failure returns
 * 400 VALIDATION_FAILED with the failing field paths and rule codes only,
 * never the submitted values (they may be passwords).
 */
export class ZodBody<T> implements PipeTransform<unknown, T> {
  /** Public so the OpenAPI document can describe what the route accepts (DN-067). */
  constructor(readonly schema: ZodType<T>) {}

  transform(value: unknown): T {
    const result = this.schema.safeParse(value);
    if (result.success) return result.data;
    const fields = result.error.issues.map((i) => ({ path: i.path.join("."), rule: i.code }));
    throw new ApiHttpException(400, "VALIDATION_FAILED", { fields });
  }
}
