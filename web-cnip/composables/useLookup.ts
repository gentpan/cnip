export interface LookupResult {
  ip: string
  family: string
  startNum: string
  endNum: string
  continent: string
  country: string
  province: string
  city: string
  district: string
  isp: string
  longitude: string
  latitude: string
  areaCode: string
  cityCode: string
  zipCode: string
  timeZone: string
  currency: string
  asn: string
  elevation: string
  weatherStation: string
  countryChar: string
  isoCode: string
}

export interface LookupResponse {
  query: string
  queryType: string
  resolvedIps?: string[]
  results: LookupResult[]
}

type LookupCacheEntry = {
  response: LookupResponse
  dbUpdatedAt: string
  dbVersion: string
}

const lookupCache = new Map<string, LookupCacheEntry>()

export const useLookup = () => {
  const config = useRuntimeConfig()
  const pending = ref(false)
  const error = ref('')
  const data = ref<LookupResponse | null>(null)
  const dbUpdatedAt = ref('')
  const dbVersion = ref('')

  const fetchLookup = async (query: string) => {
    const normalizedQuery = query.trim()
    const cached = lookupCache.get(normalizedQuery)
    if (cached) return cached

    const res = await $fetch.raw<LookupResponse>('/lookup', {
      baseURL: config.public.apiBase,
      query: { q: normalizedQuery }
    })

    const entry = {
      response: res._data as LookupResponse,
      dbUpdatedAt: res.headers.get('x-db-updated-at') || '',
      dbVersion: res.headers.get('x-db-version') || ''
    }

    lookupCache.set(normalizedQuery, entry)
    return entry
  }

  const applyLookup = (entry: LookupCacheEntry) => {
    data.value = entry.response
    dbUpdatedAt.value = entry.dbUpdatedAt
    dbVersion.value = entry.dbVersion
  }

  const lookup = async (query: string) => {
    const normalizedQuery = query.trim()
    if (!normalizedQuery) return

    pending.value = true
    error.value = ''

    try {
      applyLookup(await fetchLookup(normalizedQuery))
    } catch (err) {
      error.value = err instanceof Error ? err.message : '查询失败'
      data.value = null
      dbUpdatedAt.value = ''
      dbVersion.value = ''
    } finally {
      pending.value = false
    }
  }

  const prefetchLookup = async (query: string) => {
    const normalizedQuery = query.trim()
    if (!normalizedQuery || lookupCache.has(normalizedQuery)) return

    try {
      await fetchLookup(normalizedQuery)
    } catch {
      // Prefetch is optional; the interactive lookup path reports errors.
    }
  }

  return {
    pending,
    error,
    data,
    dbUpdatedAt,
    dbVersion,
    lookup,
    prefetchLookup
  }
}
