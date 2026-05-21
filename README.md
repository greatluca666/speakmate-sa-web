# SpeakMate SA Web

南非口音英语陪练 PWA。Windows 开发，部署 Vercel，妈妈用 iPhone Safari 打开。

## 特性

- 🎤 **纯语音对话** — Web Speech API（`en-ZA` locale）
- 🇿🇦 **南非口音** — Azure TTS `en-ZA-LeahNeural` / `LukeNeural`
- 📚 **12个场景** — 超市/餐厅/药房/银行/租房/社交等
- ❌→✅ **智能纠错** — AI 自然纠正 + 纠错卡片
- 📖 **句子本** — IndexedDB 持久化 + 间隔重复复习
- 🌏 **渐进中文辅助** — 入门/进阶/流利
- 📱 **PWA** — 添加到主屏后像原生 App

## 技术栈

| 层 | 技术 |
|---|---|
| 框架 | Vite + React 18 + TypeScript |
| 样式 | Tailwind CSS |
| 状态 | Zustand（持久化设置）|
| 本地存储 | Dexie (IndexedDB) |
| 语音识别 | Web Speech API（浏览器内置）|
| 语音合成 | **Edge TTS（免费，无需 API key）** via Vercel Serverless |
| 对话 AI | 自定义 OpenAI 兼容 API |
| PWA | vite-plugin-pwa |
| 部署 | Vercel |

## Windows 本地开发

```bash
cd C:\Users\Luca\speakmate-sa-web
npm install
npm run dev
```

打开 `http://localhost:5173`。Windows 浏览器测试用 Chrome。

**注意**：Web Speech API 必须 **HTTPS**（localhost 例外）。部署后必须 HTTPS。

## 部署到 Vercel

### 方法 A：GitHub（推荐）

1. 在 GitHub 建仓库 `speakmate-sa-web`
2. 推代码：
   ```bash
   cd C:\Users\Luca\speakmate-sa-web
   git init
   git add .
   git commit -m "init"
   git remote add origin https://github.com/<你>/speakmate-sa-web.git
   git push -u origin main
   ```
3. vercel.com 登录 → Import Project → 选这个仓库 → Deploy
4. 拿到 URL：`https://speakmate-sa-web-<xxx>.vercel.app`

### 方法 B：CLI

```bash
npm i -g vercel
vercel login
vercel
```

## 妈妈端 iPhone 配置

1. Safari 打开你的 Vercel URL
2. 底部分享按钮 □↑
3. "**添加到主屏幕**"
4. 主屏出现图标，点开全屏
6. "我的"标签填 API 配置：
   - API 地址（OpenAI 兼容）
   - API 密钥
   - 模型名（如 `gpt-4o-mini`）
   - 语音（Leah 女声 / Luke 男声 · Edge TTS 免费）
6. 选难度（入门/进阶/流利）
7. 回首页按住麦克风按钮说话

## 项目结构

```
speakmate-sa-web/
├── package.json
├── vite.config.ts          (PWA 配置)
├── tsconfig.json
├── tailwind.config.js
├── postcss.config.js
├── index.html
├── vercel.json             (SPA 路由)
├── public/                 ★ 加图标
└── src/
    ├── main.tsx
    ├── App.tsx             5-Tab
    ├── index.css
    ├── types/index.ts
    ├── db/database.ts      Dexie schema
    ├── store/useSettings.ts
    ├── data/scenarios.json
    ├── hooks/useSpeechRecognition.ts
    ├── services/
    │   ├── chatService.ts
    │   ├── ttsService.ts
    │   └── reviewScheduler.ts
    └── components/
        ├── home/HomeView.tsx
        ├── scenarios/ScenarioList.tsx
        ├── chat/
        │   ├── ChatView.tsx
        │   ├── MessageBubble.tsx
        │   ├── CorrectionCard.tsx
        │   └── RecordButton.tsx
        ├── sentence-book/SentenceBookView.tsx
        └── profile/SettingsView.tsx
```

## 待你补充

- **App 图标** — `public/icon-192.png`、`icon-512.png`、`favicon.svg`。用 realfavicongenerator.net 生成

## 浏览器兼容

| 浏览器 | 语音识别 | TTS | PWA |
|---|---|---|---|
| iOS Safari 14.5+ | ✅ | ✅ | ✅ |
| Chrome | ✅ | ✅ | ✅ |
| Firefox | ❌ | ✅ | ⚠️ |

妈妈用 Safari OK。

## 数据流

```
按住麦克风
    ↓
Web Speech API 识别（en-ZA）
    ↓
text → systemPrompt + history
    ↓
POST {apiBase}/v1/chat/completions
    ↓
JSON { reply, reply_zh, corrections[] }
    ↓
入库 Dexie：Message + Corrections + SentenceBookEntry
    ↓
Edge TTS Serverless (/api/tts) → mp3 blob → localStorage 缓存 → <audio> 播放
```

## 已知限制

- Safari 首次需授权麦克风
- 对话/TTS 需联网
- localStorage 上限 5MB → TTS 缓存 LRU 最多 200 条
- 单用户设计

## 等级

| 等级 | AI 风格 | 中文 |
|---|---|---|
| beginner | 短句常见词 | 始终显示 |
| intermediate | 复杂句习语 | 仅生词 |
| fluent | 南非俚语 | 无 |

## 间隔重复

1天 → 3天 → 7天 → 14天 → 5次掌握。

## 安全

- API 密钥存浏览器 localStorage，不上传服务器
- 静态部署，无后端
- 自定义 API 需配置 CORS 允许 Vercel 域名

## 许可

MIT
