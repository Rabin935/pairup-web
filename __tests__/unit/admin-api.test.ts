type StorageMap = Record<string, string>;

const createStorage = (initial: StorageMap = {}) => {
  const store: StorageMap = { ...initial };
  return {
    getItem: (key: string) => (key in store ? store[key] : null),
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      Object.keys(store).forEach((key) => delete store[key]);
    },
  };
};

describe("admin-api unit", () => {
  beforeEach(() => {
    jest.resetModules();
    delete (global as any).window;
    delete (global as any).localStorage;
    (global as any).fetch = jest.fn();
    delete process.env.NEXT_PUBLIC_API_URL;
    delete process.env.NEXT_PUBLIC_API_BASE_URL;
  });

  it("getAdminSession returns null values on server", async () => {
    const { getAdminSession } = await import("@/app/admin/_lib/admin-api");
    expect(getAdminSession()).toEqual({ token: null, role: null, user: null });
  });

  it("getAdminSession reads token and role from pairup keys", async () => {
    (global as any).window = {};
    (global as any).localStorage = createStorage({
      pairup_token: "token-1",
      pairup_user: JSON.stringify({ role: "admin", name: "Root" }),
    });

    const { getAdminSession } = await import("@/app/admin/_lib/admin-api");
    const session = getAdminSession();

    expect(session.token).toBe("token-1");
    expect(session.role).toBe("admin");
    expect(session.user).toMatchObject({ role: "admin" });
  });

  it("getAdminSession falls back to authToken and userInfo", async () => {
    (global as any).window = {};
    (global as any).localStorage = createStorage({
      authToken: "legacy-token",
      userInfo: JSON.stringify({ userRole: "admin" }),
    });

    const { getAdminSession } = await import("@/app/admin/_lib/admin-api");
    const session = getAdminSession();

    expect(session.token).toBe("legacy-token");
    expect(session.role).toBe("admin");
  });

  it("hasAdminAccess is true for admin with token", async () => {
    (global as any).window = {};
    (global as any).localStorage = createStorage({
      pairup_token: "token-2",
      pairup_user: JSON.stringify({ role: "admin" }),
    });

    const { hasAdminAccess } = await import("@/app/admin/_lib/admin-api");
    expect(hasAdminAccess()).toBe(true);
  });

  it("hasAdminAccess is false for non-admin role", async () => {
    (global as any).window = {};
    (global as any).localStorage = createStorage({
      pairup_token: "token-3",
      pairup_user: JSON.stringify({ role: "user" }),
    });

    const { hasAdminAccess } = await import("@/app/admin/_lib/admin-api");
    expect(hasAdminAccess()).toBe(false);
  });

  it("adminFetch attaches auth header and parses JSON", async () => {
    process.env.NEXT_PUBLIC_API_URL = "http://localhost:5001";
    (global as any).window = {};
    (global as any).localStorage = createStorage({
      pairup_token: "jwt-value",
      pairup_user: JSON.stringify({ role: "admin" }),
    });
    (global as any).fetch.mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ ok: true }),
    });

    const { adminFetch } = await import("@/app/admin/_lib/admin-api");
    const result = await adminFetch<{ ok: boolean }>("/api/admin/users", {
      method: "GET",
    });

    expect(result.ok).toBe(true);
    const [url, init] = (global as any).fetch.mock.calls[0];
    expect(url).toBe("http://localhost:5001/api/admin/users");
    expect(init.headers.get("Authorization")).toBe("Bearer jwt-value");
    expect(init.headers.get("Content-Type")).toBe("application/json");
  });

  it("adminFetch does not set JSON content type for FormData body", async () => {
    process.env.NEXT_PUBLIC_API_URL = "http://localhost:5002";
    (global as any).window = {};
    (global as any).localStorage = createStorage();
    (global as any).fetch.mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ uploaded: true }),
    });

    const { adminFetch } = await import("@/app/admin/_lib/admin-api");
    const formData = new FormData();
    formData.set("name", "file");
    await adminFetch("/api/admin/upload", { method: "POST", body: formData });

    const [, init] = (global as any).fetch.mock.calls[0];
    expect(init.headers.has("Content-Type")).toBe(false);
  });

  it("adminFetch throws error message from response payload", async () => {
    (global as any).window = {};
    (global as any).localStorage = createStorage();
    (global as any).fetch.mockResolvedValue({
      ok: false,
      status: 401,
      text: async () => JSON.stringify({ message: "Unauthorized" }),
    });

    const { adminFetch } = await import("@/app/admin/_lib/admin-api");
    await expect(adminFetch("/api/admin/users")).rejects.toThrow("Unauthorized");
  });
});
