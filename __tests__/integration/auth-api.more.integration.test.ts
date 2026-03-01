import express from "express";
import request from "supertest";
import { LoginSchema } from "@/app/lib/validations/login-auth";
import { RegisterSchema } from "@/app/lib/validations/register-auth";

type User = {
  email: string;
  password: string;
  firstname: string;
  lastname: string;
  number: string;
  role: "user" | "admin";
};

const createApp = () => {
  const app = express();
  app.use(express.json());

  const users = new Map<string, User>();
  const sessions = new Map<string, string>();

  app.post("/auth/register", (req, res) => {
    const parsed = RegisterSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, message: "Validation failed" });
    }

    const { email, password, firstname, lastname, number } = parsed.data;
    if (users.has(email)) {
      return res.status(409).json({ success: false, message: "Email already exists" });
    }

    users.set(email, { email, password, firstname, lastname, number, role: "user" });
    return res.status(201).json({
      success: true,
      data: { email, firstname, lastname, number, role: "user" },
    });
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

    const token = `token-${user.email}`;
    sessions.set(token, user.email);
    return res.status(200).json({ success: true, token, data: { email: user.email, role: user.role } });
  });

  app.post("/auth/logout", (req, res) => {
    const auth = req.header("authorization");
    if (!auth || !auth.startsWith("Bearer ")) {
      return res.status(401).json({ success: false, message: "Missing token" });
    }
    const token = auth.split(" ")[1];
    sessions.delete(token);
    return res.status(200).json({ success: true });
  });

  app.get("/profile", (req, res) => {
    const auth = req.header("authorization");
    if (!auth || !auth.startsWith("Bearer ")) {
      return res.status(401).json({ success: false });
    }

    const token = auth.split(" ")[1];
    const email = sessions.get(token);
    if (!email) {
      return res.status(401).json({ success: false });
    }

    const user = users.get(email)!;
    return res.status(200).json({ success: true, data: { email: user.email, firstname: user.firstname } });
  });

  app.put("/profile", (req, res) => {
    const auth = req.header("authorization");
    if (!auth || !auth.startsWith("Bearer ")) {
      return res.status(401).json({ success: false });
    }
    const token = auth.split(" ")[1];
    const email = sessions.get(token);
    if (!email) {
      return res.status(401).json({ success: false });
    }
    const user = users.get(email)!;
    user.firstname = req.body.firstname ?? user.firstname;
    user.lastname = req.body.lastname ?? user.lastname;
    users.set(email, user);
    return res.status(200).json({ success: true, data: { firstname: user.firstname, lastname: user.lastname } });
  });

  app.get("/admin/users", (req, res) => {
    const auth = req.header("authorization");
    if (!auth || !auth.startsWith("Bearer ")) {
      return res.status(401).json({ success: false, message: "Missing token" });
    }
    const token = auth.split(" ")[1];
    const email = sessions.get(token);
    if (!email) {
      return res.status(401).json({ success: false, message: "Invalid token" });
    }
    const actor = users.get(email)!;
    if (actor.role !== "admin") {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }
    return res.status(200).json({
      success: true,
      count: users.size,
      data: Array.from(users.values()).map((u) => ({ email: u.email, role: u.role })),
    });
  });

  return { app, users, sessions };
};

