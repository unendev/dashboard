# Design Document: WebRead Content Loading Fix

## Overview

The WebRead content loading system is responsible for fetching EPUB files, rendering them using EpubJS, managing local caching via IndexedDB, and persisting reading progress. The current implementation has issues where book content fails to display after opening. This design addresses the root causes and establishes a robust, testable architecture for reliable content loading and display.

## Architecture

The system consists of four main layers:

1. **Data Layer**: Fetches book metadata from the database and EPUB files from OSS or IndexedDB cache
2. **Cache Layer**: Manages IndexedDB storage with LRU eviction policy
3. **Rendering Layer**: Initializes EpubJS rendition and applies styling
4. **State Management Layer**: Tracks reading position, theme preferences, and UI state

### Data Flow

```
User opens book
    ↓
Fetch book metadata from API
    ↓
Check IndexedDB cache
    ├─ Cache hit → Load from IndexedDB
    └─ Cache miss → Fetch from OSS → Cache locally
    ↓
Initialize EpubJS Book object
    ↓
Create Rendition with viewer container
    ↓
Apply theme and font size styles
    ↓
Display content at saved position or first chapter
    ↓
Track position changes and save to database
```

## Components and Interfaces

### 1. ReaderPage Component (`app/webread/read/[id]/page.tsx`)

**Responsibilities:**
- Fetch book metadata from API
- Initialize reader state and store
- Manage sidebar and UI chrome
- Handle progress saving

**Key Props:**
- `id`: Book ID from URL params

**State:**
- `bookMetadata`: Book title, file URL, reading progress
- `loading`: Initial load state
- `notes`: Reader notes and AI insights

### 2. EpubReader Component (`app/components/features/webread/EpubReader.tsx`)

**Responsibilities:**
- Load EPUB file from cache or network
- Initialize EpubJS rendition
- Apply styling and theme
- Track location changes
- Render AI insight bubbles

**Props:**
```typescript
interface EpubReaderProps {
  url: string;                    // OSS URL or blob URL
  bookId: string;                 // Database ID
  title?: string;                 // Book title for caching
  initialLocation?: string;       // Saved CFI position
  onLocationChange?: (cfi: string, progress: number) => void;
}
```

**Key Methods:**
- `loadBook()`: Orchestrates cache check, fetch, and initialization
- `applyStyles()`: Applies theme and font size to rendition
- `renderBubbles()`: Renders AI insight highlights

### 3. Cache Layer (`lib/ebook-cache.ts`)

**Responsibilities:**
- Manage IndexedDB database for EPUB storage
- Implement LRU eviction policy
- Provide cache statistics and cleanup

**Key Functions:**
- `getBook(bookId)`: Retrieve cached EPUB blob
- `setBook(bookId, fileUrl, blob, title)`: Cache EPUB file
- `deleteBook(bookId)`: Remove single book from cache
- `clearOldBooks()`: LRU cleanup when cache is full
- `isBookCached(bookId)`: Check if book is cached

### 4. Reader Store (`app/components/features/webread/useReaderStore.ts`)

**Responsibilities:**
- Manage reading state (position, progress, theme)
- Track selected text and AI bubbles
- Provide state updates to components

**State:**
```typescript
{
  book: Book | null;              // EpubJS Book object
  currentCfi: string;             // Current reading position
  progress: number;               // 0-1 progress percentage
  fontSize: number;               // Font size in pixels
  theme: 'light' | 'dark' | 'sepia';
  sidebarOpen: boolean;
  selectedText: { text: string; cfiRange: string } | null;
  bubbles: Array<{ id: string; cfi: string; snippet: string; fullAnalysis: string; type: string }>;
}
```

## Data Models

### Book (Database)
```typescript
{
  id: string;                     // Primary key
  userId: string;                 // Owner
  title: string;
  author: string | null;
  fileUrl: string;                // OSS URL
  fileSize: number;               // Bytes
  coverUrl: string | null;
  uploadDate: Date;
}
```

### ReadingProgress (Database)
```typescript
{
  id: string;
  bookId: string;
  userId: string;
  progress: number;               // 0-1
  cfi: string;                    // Current position
  currentChapter: string;
  updatedAt: Date;
}
```

### CachedBook (IndexedDB)
```typescript
{
  bookId: string;                 // Primary key
  fileUrl: string;
  blob: Blob;                     // EPUB file
  cachedAt: number;               // Timestamp
  lastAccessAt: number;           // For LRU
  fileSize: number;
  title: string;
}
```

## Correctness Properties

A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.

### Property 1: File Loading Completes Within Timeout
*For any* book ID and file URL, the system should fetch the EPUB file from cache or OSS and complete within 3 seconds.
**Validates: Requirements 1.1**

### Property 2: Rendition Initializes After File Load
*For any* fetched EPUB file, the system should initialize the EpubJS rendition and call `rendition.display()` with a valid location.
**Validates: Requirements 1.2**

### Property 3: Content Displays in Viewer Container
*For any* initialized rendition, the viewer container should contain rendered content (non-empty DOM).
**Validates: Requirements 1.3**

### Property 4: Theme Styles Applied Correctly
*For any* theme selection (light, dark, sepia), the rendition should have the corresponding background color and text color applied via CSS.
**Validates: Requirements 1.4, 4.1**

### Property 5: Error Message Displayed on Fetch Failure
*For any* failed file fetch, the system should display an error message and provide retry/return options instead of a blank screen.
**Validates: Requirements 1.5**

