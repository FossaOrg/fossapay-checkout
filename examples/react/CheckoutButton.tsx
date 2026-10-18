import { FossaPayCheckoutButton } from "@fossapay/checkout/react";

export interface CheckoutButtonProps {
  checkoutUrl: string;
}

export function CheckoutButton({ checkoutUrl }: CheckoutButtonProps) {
  return (
    <FossaPayCheckoutButton
      checkout={{
        paymentLink: checkoutUrl,
        onSuccess: (payment) => console.log(payment),
      }}
    >
      Pay now
    </FossaPayCheckoutButton>
  );
}
