# Implementation Plan - Treasure Pavilion Enhancements

## Overview

This document outlines the implementation tasks for the Treasure Pavilion enhancements feature. The tasks are organized to build incrementally, with core functionality implemented first, followed by testing and refinement.

## Task List

- [x] 1. Set up project structure and create base components





  - Create new component files and hook files
  - Set up TypeScript interfaces and types
  - Create API route structure
  - _Requirements: 1.1, 2.1_

- [x] 1.1 Create ImageLightbox component


  - Implement fullscreen lightbox modal with fixed positioning
  - Add image viewer with proper sizing and centering
  - Implement close button and Escape key handling
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [x] 1.2 Write property test for lightbox visibility


  - **Feature: treasure-pavilion-enhancements, Property 1: Lightbox Modal Visibility**
  - **Validates: Requirements 1.1**

- [x] 1.3 Add navigation controls to lightbox


  - Implement previous/next buttons for multiple images
  - Add image counter display
  - Handle keyboard arrow key navigation
  - _Requirements: 1.5_

- [x] 1.4 Write property test for navigation controls


  - **Feature: treasure-pavilion-enhancements, Property 5: Navigation Controls Presence**
  - **Validates: Requirements 1.5**

- [x] 1.5 Integrate lightbox into ImageGalleryCard


  - Update ImageGalleryCard to use new ImageLightbox component
  - Remove old lightbox implementation
  - Test image click to open lightbox
  - _Requirements: 1.1_

- [x] 1.6 Write property tests for image sizing and mobile layout


  - **Feature: treasure-pavilion-enhancements, Property 2: Image Centering and Sizing**
  - **Validates: Requirements 1.2**
  - **Feature: treasure-pavilion-enhancements, Property 6: Mobile Responsive Layout**
  - **Validates: Requirements 1.6**

- [ ] 2. Implement AI Chat Sidebar
  - Create AIChatSidebar component
  - Create useAiChatSession hook
  - Implement chat message display and input
  - _Requirements: 2.1, 2.2_

- [ ] 2.1 Create AIChatSidebar component
  - Build chat message display area
  - Implement text input field
  - Add loading states and error handling
  - Style for desktop and mobile layouts
  - _Requirements: 2.2, 2.8_

- [ ] 2.2 Write property test for sidebar activation
  - **Feature: treasure-pavilion-enhancements, Property 7: Sidebar Activation**
  - **Validates: Requirements 2.1, 2.2, 2.3**

- [ ] 2.3 Create useAiChatSession hook
  - Manage chat state (messages, loading, error)
  - Implement sendMessage function
  - Handle API communication
  - _Requirements: 2.4_

- [ ] 2.4 Write property test for chat message handling
  - **Feature: treasure-pavilion-enhancements, Property 8: Chat Message Handling**
  - **Validates: Requirements 2.4**

- [ ] 2.5 Create /api/treasures/ai-chat endpoint
  - Accept chat request with conversation history
  - Call DeepSeek API with multi-turn conversation
  - Return AI response with tag suggestions
  - Handle errors gracefully
  - _Requirements: 2.3, 2.4, 2.7_

- [ ] 2.6 Write property test for context awareness
  - **Feature: treasure-pavilion-enhancements, Property 9: Context Awareness**
  - **Validates: Requirements 2.3, 2.4**

- [ ] 3. Integrate AI Chat into CreateLogFormWithCards
  - Add "Enable AI Assistance" button to form
  - Conditionally render AIChatSidebar
  - Pass form data to sidebar
  - _Requirements: 2.1, 2.2_

- [ ] 3.1 Add "Enable AI Assistance" button
  - Create button in CreateLogFormWithCards
  - Handle button click to show/hide sidebar
  - Style button appropriately
  - _Requirements: 2.1_

- [ ] 3.2 Integrate AIChatSidebar into form
  - Render sidebar when AI assistance is enabled
  - Pass treasure title, content, and selected tags to sidebar
  - Handle sidebar close
  - _Requirements: 2.2_

- [ ] 3.3 Write property test for sidebar rendering
  - **Feature: treasure-pavilion-enhancements, Property 7: Sidebar Activation**
  - **Validates: Requirements 2.1, 2.2, 2.3**

- [ ] 4. Implement Entity Tag Generation
  - Integrate AI entity tag generation into treasure creation
  - Call /api/treasures/ai-tag endpoint during creation
  - Combine entity tags with user-selected tags
  - _Requirements: 2.6_

- [ ] 4.1 Update treasure creation API
  - Modify /api/treasures route to call AI entity tag generation
  - Combine AI-generated tags with user-selected tags
  - Handle tag deduplication
  - _Requirements: 2.6_

- [ ] 4.2 Write property test for entity tag generation
  - **Feature: treasure-pavilion-enhancements, Property 11: Entity Tag Generation**
  - **Validates: Requirements 2.6**

- [ ] 4.3 Add error handling for tag generation
  - Handle API failures gracefully
  - Allow treasure creation to proceed without entity tags
  - Log errors for debugging
  - _Requirements: 2.7_

- [ ] 4.4 Write property test for error handling
  - **Feature: treasure-pavilion-enhancements, Property 10: Error Handling**
  - **Validates: Requirements 2.7**

- [ ] 5. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 6. Mobile Optimization and Responsive Design
  - Test lightbox on mobile devices
  - Test AI sidebar on mobile devices
  - Optimize layouts for smaller screens
  - _Requirements: 1.6, 2.8_

- [ ] 6.1 Optimize lightbox for mobile
  - Test image display on mobile viewport
  - Adjust touch targets for navigation buttons
  - Handle landscape orientation
  - _Requirements: 1.6_

- [ ] 6.2 Optimize AI sidebar for mobile
  - Test sidebar layout on mobile viewport
  - Implement collapsible or below-form layout
  - Adjust chat input for mobile keyboards
  - _Requirements: 2.8_

- [ ] 6.3 Write property test for mobile adaptation
  - **Feature: treasure-pavilion-enhancements, Property 12: Mobile Adaptation**
  - **Validates: Requirements 2.8**

- [ ] 7. Integration Testing
  - Test complete user flows
  - Test image viewing with lightbox
  - Test AI chat sidebar with treasure creation
  - _Requirements: All_

- [ ] 7.1 Write E2E test for image viewing flow
  - Create treasure with images
  - Click image to open lightbox
  - Navigate through images
  - Close lightbox
  - _Requirements: 1.1, 1.4, 1.5_

- [ ] 7.2 Write E2E test for AI chat flow
  - Open creation form
  - Enable AI assistance
  - Send message to AI
  - Verify AI response
  - Create treasure with tags
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.6_

- [ ] 8. Final Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 9. Documentation and Code Review
  - Add code comments explaining tag system
  - Document AI chat API endpoint
  - Document component interfaces
  - _Requirements: All_

- [ ] 9.1 Add code comments for tag system
  - Comment on tag categories (#实体/, #领域/, #概念/)
  - Explain legacy tag handling
  - Document tag combination logic
  - _Requirements: All_

- [ ] 9.2 Document AI chat endpoint
  - Add JSDoc comments to /api/treasures/ai-chat
  - Document request/response formats
  - Document error handling
  - _Requirements: 2.3, 2.4_

