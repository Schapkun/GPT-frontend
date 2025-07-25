"use client"

import { useState, useEffect, useRef, ChangeEvent } from "react"
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter"
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism"

interface ChatMessage {
  role: "user" | "assistant"
  content: string
  loading?: boolean
}

interface InputFields {
  title1: string
  instr1: string
  title2: string
  instr2: string
  title3: string
  instr3: string
  title4: string
  instr4: string
}

export default function ChatInterface() {
  const API_BASE = "https://gpt-backend-qkjf.onrender.com"

  const [prompt, setPrompt] = useState("")
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([])
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement | null>(null)
  const promptRef = useRef<HTMLTextAreaElement>(null)

  const [inputFields, setInputFields] = useState<InputFields>({
    title1: "", instr1: "",
    title2: "", instr2: "",
    title3: "", instr3: "",
    title4: "", instr4: "",
  })

  useEffect(() => {
    const savedChat = localStorage.getItem("chatHistory")
    if (savedChat) setChatHistory(JSON.parse(savedChat))

    const savedInputs = localStorage.getItem("inputFields")
    if (savedInputs) setInputFields(JSON.parse(savedInputs))
  }, [])

  useEffect(() => {
    localStorage.setItem("chatHistory", JSON.stringify(chatHistory))
  }, [chatHistory])

  useEffect(() => {
    localStorage.setItem("inputFields", JSON.stringify(inputFields))
  }, [inputFields])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [chatHistory])

  const handlePromptChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    const textarea = e.target
    const minRows = 4
    const maxRows = 10
    textarea.rows = minRows
    const currentRows = Math.floor(textarea.scrollHeight / 24)
    if (currentRows > maxRows) {
      textarea.rows = maxRows
      textarea.style.overflowY = "auto"
    } else if (currentRows >= minRows) {
      textarea.rows = currentRows
      textarea.style.overflowY = "hidden"
    } else {
      textarea.rows = minRows
      textarea.style.overflowY = "hidden"
    }
    setPrompt(textarea.value)
  }

  const handleFieldChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setInputFields(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const parseCodeBlocks = (text: string) => {
    const regex = /```(\w+)?\n([\s\S]*?)```/g
    const elements = []
    let lastIndex = 0
    let match

    while ((match = regex.exec(text)) !== null) {
      const before = text.substring(lastIndex, match.index)
      if (before.trim() !== "") {
        elements.push(
          <p key={`text-${lastIndex}`} className="whitespace-pre-wrap break-words">{before.trim()}</p>
        )
      }

      const lang = match[1] || "text"
      const code = match[2]

      elements.push(
        <CodeBlock key={`code-${match.index}`} code={code} language={lang} />
      )

      lastIndex = regex.lastIndex
    }

    const rest = text.substring(lastIndex)
    if (rest.trim() !== "") {
      elements.push(
        <p key={`text-end`} className="whitespace-pre-wrap break-words">{rest.trim()}</p>
      )
    }

    return elements
  }

  const CodeBlock = ({ code, language }: { code: string; language: string }) => {
    const containerRef = useRef<HTMLDivElement>(null)

    const copyToClipboard = () => {
      navigator.clipboard.writeText(code)
    }

    useEffect(() => {
      const el = containerRef.current
      if (!el) return
      const button = el.querySelector("button")
      if (!button) return

      const onScroll = () => {
        const scrollTop = el.scrollTop
        if (scrollTop > 0) {
          button.classList.add("sticky-btn")
        } else {
          button.classList.remove("sticky-btn")
        }
      }
      el.addEventListener("scroll", onScroll)
      return () => el.removeEventListener("scroll", onScroll)
    }, [])

    return (
      <div
        ref={containerRef}
        className="relative max-h-72 overflow-auto rounded-md bg-gray-900 p-4 my-2"
        style={{ fontSize: 14, fontFamily: "Source Code Pro, monospace" }}
      >
        <button
          onClick={copyToClipboard}
          className="absolute right-2 top-2 bg-gray-700 hover:bg-gray-600 text-white text-xs py-1 px-3 rounded z-10 transition-all duration-150"
          style={{ userSelect: "none" }}
        >
          Kopiëren
        </button>
        <SyntaxHighlighter
          language={language}
          style={oneDark}
          wrapLongLines
          customStyle={{ margin: 0, backgroundColor: "transparent" }}
        >
          {code}
        </SyntaxHighlighter>
      </div>
    )
  }

  // User message met kopieerknop op hover
  const UserMessage = ({ content }: { content: string }) => {
    const [hover, setHover] = useState(false)
    const copyToClipboard = () => {
      navigator.clipboard.writeText(content)
    }

    return (
      <div
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        className="relative max-w-full px-4 py-3 rounded-xl whitespace-pre-wrap break-words self-end bg-[#303030] text-white rounded-br-sm"
        style={{ textAlign: "left" }}
      >
        {content}
        {hover && (
          <button
            onClick={copyToClipboard}
            title="Kopieer prompt"
            className="absolute bottom-1 right-1 w-7 h-7 border-2 border-white rounded-sm flex justify-center items-center text-white hover:bg-white hover:text-black transition"
            aria-label="Kopieer prompt"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              viewBox="0 0 24 24"
              className="w-4 h-4"
            >
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
              <rect x="4" y="4" width="13" height="13" rx="2" ry="2" />
            </svg>
          </button>
        )}
      </div>
    )
  }

  const [lastUserPrompt, setLastUserPrompt] = useState<string | null>(null)

  const handleSubmit = async () => {
    if (prompt.trim() === "") return

    setLastUserPrompt(prompt)

    const userMsg: ChatMessage = { role: "user", content: prompt }
    const loadingMsg: ChatMessage = { role: "assistant", content: "...", loading: true }

    setChatHistory(prev => [...prev, userMsg, loadingMsg])
    setPrompt("")
    if (promptRef.current) {
      promptRef.current.rows = 4
      promptRef.current.style.overflowY = "hidden"
    }

    try {
      setLoading(true)

      const systemContent = `
${inputFields.title1}:
${inputFields.instr1}

${inputFields.title2}:
${inputFields.instr2}

${inputFields.title3}:
${inputFields.instr3}

${inputFields.title4}:
${inputFields.instr4}
      `

      const messagesForApi = [
        { role: "system", content: systemContent.trim() },
        ...chatHistory.filter(m => !m.loading).map(m => ({ role: m.role, content: m.content })),
        { role: "user", content: prompt }
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

      setChatHistory(prev => [...prev.slice(0, -1), aiMsg])
    } catch (e: any) {
      alert(e.message)
      setChatHistory(prev => prev.filter(msg => !msg.loading))
    } finally {
      setLoading(false)
    }
  }

  const clearChatHistory = () => {
    if (confirm("Weet je zeker dat je de hele chatgeschiedenis wilt verwijderen?")) {
      setChatHistory([])
      localStorage.removeItem("chatHistory")
    }
  }

  const clearInputField = (num: number) => {
    if (confirm(`Weet je zeker dat je titel en instructies ${num} wilt verwijderen?`)) {
      setInputFields(prev => ({
        ...prev,
        [`title${num}`]: "",
        [`instr${num}`]: ""
      }))
      localStorage.setItem("inputFields", JSON.stringify({
        ...inputFields,
        [`title${num}`]: "",
        [`instr${num}`]: ""
      }))
    }
  }

  const copyPrompt = () => {
    if (lastUserPrompt) {
      navigator.clipboard.writeText(lastUserPrompt)
    }
  }

  return (
    <div className="flex h-screen bg-[#101010] text-white p-6 gap-6">
      <section className="flex-1 flex flex-col rounded-3xl bg-[#101010] shadow-lg overflow-hidden max-w-[900px] mx-auto">
        <div className="border-b border-zinc-700 p-3 flex justify-between items-center">
          <h2 className="text-lg font-semibold">Chatgeschiedenis</h2>
          <button
            onClick={clearChatHistory}
            className="text-red-500 hover:text-red-400 text-sm font-semibold"
            title="Verwijder alle chatgeschiedenis"
          >
            Verwijder alles
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4" style={{ textAlign: "left" }}>
          {chatHistory.length === 0 && (
            <p className="text-zinc-400 select-none">Start een gesprek...</p>
          )}
          {chatHistory.map((msg, i) =>
            msg.role === "user" ? (
              <UserMessage key={i} content={msg.content} />
            ) : (
              <div
                key={i}
                className="px-4 py-3 rounded-xl whitespace-pre-wrap break-words self-start bg-transparent text-white rounded-bl-sm max-w-full"
              >
                {parseCodeBlocks(msg.content)}
              </div>
            )
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="border-t border-zinc-700 p-4 bg-[#101010] flex flex-col gap-2 relative group">
          <textarea
            ref={promptRef}
            rows={4}
            maxLength={20000}
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
        </div>
      </section>

      <aside
        className="w-80 flex flex-col gap-6 bg-zinc-800 rounded-3xl p-6 shadow-lg overflow-y-auto"
        style={{
          scrollbarColor: "#000000 transparent",
          scrollbarWidth: "thin",
        }}
      >
        {["1", "2", "3", "4"].map((num) => (
          <div key={num} className="flex flex-col">
            <div className="flex justify-end">
              <button
                onClick={() => clearInputField(Number(num))}
                className="text-red-500 hover:text-red-400 text-sm font-semibold"
                title={`Verwijder titel en instructies ${num}`}
              >
                Verwijder
              </button>
            </div>
            <input
              type="text"
              name={`title${num}`}
              placeholder={`Titel ${num}`}
              value={inputFields[`title${num}` as keyof InputFields]}
              onChange={handleFieldChange}
              className="mb-2 rounded-md p-2 text-black h-10"
            />
            <textarea
              name={`instr${num}`}
              placeholder={`Instructies ${num}`}
              value={inputFields[`instr${num}` as keyof InputFields]}
              onChange={handleFieldChange}
              rows={7}
              className="rounded-md p-2 text-black resize-y"
            />
            <hr className="mt-4 border-zinc-600" />
          </div>
        ))}
      </aside>
    </div>
  )
}
