export const FOSSAPAY_CHECKOUT_MESSAGE = "fossapay.checkout" as const;
export const FOSSAPAY_CHECKOUT_VERSION = 1 as const;

export type CheckoutDisplayMode = "modal" | "inline" | "redirect" | "new-tab";

export type CheckoutEventName =
  | "checkout.ready"
  | "checkout.success"
  | "checkout.failed"
  | "checkout.reversed"
  | "checkout.expired"
  | "checkout.closed";

export interface CheckoutEventPayload {
  paymentLink: string;
  message?: string | null;
  status?: string | null;
}

export interface CheckoutEvent {
  source: typeof FOSSAPAY_CHECKOUT_MESSAGE;
  version: typeof FOSSAPAY_CHECKOUT_VERSION;
  event: CheckoutEventName;
  data: CheckoutEventPayload;
}

export type CheckoutEventHandler = (data: CheckoutEventPayload) => void;

export interface FossaPayCheckoutOptions {
  /** Payment-link reference returned by FossaPay, or a complete hosted checkout URL. */
  paymentLink: string;
  /** Defaults to modal. */
  displayMode?: CheckoutDisplayMode;
  /** Defaults to https://checkout.fossapay.com. Useful for sandbox environments. */
  checkoutBaseUrl?: string;
  /** Required for inline mode. Accepts an element or a CSS selector. */
  container?: HTMLElement | string;
  iframeTitle?: string;
  className?: string;
  closeOnOverlayClick?: boolean;
  autoCloseOnSuccess?: boolean;
  onReady?: CheckoutEventHandler;
  onSuccess?: CheckoutEventHandler;
  onFailure?: CheckoutEventHandler;
  onReversed?: CheckoutEventHandler;
  onExpired?: CheckoutEventHandler;
  onClose?: CheckoutEventHandler;
  onEvent?: (event: CheckoutEvent) => void;
}

export interface CheckoutController {
  close: () => void;
  destroy: () => void;
  getUrl: () => string;
}
