# Implementation Plan

- [x] 1. Create shared Design Token system



  - [x] 1.1 Create `lib/markdown/tokens/design-tokens.ts` with DesignTokens interface and gocTokens, darkTokens, lightTokens implementations


    - Define ThemeVariant type and DesignTokens interface
    - Implement token objects for each variant (goc as primary)
    - Implement getTokens(variant) function with fallback
    - _Requirements: 1.1, 1.2_
  - [ ]* 1.2 Write property test for Design Token completeness
    - **Property 1: Design Token Completeness**
    - **Validates: Requirements 1.1**

- [x] 2. Create unified Markdown Renderer



  - [x] 2.1 Create `lib/markdown/renderer/components.ts` with ReactMarkdown custom components for each theme


    - Define component factories that accept DesignTokens
    - Create styled components for p, h1-h3, ul, ol, li, code, pre, blockquote, a
    - _Requirements: 2.2_
  - [x] 2.2 Create `lib/markdown/renderer/MarkdownRenderer.tsx` component


    - Accept content, variant, className props
    - Use getTokens to get theme tokens
    - Apply custom components from components.ts
    - Default to 'goc' variant
    - _Requirements: 2.1, 2.2, 2.3_
  - [ ]* 2.3 Write property test for Renderer stability
    - **Property 3: Renderer Accepts Valid Input**
    - **Validates: Requirements 2.1**

- [x] 3. Create shared Outline Extractor


  - [x] 3.1 Create `lib/markdown/outline/extractor.ts` with heading extraction functions


    - Implement slugify(text) function for ID generation
    - Implement extractHeadingsFromMarkdown(content) for raw MD text
    - Implement extractHeadingsFromEditor(editor) for TipTap documents
    - Return HeadingItem[] with id, level, text, pos
    - _Requirements: 3.1, 3.2_
  - [ ]* 3.2 Write property test for Markdown heading extraction
    - **Property 4: Markdown Heading Extraction Correctness**
    - **Validates: Requirements 3.1**
  - [ ]* 3.3 Write property test for TipTap heading extraction
    - **Property 5: TipTap Heading Extraction Correctness**
    - **Validates: Requirements 3.2**
  - [x] 3.4 Create `lib/markdown/outline/OutlinePanel.tsx` component



    - Accept headings, activeId, onHeadingClick, variant props
    - Render hierarchical list with indentation based on level
    - Apply theme styles from Design Tokens
    - _Requirements: 3.3_
  - [ ]* 3.5 Write property test for Outline indentation
    - **Property 6: Outline Indentation by Level**
    - **Validates: Requirements 3.3**

- [ ] 4. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Create modular Editor Factory


  - [x] 5.1 Create `lib/markdown/editor/editor-styles.ts` with ProseMirror CSS generation


    - Define getEditorStyles(variant) function
    - Generate CSS string using Design Tokens
    - Include styles for headings, lists, code, blockquote, etc.
    - _Requirements: 4.4_
  - [x] 5.2 Refactor `lib/markdown/editor/editor-factory.ts` from existing editor-config.ts


    - Move and enhance createBaseExtensions to createEditorExtensions
    - Accept EditorConfig with all extension flags
    - Return Extension[] array
    - _Requirements: 4.1, 4.2, 4.3_
  - [ ]* 5.3 Write property test for Extension factory returns array
    - **Property 7: Extension Factory Returns Array**
    - **Validates: Requirements 4.1, 4.2**
  - [ ]* 5.4 Write property test for Extension exclusion by config
    - **Property 8: Extension Exclusion by Config**
    - **Validates: Requirements 4.3**

- [x] 6. Create module index and exports



  - [x] 6.1 Create `lib/markdown/index.ts` with unified exports


    - Export all public APIs: getTokens, MarkdownRenderer, extractHeadingsFromMarkdown, extractHeadingsFromEditor, OutlinePanel, createEditorExtensions, getEditorStyles
    - Export types: ThemeVariant, DesignTokens, HeadingItem, EditorConfig
    - _Requirements: 1.1, 2.1, 3.1, 4.1_

- [ ] 7. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Refactor SimpleMdEditor




  - [x] 8.1 Extract pure editor component from SimpleMdEditor
    - Create `app/components/features/notes/NoteEditor.tsx` as pure TipTap editor
    - Use createEditorExtensions from lib/markdown
    - Use getEditorStyles for styling
    - Accept content, onChange, config props
    - _Requirements: 5.2, 5.4_
  - [x] 8.2 Extract outline to use shared OutlinePanel
    - Replace inline outline logic with extractHeadingsFromEditor
    - Use OutlinePanel component for display
    - _Requirements: 5.3_
  - [x] 8.3 Refactor SimpleMdEditor to compose NoteEditor and note management
    - Keep note CRUD, caching, grouping logic in SimpleMdEditor
    - Use NoteEditor for editing






    - Remove inline CSS styles (use getEditorStyles)
    - _Requirements: 5.1, 5.2_



- [x] 9. Migrate existing Markdown components


  - [x] 9.1 Update MarkdownView to use MarkdownRenderer internally
    - Keep existing API (content, className, variant)
    - Delegate to MarkdownRenderer
    - Map existing variants to new ThemeVariant
    - _Requirements: 6.1_
  - [x] 9.2 Update MarkdownWithTOC to use shared Outline Extractor
    - Replace inline heading extraction with extractHeadingsFromMarkdown
    - Keep existing FloatingTOC or migrate to OutlinePanel
    - _Requirements: 6.2_
  - [x] 9.3 Update MarkdownOutline to use shared extractor
    - Replace inline parsing with extractHeadingsFromMarkdown
    - Simplify component to focus on display
    - _Requirements: 6.2_

- [ ] 10. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 11. Clean up and consolidate
  - [x] 11.1 Update imports across codebase to use lib/markdown
    - Update ChatClient.tsx to use MarkdownRenderer (kept original - has special InteractiveChildren logic)
    - Update ScrollableLayout.tsx to use MarkdownRenderer
    - Update NotesList.tsx to use MarkdownRenderer (kept original - has special InteractiveHighlighter logic)
    - Update PostDetailModal.tsx to use MarkdownRenderer
    - Update TwitterStyleCard.tsx to use MarkdownRenderer
    - Remove unused imports from LinuxDoModal.tsx
    - _Requirements: 6.3_
  - [x] 11.2 Remove deprecated code
    - Remove old inline ReactMarkdown component definitions
    - Remove duplicate style definitions (SimpleMdEditor now uses getEditorStyles)
    - Keep backward-compatible wrappers if needed
    - _Requirements: 6.3_

- [ ] 12. Final Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

