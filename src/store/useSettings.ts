import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { UserLevel } from '../types'

interface SettingsState {
  apiBase: string
  apiKey: string
  apiModel: string
  voiceName: string
  userLevel: UserLevel
  setApiBase: (v: string) => void
  setApiKey: (v: string) => void
  setApiModel: (v: string) => void
  setVoiceName: (v: string) => void
  setUserLevel: (v: UserLevel) => void
}

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      apiBase: '',
      apiKey: '',
      apiModel: '',
      voiceName: 'en-ZA-LeahNeural',
      userLevel: 'beginner',
      setApiBase: (v) => set({ apiBase: v }),
      setApiKey: (v) => set({ apiKey: v }),
      setApiModel: (v) => set({ apiModel: v }),
      setVoiceName: (v) => set({ voiceName: v }),
      setUserLevel: (v) => set({ userLevel: v })
    }),
    {
      name: 'speakmate-settings',
      storage: createJSONStorage(() => localStorage)
    }
  )
)
