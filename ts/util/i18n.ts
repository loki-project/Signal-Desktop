// this file is a weird one as it is used by both sides of electron at the same time

import {
  FormatDistanceStrictOptions,
  FormatDistanceToNowStrictOptions,
  formatDistanceStrict,
  formatDistanceToNowStrict,
} from 'date-fns';
import timeLocales from 'date-fns/locale';
import { isUndefined } from 'lodash';
import {
  GetMessageArgs,
  LocalizerDictionary,
  LocalizerToken,
  PluralKey,
  PluralString,
} from '../types/Localizer';
import { LOCALE_DEFAULTS } from '../session/constants';

export function loadDictionary(locale: Locale) {
  return import(`../../_locales/${locale}/messages.json`) as Promise<Dictionary>;
}

const timeLocaleMap = {
  ar: timeLocales.ar,
  be: timeLocales.be,
  bg: timeLocales.bg,
  ca: timeLocales.ca,
  cs: timeLocales.cs,
  da: timeLocales.da,
  de: timeLocales.de,
  el: timeLocales.el,
  en: timeLocales.enUS,
  eo: timeLocales.eo,
  es: timeLocales.es,
  /** TODO - Check this */
  es_419: timeLocales.es,
  et: timeLocales.et,
  fa: timeLocales.faIR,
  fi: timeLocales.fi,
  /** TODO - Check this */
  fil: timeLocales.fi,
  fr: timeLocales.fr,
  he: timeLocales.he,
  hi: timeLocales.hi,
  hr: timeLocales.hr,
  hu: timeLocales.hu,
  /** TODO - Check this */
  'hy-AM': timeLocales.hy,
  id: timeLocales.id,
  it: timeLocales.it,
  ja: timeLocales.ja,
  ka: timeLocales.ka,
  km: timeLocales.km,
  /** TODO - Check this */
  kmr: timeLocales.km,
  kn: timeLocales.kn,
  ko: timeLocales.ko,
  lt: timeLocales.lt,
  lv: timeLocales.lv,
  mk: timeLocales.mk,
  nb: timeLocales.nb,
  nl: timeLocales.nl,
  /** TODO - Find this this */
  no: timeLocales.enUS,
  /** TODO - Find this this */
  pa: timeLocales.enUS,
  pl: timeLocales.pl,
  pt_BR: timeLocales.ptBR,
  pt_PT: timeLocales.pt,
  ro: timeLocales.ro,
  ru: timeLocales.ru,
  /** TODO - Find this this */
  si: timeLocales.enUS,
  sk: timeLocales.sk,
  sl: timeLocales.sl,
  sq: timeLocales.sq,
  sr: timeLocales.sr,
  sv: timeLocales.sv,
  ta: timeLocales.ta,
  th: timeLocales.th,
  /** TODO - Find this this */
  tl: timeLocales.enUS,
  tr: timeLocales.tr,
  uk: timeLocales.uk,
  uz: timeLocales.uz,
  vi: timeLocales.vi,
  zh_CN: timeLocales.zhCN,
  zh_TW: timeLocales.zhTW,
};

export type Locale = keyof typeof timeLocaleMap;

const enPluralFormRegex = /\{(\w+), plural, one \{(\w+)\} other \{(\w+)\}\}/;

const cardinalPluralFormRegex = /(zero|one|two|few|many|other) \{([^}]*)\}/g;

const cardinalPluralRegex: Record<Intl.LDMLPluralRule, RegExp> = {
  zero: /(zero) \{([^}]*)\}/,
  one: /(one) \{([^}]*)\}/,
  two: /(two) \{([^}]*)\}/,
  few: /(few) \{([^}]*)\}/,
  many: /(many) \{([^}]*)\}/,
  other: /(other) \{([^}]*)\}/,
};

function getPluralKey(string: PluralString): PluralKey | undefined {
  const match = string.match(enPluralFormRegex);
  return match ? match[1] : undefined;
}

function getStringForCardinalRule(
  localizedString: string,
  cardinalRule: Intl.LDMLPluralRule
): string | undefined {
  const match = localizedString.match(cardinalPluralRegex[cardinalRule]);
  return match ? match[2] : undefined;
}

const isPluralForm = (localizedString: string): localizedString is PluralString =>
  enPluralFormRegex.test(localizedString);

/**
 * Logs an i18n message to the console.
 * @param message - The message to log.
 *
 * TODO - Replace this logging method when the new logger is created
 */
function i18nLog(message: string) {
  // eslint:disable: no-console
  // eslint-disable-next-line no-console
  (window?.log?.error ?? console.log)(message);
}

