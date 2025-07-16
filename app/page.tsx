"use client"

import { useState, useEffect, useRef } from "react"

// ChatMessage interface
interface ChatMessage {
  role: "user" | "assistant"
  content: string
  loading?: boolean
}

export default function ChatInterface() {
  const API_BASE = "https://gpt-backend-qkjf.onrender.com" // Pas aan naar jouw API endpoint

  const [prompt, setPrompt] = useState("")
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([])
  const [instructies, setInstructies] = useState("")  // Opslag van instructies
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement | null>(null)

  // Laad instructies uit localStorage bij mount
  useEffect(() => {
    const saved = localStorage.getItem("chat_instructies")
    if (saved) setInstructies(saved)
  }, [])

  // Sla instructies op in localStorage bij wijzigen
  useEffect(() => {
    localStorage.setItem("chat_instructies", instructies)
  }, [instructies])

  useEffect(() => {
    scrollToBottom()
  }, [chatHistory])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  const handleSubmit = async () => {
    if (prompt.trim() === "") return

    const userMsg: ChatMessage = { role: "user", content: prompt }
    const loadingMsg: ChatMessage = { role: "assistant", content: "...", loading: true }

    setChatHistory((prev) => [...prev, userMsg, loadingMsg])
    setPrompt("")

    try {
      setLoading(true)

      // Maak array van messages in OpenAI format: eerst systeembericht met instructies, dan chatgeschiedenis, dan user prompt
      const messagesForApi = [
        { role: "system", content: instructies || "Je bent een behulpzame assistent." },
        ...chatHistory.map((m) => ({ role: m.role, content: m.content })),
        { role: "user", content: prompt },
      ]

      const res = await fetch(`${API_BASE}/prompt`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: "",           // leeg, want we sturen alles in chat_history
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
        content: data.instructions?.message || "Ik heb je prompt ontvangen.",
        loading: false,
      }

      // Update chatgeschiedenis, vervang de ... loading message door AI antwoord
      setChatHistory((prev) => [...prev.slice(0, -1), aiMsg])
    } catch (e: any) {
      alert(e.message)
      // Verwijder loading message als er een fout was
      setChatHistory((prev) => prev.filter((msg) => !msg.loading))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex h-screen bg-zinc-900 text-white">
      <aside className="w-1/3 p-6 flex flex-col gap-4 border-r border-zinc-800">
        <h1 className="text-3xl font-extrabold mb-4">Chat met OpenAI</h1>

        {/* Instructies invoerveld */}
        <textarea
          value={instructies}
          onChange={(e) => setInstructies(e.target.value)}
          className="flex-grow bg-zinc-800 p-3 rounded text-white resize-none placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-green-500"
          placeholder="Voeg hier je instructies toe (optioneel)"
          rows={5}
        />

        {/* Chatvenster */}
        <div className="flex-1 overflow-auto mt-4">
          <div className="flex flex-col gap-2">
            {chatHistory.map((msg, idx) => (
              <div
                key={idx}
                className={`p-3 rounded-lg max-w-[95%] ${
                  msg.role === "user"
                    ? "self-end bg-green-100 text-black"
                    : "self-start bg-gray-100 text-black"
                }`}
              >
                <div className="whitespace-pre-line">{msg.content}</div>
                {msg.loading && (
                  <div className="text-xs italic text-zinc-500 mt-1 animate-pulse">
                    AI is aan het typen...
                  </div>
                )}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Prompt invoer */}
        <div className="mt-4 flex items-center gap-2 relative">
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
      </aside>
    </div>
  )
}
