'use client'

import { useState, useRef, useEffect, ReactNode } from 'react'
import { Skeleton } from '@/app/components/ui/skeleton'

interface LazyLoadWrapperProps {
  children: ReactNode;
  placeholderHeight?: string; // e.g., '200px'
  className?: string;
}

export default function LazyLoadWrapper({ 
  children, 
  placeholderHeight = '200px',
  className = '' 
}: LazyLoadWrapperProps) {
  const [isInView, setIsInView] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        // Update our state when observer callback fires
        if (entry.isIntersecting) {
          setIsInView(true);
          // No need to keep observing after it's in view
          observer.disconnect();
        }
      },
      {
        rootMargin: '0px 0px 100px 0px', // Start loading 100px before it enters the viewport
      }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => {
      if(ref.current) {
        observer.unobserve(ref.current);
      }
    };
  }, []); // Empty array ensures that effect is only run on mount and unmount

  return (
    <div ref={ref} className={className}>
      {isInView ? children : <Skeleton style={{ height: placeholderHeight }} />}
    </div>
  );
}
