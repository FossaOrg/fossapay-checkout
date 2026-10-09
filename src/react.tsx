import React, {
  ButtonHTMLAttributes,
  forwardRef,
  useCallback,
  useEffect,
  useRef,
} from "react";
import { FossaPayCheckout } from "./checkout";
import { CheckoutController, FossaPayCheckoutOptions } from "./types";

export function useFossaPayCheckout(options: FossaPayCheckoutOptions) {
  const checkoutRef = useRef<CheckoutController | null>(null);
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const open = useCallback(() => {
    checkoutRef.current?.destroy();
    const checkout = new FossaPayCheckout(optionsRef.current);
    checkoutRef.current = checkout.open();
    return checkoutRef.current;
  }, []);

  const close = useCallback(() => checkoutRef.current?.close(), []);

  useEffect(() => () => checkoutRef.current?.destroy(), []);

  return { open, close };
}

export interface FossaPayCheckoutButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement> {
  checkout: FossaPayCheckoutOptions;
}

export const FossaPayCheckoutButton = forwardRef<
  HTMLButtonElement,
  FossaPayCheckoutButtonProps
>(function FossaPayCheckoutButton(
  { checkout, children = "Pay with FossaPay", onClick, ...buttonProps },
  ref,
) {
  const { open } = useFossaPayCheckout(checkout);

  return (
    <button
      {...buttonProps}
      ref={ref}
      type={buttonProps.type ?? "button"}
      onClick={(event) => {
        onClick?.(event);
        if (!event.defaultPrevented) open();
      }}
    >
      {children}
    </button>
  );
});

export type {
  CheckoutController,
  CheckoutEvent,
  CheckoutEventPayload,
  FossaPayCheckoutOptions,
} from "./types";
