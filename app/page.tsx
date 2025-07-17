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
  const [instructies, setInstructies] = useState("") // Opslag van instructies
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement | null>(null)
  const [copyStatus, setCopyStatus] = useState<{ [key: number]: boolean }>({})

  useEffect(() => {
    const saved = localStorage.getItem("chat_instructies")
    if (saved) setInstructies(saved)
  }, [])

  useEffect(() => {
    localStorage.setItem("chat_instructies", instructies)
  }, [instructies])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [chatHistory])

  // Functie om code te kopiëren en status te tonen
  const copyToClipboard = (content: string, index: number) => {
    navigator.clipboard.writeText(content).then(() => {
      setCopyStatus((prev) => ({ ...prev, [index]: true }))
      setTimeout(() => {
        setCopyStatus((prev) => ({ ...prev, [index]: false }))
      }, 2000)
    })
  }

  // Helper: check of content een codeblok bevat (bijv. begint met <html> of ``` enz)
  const isCodeBlock = (text: string) => {
    const trimmed = text.trim()
    return trimmed.startsWith("<") || trimmed.startsWith("```")
  }

  return (
    <div className="flex h-screen bg-zinc-900 text-white justify-center items-center p-4">
      <div className="w-full max-w-3xl flex flex-col gap-4">
        <h1 className="text-3xl font-extrabold mb-4">Chat met OpenAI</h1>

        {/* Instructies invoerveld */}
        <textarea
          value={instructies}
          onChange={(e) => setInstructies(e.target.value)}
          className="w-full bg-zinc-800 p-3 rounded text-white resize-none placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-green-500"
          placeholder="Voeg hier je instructies toe (optioneel)"
          rows={4}
        />

        {/* Chatvenster */}
        <div className="flex-1 overflow-auto mt-2 max-h-[90vh] bg-zinc-800 p-4 rounded shadow-inner">
          <div className="flex flex-col gap-4">
            {chatHistory.map((msg, idx) => (
              <div
                key={idx}
                className={`p-3 rounded-lg max-w-[90%] ${
                  msg.role === "user"
                    ? "self-end bg-green-100 text-black"
                    : "self-start bg-gray-100 text-black"
                }`}
              >
                {/* Als bericht een codeblok is, render speciaal met kopieerknop */}
                {msg.loading ? (
                  <div className="text-xs italic text-zinc-500 mt-1 animate-pulse">
                    AI is aan het typen...
                  </div>
                ) : isCodeBlock(msg.content) && msg.role === "assistant" ? (
                  <div className="relative border border-gray-700 rounded p-2 bg-black text-white max-h-72 overflow-auto">
                    <button
                      onClick={() => copyToClipboard(msg.content, idx)}
                      className="sticky top-0 bg-zinc-900 bg-opacity-90 text-sm px-3 py-1 rounded mb-2 hover:bg-green-600 transition"
                      style={{ zIndex: 10 }}
                    >
                      {copyStatus[idx] ? "Gekopieerd!" : "Kopieer"}
                    </button>
                    <pre className="whitespace-pre-wrap">{msg.content}</pre>
                  </div>
                ) : (
                  <div className="whitespace-pre-line">{msg.content}</div>
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
        </div>
      </div>
    </div>
  )

  async function handleSubmit() {
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
}
