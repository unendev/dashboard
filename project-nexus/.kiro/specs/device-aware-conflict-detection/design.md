# Design Document: Device-Aware Conflict Detection

## Overview

The current conflict detection system uses only version numbers to detect conflicts, which causes false positives when the same user works on the same device but in different browser tabs or after a temporary absence. This design introduces device identification to distinguish between genuine cross-device conflicts and same-device scenarios.

The solution tracks which device last modified a task and only triggers conflict warnings when modifications come from a different device. This preserves data integrity while eliminating false conflict alerts.

## Architecture

### Components

1. **Device ID Manager** - Generates and persists a unique device identifier
2. **Conflict Detection Service** - Compares device IDs to determine if conflict is real
3. **API Layer** - Includes device ID in all update requests
4. **Database Schema** - Stores device ID alongside version number
5. **UI Handler** - Shows appropriate warnings based on device comparison

### Data Flow

```
User Action (Update Task)
    ↓
Get Current Device ID from localStorage
    ↓
Include Device ID in API Request
    ↓
Backend: Compare Device ID with stored Device ID
    ↓
Same Device? → Allow update, increment version
Different Device? → Check version, return 409 if conflict
    ↓
Frontend: Handle response
    ↓
Same Device conflict? → Silent update
Different Device conflict? → Show warning + force refresh
```

## Components and Interfaces

### Device ID Manager

```typescript
interface DeviceIdManager {
  // Get or create device ID
  getDeviceId(): string;
  
  // Clear device ID (for logout/reset)
  clearDeviceId(): void;
}
```

**Implementation Details:**
- Generate UUID v4 on first access
- Store in localStorage with key `app_device_id`
- Persist across browser sessions
- Return same ID on subsequent calls

### Conflict Detection Service

```typescript
interface ConflictDetectionService {
  // Determine if conflict is from different device
  isDifferentDeviceConflict(
    storedDeviceId: string | null,
    currentDeviceId: string
  ): boolean;
}
```

**Logic:**
- If stored device ID is null/missing → treat as potential conflict (warn user)
- If stored device ID === current device ID → same device (no warning)
- If stored device ID !== current device ID → different device (show warning)

### API Request/Response

**Update Request (PUT /api/timer-tasks):**
```typescript
{
  id: string;
  version: number;
  deviceId: string;  // NEW: Current device identifier
  // ... other updates
}
```

**Conflict Response (409):**
```typescript
{
  error: 'CONFLICT';
  message: string;
  isDifferentDevice: boolean;  // NEW: Indicates if from different device
  taskName?: string;
}
```

### Database Schema Changes

Add to `TimerTask` model in Prisma:
```prisma
model TimerTask {
  // ... existing fields
  lastModifiedDeviceId String?  // Device ID that last modified this task
  version              Int      // Existing version field
}
```

## Data Models

### Device Conflict Info

```typescript
interface DeviceConflictInfo {
  isDifferentDevice: boolean;
  currentDeviceId: string;
  storedDeviceId: string | null;
  taskName: string;
}
```

### Update Request with Device Info

```typescript
interface UpdateTaskWithDeviceRequest {
  id: string;
  version: number;
  deviceId: string;
  updates: Partial<TimerTask>;
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Same Device Allows Update

*For any* task on the same device, when the stored device ID matches the current device ID, the update should succeed without triggering a conflict warning, regardless of version number changes from other browser tabs.

**Validates: Requirements 1.2, 1.5**

### Property 2: Different Device Triggers Conflict

*For any* task where the stored device ID differs from the current device ID, when attempting an update, the system should return a 409 conflict response with `isDifferentDevice: true`.

**Validates: Requirements 1.3**

### Property 3: Device ID Persists Across Sessions

*For any* device, when the app is closed and reopened, the device ID should remain the same, allowing the system to recognize it as the same device.

**Validates: Requirements 2.1**

### Property 4: Device ID Updated on Modification

*For any* task update from a device, the `lastModifiedDeviceId` field should be updated to the current device's ID.

**Validates: Requirements 2.2**

### Property 5: Missing Device ID Treated as Conflict

*For any* task with a null or missing `lastModifiedDeviceId`, when attempting an update from any device, the system should treat it as a potential conflict and return appropriate warning.

**Validates: Requirements 2.4**

## Error Handling

### Conflict Scenarios

1. **Same Device, Version Mismatch**
   - Cause: Another tab on same device modified the task
   - Action: Allow update, update device ID, increment version
   - User Feedback: Silent (no alert)

2. **Different Device, Version Mismatch**
   - Cause: Another device modified the task
   - Action: Return 409 with `isDifferentDevice: true`
   - User Feedback: Show alert + force refresh

3. **Missing Device ID**
   - Cause: Old task created before device tracking was implemented
   - Action: Return 409 with warning
   - User Feedback: Show alert, suggest refresh

4. **Invalid Device ID Format**
   - Cause: Corrupted localStorage or browser issue
   - Action: Generate new device ID, treat as different device
   - User Feedback: Show alert + force refresh

## Testing Strategy

### Unit Tests

- Device ID generation and persistence
- Device ID comparison logic
- Conflict detection decision logic
- Device ID update on task modification

### Property-Based Tests

1. **Property 1: Same Device Allows Update**
   - Generate random tasks with matching device IDs
   - Attempt updates from same device
   - Verify no 409 response

2. **Property 2: Different Device Triggers Conflict**
   - Generate random tasks with different device IDs
   - Attempt updates from different device
   - Verify 409 response with `isDifferentDevice: true`

3. **Property 3: Device ID Persists**
   - Generate device ID
   - Simulate app close/reopen
   - Verify same ID returned

4. **Property 4: Device ID Updated**
   - Create task on Device A
   - Update task from Device B
   - Verify `lastModifiedDeviceId` is Device B

5. **Property 5: Missing Device ID Treated as Conflict**
   - Create task with null `lastModifiedDeviceId`
   - Attempt update from any device
   - Verify conflict response

**Testing Framework:** Use fast-check for property-based testing with minimum 100 iterations per property.

