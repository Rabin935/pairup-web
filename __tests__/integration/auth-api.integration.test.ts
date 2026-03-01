import express from "express";
import request from "supertest";
import { LoginSchema } from "@/app/lib/validations/login-auth";
import { RegisterSchema } from "@/app/lib/validations/register-auth";

type UserRecord = {
  email: string;
  password: string;
  firstname: string;
  lastname: string;
  number: string;
};

const makeTestApp = () => {
  const app = express();
  app.use(express.json());
  const users = new Map<string, UserRecord>();

  app.post("/auth/register", (req, res) => {
    const parsed = RegisterSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, message: "Validation failed" });
    }

    const { email, password, firstname, lastname, number } = parsed.data;
    if (users.has(email)) {
      return res.status(409).json({ success: false, message: "Email already exists" });
    }

    users.set(email, { email, password, firstname, lastname, number });
    return res.status(201).json({ success: true, data: { email, firstname, lastname } });
  });

  app.post("/auth/login", (req, res) => {
    const parsed = LoginSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, message: "Validation failed" });
    }

    const user = users.get(parsed.data.email);
    if (!user || user.password !== parsed.data.password) {
      return res.status(401).json({ success: false, message: "Invalid credentials" });
    }

    return res.status(200).json({
      success: true,
      token: "frontend-mock-token",
      data: { email: user.email, firstname: user.firstname, lastname: user.lastname },
    });
  });

  app.get("/admin/users", (req, res) => {
    const auth = req.header("authorization");
    if (!auth || !auth.startsWith("Bearer ")) {
      return res.status(401).json({ success: false, message: "Missing token" });
    }

    return res.status(200).json({
      success: true,
      count: users.size,
      data: Array.from(users.values()).map((u) => ({ email: u.email, firstname: u.firstname })),
    });
  });

  return app;
};

describe("frontend integration with Supertest", () => {
  it("registers a valid user", async () => {
    const app = makeTestApp();
    const response = await request(app).post("/auth/register").send({
      firstname: "John",
      lastname: "Doe",
      email: "john@example.com",
      number: "1234567890",
      password: "Password123!",
      confirmPassword: "Password123!",
    });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data.email).toBe("john@example.com");
  });

  it("rejects invalid register payload", async () => {
    const app = makeTestApp();
    const response = await request(app).post("/auth/register").send({
      firstname: "J",
      email: "invalid",
    });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
  });

  it("rejects duplicate email on register", async () => {
    const app = makeTestApp();
    const payload = {
      firstname: "Jane",
      lastname: "Doe",
      email: "jane@example.com",
      number: "1234567890",
      password: "Password123!",
      confirmPassword: "Password123!",
    };

    await request(app).post("/auth/register").send(payload);
    const second = await request(app).post("/auth/register").send(payload);

    expect(second.status).toBe(409);
  });

  it("logs in an existing user with valid credentials", async () => {
    const app = makeTestApp();
    await request(app).post("/auth/register").send({
      firstname: "Rita",
      lastname: "Shah",
      email: "rita@example.com",
      number: "1234567890",
      password: "Password123!",
      confirmPassword: "Password123!",
    });

    const response = await request(app).post("/auth/login").send({
      email: "rita@example.com",
      password: "Password123!",
    });

    expect(response.status).toBe(200);
    expect(response.body.token).toBeTruthy();
  });

  it("rejects login with wrong password", async () => {
    const app = makeTestApp();
    await request(app).post("/auth/register").send({
      firstname: "Rita",
      lastname: "Shah",
      email: "rita@example.com",
      number: "1234567890",
      password: "Password123!",
      confirmPassword: "Password123!",
    });

    const response = await request(app).post("/auth/login").send({
      email: "rita@example.com",
      password: "WrongPass123!",
    });

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
  });

  it("rejects invalid login payload", async () => {
    const app = makeTestApp();
    const response = await request(app).post("/auth/login").send({
      email: "bad-email",
      password: "short",
    });

    expect(response.status).toBe(400);
  });

  it("denies admin route without bearer token", async () => {
    const app = makeTestApp();
    const response = await request(app).get("/admin/users");
    expect(response.status).toBe(401);
  });

  it("allows admin route with bearer token", async () => {
    const app = makeTestApp();
    const response = await request(app)
      .get("/admin/users")
      .set("Authorization", "Bearer frontend-mock-token");
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
  });
});
