import React, { useState, useRef, useEffect, useCallback } from 'react';
import { DraggableDivider } from '../components/ui/DraggableDivider';
import { TodoBoard } from '../components/features/todo/TodoBoard';
import { MemoBoard } from '../components/features/memo/MemoBoard';

export default function TodoMemoFusionPage() {
    const [splitRatio, setSplitRatio] = useState(50); // percentage for top section
    const [isDragging, setIsDragging] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const MIN_HEIGHT_PX = 150; // Increased min height for usability
    const STORAGE_KEY = 'todo-memo-split-ratio';

    // Load persisted state
    useEffect(() => {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            const val = parseFloat(saved);
            if (!isNaN(val) && val >= 10 && val <= 90) {
                setSplitRatio(val);
            }
        }
    }, []);

    // Persist state
    useEffect(() => {
        if (!isDragging) {
            localStorage.setItem(STORAGE_KEY, splitRatio.toString());
        }
    }, [splitRatio, isDragging]);

    const handleMouseDown = (e: React.MouseEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleMouseMove = useCallback((e: MouseEvent) => {
        if (!isDragging || !containerRef.current) return;

        const containerRect = containerRef.current.getBoundingClientRect();
        const containerHeight = containerRect.height;
        // relativeY relative to container top
        const relativeY = e.clientY - containerRect.top;
        
        // Calculate raw percentage
        let newRatio = (relativeY / containerHeight) * 100;

        // Apply pixel constraints
        const minRatio = (MIN_HEIGHT_PX / containerHeight) * 100;
        const maxRatio = 100 - minRatio;

        // Clamp
        if (newRatio < minRatio) newRatio = minRatio;
        if (newRatio > maxRatio) newRatio = maxRatio;

        setSplitRatio(newRatio);
    }, [isDragging]);

    const handleMouseUp = useCallback(() => {
        setIsDragging(false);
    }, []);

    useEffect(() => {
        if (isDragging) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
            document.body.style.cursor = 'row-resize';
            document.body.style.userSelect = 'none';
        } else {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
        }
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
        };
    }, [isDragging, handleMouseMove, handleMouseUp]);

    return (
        <div ref={containerRef} className="flex flex-col h-screen w-full bg-zinc-900 text-zinc-100 overflow-hidden select-none">
            {/* Top Section: Todo */}
            <div 
                style={{ height: `${splitRatio}%` }} 
                className="flex flex-col overflow-hidden relative min-h-0"
            >
                <TodoBoard />
            </div>

            {/* Divider */}
            <DraggableDivider onMouseDown={handleMouseDown} isDragging={isDragging} />

            {/* Bottom Section: Memo */}
            <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                <MemoBoard
                    title="MEMO :: FUSION"
                    storageKeyPrefix="manifesto-global"
                    showVariables={false} // Clean view for fusion mode
                    showHeader={false}
                />
            </div>
        </div>
    );
}
