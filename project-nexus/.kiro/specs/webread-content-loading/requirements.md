# Requirements Document: WebRead Content Loading Fix

## Introduction

The WebRead page is a feature for reading EPUB books in the browser. Currently, when users open a book, the content (正文/body text) does not display properly. The page loads but remains blank or shows only the UI chrome without the actual book content. This spec addresses the root causes and establishes requirements for a fully functional book reading experience.

## Glossary

- **EPUB**: Electronic Publication format for digital books
- **EpubJS**: JavaScript library for rendering EPUB files in browsers
- **Rendition**: EpubJS term for the rendered view of a book
- **CFI**: EPUB Canonical Fragment Identifier, used to mark positions in a book
- **IndexedDB**: Browser API for client-side storage of large files
- **OSS**: Object Storage Service (cloud storage for EPUB files)
- **Book Metadata**: Database record containing title, author, file URL, and reading progress
- **Content Container**: The DOM element where EpubJS renders the book content

## Requirements

### Requirement 1

**User Story:** As a reader, I want to open a book and immediately see the book content displayed, so that I can start reading without delays or blank screens.

#### Acceptance Criteria

1. WHEN a user navigates to a book's read page THEN the system SHALL fetch the book file from either local cache or OSS within 3 seconds
2. WHEN the book file is fetched THEN the system SHALL initialize the EpubJS rendition and render the first chapter or saved reading position
3. WHEN the rendition is initialized THEN the system SHALL display the book content in the viewer container with proper styling applied
4. WHEN the book content is displayed THEN the system SHALL show text with correct font, font size, line height, and background color based on the selected theme
5. IF the book file fails to load from OSS THEN the system SHALL display a user-friendly error message and provide options to retry or return to the library

### Requirement 2

**User Story:** As a reader, I want the book content to load from my local cache when available, so that I can read offline and reduce bandwidth usage.

#### Acceptance Criteria

1. WHEN a user opens a cached book THEN the system SHALL retrieve the EPUB file from IndexedDB instead of fetching from OSS
2. WHEN the cached file is retrieved THEN the system SHALL render the content within 1 second
3. WHEN a book is not cached THEN the system SHALL fetch it from OSS and automatically cache it for future offline access
4. WHEN the cache is full THEN the system SHALL remove the least recently accessed books using LRU strategy to make space for new books

### Requirement 3

**User Story:** As a reader, I want the book to remember my reading position, so that I can resume reading from where I left off.

#### Acceptance Criteria

1. WHEN a user scrolls or navigates through the book THEN the system SHALL track the current reading position (CFI) and progress percentage
2. WHEN the reading position changes THEN the system SHALL save the position to the database with a 2-second debounce to avoid excessive writes
3. WHEN a user returns to a previously read book THEN the system SHALL restore the reading position from the database and display that location
4. WHEN the initial location is restored THEN the system SHALL display the content at that position without requiring manual navigation

### Requirement 4

**User Story:** As a reader, I want to customize my reading experience, so that I can adjust the text appearance to my preferences.

#### Acceptance Criteria

1. WHEN a user selects a theme (light, dark, sepia) THEN the system SHALL apply the corresponding background color and text color to the rendered content
2. WHEN a user adjusts the font size THEN the system SHALL update the rendered content with the new font size immediately
3. WHEN theme or font size settings are changed THEN the system SHALL persist these preferences and apply them to all future reading sessions
4. WHEN the rendition is displayed THEN the system SHALL apply the stored theme and font size preferences automatically

### Requirement 5

**User Story:** As a developer, I want the content loading process to be robust and provide clear debugging information, so that I can diagnose and fix issues quickly.

#### Acceptance Criteria

1. WHEN the book loading process encounters an error THEN the system SHALL log detailed error messages including the error type, book ID, and file URL
2. WHEN the rendition fails to initialize THEN the system SHALL log the specific failure point (fetch, cache, initialization, or rendering)
3. WHEN debugging is enabled THEN the system SHALL log the state of each step: cache check, file fetch, rendition creation, and content display
4. WHEN content fails to render THEN the system SHALL provide a fallback mechanism or clear error UI instead of showing a blank screen

