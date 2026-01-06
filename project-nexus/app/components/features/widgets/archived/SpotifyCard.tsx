'use client'

interface SpotifyCardProps {
  isPlaying?: boolean
  trackName?: string
  artist?: string
  album?: string
  albumArtUrl?: string
  source?: string
  isFromCache?: boolean
  className?: string
}

export function SpotifyCard({ 
  trackName,
  artist,
  album,
  albumArtUrl,
  source = 'Spotify',
  className 
}: SpotifyCardProps) {
  return (
    <div className={`bg-white/5 backdrop-blur-sm rounded-xl p-4 ${className}`}>
      <div className="flex items-center gap-4">
        {/* 专辑封面 */}
        <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 shadow-lg">
          {albumArtUrl ? (
            <img 
              src={albumArtUrl} 
              alt={album || '专辑封面'} 
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center">
              <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                <div className="w-4 h-4 bg-white rounded-sm"></div>
              </div>
            </div>
          )}
        </div>
        
        {/* 音乐信息 */}
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-white truncate text-lg">
            {trackName || '未知歌曲'}
          </h4>
          <p className="text-white/70 truncate text-sm">
            {artist || '未知艺术家'}
          </p>
          <p className="text-white/50 truncate text-xs">
            from {source}
          </p>
        </div>
      </div>
    </div>
  )
}




