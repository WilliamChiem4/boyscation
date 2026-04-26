import { Outlet } from 'react-router-dom'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { AnimeAvatar } from '@/components/AnimeAvatar'

export default function App() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <ErrorBoundary>
        <Outlet />
      </ErrorBoundary>
      <AnimeAvatar />
    </div>
  )
}
