import { z } from "zod";

export const RegisterSchema = z.object({
    firstname: z.string().min(2, "Name must be at least 2 characters").trim(),
    lastname: z.string().min(2, "Name must be at least 2 characters").trim(),
    email: z.string().trim().email("Invalid email address"),
    number: z.string().min(10, "Phone number must be 10 character").max(10, "Phone number must be 10 character"),
    password: z.string().min(8, "Password must be at least 8 characters long"),
    confirmPassword: z.string().min(1, "Please confirm your password"),
}).refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"], // Sets the error to the confirmPassword field
});

export type RegisterValues = z.infer<typeof RegisterSchema>;