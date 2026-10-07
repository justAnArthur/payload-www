import { describe, expect, it } from 'vitest'

import { createPagesCollection } from '../src/collections/createPagesCollection'
import { createWWWCollectionGlobal } from '../src/collections/createWWWCollectionGlobal'
import { slugField } from '../src/collections/fields/slug'
import {
  formatSlug,
  formatSlugSegment,
  generateSlug,
  slugFromTitle,
  slugParent,
  typeSlug
} from '../src/collections/fields/slug/format'

type Hook = (args: Record<string, unknown>) => unknown

function rowFields(nested = false) {
  const row = slugField({ useAsTitle: 'title', nested }) as any
  const [slug, lock] = row.fields
  return {
    row,
    slug,
    lock,
    formatHook: slug.hooks.beforeValidate[0] as Hook,
    lockHook: lock.hooks.beforeValidate[0] as Hook
  }
}

describe('slug formatting', () => {
  it('turns a title into one segment', () => {
    expect(formatSlugSegment('Hello World!')).toBe('hello-world')
    expect(formatSlugSegment('  GPS / Telematics  ')).toBe('gps-telematics')
    expect(formatSlugSegment('about_us')).toBe('about-us')
  })

  it('transliterates diacritics instead of dropping them', () => {
    expect(formatSlugSegment('Zásady ochrany osobných údajov')).toBe('zasady-ochrany-osobnych-udajov')
    expect(formatSlugSegment('Prenájom')).toBe('prenajom')
    expect(formatSlugSegment('Funzionalità')).toBe('funzionalita')
    expect(formatSlugSegment('Straße')).toBe('strasse')
    expect(formatSlugSegment('Cœur')).toBe('coeur')
  })

  it('nests on `/` and `_` only when nested', () => {
    expect(formatSlug('About Us/Our Team', true)).toBe('about-us_our-team')
    expect(formatSlug('products_Mobile App', true)).toBe('products_mobile-app')
    expect(formatSlug('/a//b/', true)).toBe('a_b')
    expect(formatSlug('About Us/Our Team', false)).toBe('about-us-our-team')
  })

  it('keeps edge hyphens and dividers while typing', () => {
    expect(typeSlug('About-', true)).toBe('about-')
    expect(typeSlug('products/', true)).toBe('products_')
    expect(typeSlug('a  b', true)).toBe('a-b')
    expect(typeSlug('a--b', true)).toBe('a-b')
    expect(typeSlug('Čo je nové', true)).toBe('co-je-nove')
    expect(typeSlug('products/', false)).toBe('products-')
    expect(typeSlug('a_b', false)).toBe('a-b')
  })

  it('reads the parent of a nested slug', () => {
    expect(slugParent('products_mobile-app')).toBe('products')
    expect(slugParent('a_b_c')).toBe('a_b')
    expect(slugParent('about')).toBe('')
    expect(slugParent('')).toBe('')
    expect(slugParent(null)).toBe('')
  })

  it('generates under the parent', () => {
    expect(generateSlug('Mobile App')).toBe('mobile-app')
    expect(generateSlug('Mobile App', 'products')).toBe('products_mobile-app')
    expect(generateSlug('Mobilná aplikácia', 'produkty')).toBe('produkty_mobilna-aplikacia')
    expect(generateSlug('???', 'products')).toBe('')
  })

  it('takes the whole path from a title that spells it with spaced slashes', () => {
    expect(generateSlug('Products / Rental Management System', 'old')).toBe('products_rental-management-system')
    expect(generateSlug('Odvetvia / Poskytovatelia prenájmu')).toBe('odvetvia_poskytovatelia-prenajmu')
    expect(generateSlug('Products / Application for Delivery/Receiving')).toBe('products_application-for-delivery-receiving')
    expect(generateSlug('Booking 24/7', 'help')).toBe('help_booking-24-7')
  })

  it('keeps flat slugs flat', () => {
    expect(slugFromTitle('Products / Rental', false, 'x_y')).toBe('products-rental')
    expect(slugFromTitle('Rental', true, 'products_old')).toBe('products_rental')
  })
})

