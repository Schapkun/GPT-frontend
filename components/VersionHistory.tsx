"use client"

import { useEffect, useState } from "react"

// ─── Types ───────────────────────────────────────────────────────
interface Version {
  id: number
  timestamp: string
  prompt: string
  html: string
  supabase_instructions: string
}

// ─── Component ───────────────────────────────────────────────────
export default function VersionHistory({ onSelect }: { onSelect: (version: Version) => void }) {
  const [versions, setVersions] = useState<Version[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    async function fetchVersions() {
      setLoading(true)
      
      // Hier kun je een andere logica toevoegen voor het ophalen van versies
      // Bijvoorbeeld, als je de versies vanuit een lokaal bestand laadt:
      
      const mockData = [
        { id: 1, timestamp: '2025-07-16T10:00:00', prompt: 'Prompt 1', html_preview: '<div>Preview 1</div>', supabase_instructions: 'Instruction 1' },
        { id: 2, timestamp: '2025-07-16T10:10:00', prompt: 'Prompt 2', html_preview: '<div>Preview 2</div>', supabase_instructions: 'Instruction 2' }
      ]
      
      // Simuleer het mappen van data naar de gewenste versie structuur
      const mapped = mockData.map((item) => ({
        ...item,
        html: item.html_preview,
      }))

      setVersions(mapped)
      setLoading(false)
    }

    fetchVersions()
  }, [])

  return (
    <div className="mt-4">
      <h2 className="font-medium text-sm text-zinc-400 mb-2">Restore History</h2>
      {loading && <p>Loading versions...</p>}
      <ul className="max-h-40 overflow-auto space-y-1">
        {versions.map((version) => (
          <li
            key={version.id}
            className="cursor-pointer rounded px-2 py-1 hover:bg-zinc-700"
            onClick={() => onSelect(version)}
          >
            {new Date(version.timestamp).toLocaleString()} — {version.prompt.slice(0, 30)}...
          </li>
        ))}
      </ul>
    </div>
  )
}
