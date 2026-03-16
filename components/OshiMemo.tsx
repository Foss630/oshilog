// Oshi Memo Types
export interface OshiMemo {
  id: string
  user_id: string
  oshi_id: string
  category: 'GOODS' | 'EVENT' | 'TICKET' | 'CD' | 'BOOK' | 'OTHER'
  title: string
  amount?: number
  memo_date: string
  note?: string
  created_at: string
}

// Category Icons and Colors
export const categoryConfig = {
  GOODS: { icon: '🎁', color: '#FF6B9D', bgColor: '#FF6B9D20' },
  EVENT: { icon: '🎪', color: '#4ECDC4', bgColor: '#4ECDC420' },
  TICKET: { icon: '🎫', color: '#45B7D1', bgColor: '#45B7D120' },
  CD: { icon: '💿', color: '#F7B731', bgColor: '#F7B73120' },
  BOOK: { icon: '📚', color: '#A8E6CF', bgColor: '#A8E6CF20' },
  OTHER: { icon: '📝', color: '#96CEB4', bgColor: '#96CEB420' }
}
