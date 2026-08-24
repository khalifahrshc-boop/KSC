/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { PaymentProvider, NotificationProvider, PaymentCheckoutParams, PaymentCheckoutResult, NotificationPayload } from '../types/providers';

export const ONLINE_PAYMENT_GATEWAY_NOTICE = 'ONLINE PAYMENT GATEWAY: NOT CONNECTED';
export const EMAIL_PROVIDER_NOTICE = 'EMAIL PROVIDER: ARCHITECTURE READY (NOT CONNECTED)';
export const SMS_PROVIDER_NOTICE = 'SMS PROVIDER: ARCHITECTURE READY (NOT CONNECTED)';
export const WHATSAPP_PROVIDER_NOTICE = 'WHATSAPP PROVIDER: ARCHITECTURE READY (NOT CONNECTED)';

export const defaultPaymentProvider: PaymentProvider = {
  providerId: 'gateway_offline_fallback',
  providerName: 'Saudi Online Payment Gateway (Mada / Visa / Master / Apple Pay)',
  status: 'NOT_CONNECTED',
  statusDisplay: ONLINE_PAYMENT_GATEWAY_NOTICE,

  async createCheckoutSession(params: PaymentCheckoutParams): Promise<PaymentCheckoutResult> {
    console.info(`[PaymentProvider] Checkout session requested for tenant ${params.tenantId}. Gateway is NOT CONNECTED.`);
    return {
      success: false,
      isGatewayConnected: false,
      paymentMethod: 'Online Payment Gateway',
      statusText: ONLINE_PAYMENT_GATEWAY_NOTICE,
      errorMessage: 'Online Payment Gateway is currently not connected. Please use Bank Transfer or record transaction receipt.'
    };
  },

  async verifyPayment(transactionId: string): Promise<boolean> {
    console.info(`[PaymentProvider] Verification checked for ${transactionId}. Gateway is NOT CONNECTED.`);
    return false;
  },

  async refundPayment(paymentId: string, amount: number): Promise<boolean> {
    console.info(`[PaymentProvider] Refund requested for ${paymentId} (${amount} SAR). Gateway is NOT CONNECTED.`);
    return false;
  }
};

export const defaultNotificationProvider: NotificationProvider = {
  emailStatus: 'ARCHITECTURE_READY_NOT_CONNECTED',
  emailStatusDisplay: EMAIL_PROVIDER_NOTICE,
  smsStatus: 'ARCHITECTURE_READY_NOT_CONNECTED',
  smsStatusDisplay: SMS_PROVIDER_NOTICE,
  whatsappStatus: 'ARCHITECTURE_READY_NOT_CONNECTED',
  whatsappStatusDisplay: WHATSAPP_PROVIDER_NOTICE,

  async sendEmail(payload: NotificationPayload) {
    console.info(`[NotificationProvider - Email] Event logged for ${payload.recipientName} (${payload.type}): ${payload.titleEn} | Notice: ${EMAIL_PROVIDER_NOTICE}`);
    return {
      delivered: false,
      channel: 'EMAIL',
      logNote: `${EMAIL_PROVIDER_NOTICE} - Event logged internally.`
    };
  },

  async sendSms(payload: NotificationPayload) {
    console.info(`[NotificationProvider - SMS] Event logged for ${payload.recipientName} (${payload.type}): ${payload.titleEn} | Notice: ${SMS_PROVIDER_NOTICE}`);
    return {
      delivered: false,
      channel: 'SMS',
      logNote: `${SMS_PROVIDER_NOTICE} - Event logged internally.`
    };
  },

  async sendWhatsApp(payload: NotificationPayload) {
    console.info(`[NotificationProvider - WhatsApp] Event logged for ${payload.recipientName} (${payload.type}): ${payload.titleEn} | Notice: ${WHATSAPP_PROVIDER_NOTICE}`);
    return {
      delivered: false,
      channel: 'WHATSAPP',
      logNote: `${WHATSAPP_PROVIDER_NOTICE} - Event logged internally.`
    };
  }
};
