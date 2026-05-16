import { describe, it, expect } from 'vitest'
import { pwaOptions } from '../../vite.config'

describe('PWA Configuration', () => {
  describe('Manifest fields (Req 5.1)', () => {
    it('should have the app name set to "Cooking World Map"', () => {
      expect(pwaOptions.manifest).toBeDefined()
      expect(pwaOptions.manifest!.name).toBe('Cooking World Map')
    })

    it('should have a short_name', () => {
      expect(pwaOptions.manifest!.short_name).toBeDefined()
      expect(typeof pwaOptions.manifest!.short_name).toBe('string')
    })

    it('should have a theme_color', () => {
      expect(pwaOptions.manifest!.theme_color).toBeDefined()
      expect(typeof pwaOptions.manifest!.theme_color).toBe('string')
    })

    it('should have icons for 192x192 and 512x512 sizes', () => {
      const icons = pwaOptions.manifest!.icons
      expect(icons).toBeDefined()
      expect(Array.isArray(icons)).toBe(true)

      const sizes = icons!.map((icon) => icon.sizes)
      expect(sizes).toContain('192x192')
      expect(sizes).toContain('512x512')
    })
  })

  describe('Standalone display mode (Req 5.3)', () => {
    it('should set display to standalone', () => {
      expect(pwaOptions.manifest!.display).toBe('standalone')
    })
  })

  describe('Service worker configuration (Req 5.2)', () => {
    it('should configure registerType for service worker', () => {
      expect(pwaOptions.registerType).toBeDefined()
      expect(pwaOptions.registerType).toBe('autoUpdate')
    })
  })

  describe('Static asset precaching (Req 5.4)', () => {
    it('should configure workbox globPatterns for static assets', () => {
      expect(pwaOptions.workbox).toBeDefined()
      expect(pwaOptions.workbox!.globPatterns).toBeDefined()
    })

    it('should precache HTML, JS, CSS, and GeoJSON files', () => {
      const patterns = pwaOptions.workbox!.globPatterns!
      const joinedPatterns = patterns.join(',')

      expect(joinedPatterns).toContain('js')
      expect(joinedPatterns).toContain('css')
      expect(joinedPatterns).toContain('html')
      expect(joinedPatterns).toContain('geojson')
    })
  })

  describe('Supabase runtime caching (Req 9.1, 9.2)', () => {
    const runtimeCaching = pwaOptions.workbox!.runtimeCaching!

    it('should have runtimeCaching configured', () => {
      expect(runtimeCaching).toBeDefined()
      expect(Array.isArray(runtimeCaching)).toBe(true)
      expect(runtimeCaching.length).toBeGreaterThanOrEqual(4)
    })

    it('should cache Supabase REST API responses with NetworkFirst strategy', () => {
      const apiCache = runtimeCaching.find(
        (rule) => rule.options?.cacheName === 'supabase-api-cache'
      )
      expect(apiCache).toBeDefined()
      expect(apiCache!.handler).toBe('NetworkFirst')
      expect(apiCache!.urlPattern).toBeInstanceOf(RegExp)
      expect((apiCache!.urlPattern as RegExp).test('https://myproject.supabase.co/rest/v1/dish_entries')).toBe(true)
    })

    it('should cache popular_dishes responses with StaleWhileRevalidate for offline access', () => {
      const popularDishesCache = runtimeCaching.find(
        (rule) => rule.options?.cacheName === 'supabase-popular-dishes-cache'
      )
      expect(popularDishesCache).toBeDefined()
      expect(popularDishesCache!.handler).toBe('StaleWhileRevalidate')
      expect(popularDishesCache!.urlPattern).toBeInstanceOf(RegExp)
      expect((popularDishesCache!.urlPattern as RegExp).test('https://myproject.supabase.co/rest/v1/popular_dishes?country_code=eq.USA')).toBe(true)
    })

    it('should cache Supabase Auth session data with NetworkFirst strategy', () => {
      const authCache = runtimeCaching.find(
        (rule) => rule.options?.cacheName === 'supabase-auth-cache'
      )
      expect(authCache).toBeDefined()
      expect(authCache!.handler).toBe('NetworkFirst')
      expect(authCache!.urlPattern).toBeInstanceOf(RegExp)
      expect((authCache!.urlPattern as RegExp).test('https://myproject.supabase.co/auth/v1/token')).toBe(true)
    })

    it('should cache Supabase Storage images with CacheFirst strategy', () => {
      const storageCache = runtimeCaching.find(
        (rule) => rule.options?.cacheName === 'supabase-storage-images-cache'
      )
      expect(storageCache).toBeDefined()
      expect(storageCache!.handler).toBe('CacheFirst')
      expect(storageCache!.urlPattern).toBeInstanceOf(RegExp)
      expect((storageCache!.urlPattern as RegExp).test('https://myproject.supabase.co/storage/v1/object/public/dish-photos/household-id/photo.jpg')).toBe(true)
    })

    it('should set expiration on storage image cache', () => {
      const storageCache = runtimeCaching.find(
        (rule) => rule.options?.cacheName === 'supabase-storage-images-cache'
      )
      expect(storageCache!.options!.expiration).toBeDefined()
      expect(storageCache!.options!.expiration!.maxEntries).toBeGreaterThan(0)
      expect(storageCache!.options!.expiration!.maxAgeSeconds).toBeGreaterThan(0)
    })

    it('should set cacheable response statuses on all caching rules', () => {
      for (const rule of runtimeCaching) {
        expect(rule.options?.cacheableResponse?.statuses).toBeDefined()
        expect(rule.options!.cacheableResponse!.statuses).toContain(200)
      }
    })
  })
})
