import { BadRequestException } from "@nestjs/common";
import type { ZodType } from "zod";

export function parseSchema<T>(schema: ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value);
  if (result.success) return result.data;
  throw new BadRequestException(
    result.error.issues.map((issue) => {
      const field = issue.path.length ? `${issue.path.join(".")}: ` : "";
      return `${field}${issue.message}`;
    }),
  );
}
