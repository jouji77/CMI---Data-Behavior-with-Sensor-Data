import { useEffect, useState, useRef } from 'react'
import axios from 'axios'
import { Bot, Send, RefreshCw, FileText, CheckSquare, Square, Loader, Trash2, BookOpen } from 'lucide-react'
import clsx from 'clsx'

interface Document {
  id: number
  original_name: string
  category: string
  is_indexed: boolean
  file_type: string
}

interface ConversationMessage {
  role: 'user' | 'assistant'
  content: string
  sources?: string[]
  timestamp: Date
}

export default function AIChatbot() {
  const [documents, setDocuments] = useState<Document[]>([])
  const [selectedDocIds, setSelectedDocIds] = useState<number[]>([])
  const [conversation, setConversation] = useState<ConversationMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [indexingId, setIndexingId] = useState<number | null>(null)
  const [showDocs, setShowDocs] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [conversation])

  const fetchDocuments = async () => {
    try {
      const res = await axios.get('/api/documents')
      setDocuments(res.data.documents || [])
    } catch (e) {
      console.error(e)
    }
  }

  useEffect(() => {
    fetchDocuments()
  }, [])

  const toggleDocSelection = (id: number) => {
    setSelectedDocIds(prev =>
      prev.includes(id) ? prev.filter(d => d !== id) : [...prev, id]
    )
  }

  const indexDocument = async (docId: number) => {
    setIndexingId(docId)
    try {
      await axios.post(`/api/chatbot/index/${docId}`)
      await fetchDocuments()
    } catch (e) {
      console.error(e)
    } finally {
      setIndexingId(null)
    }
  }

  const sendMessage = async () => {
    if (!input.trim() || loading) return

    const userMsg: ConversationMessage = {
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    }

    setConversation(prev => [...prev, userMsg])
    setInput('')
    setLoading(true)

    const historyForApi = conversation.map(m => ({
      role: m.role,
      content: m.content,
    }))

    try {
      const res = await axios.post('/api/chatbot/chat', {
        message: userMsg.content,
        document_ids: selectedDocIds,
        conversation_history: historyForApi,
      })

      const assistantMsg: ConversationMessage = {
        role: 'assistant',
        content: res.data.response,
        sources: res.data.sources || [],
        timestamp: new Date(),
      }
      setConversation(prev => [...prev, assistantMsg])
    } catch (e) {
      const errorMsg: ConversationMessage = {
        role: 'assistant',
        content: 'エラーが発生しました。しばらくしてから再試行してください。',
        timestamp: new Date(),
      }
      setConversation(prev => [...prev, errorMsg])
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const clearConversation = () => {
    setConversation([])
  }

  const indexedDocs = documents.filter(d => d.is_indexed)

  return (
    <div className="flex h-screen">
      {/* Document Panel */}
      <div className={clsx('bg-white border-r border-gray-100 flex flex-col transition-all', showDocs ? 'w-72' : 'w-12')}>
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          {showDocs && <h2 className="text-sm font-semibold text-slate-700">参照ドキュメント</h2>}
          <button
            onClick={() => setShowDocs(!showDocs)}
            className="p-1 text-slate-400 hover:text-slate-600 hover:bg-gray-50 rounded transition-colors"
            title={showDocs ? 'パネルを閉じる' : 'パネルを開く'}
          >
            <BookOpen size={16} />
          </button>
        </div>

        {showDocs && (
          <div className="flex-1 overflow-y-auto p-3">
            {documents.length === 0 ? (
              <div className="text-center py-6 text-slate-400">
                <FileText size={24} className="mx-auto mb-2 opacity-40" />
                <p className="text-xs">ドキュメントライブラリーにファイルをアップロードしてください</p>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-xs text-slate-400 mb-3">
                  インデックス済みのドキュメントをチェックしてAIに参照させてください
                </p>
                {documents.map(doc => (
                  <div
                    key={doc.id}
                    className={clsx(
                      'p-2.5 rounded-lg border transition-colors',
                      doc.is_indexed && selectedDocIds.includes(doc.id)
                        ? 'border-red-200 bg-red-50'
                        : 'border-gray-100 bg-white'
                    )}
                  >
                    <div className="flex items-start gap-2">
                      {doc.is_indexed ? (
                        <button
                          onClick={() => toggleDocSelection(doc.id)}
                          className="mt-0.5 text-red-600 flex-shrink-0"
                        >
                          {selectedDocIds.includes(doc.id) ? (
                            <CheckSquare size={14} />
                          ) : (
                            <Square size={14} />
                          )}
                        </button>
                      ) : (
                        <Square size={14} className="mt-0.5 text-gray-300 flex-shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-slate-700 truncate" title={doc.original_name}>
                          {doc.original_name}
                        </p>
                        <p className="text-xs text-slate-400">{doc.category}</p>
                        <div className="flex items-center gap-1 mt-1.5">
                          {doc.is_indexed ? (
                            <span className="text-xs bg-green-100 text-green-600 px-1.5 py-0.5 rounded">
                              インデックス済
                            </span>
                          ) : (
                            <button
                              onClick={() => indexDocument(doc.id)}
                              disabled={indexingId === doc.id}
                              className="flex items-center gap-1 text-xs bg-red-50 text-red-600 px-1.5 py-0.5 rounded hover:bg-red-100 transition-colors disabled:opacity-50"
                            >
                              {indexingId === doc.id ? (
                                <><Loader size={10} className="animate-spin" />処理中</>
                              ) : (
                                <>インデックス</>
                              )}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {indexedDocs.length > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <button
                  onClick={() => setSelectedDocIds(indexedDocs.map(d => d.id))}
                  className="w-full text-xs text-red-600 hover:underline text-left"
                >
                  すべて選択 ({indexedDocs.length}件)
                </button>
                {selectedDocIds.length > 0 && (
                  <button
                    onClick={() => setSelectedDocIds([])}
                    className="w-full text-xs text-slate-400 hover:underline text-left mt-1"
                  >
                    選択解除
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b border-gray-100 px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
              <Bot size={16} className="text-red-600" />
            </div>
            <div>
              <h1 className="text-sm font-semibold text-slate-700">AIチャットボット</h1>
              <p className="text-xs text-slate-400">
                {selectedDocIds.length > 0
                  ? `${selectedDocIds.length}件のドキュメントを参照中`
                  : 'ドキュメントなし（一般回答モード）'}
              </p>
            </div>
          </div>
          {conversation.length > 0 && (
            <button
              onClick={clearConversation}
              className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-600 px-2 py-1 rounded hover:bg-gray-100 transition-colors"
            >
              <Trash2 size={12} />
              会話をクリア
            </button>
          )}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {conversation.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-slate-400">
              <Bot size={48} className="mb-3 opacity-30" />
              <p className="text-sm font-medium">遠心圧縮機AIアシスタント</p>
              <p className="text-xs mt-1 text-center max-w-sm">
                圧縮機に関する技術的な質問にお答えします。
                ドキュメントをインデックスして選択することで、より正確な回答を得られます。
              </p>
              <div className="mt-4 grid grid-cols-1 gap-2 max-w-xs w-full">
                {[
                  'トラブルシューティングの方法は？',
                  '効率低下の原因を教えてください',
                  '振動増加の対処法は？',
                ].map(q => (
                  <button
                    key={q}
                    onClick={() => setInput(q)}
                    className="text-xs text-left px-3 py-2 bg-white border border-gray-200 rounded-lg hover:border-red-300 hover:bg-red-50 transition-colors text-slate-600"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {conversation.map((msg, idx) => (
            <div key={idx} className={clsx('flex gap-3', msg.role === 'user' ? 'flex-row-reverse' : 'flex-row')}>
              <div className={clsx(
                'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0',
                msg.role === 'user' ? 'bg-red-600' : 'bg-white border border-gray-200'
              )}>
                {msg.role === 'user' ? (
                  <span className="text-white text-xs font-bold">You</span>
                ) : (
                  <Bot size={14} className="text-red-600" />
                )}
              </div>

              <div className={clsx('max-w-xl', msg.role === 'user' ? 'items-end' : 'items-start', 'flex flex-col gap-1')}>
                <div className={clsx(
                  'px-4 py-3 rounded-2xl text-sm shadow-sm leading-relaxed',
                  msg.role === 'user'
                    ? 'bg-red-600 text-white rounded-tr-sm'
                    : 'bg-white text-slate-700 rounded-tl-sm border border-gray-100'
                )}>
                  <pre className="whitespace-pre-wrap font-sans">{msg.content}</pre>
                </div>

                {msg.sources && msg.sources.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    <span className="text-xs text-slate-400">参照:</span>
                    {msg.sources.map((s, i) => (
                      <span key={i} className="text-xs bg-yellow-50 text-yellow-700 border border-yellow-200 px-1.5 py-0.5 rounded">
                        {s}
                      </span>
                    ))}
                  </div>
                )}

                <span className="text-xs text-slate-400">
                  {msg.timestamp.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-white border border-gray-200 flex items-center justify-center flex-shrink-0">
                <Bot size={14} className="text-red-600" />
              </div>
              <div className="bg-white border border-gray-100 px-4 py-3 rounded-2xl rounded-tl-sm shadow-sm">
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="bg-white border-t border-gray-100 p-4">
          {selectedDocIds.length > 0 && (
            <div className="flex items-center gap-2 mb-2 text-xs text-slate-400">
              <FileText size={12} />
              <span>{selectedDocIds.length}件のドキュメントを参照してAIが回答します</span>
            </div>
          )}
          <div className="flex gap-3">
            <textarea
              placeholder="圧縮機に関する質問を入力してください..."
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={2}
              className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim() || loading}
              className="px-4 bg-red-600 text-white rounded-xl hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors self-end py-2.5"
            >
              {loading ? <RefreshCw size={16} className="animate-spin" /> : <Send size={16} />}
            </button>
          </div>
          <p className="text-xs text-slate-400 mt-2">Enterで送信、Shift+Enterで改行</p>
        </div>
      </div>
    </div>
  )
}
