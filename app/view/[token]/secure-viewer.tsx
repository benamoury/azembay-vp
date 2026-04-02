'use client'

import { useEffect, useRef, useState } from 'react'
import { Lock, Eye, Clock } from 'lucide-react'

interface SecureViewerProps {
  fileUrl: string | null
  documentNom: string
  prospectNom: string
  expiresAt: string
  consultations: number
}

export function SecureViewer({ fileUrl, documentNom, prospectNom, expiresAt, consultations }: SecureViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [currentTime, setCurrentTime] = useState('')

  useEffect(() => {
    const now = new Date()
    setCurrentTime(now.toLocaleDateString('fr-FR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    }))
  }, [])

  // Canvas watermark overlay
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !currentTime) return

    canvas.width = window.innerWidth
    canvas.height = window.innerHeight

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Draw diagonal watermark (repeated)
    ctx.save()
    ctx.translate(canvas.width / 2, canvas.height / 2)
    ctx.rotate(-Math.PI / 6) // -30 degrees

    const lines = [
      prospectNom.toUpperCase(),
      'CONFIDENTIEL',
      currentTime,
      'AZEMBAY — USAGE STRICTEMENT PERSONNEL',
    ]

    for (let y = -canvas.height * 1.5; y < canvas.height * 1.5; y += 120) {
      for (let x = -canvas.width * 1.5; x < canvas.width * 1.5; x += 400) {
        lines.forEach((line, i) => {
          if (line === 'CONFIDENTIEL') {
            ctx.fillStyle = 'rgba(180, 0, 0, 0.12)'
            ctx.font = 'bold 18px Inter, sans-serif'
          } else {
            ctx.fillStyle = 'rgba(26, 60, 110, 0.08)'
            ctx.font = '13px Inter, sans-serif'
          }
          ctx.fillText(line, x, y + i * 22)
        })
      }
    }
    ctx.restore()

    // Bottom fixed text
    ctx.fillStyle = 'rgba(26, 60, 110, 0.15)'
    ctx.font = '12px Inter, sans-serif'
    ctx.fillText(`${prospectNom} · ${currentTime} · CONFIDENTIEL`, 20, canvas.height - 20)
  }, [prospectNom, currentTime])

  // Block right-click, keyboard shortcuts, selection
  useEffect(() => {
    const blockContextMenu = (e: MouseEvent) => e.preventDefault()
    const blockKeyboard = (e: KeyboardEvent) => {
      if (
        e.key === 'PrintScreen' ||
        (e.ctrlKey && ['s', 'p', 'a', 'c', 'u'].includes(e.key.toLowerCase())) ||
        (e.metaKey && ['s', 'p', 'a', 'c', 'u'].includes(e.key.toLowerCase()))
      ) {
        e.preventDefault()
      }
    }
    document.addEventListener('contextmenu', blockContextMenu)
    document.addEventListener('keydown', blockKeyboard)
    return () => {
      document.removeEventListener('contextmenu', blockContextMenu)
      document.removeEventListener('keydown', blockKeyboard)
    }
  }, [])

  const expiryDate = new Date(expiresAt).toLocaleDateString('fr-FR', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })

  return (
    <div
      className="min-h-screen bg-[#0F1C2E] flex flex-col select-none"
      onContextMenu={e => e.preventDefault()}
    >
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-3 bg-[#1A3C6E] border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 bg-[#C8973A] rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">A</span>
          </div>
          <div>
            <p className="text-white font-semibold text-sm">AZEMBAY — Document confidentiel</p>
            <p className="text-white/50 text-xs">{documentNom}</p>
          </div>
        </div>
        <div className="flex items-center gap-4 text-white/60 text-xs">
          <div className="flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-[#C8973A]" />
            <span>Accès sécurisé — {prospectNom}</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            <span>Expire : {expiryDate}</span>
          </div>
          <div className="flex items-center gap-1">
            <Eye className="w-3 h-3" />
            <span>{consultations} consultation(s)</span>
          </div>
        </div>
      </div>

      {/* Viewer */}
      <div className="flex-1 relative overflow-hidden">
        {fileUrl ? (
          <>
            {/* PDF iframe */}
            <iframe
              ref={iframeRef}
              src={`${fileUrl}#toolbar=0&navpanes=0&scrollbar=1`}
              className="w-full h-full border-0"
              style={{
                height: 'calc(100vh - 60px)',
                pointerEvents: 'none', // Block interaction through iframe
              }}
              sandbox="allow-same-origin allow-scripts"
            />
            {/* Transparent interaction blocker */}
            <div
              className="absolute inset-0 z-10"
              style={{ background: 'transparent' }}
              onContextMenu={e => e.preventDefault()}
            />
            {/* Watermark canvas overlay */}
            <canvas
              ref={canvasRef}
              className="absolute inset-0 z-20 pointer-events-none"
              style={{ mixBlendMode: 'multiply' }}
            />
          </>
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-white/60">
              <Lock className="w-12 h-12 mx-auto mb-4 text-[#C8973A]" />
              <p className="text-lg font-semibold">Document sécurisé</p>
              <p className="text-sm mt-2">Ce document est en cours de chargement...</p>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-6 py-2 bg-[#1A3C6E] border-t border-white/10 flex items-center justify-between">
        <p className="text-white/40 text-xs">
          CONFIDENTIEL — Propriété exclusive d'Azembay — Reproduction interdite
        </p>
        <p className="text-white/40 text-xs">
          {prospectNom} · {currentTime}
        </p>
      </div>
    </div>
  )
}
