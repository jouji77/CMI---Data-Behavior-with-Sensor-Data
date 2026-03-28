import { useEffect, useState, useRef, useCallback } from 'react'
import axios from 'axios'
import { MessageSquare, Send, Plus, Users, X, Hash } from 'lucide-react'
import clsx from 'clsx'

interface ChatRoom {
  room_id: string
  room_name: string
  created_at: string
  created_by: string
  active_users: { user_name: string; user_role: string }[]
  is_active: boolean
}

interface ChatMessage {
  id?: number
  type: 'message' | 'system'
  room_id?: string
  sender_name?: string
  sender_role?: string
  message: string
  timestamp: string
  users?: { user_name: string; user_role: string }[]
}

interface UserSetup {
  name: string
  role: string
}

export default function ChatTool() {
  const [userSetup, setUserSetup] = useState<UserSetup | null>(null)
  const [setupForm, setSetupForm] = useState({ name: '', role: '顧客' })
  const [rooms, setRooms] = useState<ChatRoom[]>([])
  const [selectedRoom, setSelectedRoom] = useState<ChatRoom | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [onlineUsers, setOnlineUsers] = useState<{ user_name: string; user_role: string }[]>([])
  const [showNewRoom, setShowNewRoom] = useState(false)
  const [newRoomName, setNewRoomName] = useState('')
  const wsRef = useRef<WebSocket | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const fetchRooms = async () => {
    try {
      const res = await axios.get('/api/chat/rooms')
      setRooms(res.data.rooms || [])
    } catch (e) {
      console.error(e)
    }
  }

  useEffect(() => {
    fetchRooms()
    const interval = setInterval(fetchRooms, 5000)
    return () => clearInterval(interval)
  }, [])

  const connectToRoom = useCallback(async (room: ChatRoom, user: UserSetup) => {
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }

    // Load history
    try {
      const res = await axios.get(`/api/chat/messages/${room.room_id}`)
      const history: ChatMessage[] = (res.data.messages || []).map((m: {
        id: number
        room_id: string
        sender_name: string
        sender_role: string
        message: string
        timestamp: string
      }) => ({ ...m, type: 'message' as const }))
      setMessages(history)
    } catch {
      setMessages([])
    }

    setSelectedRoom(room)

    // Connect WebSocket
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const wsUrl = `${wsProtocol}//localhost:8000/api/chat/ws/${room.room_id}/${encodeURIComponent(user.name)}/${encodeURIComponent(user.role)}`
    const ws = new WebSocket(wsUrl)

    ws.onopen = () => {
      console.log('WebSocket connected')
    }

    ws.onmessage = (event) => {
      try {
        const data: ChatMessage = JSON.parse(event.data)
        setMessages(prev => [...prev, data])
        if (data.users) setOnlineUsers(data.users)
      } catch (e) {
        console.error('WS parse error', e)
      }
    }

    ws.onclose = () => {
      console.log('WebSocket disconnected')
    }

    ws.onerror = (e) => {
      console.error('WebSocket error', e)
    }

    wsRef.current = ws
  }, [])

  useEffect(() => {
    return () => {
      wsRef.current?.close()
    }
  }, [])

  const sendMessage = () => {
    if (!newMessage.trim() || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return
    wsRef.current.send(JSON.stringify({ message: newMessage.trim() }))
    setNewMessage('')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const createRoom = async () => {
    if (!newRoomName.trim() || !userSetup) return
    try {
      const res = await axios.post('/api/chat/rooms', {
        room_name: newRoomName.trim(),
        created_by: userSetup.name,
      })
      const newRoom = res.data
      await fetchRooms()
      setNewRoomName('')
      setShowNewRoom(false)
      await connectToRoom({ ...newRoom, active_users: [], is_active: false }, userSetup)
    } catch (e) {
      console.error(e)
    }
  }

  const handleSetupSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!setupForm.name.trim()) return
    setUserSetup({ name: setupForm.name.trim(), role: setupForm.role })
  }

  const formatTime = (ts: string) => {
    try {
      return new Date(ts).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })
    } catch {
      return ts
    }
  }

  const roleColor: Record<string, string> = {
    '顧客': 'bg-blue-100 text-blue-700',
    'customer': 'bg-blue-100 text-blue-700',
    'ベンダー': 'bg-orange-100 text-orange-700',
    'vendor': 'bg-orange-100 text-orange-700',
  }

  // Setup Modal
  if (!userSetup) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8 w-full max-w-sm">
          <div className="text-center mb-6">
            <div className="w-14 h-14 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-3">
              <MessageSquare size={24} className="text-red-600" />
            </div>
            <h2 className="text-xl font-bold text-slate-800">チャットに参加</h2>
            <p className="text-sm text-slate-500 mt-1">名前と役割を入力してください</p>
          </div>
          <form onSubmit={handleSetupSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">お名前</label>
              <input
                type="text"
                required
                placeholder="山田 太郎"
                value={setupForm.name}
                onChange={e => setSetupForm(f => ({ ...f, name: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">役割</label>
              <select
                value={setupForm.role}
                onChange={e => setSetupForm(f => ({ ...f, role: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                <option value="顧客">顧客</option>
                <option value="ベンダー">ベンダー</option>
              </select>
            </div>
            <button
              type="submit"
              className="w-full py-2.5 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors"
            >
              チャットを開始
            </button>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen">
      {/* Sidebar: Room List */}
      <div className="w-64 bg-white border-r border-gray-100 flex flex-col">
        <div className="p-4 border-b border-gray-100">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-sm font-semibold text-slate-700">チャットルーム</h2>
            <button
              onClick={() => setShowNewRoom(true)}
              className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
              title="新しいルーム"
            >
              <Plus size={16} />
            </button>
          </div>
          <div className="text-xs text-slate-400">
            {userSetup.name} ({userSetup.role})
          </div>
        </div>

        {/* New Room Form */}
        {showNewRoom && (
          <div className="p-3 border-b border-gray-100 bg-gray-50">
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="ルーム名"
                value={newRoomName}
                onChange={e => setNewRoomName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && createRoom()}
                className="flex-1 px-2 py-1.5 text-xs border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-red-500"
                autoFocus
              />
              <button onClick={createRoom} className="p-1.5 bg-red-600 text-white rounded hover:bg-red-700">
                <Plus size={12} />
              </button>
              <button onClick={() => setShowNewRoom(false)} className="p-1.5 text-gray-400 hover:bg-gray-100 rounded">
                <X size={12} />
              </button>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto">
          {rooms.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-xs px-4">
              <MessageSquare size={24} className="mx-auto mb-2 opacity-40" />
              <p>ルームがありません</p>
              <p className="mt-1">「+」で作成してください</p>
            </div>
          ) : (
            rooms.map(room => (
              <button
                key={room.room_id}
                onClick={() => connectToRoom(room, userSetup)}
                className={clsx(
                  'w-full text-left px-4 py-3 border-b border-gray-50 hover:bg-gray-50 transition-colors',
                  selectedRoom?.room_id === room.room_id && 'bg-red-50 border-l-2 border-l-red-600'
                )}
              >
                <div className="flex items-center gap-2">
                  <Hash size={12} className="text-slate-400" />
                  <span className="text-sm font-medium text-slate-700 truncate">{room.room_name}</span>
                  {room.is_active && <span className="w-2 h-2 bg-green-400 rounded-full flex-shrink-0" />}
                </div>
                <div className="text-xs text-slate-400 mt-0.5 ml-4">
                  {room.active_users.length > 0 ? `${room.active_users.length}名参加中` : `作成者: ${room.created_by}`}
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col bg-gray-50">
        {!selectedRoom ? (
          <div className="flex-1 flex items-center justify-center text-slate-400">
            <div className="text-center">
              <MessageSquare size={48} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm">ルームを選択してチャットを開始</p>
            </div>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="bg-white border-b border-gray-100 px-5 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Hash size={16} className="text-slate-400" />
                <span className="font-semibold text-slate-700">{selectedRoom.room_name}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-400">
                <Users size={14} />
                {onlineUsers.length > 0 ? (
                  <span>{onlineUsers.map(u => u.user_name).join(', ')}</span>
                ) : (
                  <span>参加者なし</span>
                )}
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {messages.map((msg, idx) => {
                if (msg.type === 'system') {
                  return (
                    <div key={idx} className="text-center">
                      <span className="text-xs text-slate-400 bg-white px-3 py-1 rounded-full border border-gray-100">
                        {msg.message}
                      </span>
                    </div>
                  )
                }

                const isMe = msg.sender_name === userSetup.name
                return (
                  <div key={idx} className={clsx('flex gap-2', isMe ? 'flex-row-reverse' : 'flex-row')}>
                    <div className={clsx(
                      'w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0',
                      msg.sender_role === '顧客' || msg.sender_role === 'customer' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'
                    )}>
                      {(msg.sender_name || '?')[0].toUpperCase()}
                    </div>
                    <div className={clsx('max-w-xs lg:max-w-md', isMe ? 'items-end' : 'items-start', 'flex flex-col gap-0.5')}>
                      <div className={clsx('flex items-center gap-2 text-xs', isMe ? 'flex-row-reverse' : '')}>
                        <span className="font-medium text-slate-600">{msg.sender_name}</span>
                        <span className={clsx('px-1.5 py-0.5 rounded-full', roleColor[msg.sender_role || ''] || 'bg-gray-100 text-gray-600')}>
                          {msg.sender_role}
                        </span>
                        <span className="text-slate-400">{formatTime(msg.timestamp)}</span>
                      </div>
                      <div className={clsx(
                        'px-3 py-2 rounded-2xl text-sm shadow-sm',
                        isMe ? 'bg-red-600 text-white rounded-tr-sm' : 'bg-white text-slate-700 rounded-tl-sm border border-gray-100'
                      )}>
                        {msg.message}
                      </div>
                    </div>
                  </div>
                )
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="bg-white border-t border-gray-100 p-4">
              <div className="flex gap-3">
                <input
                  type="text"
                  placeholder="メッセージを入力..."
                  value={newMessage}
                  onChange={e => setNewMessage(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                />
                <button
                  onClick={sendMessage}
                  disabled={!newMessage.trim()}
                  className="px-4 py-2.5 bg-red-600 text-white rounded-xl hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Send size={16} />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
