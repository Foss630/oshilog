'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import { OshiMemo, categoryConfig } from './OshiMemo'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// Memo Form Component
const MemoForm = ({ 
  oshiId, 
  userId, 
  onSave, 
  onCancel 
}: { 
  oshiId: string
  userId: string
  onSave: () => void
  onCancel: () => void 
}) => {
  const [category, setCategory] = useState<OshiMemo['category']>('GOODS')
  const [title, setTitle] = useState('')
  const [amount, setAmount] = useState('')
  const [memoDate, setMemoDate] = useState(new Date().toISOString().split('T')[0])
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSave = async () => {
    if (!title.trim()) return

    setLoading(true)
    try {
      const { error } = await supabase
        .from('oshi_memos')
        .insert({
          user_id: userId,
          oshi_id: oshiId,
          category,
          title: title.trim(),
          amount: amount ? parseInt(amount) : null,
          memo_date: memoDate,
          note: note.trim() || null
        })

      if (error) throw error

      // Reset form
      setTitle('')
      setAmount('')
      setNote('')
      setMemoDate(new Date().toISOString().split('T')[0])
      setCategory('GOODS')
      
      onSave()
    } catch (error) {
      console.error('Error saving memo:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-3 p-3 bg-gba-surface border-2 border-gba-orange rounded">
      <h3 className="text-gba-text font-pixel text-xs font-bold">ADD MEMO</h3>
      
      {/* Category */}
      <div className="grid grid-cols-4 gap-1">
        {Object.entries(categoryConfig).map(([cat, config]) => (
          <button
            key={cat}
            onClick={() => setCategory(cat as OshiMemo['category'])}
            className={`p-2 text-xs font-pixel border-2 transition-all ${
              category === cat 
                ? 'border-gba-orange bg-opacity-20' 
                : 'border-gba-mid hover:border-gba-orange'
            }`}
            style={{ 
              backgroundColor: category === cat ? config.bgColor : undefined,
              borderColor: category === cat ? config.color : undefined
            }}
          >
            <div className="text-lg">{config.icon}</div>
            <div className="text-[8px]">{cat}</div>
          </button>
        ))}
      </div>

      {/* Title */}
      <input
        type="text"
        placeholder="TITLE"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="w-full bg-gba-mid border-2 border-gba-orange text-gba-text p-2 font-pixel text-xs"
        maxLength={50}
      />

      {/* Amount */}
      <div className="relative">
        <span className="absolute left-2 top-2 text-gba-text-muted font-pixel text-xs">¥</span>
        <input
          type="number"
          placeholder="AMOUNT"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="w-full bg-gba-mid border-2 border-gba-orange text-gba-text p-2 pl-6 font-pixel text-xs"
          min="0"
        />
      </div>

      {/* Date */}
      <input
        type="date"
        value={memoDate}
        onChange={(e) => setMemoDate(e.target.value)}
        className="w-full bg-gba-mid border-2 border-gba-orange text-gba-text p-2 font-pixel text-xs"
      />

      {/* Note */}
      <textarea
        placeholder="NOTE (OPTIONAL)"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        className="w-full bg-gba-mid border-2 border-gba-orange text-gba-text p-2 font-pixel text-xs resize-none"
        rows={3}
        maxLength={200}
      />

      {/* Buttons */}
      <div className="flex gap-2">
        <button
          onClick={handleSave}
          disabled={loading || !title.trim()}
          className="flex-1 bg-gba-orange text-black font-pixel text-xs p-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'SAVING...' : 'SAVE'}
        </button>
        <button
          onClick={onCancel}
          className="flex-1 border-2 border-gba-orange text-gba-orange font-pixel text-xs p-2"
        >
          CANCEL
        </button>
      </div>
    </div>
  )
}

// Memo List Component
const MemoList = ({ 
  memos, 
  onDelete 
}: { 
  memos: OshiMemo[]
  onDelete: (id: string) => void 
}) => {
  return (
    <div className="space-y-2">
      {memos.map((memo) => {
        const config = categoryConfig[memo.category]
        return (
          <div 
            key={memo.id}
            className="bg-gba-surface border-2 border-gba-mid rounded p-3"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-lg">{config.icon}</span>
                  <span 
                    className="text-xs font-pixel font-bold"
                    style={{ color: config.color }}
                  >
                    {memo.category}
                  </span>
                </div>
                <h4 className="text-gba-text font-pixel text-sm font-bold mb-1">
                  {memo.title}
                </h4>
                <div className="flex items-center gap-3 text-gba-text-muted font-pixel text-[8px]">
                  <span>{memo.memo_date}</span>
                  {memo.amount && (
                    <span className="text-gba-orange font-bold">¥{memo.amount.toLocaleString()}</span>
                  )}
                </div>
                {memo.note && (
                  <p className="text-gba-text-muted font-pixel text-[8px] mt-1">
                    {memo.note}
                  </p>
                )}
              </div>
              <button
                onClick={() => onDelete(memo.id)}
                className="text-red-400 hover:text-red-300 font-pixel text-xs"
              >
                DELETE
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// Main OshiMemo Component
export const OshiMemoComponent = ({ 
  oshiId, 
  userId 
}: { 
  oshiId: string
  userId: string 
}) => {
  const [memos, setMemos] = useState<OshiMemo[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)

  // Load memos
  useEffect(() => {
    loadMemos()
  }, [oshiId, userId])

  const loadMemos = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('oshi_memos')
        .select('*')
        .eq('oshi_id', oshiId)
        .eq('user_id', userId)
        .order('memo_date', { ascending: false })

      if (error) throw error
      setMemos(data || [])
    } catch (error) {
      console.error('Error loading memos:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('oshi_memos')
        .delete()
        .eq('id', id)

      if (error) throw error
      setMemos(memos.filter(memo => memo.id !== id))
    } catch (error) {
      console.error('Error deleting memo:', error)
    }
  }

  if (loading) {
    return (
      <div className="text-center py-4">
        <p className="text-gba-text-muted font-pixel text-xs">LOADING...</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-gba-text font-pixel text-sm font-bold">推活メモ</h3>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-gba-orange text-black font-pixel text-xs px-3 py-1"
        >
          {showForm ? 'CLOSE' : '+ ADD MEMO'}
        </button>
      </div>

      {showForm && (
        <MemoForm
          oshiId={oshiId}
          userId={userId}
          onSave={() => {
            setShowForm(false)
            loadMemos()
          }}
          onCancel={() => setShowForm(false)}
        />
      )}

      {memos.length === 0 ? (
        <div className="text-center py-4">
          <p className="text-gba-text-muted font-pixel text-xs">NO MEMOS YET</p>
        </div>
      ) : (
        <MemoList memos={memos} onDelete={handleDelete} />
      )}
    </div>
  )
}
