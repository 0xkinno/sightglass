// SheetSender.ts
// Owns: posting the signed round sheet, its digest and the crops that were seen to the handover door.
// Expects @inputs: url, target.
// Must not: claim a send that did not return 200 or 201. A failed or switched-off send is reported as such.

import {RoundSheet} from "./Core/RoundSheet"

export interface SendResult {
  ok: boolean
  status: number
  ms: number
  bytes: number
  why: string
  doorUrl: string
}

@component
export class SheetSender extends BaseScriptComponent {
  @ui.label('<span style="color: #60A5FA;">SheetSender: post the signed sheet to the handover door</span>')
  @ui.separator
  @ui.group_start("Settings")
  @input
  @hint("Base address of the handover door, without a trailing slash.")
  url: string = "https://sightglass-kinno.vercel.app"

  @input
  @hint("live posts to the door. off sends nothing and says so. LEAF scenarios set off except the send scenario.")
  @widget(new ComboBoxWidget([new ComboBoxItem("live", "live"), new ComboBoxItem("off", "off")]))
  target: string = "live"
  @ui.group_end

  private internetModule: InternetModule = require("LensStudio:InternetModule")

  async send(sheet: RoundSheet, digest: string, frames: {[ref: string]: string}): Promise<SendResult> {
    if (this.target !== "live") {
      print("SIGHTGLASS_SEND off, nothing sent")
      return {ok: false, status: 0, ms: 0, bytes: 0, why: "sending is switched off", doorUrl: ""}
    }
    const body = JSON.stringify({sheet: sheet, digest: digest, frames: frames})
    const t0 = getTime()
    try {
      const res = await this.internetModule.fetch(this.url + "/api/rounds", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: body,
      })
      const ms = Math.round((getTime() - t0) * 1000)
      const ok = res.status === 200 || res.status === 201
      let doorUrl = ""
      if (ok) {
        try {
          const j = JSON.parse(await res.text())
          doorUrl = typeof j.url === "string" ? this.url + j.url : this.url + "/handover/" + sheet.roundId
        } catch (_e) {
          doorUrl = this.url + "/handover/" + sheet.roundId
        }
      }
      print("SIGHTGLASS_SEND status=" + res.status + " ms=" + ms + " bytes=" + body.length + " ok=" + ok + " url=" + this.url)
      return {ok: ok, status: res.status, ms: ms, bytes: body.length, why: ok ? "" : "door answered " + res.status, doorUrl: doorUrl}
    } catch (e) {
      const ms = Math.round((getTime() - t0) * 1000)
      print("SIGHTGLASS_SEND failed ms=" + ms + " err=" + String(e).slice(0, 120))
      return {ok: false, status: 0, ms: ms, bytes: body.length, why: "no answer from the door", doorUrl: ""}
    }
  }
}