### Property 6: Cached Books Retrieved Without Network
*For any* book that exists in IndexedDB cache, the system should retrieve it from cache without making a network request.
**Validates: Requirements 2.1**

### Property 7: Cached Retrieval Completes Within 1 Second
*For any* cached book, the system should retrieve and render the content within 1 second.
**Validates: Requirements 2.2**

### Property 8: Uncached Books Are Cached After Fetch
*For any* book fetched from OSS, the system should automatically call `setBook()` to cache it for future access.
**Validates: Requirements 2.3**

### Property 9: LRU Eviction Removes Least Recently Accessed
*For any* cache at capacity, adding a new book should trigger LRU cleanup that removes the least recently accessed book.
**Validates: Requirements 2.4**

### Property 10: Position Tracking Updates on Location Change
*For any* location change event from the rendition, the system should update `currentCfi` and `progress` in the store.
**Validates: Requirements 3.1**

### Property 11: Position Saved With Debounce
*For any* sequence of position changes, the system should make exactly one API call to save progress after 2 seconds of inactivity.
**Validates: Requirements 3.2**

### Property 12: Saved Position Restored on Reload
*For any* book with a saved reading position, reloading the page should restore the rendition to that position.
**Validates: Requirements 3.3**

### Property 13: Initial Location Passed to Rendition Display
*For any* saved reading position, the system should call `rendition.display(initialLocation)` during initialization.
**Validates: Requirements 3.4**

### Property 14: Font Size Applied to Rendition
*For any* font size change, the system should update the rendition's CSS with the new font size value.
**Validates: Requirements 4.2**

### Property 15: Preferences Persisted and Reapplied
*For any* theme or font size preference change, the system should persist it and reapply it on subsequent page loads.
**Validates: Requirements 4.3, 4.4**

### Property 16: Errors Logged With Context
*For any* error during book loading, the system should log the error type, book ID, and file URL.
**Validates: Requirements 5.1**

### Property 17: Failure Point Identified in Logs
*For any* rendition initialization failure, the system should log which step failed (fetch, cache, init, or render).
**Validates: Requirements 5.2**

### Property 18: Debug Logs Capture All Steps
*For any* book load with debugging enabled, the system should log cache check, fetch, rendition creation, and display steps.
**Validates: Requirements 5.3**

### Property 19: Error UI Displayed on Render Failure
*For any* content rendering failure, the system should display an error message instead of a blank screen.
**Validates: Requirements 5.4**

## Error Handling

### File Loading Errors
- **Network Failure**: Log error, display retry button, fallback to cached version if available
- **Invalid EPUB**: Log error, display "Invalid file format" message
- **Cache Failure**: Log warning, continue with network fetch

### Rendition Initialization Errors
- **Missing Viewer Container**: Log error, display "Viewer not ready" message
- **Invalid Initial Location**: Log warning, display first chapter instead
- **Theme Application Failure**: Log warning, use default theme

### Progress Saving Errors
- **API Failure**: Log error, retry with exponential backoff
- **Database Error**: Log error, continue reading (progress not saved)

## Testing Strategy

### Unit Testing

Unit tests verify specific examples and edge cases:

1. **Cache Operations**
   - Test `getBook()` returns cached blob
   - Test `setBook()` stores blob correctly
   - Test `deleteBook()` removes book
   - Test LRU cleanup removes least recently accessed book

2. **Rendition Initialization**
   - Test `applyStyles()` sets correct CSS properties
   - Test `renderBubbles()` highlights correct CFI ranges
   - Test location change events update store

3. **Error Handling**
   - Test fetch failure displays error message
   - Test invalid EPUB shows error
   - Test missing container shows error

### Property-Based Testing

Property-based tests verify universal properties using fast-check library:

1. **File Loading Properties**
   - For any book ID, file loading completes within timeout
   - For any cached book, retrieval is faster than network fetch
   - For any theme, correct CSS is applied

2. **Position Tracking Properties**
   - For any location change, position is tracked correctly
   - For any saved position, reload restores that position
   - For any position change sequence, debounce makes exactly one API call

3. **Cache Management Properties**
   - For any cache at capacity, LRU removes least recently accessed
   - For any uncached book, it's cached after fetch
   - For any cache operation, IndexedDB state is consistent

**Testing Framework**: fast-check (property-based testing library)

**Minimum Iterations**: 100 per property test

**Test Annotation Format**: Each property test includes a comment referencing the correctness property:
```typescript
// **Feature: webread-content-loading, Property 1: File Loading Completes Within Timeout**
// **Validates: Requirements 1.1**
```

## Implementation Notes

### Critical Issues to Address

1. **Blank Content Display**: Verify that `rendition.display()` is called and completes successfully
2. **Styling Not Applied**: Ensure `applyStyles()` is called after rendition creation
3. **Cache Not Working**: Check IndexedDB initialization and blob storage
4. **Position Not Restored**: Verify `initialLocation` is passed correctly to `rendition.display()`
5. **Error Handling**: Add try-catch blocks and error UI for all failure points

### Performance Considerations

- Cache retrieval should be < 1 second
- File fetch should be < 3 seconds
- Rendition initialization should be < 500ms
- Position debounce should be 2 seconds to avoid excessive API calls

### Browser Compatibility

- IndexedDB support check: `window.indexedDB` exists
- EpubJS compatibility: Modern browsers (Chrome, Firefox, Safari, Edge)
- Fallback for IndexedDB: Use network fetch only

