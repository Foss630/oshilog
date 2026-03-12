"use client"

import { useState, useCallback, useEffect } from "react"
import { Home, Users, Calendar, FileText, ChevronLeft, ChevronRight, Bell, Plus } from "lucide-react"
import { format } from "date-fns"
import type { User } from "@supabase/supabase-js"
import { supabase } from "@/lib/supabase"

// Types
interface Oshi {
  id: number
  name: string
  handle: string
  emoji: string
  color: string
  watchHours: number
  isLive?: boolean
  birthday?: string
  debutDate?: string
  streamCount: number
  eventCount: number
  strength: number
  youtubeChannelId?: string | null
}

interface StreamEvent {
  id: number
  oshiId: number
  title: string
  date: string
  time: string
  isLive?: boolean
  type: "stream" | "collab" | "music" | "birthday"
}

interface StampReaction {
  emoji: string
  count: number
  selected: boolean
}

// Color options for dropdown
const colorOptions = [
  { name: "SAKURA PINK", value: "#FF6B9D" },
  { name: "LAVENDER", value: "#C084FC" },
  { name: "AQUA", value: "#3DDBD9" },
  { name: "GOLD", value: "#FFD93D" },
  { name: "CORAL", value: "#FF8C42" },
  { name: "SKY BLUE", value: "#5B8DD9" },
  { name: "MINT GREEN", value: "#7BC67E" },
  { name: "CRIMSON", value: "#E05252" },
]

// Stamp emojis
const stampEmojis = ["😭", "🔥", "💖", "👏", "✨"]

// Pixel Card component
function PixelCard({
  children,
  className = "",
  borderColor = "#F5A623",
  onClick,
  interactive = false,
}: {
  children: React.ReactNode
  className?: string
  borderColor?: string
  onClick?: () => void
  interactive?: boolean
}) {
  return (
    <div
      onClick={onClick}
      className={`
        bg-gba-card border-2 p-3 pixel-shadow
        ${interactive ? "cursor-pointer active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0_#000] transition-all duration-75" : ""}
        ${className}
      `}
      style={{ borderColor }}
    >
      {children}
    </div>
  )
}

// Pixel Button component
function PixelButton({
  children,
  className = "",
  variant = "primary",
  onClick,
  disabled = false,
  type = "button",
}: {
  children: React.ReactNode
  className?: string
  variant?: "primary" | "secondary" | "ghost"
  onClick?: () => void
  disabled?: boolean
  type?: "button" | "submit" | "reset"
}) {
  const variants = {
    primary: "bg-gba-orange text-gba-dark border-2 border-black",
    secondary: "bg-gba-green text-gba-dark border-2 border-black",
    ghost: "bg-gba-mid text-gba-text border-2 border-gba-orange",
  }
  
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`
        px-4 py-2 font-bold uppercase pixel-btn
        ${variants[variant]}
        ${disabled ? "opacity-50 cursor-not-allowed" : ""}
        ${className}
      `}
      style={{ fontFamily: "var(--font-pixel)", fontSize: "8px" }}
    >
      {children}
    </button>
  )
}

// Stamp button component - pixel style
function StampButton({
  emoji,
  count,
  selected,
  onClick,
}: {
  emoji: string
  count: number
  selected: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`
        flex flex-col items-center gap-0.5 px-2 py-1 border-2 transition-all
        ${selected 
          ? "bg-gba-green border-gba-green text-gba-dark pixel-shadow-sm" 
          : "bg-gba-mid border-gba-orange hover:bg-gba-surface pixel-shadow-sm"
        }
        active:translate-x-[1px] active:translate-y-[1px] active:shadow-[1px_1px_0_#000]
      `}
    >
      <span className="text-base">{emoji}</span>
      <span 
        className={`text-[8px] ${selected ? "text-gba-dark" : "text-gba-text"}`}
        style={{ fontFamily: "var(--font-pixel)" }}
      >
        {count}
      </span>
    </button>
  )
}

// HP-bar style progress bar
function HPBar({ 
  value, 
  max, 
  color = "#7BC67E", 
  label,
  showLevel = false,
}: { 
  value: number
  max: number
  color?: string
  label?: string
  showLevel?: boolean
}) {
  const percentage = Math.min((value / max) * 100, 100)
  const blocks = 10
  const filledBlocks = Math.floor((percentage / 100) * blocks)
  
  return (
    <div className="flex items-center gap-2">
      {label && (
        <span className="text-gba-text text-[10px] w-12 truncate" style={{ fontFamily: "var(--font-pixel)" }}>
          {label}
        </span>
      )}
      <div className="flex-1 flex gap-[2px]">
        {Array.from({ length: blocks }).map((_, i) => (
          <div
            key={i}
            className="h-3 flex-1 border border-gba-dark"
            style={{ 
              backgroundColor: i < filledBlocks ? color : "#2D2D44",
            }}
          />
        ))}
      </div>
      {showLevel && (
        <span className="text-gba-text-muted text-[8px]" style={{ fontFamily: "var(--font-pixel)" }}>
          LV.MAX
        </span>
      )}
    </div>
  )
}

// Section Header
function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <span className="text-gba-orange">▶</span>
      <h2 
        className="text-gba-orange uppercase tracking-wider"
        style={{ fontFamily: "var(--font-pixel)", fontSize: "10px" }}
      >
        {children}
      </h2>
      <div className="flex-1 h-[2px] bg-gba-orange" />
    </div>
  )
}

// Tab definition
type TabId = "home" | "oshi" | "calendar" | "report"

const tabs: { id: TabId; label: string; icon: typeof Home }[] = [
  { id: "home", label: "HOME", icon: Home },
  { id: "oshi", label: "PARTY", icon: Users },
  { id: "calendar", label: "SCHED", icon: Calendar },
  { id: "report", label: "STATS", icon: FileText },
]

