import { useEffect } from 'react'
import { apiClient } from './shared/api/client'

function App() {
  useEffect(() => {
    const res = apiClient.get('/contents', { params: { limit: 3 } })
    console.log(res)
  })
  return (
    <div className="m-8 max-w-sm rounded-card border-[1.5px] border-line bg-white p-6 shadow-soft">
      <h1 className="text-3xl">EasyCoddy</h1>
      <p className="mt-2 text-ink-2">Soft Milk dizayn ishlayapti</p>
      <button className="mt-4 h-13.5 rounded-full bg-ink px-6 font-semibold text-milk">
        Boshlash
      </button>
    </div>
  )
}

export default App
