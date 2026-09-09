import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { ErrorBoundary } from './ErrorBoundary.tsx'
import { ProgrammeProvider } from './programmeContext.tsx'

createRoot(document.getElementById('root')!).render(
  <ErrorBoundary>
    <ProgrammeProvider>
      <App />
    </ProgrammeProvider>
  </ErrorBoundary>
)
