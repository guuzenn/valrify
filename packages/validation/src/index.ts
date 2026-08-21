import { z } from "zod";
import { identifierTypes } from "@vlrfy/domain";

export const registerSchema = z.object({
  email: z.email(),
  password: z.string().min(10).max(128),
  displayName: z.string().trim().min(2).max(80),
});

export const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(1).max(128),
});

const reportIdentifierSchema = z.object({
  type: z.enum(identifierTypes),
  value: z.string().trim().min(2).max(160),
  provider: z.string().trim().max(40).optional(),
});

const reportIdentifiersSchema = z.preprocess((value) => {
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}, z.array(reportIdentifierSchema).min(1).max(8));

export const reportSchema = z.object({
  entityName: z.string().trim().min(2).max(80),
  title: z.string().trim().min(8).max(120),
  chronology: z.string().trim().min(80).max(5000),
  identifiers: reportIdentifiersSchema.optional(),
  identifierType: z.enum(identifierTypes).optional(),
  identifierValue: z.string().trim().min(2).max(160).optional(),
  provider: z.string().trim().max(40).optional(),
  transactionDate: z.string().optional(),
  allegedLoss: z.coerce.number().int().min(0).max(1_000_000_000),
  transactionType: z.enum([
    "ACCOUNT_PURCHASE",
    "ACCOUNT_SALE",
    "ACCOUNT_TRADE",
    "MIDDLEMAN",
  ]),
}).superRefine((value, context) => {
  if (!value.identifiers && (!value.identifierType || !value.identifierValue)) {
    context.addIssue({
      code: "custom",
      path: ["identifiers"],
      message: "Minimal satu nomor atau akun wajib diisi.",
    });
  }
}).transform(({ identifierType, identifierValue, provider, ...value }) => ({
  ...value,
  identifiers: value.identifiers ?? [{
    type: identifierType!,
    value: identifierValue!,
    provider,
  }],
}));

export const reviewSchema = z.object({
  decision: z.enum(["PUBLISH", "REJECT"]),
  summary: z.string().trim().max(2000),
  rationale: z.string().trim().min(10).max(2000),
}).superRefine((value, context) => {
  if (value.decision === "PUBLISH" && value.summary.length < 30) {
    context.addIssue({
      code: "custom",
      path: ["summary"],
      message: "Ringkasan publik minimal 30 karakter.",
    });
  }
});

export const confirmationSchema = z.object({
  entityId: z.coerce.number().int().positive(),
  transactionDate: z.iso.date(),
  amount: z.coerce.number().int().min(0).max(1_000_000_000),
  note: z.string().trim().min(10).max(500),
});

export const confirmationReviewSchema = z.object({
  decision: z.enum(["APPROVE", "REJECT"]),
  rationale: z.string().trim().min(10).max(1000),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ReportInput = z.infer<typeof reportSchema>;
export type ReviewInput = z.infer<typeof reviewSchema>;
export type ConfirmationInput = z.infer<typeof confirmationSchema>;
export type ConfirmationReviewInput = z.infer<typeof confirmationReviewSchema>;
