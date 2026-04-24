import { Component, type ErrorInfo, type ReactNode } from 'react'
import { Button } from '@/components/ui/button'

type Props = { children: ReactNode }
type State = { error: Error | null }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('Error boundary caught:', error, info)
  }

  render() {
    if (this.state.error) {
      return (
        <div className="container mx-auto max-w-xl py-16 px-4 text-center">
          <h1 className="font-heading text-2xl font-extrabold mb-2">Well, that broke.</h1>
          <p className="text-sm text-muted-foreground mb-6">{this.state.error.message}</p>
          <Button onClick={() => (window.location.href = '/')}>Take me home</Button>
        </div>
      )
    }
    return this.props.children
  }
}
