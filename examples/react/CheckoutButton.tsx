import { FossaPayCheckoutButton } from "@fossapay/checkout/react";

export function CheckoutButton() {
  return (
    <FossaPayCheckoutButton
      checkout={{
        paymentLink: "YOUR_PAYMENT_LINK",
        onSuccess: (payment) => console.log(payment),
      }}
    >
      Pay now
    </FossaPayCheckoutButton>
  );
}