// Main Oshilog Component
export default function Oshilog() {
  const [activeTab, setActiveTab] = useState<TabId>("home")
  const [selectedOshi, setSelectedOshi] = useState<Oshi | null>(null)
  const [oshiData, setOshiData] = useState<Oshi[]>([])
  const [streamEvents, setStreamEvents] = useState<StreamEvent[]>([])
  const [stamps, setStamps] = useState<Record<number, StampReaction[]>>({})
  const [calendarMonth, setCalendarMonth] = useState(new Date())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [authError, setAuthError] = useState<string | null>(null)
  const [authMode, setAuthMode] = useState<"signIn" | "signUp">("signIn")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [authSubmitting, setAuthSubmitting] = useState(false)
  const [showAddOshiForm, setShowAddOshiForm] = useState(false)
  const [newOshiName, setNewOshiName] = useState("")
  const [newOshiHandle, setNewOshiHandle] = useState("")
  const [newOshiEmoji, setNewOshiEmoji] = useState("🌙")
  const [newOshiColor, setNewOshiColor] = useState("#FF6B9D")
  const [addOshiLoading, setAddOshiLoading] = useState(false)
  const [addOshiError, setAddOshiError] = useState<string | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null)

  // Auth state
  useEffect(() => {
    const initAuth = async () => {
      try {
        setAuthLoading(true)
        setAuthError(null)
        const { data, error } = await supabase.auth.getUser()
        if (error) {
          if (error.message !== "Auth session missing!") {
            setAuthError(error.message)
          }
          setUser(null)
        } else {
          setUser(data.user ?? null)
        }
      } finally {
        setAuthLoading(false)
      }
    }

    initAuth()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  // Load data for the signed-in user
  useEffect(() => {
    if (!user) {
      setOshiData([])
      setStreamEvents([])
      setStamps({})
      return
    }

    const loadData = async () => {
      try {
        setLoading(true)
        setError(null)

        const [{ data: oshiRows, error: oshiError }, { data: scheduleRows, error: scheduleError }, { data: stampRows, error: stampError }] =
          await Promise.all([
            supabase.from("oshis").select("*").eq("user_id", user.id),
            supabase.from("schedules").select("*").eq("user_id", user.id),
            supabase.from("stamp_reactions").select("*"),
          ])

        if (oshiError) throw oshiError
        if (scheduleError) throw scheduleError
        if (stampError) throw stampError

        const mappedOshis: Oshi[] =
          (oshiRows ?? []).map((row: any) => ({
            id: row.id,
            name: row.name,
            handle: row.handle,
            emoji: row.icon ?? "⭐",
            color: row.color ?? "#FF6B9D",
            watchHours: row.watch_hours ?? 0,
            isLive: row.is_live ?? false,
            birthday: row.birthday ?? undefined,
            debutDate: row.debut_date ?? undefined,
            streamCount: row.stream_count ?? 0,
            eventCount: row.event_count ?? 0,
            strength: row.strength ?? 0,
            youtubeChannelId: row.youtube_channel_id ?? null,
          })) ?? []

        const mappedEvents: StreamEvent[] =
          (scheduleRows ?? []).map((row: any) => {
            const dt = row.scheduled_at ? new Date(row.scheduled_at) : null
            const dateLabel = dt ? format(dt, "M/d") : ""
            const timeLabel = dt ? format(dt, "HH:mm") : ""

            return {
              id: row.id,
              oshiId: row.oshi_id,
              title: row.title,
              date: dateLabel,
              time: timeLabel,
              isLive: row.is_live ?? false,
              type: (row.event_type as StreamEvent["type"]) ?? "stream",
            }
          }) ?? []

        const stampMap: Record<number, StampReaction[]> = {}
        ;(stampRows ?? []).forEach((row: any) => {
          if (!stampMap[row.schedule_id]) {
            stampMap[row.schedule_id] = []
          }
          stampMap[row.schedule_id].push({
            emoji: row.stamp,
            count: row.count ?? 0,
            selected: false,
          })
        })

        // Ensure each event has a full stamp set
        mappedEvents.forEach((event) => {
          if (!stampMap[event.id]) {
            stampMap[event.id] = stampEmojis.map((emoji) => ({
              emoji,
              count: 0,
              selected: false,
            }))
          }
        })

        setOshiData(mappedOshis)
        setStreamEvents(mappedEvents)
        setStamps(stampMap)
      } catch (err: any) {
        setError(err.message ?? "Failed to load data")
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [user])

  const handleAuthSubmit = async (mode: "signIn" | "signUp") => {
    console.log("=== AUTH SUBMIT START ===")
    console.log("mode:", mode)
    console.log("email:", email)
    console.log("password length:", password.length)
    
    try {
      setAuthSubmitting(true)
      setAuthError(null)

      if (!email || !password) {
        console.error("ERROR: Missing email or password")
        setAuthError("EMAIL & PASSWORD REQUIRED")
        return
      }

      if (mode === "signIn") {
        console.log("Attempting sign in...")
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        console.log("Sign in response:", { data, error })
        if (error) throw error
        console.log("Sign in successful!")
      } else {
        console.log("Attempting sign up...")
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: undefined,
            data: {
              // Add any additional user data here
            }
          }
        })
        console.log("Sign up response:", { data, error })
        if (error) {
          console.error("Sign up error:", error)
          throw error
        }
        console.log("Sign up successful!")
        
        // For immediate login after signup (if email verification is disabled)
        if (data.user && !data.session) {
          console.log("User created but no session - attempting immediate sign in...")
          const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
            email,
            password,
          })
          console.log("Immediate sign in response:", { signInData, signInError })
          if (signInError) {
            console.error("Immediate sign in failed:", signInError)
            // Don't throw error here - user was created successfully
            setAuthError("ACCOUNT CREATED! PLEASE CHECK EMAIL OR TRY LOGIN")
          } else {
            console.log("Immediate sign in successful!")
          }
        }
      }
    } catch (err: any) {
      console.error("Auth error:", err)
      setAuthError(err.message ?? "AUTH FAILED")
    } finally {
      setAuthSubmitting(false)
      console.log("=== AUTH SUBMIT END ===")
    }
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    setUser(null)
  }

  const handleAddOshi = async () => {
    console.log("=== SAVE BUTTON CLICKED ===")
    console.log("=== handleAddOshi START ===")
    console.log("user:", user)
    console.log("newOshiName:", newOshiName)
    console.log("newOshiHandle:", newOshiHandle)
    console.log("newOshiEmoji:", newOshiEmoji)
    console.log("newOshiColor:", newOshiColor)
    
    if (!user) {
      console.error("ERROR: No user found")
      setAddOshiError("USER NOT AUTHENTICATED")
      return
    }
    if (!newOshiName || !newOshiHandle) {
      console.error("ERROR: Missing required fields")
      setAddOshiError("NAME & HANDLE REQUIRED")
      return
    }

    try {
      console.log("Starting Supabase insert...")
      setAddOshiLoading(true)
      setAddOshiError(null)

      const insertData = {
        user_id: user.id,
        name: newOshiName,
        handle: newOshiHandle,
        icon: newOshiEmoji,
        color: newOshiColor,
      }
      console.log("Insert data:", insertData)

      const { data, error } = await supabase
        .from("oshis")
        .insert(insertData)
        .select("*")
        .single()

      console.log("Supabase response:", { data, error })

      if (error) {
        console.error("Supabase error:", error)
        throw error
      }
      
      if (data) {
        console.log("Successfully inserted oshi:", data)
        const mapped: Oshi = {
          id: data.id,
          name: data.name,
          handle: data.handle,
          emoji: data.icon ?? "⭐",
          color: data.color ?? "#FF6B9D",
          watchHours: data.watch_hours ?? 0,
          isLive: data.is_live ?? false,
          birthday: data.birthday ?? undefined,
          debutDate: data.debut_date ?? undefined,
          streamCount: data.stream_count ?? 0,
          eventCount: data.event_count ?? 0,
          strength: data.strength ?? 0,
          youtubeChannelId: data.youtube_channel_id ?? null,
        }
        console.log("Mapped oshi:", mapped)
        setOshiData((prev) => [...prev, mapped])
        setNewOshiName("")
        setNewOshiHandle("")
        setNewOshiEmoji("🌙")
        setNewOshiColor("#FF6B9D")
        setShowAddOshiForm(false)
        console.log("=== handleAddOshi SUCCESS ===")
      }
    } catch (err: any) {
      console.error("Add oshi error:", err)
      const errorMessage = err.message ?? "FAILED TO ADD OSHI"
      console.error("Setting error message:", errorMessage)
      setAddOshiError(errorMessage)
    } finally {
      setAddOshiLoading(false)
      console.log("=== handleAddOshi END ===")
    }
  }

  const handleDeleteOshi = async (oshiId: number) => {
    if (!user) return
    
    try {
      const { error } = await supabase
        .from("oshis")
        .delete()
        .eq("id", oshiId)
        .eq("user_id", user.id)

      if (error) {
        console.error("Delete error:", error)
        throw error
      }

      setOshiData((prev) => prev.filter((o) => o.id !== oshiId))
      setDeleteConfirm(null)
    } catch (err: any) {
      console.error("Delete oshi error:", err)
      alert("FAILED TO DELETE: " + (err.message ?? "UNKNOWN ERROR"))
    }
  }

  const handleStamp = useCallback((eventId: number, stampIndex: number) => {
    setStamps(prev => ({
      ...prev,
      [eventId]: prev[eventId].map((stamp, idx) => {
        if (idx === stampIndex) {
          return {
            ...stamp,
            selected: !stamp.selected,
            count: stamp.selected ? stamp.count - 1 : stamp.count + 1,
          }
        }
        return stamp.selected ? { ...stamp, selected: false, count: stamp.count - 1 } : stamp
      }),
    }))
  }, [])

  const getOshiById = (id: number) => oshiData.find(o => o.id === id)
  const birthdayOshi = oshiData.find(o => o.isLive)

  const getEventIcon = (type: StreamEvent["type"]) => {
    switch (type) {
      case "collab": return "⚔"
      case "music": return "♪"
      case "birthday": return "🎂"
      default: return "▶"
    }
  }

  // HOME SCREEN
  const renderHome = () => (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 
            className="text-gba-green gba-glow text-lg"
            style={{ fontFamily: "var(--font-pixel)" }}
          >
            OSHILOG
          </h1>
          <p className="text-gba-text-muted text-[8px] mt-1" style={{ fontFamily: "var(--font-pixel)" }}>
            2025.03.09
          </p>
        </div>
        <div className="text-right flex flex-col items-end gap-1">
          <div>
            <p className="text-gba-orange text-[8px]" style={{ fontFamily: "var(--font-pixel)" }}>
              PLAYER 1
            </p>
            <p className="text-gba-text text-[10px]" style={{ fontFamily: "var(--font-pixel)" }}>
              LV.42
            </p>
          </div>
          <PixelButton
            variant="ghost"
            className="px-2 py-1"
            onClick={handleSignOut}
          >
            LOGOUT
          </PixelButton>
        </div>
      </div>

      {/* Birthday Banner - Event Alert */}
      {birthdayOshi && (
        <PixelCard borderColor="#F5A623" className="bg-gba-surface">
          <div className="text-center">
            <p 
              className="text-gba-orange text-[10px] mb-1"
              style={{ fontFamily: "var(--font-pixel)" }}
            >
              <span className="animate-star inline-block">★</span>
              {" "}EVENT ALERT{" "}
              <span className="animate-star inline-block">★</span>
            </p>
            <p className="text-gba-text text-sm font-bold">
              {birthdayOshi.name}
            </p>
            <p 
              className="text-gba-green text-[10px] gba-glow"
              style={{ fontFamily: "var(--font-pixel)" }}
            >
              BIRTHDAY TODAY!
            </p>
          </div>
        </PixelCard>
      )}

      {/* Now Live Section */}
      <section>
        <SectionHeader>NOW LIVE</SectionHeader>
        {streamEvents.filter(e => e.isLive).map(event => {
          const oshi = getOshiById(event.oshiId)!
          return (
            <PixelCard
              key={event.id}
              borderColor={oshi.color}
              className="relative"
            >
              {/* LIVE indicator */}
              <div className="absolute -top-2 -right-2 bg-red-600 border-2 border-black px-2 py-0.5">
                <span 
                  className="text-white text-[8px] animate-blink"
                  style={{ fontFamily: "var(--font-pixel)" }}
                >
                  LIVE
                </span>
              </div>
              
              <div className="flex items-start gap-3">
                <div
                  className="w-12 h-12 flex items-center justify-center text-2xl border-2 border-black bg-gba-mid"
                >
                  {oshi.emoji}
                </div>
                <div className="flex-1">
                  <p 
                    className="text-gba-text text-[10px] uppercase"
                    style={{ fontFamily: "var(--font-pixel)" }}
                  >
                    {oshi.name}
                  </p>
                  <p className="text-gba-text-muted text-xs mt-1">{event.title}</p>
                </div>
              </div>
              <div className="flex gap-1.5 mt-3">
                {stamps[event.id]?.map((stamp, idx) => (
                  <StampButton
                    key={stamp.emoji}
                    emoji={stamp.emoji}
                    count={stamp.count}
                    selected={stamp.selected}
                    onClick={() => handleStamp(event.id, idx)}
                  />
                ))}
              </div>
            </PixelCard>
          )
        })}
      </section>

      {/* Coming Up Section */}
      <section>
        <SectionHeader>COMING UP</SectionHeader>
        <div className="space-y-2">
          {streamEvents.filter(e => !e.isLive).map(event => {
            const oshi = getOshiById(event.oshiId)!
            return (
              <PixelCard
                key={event.id}
                borderColor={oshi.color}
                interactive
                onClick={() => setSelectedOshi(oshi)}
              >
                <div className="flex items-center gap-3">
                  <div 
                    className="w-1 h-10"
                    style={{ backgroundColor: oshi.color }}
                  />
                  <div
                    className="w-10 h-10 flex items-center justify-center text-xl border-2 border-black bg-gba-mid"
                  >
                    {oshi.emoji}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-gba-orange">{getEventIcon(event.type)}</span>
                      <p 
                        className="text-gba-text text-[10px] uppercase truncate"
                        style={{ fontFamily: "var(--font-pixel)" }}
                      >
                        {event.title}
                      </p>
                    </div>
                    <p 
                      className="text-gba-text-muted text-[8px] mt-1"
                      style={{ fontFamily: "var(--font-pixel)" }}
                    >
                      {event.date} | {event.time}
                    </p>
                  </div>
                </div>
                <div className="flex gap-1 mt-2 ml-14">
                  {stamps[event.id]?.map((stamp, idx) => (
                    <StampButton
                      key={stamp.emoji}
                      emoji={stamp.emoji}
                      count={stamp.count}
                      selected={stamp.selected}
                      onClick={() => handleStamp(event.id, idx)}
                    />
                  ))}
                </div>
              </PixelCard>
            )
          })}
        </div>
      </section>
    </div>
  )

  // OSHI LIST SCREEN - Party Members
  const renderOshiList = () => (
    <div className="space-y-5">
      <h1 
        className="text-gba-green gba-glow"
        style={{ fontFamily: "var(--font-pixel)", fontSize: "14px" }}
      >
        PARTY MEMBERS
      </h1>

      {/* Bond Level Card */}
      <PixelCard borderColor="#F5A623">
        <SectionHeader>BOND LEVEL</SectionHeader>
        <div className="space-y-3">
          {oshiData
            .sort((a, b) => b.watchHours - a.watchHours)
            .map((oshi) => (
              <div key={oshi.id} className="flex items-center gap-2">
                <span className="text-lg">{oshi.emoji}</span>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span 
                      className="text-gba-text text-[8px] flex-1"
                      style={{ fontFamily: "var(--font-pixel)" }}
                    >
                      {oshi.name}
                    </span>
                    <span className="text-gba-text-muted text-[8px]">
                      {oshi.watchHours}H
                    </span>
                  </div>
                  <HPBar value={oshi.watchHours} max={60} color={oshi.color} showLevel />
                </div>
              </div>
            ))}
        </div>
      </PixelCard>

      {/* Character Select Grid */}
      <div className="grid grid-cols-2 gap-3">
        {oshiData.map(oshi => (
          <PixelCard
            key={oshi.id}
            borderColor={oshi.color}
            interactive
            onClick={() => setSelectedOshi(oshi)}
            className="relative"
          >
            {oshi.isLive && (
              <div className="absolute -top-2 -right-2 bg-red-600 border-2 border-black px-1 py-0.5">
                <span 
                  className="text-white text-[6px] animate-blink"
                  style={{ fontFamily: "var(--font-pixel)" }}
                >
                  LIVE
                </span>
              </div>
            )}
            
            {/* Delete Button */}
            <button
              onClick={(e) => {
                e.stopPropagation()
                setDeleteConfirm(oshi.id)
              }}
              className="absolute -top-1 -left-1 bg-red-600 border-2 border-black px-1 py-0.5 text-white text-[6px] hover:bg-red-700 active:translate-x-[1px] active:translate-y-[1px] active:shadow-[1px_1px_0_#000] transition-all"
              style={{ fontFamily: "var(--font-pixel)" }}
            >
              DELETE
            </button>
            
            {/* Delete Confirmation */}
            {deleteConfirm === oshi.id && (
              <div className="absolute inset-0 bg-black bg-opacity-80 flex flex-col items-center justify-center z-10 p-2">
                <p 
                  className="text-white text-[8px] text-center mb-2"
                  style={{ fontFamily: "var(--font-pixel)" }}
                >
                  REALLY DELETE?
                </p>
                <div className="flex gap-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDeleteOshi(oshi.id)
                    }}
                    className="bg-red-600 border border-black px-2 py-1 text-white text-[6px] hover:bg-red-700 active:translate-x-[1px] active:translate-y-[1px] active:shadow-[1px_1px_0_#000]"
                    style={{ fontFamily: "var(--font-pixel)" }}
                  >
                    YES
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setDeleteConfirm(null)
                    }}
                    className="bg-gba-green border border-black px-2 py-1 text-gba-dark text-[6px] hover:bg-green-600 active:translate-x-[1px] active:translate-y-[1px] active:shadow-[1px_1px_0_#000]"
                    style={{ fontFamily: "var(--font-pixel)" }}
                  >
                    NO
                  </button>
                </div>
              </div>
            )}
            
            <div className="text-center">
              <div
                className="w-14 h-14 flex items-center justify-center text-3xl mx-auto mb-2 border-2 border-black bg-gba-mid"
              >
                {oshi.emoji}
              </div>
              <p 
                className="text-gba-text text-[10px] uppercase"
                style={{ fontFamily: "var(--font-pixel)" }}
              >
                {oshi.name}
              </p>
              <p className="text-gba-text-muted text-[8px] mt-1" style={{ fontFamily: "var(--font-pixel)" }}>
                STR:{oshi.strength} EVT:{oshi.eventCount}
              </p>
            </div>
          </PixelCard>
        ))}

        {/* Add Member Card */}
        {user && !showAddOshiForm && (
          <div
            className="border-2 border-dashed border-gba-orange p-4 flex flex-col items-center justify-center cursor-pointer hover:bg-gba-surface transition-colors min-h-[140px]"
            onClick={() => setShowAddOshiForm(true)}
          >
            <Plus className="w-8 h-8 text-gba-orange mb-2" />
            <p 
              className="text-gba-orange text-[8px]"
              style={{ fontFamily: "var(--font-pixel)" }}
            >
              ADD MEMBER
            </p>
          </div>
        )}
      </div>

      {user && showAddOshiForm && (
        <PixelCard borderColor="#F5A623" className="mt-4 bg-gba-surface">
          <SectionHeader>NEW PARTY MEMBER</SectionHeader>
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault()
              handleAddOshi()
            }}
          >
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label
                  className="block text-gba-text text-[8px]"
                  style={{ fontFamily: "var(--font-pixel)" }}
                >
                  NAME
                </label>
                <input
                  type="text"
                  className="w-full px-2 py-1 bg-gba-mid border-2 border-gba-orange text-gba-text text-xs outline-none"
                  style={{ fontFamily: "var(--font-pixel)" }}
                  value={newOshiName}
                  onChange={(e) => setNewOshiName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1">
                <label
                  className="block text-gba-text text-[8px]"
                  style={{ fontFamily: "var(--font-pixel)" }}
                >
                  HANDLE
                </label>
                <input
                  type="text"
                  className="w-full px-2 py-1 bg-gba-mid border-2 border-gba-orange text-gba-text text-xs outline-none"
                  style={{ fontFamily: "var(--font-pixel)" }}
                  placeholder="@oshi_handle"
                  value={newOshiHandle}
                  onChange={(e) => setNewOshiHandle(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label
                  className="block text-gba-text text-[8px]"
                  style={{ fontFamily: "var(--font-pixel)" }}
                >
                  EMOJI
                </label>
                <input
                  type="text"
                  className="w-full px-2 py-1 bg-gba-mid border-2 border-gba-orange text-gba-text text-xs outline-none"
                  style={{ fontFamily: "var(--font-pixel)" }}
                  value={newOshiEmoji}
                  onChange={(e) => setNewOshiEmoji(e.target.value)}
                  maxLength={4}
                />
              </div>
              <div className="space-y-1">
                <label
                  className="block text-gba-text text-[8px]"
                  style={{ fontFamily: "var(--font-pixel)" }}
                >
                  COLOR
                </label>
                <select
                  className="w-full px-2 py-1 bg-gba-mid border-2 border-gba-orange text-gba-text text-xs outline-none"
                  style={{ fontFamily: "var(--font-pixel)" }}
                  value={newOshiColor}
                  onChange={(e) => setNewOshiColor(e.target.value)}
                >
                  {colorOptions.map((color) => (
                    <option key={color.value} value={color.value}>
                      {color.name}
                    </option>
                  ))}
                </select>
                <div 
                  className="w-full h-4 border border-gba-mid"
                  style={{ backgroundColor: newOshiColor }}
                />
              </div>
            </div>

            {addOshiError && (
              <p
                className="text-red-400 text-[8px]"
                style={{ fontFamily: "var(--font-pixel)" }}
              >
                {addOshiError}
              </p>
            )}

            <div className="flex gap-2 pt-1">
              <PixelButton
                variant="primary"
                className="flex-1 py-2"
                onClick={handleAddOshi}
                disabled={addOshiLoading}
              >
                {addOshiLoading ? "SAVING..." : "▶ SAVE"}
              </PixelButton>
              <PixelButton
                variant="ghost"
                className="flex-1 py-2"
                onClick={() => {
                  setShowAddOshiForm(false)
                  setAddOshiError(null)
                }}
              >
                CANCEL
              </PixelButton>
            </div>
          </form>
        </PixelCard>
      )}
    </div>
  )

  // CALENDAR SCREEN
  const renderCalendar = () => {
    const year = calendarMonth.getFullYear()
    const month = calendarMonth.getMonth()
    const firstDay = new Date(year, month, 1).getDay()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const today = new Date()
    const isCurrentMonth = today.getMonth() === month && today.getFullYear() === year

    const weekDays = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"]
    
    const eventDates: Record<number, string> = {
      9: "#C084FC",
      11: "#FFD93D",
      12: "#FF6B9D",
      15: "#FF6B9D",
      20: "#5B8DD9",
    }

    const calendarDays = []
    for (let i = 0; i < firstDay; i++) {
      calendarDays.push(<div key={`empty-${i}`} className="h-9" />)
    }
    for (let day = 1; day <= daysInMonth; day++) {
      const isToday = isCurrentMonth && today.getDate() === day
      const eventColor = eventDates[day]
      calendarDays.push(
        <div
          key={day}
          className={`
            h-9 flex flex-col items-center justify-center relative
            ${isToday ? "bg-gba-orange text-gba-dark border-2 border-black" : "text-gba-text"}
          `}
        >
          <span className="text-[10px]" style={{ fontFamily: "var(--font-pixel)" }}>{day}</span>
          {eventColor && !isToday && (
            <div
              className="absolute bottom-1 w-2 h-2"
              style={{ backgroundColor: eventColor }}
            />
          )}
          {day === 9 && (
            <span className="absolute -top-1 -right-0 text-[8px]">🎂</span>
          )}
        </div>
      )
    }

    const monthNames = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"]

    return (
      <div className="space-y-5">
        <h1 
          className="text-gba-green gba-glow"
          style={{ fontFamily: "var(--font-pixel)", fontSize: "14px" }}
        >
          SCHEDULE
        </h1>

        <PixelCard borderColor="#F5A623">
          {/* Month Navigation */}
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => setCalendarMonth(new Date(year, month - 1))}
              className="w-8 h-8 bg-gba-mid border-2 border-gba-orange flex items-center justify-center pixel-btn"
            >
              <span className="text-gba-orange" style={{ fontFamily: "var(--font-pixel)" }}>◀</span>
            </button>
            <h2 
              className="text-gba-text"
              style={{ fontFamily: "var(--font-pixel)", fontSize: "12px" }}
            >
              {monthNames[month]} {year}
            </h2>
            <button
              onClick={() => setCalendarMonth(new Date(year, month + 1))}
              className="w-8 h-8 bg-gba-mid border-2 border-gba-orange flex items-center justify-center pixel-btn"
            >
              <span className="text-gba-orange" style={{ fontFamily: "var(--font-pixel)" }}>▶</span>
            </button>
          </div>

          {/* Week Headers */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {weekDays.map((day, idx) => (
              <div
                key={day}
                className={`
                  text-center text-[8px]
                  ${idx === 0 ? "text-red-400" : idx === 6 ? "text-gba-blue" : "text-gba-text-muted"}
                `}
                style={{ fontFamily: "var(--font-pixel)" }}
              >
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-1 border-2 border-gba-mid p-1 bg-gba-surface">
            {calendarDays}
          </div>
        </PixelCard>

        {/* Quest Log */}
        <section>
          <SectionHeader>QUEST LOG</SectionHeader>
          <div className="space-y-2">
            {[
              { day: 9, oshi: oshiData[1], event: "BIRTHDAY", icon: "🎂" },
              { day: 11, oshi: oshiData[3], event: "MORNING TALK", icon: "♪" },
              { day: 12, oshi: oshiData[0], event: "ART STREAM", icon: "▶" },
              { day: 15, oshi: oshiData[0], event: "COLLAB", icon: "⚔" },
              { day: 20, oshi: oshiData[2], event: "3D LIVE", icon: "♪" },
            ]
              .filter(({ oshi }) => !!oshi)
              .map(({ day, oshi, event, icon }) => (
              <div key={day} className="flex items-center gap-3 p-2 bg-gba-surface border-l-4" style={{ borderColor: oshi!.color }}>
                <div
                  className="w-8 text-center"
                  style={{ fontFamily: "var(--font-pixel)" }}
                >
                  <span className="text-gba-orange text-[8px]">3/{day}</span>
                </div>
                <span className="text-sm">{icon}</span>
                <div className="flex-1">
                  <p 
                    className="text-gba-text text-[10px]"
                    style={{ fontFamily: "var(--font-pixel)" }}
                  >
                    {event}
                  </p>
                  <p className="text-gba-text-muted text-[8px]">{oshi!.name}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    )
  }

  // REPORT SCREEN - Monthly Results
  const renderReport = () => {
    const totalHours = oshiData.reduce((sum, o) => sum + o.watchHours, 0)
    const topOshi = oshiData.reduce((top, o) => o.watchHours > top.watchHours ? o : top, oshiData[0])
    
    const stampRanking = [
      { emoji: "💖", count: 234 },
      { emoji: "🔥", count: 189 },
      { emoji: "😭", count: 156 },
      { emoji: "✨", count: 142 },
      { emoji: "👏", count: 98 },
    ]

    return (
      <div className="space-y-5">
        <h1 
          className="text-gba-green gba-glow"
          style={{ fontFamily: "var(--font-pixel)", fontSize: "14px" }}
        >
          MONTHLY RESULTS
        </h1>

        {/* Hero Stats Card */}
        <PixelCard borderColor="#F5A623" className="bg-gba-surface">
          <p 
            className="text-gba-orange text-[10px] text-center mb-2"
            style={{ fontFamily: "var(--font-pixel)" }}
          >
            FEB 2025 REPORT
          </p>
          <p className="text-gba-text-muted text-[8px] text-center" style={{ fontFamily: "var(--font-pixel)" }}>
            TOTAL WATCH TIME
          </p>
          <p 
            className="text-gba-green gba-glow text-center text-4xl my-2"
            style={{ fontFamily: "var(--font-pixel)" }}
          >
            {totalHours}
            <span className="text-sm ml-1">HRS</span>
          </p>
          <div className="text-center">
            <span 
              className="text-gba-orange text-[10px] animate-blink"
              style={{ fontFamily: "var(--font-pixel)" }}
            >
              ★★★ DIAMOND RANK ★★★
            </span>
          </div>
        </PixelCard>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3">
          <PixelCard borderColor={topOshi.color}>
            <p className="text-gba-text-muted text-[8px]" style={{ fontFamily: "var(--font-pixel)" }}>
              MVP STREAMER
            </p>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-2xl">{topOshi.emoji}</span>
              <div>
                <p className="text-gba-text text-[10px]" style={{ fontFamily: "var(--font-pixel)" }}>
                  {topOshi.name}
                </p>
                <p className="text-gba-text-muted text-[8px]">{topOshi.watchHours}H</p>
              </div>
            </div>
          </PixelCard>

          <PixelCard borderColor="#FFD93D">
            <p className="text-gba-text-muted text-[8px]" style={{ fontFamily: "var(--font-pixel)" }}>
              STREAK
            </p>
            <p 
              className="text-gba-green text-xl mt-2 gba-glow"
              style={{ fontFamily: "var(--font-pixel)" }}
            >
              18
              <span className="text-[10px] ml-1">DAYS</span>
            </p>
            <p className="text-gba-orange text-[8px]" style={{ fontFamily: "var(--font-pixel)" }}>
              NEW RECORD!
            </p>
          </PixelCard>

          <PixelCard borderColor="#5B8DD9" className="col-span-2">
            <p className="text-gba-text-muted text-[8px]" style={{ fontFamily: "var(--font-pixel)" }}>
              TOP STREAM
            </p>
            <div className="flex items-center gap-3 mt-2">
              <div className="w-10 h-10 flex items-center justify-center text-xl border-2 border-black bg-gba-mid">
                {topOshi.emoji}
              </div>
              <div>
                <p className="text-gba-text text-[10px]" style={{ fontFamily: "var(--font-pixel)" }}>
                  3D DEBUT STREAM
                </p>
                <p className="text-gba-text-muted text-[8px]">3H 42M WATCHED</p>
              </div>
            </div>
          </PixelCard>
        </div>

        {/* Reaction Log */}
        <PixelCard borderColor="#F5A623">
          <SectionHeader>REACTION LOG</SectionHeader>
          <div className="space-y-2">
            {stampRanking.map((stamp, idx) => (
              <div key={stamp.emoji} className="flex items-center gap-2">
                <span 
                  className="w-4 text-center text-gba-text-muted text-[8px]"
                  style={{ fontFamily: "var(--font-pixel)" }}
                >
                  {idx + 1}
                </span>
                <span className="text-lg">{stamp.emoji}</span>
                <div className="flex-1">
                  <HPBar 
                    value={stamp.count} 
                    max={stampRanking[0].count} 
                    color="#7BC67E"
                  />
                </div>
                <span 
                  className="text-gba-text text-[10px] w-8 text-right"
                  style={{ fontFamily: "var(--font-pixel)" }}
                >
                  {stamp.count}
                </span>
              </div>
            ))}
          </div>
        </PixelCard>

        {/* Share Button */}
        <PixelButton className="w-full py-3" variant="primary">
          ▶ SHARE RESULTS
        </PixelButton>
      </div>
    )
  }

  // OSHI DETAIL SCREEN - Character Status
  const renderOshiDetail = (oshi: Oshi) => (
    <div className="space-y-5">
      {/* Back Button */}
      <button
        onClick={() => setSelectedOshi(null)}
        className="flex items-center gap-1 text-gba-orange"
        style={{ fontFamily: "var(--font-pixel)", fontSize: "10px" }}
      >
        <ChevronLeft className="w-4 h-4" />
        BACK
      </button>

      {/* Character Card */}
      <PixelCard
        borderColor={oshi.color}
        className="relative overflow-hidden"
      >
        <div
          className="absolute inset-0 opacity-20"
          style={{ backgroundColor: oshi.color }}
        />
        <div className="relative z-10 text-center py-4">
          <div
            className="w-20 h-20 flex items-center justify-center text-5xl mx-auto mb-3 border-4 border-black bg-gba-mid"
          >
            {oshi.emoji}
          </div>
          <h1 
            className="text-gba-text gba-glow"
            style={{ fontFamily: "var(--font-pixel)", fontSize: "14px" }}
          >
            {oshi.name}
          </h1>
          <p className="text-gba-text-muted text-[10px] mt-1" style={{ fontFamily: "var(--font-pixel)" }}>
            {oshi.handle}
          </p>
          <p className="text-gba-orange text-[8px] mt-2" style={{ fontFamily: "var(--font-pixel)" }}>
            CLASS: STREAMER
          </p>
          {oshi.isLive && (
            <div className="inline-flex items-center gap-1 px-3 py-1 bg-red-600 border-2 border-black mt-2">
              <span 
                className="text-white text-[8px] animate-blink"
                style={{ fontFamily: "var(--font-pixel)" }}
              >
                ● LIVE
              </span>
            </div>
          )}
        </div>
      </PixelCard>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: "STREAMS", value: oshi.streamCount },
          { label: "EVENTS", value: String(oshi.eventCount).padStart(2, "0") },
          { label: "WATCH", value: `${oshi.watchHours}H` },
        ].map(stat => (
          <PixelCard key={stat.label} borderColor={oshi.color} className="text-center py-2">
            <p 
              className="text-lg gba-glow"
              style={{ fontFamily: "var(--font-pixel)", color: oshi.color }}
            >
              {stat.value}
            </p>
            <p className="text-gba-text-muted text-[6px]" style={{ fontFamily: "var(--font-pixel)" }}>
              {stat.label}
            </p>
          </PixelCard>
        ))}
      </div>

      {/* Bond Gauge */}
      <PixelCard borderColor={oshi.color}>
        <p className="text-gba-text-muted text-[8px] mb-2" style={{ fontFamily: "var(--font-pixel)" }}>
          BOND
        </p>
        <HPBar value={oshi.watchHours} max={60} color={oshi.color} showLevel />
      </PixelCard>

      {/* Enable Alerts Button */}
      <PixelButton className="w-full" variant="primary" onClick={() => {}}>
        <Bell className="w-4 h-4 inline mr-2" />
        ENABLE ALERTS
      </PixelButton>

      {/* Important Dates */}
      <PixelCard borderColor={oshi.color}>
        <SectionHeader>IMPORTANT DATES</SectionHeader>
        <div className="space-y-3">
          <div className="flex items-center gap-3 p-2 bg-gba-surface border-2 border-gba-mid">
            <span className="text-xl">🎂</span>
            <div>
              <p className="text-gba-text text-[10px]" style={{ fontFamily: "var(--font-pixel)" }}>
                BIRTHDAY
              </p>
              <p className="text-gba-text-muted text-[8px]">{oshi.birthday}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-2 bg-gba-surface border-2 border-gba-mid">
            <span className="text-xl">🎉</span>
            <div>
              <p className="text-gba-text text-[10px]" style={{ fontFamily: "var(--font-pixel)" }}>
                DEBUT
              </p>
              <p className="text-gba-text-muted text-[8px]">{oshi.debutDate}</p>
            </div>
          </div>
        </div>
      </PixelCard>

      {/* Quest Log */}
      <section>
        <SectionHeader>QUEST LOG</SectionHeader>
        <div className="space-y-2">
          {streamEvents
            .filter(e => e.oshiId === oshi.id)
            .map(event => (
              <PixelCard key={event.id} borderColor={oshi.color}>
                <div className="flex items-center gap-3">
                  <div className="text-center">
                    <p className="text-gba-text-muted text-[8px]" style={{ fontFamily: "var(--font-pixel)" }}>
                      {event.date}
                    </p>
                    <p 
                      className="text-sm"
                      style={{ fontFamily: "var(--font-pixel)", color: oshi.color }}
                    >
                      {event.time}
                    </p>
                  </div>
                  <span className="text-gba-orange">{getEventIcon(event.type)}</span>
                  <p className="text-gba-text text-[10px]" style={{ fontFamily: "var(--font-pixel)" }}>
                    {event.title}
                  </p>
                </div>
              </PixelCard>
            ))}
        </div>
      </section>
    </div>
  )

  const renderAuthScreen = () => (
    <div className="flex-1 w-full max-w-[390px] mx-auto px-4 pt-8 pb-24 flex flex-col items-center justify-start">
      <PixelCard borderColor="#F5A623" className="w-full max-w-sm bg-gba-surface">
        <div className="text-center mb-4">
          <h1
            className="text-gba-green gba-glow text-lg"
            style={{ fontFamily: "var(--font-pixel)" }}
          >
            OSHILOG
          </h1>
          <p
            className="text-gba-text-muted text-[8px] mt-1"
            style={{ fontFamily: "var(--font-pixel)" }}
          >
            PLAYER LOGIN
          </p>
        </div>

        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault()
            console.log("=== FORM SUBMITTED ===")
            handleAuthSubmit(authMode)
          }}
        >
          <div className="space-y-1">
            <label
              className="block text-gba-text text-[8px] mb-1"
              style={{ fontFamily: "var(--font-pixel)" }}
            >
              EMAIL
            </label>
            <input
              type="email"
              className="w-full px-2 py-1 bg-gba-mid border-2 border-gba-orange text-gba-text text-xs outline-none"
              style={{ fontFamily: "var(--font-pixel)" }}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1">
            <label
              className="block text-gba-text text-[8px] mb-1"
              style={{ fontFamily: "var(--font-pixel)" }}
            >
              PASSWORD
            </label>
            <input
              type="password"
              className="w-full px-2 py-1 bg-gba-mid border-2 border-gba-orange text-gba-text text-xs outline-none"
              style={{ fontFamily: "var(--font-pixel)" }}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {authError && (
            <p
              className="text-red-400 text-[8px]"
              style={{ fontFamily: "var(--font-pixel)" }}
            >
              {authError}
            </p>
          )}

          <div className="space-y-2 pt-2">
            <PixelButton
              className="w-full py-2"
              variant="primary"
              type="submit"
              disabled={authSubmitting}
            >
              {authSubmitting
                ? "CONNECTING..."
                : authMode === "signIn"
                ? "▶ START"
                : "▶ REGISTER"}
            </PixelButton>

            <PixelButton
              className="w-full py-2"
              variant="ghost"
              onClick={() =>
                setAuthMode((prev) => (prev === "signIn" ? "signUp" : "signIn"))
              }
            >
              {authMode === "signIn"
                ? "NEW PLAYER? CREATE ACCOUNT"
                : "HAVE SAVE DATA? LOGIN"}
            </PixelButton>
          </div>
        </form>
      </PixelCard>
    </div>
  )

  return (
    <div className="min-h-screen bg-gba-dark pixel-grid scanlines flex flex-col">
      {/* Main Content */}
      <main className="flex-1 w-full max-w-[390px] mx-auto px-4 pt-4 pb-24 overflow-y-auto">
        {authLoading ? (
          <p
            className="text-gba-text text-xs"
            style={{ fontFamily: "var(--font-pixel)" }}
          >
            CHECKING SAVE DATA...
          </p>
        ) : !user ? (
          renderAuthScreen()
        ) : loading ? (
          <p
            className="text-gba-text text-xs"
            style={{ fontFamily: "var(--font-pixel)" }}
          >
            LOADING...
          </p>
        ) : error ? (
          <p
            className="text-red-400 text-xs"
            style={{ fontFamily: "var(--font-pixel)" }}
          >
            ERROR: {error}
          </p>
        ) : selectedOshi ? (
          renderOshiDetail(selectedOshi)
        ) : (
          <>
            {activeTab === "home" && renderHome()}
            {activeTab === "oshi" && renderOshiList()}
            {activeTab === "calendar" && renderCalendar()}
            {activeTab === "report" && renderReport()}
          </>
        )}
      </main>

      {/* Bottom Tab Bar - GBA Button Panel Style */}
      <nav className="fixed bottom-0 left-0 right-0 bg-gba-mid border-t-2 border-gba-orange safe-area-inset-bottom">
        <div className="max-w-[390px] mx-auto flex">
          {tabs.map(tab => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id && !selectedOshi
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id)
                  setSelectedOshi(null)
                }}
                className={`
                  flex-1 flex flex-col items-center gap-1 py-3 transition-colors border-r border-gba-dark last:border-r-0
                  ${isActive ? "bg-gba-orange text-gba-dark" : "text-gba-text-muted hover:bg-gba-surface"}
                `}
              >
                <Icon className="w-5 h-5" strokeWidth={isActive ? 2.5 : 2} />
                <span 
                  className="text-[8px]"
                  style={{ fontFamily: "var(--font-pixel)" }}
                >
                  {tab.label}
                </span>
              </button>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
