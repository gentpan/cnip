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
  raw: string
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

  const lookup = async (query: string) => {
    pending.value = true
    error.value = ''

    try {
      data.value = await $fetch<LookupResponse>('/api/v1/lookup', {
        baseURL: config.public.apiBase,
        query: { q: query.trim() }
      })
    } catch (err) {
      error.value = err instanceof Error ? err.message : '查询失败'
      data.value = null
    } finally {
      pending.value = false
    }
  }

  return {
    pending,
    error,
    data,
    lookup
  }
}
