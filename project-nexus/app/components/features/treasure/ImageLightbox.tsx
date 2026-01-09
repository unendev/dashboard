'use client'

import { useEffect, useCallback, useState } from 'react'
import { createPortal } from 'react-dom'
import { LazyNextImage } from '@/app/components/shared/LazyNextImage'
import { Button } from '@/app/components/ui/button'
import { X, ChevronLeft, ChevronRight } from 'lucide-react'

export interface ImageLightboxImage {
  id: string
  url: string
  alt?: string
  width?: number
  height?: number
}

export interface ImageLightboxProps {
  images: ImageLightboxImage[]
  initialIndex: number
  isOpen: boolean
  onClose: () => void
  title?: string
}

export function ImageLightbox({
  images,
  initialIndex,
  isOpen,
  onClose,
  title
}: ImageLightboxProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex)
  const [touchStart, setTouchStart] = useState<number | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    setCurrentIndex(initialIndex)
  }, [initialIndex])

  const validIndex = Math.max(0, Math.min(currentIndex, images.length - 1))
  const currentImage = images[validIndex]

  const handleNext = useCallback(() => {
    setCurrentIndex((prev) => prev === images.length - 1 ? 0 : prev + 1)
  }, [images.length])

  const handlePrevious = useCallback(() => {
    setCurrentIndex((prev) => prev === 0 ? images.length - 1 : prev - 1)
  }, [images.length])

  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      else if (e.key === 'ArrowLeft') handlePrevious()
      else if (e.key === 'ArrowRight') handleNext()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose, handleNext, handlePrevious])

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
      return () => { document.body.style.overflow = 'unset' }
    }
  }, [isOpen])

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.touches[0].clientX)
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStart === null) return
    const touchEnd = e.changedTouches[0].clientX
    const diff = touchStart - touchEnd
    if (diff > 50) handleNext()
    else if (diff < -50) handlePrevious()
    setTouchStart(null)
  }

  if (!mounted || !isOpen || !currentImage) return null

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] bg-black flex items-center justify-center"
      onClick={onClose}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div
        className="absolute inset-0 flex items-center justify-center"
        onClick={(e) => e.stopPropagation()}
      >
        <LazyNextImage
          src={currentImage.url}
          alt={currentImage.alt || title || 'Image'}
          width={currentImage.width || 1920}
          height={currentImage.height || 1080}
          sizes="100vw"
          quality={90}
          priority
          unoptimized
          objectFit="contain"
          containerClassName="w-full h-full"
          className="max-w-full max-h-full"
        />
      </div>

      <Button
        variant="ghost"
        size="sm"
        onClick={(e) => {
          e.stopPropagation()
          onClose()
        }}
        className="absolute top-4 right-4 z-10 bg-black/50 text-white hover:bg-black/70 rounded-full p-2 h-12 w-12"
        aria-label="Close"
      >
        <X className="h-6 w-6" />
      </Button>

      {images.length > 1 && (
        <>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation()
              handlePrevious()
            }}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-10 bg-black/50 text-white hover:bg-black/70 rounded-full p-2 h-12 w-12"
            aria-label="Previous"
          >
            <ChevronLeft className="h-6 w-6" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation()
              handleNext()
            }}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-10 bg-black/50 text-white hover:bg-black/70 rounded-full p-2 h-12 w-12"
            aria-label="Next"
          >
            <ChevronRight className="h-6 w-6" />
          </Button>
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 bg-black/50 text-white px-4 py-2 rounded-full text-sm">
            {validIndex + 1} / {images.length}
          </div>
        </>
      )}
    </div>,
    document.body
  )
}
