import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  console.log('=== Environment Variable Test ===')
  
  // Check different possible environment variable names
  const envVars = {
    'YOUTUBE_API_KEY': process.env.YOUTUBE_API_KEY,
    'NEXT_PUBLIC_YOUTUBE_API_KEY': process.env.NEXT_PUBLIC_YOUTUBE_API_KEY,
    'NODE_ENV': process.env.NODE_ENV,
  }
  
  console.log('Environment Variables:')
  for (const [key, value] of Object.entries(envVars)) {
    console.log(`${key}:`, {
      exists: !!value,
      length: value?.length || 0,
      prefix: value ? value.substring(0, 10) + '...' : 'none'
    })
  }
  
  return NextResponse.json({
    message: 'Environment variable test',
    envVars: {
      YOUTUBE_API_KEY: {
        exists: !!process.env.YOUTUBE_API_KEY,
        length: process.env.YOUTUBE_API_KEY?.length || 0
      },
      NEXT_PUBLIC_YOUTUBE_API_KEY: {
        exists: !!process.env.NEXT_PUBLIC_YOUTUBE_API_KEY,
        length: process.env.NEXT_PUBLIC_YOUTUBE_API_KEY?.length || 0
      }
    }
  })
}
