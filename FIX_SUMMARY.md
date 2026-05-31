# iPhone 语音转文字 Bug 修复总结

## 修复完成时间
2026-05-31

## 问题描述
在 iPhone 上使用 speakmate-sa-web 应用时,用户按住录音按钮说话后松开,语音无法正确转换为文字显示。

## 根本原因分析

### 1. 异步竞态条件
在 iPhone 上,应用使用本地 Whisper 模型进行语音识别(因为 Safari 不支持 Web Speech API)。当用户松开录音按钮时:
- `ChatView.tsx` 调用 `await speech.stop()` 等待转录结果
- 但紧接着调用 `speech.reset()` 清空 transcript
- 由于 Whisper 转录是异步的,`reset()` 可能在转录完成前执行,导致结果丢失

### 2. 状态管理问题
在 `recorder.onstop` 回调中:
- `finalResolveRef.current` 在转录完成前就被设置为 null
- 导致即使转录成功,结果也无法通过 Promise 返回

### 3. 缺少重复调用保护
没有机制防止 `stop()` 函数被重复调用,可能导致状态混乱。

## 修复内容

### 文件: `src/hooks/useSpeechRecognition.ts`

#### 1. 添加停止状态标志 (第 66 行)
```typescript
const isStoppingRef = useRef(false)
```
用于防止 `stop()` 被重复调用。

#### 2. 初始化停止标志 (第 165 行)
```typescript
isStoppingRef.current = false
```
在每次开始新录音时重置标志。

#### 3. 修复 recorder.onstop 回调 (第 201-229 行)
**关键改进:**
- 在调用 `resolve` 前先保存 `finalResolveRef.current` 的引用
- 立即将 `finalResolveRef.current` 设置为 null,防止重复调用
- 调整状态更新顺序:先设置 `isRecording = false`,再设置 `isProcessing = true`
- 在 finally 块中只更新 `isProcessing`,不再重复更新 `isRecording`

**修复前的问题:**
```typescript
finalResolveRef.current?.(text)  // 可能在这之前 ref 已经被清空
// ... 
finally {
  finalResolveRef.current = null  // 在这里才清空,太晚了
  setIsRecording(false)
  setIsProcessing(false)
}
```

**修复后:**
```typescript
const resolve = finalResolveRef.current  // 先保存引用
finalResolveRef.current = null           // 立即清空,防止重复调用
resolve?.(text)                          // 使用保存的引用调用
// ...
finally {
  setIsProcessing(false)  // 只更新处理状态
}
```

#### 4. 增强 stop() 函数 (第 251-293 行)
**关键改进:**
- 添加重复调用检查:如果已经在停止中,直接返回当前 transcript
- 包装 resolve 回调,在调用时自动清理 `isStoppingRef`
- 添加详细的错误日志,便于调试
- 确保所有代码路径都正确清理状态

**修复前:**
```typescript
function stop(): Promise<string> {
  return new Promise((resolve) => {
    finalResolveRef.current = resolve  // 直接赋值
    // ...
  })
}
```

**修复后:**
```typescript
function stop(): Promise<string> {
  if (isStoppingRef.current) {
    return Promise.resolve(transcriptRef.current)  // 防止重复调用
  }
  
  isStoppingRef.current = true
  
  return new Promise((resolve) => {
    finalResolveRef.current = (text: string) => {
      isStoppingRef.current = false  // 自动清理
      resolve(text)
    }
    // ...
  })
}
```

## 技术细节

### 为什么 iPhone 使用 Whisper?
Safari 浏览器不支持 Web Speech API,因此代码检测到 iOS 设备时自动切换到使用 Hugging Face Transformers 的本地 Whisper 模型 (`Xenova/whisper-tiny.en`)。

### 异步流程
1. 用户松开按钮 → `stop()` 被调用
2. `recorder.stop()` 触发 → 异步等待
3. `recorder.onstop` 回调触发 → 开始转录
4. `transcribeLocal()` 异步执行 → 可能需要几秒(首次需下载模型)
5. 转录完成 → 调用 `resolve(text)`
6. Promise 返回 → `handleStopRecording` 继续执行

修复确保在整个异步链中,状态和回调引用都被正确管理,不会因为竞态条件而丢失结果。

## 测试建议

1. **基本功能测试**
   - 在 iPhone Safari 上打开应用
   - 进入对话场景
   - 按住录音按钮说话(至少 1 秒)
   - 松开按钮
   - 验证识别的文字正确显示

2. **首次使用测试**
   - 清除浏览器缓存
   - 首次录音时验证模型下载进度显示
   - 验证模型加载完成后转录正常工作

3. **边界情况测试**
   - 录音时长很短(<0.2秒)
   - 快速连续录音多次
   - 录音过程中网络中断
   - 拒绝麦克风权限

4. **状态一致性测试**
   - 验证录音时按钮显示为红色
   - 验证转录时显示"正在识别..."
   - 验证完成后按钮恢复蓝色

## 相关文件

- `src/hooks/useSpeechRecognition.ts` - 主要修复文件
- `src/components/chat/ChatView.tsx` - 使用语音识别的组件
- `src/services/localWhisper.ts` - Whisper 模型服务
- `IPHONE_FIX_GUIDE.md` - 详细的修复指南

## 提交信息

- Commit: 9c9aeed
- Branch: main
- 已推送到: https://github.com/greatluca666/speakmate-sa-web

## 注意事项

1. **模型下载**: 首次使用会下载约 40MB 的 Whisper 模型,需要稳定的网络连接
2. **HTTPS 要求**: 麦克风访问需要 HTTPS 或 localhost
3. **浏览器兼容性**: 仅在 Safari (iOS) 和支持 MediaRecorder 的现代浏览器上工作
4. **性能**: Whisper 模型在设备上运行,较老的 iPhone 可能转录较慢

## 后续优化建议

1. **性能优化**
   - 考虑使用更小的 Whisper 模型(如 tiny 版本)
   - 添加模型预加载机制,在用户进入对话前就开始下载

2. **用户体验**
   - 添加首次使用引导,说明需要下载模型
   - 显示更详细的转录进度(不仅是模型加载)
   - 添加转录失败后的重试机制

3. **错误处理**
   - 添加网络错误的友好提示
   - 模型加载失败时提供降级方案
   - 记录详细的错误日志用于问题排查

4. **测试覆盖**
   - 添加单元测试覆盖异步状态管理
   - 添加集成测试模拟真实录音场景
   - 添加 E2E 测试在真实设备上验证
