/**
 * Location data for stores, malls and listings.
 *
 * Countries are ISO 3166-1 alpha-2 codes; a "state" is the display name of a
 * subdivision inside that country (state, province, region…). The country
 * list is small and inlined below (generated from `country-state-city`, kept
 * sorted by name). Subdivisions (~5k across the world) are the same package's
 * state dataset, loaded on demand through `loadStates()` so the initial bundle
 * does not carry half a megabyte of provinces. Nigeria's list is inlined too:
 * it is the default country, it renders before any lazy chunk lands, and it is
 * the exact spelling the existing rows were saved with ("FCT", not "Abuja
 * Federal Capital Territory").
 */

export const DEFAULT_COUNTRY = 'NG';

export interface CountryOption {
  code: string;
  name: string;
  flag: string;
}

const COUNTRY_ROWS: ReadonlyArray<readonly [string, string, string]> = [
  ['AF', "Afghanistan", '🇦🇫'],
  ['AX', "Aland Islands", '🇦🇽'],
  ['AL', "Albania", '🇦🇱'],
  ['DZ', "Algeria", '🇩🇿'],
  ['AS', "American Samoa", '🇦🇸'],
  ['AD', "Andorra", '🇦🇩'],
  ['AO', "Angola", '🇦🇴'],
  ['AI', "Anguilla", '🇦🇮'],
  ['AQ', "Antarctica", '🇦🇶'],
  ['AG', "Antigua And Barbuda", '🇦🇬'],
  ['AR', "Argentina", '🇦🇷'],
  ['AM', "Armenia", '🇦🇲'],
  ['AW', "Aruba", '🇦🇼'],
  ['AU', "Australia", '🇦🇺'],
  ['AT', "Austria", '🇦🇹'],
  ['AZ', "Azerbaijan", '🇦🇿'],
  ['BH', "Bahrain", '🇧🇭'],
  ['BD', "Bangladesh", '🇧🇩'],
  ['BB', "Barbados", '🇧🇧'],
  ['BY', "Belarus", '🇧🇾'],
  ['BE', "Belgium", '🇧🇪'],
  ['BZ', "Belize", '🇧🇿'],
  ['BJ', "Benin", '🇧🇯'],
  ['BM', "Bermuda", '🇧🇲'],
  ['BT', "Bhutan", '🇧🇹'],
  ['BO', "Bolivia", '🇧🇴'],
  ['BQ', "Bonaire, Sint Eustatius and Saba", '🇧🇶'],
  ['BA', "Bosnia and Herzegovina", '🇧🇦'],
  ['BW', "Botswana", '🇧🇼'],
  ['BV', "Bouvet Island", '🇧🇻'],
  ['BR', "Brazil", '🇧🇷'],
  ['IO', "British Indian Ocean Territory", '🇮🇴'],
  ['BN', "Brunei", '🇧🇳'],
  ['BG', "Bulgaria", '🇧🇬'],
  ['BF', "Burkina Faso", '🇧🇫'],
  ['BI', "Burundi", '🇧🇮'],
  ['KH', "Cambodia", '🇰🇭'],
  ['CM', "Cameroon", '🇨🇲'],
  ['CA', "Canada", '🇨🇦'],
  ['CV', "Cape Verde", '🇨🇻'],
  ['KY', "Cayman Islands", '🇰🇾'],
  ['CF', "Central African Republic", '🇨🇫'],
  ['TD', "Chad", '🇹🇩'],
  ['CL', "Chile", '🇨🇱'],
  ['CN', "China", '🇨🇳'],
  ['CX', "Christmas Island", '🇨🇽'],
  ['CC', "Cocos (Keeling) Islands", '🇨🇨'],
  ['CO', "Colombia", '🇨🇴'],
  ['KM', "Comoros", '🇰🇲'],
  ['CG', "Congo", '🇨🇬'],
  ['CK', "Cook Islands", '🇨🇰'],
  ['CR', "Costa Rica", '🇨🇷'],
  ['CI', "Cote D'Ivoire (Ivory Coast)", '🇨🇮'],
  ['HR', "Croatia", '🇭🇷'],
  ['CU', "Cuba", '🇨🇺'],
  ['CW', "Curaçao", '🇨🇼'],
  ['CY', "Cyprus", '🇨🇾'],
  ['CZ', "Czech Republic", '🇨🇿'],
  ['CD', "Democratic Republic of the Congo", '🇨🇩'],
  ['DK', "Denmark", '🇩🇰'],
  ['DJ', "Djibouti", '🇩🇯'],
  ['DM', "Dominica", '🇩🇲'],
  ['DO', "Dominican Republic", '🇩🇴'],
  ['TL', "East Timor", '🇹🇱'],
  ['EC', "Ecuador", '🇪🇨'],
  ['EG', "Egypt", '🇪🇬'],
  ['SV', "El Salvador", '🇸🇻'],
  ['GQ', "Equatorial Guinea", '🇬🇶'],
  ['ER', "Eritrea", '🇪🇷'],
  ['EE', "Estonia", '🇪🇪'],
  ['ET', "Ethiopia", '🇪🇹'],
  ['FK', "Falkland Islands", '🇫🇰'],
  ['FO', "Faroe Islands", '🇫🇴'],
  ['FJ', "Fiji Islands", '🇫🇯'],
  ['FI', "Finland", '🇫🇮'],
  ['FR', "France", '🇫🇷'],
  ['GF', "French Guiana", '🇬🇫'],
  ['PF', "French Polynesia", '🇵🇫'],
  ['TF', "French Southern Territories", '🇹🇫'],
  ['GA', "Gabon", '🇬🇦'],
  ['GE', "Georgia", '🇬🇪'],
  ['DE', "Germany", '🇩🇪'],
  ['GH', "Ghana", '🇬🇭'],
  ['GI', "Gibraltar", '🇬🇮'],
  ['GR', "Greece", '🇬🇷'],
  ['GL', "Greenland", '🇬🇱'],
  ['GD', "Grenada", '🇬🇩'],
  ['GP', "Guadeloupe", '🇬🇵'],
  ['GU', "Guam", '🇬🇺'],
  ['GT', "Guatemala", '🇬🇹'],
  ['GG', "Guernsey and Alderney", '🇬🇬'],
  ['GN', "Guinea", '🇬🇳'],
  ['GW', "Guinea-Bissau", '🇬🇼'],
  ['GY', "Guyana", '🇬🇾'],
  ['HT', "Haiti", '🇭🇹'],
  ['HM', "Heard Island and McDonald Islands", '🇭🇲'],
  ['HN', "Honduras", '🇭🇳'],
  ['HK', "Hong Kong S.A.R.", '🇭🇰'],
  ['HU', "Hungary", '🇭🇺'],
  ['IS', "Iceland", '🇮🇸'],
  ['IN', "India", '🇮🇳'],
  ['ID', "Indonesia", '🇮🇩'],
  ['IR', "Iran", '🇮🇷'],
  ['IQ', "Iraq", '🇮🇶'],
  ['IE', "Ireland", '🇮🇪'],
  ['IL', "Israel", '🇮🇱'],
  ['IT', "Italy", '🇮🇹'],
  ['JM', "Jamaica", '🇯🇲'],
  ['JP', "Japan", '🇯🇵'],
  ['JE', "Jersey", '🇯🇪'],
  ['JO', "Jordan", '🇯🇴'],
  ['KZ', "Kazakhstan", '🇰🇿'],
  ['KE', "Kenya", '🇰🇪'],
  ['KI', "Kiribati", '🇰🇮'],
  ['XK', "Kosovo", '🇽🇰'],
  ['KW', "Kuwait", '🇰🇼'],
  ['KG', "Kyrgyzstan", '🇰🇬'],
  ['LA', "Laos", '🇱🇦'],
  ['LV', "Latvia", '🇱🇻'],
  ['LB', "Lebanon", '🇱🇧'],
  ['LS', "Lesotho", '🇱🇸'],
  ['LR', "Liberia", '🇱🇷'],
  ['LY', "Libya", '🇱🇾'],
  ['LI', "Liechtenstein", '🇱🇮'],
  ['LT', "Lithuania", '🇱🇹'],
  ['LU', "Luxembourg", '🇱🇺'],
  ['MO', "Macau S.A.R.", '🇲🇴'],
  ['MK', "Macedonia", '🇲🇰'],
  ['MG', "Madagascar", '🇲🇬'],
  ['MW', "Malawi", '🇲🇼'],
  ['MY', "Malaysia", '🇲🇾'],
  ['MV', "Maldives", '🇲🇻'],
  ['ML', "Mali", '🇲🇱'],
  ['MT', "Malta", '🇲🇹'],
  ['IM', "Man (Isle of)", '🇮🇲'],
  ['MH', "Marshall Islands", '🇲🇭'],
  ['MQ', "Martinique", '🇲🇶'],
  ['MR', "Mauritania", '🇲🇷'],
  ['MU', "Mauritius", '🇲🇺'],
  ['YT', "Mayotte", '🇾🇹'],
  ['MX', "Mexico", '🇲🇽'],
  ['FM', "Micronesia", '🇫🇲'],
  ['MD', "Moldova", '🇲🇩'],
  ['MC', "Monaco", '🇲🇨'],
  ['MN', "Mongolia", '🇲🇳'],
  ['ME', "Montenegro", '🇲🇪'],
  ['MS', "Montserrat", '🇲🇸'],
  ['MA', "Morocco", '🇲🇦'],
  ['MZ', "Mozambique", '🇲🇿'],
  ['MM', "Myanmar", '🇲🇲'],
  ['NA', "Namibia", '🇳🇦'],
  ['NR', "Nauru", '🇳🇷'],
  ['NP', "Nepal", '🇳🇵'],
  ['NL', "Netherlands", '🇳🇱'],
  ['NC', "New Caledonia", '🇳🇨'],
  ['NZ', "New Zealand", '🇳🇿'],
  ['NI', "Nicaragua", '🇳🇮'],
  ['NE', "Niger", '🇳🇪'],
  ['NG', "Nigeria", '🇳🇬'],
  ['NU', "Niue", '🇳🇺'],
  ['NF', "Norfolk Island", '🇳🇫'],
  ['KP', "North Korea", '🇰🇵'],
  ['MP', "Northern Mariana Islands", '🇲🇵'],
  ['NO', "Norway", '🇳🇴'],
  ['OM', "Oman", '🇴🇲'],
  ['PK', "Pakistan", '🇵🇰'],
  ['PW', "Palau", '🇵🇼'],
  ['PS', "Palestinian Territory Occupied", '🇵🇸'],
  ['PA', "Panama", '🇵🇦'],
  ['PG', "Papua new Guinea", '🇵🇬'],
  ['PY', "Paraguay", '🇵🇾'],
  ['PE', "Peru", '🇵🇪'],
  ['PH', "Philippines", '🇵🇭'],
  ['PN', "Pitcairn Island", '🇵🇳'],
  ['PL', "Poland", '🇵🇱'],
  ['PT', "Portugal", '🇵🇹'],
  ['PR', "Puerto Rico", '🇵🇷'],
  ['QA', "Qatar", '🇶🇦'],
  ['RE', "Reunion", '🇷🇪'],
  ['RO', "Romania", '🇷🇴'],
  ['RU', "Russia", '🇷🇺'],
  ['RW', "Rwanda", '🇷🇼'],
  ['SH', "Saint Helena", '🇸🇭'],
  ['KN', "Saint Kitts And Nevis", '🇰🇳'],
  ['LC', "Saint Lucia", '🇱🇨'],
  ['PM', "Saint Pierre and Miquelon", '🇵🇲'],
  ['VC', "Saint Vincent And The Grenadines", '🇻🇨'],
  ['BL', "Saint-Barthelemy", '🇧🇱'],
  ['MF', "Saint-Martin (French part)", '🇲🇫'],
  ['WS', "Samoa", '🇼🇸'],
  ['SM', "San Marino", '🇸🇲'],
  ['ST', "Sao Tome and Principe", '🇸🇹'],
  ['SA', "Saudi Arabia", '🇸🇦'],
  ['SN', "Senegal", '🇸🇳'],
  ['RS', "Serbia", '🇷🇸'],
  ['SC', "Seychelles", '🇸🇨'],
  ['SL', "Sierra Leone", '🇸🇱'],
  ['SG', "Singapore", '🇸🇬'],
  ['SX', "Sint Maarten (Dutch part)", '🇸🇽'],
  ['SK', "Slovakia", '🇸🇰'],
  ['SI', "Slovenia", '🇸🇮'],
  ['SB', "Solomon Islands", '🇸🇧'],
  ['SO', "Somalia", '🇸🇴'],
  ['ZA', "South Africa", '🇿🇦'],
  ['GS', "South Georgia", '🇬🇸'],
  ['KR', "South Korea", '🇰🇷'],
  ['SS', "South Sudan", '🇸🇸'],
  ['ES', "Spain", '🇪🇸'],
  ['LK', "Sri Lanka", '🇱🇰'],
  ['SD', "Sudan", '🇸🇩'],
  ['SR', "Suriname", '🇸🇷'],
  ['SJ', "Svalbard And Jan Mayen Islands", '🇸🇯'],
  ['SZ', "Swaziland", '🇸🇿'],
  ['SE', "Sweden", '🇸🇪'],
  ['CH', "Switzerland", '🇨🇭'],
  ['SY', "Syria", '🇸🇾'],
  ['TW', "Taiwan", '🇹🇼'],
  ['TJ', "Tajikistan", '🇹🇯'],
  ['TZ', "Tanzania", '🇹🇿'],
  ['TH', "Thailand", '🇹🇭'],
  ['BS', "The Bahamas", '🇧🇸'],
  ['GM', "The Gambia", '🇬🇲'],
  ['TG', "Togo", '🇹🇬'],
  ['TK', "Tokelau", '🇹🇰'],
  ['TO', "Tonga", '🇹🇴'],
  ['TT', "Trinidad And Tobago", '🇹🇹'],
  ['TN', "Tunisia", '🇹🇳'],
  ['TR', "Turkey", '🇹🇷'],
  ['TM', "Turkmenistan", '🇹🇲'],
  ['TC', "Turks And Caicos Islands", '🇹🇨'],
  ['TV', "Tuvalu", '🇹🇻'],
  ['UG', "Uganda", '🇺🇬'],
  ['UA', "Ukraine", '🇺🇦'],
  ['AE', "United Arab Emirates", '🇦🇪'],
  ['GB', "United Kingdom", '🇬🇧'],
  ['US', "United States", '🇺🇸'],
  ['UM', "United States Minor Outlying Islands", '🇺🇲'],
  ['UY', "Uruguay", '🇺🇾'],
  ['UZ', "Uzbekistan", '🇺🇿'],
  ['VU', "Vanuatu", '🇻🇺'],
  ['VA', "Vatican City State (Holy See)", '🇻🇦'],
  ['VE', "Venezuela", '🇻🇪'],
  ['VN', "Vietnam", '🇻🇳'],
  ['VG', "Virgin Islands (British)", '🇻🇬'],
  ['VI', "Virgin Islands (US)", '🇻🇮'],
  ['WF', "Wallis And Futuna Islands", '🇼🇫'],
  ['EH', "Western Sahara", '🇪🇭'],
  ['YE', "Yemen", '🇾🇪'],
  ['ZM', "Zambia", '🇿🇲'],
  ['ZW', "Zimbabwe", '🇿🇼'],
];

