# Nexus GOC: Gemini Image Generation Support

## Objective
Enable the GOC (Game Operations Center) to generate images using the Google Gemini "Nano Banana" (`gemini-2.5-flash-image`) model.

## Implementation Details

### 1. New Helper: `lib/oss-server.ts`
- Provides `uploadBufferToOss` using `ali-oss`.
- Takes a buffer and uploads it to Aliyun OSS.
- Returns the public URL (CDN if configured).

### 2. Provider Update: `lib/ai-provider.ts`
- Exported `getGoogleProvider` to allow direct access to the configured Google provider instance (preserving proxy settings).

### 3. API Route Update: `app/api/chat/goc/route.ts`
- Added `generateImage` tool to the toolset.
- **Tool Logic**:
    - Input: `prompt` string.
    - Model: Uses `gemini-2.5-flash` via `generateText` which supports multimodal output.
    - Processing: Extracts the generated image file from the response.
    - Storage: Uploads the image to OSS via `lib/oss-server.ts`.
    - Output: Returns a Markdown image string (`![Image](url)`).

## Usage
- In the GOC Chat, simply ask: "Generate an image of a cyberpunk city" or "Draw a picture of a nano banana".
- The AI will invoke `generateImage` and the resulting image will be displayed in the chat.
