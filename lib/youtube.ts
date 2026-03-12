// YouTube Data API v3 Service
export interface YouTubeVideo {
  id: string
  title: string
  description: string
  publishedAt: string
  scheduledStartTime?: string
  thumbnailUrl: string
  isLive: boolean
  isUpcoming: boolean
}

export interface YouTubeChannel {
  id: string
  title: string
  description: string
  thumbnailUrl: string
  subscriberCount: number
  videoCount: number
}

class YouTubeService {
  private baseUrl = '/api/youtube'

  constructor() {
    console.log('=== YouTube Service Init (Server-side) ===')
  }

  // Fetch channel details (not used for now)
  async getChannel(channelId: string): Promise<YouTubeChannel | null> {
    console.log(`=== Fetching channel ${channelId} ===`)
    return null // Not implemented for now
  }

  // Fetch recent videos and upcoming streams using server API
  async getChannelVideos(channelId: string, maxResults: number = 10): Promise<YouTubeVideo[]> {
    console.log(`=== Fetching videos for channel ${channelId} ===`)

    try {
      const url = `${this.baseUrl}?channelId=${channelId}&type=videos`
      console.log('Request URL:', url)
      
      const response = await fetch(url)
      console.log('Response status:', response.status)
      
      if (!response.ok) {
        const errorData = await response.json()
        console.error('Failed to fetch videos:', response.status, errorData)
        return []
      }

      const data = await response.json()
      console.log('API Response:', data)
      
      if (data.error) {
        console.error('API Error:', data.error)
        return []
      }

      const videos = data.videos || []
      console.log(`Received ${videos.length} videos from server`)
      
      return videos
    } catch (error) {
      console.error('Error fetching channel videos:', error)
      return []
    }
  }

  // Convert YouTube video to StreamEvent format
  convertToStreamEvent(video: YouTubeVideo, oshiId: number): {
    id: string
    oshiId: number
    title: string
    date: string
    time: string
    isLive: boolean
    type: "stream" | "collab" | "music" | "birthday"
  } {
    const videoDate = video.scheduledStartTime ? new Date(video.scheduledStartTime) : new Date(video.publishedAt)
    
    // Determine event type based on title keywords
    let type: "stream" | "collab" | "music" | "birthday" = "stream"
    const title = video.title.toLowerCase()
    
    if (title.includes('birthday') || title.includes('誕生日') || title.includes('birthday')) {
      type = "birthday"
    } else if (title.includes('collab') || title.includes('コラボ') || title.includes('duet')) {
      type = "collab"
    } else if (title.includes('song') || title.includes('music') || title.includes('歌') || title.includes('オリジナル曲')) {
      type = "music"
    }

    return {
      id: video.id,
      oshiId,
      title: video.title,
      date: videoDate.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' }),
      time: videoDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
      isLive: video.isLive,
      type,
    }
  }
}

export const youtubeService = new YouTubeService()