export const COUNTRIES: readonly CountryOption[] = COUNTRY_ROWS.map(([code, name, flag]) => ({ code, name, flag }));

const COUNTRY_BY_CODE = new Map(COUNTRIES.map((c) => [c.code, c]));

export function getCountry(code: string | null | undefined): CountryOption | undefined {
  return code ? COUNTRY_BY_CODE.get(code.toUpperCase()) : undefined;
}

export const NIGERIAN_STATES: readonly string[] = [
  'Abia', 'Adamawa', 'Akwa Ibom', 'Anambra', 'Bauchi', 'Bayelsa',
  'Benue', 'Borno', 'Cross River', 'Delta', 'Ebonyi', 'Edo',
  'Ekiti', 'Enugu', 'FCT', 'Gombe', 'Imo', 'Jigawa',
  'Kaduna', 'Kano', 'Katsina', 'Kebbi', 'Kogi', 'Kwara',
  'Lagos', 'Nasarawa', 'Niger', 'Ogun', 'Ondo', 'Osun',
  'Oyo', 'Plateau', 'Rivers', 'Sokoto', 'Taraba', 'Yobe', 'Zamfara',
];

/** Display name for a state (FCT reads as "FCT - Abuja"). */
export function getStateDisplayName(state: string): string {
  return state === 'FCT' ? 'FCT - Abuja' : state;
}

