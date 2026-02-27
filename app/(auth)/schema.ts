import z from "zod";

export const loginSchema = z.object({
    email: z.email({ message: "Enter a valid email" }),
    password: z.string().min(6, { message: "Minimum 6 characters" }),
});

export type LoginData = z.infer<typeof loginSchema>;

export const registerSchema = z.object({
    firstname: z.string().min(2, { message: "Minimum 2 characters" }),
    lastname: z.string().min(2, { message: "Minimum 2 characters" }),
    email: z.string().email({ message: "Enter a valid email" }),
    countryCode: z.string().regex(/^\+\d{1,4}$/, { message: "Select a valid country code" }).default("+1"),
    number: z.string().regex(/^\d{6,14}$/, {
        message: "Phone number must be 6-14 digits",
    }),
    password: z.string().min(6, { message: "Minimum 6 characters" }),
    confirmPassword: z.string().min(6, { message: "Minimum 6 characters" }),
    authProvider: z.string().default("local"),
}).refine((data) => data.password === data.confirmPassword, {
        path: ["confirmPassword"],
        message: "Passwords do not match",
});

export type RegisterData = z.infer<typeof registerSchema>;


