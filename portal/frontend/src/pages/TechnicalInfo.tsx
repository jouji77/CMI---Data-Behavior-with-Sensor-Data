import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import axios from 'axios'
import { BookOpen, X, Search, Calendar, User, ArrowRight } from 'lucide-react'

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

const CATEGORY_CONFIG: Record<string, { cls: string }> = {
  '技術情報': { cls: 'bg-sky-50 text-sky-700 border border-sky-200' },
  'サービス情報': { cls: 'bg-emerald-50 text-emerald-700 border border-emerald-200' },
  '製品情報': { cls: 'bg-violet-50 text-violet-700 border border-violet-200' },
  '事例紹介': { cls: 'bg-amber-50 text-amber-700 border border-amber-200' },
}

const THUMB_COLORS: Record<string, string> = {
  '技術情報': 'from-sky-900 to-sky-700',
  'サービス情報': 'from-emerald-900 to-emerald-700',
  '製品情報': 'from-violet-900 to-violet-700',
  '事例紹介': 'from-amber-900 to-amber-700',
}

function CategoryLabel({ category, lang }: { category: string; lang: string }) {
  const cat = CATEGORIES.find(c => c.key === category)
  const cfg = CATEGORY_CONFIG[category]
  return (
    <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${cfg?.cls || 'bg-gray-50 text-gray-600 border border-gray-200'}`}>
      {lang === 'en' ? cat?.en || category : cat?.ja || category}
    </span>
  )
}

function ArticleDetailModal({ article, onClose }: { article: Article; onClose: () => void }) {
  const { i18n } = useTranslation()
  const lang = i18n.language
  const title = lang === 'en' ? article.title_en : article.title_ja
  const content = lang === 'en' ? article.content_en : article.content_ja

  const renderContent = (text: string) => {
    return text.split('\n').map((line, i) => {
      if (line.startsWith('## ')) {
        return <h2 key={i} className="text-base font-bold text-gray-800 mt-5 mb-2">{line.slice(3)}</h2>
      }
      if (line.startsWith('**') && line.endsWith('**')) {
        return <p key={i} className="font-semibold text-gray-700">{line.slice(2, -2)}</p>
      }
      if (line.startsWith('- ')) {
        return <li key={i} className="ml-4 text-gray-600 text-sm leading-relaxed">{line.slice(2)}</li>
      }
      if (line === '') return <br key={i} />
      return <p key={i} className="text-gray-600 text-sm leading-relaxed">{line}</p>
    })
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col animate-fade-in">
        <div className="flex items-start justify-between px-6 py-5 border-b border-gray-100 flex-shrink-0">
          <div className="flex-1 mr-4">
            <CategoryLabel category={article.category} lang={lang} />
            <h2 className="text-lg font-bold text-gray-900 mt-2 mb-1 leading-snug">{title}</h2>
            <div className="flex items-center gap-4 text-xs text-gray-400">
              <span className="flex items-center gap-1"><User size={11} />{article.author}</span>
              <span className="flex items-center gap-1">
                <Calendar size={11} />{new Date(article.published_at).toLocaleDateString('ja-JP')}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
          >
            <X size={18} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5">
          <div className="space-y-1">{renderContent(content)}</div>
          {article.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-6 pt-5 border-t border-gray-100">
              {article.tags.map(tag => (
                <span key={tag} className="bg-gray-50 text-gray-500 border border-gray-200 text-xs px-2 py-0.5 rounded-lg">#{tag}</span>
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
    <div className="p-8 animate-fade-in max-w-6xl">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">{t('articles.title')}</h1>
        <p className="text-gray-400 mt-1 text-sm">技術情報・サービス情報ライブラリ</p>
      </div>

      {/* Search & Filters */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder={t('articles.searchPlaceholder')}
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-rose-500 transition-colors"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map(cat => (
              <button
                key={cat.key}
                onClick={() => setCategory(cat.key)}
                className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all duration-150 border ${
                  category === cat.key
                    ? 'bg-rose-600 text-white border-rose-600 shadow-sm shadow-rose-200'
                    : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300 hover:text-gray-700'
                }`}
              >
                {lang === 'en' ? cat.en : cat.ja}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3,4,5,6].map(i => (
            <div key={i} className="h-64 bg-gray-100 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : articles.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <BookOpen size={40} className="mx-auto mb-3 opacity-20" />
          <p className="text-sm font-medium">{t('articles.noArticles')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {articles.map(article => {
            const title = lang === 'en' ? article.title_en : article.title_ja
            const content = lang === 'en' ? article.content_en : article.content_ja
            const excerpt = content.replace(/##.*\n/g, '').replace(/\n/g, ' ').slice(0, 90) + '...'
            const thumbGrad = THUMB_COLORS[article.category] || 'from-gray-800 to-gray-600'

            return (
              <div
                key={article.id}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-150 cursor-pointer overflow-hidden"
                onClick={() => setSelectedArticle(article)}
              >
                {/* Thumbnail */}
                <div className={`h-36 bg-gradient-to-br ${thumbGrad} flex items-center justify-center`}>
                  <BookOpen size={36} className="text-white/20" />
                </div>

                <div className="p-5">
                  <div className="flex items-center justify-between mb-3">
                    <CategoryLabel category={article.category} lang={lang} />
                    <span className="text-xs text-gray-400">
                      {new Date(article.published_at).toLocaleDateString('ja-JP')}
                    </span>
                  </div>
                  <h3 className="font-semibold text-gray-800 text-sm leading-snug mb-2 line-clamp-2">{title}</h3>
                  <p className="text-xs text-gray-400 leading-relaxed line-clamp-2">{excerpt}</p>
                  <div className="flex items-center justify-between mt-4">
                    <span className="text-xs text-gray-400 flex items-center gap-1">
                      <User size={10} />{article.author}
                    </span>
                    <span className="text-xs text-rose-600 font-semibold flex items-center gap-1 hover:text-rose-700 transition-colors">
                      {t('articles.readMore')} <ArrowRight size={11} />
                    </span>
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
