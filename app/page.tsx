"use client"

import { useState, useEffect, useRef } from "react"

interface ChatMessage {
  role: "user" | "assistant"
  content: string
  loading?: boolean
}

export default function ChatInterface() {
  const API_BASE = "https://gpt-backend-qkjf.onrender.com" // Pas aan naar jouw backend URL

  const [prompt, setPrompt] = useState("")
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([])
  const [instructies, setInstructies] = useState("")
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement | null>(null)
  const copyBtnRef = useRef<HTMLButtonElement | null>(null)

  // Laad instructies uit localStorage bij mount
  useEffect(() => {
    const saved = localStorage.getItem("chat_instructies")
    if (saved) setInstructies(saved)
  }, [])

  // Sla instructies op in localStorage bij wijzigen
  useEffect(() => {
    localStorage.setItem("chat_instructies", instructies)
  }, [instructies])

  // Scroll naar beneden bij nieuwe chatberichten
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
    // Scroll copy button mee naar beneden (als die zichtbaar is)
    copyBtnRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" })
  }, [chatHistory])

  // Functie om code te kopiëren naar clipboard
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  // Detecteer codeblokken in AI content (markdown ```...```)
  const renderMessageContent = (content: string) => {
    const codeBlockRegex = /```([\s\S]*?)```/g
    const parts = []
    let lastIndex = 0
    let match: RegExpExecArray | null

    while ((match = codeBlockRegex.exec(content)) !== null) {
      // Tekst voor codeblok
      if (match.index > lastIndex) {
        parts.push({ type: "text", content: content.slice(lastIndex, match.index) })
      }
      // Codeblok
      parts.push({ type: "code", content: match[1] })
      lastIndex = match.index + match[0].length
    }
    // Tekst na laatste codeblok
    if (lastIndex < content.length) {
      parts.push({ type: "text", content: content.slice(lastIndex) })
    }

    return parts.map((part, i) => {
      if (part.type === "code") {
        return (
          <div key={i} className="relative my-2">
            <pre className="bg-zinc-900 p-3 rounded text-sm overflow-x-auto whitespace-pre-wrap font-mono">
              {part.content}
            </pre>
            <button
              ref={i === parts.length - 1 ? copyBtnRef : null}
              onClick={() => copyToClipboard(part.content)}
              className="absolute top-1 right-1 bg-green-600 text-white px-2 py-1 text-xs rounded hover:bg-green-700"
              title="Kopieer code"
            >
              Kopieer
            </button>
          </div>
        )
      }
      return (
        <p key={i} className="whitespace-pre-wrap mb-2">
          {part.content}
        </p>
      )
    })
  }

  const handleSubmit = async () => {
    if (prompt.trim() === "") return

    const userMsg: ChatMessage = { role: "user", content: prompt }
    const loadingMsg: ChatMessage = { role: "assistant", content: "...", loading: true }

    setChatHistory((prev) => [...prev, userMsg, loadingMsg])
    setPrompt("")

    try {
      setLoading(true)

      const messagesForApi = [
        { role: "system", content: instructies || "Je bent een behulpzame assistent." },
        ...chatHistory.map((m) => ({ role: m.role, content: m.content })),
        { role: "user", content: prompt },
      ]

      const res = await fetch(`${API_BASE}/prompt`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: "",
          chat_history: messagesForApi,
        }),
      })

      if (!res.ok) {
        const text = await res.text()
        throw new Error(`Backend fout: ${res.status} ${res.statusText} — ${text}`)
      }

      const data = await res.json()

      const aiMsg: ChatMessage = {
        role: "assistant",
        content: data.message || "Ik heb je prompt ontvangen.",
        loading: false,
      }

      setChatHistory((prev) => [...prev.slice(0, -1), aiMsg])
    } catch (e: any) {
      alert(e.message)
      setChatHistory((prev) => prev.filter((msg) => !msg.loading))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex h-screen bg-zinc-900 text-white justify-center items-center p-4">
      <div className="w-full max-w-3xl flex flex-col h-full gap-4">
        <h1 className="text-3xl font-extrabold mb-4">Chat met OpenAI</h1>

        {/* Instructies */}
        <textarea
          value={instructies}
          onChange={(e) => setInstructies(e.target.value)}
          className="w-full bg-zinc-800 p-3 rounded text-white resize-none placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-green-500"
          placeholder="Voeg hier je instructies toe (optioneel)"
          rows={4}
        />

        {/* Chatvenster */}
        <div className="flex-1 overflow-auto mt-2 bg-zinc-800 p-4 rounded shadow-inner">
          <div className="flex flex-col gap-2">
            {chatHistory.map((msg, idx) => (
              <div
                key={idx}
                className={`p-3 rounded-lg max-w-[90%] ${
                  msg.role === "user"
                    ? "self-end bg-green-100 text-black"
                    : "self-start bg-gray-100 text-black"
                }`}
              >
                {msg.loading ? (
                  <div className="text-xs italic text-zinc-500 mt-1 animate-pulse">AI is aan het typen...</div>
                ) : (
                  renderMessageContent(msg.content)
                )}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Prompt invoer */}
        <div className="mt-4 flex items-center gap-2">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault()
                handleSubmit()
              }
            }}
            className="flex-grow bg-zinc-800 p-3 rounded text-white resize-none placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-green-500"
            placeholder="Typ hier je vraag..."
            rows={3}
          />
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="bg-green-600 hover:bg-green-500 px-4 py-2 text-sm rounded-full font-medium disabled:opacity-50"
          >
            Genereer antwoord
          </button>
        </div>
      </div>
    </div>
  )
}
