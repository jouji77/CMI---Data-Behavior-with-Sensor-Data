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
import AdminLayout from './pages/admin/AdminLayout'
import AdminDashboard from './pages/admin/AdminDashboard'
import Companies from './pages/admin/Companies'
import Compressors from './pages/admin/Compressors'
import AdminUsers from './pages/admin/Users'
import AdminSpareParts from './pages/admin/AdminSpareParts'
import AdminArticles from './pages/admin/AdminArticles'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Admin routes */}
        <Route element={<AdminLayout />}>
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/companies" element={<Companies />} />
          <Route path="/admin/compressors" element={<Compressors />} />
          <Route path="/admin/users" element={<AdminUsers />} />
          <Route path="/admin/spare-parts" element={<AdminSpareParts />} />
          <Route path="/admin/articles" element={<AdminArticles />} />
        </Route>

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
