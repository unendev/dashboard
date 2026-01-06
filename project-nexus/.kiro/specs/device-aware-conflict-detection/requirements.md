# Requirements Document

## Introduction

The current conflict detection system triggers false positives when a user leaves the same browser tab and returns later, even though they're still on the same device. The system should only alert about conflicts when data is modified on a **different device**, not when the same device/browser tab is temporarily inactive. This ensures a better user experience while still protecting against genuine cross-device conflicts.

## Glossary

- **Device ID**: A unique identifier for the current device/browser combination, persisted in localStorage
- **Conflict Detection**: The mechanism that identifies when task data has been modified elsewhere
- **Same Device**: The current browser/device has the same Device ID as when the task was last modified
- **Different Device**: The current browser/device has a different Device ID than when the task was last modified
- **Version Number**: An incrementing counter stored in the database that tracks how many times a task has been modified

## Requirements

### Requirement 1

**User Story:** As a user, I want to work on the same device without being interrupted by false conflict warnings, so that I can have a seamless experience when switching between browser tabs or returning to the app after a break.

#### Acceptance Criteria

1. WHEN a user modifies a task on Device A THEN the system SHALL store Device A's identifier with the task's version
2. WHEN the same user returns to the same Device A and attempts to modify the task THEN the system SHALL allow the modification without showing a conflict warning
3. WHEN a user modifies a task on Device A and then attempts to modify it on Device B THEN the system SHALL detect the conflict and show a warning
4. WHEN a conflict is detected on a different device THEN the system SHALL force refresh the page to load the latest data from the server
5. WHEN a user is on the same device but the task was modified by another browser tab THEN the system SHALL allow the modification and update the device ID to the current tab's identifier

### Requirement 2

**User Story:** As a developer, I want the conflict detection to be reliable and maintainable, so that the system correctly handles all device scenarios.

#### Acceptance Criteria

1. WHEN a task is created THEN the system SHALL initialize the device ID field with the current device's identifier
2. WHEN a task is updated THEN the system SHALL include the current device ID in the update request
3. WHEN comparing devices for conflict detection THEN the system SHALL use the device ID stored in the database, not the version number alone
4. WHEN a device ID is missing or invalid THEN the system SHALL treat it as a potential conflict and show a warning

