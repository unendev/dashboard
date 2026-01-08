'use client'

import { useEffect, useCallback, useState } from 'react'
import { Button } from '@/app/components/ui/button'
import { X, ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { LazyNextImage } from '@/app/components/shared/LazyNextImage'

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

/**
 * ImageLightbox Component
 * 
 * A fullscreen image viewer modal that displays images with proper viewport coverage,
 * navigation controls, and responsive design for all screen sizes.
 * 
 * Features:
 * - Full viewport coverage with fixed positioning
 * - Proper image sizing with aspect ratio preservation
 * - Centered image display
 * - Background scroll prevention
 * - Keyboard navigation (Escape to close, Arrow keys to navigate)
 * - Touch gestures support (swipe to navigate on mobile)
 * - Loading state handling
 * - Responsive design for mobile/tablet/desktop
 */
export function ImageLightbox({
  images,
  initialIndex,
  isOpen,
  onClose,
  title
}: ImageLightboxProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex)
  const [isLoading, setIsLoading] = useState(true)
  const [touchStart, setTouchStart] = useState<number | null>(null)

  // Clamp index to valid range
  const validIndex = Math.max(0, Math.min(currentIndex, images.length - 1))
  const currentImage = images[validIndex]

  // Handle Escape key and arrow keys
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      } else if (e.key === 'ArrowLeft') {
        handlePrevious()
      } else if (e.key === 'ArrowRight') {
        handleNext()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose, validIndex])

  // Prevent background scroll when lightbox is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
      return () => {
        document.body.style.overflow = 'unset'
      }
    }
  }, [isOpen])

  const handleNext = useCallback(() => {
    setCurrentIndex((prev) =>
      prev === images.length - 1 ? 0 : prev + 1
    )
    setIsLoading(true)
  }, [images.length])

  const handlePrevious = useCallback(() => {
    setCurrentIndex((prev) =>
      prev === 0 ? images.length - 1 : prev - 1
    )
    setIsLoading(true)
  }, [images.length])

  // Handle touch swipe gestures
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.touches[0].clientX)
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStart === null) return

    const touchEnd = e.changedTouches[0].clientX
    const diff = touchStart - touchEnd

    // Swipe left (next image)
    if (diff > 50) {
      handleNext()
    }
    // Swipe right (previous image)
    else if (diff < -50) {
      handlePrevious()
    }

    setTouchStart(null)
  }

  if (!isOpen || !currentImage) {
    return null
  }

  return (
    <div
      className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center"
      onClick={onClose}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Main content container - prevent click propagation */}
      <div
        className="relative w-full h-full flex items-center justify-center p-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Image viewer */}
        <div className="relative max-w-4xl max-h-full w-full h-full flex items-center justify-center">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white" />
            </div>
          )}

          <LazyNextImage
            src={currentImage.url}
            alt={currentImage.alt || title || 'Image'}
            width={currentImage.width || 1200}
            height={currentImage.height || 800}
            sizes="(max-width: 640px) 90vw, (max-width: 1024px) 95vw, 1200px"
            quality={90}
            className={cn(
              'max-w-full max-h-full transition-opacity duration-200',
              isLoading ? 'opacity-0' : 'opacity-100'
            )}
            objectFit="contain"
            priority={true}
            rootMargin="0px"
            showLoader={false}
            onLoad={() => setIsLoading(false)}
          />
        </div>

        {/* Close button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="absolute top-4 right-4 bg-black/50 text-white hover:bg-black/70 hover:text-white rounded-full p-2 h-10 w-10"
          aria-label="Close lightbox"
        >
          <X className="h-5 w-5" />
        </Button>

        {/* Navigation controls - only show if multiple images */}
        {images.length > 1 && (
          <>
            {/* Previous button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={handlePrevious}
              className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-black/50 text-white hover:bg-black/70 hover:text-white rounded-full p-2 h-10 w-10"
              aria-label="Previous image"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>

            {/* Next button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleNext}
              className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-black/50 text-white hover:bg-black/70 hover:text-white rounded-full p-2 h-10 w-10"
              aria-label="Next image"
            >
              <ChevronRight className="h-5 w-5" />
            </Button>

            {/* Image counter */}
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black/50 text-white px-4 py-2 rounded-full text-sm font-medium">
              {validIndex + 1} / {images.length}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
