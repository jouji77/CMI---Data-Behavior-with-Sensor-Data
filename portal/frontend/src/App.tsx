import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import SensorDiagnostics from './pages/SensorDiagnostics'
import DocumentLibrary from './pages/DocumentLibrary'
import ChatTool from './pages/ChatTool'
import AIChatbot from './pages/AIChatbot'
import Login from './pages/Login'
import Register from './pages/Register'
import MaintenanceHistory from './pages/MaintenanceHistory'
import TechnicalInfo from './pages/TechnicalInfo'
import SpareParts from './pages/SpareParts'
import InspectionItems from './pages/InspectionItems'
import SolutionMenu from './pages/SolutionMenu'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Protected routes (auth guard in Layout) */}
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="sensor" element={<SensorDiagnostics />} />
          <Route path="documents" element={<DocumentLibrary />} />
          <Route path="chat" element={<ChatTool />} />
          <Route path="chatbot" element={<AIChatbot />} />
          <Route path="maintenance" element={<MaintenanceHistory />} />
          <Route path="technical" element={<TechnicalInfo />} />
          <Route path="spare-parts" element={<SpareParts />} />
          <Route path="inspection" element={<InspectionItems />} />
          <Route path="solution" element={<SolutionMenu />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
