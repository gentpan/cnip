export interface MetaDatabase {
  family: string
  path: string
  createdAt: number
  createdDate: string
}

export interface MetaResponse {
  service: string
  publicBaseUrl: string
  updateEnabled: boolean
  databases: MetaDatabase[]
}

export const useMeta = () => {
  const config = useRuntimeConfig()
  const pending = ref(false)
  const error = ref('')
  const data = ref<MetaResponse | null>(null)

  const load = async () => {
    pending.value = true
    error.value = ''

    try {
      data.value = await $fetch<MetaResponse>('/api/v1/meta', {
        baseURL: config.public.apiBase || undefined
      })
    } catch (err) {
      error.value = err instanceof Error ? err.message : '读取版本信息失败'
    } finally {
      pending.value = false
    }
  }

  return {
    pending,
    error,
    data,
    load
  }
}

