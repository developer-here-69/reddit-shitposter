import React from 'react'
import {
  Play,
  Square,
  Sparkles,
  CheckCircle2,
  XCircle,
  Loader2,
  Gauge,
  Terminal,
} from 'lucide-react'
import { AgentStep, AgentState } from '../../../shared/types'

interface AgentControlBarProps {
  agentState: AgentState
  onStop: () => void
  onSpeedChange: (speed: number) => void
}

const DEFAULT_STEPS: { id: string; label: string }[] = [
  { id: 'step-nav', label: 'Opening submit page' },
  { id: 'step-tab', label: 'Selecting Text post' },
  { id: 'step-title', label: 'Typing title' },
  { id: 'step-body', label: 'Typing body' },
  { id: 'step-flair', label: 'Choosing flair' },
  { id: 'step-confirm', label: 'Waiting for confirm' },
  { id: 'step-submit', label: 'Submitting' },
  { id: 'step-verify', label: 'Verifying post URL' },
]

export const AgentControlBar: React.FC<AgentControlBarProps> = ({
  agentState,
  onStop,
  onSpeedChange,
}) => {
  const steps = DEFAULT_STEPS.map((def) => {
    const executed = agentState.steps.find((s) => s.id === def.id)
    return {
      id: def.id,
      label: def.label,
      status: executed ? executed.status : 'pending',
      message: executed?.message,
    }
  })

  return (
    <div className="bg-[#12161A] border border-[#22262B] rounded-xl p-3 flex flex-col gap-2.5 text-xs">
      {/* Top Controls Row */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-[#FF4500]" />
          <span className="font-bold text-white uppercase tracking-wider text-[11px]">
            Live Agent Execution Log
          </span>
          {agentState.isRunning && (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#FF4500]/20 text-[#FF4500] font-bold text-[10px] animate-pulse">
              <Sparkles className="w-3 h-3" />
              <span>Active</span>
            </span>
          )}
        </div>

        {/* Speed Slider & Stop Controls */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 bg-[#181C20] border border-[#2B2F35] rounded-lg px-2.5 py-1 text-xs">
            <Gauge className="w-3.5 h-3.5 text-[#82959B]" />
            <span className="text-[#82959B] text-[11px]">Speed:</span>
            <span className="font-bold text-white text-[11px] w-8 text-center">
              {agentState.speed}x
            </span>
            <input
              type="range"
              min="0.5"
              max="2.5"
              step="0.5"
              value={agentState.speed}
              onChange={(e) => onSpeedChange(parseFloat(e.target.value))}
              className="w-16 accent-[#FF4500] cursor-pointer"
            />
          </div>

          {agentState.isRunning && (
            <button
              onClick={onStop}
              className="flex items-center gap-1 px-3 py-1 bg-[#EF4444] hover:bg-[#DC2626] text-white font-bold rounded-lg shadow-sm transition-colors cursor-pointer text-xs"
            >
              <Square className="w-3 h-3 fill-white" />
              <span>Stop Agent</span>
            </button>
          )}
        </div>
      </div>

      {/* Step Flow Badges */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-1.5">
        {steps.map((s, index) => {
          let bgClass = 'bg-[#181C20] text-[#82959B] border-[#22262B]'
          let icon = <span className="text-[10px] opacity-60 font-mono">0{index + 1}</span>

          if (s.status === 'running') {
            bgClass = 'bg-[#FF4500]/20 text-white border-[#FF4500] shadow-[0_0_10px_rgba(255,69,0,0.3)]'
            icon = <Loader2 className="w-3 h-3 animate-spin text-[#FF4500]" />
          } else if (s.status === 'success') {
            bgClass = 'bg-[#10B981]/15 text-[#10B981] border-[#10B981]/40'
            icon = <CheckCircle2 className="w-3 h-3 text-[#10B981]" />
          } else if (s.status === 'failed') {
            bgClass = 'bg-[#EF4444]/20 text-[#EF4444] border-[#EF4444]/50'
            icon = <XCircle className="w-3 h-3 text-[#EF4444]" />
          }

          return (
            <div
              key={s.id}
              title={s.message || s.label}
              className={`flex items-center gap-1 px-2 py-1.5 rounded-lg border text-[11px] font-medium transition-all ${bgClass}`}
            >
              {icon}
              <span className="truncate">{s.label}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
