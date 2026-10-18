export type PaymentLinkCurrency = "NGN" | "USDC" | "USDT";
export type PaymentLinkAmountType = "fixed" | "variable";
export type PaymentLinkFeeBearer = "customer" | "business";

export interface CreatePaymentLinkRequest {
  title: string;
  type: PaymentLinkAmountType;
  amount?: number;
  currency: PaymentLinkCurrency;
  description?: string;
  collectUserInfo?: boolean;
  feeBearer?: PaymentLinkFeeBearer;
  expiresAt?: string;
}

export interface CreatePaymentLinkOptions {
  /** Reuse the same value when retrying the same request. */
  idempotencyKey?: string;
}

export interface PaymentLinkResponse {
  id: string;
  reference: string;
  checkoutUrl: string;
  title: string;
  type: PaymentLinkAmountType;
  amount: number | null;
  currency: PaymentLinkCurrency;
  collectUserInfo: boolean;
  feeBearer: PaymentLinkFeeBearer;
  isActive: boolean;
  expiresAt?: string | null;
  createdAt?: string;
}

export interface FossaPayServerOptions {
  apiKey: string;
  apiBaseUrl?: string;
  checkoutBaseUrl?: string;
  fetch?: typeof globalThis.fetch;
}

export class FossaPayApiError extends Error {
  readonly status: number;
  readonly code?: string;
  readonly details?: unknown;

  constructor(message: string, status: number, code?: string, details?: unknown) {
    super(message);
    this.name = "FossaPayApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

interface ApiPaymentLink {
  id: string;
  paymentLink: string;
  title: string;
  type: PaymentLinkAmountType;
  amount: number | null;
  currency: PaymentLinkCurrency;
  collectUserInfo: boolean;
  feeBearer: PaymentLinkFeeBearer;
  isActive: boolean;
  expiresAt?: string | null;
  createdAt?: string;
}

interface ApiEnvelope<T> {
  success?: boolean;
  status?: string | boolean;
  message?: string;
  code?: string;
  data?: T;
}

function createIdempotencyKey(): string {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `fossapay-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export class FossaPay {
  readonly paymentLinks: {
    create: (
      request: CreatePaymentLinkRequest,
      options?: CreatePaymentLinkOptions,
    ) => Promise<PaymentLinkResponse>;
  };

  private readonly apiKey: string;
  private readonly apiBaseUrl: string;
  private readonly checkoutBaseUrl: string;
  private readonly fetcher: typeof globalThis.fetch;

  constructor(options: FossaPayServerOptions) {
    if (!options?.apiKey?.trim()) throw new Error("apiKey is required");
    const fetcher = options.fetch ?? globalThis.fetch;
    if (!fetcher) throw new Error("A Fetch API implementation is required");

    this.apiKey = options.apiKey.trim();
    this.apiBaseUrl = (options.apiBaseUrl ?? "https://api-production.fossapay.com/api/v1").replace(/\/$/, "");
    this.checkoutBaseUrl = (options.checkoutBaseUrl ?? "https://checkout.fossapay.com").replace(/\/$/, "");
    this.fetcher = fetcher;
    this.paymentLinks = { create: this.createPaymentLink };
  }

  private createPaymentLink = async (
    request: CreatePaymentLinkRequest,
    options: CreatePaymentLinkOptions = {},
  ): Promise<PaymentLinkResponse> => {
    if (request.type === "fixed" && (!request.amount || request.amount <= 0)) {
      throw new Error("A positive amount is required for fixed payment links");
    }

    const response = await this.fetcher(`${this.apiBaseUrl}/checkouts/payment-links`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": this.apiKey,
        "x-idempotency-key": options.idempotencyKey ?? createIdempotencyKey(),
      },
      body: JSON.stringify({
        ...request,
        collectUserInfo: request.collectUserInfo ?? false,
        feeBearer: request.feeBearer ?? "customer",
        payment_type: request.type === "fixed" ? "checkout" : "collection",
      }),
    });

    const body = (await response.json().catch(() => ({}))) as ApiEnvelope<ApiPaymentLink>;
    if (!response.ok || !body.data) {
      throw new FossaPayApiError(
        body.message ?? "Unable to create payment link",
        response.status,
        body.code,
        body,
      );
    }

    const link = body.data;
    return {
      id: link.id,
      reference: link.paymentLink,
      checkoutUrl: `${this.checkoutBaseUrl}/${link.paymentLink.toLowerCase()}`,
      title: link.title,
      type: link.type,
      amount: link.amount,
      currency: link.currency,
      collectUserInfo: link.collectUserInfo,
      feeBearer: link.feeBearer,
      isActive: link.isActive,
      expiresAt: link.expiresAt,
      createdAt: link.createdAt,
    };
  };
}
