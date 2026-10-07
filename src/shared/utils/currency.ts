/**
 * Each country's currency, by ISO 3166-1 alpha-2 code. Generated from
 * `country-state-city` for the same countries as `locations.ts`, inlined so
 * the subscription pages do not pull the package's country dataset in.
 */
const CURRENCY_BY_COUNTRY: Record<string, string> = {
  AF: 'AFN', AX: 'EUR', AL: 'ALL', DZ: 'DZD', AS: 'USD', AD: 'EUR', AO: 'AOA', AI: 'XCD', AQ: 'AAD',
  AG: 'XCD', AR: 'ARS', AM: 'AMD', AW: 'AWG', AU: 'AUD', AT: 'EUR', AZ: 'AZN', BH: 'BHD', BD: 'BDT',
  BB: 'BBD', BY: 'BYN', BE: 'EUR', BZ: 'BZD', BJ: 'XOF', BM: 'BMD', BT: 'BTN', BO: 'BOB', BQ: 'USD',
  BA: 'BAM', BW: 'BWP', BV: 'NOK', BR: 'BRL', IO: 'USD', BN: 'BND', BG: 'BGN', BF: 'XOF', BI: 'BIF',
  KH: 'KHR', CM: 'XAF', CA: 'CAD', CV: 'CVE', KY: 'KYD', CF: 'XAF', TD: 'XAF', CL: 'CLP', CN: 'CNY',
  CX: 'AUD', CC: 'AUD', CO: 'COP', KM: 'KMF', CG: 'XAF', CK: 'NZD', CR: 'CRC', CI: 'XOF', HR: 'HRK',
  CU: 'CUP', CW: 'ANG', CY: 'EUR', CZ: 'CZK', CD: 'CDF', DK: 'DKK', DJ: 'DJF', DM: 'XCD', DO: 'DOP',
  TL: 'USD', EC: 'USD', EG: 'EGP', SV: 'USD', GQ: 'XAF', ER: 'ERN', EE: 'EUR', ET: 'ETB', FK: 'FKP',
  FO: 'DKK', FJ: 'FJD', FI: 'EUR', FR: 'EUR', GF: 'EUR', PF: 'XPF', TF: 'EUR', GA: 'XAF', GE: 'GEL',
  DE: 'EUR', GH: 'GHS', GI: 'GIP', GR: 'EUR', GL: 'DKK', GD: 'XCD', GP: 'EUR', GU: 'USD', GT: 'GTQ',
  GG: 'GBP', GN: 'GNF', GW: 'XOF', GY: 'GYD', HT: 'HTG', HM: 'AUD', HN: 'HNL', HK: 'HKD', HU: 'HUF',
  IS: 'ISK', IN: 'INR', ID: 'IDR', IR: 'IRR', IQ: 'IQD', IE: 'EUR', IL: 'ILS', IT: 'EUR', JM: 'JMD',
  JP: 'JPY', JE: 'GBP', JO: 'JOD', KZ: 'KZT', KE: 'KES', KI: 'AUD', XK: 'EUR', KW: 'KWD', KG: 'KGS',
  LA: 'LAK', LV: 'EUR', LB: 'LBP', LS: 'LSL', LR: 'LRD', LY: 'LYD', LI: 'CHF', LT: 'EUR', LU: 'EUR',
  MO: 'MOP', MK: 'MKD', MG: 'MGA', MW: 'MWK', MY: 'MYR', MV: 'MVR', ML: 'XOF', MT: 'EUR', IM: 'GBP',
  MH: 'USD', MQ: 'EUR', MR: 'MRO', MU: 'MUR', YT: 'EUR', MX: 'MXN', FM: 'USD', MD: 'MDL', MC: 'EUR',
  MN: 'MNT', ME: 'EUR', MS: 'XCD', MA: 'MAD', MZ: 'MZN', MM: 'MMK', NA: 'NAD', NR: 'AUD', NP: 'NPR',
  NL: 'EUR', NC: 'XPF', NZ: 'NZD', NI: 'NIO', NE: 'XOF', NG: 'NGN', NU: 'NZD', NF: 'AUD', KP: 'KPW',
  MP: 'USD', NO: 'NOK', OM: 'OMR', PK: 'PKR', PW: 'USD', PS: 'ILS', PA: 'PAB', PG: 'PGK', PY: 'PYG',
  PE: 'PEN', PH: 'PHP', PN: 'NZD', PL: 'PLN', PT: 'EUR', PR: 'USD', QA: 'QAR', RE: 'EUR', RO: 'RON',
  RU: 'RUB', RW: 'RWF', SH: 'SHP', KN: 'XCD', LC: 'XCD', PM: 'EUR', VC: 'XCD', BL: 'EUR', MF: 'EUR',
  WS: 'WST', SM: 'EUR', ST: 'STD', SA: 'SAR', SN: 'XOF', RS: 'RSD', SC: 'SCR', SL: 'SLL', SG: 'SGD',
  SX: 'ANG', SK: 'EUR', SI: 'EUR', SB: 'SBD', SO: 'SOS', ZA: 'ZAR', GS: 'GBP', KR: 'KRW', SS: 'SSP',
  ES: 'EUR', LK: 'LKR', SD: 'SDG', SR: 'SRD', SJ: 'NOK', SZ: 'SZL', SE: 'SEK', CH: 'CHF', SY: 'SYP',
  TW: 'TWD', TJ: 'TJS', TZ: 'TZS', TH: 'THB', BS: 'BSD', GM: 'GMD', TG: 'XOF', TK: 'NZD', TO: 'TOP',
  TT: 'TTD', TN: 'TND', TR: 'TRY', TM: 'TMT', TC: 'USD', TV: 'AUD', UG: 'UGX', UA: 'UAH', AE: 'AED',
  GB: 'GBP', US: 'USD', UM: 'USD', UY: 'UYU', UZ: 'UZS', VU: 'VUV', VA: 'EUR', VE: 'VEF', VN: 'VND',
  VG: 'USD', VI: 'USD', WF: 'XPF', EH: 'MAD', YE: 'YER', ZM: 'ZMW', ZW: 'ZWL',
};

/** The currency a store in this country thinks in; USD when unknown. */
export function currencyOf(country: string | null | undefined): string {
  return (country && CURRENCY_BY_COUNTRY[country.toUpperCase()]) || 'USD';
}

/**
 * An amount in a currency, in the way that currency is usually written:
 * whole units for large amounts (₦15,400), cents kept for small ones ($9.99).
 */
export function formatMoney(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat('en', {
      style: 'currency',
      currency,
      currencyDisplay: 'narrowSymbol',
      maximumFractionDigits: amount >= 100 ? 0 : 2,
    }).format(amount);
  } catch {
    // A code Intl does not know (a few territories' own units): spell it out.
    return `${currency} ${Math.round(amount).toLocaleString('en')}`;
  }
}
