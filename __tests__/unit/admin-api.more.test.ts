type Store = Record<string, string>;

const makeStorage = (initial: Store = {}) => {
  const data: Store = { ...initial };
  return {
    getItem: (key: string) => (key in data ? data[key] : null),
    setItem: (key: string, value: string) => {
      data[key] = value;
    },
    removeItem: (key: string) => {
      delete data[key];
    },
    clear: () => {
      Object.keys(data).forEach((key) => delete data[key]);
    },
  };
};

describe("admin-api more unit coverage", () => {
  beforeEach(() => {
    jest.resetModules();
    delete (global as any).window;
    delete (global as any).localStorage;
    (global as any).fetch = jest.fn();
    delete process.env.NEXT_PUBLIC_API_URL;
    delete process.env.NEXT_PUBLIC_API_BASE_URL;
  });

  const load = async () => import("@/app/admin/_lib/admin-api");

  it("getAdminSession returns null role when user json is invalid", async () => {
    (global as any).window = {};
    (global as any).localStorage = makeStorage({
      pairup_token: "token",
      pairup_user: "{invalid-json",
    });
    const { getAdminSession } = await load();
    const session = getAdminSession();
    expect(session.token).toBe("token");
    expect(session.role).toBeNull();
    expect(session.user).toBeNull();
  });

  it("getAdminSession picks Role when role is missing", async () => {
    (global as any).window = {};
    (global as any).localStorage = makeStorage({
      pairup_token: "token",
      pairup_user: JSON.stringify({ Role: "admin" }),
    });
    const { getAdminSession } = await load();
    expect(getAdminSession().role).toBe("admin");
  });

  it("getAdminSession picks userRole when role and Role are missing", async () => {
    (global as any).window = {};
    (global as any).localStorage = makeStorage({
      pairup_token: "token",
      pairup_user: JSON.stringify({ userRole: "admin" }),
    });
    const { getAdminSession } = await load();
    expect(getAdminSession().role).toBe("admin");
  });

  it("hasAdminAccess is false without token", async () => {
    (global as any).window = {};
    (global as any).localStorage = makeStorage({
      pairup_user: JSON.stringify({ role: "admin" }),
    });
    const { hasAdminAccess } = await load();
    expect(hasAdminAccess()).toBe(false);
  });

  it("hasAdminAccess is false without admin role", async () => {
    (global as any).window = {};
    (global as any).localStorage = makeStorage({
      pairup_token: "token",
      pairup_user: JSON.stringify({ role: "moderator" }),
    });
    const { hasAdminAccess } = await load();
    expect(hasAdminAccess()).toBe(false);
  });

  it("adminFetch supports absolute url path", async () => {
    (global as any).window = {};
    (global as any).localStorage = makeStorage();
    (global as any).fetch.mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ ok: true }),
    });
    const { adminFetch } = await load();
    await adminFetch("https://example.com/admin");
    expect((global as any).fetch.mock.calls[0][0]).toBe("https://example.com/admin");
  });

  it("adminFetch trims trailing slash from base url", async () => {
    process.env.NEXT_PUBLIC_API_URL = "http://localhost:9000/";
    (global as any).window = {};
    (global as any).localStorage = makeStorage();
    (global as any).fetch.mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ ok: true }),
    });
    const { adminFetch } = await load();
    await adminFetch("/api/test");
    expect((global as any).fetch.mock.calls[0][0]).toBe("http://localhost:9000/api/test");
  });

  it("adminFetch adds leading slash to relative path", async () => {
    process.env.NEXT_PUBLIC_API_URL = "http://localhost:9100";
    (global as any).window = {};
    (global as any).localStorage = makeStorage();
    (global as any).fetch.mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ ok: true }),
    });
    const { adminFetch } = await load();
    await adminFetch("api/no-leading-slash");
    expect((global as any).fetch.mock.calls[0][0]).toBe(
      "http://localhost:9100/api/no-leading-slash"
    );
  });

  it("adminFetch uses NEXT_PUBLIC_API_BASE_URL fallback", async () => {
    process.env.NEXT_PUBLIC_API_BASE_URL = "http://localhost:9200";
    (global as any).window = {};
    (global as any).localStorage = makeStorage();
    (global as any).fetch.mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ ok: true }),
    });
    const { adminFetch } = await load();
    await adminFetch("/health");
    expect((global as any).fetch.mock.calls[0][0]).toBe("http://localhost:9200/health");
  });

  it("adminFetch uses default base when no env variables set", async () => {
    (global as any).window = {};
    (global as any).localStorage = makeStorage();
    (global as any).fetch.mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ ok: true }),
    });
    const { adminFetch } = await load();
    await adminFetch("/api/default");
    expect((global as any).fetch.mock.calls[0][0]).toBe("http://localhost:5000/api/default");
  });

  it("adminFetch preserves provided content-type header", async () => {
    (global as any).window = {};
    (global as any).localStorage = makeStorage();
    (global as any).fetch.mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ ok: true }),
    });
    const { adminFetch } = await load();
    await adminFetch("/api/custom", {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: "data",
    });
    const [, init] = (global as any).fetch.mock.calls[0];
    expect(init.headers.get("Content-Type")).toBe("text/plain");
  });

  it("adminFetch always sets cache to no-store", async () => {
    (global as any).window = {};
    (global as any).localStorage = makeStorage();
    (global as any).fetch.mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ ok: true }),
    });
    const { adminFetch } = await load();
    await adminFetch("/api/cache");
    const [, init] = (global as any).fetch.mock.calls[0];
    expect(init.cache).toBe("no-store");
  });

  it("adminFetch handles empty successful response body", async () => {
    (global as any).window = {};
    (global as any).localStorage = makeStorage();
    (global as any).fetch.mockResolvedValue({
      ok: true,
      status: 204,
      text: async () => "",
    });
    const { adminFetch } = await load();
    const payload = await adminFetch("/api/no-content");
    expect(payload).toBeNull();
  });

  it("adminFetch parses non-json text into message object for success response", async () => {
    (global as any).window = {};
    (global as any).localStorage = makeStorage();
    (global as any).fetch.mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => "plain text response",
    });
    const { adminFetch } = await load();
    const payload: any = await adminFetch("/api/plain");
    expect(payload.message).toBe("plain text response");
  });

  it("adminFetch throws fallback status message for failed empty body", async () => {
    (global as any).window = {};
    (global as any).localStorage = makeStorage();
    (global as any).fetch.mockResolvedValue({
      ok: false,
      status: 500,
      text: async () => "",
    });
    const { adminFetch } = await load();
    await expect(adminFetch("/api/fail-empty")).rejects.toThrow(
      "Request failed with status 500"
    );
  });

  it("adminFetch throws fallback message when error payload lacks message key", async () => {
    (global as any).window = {};
    (global as any).localStorage = makeStorage();
    (global as any).fetch.mockResolvedValue({
      ok: false,
      status: 404,
      text: async () => JSON.stringify({ error: "Nope" }),
    });
    const { adminFetch } = await load();
    await expect(adminFetch("/api/fail-no-message")).rejects.toThrow(
      "Request failed with status 404"
    );
  });

  it("adminFetch throws plain text message for failed text body", async () => {
    (global as any).window = {};
    (global as any).localStorage = makeStorage();
    (global as any).fetch.mockResolvedValue({
      ok: false,
      status: 400,
      text: async () => "Bad request text",
    });
    const { adminFetch } = await load();
    await expect(adminFetch("/api/fail-text")).rejects.toThrow("Bad request text");
  });

  it("adminFetch uses pairup_token over authToken when both exist", async () => {
    (global as any).window = {};
    (global as any).localStorage = makeStorage({
      pairup_token: "token-new",
      authToken: "token-old",
      pairup_user: JSON.stringify({ role: "admin" }),
    });
    (global as any).fetch.mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ ok: true }),
    });
    const { adminFetch } = await load();
    await adminFetch("/api/token-priority");
    const [, init] = (global as any).fetch.mock.calls[0];
    expect(init.headers.get("Authorization")).toBe("Bearer token-new");
  });

  it("adminFetch omits authorization header when token missing", async () => {
    (global as any).window = {};
    (global as any).localStorage = makeStorage();
    (global as any).fetch.mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ ok: true }),
    });
    const { adminFetch } = await load();
    await adminFetch("/api/no-token");
    const [, init] = (global as any).fetch.mock.calls[0];
    expect(init.headers.has("Authorization")).toBe(false);
  });

  it("adminFetch keeps explicit headers passed as Headers object", async () => {
    (global as any).window = {};
    (global as any).localStorage = makeStorage();
    (global as any).fetch.mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ ok: true }),
    });
    const { adminFetch } = await load();
    const headers = new Headers({ "X-Test": "yes" });
    await adminFetch("/api/headers-object", { headers });
    const [, init] = (global as any).fetch.mock.calls[0];
    expect(init.headers.get("X-Test")).toBe("yes");
  });

  it("getAdminSession returns null token when localStorage empty", async () => {
    (global as any).window = {};
    (global as any).localStorage = makeStorage();
    const { getAdminSession } = await load();
    expect(getAdminSession().token).toBeNull();
  });

  it("getAdminSession returns user object when valid json provided", async () => {
    (global as any).window = {};
    (global as any).localStorage = makeStorage({
      pairup_user: JSON.stringify({ role: "admin", x: 1 }),
    });
    const { getAdminSession } = await load();
    expect(getAdminSession().user).toMatchObject({ role: "admin", x: 1 });
  });
});
