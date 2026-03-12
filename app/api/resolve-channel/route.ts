import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const input = searchParams.get('input')
  
  console.log('=== YouTube Channel Resolver ===')
  console.log('Input:', input)
  
  const apiKey = process.env.YOUTUBE_API_KEY
  
  console.log('API Key exists:', !!apiKey)
  
  if (!apiKey) {
    console.error('YouTube API key not found in server environment')
    return NextResponse.json({ error: 'YouTube API key not configured' }, { status: 500 })
  }
  
  if (!input) {
    return NextResponse.json({ error: 'Input required' }, { status: 400 })
  }

  try {
    const baseUrl = 'https://www.googleapis.com/youtube/v3'
    const trimmedInput = input.trim()
    
    // Check if it's already a channel ID
    if (/^UC[\w-]{22}$/.test(trimmedInput)) {
      console.log('Input is already a channel ID:', trimmedInput)
      return NextResponse.json({ channelId: trimmedInput })
    }
    
    // Extract channel ID from different URL formats
    const patterns = [
      // Custom handle: https://www.youtube.com/@username or youtube.com/@username
      /(?:https?:\/\/)?(?:www\.)?youtube\.com\/@([^/?]+)/,
      // Channel URL: https://www.youtube.com/channel/UCxxxxxx
      /(?:https?:\/\/)?(?:www\.)?youtube\.com\/channel\/([\w-]+)/,
      // Short URL: https://youtu.be/channel/UCxxxxxx
      /(?:https?:\/\/)?youtu\.be\/channel\/([\w-]+)/,
    ]
    
    let channelId = ''
    
    for (const pattern of patterns) {
      const match = trimmedInput.match(pattern)
      if (match) {
        if (pattern.source.includes('@')) {
          // This is a custom handle, need to resolve to channel ID
          const handle = match[1]
          console.log('Resolving custom handle:', handle)
          
          const searchUrl = `${baseUrl}/channels?part=snippet&forHandle=${handle}&key=${apiKey}`
          console.log('Search URL:', searchUrl.replace(apiKey, 'API_KEY_HIDDEN'))
          
          const searchResponse = await fetch(searchUrl)
          
          if (!searchResponse.ok) {
            const errorText = await searchResponse.text()
            console.error('Failed to search for handle:', searchResponse.status, errorText)
            return NextResponse.json({ error: 'Failed to resolve handle' }, { status: 500 })
          }
          
          const searchData = await searchResponse.json()
          console.log('Search results:', searchData)
          
          const channel = searchData.items?.[0]
          if (channel?.id) {
            channelId = channel.id
            console.log('Resolved handle to channel ID:', channelId)
          }
        } else {
          // Direct channel ID from URL
          channelId = match[1]
          console.log('Extracted channel ID from URL:', channelId)
        }
        break
      }
    }
    
    if (!channelId) {
      console.error('Could not extract channel ID from input')
      return NextResponse.json({ error: 'Invalid YouTube URL or channel ID' }, { status: 400 })
    }
    
    // Verify the channel ID is valid
    const verifyUrl = `${baseUrl}/channels?part=id&id=${channelId}&key=${apiKey}`
    const verifyResponse = await fetch(verifyUrl)
    
    if (!verifyResponse.ok) {
      console.error('Channel ID verification failed:', verifyResponse.status)
      return NextResponse.json({ error: 'Invalid channel ID' }, { status: 400 })
    }
    
    const verifyData = await verifyResponse.json()
    if (!verifyData.items?.length) {
      console.error('Channel not found')
      return NextResponse.json({ error: 'Channel not found' }, { status: 404 })
    }
    
    console.log('Channel ID verified successfully:', channelId)
    return NextResponse.json({ channelId })
    
  } catch (error) {
    console.error('Channel resolution error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
