import { z } from "zod";

export const RegisterSchema = z.object({
    name: z
    .string()
    .min(2, "Name must be at least 3 characters")
    .max(50, "Name is too long")
    .trim(),

    email: z
    .string()
    .trim()
    .email("Invalid email address")
    .lowercase(),

    password: z
    .string()
    .min(8, "Password must be at least 8 characters long")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),

    confirmPassword: z
    .string()
    .min(1, "Please confirm your password"),

}).refine((data) => data.password === data.confirmPassword, {
    message: "Password do not match",
    path: ["Confirm password"],

});

export type RegisterForm = z.infer<typeof RegisterSchema>;
