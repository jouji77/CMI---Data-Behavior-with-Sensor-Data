import { useEffect } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import axios from 'axios'
import Sidebar from './Sidebar'

export default function Layout() {
  const navigate = useNavigate()

  useEffect(() => {
    const token = localStorage.getItem('auth_token')
    if (!token) {
      navigate('/login', { replace: true })
      return
    }
    // Set axios default header
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
  }, [navigate])

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  )
}
