# FossaPay Checkout SDK

Add [FossaPay Checkout](https://fossapay.com) to your web application using a
modal, inline frame, redirect, or new browser tab.

## Install

```bash
npm install @fossapay/checkout
```

## Create a payment link

Create payment links from your application backend with a FossaPay API key.
API keys are available under **Settings → API Keys** in the FossaPay Dashboard.

```ts
import { FossaPay } from "@fossapay/checkout/server";

const fossapay = new FossaPay({
  apiKey: process.env.FOSSAPAY_API_KEY!,
});

// Run this in an authenticated endpoint in your application.
const paymentLink = await fossapay.paymentLinks.create(
  {
    title: "Order 10025",
    type: "fixed",
    amount: 25000,
    currency: "NGN",
    description: "Payment for order 10025",
    collectUserInfo: true,
    feeBearer: "customer",
  },
  {
    idempotencyKey: "order-10025",
  },
);

// Send only this URL to your frontend.
return { checkoutUrl: paymentLink.checkoutUrl };
```

Keep the API key on your server. Return `paymentLink.checkoutUrl` or
`paymentLink.reference` to your frontend and open it with the browser SDK.
Fixed payment links are reusable and can accept payments from multiple
customers.

Payment links are immutable after creation. They can be retrieved, listed,
activated, or deactivated:

```ts
const link = await fossapay.paymentLinks.retrieve("LINK_REFERENCE");
const links = await fossapay.paymentLinks.list();
await fossapay.paymentLinks.deactivate(link.reference);
await fossapay.paymentLinks.activate(link.reference);
```

## Create an order checkout

Use a checkout session for a single order with your own unique reference:

```ts
const checkout = await fossapay.checkouts.create(
  {
    reference: "ORDER-10025",
    amount: 25000,
    currency: "NGN",
    feeBearer: "customer",
    customer: { email: "customer@example.com" },
    metadata: { orderId: "10025" },
  },
  { idempotencyKey: "checkout-order-10025" },
);

const current = await fossapay.checkouts.retrieve(checkout.id);
const sameCheckout = await fossapay.checkouts.retrieveByReference("ORDER-10025");
await fossapay.checkouts.expire(checkout.id);
```

## Verify webhooks

Pass the unmodified raw HTTP request body to `constructEvent`. Parsing and then
serializing the body again can invalidate its signature.
Use the `x-fossapay-signature-v2` header; the unversioned signature header is
retained for integrations using the legacy signing format.

```ts
const event = fossapay.webhooks.constructEvent({
  payload: rawRequestBody,
  signature: request.headers["x-fossapay-signature-v2"],
  secret: process.env.FOSSAPAY_WEBHOOK_SECRET!,
});

if (event.eventType === "checkout.completed") {
  console.log(event.data);
}
```

## JavaScript and TypeScript

```ts
import { openCheckout } from "@fossapay/checkout";

const response = await fetch("/api/checkout", { method: "POST" });
const { checkoutUrl } = await response.json();

const checkout = openCheckout({
  paymentLink: checkoutUrl,
  onSuccess(event) {
    console.log("Checkout completed", event.status);
    // Confirm the payment on your server or from a signed webhook.
  },
  onClose() {
    console.log("Checkout closed");
  },
});

// Close it from your application when needed.
checkout.close();
```

## React

```tsx
import { FossaPayCheckoutButton } from "@fossapay/checkout/react";

export function PayButton({ checkoutUrl }: { checkoutUrl: string }) {
  return (
    <FossaPayCheckoutButton
      checkout={{
        paymentLink: checkoutUrl,
        onSuccess: () => {
          // Ask your server for the final transaction status.
        },
      }}
    >
      Pay now
    </FossaPayCheckoutButton>
  );
}
```

## Script tag

```html
<script src="https://unpkg.com/@fossapay/checkout/dist/browser/browser.global.js"></script>
<button id="pay">Pay now</button>
<script>
  document.querySelector("#pay").addEventListener("click", async function () {
    const response = await fetch("/api/checkout", { method: "POST" });
    const { checkoutUrl } = await response.json();

    FossaPayCheckout.open({
      paymentLink: checkoutUrl,
      onSuccess: function (event) {
        console.log(event.status);
      },
    });
  });
</script>
```

## Presentation modes

```ts
openCheckout({ paymentLink, displayMode: "modal" });
openCheckout({ paymentLink, displayMode: "redirect" });
openCheckout({ paymentLink, displayMode: "new-tab" });
openCheckout({
  paymentLink,
  displayMode: "inline",
  container: "#checkout-container",
});
```

`modal` is the default.

## Events

The hosted checkout can emit:

- `checkout.ready`
- `checkout.success`
- `checkout.failed`
- `checkout.reversed`
- `checkout.expired`
- `checkout.closed`

Use `onReady`, `onSuccess`, `onFailure`, `onReversed`, `onExpired`, `onClose`,
or the general `onEvent` callback.

Use checkout events to update your interface. Confirm a successful payment on
your server or through a verified FossaPay webhook before fulfilling an order.

## Configuration

| Option | Type | Description |
| --- | --- | --- |
| `paymentLink` | `string` | Required payment-link reference or complete checkout URL. |
| `displayMode` | `modal \| inline \| redirect \| new-tab` | Checkout presentation. |
| `checkoutBaseUrl` | `string` | Hosted checkout origin. Defaults to production. |
| `container` | `HTMLElement \| string` | Required for inline checkout. |
| `closeOnOverlayClick` | `boolean` | Defaults to `true`. |
| `autoCloseOnSuccess` | `boolean` | Close the frame after a success event. |
| `onEvent` | `(event) => void` | Receives every checkout lifecycle event. |

## Security

- Never put a FossaPay secret key in browser code.
- Always verify payment server-side before delivering value.
- Keep the SDK updated to the latest supported version.

## Local development

```bash
npm install
npm run typecheck
npm test
npm run build
```

## License

MIT
