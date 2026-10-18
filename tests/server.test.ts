import { createHmac } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import { FossaPay, FossaPayApiError } from "../src/server";

describe("FossaPay server client", () => {
  it("creates a payment link with API-key authentication", async () => {
    const fetcher = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          success: true,
          data: {
            id: "link-id",
            paymentLink: "LINK_REFERENCE",
            title: "Invoice",
            type: "fixed",
            amount: 5000,
            currency: "NGN",
            collectUserInfo: true,
            feeBearer: "customer",
            isActive: true,
          },
        }),
        { status: 201, headers: { "content-type": "application/json" } },
      ),
    );
    const fossapay = new FossaPay({
      apiKey: "test-key",
      fetch: fetcher,
    });

    const link = await fossapay.paymentLinks.create(
      {
        title: "Invoice",
        type: "fixed",
        amount: 5000,
        currency: "NGN",
        collectUserInfo: true,
      },
      { idempotencyKey: "order-100" },
    );

    expect(link.checkoutUrl).toBe(
      "https://checkout.fossapay.com/link_reference",
    );
    expect(fetcher).toHaveBeenCalledWith(
      "https://api-production.fossapay.com/api/v1/checkouts/payment-links",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "x-api-key": "test-key",
          "x-idempotency-key": "order-100",
        }),
      }),
    );
  });

  it("surfaces API errors", async () => {
    const fossapay = new FossaPay({
      apiKey: "test-key",
      fetch: vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ message: "Invalid API key" }), {
          status: 401,
        }),
      ),
    });

    await expect(
      fossapay.paymentLinks.create({
        title: "Invoice",
        type: "fixed",
        amount: 5000,
        currency: "NGN",
      }),
    ).rejects.toBeInstanceOf(FossaPayApiError);
  });

  it("creates and retrieves checkout sessions", async () => {
    const checkout = {
      id: "checkout-id",
      reference: "ORDER-100",
      status: "pending",
      amount: "5000.00",
    };
    const fetcher = vi.fn().mockImplementation(() =>
      Promise.resolve(
        new Response(JSON.stringify({ success: true, data: checkout }), {
          status: 200,
        }),
      ),
    );
    const fossapay = new FossaPay({ apiKey: "test-key", fetch: fetcher });

    await fossapay.checkouts.create(
      { amount: 5000, currency: "NGN", reference: "ORDER-100" },
      { idempotencyKey: "checkout-100" },
    );
    await fossapay.checkouts.retrieve("checkout-id");
    await fossapay.checkouts.retrieveByReference("ORDER-100");
    await fossapay.checkouts.expire("checkout-id");

    expect(fetcher).toHaveBeenNthCalledWith(
      1,
      "https://api-production.fossapay.com/api/v1/checkouts",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "x-idempotency-key": "checkout-100",
        }),
      }),
    );
    expect(fetcher).toHaveBeenNthCalledWith(
      3,
      "https://api-production.fossapay.com/api/v1/checkouts/reference/ORDER-100",
      expect.any(Object),
    );
    expect(fetcher).toHaveBeenNthCalledWith(
      4,
      "https://api-production.fossapay.com/api/v1/checkouts/checkout-id/expire",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("retrieves and changes activation state without exposing an update method", async () => {
    const link = {
      id: "link-id",
      paymentLink: "LINK_REFERENCE",
      title: "Invoice",
      type: "fixed",
      amount: "5000.000",
      currency: "NGN",
      collectUserInfo: false,
      feeBearer: "customer",
      isActive: true,
    };
    const fetcher = vi.fn().mockImplementation(() =>
      Promise.resolve(
        new Response(JSON.stringify({ success: true, data: link }), {
          status: 200,
        }),
      ),
    );
    const fossapay = new FossaPay({ apiKey: "test-key", fetch: fetcher });

    const retrieved = await fossapay.paymentLinks.retrieve("LINK_REFERENCE");
    await fossapay.paymentLinks.activate("LINK_REFERENCE");
    await fossapay.paymentLinks.deactivate("LINK_REFERENCE");

    expect(retrieved.amount).toBe(5000);
    expect(fossapay.paymentLinks).not.toHaveProperty("update");
    expect(fetcher).toHaveBeenLastCalledWith(
      "https://api-production.fossapay.com/api/v1/checkouts/payment-links/LINK_REFERENCE/deactivate",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("verifies and parses a webhook from the exact raw body", () => {
    const payload = JSON.stringify({
      eventId: "evt_123",
      eventType: "checkout.completed",
      data: { checkoutId: "checkout-id" },
      timestamp: "2026-10-18T12:00:00.000Z",
    });
    const signature = createHmac("sha256", "webhook-secret")
      .update(payload)
      .digest("hex");
    const fossapay = new FossaPay({ apiKey: "test-key", fetch: vi.fn() });

    expect(
      fossapay.webhooks.verifySignature(
        payload,
        signature,
        "webhook-secret",
      ),
    ).toBe(true);
    expect(
      fossapay.webhooks.constructEvent({
        payload,
        signature,
        secret: "webhook-secret",
      }),
    ).toEqual(JSON.parse(payload));
    expect(() =>
      fossapay.webhooks.constructEvent({
        payload,
        signature: "0".repeat(64),
        secret: "webhook-secret",
      }),
    ).toThrow("Invalid FossaPay webhook signature");
  });
});
