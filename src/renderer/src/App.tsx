import { AppSidebar } from '@renderer/components/AppSidebar'
import { Toaster } from '@renderer/components/ui/sonner'

function App(): React.JSX.Element {
  return (
    <>
      <AppSidebar>
        <h1 className="p-2 border-2">hello world</h1>
      </AppSidebar>
      <Toaster richColors />
    </>
  )
}

export default App