describe('slugField', () => {
  it('stays a plain text field without a title to follow', () => {
    const f = slugField() as any
    expect(f.name).toBe('slug')
    expect(f.admin.components).toBeUndefined()
  })

  it('pairs the slug with a hidden localized lock when it follows a title', () => {
    const { row, slug, lock } = rowFields(true)
    expect(row.type).toBe('row')
    expect(row.admin.position).toBe('sidebar')
    expect(slug.name).toBe('slug')
    expect(slug.unique).toBe(true)
    expect(slug.admin.components.Field).toEqual({
      path: '@justanarthur/payload-www/fields-client#SlugField',
      clientProps: { useAsTitle: 'title', nested: true }
    })
    expect(lock).toMatchObject({ name: 'slugLock', type: 'checkbox', localized: true })
    // unset stays null rather than reading back as a default, so the hook can settle it
    expect(lock.defaultValue).toBeUndefined()
    expect(lock.admin.hidden).toBe(true)
  })

  it('createWWWCollectionGlobal links the slug to useAsTitle', () => {
    const collection = createWWWCollectionGlobal([], { slug: 'things', renderPath: 'x', useAsTitle: 'name' }) as any
    expect(collection.fields[0].fields[0].admin.components.Field.clientProps).toEqual({ useAsTitle: 'name', nested: false })

    const untitled = createWWWCollectionGlobal([], { slug: 'things', renderPath: 'x' }) as any
    expect(untitled.fields[0].name).toBe('slug')
  })

  it('nests page slugs', () => {
    const pages = createPagesCollection([]) as any
    expect(pages.fields[0].fields[0].admin.components.Field.clientProps).toEqual({ useAsTitle: 'title', nested: true })
  })
})

describe('slug hooks', () => {
  it('formats an invalid slug and leaves valid ones alone', () => {
    const { formatHook } = rowFields(true)
    expect(formatHook({ value: 'About Us/Team', operation: 'update' })).toBe('about-us_team')
    expect(formatHook({ value: 'products--gps--telematics-', operation: 'update' })).toBe('products--gps--telematics-')
    expect(formatHook({ value: '', operation: 'create', data: { title: 'Home' } })).toBe('')
  })

  it('generates a missing slug on create only', () => {
    const { formatHook } = rowFields(true)
    expect(formatHook({ value: undefined, operation: 'create', data: { title: 'Products / Hello World' } })).toBe('products_hello-world')
    expect(formatHook({ value: null, operation: 'update', data: { title: 'Hello World' } })).toBe(null)
    expect(formatHook({ value: undefined, operation: 'create', data: { title: '???' } })).toBe(undefined)

    const flat = rowFields(false).formatHook
    expect(flat({ value: undefined, operation: 'create', data: { title: 'Booking / 24/7' } })).toBe('booking-24-7')
  })

  it('settles an unset lock on create from whether the slug is the generated one', () => {
    const { lockHook } = rowFields(true)
    const create = (siblingData: Record<string, unknown>) => lockHook({ value: undefined, operation: 'create', siblingData })

    expect(create({ title: 'Hello World', slug: 'hello-world' })).toBe(true)
    expect(create({ title: 'Mobile App', slug: 'products_mobile-app' })).toBe(true)
    expect(create({ title: 'Products / Mobile App', slug: 'products_mobile-app' })).toBe(true)
    expect(create({ title: 'Hello World' })).toBe(true)
    expect(create({ title: 'Home', slug: '' })).toBe(false)
    expect(create({ title: 'Hello World', slug: 'custom' })).toBe(false)
  })

  it('settles a locale written for the first time without touching the index', () => {
    const { lockHook } = rowFields(true)
    const update = (siblingData: Record<string, unknown>, originalDoc: Record<string, unknown>) =>
      lockHook({ value: null, operation: 'update', siblingData, originalDoc })

    expect(update({ title: 'Domov', slug: '' }, {})).toBe(false)
    expect(update({ title: 'O nás' }, { slug: 'o-nas' })).toBe(true)
    expect(update({ title: 'Nový titulok' }, { slug: 'o-nas' })).toBe(false)
    expect(update({ title: 'Domov' }, {})).toBe(false)
  })

  it('keeps a lock that was set', () => {
    const { lockHook } = rowFields(true)
    expect(lockHook({ value: true, operation: 'update', siblingData: { title: 'A', slug: 'b' } })).toBe(true)
    expect(lockHook({ value: false, operation: 'create', siblingData: { title: 'A', slug: 'a' } })).toBe(false)
  })
})
