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

export const useLookup = () => {
  const config = useRuntimeConfig()
  const pending = ref(false)
  const error = ref('')
  const data = ref<LookupResponse | null>(null)
  const dbUpdatedAt = ref('')
  const dbVersion = ref('')

  const lookup = async (query: string) => {
    pending.value = true
    error.value = ''

    try {
      const res = await $fetch.raw<LookupResponse>('/lookup', {
        baseURL: config.public.apiBase,
        query: { q: query.trim() }
      })
      data.value = res._data
      dbUpdatedAt.value = res.headers.get('x-db-updated-at') || ''
      dbVersion.value = res.headers.get('x-db-version') || ''
    } catch (err) {
      error.value = err instanceof Error ? err.message : '查询失败'
      data.value = null
      dbUpdatedAt.value = ''
      dbVersion.value = ''
    } finally {
      pending.value = false
    }
  }

  return {
    pending,
    error,
    data,
    dbUpdatedAt,
    dbVersion,
    lookup
  }
}
