import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import axios from 'axios'
import { BookOpen, X, Search, Calendar, User } from 'lucide-react'

interface Article {
  id: number
  title_ja: string
  title_en: string
  content_ja: string
  content_en: string
  category: string
  tags: string[]
  author: string
  published_at: string
  thumbnail_url: string | null
}

const CATEGORIES = [
  { key: 'all', ja: 'すべて', en: 'All' },
  { key: '技術情報', ja: '技術情報', en: 'Technical' },
  { key: 'サービス情報', ja: 'サービス情報', en: 'Service' },
  { key: '製品情報', ja: '製品情報', en: 'Product' },
  { key: '事例紹介', ja: '事例紹介', en: 'Case Study' },
]

const CATEGORY_COLORS: Record<string, string> = {
  '技術情報': 'bg-blue-100 text-blue-700',
  'サービス情報': 'bg-green-100 text-green-700',
  '製品情報': 'bg-purple-100 text-purple-700',
  '事例紹介': 'bg-orange-100 text-orange-700',
}

function CategoryLabel({ category, lang }: { category: string; lang: string }) {
  const cat = CATEGORIES.find(c => c.key === category)
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${CATEGORY_COLORS[category] || 'bg-gray-100 text-gray-600'}`}>
      {lang === 'en' ? cat?.en || category : cat?.ja || category}
    </span>
  )
}

function ArticleDetailModal({ article, onClose }: { article: Article; onClose: () => void }) {
  const { i18n } = useTranslation()
  const lang = i18n.language
  const title = lang === 'en' ? article.title_en : article.title_ja
  const content = lang === 'en' ? article.content_en : article.content_ja

  // Simple markdown-like rendering
  const renderContent = (text: string) => {
    return text.split('\n').map((line, i) => {
      if (line.startsWith('## ')) {
        return <h2 key={i} className="text-lg font-bold text-gray-800 mt-4 mb-2">{line.slice(3)}</h2>
      }
      if (line.startsWith('**') && line.endsWith('**')) {
        return <p key={i} className="font-semibold text-gray-700">{line.slice(2, -2)}</p>
      }
      if (line.startsWith('- ')) {
        return <li key={i} className="ml-4 text-gray-700 text-sm">{line.slice(2)}</li>
      }
      if (line === '') return <br key={i} />
      return <p key={i} className="text-gray-700 text-sm leading-relaxed">{line}</p>
    })
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col">
        <div className="flex items-start justify-between px-6 py-4 border-b flex-shrink-0">
          <div className="flex-1 mr-4">
            <CategoryLabel category={article.category} lang={lang} />
            <h2 className="text-lg font-bold text-gray-900 mt-2">{title}</h2>
            <div className="flex items-center gap-4 text-xs text-gray-500 mt-1">
              <span className="flex items-center gap-1"><User size={11} />{article.author}</span>
              <span className="flex items-center gap-1">
                <Calendar size={11} />{new Date(article.published_at).toLocaleDateString('ja-JP')}
              </span>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 flex-shrink-0"><X size={20} /></button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="space-y-1">{renderContent(content)}</div>
          {article.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-6 pt-4 border-t">
              {article.tags.map(tag => (
                <span key={tag} className="bg-gray-100 text-gray-500 text-xs px-2 py-0.5 rounded">#{tag}</span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function TechnicalInfo() {
  const { t, i18n } = useTranslation()
  const lang = i18n.language
  const [articles, setArticles] = useState<Article[]>([])
  const [loading, setLoading] = useState(true)
  const [category, setCategory] = useState('all')
  const [keyword, setKeyword] = useState('')
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null)

  const fetchArticles = async () => {
    setLoading(true)
    try {
      const params: any = {}
      if (category !== 'all') params.category = category
      if (keyword) params.keyword = keyword
      const res = await axios.get('/api/articles', { params })
      setArticles(res.data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchArticles() }, [category, keyword])

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-9 h-9 bg-red-600 rounded-lg flex items-center justify-center">
          <BookOpen size={20} className="text-white" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900">{t('articles.title')}</h1>
      </div>

      {/* Search & Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder={t('articles.searchPlaceholder')}
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map(cat => (
              <button
                key={cat.key}
                onClick={() => setCategory(cat.key)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  category === cat.key
                    ? 'bg-red-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {lang === 'en' ? cat.en : cat.ja}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">{t('common.loading')}</div>
      ) : articles.length === 0 ? (
        <div className="text-center py-12 text-gray-400">{t('articles.noArticles')}</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {articles.map(article => {
            const title = lang === 'en' ? article.title_en : article.title_ja
            const content = lang === 'en' ? article.content_en : article.content_ja
            const excerpt = content.replace(/##.*\n/g, '').replace(/\n/g, ' ').slice(0, 100) + '...'

            return (
              <div
                key={article.id}
                className="bg-white rounded-xl border border-gray-200 hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => setSelectedArticle(article)}
              >
                {/* Thumbnail placeholder */}
                <div className="h-32 bg-gradient-to-br from-gray-700 to-gray-900 rounded-t-xl flex items-center justify-center">
                  <BookOpen size={40} className="text-gray-600" />
                </div>

                <div className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <CategoryLabel category={article.category} lang={lang} />
                    <span className="text-xs text-gray-400">
                      {new Date(article.published_at).toLocaleDateString('ja-JP')}
                    </span>
                  </div>
                  <h3 className="font-semibold text-gray-800 text-sm leading-snug mb-2 line-clamp-2">{title}</h3>
                  <p className="text-xs text-gray-500 leading-relaxed line-clamp-2">{excerpt}</p>
                  <div className="flex items-center justify-between mt-3">
                    <span className="text-xs text-gray-400 flex items-center gap-1"><User size={10} />{article.author}</span>
                    <span className="text-xs text-red-600 font-medium">{t('articles.readMore')} →</span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {selectedArticle && (
        <ArticleDetailModal article={selectedArticle} onClose={() => setSelectedArticle(null)} />
      )}
    </div>
  )
}
