"use client"
import {useState} from "react"

/** The button is bound to the digest that was rendered. The server refuses if the stored digest differs. */
export function Countersign({id, digest, disabled}: {id: string; digest: string; disabled: boolean}) {
  const [role, setRole] = useState("")
  const [note, setNote] = useState("")
  const [msg, setMsg] = useState("")
  const [busy, setBusy] = useState(false)

  async function go() {
    setBusy(true)
    setMsg("")
    try {
      const res = await fetch("/api/rounds/" + encodeURIComponent(id) + "/countersign", {
        method: "POST",
        headers: {"content-type": "application/json"},
        body: JSON.stringify({digest, role, note: note || undefined}),
      })
      const j = await res.json()
      if (res.ok) {
        setMsg("Countersigned. Reloading.")
        setTimeout(() => location.reload(), 600)
      } else setMsg(j.error ?? "Failed.")
    } catch {
      setMsg("Could not reach the server. Not countersigned.")
    }
    setBusy(false)
  }

  return (
    <div style={{display: "grid", gap: 12, maxWidth: 520}}>
      <label>
        <span className="label">Role</span>
        <input value={role} onChange={(e) => setRole(e.target.value)} maxLength={80} placeholder="Chief engineer" />
      </label>
      <label>
        <span className="label">Note (optional)</span>
        <textarea value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} rows={2} />
      </label>
      <p className="label">Binds to digest {digest.slice(0, 12)}</p>
      <button className="btn" onClick={go} disabled={busy || disabled || role.trim().length === 0}>
        Countersign this digest
      </button>
      <p className="msg" role="status">{msg}</p>
    </div>
  )
}
