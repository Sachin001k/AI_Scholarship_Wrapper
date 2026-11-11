/**
 * Exchange rates (design doc §6.4, §7.4).
 * ExchangeRateProvider is the port; StaticRateProvider is the prototype
 * adapter. A Supabase adapter reading `exchange_rates` (filled by a daily
 * Edge Function) plugs in behind the same interface.
 */
import type { Money } from "../domain/types";

export interface ExchangeRateProvider {
  /** Units of `quote` per 1 USD. */
  rateFromUsd(quote: string): number;
  readonly rateDate: string;
}

/** Approximate snapshot — replace with the daily fx-rates job. */
const USD_SNAPSHOT: Record<string, number> = {
  USD: 1,
  INR: 84.5,
  GBP: 0.78,
  EUR: 0.92,
  CAD: 1.38,
  AUD: 1.52,
  SGD: 1.34,
  JPY: 151,
  NZD: 1.66,
  AED: 3.67,
  NGN: 1600,
  KES: 129,
  GHS: 15.5,
  PKR: 278,
  BDT: 120,
  LKR: 298,
  NPR: 135,
  BRL: 5.6,
  MXN: 19.8,
  IDR: 15700,
  PHP: 57.5,
  VND: 25300,
  CNY: 7.2,
  ZAR: 18.2,
  EGP: 48.5,
};

export class StaticRateProvider implements ExchangeRateProvider {
  readonly rateDate = "2026-11-01";
  rateFromUsd(quote: string): number {
    const r = USD_SNAPSHOT[quote];
    if (!r) throw new Error(`No exchange rate for ${quote}`);
    return r;
  }
}

export const defaultRates: ExchangeRateProvider = new StaticRateProvider();

export function convert(m: Money, to: string, rates: ExchangeRateProvider = defaultRates): Money {
  if (m.currency === to) return m;
  const usd = m.amount / rates.rateFromUsd(m.currency);
  return { amount: usd * rates.rateFromUsd(to), currency: to };
}

export function hasRate(currency: string): boolean {
  return currency in USD_SNAPSHOT;
}
