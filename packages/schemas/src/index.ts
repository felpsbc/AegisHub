import { z } from "zod";

/* === Auth === */

export const TenantTypeEnum = z.enum(["COMPANY", "INDIVIDUAL"]);
export const DocumentKindEnum = z.enum(["CNPJ", "CPF"]);

export const RegisterSchema = z
  .object({
    tenant_type: TenantTypeEnum,
    full_name: z.string().min(2).max(200),
    email: z.string().email(),
    password: z.string().min(12),
    legal_name: z.string().min(2).max(200),
    document: z.string().min(11).max(20),
    document_kind: DocumentKindEnum,
  })
  .refine(
    (v) =>
      (v.tenant_type === "COMPANY" && v.document_kind === "CNPJ") ||
      (v.tenant_type === "INDIVIDUAL" && v.document_kind === "CPF"),
    { message: "type/document mismatch", path: ["document_kind"] },
  );
export type RegisterInput = z.infer<typeof RegisterSchema>;

export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});
export type LoginInput = z.infer<typeof LoginSchema>;

export const MFASchema = z.object({
  code: z.string().min(6).max(10),
});
export type MFAInput = z.infer<typeof MFASchema>;

/* === Proposal === */

export const BudgetKindEnum = z.enum(["FIXED", "HOURLY", "TBD"]);
export const ProposalVisibilityEnum = z.enum(["PUBLIC", "PRIVATE"]);

export const NewProposalSchema = z.object({
  title: z.string().min(8).max(140),
  description: z.string().min(20),
  scope_md: z.string().min(20),
  budget: z.object({
    kind: BudgetKindEnum,
    amount: z.string().nullable().optional(),
    currency: z.string().default("BRL"),
  }),
  duration_weeks: z.number().int().min(1).max(52).nullable().optional(),
  visibility: ProposalVisibilityEnum.default("PUBLIC"),
  specialties: z.array(z.number().int()).default([]),
});
export type NewProposalInput = z.infer<typeof NewProposalSchema>;

/* === Application === */

export const NewApplicationSchema = z.object({
  cover_message: z.string().min(20),
  proposed_rate: z.string().nullable().optional(),
  proposed_total: z.string().nullable().optional(),
});
export type NewApplicationInput = z.infer<typeof NewApplicationSchema>;

/* === Pentester profile === */

export const AvailabilityEnum = z.enum(["OPEN", "BUSY", "UNAVAILABLE"]);

export const PentesterProfileSchema = z.object({
  headline: z.string().min(8).max(140),
  bio: z.string().optional(),
  hourly_rate: z.string(),
  availability: AvailabilityEnum.default("OPEN"),
  location: z.string().optional(),
  remote_only: z.boolean().default(true),
  specialties: z.array(z.number().int()).default([]),
});
export type PentesterProfileInput = z.infer<typeof PentesterProfileSchema>;
