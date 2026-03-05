import { loginSchema, registerSchema } from "@/app/(auth)/schema";
import { LoginSchema } from "@/app/lib/validations/login-auth";
import { RegisterSchema } from "@/app/lib/validations/register-auth";

describe("auth schemas more unit coverage", () => {
  it("loginSchema accepts valid payload", () => {
    const parsed = loginSchema.safeParse({
      email: "unit@example.com",
      password: "abcdef",
    });
    expect(parsed.success).toBe(true);
  });

  it("loginSchema rejects invalid email", () => {
    const parsed = loginSchema.safeParse({
      email: "wrong",
      password: "abcdef",
    });
    expect(parsed.success).toBe(false);
  });

  it("loginSchema rejects short password", () => {
    const parsed = loginSchema.safeParse({
      email: "unit@example.com",
      password: "12345",
    });
    expect(parsed.success).toBe(false);
  });

  it("registerSchema accepts valid payload", () => {
    const parsed = registerSchema.safeParse({
      firstname: "John",
      lastname: "Doe",
      email: "john@example.com",
      countryCode: "+977",
      number: "9812345678",
      password: "abcdef",
      confirmPassword: "abcdef",
      authProvider: "local",
    });
    expect(parsed.success).toBe(true);
  });

  it("registerSchema applies default country code", () => {
    const parsed = registerSchema.parse({
      firstname: "John",
      lastname: "Doe",
      email: "john@example.com",
      number: "9812345678",
      password: "abcdef",
      confirmPassword: "abcdef",
      authProvider: "local",
    });
    expect(parsed.countryCode).toBe("+1");
  });

  it("registerSchema applies default authProvider", () => {
    const parsed = registerSchema.parse({
      firstname: "John",
      lastname: "Doe",
      email: "john@example.com",
      number: "9812345678",
      password: "abcdef",
      confirmPassword: "abcdef",
    });
    expect(parsed.authProvider).toBe("local");
  });

  it("registerSchema rejects non-digit number", () => {
    const parsed = registerSchema.safeParse({
      firstname: "John",
      lastname: "Doe",
      email: "john@example.com",
      countryCode: "+1",
      number: "98abc",
      password: "abcdef",
      confirmPassword: "abcdef",
    });
    expect(parsed.success).toBe(false);
  });

  it("registerSchema rejects invalid country code", () => {
    const parsed = registerSchema.safeParse({
      firstname: "John",
      lastname: "Doe",
      email: "john@example.com",
      countryCode: "977",
      number: "98123456",
      password: "abcdef",
      confirmPassword: "abcdef",
    });
    expect(parsed.success).toBe(false);
  });

  it("registerSchema rejects password mismatch", () => {
    const parsed = registerSchema.safeParse({
      firstname: "John",
      lastname: "Doe",
      email: "john@example.com",
      countryCode: "+1",
      number: "98123456",
      password: "abcdef",
      confirmPassword: "xxxxxx",
    });
    expect(parsed.success).toBe(false);
  });

  it("registerSchema rejects short firstname", () => {
    const parsed = registerSchema.safeParse({
      firstname: "J",
      lastname: "Doe",
      email: "john@example.com",
      countryCode: "+1",
      number: "98123456",
      password: "abcdef",
      confirmPassword: "abcdef",
    });
    expect(parsed.success).toBe(false);
  });

  it("registerSchema rejects short lastname", () => {
    const parsed = registerSchema.safeParse({
      firstname: "Jo",
      lastname: "D",
      email: "john@example.com",
      countryCode: "+1",
      number: "98123456",
      password: "abcdef",
      confirmPassword: "abcdef",
    });
    expect(parsed.success).toBe(false);
  });

  it("registerSchema rejects invalid email", () => {
    const parsed = registerSchema.safeParse({
      firstname: "Jo",
      lastname: "Doe",
      email: "bad",
      countryCode: "+1",
      number: "98123456",
      password: "abcdef",
      confirmPassword: "abcdef",
    });
    expect(parsed.success).toBe(false);
  });

  it("LoginSchema trims email input", () => {
    const parsed = LoginSchema.parse({
      email: "  test@example.com  ",
      password: "Password123!",
    });
    expect(parsed.email).toBe("test@example.com");
  });

  it("LoginSchema rejects password shorter than 8", () => {
    const parsed = LoginSchema.safeParse({
      email: "test@example.com",
      password: "short",
    });
    expect(parsed.success).toBe(false);
  });

  it("LoginSchema rejects empty payload", () => {
    const parsed = LoginSchema.safeParse({});
    expect(parsed.success).toBe(false);
  });

  it("RegisterSchema trims firstname and lastname", () => {
    const parsed = RegisterSchema.parse({
      firstname: "  John ",
      lastname: " Doe  ",
      email: "john@example.com",
      number: "1234567890",
      password: "Password123!",
      confirmPassword: "Password123!",
    });
    expect(parsed.firstname).toBe("John");
    expect(parsed.lastname).toBe("Doe");
  });

  it("RegisterSchema rejects number shorter than 10", () => {
    const parsed = RegisterSchema.safeParse({
      firstname: "John",
      lastname: "Doe",
      email: "john@example.com",
      number: "123",
      password: "Password123!",
      confirmPassword: "Password123!",
    });
    expect(parsed.success).toBe(false);
  });

  it("RegisterSchema rejects number longer than 10", () => {
    const parsed = RegisterSchema.safeParse({
      firstname: "John",
      lastname: "Doe",
      email: "john@example.com",
      number: "1234567890123",
      password: "Password123!",
      confirmPassword: "Password123!",
    });
    expect(parsed.success).toBe(false);
  });

  it("RegisterSchema rejects password shorter than 8", () => {
    const parsed = RegisterSchema.safeParse({
      firstname: "John",
      lastname: "Doe",
      email: "john@example.com",
      number: "1234567890",
      password: "short",
      confirmPassword: "short",
    });
    expect(parsed.success).toBe(false);
  });

  it("RegisterSchema rejects missing confirmPassword", () => {
    const parsed = RegisterSchema.safeParse({
      firstname: "John",
      lastname: "Doe",
      email: "john@example.com",
      number: "1234567890",
      password: "Password123!",
    });
    expect(parsed.success).toBe(false);
  });

  it("RegisterSchema rejects password mismatch in refine", () => {
    const parsed = RegisterSchema.safeParse({
      firstname: "John",
      lastname: "Doe",
      email: "john@example.com",
      number: "1234567890",
      password: "Password123!",
      confirmPassword: "Password000!",
    });
    expect(parsed.success).toBe(false);
  });

  it("RegisterSchema accepts exact 10-digit number", () => {
    const parsed = RegisterSchema.safeParse({
      firstname: "John",
      lastname: "Doe",
      email: "john@example.com",
      number: "0123456789",
      password: "Password123!",
      confirmPassword: "Password123!",
    });
    expect(parsed.success).toBe(true);
  });
});
