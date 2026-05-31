# iPhone 语音转文字 Bug 修复指南

## 问题描述

在 iPhone 上使用语音识别功能时,录音后无法正确转换为文字。用户按住录音按钮说话,松开后应该显示识别的文字,但实际上文字没有出现。

## 根本原因

1. **异步竞态条件**: 在 Whisper 模式下(iPhone 使用),`stop()` 函数返回 Promise,但 `ChatView.tsx` 中的 `handleStopRecording` 在 `await speech.stop()` 后立即调用 `speech.reset()`,导致 transcript 在异步转录完成前被清空。

2. **状态管理问题**: `recorder.onstop` 回调中,`finalResolveRef.current` 在转录完成前就被设置为 null,导致转录结果无法正确返回。

3. **重复调用保护缺失**: 没有防止 `stop()` 被重复调用的机制。

## 修复方案

### 文件: `src/hooks/useSpeechRecognition.ts`

#### 修改 1: 添加停止状态标志

在第 67 行后添加:
```typescript
const isStoppingRef = useRef(false)
```

#### 修改 2: 初始化停止标志

在 `startWhisper()` 函数中,第 171 行后添加:
```typescript
isStoppingRef.current = false
```

#### 修改 3: 修复 recorder.onstop 回调

替换第 207-217 行的代码:

**原代码:**
```typescript
if (blob.size < 200) {
  setIsRecording(false)
  finalResolveRef.current?.('')
  finalResolveRef.current = null
  return
}

setIsProcessing(true)
try {
  const text = await transcribeLocal(blob, (pct) => {
    setModelLoadingProgress(pct)
  })
  transcriptRef.current = text
  setTranscript(text)
  finalResolveRef.current?.(text)
} catch (e: any) {
  setError('识别失败: ' + (e?.message || 'unknown'))
  finalResolveRef.current?.('')
} finally {
  finalResolveRef.current = null
  setIsRecording(false)
  setIsProcessing(false)
}
```

**新代码:**
```typescript
if (blob.size < 200) {
  setIsRecording(false)
  setIsProcessing(false)
  const resolve = finalResolveRef.current
  finalResolveRef.current = null
  resolve?.('')
  return
}

setIsRecording(false)
setIsProcessing(true)

try {
  const text = await transcribeLocal(blob, (pct) => {
    setModelLoadingProgress(pct)
  })
  transcriptRef.current = text
  setTranscript(text)

  const resolve = finalResolveRef.current
  finalResolveRef.current = null
  resolve?.(text)
} catch (e: any) {
  setError('识别失败: ' + (e?.message || 'unknown'))
  const resolve = finalResolveRef.current
  finalResolveRef.current = null
  resolve?.('')
} finally {
  setIsProcessing(false)
}
```

**关键改进:**
- 在调用 resolve 前先保存引用,避免竞态条件
- 立即清空 `finalResolveRef.current`,防止重复调用
- 调整状态更新顺序,确保 UI 正确反映当前状态

#### 修改 4: 增强 stop() 函数

替换第 260-285 行的 `stop()` 函数:

**原代码:**
```typescript
function stop(): Promise<string> {
  return new Promise((resolve) => {
    finalResolveRef.current = resolve

    if (useWhisper) {
      if (recorderRef.current && recorderRef.current.state === 'recording') {
        try {
          recorderRef.current.stop()
        } catch {
          resolve(transcriptRef.current)
          finalResolveRef.current = null
        }
      } else {
        resolve(transcriptRef.current)
        finalResolveRef.current = null
      }
    } else {
      // ... Web Speech 部分类似
    }
  })
}
```

**新代码:**
```typescript
function stop(): Promise<string> {
  if (isStoppingRef.current) {
    return Promise.resolve(transcriptRef.current)
  }

  isStoppingRef.current = true

  return new Promise((resolve) => {
    finalResolveRef.current = (text: string) => {
      isStoppingRef.current = false
      resolve(text)
    }

    if (useWhisper) {
      if (recorderRef.current && recorderRef.current.state === 'recording') {
        try {
          recorderRef.current.stop()
        } catch (e) {
          console.error('Stop recorder error:', e)
          isStoppingRef.current = false
          resolve(transcriptRef.current)
          finalResolveRef.current = null
        }
      } else {
        isStoppingRef.current = false
        resolve(transcriptRef.current)
        finalResolveRef.current = null
      }
    } else {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop()
        } catch (e) {
          console.error('Stop recognition error:', e)
          isStoppingRef.current = false
          resolve(transcriptRef.current)
          finalResolveRef.current = null
        }
      } else {
        isStoppingRef.current = false
        resolve(transcriptRef.current)
        finalResolveRef.current = null
      }
    }
  })
}
```

**关键改进:**
- 添加重复调用保护
- 包装 resolve 回调以清理停止标志
- 添加错误日志便于调试
- 确保所有路径都正确清理状态

## 测试步骤

1. 在 iPhone 上打开应用(需要 HTTPS)
2. 进入对话场景
3. 按住录音按钮说话
4. 松开按钮
5. 等待 Whisper 模型加载和转录(首次使用)
6. 验证识别的文字正确显示在界面上
7. 验证文字被正确发送到 AI 并收到回复

## 技术细节

### 为什么 iPhone 使用 Whisper?

Safari 不支持 Web Speech API,因此代码检测到 iOS 设备时自动切换到本地 Whisper 模型(通过 @huggingface/transformers)。

### 异步流程

1. 用户松开按钮 → `stop()` 被调用
2. `recorder.stop()` 触发 → 异步等待
3. `recorder.onstop` 回调触发 → 开始转录
4. `transcribeLocal()` 异步执行 → 可能需要几秒
5. 转录完成 → 调用 `resolve(text)`
6. Promise 返回 → `handleStopRecording` 继续执行

修复确保在整个异步链中,状态和回调引用都被正确管理。

## 相关文件

- `src/hooks/useSpeechRecognition.ts` - 主要修复文件
- `src/components/chat/ChatView.tsx` - 使用语音识别的组件
- `src/services/localWhisper.ts` - Whisper 模型服务

## 注意事项

- 首次使用会下载 Whisper 模型(约 40MB),需要网络连接
- 模型加载进度会显示在界面上
- 录音时长太短(<0.2秒)会被忽略
- 需要用户授予麦克风权限
