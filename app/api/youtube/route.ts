import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const channelId = searchParams.get('channelId')
  const type = searchParams.get('type') || 'videos'
  
  console.log('=== YouTube API Route ===')
  console.log('Channel ID:', channelId)
  console.log('Type:', type)
  
  // Check for API key
  const apiKey = process.env.YOUTUBE_API_KEY
  const publicApiKey = process.env.NEXT_PUBLIC_YOUTUBE_API_KEY
  
  console.log('Environment Variables Check:')
  console.log('YOUTUBE_API_KEY exists:', !!apiKey)
  console.log('YOUTUBE_API_KEY length:', apiKey?.length || 0)
  console.log('NEXT_PUBLIC_YOUTUBE_API_KEY exists:', !!publicApiKey)
  console.log('NEXT_PUBLIC_YOUTUBE_API_KEY length:', publicApiKey?.length || 0)
  
  // Use the appropriate API key
  const finalApiKey = apiKey || publicApiKey
  
  if (!finalApiKey) {
    console.error('No YouTube API key found in any environment variable')
    return NextResponse.json({ 
      error: 'YouTube API key not configured',
      details: {
        hasServerKey: !!apiKey,
        hasPublicKey: !!publicApiKey,
        suggestion: 'Add YOUTUBE_API_KEY to .env.local file'
      }
    }, { status: 500 })
  }
  
  console.log('Using API key (length):', finalApiKey.length)
  
  if (!channelId) {
    return NextResponse.json({ error: 'Channel ID required' }, { status: 400 })
  }

  try {
    const baseUrl = 'https://www.googleapis.com/youtube/v3'
    
    // Extract handle from channel ID if it's a URL format
    const extractHandle = (input: string): string => {
      const patterns = [
        /youtube\.com\/@([^/\s?&]+)/,
        /@([^/\s?&]+)/,
      ]
      
      for (const pattern of patterns) {
        const match = input.match(pattern)
        if (match) {
          console.log('Extracted handle:', match[1])
          return match[1]
        }
      }
      
      // If already a channel ID, return as-is
      if (/^UC[\w-]{22}$/.test(input)) {
        return input
      }
      
      return input
    }
    
    // If channelId is a URL with handle, resolve it first
    let actualChannelId = channelId
    if (channelId && (channelId.includes('@') || channelId.includes('youtube.com/'))) {
      console.log('Channel ID is URL format, extracting handle:', channelId)
      const handle = extractHandle(channelId)
      
      if (handle && handle !== channelId) {
        console.log('Resolving handle to channel ID:', handle)
        
        const resolveUrl = `${baseUrl}/channels?part=id&forHandle=${handle}&key=${finalApiKey}`
        console.log('Resolve URL:', resolveUrl.replace(finalApiKey, 'API_KEY_HIDDEN'))
        
        const resolveResponse = await fetch(resolveUrl)
        
        if (resolveResponse.ok) {
          const resolveData = await resolveResponse.json()
          console.log('Resolve response:', resolveData)
          
          if (resolveData.items?.length > 0) {
            actualChannelId = resolveData.items[0].id
            console.log('Resolved to channel ID:', actualChannelId)
          }
        } else {
          console.error('Failed to resolve handle:', resolveResponse.status)
        }
      }
    }
    
    if (type === 'videos') {
      console.log('Fetching videos for channel:', actualChannelId)
      
      // Get both regular videos and live streams
      const [videosResponse, liveResponse] = await Promise.all([
        fetch(`${baseUrl}/search?part=snippet&channelId=${actualChannelId}&maxResults=10&order=date&type=video&key=${finalApiKey}`),
        fetch(`${baseUrl}/search?part=snippet&channelId=${actualChannelId}&maxResults=5&order=date&type=video&eventType=upcoming&key=${finalApiKey}`)
      ])

      console.log('Videos response status:', videosResponse.status)
      console.log('Live response status:', liveResponse.status)

      if (!videosResponse.ok || !liveResponse.ok) {
        const videoError = !videosResponse.ok ? await videosResponse.text() : ''
        const liveError = !liveResponse.ok ? await liveResponse.text() : ''
        console.error('API Error:', { videoError, liveError })
        return NextResponse.json({ 
          error: 'Failed to fetch YouTube data',
          details: { 
            videoStatus: videosResponse.status,
            liveStatus: liveResponse.status,
            videoError: videoError.substring(0, 200),
            liveError: liveError.substring(0, 200)
          }
        }, { status: 500 })
      }

      const videosData = await videosResponse.json()
      const liveData = await liveResponse.json()

      console.log('Videos data items:', videosData.items?.length || 0)
      console.log('Live data items:', liveData.items?.length || 0)

      const videos = []

      // Process regular videos
      if (videosData.items) {
        videos.push(...videosData.items.map((item: any) => ({
          id: item.id.videoId,
          title: item.snippet.title,
          description: item.snippet.description || '',
          publishedAt: item.snippet.publishedAt,
          thumbnailUrl: item.snippet.thumbnails?.default?.url || '',
          isLive: false,
          isUpcoming: false,
        })))
      }

      // Process upcoming/live streams
      if (liveData.items) {
        videos.push(...liveData.items.map((item: any) => {
          const isLive = item.snippet.liveBroadcastDetails?.actualStartTime && !item.snippet.liveBroadcastDetails?.actualEndTime
          const isUpcoming = item.snippet.liveBroadcastDetails?.scheduledStartTime && !item.snippet.liveBroadcastDetails?.actualStartTime
          
          return {
            id: item.id.videoId,
            title: item.snippet.title,
            description: item.snippet.description || '',
            publishedAt: item.snippet.publishedAt,
            scheduledStartTime: item.snippet.liveBroadcastDetails?.scheduledStartTime,
            thumbnailUrl: item.snippet.thumbnails?.default?.url || '',
            isLive,
            isUpcoming,
          }
        }))
      }

      console.log(`Total videos processed: ${videos.length}`)
      console.log('Live videos:', videos.filter(v => v.isLive).length)
      console.log('Upcoming videos:', videos.filter(v => v.isUpcoming).length)

      // Sort by date (upcoming first, then recent)
      const sortedVideos = videos.sort((a, b) => {
        if (a.isUpcoming && !b.isUpcoming) return -1
        if (!a.isUpcoming && b.isUpcoming) return 1
        
        const aDate = new Date(a.scheduledStartTime || a.publishedAt)
        const bDate = new Date(b.scheduledStartTime || b.publishedAt)
        return bDate.getTime() - aDate.getTime()
      })

      return NextResponse.json({ videos: sortedVideos })
    }
    
    return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
    
  } catch (error) {
    console.error('YouTube API Error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
