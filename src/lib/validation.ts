import { z } from "zod";

export const emailSchema = z.string().trim().min(1, "Email is required").email("Enter a valid email");

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Password is required"),
  remember: z.boolean().default(true),
});
export type LoginValues = z.infer<typeof loginSchema>;

export const registerSchema = z
  .object({
    fullName: z.string().trim().min(2, "Enter your full name").max(80, "Name is too long"),
    email: emailSchema,
    password: z.string().min(8, "Password must be at least 8 characters").max(72, "Password is too long"),
    confirmPassword: z.string().min(1, "Confirm your password"),
  })
  .refine((v) => v.password === v.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match",
  });
export type RegisterValues = z.infer<typeof registerSchema>;

export const forgotPasswordSchema = z.object({ email: emailSchema });
export type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z
  .object({
    password: z.string().min(8, "Password must be at least 8 characters").max(72),
    confirmPassword: z.string().min(1, "Confirm your password"),
  })
  .refine((v) => v.password === v.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match",
  });
export type ResetPasswordValues = z.infer<typeof resetPasswordSchema>;

export const ruleSchema = z.object({
  keyword: z.string().trim().min(1, "Keyword is required").max(100, "Keyword is too long"),
  match_type: z.enum(["contains", "exact", "starts_with", "ends_with"]),
  reply_message: z.string().trim().min(1, "Reply message is required").max(1000, "Reply is too long"),
  case_sensitive: z.boolean(),
  cooldown_minutes: z.coerce.number().int("Whole minutes only").min(0, "Cannot be negative").max(10080, "Max 7 days"),
  is_active: z.boolean(),
});
export type RuleValues = z.infer<typeof ruleSchema>;

export const profileSchema = z.object({
  full_name: z.string().trim().min(2, "Enter your full name").max(80, "Name is too long"),
});
export type ProfileValues = z.infer<typeof profileSchema>;

export const simulateCommentSchema = z.object({
  username: z
    .string()
    .trim()
    .min(1, "Username is required")
    .max(30)
    .regex(/^[a-zA-Z0-9._]+$/, "Letters, numbers, dots and underscores only"),
  comment_text: z.string().trim().min(1, "Comment is required").max(2200, "Comment is too long"),
});
export type SimulateCommentValues = z.infer<typeof simulateCommentSchema>;
