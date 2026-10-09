import {
  CheckoutEvent,
  CheckoutEventName,
  FOSSAPAY_CHECKOUT_MESSAGE,
  FOSSAPAY_CHECKOUT_VERSION,
} from "./types";

const checkoutEvents = new Set<CheckoutEventName>([
  "checkout.ready",
  "checkout.success",
  "checkout.failed",
  "checkout.reversed",
  "checkout.expired",
  "checkout.closed",
]);

export function isCheckoutEvent(value: unknown): value is CheckoutEvent {
  if (!value || typeof value !== "object") return false;
  const event = value as Partial<CheckoutEvent>;
  return (
    event.source === FOSSAPAY_CHECKOUT_MESSAGE &&
    event.version === FOSSAPAY_CHECKOUT_VERSION &&
    typeof event.event === "string" &&
    checkoutEvents.has(event.event as CheckoutEventName) &&
    Boolean(event.data) &&
    typeof event.data === "object"
  );
}
