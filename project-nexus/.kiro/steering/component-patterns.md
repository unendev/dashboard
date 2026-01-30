---
inclusion: always
---

# Component Patterns

## Component Organization

### Directory Structure
```
app/components/
├── features/          # Feature-specific components
│   ├── treasure/     # Treasure Pavilion components
│   ├── timer/        # Timer system components
│   └── widgets/      # Widget components
├── shared/           # Reusable components
│   ├── LazyNextImage.tsx
│   └── LoadingSpinner.tsx
└── ui/               # UI primitives (shadcn/ui)
    ├── button.tsx
    ├── dialog.tsx
    └── select.tsx
```

## Common Patterns

### Image Lightbox Pattern
Full-screen image viewer with navigation:
```typescript
export interface ImageLightboxProps {
  images: ImageLightboxImage[]
  initialIndex: number
  isOpen: boolean
  onClose: () => void
  title?: string
}

export function ImageLightbox({ images, initialIndex, isOpen, onClose }: ImageLightboxProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex)
  
  // Portal rendering for full-screen overlay
  if (!isOpen) return null
  
  return createPortal(
    <div className="fixed inset-0 z-[9999] bg-black">
      {/* Content */}
    </div>,
    document.body
  )
}
```


### Lazy Image Loading
Use custom LazyNextImage component:
```typescript
import { LazyNextImage } from '@/app/components/shared/LazyNextImage'

<LazyNextImage
  src={imageUrl}
  alt={title}
  width={1200}
  height={800}
  sizes="100vw"
  quality={90}
  priority={false}
  unoptimized={isExternalCdn}
  objectFit="cover"
  containerClassName="w-full h-full"
  className="rounded-lg"
/>
```

### Modal/Dialog Pattern
Use Radix UI Dialog primitive:
```typescript
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/app/components/ui/dialog'

<Dialog open={isOpen} onOpenChange={setIsOpen}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Title</DialogTitle>
    </DialogHeader>
    {/* Content */}
  </DialogContent>
</Dialog>
```

### Form Handling
```typescript
'use client'

import { useState } from 'react'

export function CreateForm() {
  const [formData, setFormData] = useState({ title: '', content: '' })
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    
    try {
      const res = await fetch('/api/endpoint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })
      
      if (!res.ok) throw new Error('Failed')
      
      // Success handling
    } catch (error) {
      console.error(error)
    } finally {
      setIsSubmitting(false)
    }
  }
  
  return <form onSubmit={handleSubmit}>...</form>
}
```

### Data Fetching (Server Component)
```typescript
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'

export default async function TreasurePage() {
  const session = await getServerSession()
  
  const treasures = await prisma.treasure.findMany({
    where: { userId: session.user.id },
    include: { images: true },
    orderBy: { createdAt: 'desc' }
  })
  
  return <TreasureList treasures={treasures} />
}
```

### Client-Side Data Fetching
Use SWR or React Query:
```typescript
import useSWR from 'swr'

const fetcher = (url: string) => fetch(url).then(r => r.json())

export function TreasureList() {
  const { data, error, isLoading } = useSWR('/api/treasures', fetcher)
  
  if (isLoading) return <LoadingSpinner />
  if (error) return <ErrorMessage />
  
  return <div>{data.map(...)}</div>
}
```

### Responsive Design
Use Tailwind breakpoints:
```typescript
<div className="
  grid 
  grid-cols-1 
  md:grid-cols-2 
  lg:grid-cols-3 
  gap-4
">
  {items.map(...)}
</div>
```

### Touch Gestures (Mobile)
```typescript
const [touchStart, setTouchStart] = useState<number | null>(null)

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
```

### Keyboard Navigation
```typescript
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
```

### Prevent Body Scroll
```typescript
useEffect(() => {
  if (isOpen) {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = 'unset' }
  }
}, [isOpen])
```
