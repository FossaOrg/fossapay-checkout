import { afterEach, describe, expect, it, vi } from "vitest";
import { FossaPayCheckout } from "../src/checkout";

describe("FossaPayCheckout", () => {
  afterEach(() => {
    document.body.innerHTML = "";
    document.body.style.overflow = "";
  });

  it("creates a secure embedded checkout URL", () => {
    const checkout = new FossaPayCheckout({
      paymentLink: "PAY_123",
      checkoutBaseUrl: "https://checkout.fossapay.com",
    });
    const url = new URL(checkout.getUrl());

    expect(url.pathname).toBe("/PAY_123");
    expect(url.searchParams.get("embedded")).toBe("1");
    expect(url.searchParams.has("parentOrigin")).toBe(false);
  });

  it("ignores messages from an untrusted origin", () => {
    const onSuccess = vi.fn();
    const checkout = new FossaPayCheckout({
      paymentLink: "PAY_123",
      displayMode: "inline",
      container: document.body,
      onSuccess,
    });
    checkout.open();
    const iframe = document.querySelector("iframe") as HTMLIFrameElement;

    window.dispatchEvent(
      new MessageEvent("message", {
        origin: "https://attacker.example",
        source: iframe.contentWindow,
        data: {
          source: "fossapay.checkout",
          version: 1,
          event: "checkout.success",
          data: { paymentLink: "PAY_123" },
        },
      }),
    );

    expect(onSuccess).not.toHaveBeenCalled();
    checkout.destroy();
  });

  it("dispatches trusted checkout events", () => {
    const onReady = vi.fn();
    const checkout = new FossaPayCheckout({
      paymentLink: "PAY_123",
      displayMode: "inline",
      container: document.body,
      onReady,
    });
    checkout.open();
    const iframe = document.querySelector("iframe") as HTMLIFrameElement;

    window.dispatchEvent(
      new MessageEvent("message", {
        origin: "https://checkout.fossapay.com",
        source: iframe.contentWindow,
        data: {
          source: "fossapay.checkout",
          version: 1,
          event: "checkout.ready",
          data: { paymentLink: "PAY_123" },
        },
      }),
    );

    expect(onReady).toHaveBeenCalledWith({ paymentLink: "PAY_123" });
    checkout.destroy();
  });
});
