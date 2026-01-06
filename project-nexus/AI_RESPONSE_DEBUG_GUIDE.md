# AI Response Debugging Guide

## Changes Made

### 1. Added Comprehensive Logging
- **Client-side** (`SelectionAIPopup.tsx`): Logs every step of the AI request
- **Server-side** (`app/api/chat/route.ts`): Logs request receipt, provider selection, and response start

### 2. Removed OpenAI Support
- Only DeepSeek and Gemini are now supported
- Simplified configuration and reduced complexity

### 3. Fixed Gemini Model List
- Now uses actual available models: `gemini-2.5-flash`, `gemini-2.5-pro`, `gemini-3-pro-preview`
- Matches the models used in `/room`

### 4. Fixed Loading Message
- Changed from "AI 正在思考..." to "加载中..." 
- "思考中" is only for models with explicit thinking mode enabled

## How to Debug AI Response Issues

### Step 1: Check Browser Console
When you select text and click "问 AI", look for these logs:

```
[SelectionAI] Starting AI request...
[SelectionAI] Config: { provider: 'deepseek', model: 'deepseek-chat', enabled: true }
[SelectionAI] Sending request to /api/chat with body: { provider: 'deepseek', model: 'deepseek-chat', messageCount: 2 }
[SelectionAI] Response status: 200 OK
[SelectionAI] Starting to read stream...
[SelectionAI] Chunk 1: 45 bytes
[SelectionAI] Chunk 2: 32 bytes
...
[SelectionAI] Stream complete. Total chunks: 15 Total length: 450
[SelectionAI] Final response: 这是一个关于...
```

### Step 2: Check Server Logs
Look for these logs in your server output:

```
[Chat API] Request received: { provider: 'deepseek', model: 'deepseek-chat', messageCount: 2 }
[Chat API] Using DeepSeek/Custom provider
[Chat API] Starting streamText with model: deepseek-chat
[Chat API] Returning text stream response
```

### Step 3: Common Issues

#### Issue: "未配置 API Key"
- **Cause**: AI config not saved or API key is empty
- **Fix**: Go to book settings (gear icon) → "AI 助手" tab → Enter API key → Save

#### Issue: Response status 400
- **Cause**: No API key configured on server
- **Fix**: Check environment variables: `DEEPSEEK_API_KEY` or `GOOGLE_AI_STUDIO_API_KEY`

#### Issue: Stream starts but no chunks received
- **Cause**: API provider not responding or network issue
- **Fix**: Check browser network tab for `/api/chat` request details

#### Issue: Chunks received but response not displaying
- **Cause**: Response parsing or state update issue
- **Fix**: Check if `aiResponse` state is being updated (look for "Chunk" logs)

### Step 4: Test with Different Providers

#### DeepSeek
- Model: `deepseek-chat` (default) or `deepseek-reasoner`
- API Key: Get from https://platform.deepseek.com
- Expected: Fast response, good Chinese support

#### Gemini
- Model: `gemini-2.5-flash` (default), `gemini-2.5-pro`, or `gemini-3-pro-preview`
- API Key: Get from https://aistudio.google.com
- Expected: Slightly slower, excellent quality

## Chinese Response Support

Both providers support Chinese responses natively:
- **DeepSeek**: Native Chinese support, optimized for Chinese
- **Gemini**: Full multilingual support including Chinese

The system prompt explicitly requests Chinese responses:
```
你是一位博学的阅读助手。用户正在阅读《书名》，选中了一段文字想要了解更多。
请简洁地解释这段文字的含义、背景知识或相关概念。
```

## WebDAV CORS Errors (Expected)

The CORS errors you see are expected and harmless:
```
Access to fetch at 'http://47.121.31.221/webdav/...' has been blocked by CORS policy
```

These are silently handled - the system falls back to local IndexedDB storage. This is by design.

## Next Steps

1. Open browser DevTools (F12)
2. Go to Console tab
3. Select text in a book and click "问 AI"
4. Watch the logs appear in real-time
5. Share the logs if there are issues
