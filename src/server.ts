import { createHmac, timingSafeEqual } from "node:crypto";

export type PaymentLinkCurrency = "NGN" | "USDC" | "USDT";
export type PaymentLinkAmountType = "fixed" | "variable";
export type PaymentLinkFeeBearer = "customer" | "business";
export type CheckoutStatus = "pending" | "processing" | "completed" | "failed" | "expired" | "reversed";

export interface CreatePaymentLinkRequest {
  title: string;
  type: PaymentLinkAmountType;
  amount?: number;
  currency: PaymentLinkCurrency;
  description?: string;
  collectUserInfo?: boolean;
  feeBearer?: PaymentLinkFeeBearer;
  expiresAt?: string;
  /** Reusable NGN split code returned by fossapay.splits.create(). */
  splitCode?: string;
}

export interface IdempotencyOptions {
  /** Reuse the same value when retrying the same request. */
  idempotencyKey?: string;
}

export type CreatePaymentLinkOptions = IdempotencyOptions;

export interface PaymentLinkResponse {
  id: string;
  reference: string;
  checkoutUrl: string;
  title: string;
  type: PaymentLinkAmountType;
  amount: number | null;
  currency: PaymentLinkCurrency;
  description?: string | null;
  collectUserInfo: boolean;
  feeBearer: PaymentLinkFeeBearer;
  isActive: boolean;
  expiresAt?: string | null;
  createdAt?: string;
  split?: { code: string; status: "attached" } | null;
}

export interface CheckoutCustomer {
  name?: string;
  email?: string;
  phoneNumber?: string;
}

export interface CreateCheckoutRequest {
  amount: number;
  currency: "NGN";
  reference: string;
  feeBearer?: "customer" | "merchant";
  customer?: CheckoutCustomer;
  metadata?: Record<string, unknown>;
  description?: string;
  splitId?: string;
  /** Reusable NGN split code. Prefer this over the legacy splitId. */
  splitCode?: string;
}

export interface CheckoutResponse {
  id: string;
  reference: string;
  status: CheckoutStatus;
  amount: string;
  fee: string;
  amountPayable: string;
  settlementAmount: string;
  feeBearer: "customer" | "merchant";
  currency: "NGN";
  account: {
    type: "temporary" | "permanent" | "order_wallet";
    bankName: string;
    accountName: string;
    accountNumber: string;
    expiresAt: string | null;
  };
  customer: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
  transactionId?: string | null;
  providerCheckoutReference?: string | null;
  expiresAt: string;
  completedAt?: string | null;
  failedAt?: string | null;
  reversedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  split?: { code: string; version: number; status: "attached" } | null;
}

export type SplitType = "percentage" | "flat";
export type SplitCollectionType = "checkout" | "direct_deposit";
export type SplitFeePayer = "master_wallet" | "evenly_distributed" | "specific_recipient";
export type SplitRecipientType = "subaccount" | "external_bank";

export interface CreateSplitRequest {
  name: string;
  type: SplitType;
  currency: "NGN";
  collectionTypes: SplitCollectionType[];
  minimumPaymentAmount?: string;
}

export interface UpdateSplitRequest {
  name?: string;
  collectionTypes?: SplitCollectionType[];
  minimumPaymentAmount?: string;
  feePayer?: SplitFeePayer;
  feePayerRecipientId?: string | null;
}

export interface AddSplitRecipientRequest {
  type: SplitRecipientType;
  allocation: string;
  virtualAccountId?: string;
  accountNumber?: string;
  bankCode?: string;
}

export interface SplitRecipient {
  id: string;
  type: SplitRecipientType;
  virtualAccountId: string | null;
  accountNumber: string;
  accountName: string;
  bankCode: string | null;
  bankName: string | null;
  allocation: string;
}

export interface TransactionSplit {
  id: string;
  splitCode: string;
  name: string;
  currency: "NGN";
  type: SplitType;
  status: "draft" | "active" | "paused";
  collectionTypes: SplitCollectionType[];
  minimumPaymentAmount: string | null;
  feePayer: SplitFeePayer;
  feePayerRecipientId: string | null;
  version: number;
  recipientCount?: number;
  recipients?: SplitRecipient[];
  createdAt: string;
  updatedAt: string;
}

export interface SplitPreview {
  eligible: boolean;
  reason: string | null;
  grossAmount: string;
  platformFee: string;
  distributableAmount: string;
  allocations: Array<{ recipientId: string; amount: string; platformFeeShare: string }>;
  masterRemainder: string;
  feePayer: SplitFeePayer;
}

export interface UpdateSplitSourcesRequest {
  productIds?: string[];
  storeIds?: string[];
  paymentLinkIds?: string[];
}

export interface SplitSourceItem {
  id: string;
  name: string;
  status: string;
  splitId: string | null;
  code?: string;
}