/**
 * Sets up the i18n function with the provided locale and messages.
 *
 * @param locale - The locale to use for translations.
 * @param dictionary - A dictionary of localized messages.
 *
 * @returns A function that retrieves a localized message string, substituting variables where necessary.
 */
export const setupi18n = (locale: Locale, dictionary: LocalizerDictionary) => {
  if (!locale) {
    throw new Error('i18n: locale parameter is required');
  }
  if (!dictionary) {
    throw new Error('i18n: messages parameter is required');
  }

  /**
   * Retrieves a localized message string, substituting variables where necessary.
   *
   * @param token - The token identifying the message to retrieve.
   * @param args - An optional record of substitution variables and their replacement values. This is required if the string has dynamic variables.
   *
   * @returns The localized message string with substitutions applied.
   *
   * @example
   * // The string greeting is 'Hello, {name}!' in the current locale
   * window.i18n('greeting', { name: 'Alice' });
   * // => 'Hello, Alice!'
   */
  function getMessage<T extends LocalizerToken, R extends LocalizerDictionary[T]>(
    ...[token, args]: GetMessageArgs<T>
  ): R {
    try {
      const inboxStore = window.inboxStore;

      const localizedDictionary =
        inboxStore && 'getState' in inboxStore && typeof inboxStore.getState === 'function'
          ? (inboxStore.getState().dictionary.dictionary as LocalizerDictionary)
          : dictionary;

      let localizedString = localizedDictionary[token] as R;

      if (!localizedString) {
        i18nLog(`i18n: Attempted to get translation for nonexistent key '${token}'`);
        return token as R;
      }

      /** If a localized string does not have any arguments to substitute it is returned with no changes */
      if (!args) {
        return localizedString;
      }

      if (isPluralForm(localizedString)) {
        const pluralKey = getPluralKey(localizedString) as keyof typeof args;

        if (!pluralKey) {
          i18nLog(
            `i18n: Attempted to nonexistent pluralKey for plural form string '${localizedString}'`
          );
        } else {
          const num = args[pluralKey] ?? 0;

          const cardinalRule = new Intl.PluralRules(locale).select(num);

          const pluralString = getStringForCardinalRule(localizedString, cardinalRule);

          if (!pluralString) {
            i18nLog(
              `i18n: Plural string not found for cardinal '${cardinalRule}': '${localizedString}'`
            );
            return token as R;
          }

          localizedString = pluralString.replaceAll('#', num) as R;
        }
      }

      /** Find and replace the dynamic variables in a localized string and substitute the variables with the provided values */
      return localizedString.replace(/\{(\w+)\}/g, (match, arg: keyof typeof args) => {
        const substitution = args[arg];

        if (isUndefined(substitution)) {
          const defaultSubstitution = LOCALE_DEFAULTS[arg as keyof typeof LOCALE_DEFAULTS];

          return isUndefined(defaultSubstitution) ? match : defaultSubstitution;
        }

        return substitution.toString();
      }) as R;
    } catch (error) {
      i18nLog(`i18n: ${error.message}`);
      return token as R;
    }
  }

  window.getLocale = () => locale;

  return getMessage;
};

// eslint-disable-next-line import/no-mutable-exports
export let langNotSupportedMessageShown = false;

export const loadEmojiPanelI18n = async () => {
  if (!window) {
    return undefined;
  }

  const lang = window.getLocale();
  if (lang !== 'en') {
    try {
      const langData = await import(`@emoji-mart/data/i18n/${lang}.json`);
      return langData;
    } catch (err) {
      if (!langNotSupportedMessageShown) {
        window?.log?.warn(
          'Language is not supported by emoji-mart package. See https://github.com/missive/emoji-mart/tree/main/packages/emoji-mart-data/i18n'
        );
        langNotSupportedMessageShown = true;
      }
    }
  }
  return undefined;
};

export const formatTimeDistance = (
  date: Date,
  baseDate: Date,
  options?: Omit<FormatDistanceStrictOptions, 'locale'>
) => {
  const locale = window.getLocale();
  return formatDistanceStrict(date, baseDate, {
    locale: timeLocaleMap[locale],
    ...options,
  });
};

export const formatTimeDistanceToNow = (
  date: Date,
  options?: Omit<FormatDistanceToNowStrictOptions, 'locale'>
) => {
  const locale = window.getLocale();
  return formatDistanceToNowStrict(date, {
    locale: timeLocaleMap[locale],
    ...options,
  });
};

// RTL Support

export type HTMLDirection = 'ltr' | 'rtl';

export function isRtlBody(): boolean {
  const body = document.getElementsByTagName('body').item(0);

  return body?.classList.contains('rtl') || false;
}

export const useHTMLDirection = (): HTMLDirection => (isRtlBody() ? 'rtl' : 'ltr');
