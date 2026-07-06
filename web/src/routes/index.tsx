import { createFileRoute } from '@tanstack/react-router'
import { LookupView } from '@/components/LookupView'

export const Route = createFileRoute('/')({
  validateSearch: (search: Record<string, unknown>) => ({
    q: typeof search.q === 'string' ? search.q : undefined,
  }),
  component: Home,
})

function Home() {
  const search = Route.useSearch()
  return <LookupView search={search} />
}