/** Subdivision names of one country, or [] when the dataset has none. */
export type StatesOf = (countryCode: string) => string[];

let statesCache: StatesOf | null = null;
let statesPending: Promise<StatesOf> | null = null;

/** Synchronous view: the world dataset once loaded, Nigeria alone before that. */
export function getLoadedStates(): StatesOf | null {
  return statesCache;
}

export function statesOfSync(countryCode: string): string[] | null {
  const key = countryCode.toUpperCase();
  if (key === DEFAULT_COUNTRY) return [...NIGERIAN_STATES];
  return statesCache ? statesCache(key) : null;
}

/** Loads the world subdivision dataset once; later calls resolve immediately. */
export function loadStates(): Promise<StatesOf> {
  if (statesCache) return Promise.resolve(statesCache);
  if (statesPending) return statesPending;
  statesPending = import('country-state-city/lib/state').then((mod) => {
    const memo = new Map<string, string[]>();
    statesCache = (countryCode: string) => {
      const key = countryCode.toUpperCase();
      if (key === DEFAULT_COUNTRY) return [...NIGERIAN_STATES];
      let list = memo.get(key);
      if (!list) {
        list = mod.default
          .getStatesOfCountry(key)
          .map((s) => s.name)
          .sort((a, b) => a.localeCompare(b));
        memo.set(key, list);
      }
      return list;
    };
    return statesCache;
  });
  return statesPending;
}

/** "Ikeja, Lagos" at home; "Harare, Harare Province, Zimbabwe" elsewhere. */
export function formatLocation(
  parts: Array<string | null | undefined>,
  country?: string | null,
): string {
  const out = parts.filter(Boolean) as string[];
  if (country && country !== DEFAULT_COUNTRY) {
    out.push(getCountry(country)?.name ?? country);
  }
  return out.join(', ');
}
