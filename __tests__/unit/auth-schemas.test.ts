import { LoginSchema } from "@/app/lib/validations/login-auth";
import { RegisterSchema } from "@/app/lib/validations/register-auth";

describe("auth schemas unit", () => {
  it("LoginSchema accepts valid payload", () => {
    const parsed = LoginSchema.safeParse({
      email: "john@example.com",
      password: "Password123!",
    });

    expect(parsed.success).toBe(true);
  });

  it("LoginSchema rejects invalid email", () => {
    const parsed = LoginSchema.safeParse({
      email: "not-an-email",
      password: "Password123!",
    });

    expect(parsed.success).toBe(false);
  });

  it("RegisterSchema accepts valid payload", () => {
    const parsed = RegisterSchema.safeParse({
      firstname: "John",
      lastname: "Doe",
      email: "john@example.com",
      number: "1234567890",
      password: "Password123!",
      confirmPassword: "Password123!",
    });

    expect(parsed.success).toBe(true);
  });

  it("RegisterSchema rejects password mismatch", () => {
    const parsed = RegisterSchema.safeParse({
      firstname: "John",
      lastname: "Doe",
      email: "john@example.com",
      number: "1234567890",
      password: "Password123!",
      confirmPassword: "Different123!",
    });

    expect(parsed.success).toBe(false);
  });
});