export interface SplitSources {
  products: SplitSourceItem[];
  stores: SplitSourceItem[];
  paymentLinks: SplitSourceItem[];
}

export interface FossaPayWebhookEvent<T = Record<string, unknown>> {
  eventId: string;
  eventType: string;
  data: T;
  timestamp: string;
}

export interface ConstructWebhookEventOptions {
  payload: string;
  signature: string;
  secret: string;
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
  amount: number | string | null;
  currency: PaymentLinkCurrency;
  description?: string | null;
  collectUserInfo: boolean;
  feeBearer: PaymentLinkFeeBearer;
  isActive: boolean;
  expiresAt?: string | null;
  createdAt?: string;
  split?: { code: string; status: "attached" } | null;
}

interface ApiEnvelope<T> {
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
    create: (request: CreatePaymentLinkRequest, options?: CreatePaymentLinkOptions) => Promise<PaymentLinkResponse>;
    retrieve: (reference: string) => Promise<PaymentLinkResponse>;
    list: () => Promise<PaymentLinkResponse[]>;
    activate: (reference: string) => Promise<PaymentLinkResponse>;
    deactivate: (reference: string) => Promise<PaymentLinkResponse>;
  };
  readonly checkouts: {
    create: (request: CreateCheckoutRequest, options?: IdempotencyOptions) => Promise<CheckoutResponse>;
    retrieve: (id: string) => Promise<CheckoutResponse>;
    retrieveByReference: (reference: string) => Promise<CheckoutResponse>;
    expire: (id: string) => Promise<CheckoutResponse>;
  };
  readonly splits: {
    create: (request: CreateSplitRequest) => Promise<TransactionSplit>;
    list: () => Promise<TransactionSplit[]>;
    retrieve: (splitCode: string) => Promise<TransactionSplit>;
    update: (splitCode: string, request: UpdateSplitRequest) => Promise<TransactionSplit>;
    addRecipient: (splitCode: string, request: AddSplitRecipientRequest) => Promise<SplitRecipient>;
    updateRecipient: (splitCode: string, recipientId: string, allocation: string) => Promise<SplitRecipient>;
    removeRecipient: (splitCode: string, recipientId: string) => Promise<{ deleted: boolean }>;
    preview: (splitCode: string, amount: string, collectionType: SplitCollectionType) => Promise<SplitPreview>;
    activate: (splitCode: string) => Promise<TransactionSplit>;
    pause: (splitCode: string) => Promise<TransactionSplit>;
    listSources: (splitCode: string) => Promise<SplitSources>;
    updateSources: (splitCode: string, request: UpdateSplitSourcesRequest) => Promise<SplitSources>;
    listTransactions: (splitCode: string) => Promise<Record<string, unknown>[]>;
  };
  readonly webhooks: {
    verifySignature: (payload: string, signature: string, secret: string) => boolean;
    constructEvent: <T = Record<string, unknown>>(options: ConstructWebhookEventOptions) => FossaPayWebhookEvent<T>;
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
    this.paymentLinks = {
      create: this.createPaymentLink,
      retrieve: this.retrievePaymentLink,
      list: this.listPaymentLinks,
      activate: (reference) => this.setPaymentLinkActive(reference, true),
      deactivate: (reference) => this.setPaymentLinkActive(reference, false),
    };
    this.checkouts = {
      create: this.createCheckout,
      retrieve: (id) => this.request<CheckoutResponse>(`/checkouts/${encodeURIComponent(id)}`),
      retrieveByReference: (reference) => this.request<CheckoutResponse>(`/checkouts/reference/${encodeURIComponent(reference)}`),
      expire: (id) => this.request<CheckoutResponse>(`/checkouts/${encodeURIComponent(id)}/expire`, { method: "POST" }),
    };
    this.splits = {
      create: (request) => this.request<TransactionSplit>("/splits", { method: "POST", body: JSON.stringify(request) }),
      list: () => this.request<TransactionSplit[]>("/splits"),
      retrieve: (code) => this.request<TransactionSplit>(`/splits/${encodeURIComponent(code)}`),
      update: (code, request) => this.request<TransactionSplit>(`/splits/${encodeURIComponent(code)}`, { method: "PATCH", body: JSON.stringify(request) }),
      addRecipient: (code, request) => this.request<SplitRecipient>(`/splits/${encodeURIComponent(code)}/recipients`, { method: "POST", body: JSON.stringify(request) }),
      updateRecipient: (code, recipientId, allocation) => this.request<SplitRecipient>(`/splits/${encodeURIComponent(code)}/recipients/${encodeURIComponent(recipientId)}`, { method: "PATCH", body: JSON.stringify({ allocation }) }),
      removeRecipient: (code, recipientId) => this.request<{ deleted: boolean }>(`/splits/${encodeURIComponent(code)}/recipients/${encodeURIComponent(recipientId)}`, { method: "DELETE" }),
      preview: (code, amount, collectionType) => this.request<SplitPreview>(`/splits/${encodeURIComponent(code)}/preview?amount=${encodeURIComponent(amount)}&collectionType=${encodeURIComponent(collectionType)}`),
      activate: (code) => this.request<TransactionSplit>(`/splits/${encodeURIComponent(code)}/activate`, { method: "POST" }),
      pause: (code) => this.request<TransactionSplit>(`/splits/${encodeURIComponent(code)}/pause`, { method: "POST" }),
      listSources: (code) => this.request<SplitSources>(`/splits/${encodeURIComponent(code)}/sources`),
      updateSources: (code, request) => this.request<SplitSources>(`/splits/${encodeURIComponent(code)}/sources`, { method: "PUT", body: JSON.stringify(request) }),
      listTransactions: (code) => this.request<Record<string, unknown>[]>(`/splits/${encodeURIComponent(code)}/transactions`),
    };
    this.webhooks = {
      verifySignature: this.verifyWebhookSignature,
      constructEvent: this.constructWebhookEvent,
    };
  }

  private request = async <T>(path: string, init: RequestInit = {}): Promise<T> => {
    const response = await this.fetcher(`${this.apiBaseUrl}${path}`, {
      ...init,
      headers: { "content-type": "application/json", "x-api-key": this.apiKey, ...init.headers },
    });
    const body = (await response.json().catch(() => ({}))) as ApiEnvelope<T>;
    if (!response.ok || body.data === undefined) {
      throw new FossaPayApiError(body.message ?? "FossaPay API request failed", response.status, body.code, body);
    }
    return body.data;
  };

  private mapPaymentLink = (link: ApiPaymentLink): PaymentLinkResponse => ({
    id: link.id,
    reference: link.paymentLink,
    checkoutUrl: `${this.checkoutBaseUrl}/${link.paymentLink.toLowerCase()}`,
    title: link.title,
    type: link.type,
    amount: link.amount == null ? null : Number(link.amount),
    currency: link.currency,
    description: link.description,
    collectUserInfo: link.collectUserInfo,
    feeBearer: link.feeBearer,
    isActive: link.isActive,
    expiresAt: link.expiresAt,
    createdAt: link.createdAt,
    split: link.split ?? null,
  });

  private createPaymentLink = async (request: CreatePaymentLinkRequest, options: CreatePaymentLinkOptions = {}) => {
    if (request.type === "fixed" && (!request.amount || request.amount <= 0)) {
      throw new Error("A positive amount is required for fixed payment links");
    }
    const link = await this.request<ApiPaymentLink>("/checkouts/payment-links", {
      method: "POST",
      headers: { "x-idempotency-key": options.idempotencyKey ?? createIdempotencyKey() },
      body: JSON.stringify({
        ...request,
        collectUserInfo: request.collectUserInfo ?? false,
        feeBearer: request.feeBearer ?? "customer",
        payment_type: request.type === "fixed" ? "checkout" : "collection",
      }),
    });
    return this.mapPaymentLink(link);
  };

  private retrievePaymentLink = async (reference: string) =>
    this.mapPaymentLink(await this.request<ApiPaymentLink>(`/checkouts/payment-links/${encodeURIComponent(reference)}`));

  private listPaymentLinks = async () =>
    (await this.request<ApiPaymentLink[]>("/checkouts/payment-links")).map(this.mapPaymentLink);

  private setPaymentLinkActive = async (reference: string, active: boolean) =>
    this.mapPaymentLink(await this.request<ApiPaymentLink>(
      `/checkouts/payment-links/${encodeURIComponent(reference)}/${active ? "activate" : "deactivate"}`,
      { method: "POST" },
    ));

  private createCheckout = async (request: CreateCheckoutRequest, options: IdempotencyOptions = {}) => {
    if (!Number.isInteger(request.amount) || request.amount <= 0) {
      throw new Error("Checkout amount must be a positive integer");
    }
    return this.request<CheckoutResponse>("/checkouts", {
      method: "POST",
      headers: { "x-idempotency-key": options.idempotencyKey ?? createIdempotencyKey() },
      body: JSON.stringify({ ...request, feeBearer: request.feeBearer ?? "customer" }),
    });
  };

  private verifyWebhookSignature = (payload: string, signature: string, secret: string): boolean => {
    if (!payload || !secret || !/^[a-f\d]{64}$/i.test(signature)) return false;
    const expected = createHmac("sha256", secret).update(payload).digest();
    const received = Buffer.from(signature, "hex");
    return received.length === expected.length && timingSafeEqual(received, expected);
  };

  private constructWebhookEvent = <T = Record<string, unknown>>({ payload, signature, secret }: ConstructWebhookEventOptions) => {
    if (!this.verifyWebhookSignature(payload, signature, secret)) {
      throw new Error("Invalid FossaPay webhook signature");
    }
    return JSON.parse(payload) as FossaPayWebhookEvent<T>;
  };
}
