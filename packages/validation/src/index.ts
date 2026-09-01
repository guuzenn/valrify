import { z } from "zod";
import { identifierTypes, reportCategories } from "@valrify/domain";

export const registerSchema = z.object({
  email: z.email(),
  password: z.string().min(10).max(128),
  displayName: z.string().trim().min(2).max(80),
});

export const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(1).max(128),
});

const reservedUsernames = new Set(["admin", "administrator", "moderator", "support", "valrify"]);
export const publicProfileSchema = z.object({
  username: z.string().trim().toLowerCase().min(3, "Username minimal 3 karakter.").max(24, "Username maksimal 24 karakter.").regex(/^[a-z0-9_]+$/, "Gunakan huruf kecil, angka, atau underscore.").refine((value) => !reservedUsernames.has(value), "Username ini tidak dapat digunakan."),
  bio: z.string().trim().max(160, "Bio maksimal 160 karakter."),
});

export const communityPostSchema = z.object({
  body: z.string().trim().min(3, "Post minimal 3 karakter.").max(1000, "Post maksimal 1.000 karakter."),
});

export const communityCommentSchema = z.object({
  body: z.string().trim().min(2, "Komentar minimal 2 karakter.").max(500, "Komentar maksimal 500 karakter."),
  replyToCommentId: z.number().int().positive().nullable().optional(),
});

export const communityPostReportSchema = z.object({
  reason: z.enum(["SPAM", "HARASSMENT", "PERSONAL_DATA", "SCAM_ACCUSATION", "OTHER"]),
  detail: z.string().trim().min(10, "Jelaskan masalahnya minimal 10 karakter.").max(500, "Penjelasan maksimal 500 karakter."),
});

export const communityPostReviewSchema = z.object({
  decision: z.enum(["DISMISS", "REMOVE"]),
  rationale: z.string().trim().min(10, "Alasan keputusan minimal 10 karakter.").max(500, "Alasan keputusan maksimal 500 karakter."),
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
  chronology: z.string().trim().min(80).max(5000),
  evidenceUrl: z.preprocess(
    (value) => value === "" ? undefined : value,
    z.url().max(500).refine((value) => value.startsWith("https://") || value.startsWith("http://"), "Link bukti harus menggunakan http atau https.").optional(),
  ),
  identifiers: reportIdentifiersSchema.optional(),
  identifierType: z.enum(identifierTypes).optional(),
  identifierValue: z.string().trim().min(2).max(160).optional(),
  provider: z.string().trim().max(40).optional(),
  transactionDate: z.string().optional(),
  category: z.enum(reportCategories),
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
  publicEvidenceIds: z.array(z.number().int().positive()).max(5).default([]),
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

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type PublicProfileInput = z.infer<typeof publicProfileSchema>;
export type CommunityPostInput = z.infer<typeof communityPostSchema>;
export type CommunityCommentInput = z.infer<typeof communityCommentSchema>;
export type CommunityPostReportInput = z.infer<typeof communityPostReportSchema>;
export type CommunityPostReviewInput = z.infer<typeof communityPostReviewSchema>;
export type ReportInput = z.infer<typeof reportSchema>;
export type ReviewInput = z.infer<typeof reviewSchema>;
export type ConfirmationInput = z.infer<typeof confirmationSchema>;
