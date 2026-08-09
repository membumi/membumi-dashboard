import { describe, it, expect, vi, beforeEach } from "vitest";

// Mocks must be hoisted so the vi.mock factories can reference them.
const { authMock, apiPostMock, apiPatchMock, apiDeleteMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  apiPostMock: vi.fn(),
  apiPatchMock: vi.fn(),
  apiDeleteMock: vi.fn(),
}));

vi.mock("@/auth", () => ({ auth: authMock }));
vi.mock("@/lib/api-client", () => ({
  apiGet: vi.fn(),
  apiPost: apiPostMock,
  apiPut: vi.fn(),
  apiPatch: apiPatchMock,
  apiDelete: apiDeleteMock,
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));

import {
  removePushSubscription,
  savePushSubscription,
  sendTestNotification,
  updatePushPreferences,
} from "@/server/actions/push";

const SUBSCRIPTION = {
  endpoint: "https://push.example/abc",
  p256dh: "PKEY",
  auth: "AKEY",
};

function fd(obj: Record<string, string>): FormData {
  const f = new FormData();
  for (const [k, v] of Object.entries(obj)) f.set(k, v);
  return f;
}

function topicsForm(topics: string[]): FormData {
  const f = new FormData();
  for (const t of topics) f.append("topics", t);
  return f;
}

beforeEach(() => {
  authMock.mockReset();
  apiPostMock.mockReset().mockResolvedValue({});
  apiPatchMock.mockReset().mockResolvedValue({});
  apiDeleteMock.mockReset().mockResolvedValue({});
  authMock.mockResolvedValue({ user: { role: "OPERATOR" } });
});

describe("savePushSubscription", () => {
  it("registers the browser's subscription", async () => {
    await savePushSubscription(fd({ subscription: JSON.stringify(SUBSCRIPTION) }));

    expect(apiPostMock).toHaveBeenCalledWith("/admin/push/subscriptions", SUBSCRIPTION);
  });

  it("keeps the user agent when the browser supplied one", async () => {
    await savePushSubscription(
      fd({ subscription: JSON.stringify({ ...SUBSCRIPTION, userAgent: "Chrome/1.0" }) })
    );

    expect(apiPostMock).toHaveBeenCalledWith("/admin/push/subscriptions", {
      ...SUBSCRIPTION,
      userAgent: "Chrome/1.0",
    });
  });

  it("refuses an unauthenticated caller", async () => {
    authMock.mockResolvedValue(null);

    await expect(
      savePushSubscription(fd({ subscription: JSON.stringify(SUBSCRIPTION) }))
    ).rejects.toThrow("UNAUTHORIZED");
    expect(apiPostMock).not.toHaveBeenCalled();
  });

  it("refuses a session whose refresh chain is broken", async () => {
    authMock.mockResolvedValue({ user: { role: "ADMIN" }, error: "RefreshAccessTokenError" });

    await expect(
      savePushSubscription(fd({ subscription: JSON.stringify(SUBSCRIPTION) }))
    ).rejects.toThrow("UNAUTHORIZED");
    expect(apiPostMock).not.toHaveBeenCalled();
  });

  it("rejects malformed JSON without calling the API", async () => {
    await expect(savePushSubscription(fd({ subscription: "{not json" }))).rejects.toThrow(
      "INVALID_SUBSCRIPTION"
    );
    expect(apiPostMock).not.toHaveBeenCalled();
  });

  it("rejects a non-https endpoint", async () => {
    await expect(
      savePushSubscription(
        fd({ subscription: JSON.stringify({ ...SUBSCRIPTION, endpoint: "http://push.example" }) })
      )
    ).rejects.toThrow();
    expect(apiPostMock).not.toHaveBeenCalled();
  });

  it("rejects a subscription missing its auth key", async () => {
    await expect(
      savePushSubscription(
        fd({ subscription: JSON.stringify({ endpoint: SUBSCRIPTION.endpoint, p256dh: "PKEY" }) })
      )
    ).rejects.toThrow();
    expect(apiPostMock).not.toHaveBeenCalled();
  });
});

describe("removePushSubscription", () => {
  it("unregisters by endpoint", async () => {
    await removePushSubscription(fd({ endpoint: SUBSCRIPTION.endpoint }));

    expect(apiDeleteMock).toHaveBeenCalledWith("/admin/push/subscriptions", {
      endpoint: SUBSCRIPTION.endpoint,
    });
  });

  it("refuses an unauthenticated caller", async () => {
    authMock.mockResolvedValue(null);

    await expect(removePushSubscription(fd({ endpoint: SUBSCRIPTION.endpoint }))).rejects.toThrow(
      "UNAUTHORIZED"
    );
    expect(apiDeleteMock).not.toHaveBeenCalled();
  });
});

describe("updatePushPreferences", () => {
  it("expands the checked set into an explicit on/off for every topic", async () => {
    // The case that matters: unchecked boxes aren't submitted at all, so an
    // opt-out has to be inferred here or it would never persist.
    await updatePushPreferences(topicsForm(["topup", "merchantRegistration"]));

    expect(apiPatchMock).toHaveBeenCalledWith("/admin/push/preferences", {
      topics: {
        miride: false,
        mifood: false,
        misend: false,
        topup: true,
        support: false,
        driverRegistration: false,
        merchantRegistration: true,
      },
    });
  });

  it("turns everything off when nothing is checked", async () => {
    await updatePushPreferences(topicsForm([]));

    const { topics } = apiPatchMock.mock.calls[0][1] as { topics: Record<string, boolean> };
    expect(Object.values(topics).every((v) => v === false)).toBe(true);
    expect(Object.keys(topics)).toHaveLength(7);
  });

  it("rejects an unknown topic", async () => {
    await expect(updatePushPreferences(topicsForm(["not-a-topic"]))).rejects.toThrow();
    expect(apiPatchMock).not.toHaveBeenCalled();
  });

  it("refuses an unauthenticated caller", async () => {
    authMock.mockResolvedValue(null);

    await expect(updatePushPreferences(topicsForm(["topup"]))).rejects.toThrow("UNAUTHORIZED");
    expect(apiPatchMock).not.toHaveBeenCalled();
  });
});

describe("sendTestNotification", () => {
  it("posts to the test endpoint and returns the delivery result", async () => {
    apiPostMock.mockResolvedValue({ sent: 2, failed: 0 });

    await expect(sendTestNotification()).resolves.toEqual({ sent: 2, failed: 0 });
    expect(apiPostMock).toHaveBeenCalledWith("/admin/push/test", {});
  });

  it("refuses an unauthenticated caller", async () => {
    authMock.mockResolvedValue(null);

    await expect(sendTestNotification()).rejects.toThrow("UNAUTHORIZED");
    expect(apiPostMock).not.toHaveBeenCalled();
  });
});
