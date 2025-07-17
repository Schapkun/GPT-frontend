"use client"

import { useState, useEffect, useRef, ChangeEvent } from "react"

interface ChatMessage {
  role: "user" | "assistant"
  content: string
  loading?: boolean
}

export default function ChatInterface() {
  const API_BASE = "https://gpt-backend-qkjf.onrender.com" // Pas aan naar jouw backend URL

  const [prompt, setPrompt] = useState("")
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([])
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement | null>(null)
  const promptRef = useRef<HTMLTextAreaElement>(null)

  // Vier aparte inputvelden ter vervanging van instructies
  const [inputFields, setInputFields] = useState({
    title1: "",
    title2: "",
    title3: "",
    title4: "",
  })

  // Scroll automatisch naar onder bij nieuwe berichten
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [chatHistory])

  // Beheer tekstarea grootte max 10 regels
  const handlePromptChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    const textarea = e.target
    const maxRows = 10
    textarea.rows = 1 // reset rows om scrollHeight goed te meten
    const currentRows = Math.floor(textarea.scrollHeight / 24) // 24px is approx line height
    if (currentRows > maxRows) {
      textarea.rows = maxRows
      textarea.style.overflowY = "auto"
    } else {
      textarea.rows = currentRows
      textarea.style.overflowY = "hidden"
    }
    setPrompt(textarea.value)
  }

  // Handle verandering in rechter inputvelden
  const handleFieldChange = (e: ChangeEvent<HTMLInputElement>) => {
    setInputFields(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleSubmit = async () => {
    if (prompt.trim() === "") return

    const userMsg: ChatMessage = { role: "user", content: prompt }
    const loadingMsg: ChatMessage = { role: "assistant", content: "...", loading: true }

    setChatHistory(prev => [...prev, userMsg, loadingMsg])
    setPrompt("")
    if (promptRef.current) {
      promptRef.current.rows = 1
      promptRef.current.style.overflowY = "hidden"
    }

    try {
      setLoading(true)

      // Combineer de inputvelden als system message content (JSON-string of simpel tekst)
      const systemContent = `
Title 1: ${inputFields.title1}
Title 2: ${inputFields.title2}
Title 3: ${inputFields.title3}
Title 4: ${inputFields.title4}
`

      const messagesForApi = [
        { role: "system", content: systemContent.trim() },
        ...chatHistory.map(m => ({ role: m.role, content: m.content })),
        { role: "user", content: prompt }
      ]

      const res = await fetch(`${API_BASE}/prompt`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: "",  // leeg want alles in chat_history
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

      setChatHistory(prev => [...prev.slice(0, -1), aiMsg])
    } catch (e: any) {
      alert(e.message)
      setChatHistory(prev => prev.filter(msg => !msg.loading))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex h-screen bg-zinc-900 text-white p-6 gap-6">
      {/* Chat history links */}
      <section className="flex-1 flex flex-col rounded-3xl bg-zinc-800 shadow-lg overflow-hidden">
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {chatHistory.length === 0 && (
            <p className="text-zinc-400 select-none">Start een gesprek...</p>
          )}
          {chatHistory.map((msg, i) => (
            <div
              key={i}
              className={`max-w-[80%] px-4 py-3 rounded-xl whitespace-pre-wrap ${
                msg.role === "user"
                  ? "self-end bg-green-500 text-white rounded-br-sm"
                  : "self-start bg-zinc-700 text-white rounded-bl-sm"
              }`}
            >
              {msg.content}
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Input prompt onderaan */}
        <div className="border-t border-zinc-700 p-4 bg-zinc-900">
          <textarea
            ref={promptRef}
            rows={1}
            maxLength={2000}
            value={prompt}
            onChange={handlePromptChange}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault()
                if (!loading) handleSubmit()
              }
            }}
            placeholder="Typ hier je vraag..."
            className="w-full resize-none rounded-xl bg-zinc-700 p-3 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-green-500"
          />
          <button
            onClick={() => !loading && handleSubmit()}
            disabled={loading}
            className="mt-3 w-full rounded-xl bg-green-600 py-3 font-semibold hover:bg-green-500 disabled:opacity-50"
          >
            {loading ? "Even geduld..." : "Genereer antwoord"}
          </button>
        </div>
      </section>

      {/* Sidebar met 4 inputvelden */}
      <aside className="w-80 flex flex-col gap-4 bg-zinc-800 rounded-3xl p-6 shadow-lg">
        <h2 className="text-xl font-semibold mb-2">Extra Invoer Velden</h2>
        {["title1", "title2", "title3", "title4"].map((field) => (
          <div key={field} className="flex flex-col">
            <label htmlFor={field} className="mb-1 text-zinc-300 capitalize">
              {field.replace("title", "Titel ")}
            </label>
            <input
              id={field}
              name={field}
              type="text"
              className="rounded-md p-2 text-black"
              value={inputFields[field as keyof typeof inputFields]}
              onChange={handleFieldChange}
            />
          </div>
        ))}
      </aside>
    </div>
  )
}
