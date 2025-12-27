import LoginForm from "@/app/(auth)/_components/login-form";
import { z } from "zod";

export const LoginSchema = z.object({
    email: z.string().trim().email("Invalid email address"),
    password: z.string().min(8, "password must be 8 characters long")
});

export type LoginForm = z.infer<typeof LoginForm>;