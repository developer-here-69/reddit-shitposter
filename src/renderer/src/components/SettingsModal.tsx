import React, { useState, useEffect } from 'react'
import {
  X,
  Save,
  Key,
  Shield,
  Clock,
  CheckCircle2,
  Lock,
  Plus,
  Trash2,
} from 'lucide-react'
import { AppSettings } from '../../../shared/types'

interface SettingsModalProps {
  isOpen: boolean
  onClose: () => void
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null

  const [settings, setSettings] = useState<AppSettings | null>(null)
  const [apiKeyInput, setApiKeyInput] = useState('')
  const [maxPostsPerDay, setMaxPostsPerDay] = useState(3)
  const [minGapHours, setMinGapHours] = useState(2)
  const [schedulerEnabled, setSchedulerEnabled] = useState(false)
  const [timeSlots, setTimeSlots] = useState<string[]>(['09:00', '15:00', '21:00'])
  const [newSlot, setNewSlot] = useState('')
  const [savedSuccess, setSavedSuccess] = useState(false)

  useEffect(() => {
    window.api.getSettings().then((s: AppSettings) => {
      setSettings(s)
      setMaxPostsPerDay(s.maxPostsPerDay)
      setMinGapHours(s.minGapHours)
      setSchedulerEnabled(s.schedulerEnabled)
      setTimeSlots(s.timeSlots || ['09:00', '15:00', '21:00'])
    })
  }, [])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    const update: Partial<AppSettings> = {
      maxPostsPerDay,
      minGapHours,
      schedulerEnabled,
      timeSlots,
    }

    if (apiKeyInput.trim()) {
      update.geminiApiKey = apiKeyInput.trim()
    }

    await window.api.saveSettings(update)
    setSavedSuccess(true)
    setTimeout(() => {
      setSavedSuccess(false)
      onClose()
    }, 900)
  }

  const handleAddTimeSlot = () => {
    if (!newSlot.match(/^\d{2}:\d{2}$/)) return
    if (!timeSlots.includes(newSlot)) {
      setTimeSlots([...timeSlots, newSlot].sort())
      setNewSlot('')
    }
  }

  const handleRemoveSlot = (slot: string) => {
    setTimeSlots(timeSlots.filter((s) => s !== slot))
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-[#14171A] border border-[#272B2F] rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#22262B]">
          <div className="flex items-center gap-2 text-white font-bold text-base">
            <Lock className="w-4 h-4 text-[#FF4500]" />
            <span>Settings & Safety Configuration</span>
          </div>
          <button onClick={onClose} className="text-[#82959B] hover:text-white p-1 rounded-lg">
            <X className="w-4 h-4" />
          </button>
        </div>

        {savedSuccess && (
          <div className="p-3 rounded-xl bg-[#10B981]/15 border border-[#10B981]/40 text-[#10B981] text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>Settings and encrypted credentials saved securely!</span>
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-4 text-xs">
          {/* Gemini API Key with safeStorage */}
          <div className="bg-[#0E1113] p-3.5 rounded-xl border border-[#22262B] space-y-2">
            <div className="flex items-center justify-between">
              <label className="font-bold text-white flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5 text-[#FF4500]" />
                <span>Google Gemini API Key</span>
              </label>
              {settings?.hasStoredKey && (
                <span className="text-[10px] text-[#10B981] font-bold bg-[#10B981]/15 px-2 py-0.5 rounded-full border border-[#10B981]/30">
                  🔒 Encrypted (safeStorage)
                </span>
              )}
            </div>

            <input
              type="password"
              value={apiKeyInput}
              onChange={(e) => setApiKeyInput(e.target.value)}
              placeholder={settings?.hasStoredKey ? '•••••••••••••••••••••••• (Leave blank to keep current)' : 'Paste your AI Studio Gemini API key'}
              className="w-full px-3 py-2 rounded-lg bg-[#14171A] border border-[#272B2F] text-white focus:outline-none focus:border-[#FF4500]"
            />
            <p className="text-[11px] text-[#82959B] leading-relaxed">
              Your key is encrypted locally using Electron's native OS safeStorage (Windows DPAPI). It is never sent to any third party.
            </p>
          </div>

          {/* Safety Rules & Limits */}
          <div className="bg-[#0E1113] p-3.5 rounded-xl border border-[#22262B] space-y-3">
            <div className="flex items-center gap-1.5 font-bold text-white">
              <Shield className="w-3.5 h-3.5 text-[#38BDF8]" />
              <span>Safety Rules & Posting Limits</span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-bold text-[#82959B] block mb-1">
                  Max Posts / 24 Hours
                </label>
                <input
                  type="number"
                  min="1"
                  max="6"
                  value={maxPostsPerDay}
                  onChange={(e) => setMaxPostsPerDay(parseInt(e.target.value) || 3)}
                  className="w-full px-3 py-1.5 rounded-lg bg-[#14171A] border border-[#272B2F] text-white focus:outline-none focus:border-[#FF4500]"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-[#82959B] block mb-1">
                  Min Gap Between Posts (Hours)
                </label>
                <input
                  type="number"
                  min="1"
                  max="12"
                  step="0.5"
                  value={minGapHours}
                  onChange={(e) => setMinGapHours(parseFloat(e.target.value) || 2)}
                  className="w-full px-3 py-1.5 rounded-lg bg-[#14171A] border border-[#272B2F] text-white focus:outline-none focus:border-[#FF4500]"
                />
              </div>
            </div>

            <p className="text-[10px] text-[#82959B]">
              The app automatically enforces these limits and blocks posting when limits are reached or when disallowed terms are detected.
            </p>
          </div>

          {/* In-App Scheduler */}
          <div className="bg-[#0E1113] p-3.5 rounded-xl border border-[#22262B] space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 font-bold text-white">
                <Clock className="w-3.5 h-3.5 text-[#EAB308]" />
                <span>In-App Time Slot Scheduler</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={schedulerEnabled}
                  onChange={(e) => setSchedulerEnabled(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-8 h-4 bg-[#272B2F] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-[#10B981]"></div>
              </label>
            </div>

            {schedulerEnabled && (
              <div className="space-y-2 pt-1 border-t border-[#1C2025]">
                <div className="flex items-center gap-1.5 flex-wrap">
                  {timeSlots.map((slot) => (
                    <span
                      key={slot}
                      className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#1A1D20] text-white text-xs border border-[#272B2F]"
                    >
                      <span>{slot}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveSlot(slot)}
                        className="text-[#82959B] hover:text-[#EF4444] cursor-pointer"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="time"
                    value={newSlot}
                    onChange={(e) => setNewSlot(e.target.value)}
                    className="px-2.5 py-1 rounded-lg bg-[#14171A] border border-[#272B2F] text-white text-xs"
                  />
                  <button
                    type="button"
                    onClick={handleAddTimeSlot}
                    className="px-3 py-1 rounded-lg bg-[#252A30] hover:bg-[#323842] text-white font-bold text-xs flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add Slot</span>
                  </button>
                </div>

                <p className="text-[10px] text-[#82959B]">
                  At each slot, a desktop notification appears and prompts you to review & approve the next post. Works only while app is open.
                </p>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-2 border-t border-[#22262B]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-[#1A1D20] hover:bg-[#25292E] text-white font-semibold transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-[#FF4500] hover:bg-[#E03D00] text-white font-bold shadow-md transition-colors cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save Settings</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
