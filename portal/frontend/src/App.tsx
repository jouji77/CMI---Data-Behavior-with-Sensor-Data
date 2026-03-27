import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import SensorDiagnostics from './pages/SensorDiagnostics'
import DocumentLibrary from './pages/DocumentLibrary'
import ChatTool from './pages/ChatTool'
import AIChatbot from './pages/AIChatbot'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="sensor" element={<SensorDiagnostics />} />
          <Route path="documents" element={<DocumentLibrary />} />
          <Route path="chat" element={<ChatTool />} />
          <Route path="chatbot" element={<AIChatbot />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
