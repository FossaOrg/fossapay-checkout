import { isCheckoutEvent } from "./messages";
import {
  CheckoutController,
  CheckoutEvent,
  CheckoutEventPayload,
  FossaPayCheckoutOptions,
} from "./types";

const DEFAULT_CHECKOUT_URL = "https://checkout.fossapay.com";

function requireBrowser(): void {
  if (typeof window === "undefined" || typeof document === "undefined") {
    throw new Error("FossaPay Checkout can only be opened in a browser");
  }
}

function resolveContainer(container?: HTMLElement | string): HTMLElement {
  if (!container) {
    throw new Error("A container is required when displayMode is inline");
  }
  if (typeof container !== "string") return container;
  const element = document.querySelector<HTMLElement>(container);
  if (!element) throw new Error(`Checkout container not found: ${container}`);
  return element;
}

export class FossaPayCheckout implements CheckoutController {
  private readonly options: FossaPayCheckoutOptions;
  private readonly checkoutUrl: URL;
  private iframe: HTMLIFrameElement | null = null;
  private mountNode: HTMLElement | null = null;
  private closed = false;
  private previousBodyOverflow = "";

  constructor(options: FossaPayCheckoutOptions) {
    if (!options?.paymentLink?.trim()) {
      throw new Error("paymentLink is required");
    }
    this.options = { displayMode: "modal", ...options };
    this.checkoutUrl = this.createCheckoutUrl();
  }

  getUrl = (): string => this.checkoutUrl.toString();

  open = (): CheckoutController => {
    requireBrowser();
    if (this.iframe || this.mountNode) this.destroy();
    this.closed = false;
    const mode = this.options.displayMode ?? "modal";

    if (mode === "redirect") {
      window.location.assign(this.getUrl());
      return this;
    }
    if (mode === "new-tab") {
      const opened = window.open(this.getUrl(), "_blank");
      if (!opened) throw new Error("The checkout window was blocked by the browser");
      opened.opener = null;
      return this;
    }

    window.addEventListener("message", this.handleMessage);
    this.iframe = this.createIframe();

    if (mode === "inline") {
      this.mountNode = resolveContainer(this.options.container);
      this.mountNode.appendChild(this.iframe);
      return this;
    }

    this.mountNode = this.createModal(this.iframe);
    document.body.appendChild(this.mountNode);
    this.previousBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return this;
  };

  close = (): void => {
    if (this.closed) return;
    const payload = this.basePayload("Checkout closed by the customer");
    this.destroy();
    this.options.onClose?.(payload);
  };

  destroy = (): void => {
    if (this.closed) return;
    this.closed = true;
    window.removeEventListener("message", this.handleMessage);
    if (this.options.displayMode === "inline") {
      this.iframe?.remove();
    } else {
      this.mountNode?.remove();
      document.body.style.overflow = this.previousBodyOverflow;
    }
    this.iframe = null;
    this.mountNode = null;
  };

  private createCheckoutUrl(): URL {
    const configuredBase = this.options.checkoutBaseUrl ?? DEFAULT_CHECKOUT_URL;
    const base = new URL(configuredBase);
    let url: URL;
    try {
      const supplied = new URL(this.options.paymentLink);
      if (supplied.origin !== base.origin) {
        throw new Error("The payment link must use the configured checkout origin");
      }
      url = supplied;
    } catch (error) {
      if (
        error instanceof Error &&
        error.message === "The payment link must use the configured checkout origin"
      ) {
        throw error;
      }
      const reference = this.options.paymentLink.trim().replace(/^\/+|\/+$/g, "");
      url = new URL(`/${encodeURIComponent(reference)}`, base);
    }

    const mode = this.options.displayMode ?? "modal";
    if (mode === "modal" || mode === "inline") {
      if (typeof window !== "undefined") {
        url.searchParams.set("embedded", "1");
      }
    }
    return url;
  }

