/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type IntegrationStatus = 'CONNECTED' | 'NOT_CONNECTED' | 'ARCHITECTURE_READY_NOT_CONNECTED';

export interface PaymentCheckoutParams {
  tenantId: string;
  customerName: string;
  customerEmail: string;
  planId: string;
  planName: string;
  billingCycle: 'Monthly' | 'Yearly';
  amount: number;
  vatAmount: number;
  totalAmount: number;
  currency: string;
}

export interface PaymentCheckoutResult {
  success: boolean;
  transactionId?: string;
  referenceNumber?: string;
  paymentMethod: string;
  statusText: string;
  isGatewayConnected: boolean;
  errorMessage?: string;
}

export interface PaymentProvider {
  providerId: string;
  providerName: string;
  status: IntegrationStatus;
  statusDisplay: string; // e.g. "ONLINE PAYMENT GATEWAY: NOT CONNECTED"
  createCheckoutSession(params: PaymentCheckoutParams): Promise<PaymentCheckoutResult>;
  verifyPayment(transactionId: string): Promise<boolean>;
  refundPayment(paymentId: string, amount: number): Promise<boolean>;
}

export interface NotificationPayload {
  toEmail?: string;
  toMobile?: string;
  recipientName: string;
  type:
    | 'WELCOME'
    | 'TRIAL_STARTED'
    | 'TRIAL_EXPIRING'
    | 'INVOICE_ISSUED'
    | 'PAYMENT_SUCCESSFUL'
    | 'PAYMENT_FAILED'
    | 'SUBSCRIPTION_RENEWED'
    | 'SUBSCRIPTION_EXPIRING'
    | 'SUBSCRIPTION_EXPIRED';
  titleAr: string;
  titleEn: string;
  messageAr: string;
  messageEn: string;
  metadata?: Record<string, any>;
}

export interface NotificationProvider {
  emailStatus: IntegrationStatus;
  emailStatusDisplay: string;
  smsStatus: IntegrationStatus;
  smsStatusDisplay: string;
  whatsappStatus: IntegrationStatus;
  whatsappStatusDisplay: string;

  sendEmail(payload: NotificationPayload): Promise<{ delivered: boolean; channel: 'EMAIL'; logNote: string }>;
  sendSms(payload: NotificationPayload): Promise<{ delivered: boolean; channel: 'SMS'; logNote: string }>;
  sendWhatsApp(payload: NotificationPayload): Promise<{ delivered: boolean; channel: 'WHATSAPP'; logNote: string }>;
}
