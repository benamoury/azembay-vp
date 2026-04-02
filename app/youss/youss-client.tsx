'use client'

import { useState, useRef, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { PROSPECT_STATUT_LABELS, TEMPERATURE_COLORS, TEMPERATURE_LABELS } from '@/lib/utils'
import { Send, Bot, User, Flame, Loader2 } from 'lucide-react'
import { sendMessageToYouss } from '@/actions/youss'
import ReactMarkdown from 'react-markdown'

interface Message {
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

interface YoussClientProps {
  prospects: { id: string; nom: string; prenom: string; statut: string; temperature?: number }[]
  role: string
}

const SUGGESTIONS = [
  'Comment relancer un prospect qui n\'a pas donné suite après la visite ?',
  'Quels arguments pour convertir un investisseur pur en ce moment ?',
  'Mon prospect hésite entre la Villa E et l\'App 2CH, que lui dire ?',
  'Comment présenter le programme hôtelier à un acheteur résidence secondaire ?',
  'Quelles sont les prochaines dates Golden Hour disponibles ?',
]

export function YoussClient({ prospects, role }: YoussClientProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: `Bonjour ! Je suis **Youss**, votre assistant commercial Azembay.\n\nJe suis ici pour vous aider à faire avancer vos prospects, analyser les fiches clients, préparer vos arguments de vente, et identifier les prochaines actions à prendre.\n\nVous pouvez me parler d'un prospect spécifique en le sélectionnant à gauche, ou me poser une question générale sur le projet Azembay RIPT 1.`,
      timestamp: new Date(),
    }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [selectedProspectId, setSelectedProspectId] = useState<string>('none')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function handleSend(text?: string) {
    const messageText = text || input.trim()
    if (!messageText || loading) return

    const newMessage: Message = { role: 'user', content: messageText, timestamp: new Date() }
    setMessages(prev => [...prev, newMessage])
    setInput('')
    setLoading(true)

    const result = await sendMessageToYouss(
      messageText,
      selectedProspectId !== 'none' ? selectedProspectId : undefined
    )

    if (result.success && result.response) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: result.response!,
        timestamp: new Date(),
      }])
    } else {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `Désolé, une erreur s'est produite : ${result.error}`,
        timestamp: new Date(),
      }])
    }

    setLoading(false)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const selectedProspect = prospects.find(p => p.id === selectedProspectId)

  return (
    <div className="flex flex-col h-[calc(100vh-120px)]">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#1A3C6E] rounded-xl flex items-center justify-center">
            <Bot className="w-5 h-5 text-[#C8973A]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[#1A3C6E]">Youss</h1>
            <p className="text-xs text-gray-500">Assistant commercial Azembay — Confidentiel</p>
          </div>
        </div>

        {/* Sélecteur de prospect */}
        <div className="flex items-center gap-3">
          <Select value={selectedProspectId} onValueChange={setSelectedProspectId}>
            <SelectTrigger className="w-72 h-9 text-sm">
              <SelectValue placeholder="Contexte : aucun prospect" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">— Sans contexte prospect —</SelectItem>
              {prospects.map(p => (
                <SelectItem key={p.id} value={p.id}>
                  {p.prenom} {p.nom}
                  {' · '}{PROSPECT_STATUT_LABELS[p.statut as keyof typeof PROSPECT_STATUT_LABELS] || p.statut}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedProspect?.temperature && (
            <span className={cn('flex items-center gap-1 text-xs font-medium', TEMPERATURE_COLORS[selectedProspect.temperature])}>
              <Flame className="w-3.5 h-3.5" />
              {TEMPERATURE_LABELS[selectedProspect.temperature]}
            </span>
          )}
        </div>
      </div>

      {/* Context banner */}
      {selectedProspect && (
        <div className="bg-[#1A3C6E]/5 border border-[#1A3C6E]/10 rounded-lg px-4 py-2 mb-3 flex items-center justify-between">
          <p className="text-xs text-[#1A3C6E]">
            <span className="font-medium">Contexte actif :</span> {selectedProspect.prenom} {selectedProspect.nom}
            {' — '}{PROSPECT_STATUT_LABELS[selectedProspect.statut as keyof typeof PROSPECT_STATUT_LABELS] || selectedProspect.statut}
          </p>
          <button onClick={() => setSelectedProspectId('none')} className="text-xs text-gray-400 hover:text-gray-600">Effacer</button>
        </div>
      )}

      {/* Messages */}
      <Card className="flex-1 overflow-hidden">
        <CardContent className="h-full p-0 flex flex-col">
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((msg, i) => (
              <div key={i} className={cn('flex gap-3', msg.role === 'user' ? 'flex-row-reverse' : '')}>
                {/* Avatar */}
                <div className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0',
                  msg.role === 'assistant' ? 'bg-[#1A3C6E]' : 'bg-gray-200'
                )}>
                  {msg.role === 'assistant'
                    ? <Bot className="w-4 h-4 text-[#C8973A]" />
                    : <User className="w-4 h-4 text-gray-600" />
                  }
                </div>

                {/* Bubble */}
                <div className={cn(
                  'max-w-[75%] rounded-2xl px-4 py-3',
                  msg.role === 'assistant'
                    ? 'bg-white border border-gray-100 shadow-sm'
                    : 'bg-[#1A3C6E] text-white'
                )}>
                  {msg.role === 'assistant' ? (
                    <div className="prose prose-sm max-w-none text-gray-800">
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </div>
                  ) : (
                    <p className="text-sm leading-relaxed">{msg.content}</p>
                  )}
                  <p className={cn(
                    'text-[10px] mt-1.5',
                    msg.role === 'assistant' ? 'text-gray-400' : 'text-white/50'
                  )}>
                    {msg.timestamp.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-[#1A3C6E] flex items-center justify-center">
                  <Bot className="w-4 h-4 text-[#C8973A]" />
                </div>
                <div className="bg-white border border-gray-100 rounded-2xl px-4 py-3 shadow-sm flex items-center gap-2">
                  <Loader2 className="w-4 h-4 text-[#C8973A] animate-spin" />
                  <span className="text-sm text-gray-500">Youss réfléchit...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Suggestions */}
          {messages.length === 1 && (
            <div className="px-4 pb-3">
              <p className="text-xs text-gray-400 mb-2">Suggestions :</p>
              <div className="flex flex-wrap gap-2">
                {SUGGESTIONS.slice(0, 3).map((s, i) => (
                  <button
                    key={i}
                    onClick={() => handleSend(s)}
                    className="text-xs bg-gray-50 hover:bg-[#1A3C6E]/5 border border-gray-200 hover:border-[#1A3C6E]/20 rounded-full px-3 py-1.5 transition-colors text-gray-600 hover:text-[#1A3C6E]"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input */}
          <div className="border-t p-3 flex gap-2">
            <Textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Posez votre question à Youss... (Entrée pour envoyer, Shift+Entrée pour saut de ligne)"
              rows={2}
              className="resize-none text-sm flex-1"
              disabled={loading}
            />
            <Button
              onClick={() => handleSend()}
              disabled={!input.trim() || loading}
              className="h-full px-4"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