  private createIframe(): HTMLIFrameElement {
    const iframe = document.createElement("iframe");
    iframe.src = this.getUrl();
    iframe.title = this.options.iframeTitle ?? "FossaPay secure checkout";
    iframe.className = this.options.className ?? "";
    iframe.allow = "payment; clipboard-write";
    iframe.referrerPolicy = "strict-origin-when-cross-origin";
    iframe.style.width = "100%";
    iframe.style.height = "100%";
    iframe.style.border = "0";
    iframe.style.background = "#f9fafc";
    return iframe;
  }

  private createModal(iframe: HTMLIFrameElement): HTMLElement {
    const overlay = document.createElement("div");
    overlay.setAttribute("data-fossapay-checkout", "modal");
    Object.assign(overlay.style, {
      position: "fixed",
      inset: "0",
      zIndex: "2147483647",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "16px",
      background: "rgba(10, 25, 41, 0.52)",
    });

    const panel = document.createElement("div");
    Object.assign(panel.style, {
      position: "relative",
      width: "min(100%, 620px)",
      height: "min(900px, calc(100dvh - 32px))",
      overflow: "hidden",
      borderRadius: "12px",
      background: "#f9fafc",
      boxShadow: "0 24px 80px rgba(0, 0, 0, 0.24)",
    });

    const close = document.createElement("button");
    close.type = "button";
    close.setAttribute("aria-label", "Close checkout");
    close.textContent = "×";
    Object.assign(close.style, {
      position: "absolute",
      top: "12px",
      right: "12px",
      zIndex: "2",
      width: "36px",
      height: "36px",
      border: "1px solid #e5e7eb",
      borderRadius: "999px",
      background: "#ffffff",
      color: "#374151",
      fontSize: "24px",
      lineHeight: "30px",
      cursor: "pointer",
    });
    close.addEventListener("click", this.close);

    if (this.options.closeOnOverlayClick !== false) {
      overlay.addEventListener("click", (event) => {
        if (event.target === overlay) this.close();
      });
    }
    panel.append(close, iframe);
    overlay.appendChild(panel);
    return overlay;
  }

  private handleMessage = (message: MessageEvent): void => {
    if (
      message.origin !== this.checkoutUrl.origin ||
      message.source !== this.iframe?.contentWindow ||
      !isCheckoutEvent(message.data)
    ) {
      return;
    }

    const event = message.data;
    if (
      this.normalizePaymentLink(event.data.paymentLink) !==
      this.normalizePaymentLink(this.options.paymentLink)
    ) {
      return;
    }

    this.options.onEvent?.(event);
    this.dispatch(event);
  };

  private normalizePaymentLink(value: string): string {
    const trimmed = value.trim();

    try {
      const url = new URL(trimmed);
      return decodeURIComponent(url.pathname.replace(/^\/+|\/+$/g, "")).toLowerCase();
    } catch {
      return decodeURIComponent(trimmed.replace(/^\/+|\/+$/g, "")).toLowerCase();
    }
  }

  private dispatch(event: CheckoutEvent): void {
    switch (event.event) {
      case "checkout.ready":
        this.options.onReady?.(event.data);
        break;
      case "checkout.success":
        this.options.onSuccess?.(event.data);
        if (this.options.autoCloseOnSuccess) this.destroy();
        break;
      case "checkout.failed":
        this.options.onFailure?.(event.data);
        break;
      case "checkout.reversed":
        this.options.onReversed?.(event.data);
        break;
      case "checkout.expired":
        this.options.onExpired?.(event.data);
        break;
      case "checkout.closed":
        this.destroy();
        this.options.onClose?.(event.data);
        break;
    }
  }

  private basePayload(message: string): CheckoutEventPayload {
    return { paymentLink: this.options.paymentLink, message };
  }
}

export function openCheckout(
  options: FossaPayCheckoutOptions,
): CheckoutController {
  const checkout = new FossaPayCheckout(options);
  return checkout.open();
}