describe("frontend auth/api more integration", () => {
  it("register returns 201 for valid user", async () => {
    const { app } = createApp();
    const res = await request(app).post("/auth/register").send({
      firstname: "Ava",
      lastname: "One",
      email: "ava1@example.com",
      number: "1234567890",
      password: "Password123!",
      confirmPassword: "Password123!",
    });
    expect(res.status).toBe(201);
  });

  it("register rejects invalid body", async () => {
    const { app } = createApp();
    const res = await request(app).post("/auth/register").send({ email: "bad" });
    expect(res.status).toBe(400);
  });

  it("register rejects duplicate email", async () => {
    const { app } = createApp();
    const payload = {
      firstname: "Ava",
      lastname: "One",
      email: "dup@example.com",
      number: "1234567890",
      password: "Password123!",
      confirmPassword: "Password123!",
    };
    await request(app).post("/auth/register").send(payload);
    const second = await request(app).post("/auth/register").send(payload);
    expect(second.status).toBe(409);
  });

  it("login succeeds for registered user", async () => {
    const { app } = createApp();
    await request(app).post("/auth/register").send({
      firstname: "Ava",
      lastname: "One",
      email: "login1@example.com",
      number: "1234567890",
      password: "Password123!",
      confirmPassword: "Password123!",
    });
    const res = await request(app).post("/auth/login").send({
      email: "login1@example.com",
      password: "Password123!",
    });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeTruthy();
  });

  it("login rejects wrong password", async () => {
    const { app } = createApp();
    await request(app).post("/auth/register").send({
      firstname: "Ava",
      lastname: "One",
      email: "login2@example.com",
      number: "1234567890",
      password: "Password123!",
      confirmPassword: "Password123!",
    });
    const res = await request(app).post("/auth/login").send({
      email: "login2@example.com",
      password: "WrongPassword123!",
    });
    expect(res.status).toBe(401);
  });

  it("login rejects unregistered user", async () => {
    const { app } = createApp();
    const res = await request(app).post("/auth/login").send({
      email: "missing@example.com",
      password: "Password123!",
    });
    expect(res.status).toBe(401);
  });

  it("login rejects invalid payload format", async () => {
    const { app } = createApp();
    const res = await request(app).post("/auth/login").send({
      email: "bad",
      password: "short",
    });
    expect(res.status).toBe(400);
  });

  it("profile requires auth header", async () => {
    const { app } = createApp();
    const res = await request(app).get("/profile");
    expect(res.status).toBe(401);
  });

  it("profile returns user data with valid token", async () => {
    const { app } = createApp();
    await request(app).post("/auth/register").send({
      firstname: "Uma",
      lastname: "Two",
      email: "profile1@example.com",
      number: "1234567890",
      password: "Password123!",
      confirmPassword: "Password123!",
    });
    const login = await request(app).post("/auth/login").send({
      email: "profile1@example.com",
      password: "Password123!",
    });
    const res = await request(app)
      .get("/profile")
      .set("Authorization", `Bearer ${login.body.token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.email).toBe("profile1@example.com");
  });

  it("profile rejects invalid token", async () => {
    const { app } = createApp();
    const res = await request(app).get("/profile").set("Authorization", "Bearer missing-token");
    expect(res.status).toBe(401);
  });

  it("profile update requires auth", async () => {
    const { app } = createApp();
    const res = await request(app).put("/profile").send({ firstname: "Updated" });
    expect(res.status).toBe(401);
  });

  it("profile update changes user fields", async () => {
    const { app } = createApp();
    await request(app).post("/auth/register").send({
      firstname: "Old",
      lastname: "Name",
      email: "profile2@example.com",
      number: "1234567890",
      password: "Password123!",
      confirmPassword: "Password123!",
    });
    const login = await request(app).post("/auth/login").send({
      email: "profile2@example.com",
      password: "Password123!",
    });
    const res = await request(app)
      .put("/profile")
      .set("Authorization", `Bearer ${login.body.token}`)
      .send({ firstname: "New", lastname: "Person" });
    expect(res.status).toBe(200);
    expect(res.body.data.firstname).toBe("New");
  });

  it("logout requires auth", async () => {
    const { app } = createApp();
    const res = await request(app).post("/auth/logout");
    expect(res.status).toBe(401);
  });

  it("logout invalidates token", async () => {
    const { app } = createApp();
    await request(app).post("/auth/register").send({
      firstname: "Tok",
      lastname: "User",
      email: "tok1@example.com",
      number: "1234567890",
      password: "Password123!",
      confirmPassword: "Password123!",
    });
    const login = await request(app).post("/auth/login").send({
      email: "tok1@example.com",
      password: "Password123!",
    });
    await request(app).post("/auth/logout").set("Authorization", `Bearer ${login.body.token}`);
    const profile = await request(app)
      .get("/profile")
      .set("Authorization", `Bearer ${login.body.token}`);
    expect(profile.status).toBe(401);
  });

  it("admin/users denies missing token", async () => {
    const { app } = createApp();
    const res = await request(app).get("/admin/users");
    expect(res.status).toBe(401);
  });

  it("admin/users denies non-admin user", async () => {
    const { app } = createApp();
    await request(app).post("/auth/register").send({
      firstname: "Non",
      lastname: "Admin",
      email: "nonadmin@example.com",
      number: "1234567890",
      password: "Password123!",
      confirmPassword: "Password123!",
    });
    const login = await request(app).post("/auth/login").send({
      email: "nonadmin@example.com",
      password: "Password123!",
    });
    const res = await request(app)
      .get("/admin/users")
      .set("Authorization", `Bearer ${login.body.token}`);
    expect(res.status).toBe(403);
  });

  it("admin/users allows admin user", async () => {
    const { app, users } = createApp();
    users.set("admin@example.com", {
      email: "admin@example.com",
      password: "Password123!",
      firstname: "Admin",
      lastname: "User",
      number: "1234567890",
      role: "admin",
    });
    const login = await request(app).post("/auth/login").send({
      email: "admin@example.com",
      password: "Password123!",
    });
    const res = await request(app)
      .get("/admin/users")
      .set("Authorization", `Bearer ${login.body.token}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it("admin/users returns count and data", async () => {
    const { app, users } = createApp();
    users.set("admin2@example.com", {
      email: "admin2@example.com",
      password: "Password123!",
      firstname: "Admin",
      lastname: "Two",
      number: "1234567890",
      role: "admin",
    });
    users.set("user2@example.com", {
      email: "user2@example.com",
      password: "Password123!",
      firstname: "User",
      lastname: "Two",
      number: "1234567890",
      role: "user",
    });
    const login = await request(app).post("/auth/login").send({
      email: "admin2@example.com",
      password: "Password123!",
    });
    const res = await request(app)
      .get("/admin/users")
      .set("Authorization", `Bearer ${login.body.token}`);
    expect(res.status).toBe(200);
    expect(res.body.count).toBe(2);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it("register then login then profile flow works end-to-end", async () => {
    const { app } = createApp();
    await request(app).post("/auth/register").send({
      firstname: "Flow",
      lastname: "User",
      email: "flow2@example.com",
      number: "1234567890",
      password: "Password123!",
      confirmPassword: "Password123!",
    });
    const login = await request(app).post("/auth/login").send({
      email: "flow2@example.com",
      password: "Password123!",
    });
    const profile = await request(app)
      .get("/profile")
      .set("Authorization", `Bearer ${login.body.token}`);
    expect(profile.status).toBe(200);
    expect(profile.body.data.firstname).toBe("Flow");
  });

  it("multiple users can login independently", async () => {
    const { app } = createApp();
    await request(app).post("/auth/register").send({
      firstname: "User",
      lastname: "Alpha",
      email: "ua@example.com",
      number: "1234567890",
      password: "Password123!",
      confirmPassword: "Password123!",
    });
    await request(app).post("/auth/register").send({
      firstname: "User",
      lastname: "Beta",
      email: "ub@example.com",
      number: "1234567890",
      password: "Password123!",
      confirmPassword: "Password123!",
    });
    const a = await request(app).post("/auth/login").send({
      email: "ua@example.com",
      password: "Password123!",
    });
    const b = await request(app).post("/auth/login").send({
      email: "ub@example.com",
      password: "Password123!",
    });
    expect(a.status).toBe(200);
    expect(b.status).toBe(200);
    expect(a.body.token).not.toBe(b.body.token);
  });
});
