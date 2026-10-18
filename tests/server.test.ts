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
});
