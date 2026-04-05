export interface EnhanceResult {
  query: string
  org: string
  as: string
  asname: string
  reverse: string
  mobile: boolean
  proxy: boolean
  hosting: boolean
  source: string
  enhanced: boolean
}

export const useEnhance = () => {
  const config = useRuntimeConfig()
  const pending = ref<Record<string, boolean>>({})
  const error = ref<Record<string, string>>({})
  const data = ref<Record<string, EnhanceResult>>({})

  const load = async (query: string) => {
    const key = query.trim()
    if (!key) return

    pending.value = { ...pending.value, [key]: true }
    error.value = { ...error.value, [key]: '' }

    try {
      const result = await $fetch<EnhanceResult>('/api/v1/enrich', {
        baseURL: config.public.apiBase || undefined,
        query: { q: key }
      })

      data.value = { ...data.value, [key]: result }
    } catch (err) {
      error.value = {
        ...error.value,
        [key]: err instanceof Error ? err.message : '增强信息读取失败'
      }
    } finally {
      pending.value = { ...pending.value, [key]: false }
    }
  }

  const reset = () => {
    pending.value = {}
    error.value = {}
    data.value = {}
  }

  return {
    pending,
    error,
    data,
    load,
    reset
  }
}
