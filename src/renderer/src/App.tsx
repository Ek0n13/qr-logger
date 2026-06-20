import { useState } from 'react'

import { AppSidebar, type AppPage } from '@renderer/components/AppSidebar'
import { Toaster } from '@renderer/components/ui/sonner'
import { LogsPage } from '@renderer/pages/LogsPage'
import { ScanPage } from '@renderer/pages/ScanPage'

function App(): React.JSX.Element {
  const [currentPage, setCurrentPage] = useState<AppPage>('scan')

  return (
    <div className="bg-zinc-300">
      <AppSidebar currentPage={currentPage} onPageChange={setCurrentPage}>
        {currentPage === 'scan' ? <ScanPage /> : <LogsPage />}
      </AppSidebar>
      <Toaster richColors />
    </div>
  )
}

export default App
