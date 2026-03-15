'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import { OshiMemo, categoryConfig } from './OshiMemo'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// Stats Summary Component
const StatsSummary = ({ 
  userId, 
  oshiData 
}: { 
  userId: string
  oshiData: any[] 
}) => {
  const [monthlyStats, setMonthlyStats] = useState<any>(null)
  const [categoryStats, setCategoryStats] = useState<any>(null)
  const [oshiRanking, setOshiRanking] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadStats()
  }, [userId, oshiData])

  const loadStats = async () => {
    setLoading(true)
    try {
      const currentMonth = new Date().toISOString().slice(0, 7)
      
      // Get all memos for current month
      const { data: memos, error } = await supabase
        .from('oshi_memos')
        .select('*')
        .eq('user_id', userId)
        .gte('memo_date', `${currentMonth}-01`)
        .lte('memo_date', `${currentMonth}-31`)

      if (error) throw error

      const memoData = memos || []
      
      // Calculate monthly total
      const monthlyTotal = memoData.reduce((sum, memo) => sum + (memo.amount || 0), 0)

      // Calculate category breakdown
      const categoryTotals = memoData.reduce((acc, memo) => {
        acc[memo.category] = (acc[memo.category] || 0) + (memo.amount || 0)
        return acc
      }, {} as Record<string, number>)

      // Calculate oshi ranking
      const oshiTotals = memoData.reduce((acc, memo) => {
        acc[memo.oshi_id] = (acc[memo.oshi_id] || 0) + (memo.amount || 0)
        return acc
      }, {} as Record<string, number>)

      const rankedOshis = Object.entries(oshiTotals)
        .map(([oshiId, total]) => {
          const oshi = oshiData.find(o => o.id === oshiId)
          return {
            oshiId,
            name: oshi?.name || 'Unknown',
            emoji: oshi?.emoji || '🌙',
            total
          }
        })
        .sort((a, b) => (b.total as number) - (a.total as number))

      setMonthlyStats({
        total: monthlyTotal,
        count: memoData.length
      })
      setCategoryStats(categoryTotals)
      setOshiRanking(rankedOshis)
    } catch (error) {
      console.error('Error loading stats:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="text-center py-8">
        <p className="text-gba-text-muted font-pixel text-xs">LOADING STATS...</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Monthly Summary */}
      <div className="bg-gba-surface border-2 border-gba-orange rounded p-4">
        <h3 className="text-gba-text font-pixel text-sm font-bold mb-3">今月の推活費用</h3>
        <div className="text-center">
          <div className="text-3xl font-bold text-gba-orange font-pixel">
            ¥{monthlyStats?.total?.toLocaleString() || 0}
          </div>
          <div className="text-gba-text-muted font-pixel text-xs">
            {monthlyStats?.count || 0}件の記録
          </div>
        </div>
      </div>

      {/* Category Breakdown */}
      <div className="bg-gba-surface border-2 border-gba-mid rounded p-4">
        <h3 className="text-gba-text font-pixel text-sm font-bold mb-3">カテゴリ別内訳</h3>
        <div className="space-y-2">
          {Object.entries(categoryStats || {}).map(([category, amount]) => {
            const config = categoryConfig[category as keyof typeof categoryConfig]
            return (
              <div key={category} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{config.icon}</span>
                  <span className="text-gba-text font-pixel text-xs">{category}</span>
                </div>
                <span className="text-gba-orange font-pixel text-xs font-bold">
                  ¥{(amount as number).toLocaleString()}
                </span>
              </div>
            )
          })}
          {(!categoryStats || Object.keys(categoryStats).length === 0) && (
            <div className="text-center py-2">
              <p className="text-gba-text-muted font-pixel text-xs">データなし</p>
            </div>
          )}
        </div>
      </div>

      {/* Oshi Ranking */}
      <div className="bg-gba-surface border-2 border-gba-mid rounded p-4">
        <h3 className="text-gba-text font-pixel text-sm font-bold mb-3">推しごと費用ランキング</h3>
        <div className="space-y-2">
          {oshiRanking?.map((oshi: any, index: number) => (
            <div key={oshi.oshiId} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-gba-text-muted font-pixel text-xs w-4">
                  {index + 1}.
                </span>
                <span className="text-lg">{oshi.emoji}</span>
                <span className="text-gba-text font-pixel text-xs">{oshi.name}</span>
              </div>
              <span className="text-gba-orange font-pixel text-xs font-bold">
                ¥{oshi.total.toLocaleString()}
              </span>
            </div>
          ))}
          {(!oshiRanking || oshiRanking.length === 0) && (
            <div className="text-center py-2">
              <p className="text-gba-text-muted font-pixel text-xs">データなし</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// Main Stats Component
export const OshiStatsComponent = ({ 
  userId, 
  oshiData 
}: { 
  userId: string
  oshiData: any[] 
}) => {
  return (
    <div className="space-y-4">
      <h2 className="text-gba-text font-pixel text-lg font-bold mb-4">推活統計</h2>
      <StatsSummary userId={userId} oshiData={oshiData} />
    </div>
  )
}
