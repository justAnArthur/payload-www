import { describe, expect, it } from 'bun:test'

import { loadWrongLanguageCheck } from '../src/utils/languageDetector'

const LOCALES = ['en', 'sk', 'cs', 'it', 'de', 'fr', 'nl', 'es', 'pt']

// the same idea written in each language, long enough to detect reliably
const TEXT: Record<string, string> = {
  en: 'Our rental software helps branch staff prepare vehicles faster and keeps every reservation in one place.',
  sk: 'Náš softvér pre požičovne pomáha zamestnancom pobočiek rýchlejšie pripraviť vozidlá a všetky rezervácie máte na jednom mieste.',
  cs: 'Náš software pro půjčovny pomáhá zaměstnancům poboček rychleji připravit vozidla a všechny rezervace máte na jednom místě.',
  it: 'Il nostro software per il noleggio aiuta il personale delle filiali a preparare i veicoli più velocemente e tiene tutte le prenotazioni in un unico posto.',
  de: 'Unsere Vermietungssoftware hilft den Mitarbeitern in den Filialen, Fahrzeuge schneller vorzubereiten, und hält alle Reservierungen an einem Ort.',
  fr: 'Notre logiciel de location aide le personnel des agences à préparer les véhicules plus rapidement et regroupe toutes les réservations au même endroit.',
  nl: 'Onze verhuursoftware helpt medewerkers van vestigingen om voertuigen sneller klaar te maken en houdt alle reserveringen op één plek.',
  es: 'Nuestro software de alquiler ayuda al personal de las sucursales a preparar los vehículos más rápido y mantiene todas las reservas en un solo lugar.',
  pt: 'O nosso software de aluguer ajuda a equipa das filiais a preparar os veículos mais depressa e mantém todas as reservas num só lugar.'
}

describe('wrong language check', () => {
  it('accepts text written in its own locale', async () => {
    const check = (await loadWrongLanguageCheck(LOCALES))!
    for (const [locale, text] of Object.entries(TEXT)) expect(check(text, locale)).toBeNull()
  })

  it('names the language of text placed in another locale, including close pairs', async () => {
    const check = (await loadWrongLanguageCheck(LOCALES))!

    expect(check(TEXT.cs, 'sk')).toBe('cs')
    expect(check(TEXT.sk, 'cs')).toBe('sk')
    expect(check(TEXT.es, 'pt')).toBe('es')
    expect(check(TEXT.en, 'de')).toBe('en')
  })

  it('ignores short strings and brand names', async () => {
    const check = (await loadWrongLanguageCheck(LOCALES))!

    expect(check('Rezervujte si demo', 'cs')).toBeNull()
    expect(check('Camasys GPS Telematics Fleet', 'sk')).toBeNull()
    expect(check('Digitale check-in/check-out met mobiele app', 'nl')).toBeNull()
    expect(check('uptime del cloud e protezioni best practice.', 'it')).toBeNull()
    expect(check('Office\n1380 Main Street, Suite 322\nSpringfield 94596, USA\nE-mail: sales@example.com', 'sk')).toBeNull()
  })
})
