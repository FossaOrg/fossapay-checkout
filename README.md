# FossaPay Checkout SDK

The official browser SDK for opening [FossaPay](https://fossapay.com) hosted
checkout from web applications. Payment collection remains inside FossaPay's
hosted checkout; the SDK only controls how that checkout is presented.

## Install

```bash
npm install @fossapay/checkout
```

## JavaScript and TypeScript

```ts
import { openCheckout } from "@fossapay/checkout";

const checkout = openCheckout({
  paymentLink: "YOUR_PAYMENT_LINK",
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

export function PayButton() {
  return (
    <FossaPayCheckoutButton
      checkout={{
        paymentLink: "YOUR_PAYMENT_LINK",
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
  document.querySelector("#pay").addEventListener("click", function () {
    FossaPayCheckout.open({
      paymentLink: "YOUR_PAYMENT_LINK",
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

Browser events are a user-interface convenience and are not proof of payment.
The embedded checkout intentionally does not send transaction IDs, amounts, or
payment references to the parent page. Confirm payment on your backend or from
a verified FossaPay webhook before fulfilling an order.

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

- Messages are accepted only from the configured checkout origin and the exact
  iframe created by this SDK.
- The hosted checkout derives the parent origin from the browser referrer and
  sends only lifecycle status events to that origin.
- Never put a FossaPay secret key in browser code.
- Always verify payment server-side before delivering value.

## Local development

```bash
npm install
npm run typecheck
npm test
npm run build
```

## Publishing

Maintainers should confirm the package name and npm organization access, update
the version, run the verification commands above, and publish manually:

```bash
npm publish --access public
```

## License

MIT
