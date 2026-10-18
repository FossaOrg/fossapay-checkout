import { FossaPayCheckoutButton } from "@fossapay/checkout/react";

export function CheckoutButton() {
  return (
    <FossaPayCheckoutButton
      checkout={{
        paymentLink: checkoutUrlFromYourServer,
        onSuccess: (payment) => console.log(payment),
      }}
    >
      Pay now
    </FossaPayCheckoutButton>
  );
}
