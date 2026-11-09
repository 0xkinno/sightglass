// InLensRunner.ts
// Runs one LEAF scenario inside the Lens, without the LEAF editor plugin.
// Why: the LEAF plugin in this Lens Studio build does not connect to Leaf 2.0.2, so the panel
// cannot start scenarios. The scenarios themselves are unchanged; this only creates one and awaits run().
// Set scenarioId, refresh the preview, read the LEAF_INLENS lines in the log. Empty id does nothing.

import {C1PinchDotReads} from "./C1PinchDotReads"
import {C2AlarmBlocksReady} from "./C2AlarmBlocksReady"
import {C3FoggedByEye} from "./C3FoggedByEye"
import {C4CorrectSteps} from "./C4CorrectSteps"
import {C5SignSummaryCode} from "./C5SignSummaryCode"
import {ExtraOverlayHidden} from "./ExtraOverlayHidden"
import {ExtraFaultReader} from "./ExtraFaultReader"
import {ExtraPinchTargets} from "./ExtraPinchTargets"
import {ExtraChevron} from "./ExtraChevron"
import {ExtraSend} from "./ExtraSend"

@component
export class InLensRunner extends BaseScriptComponent {
  @input scenarioId: string = ""

  onAwake(): void {
    if (!this.scenarioId) return
    this.createEvent("OnStartEvent").bind(() => {
      this.go()
    })
  }

  private async go(): Promise<void> {
    const id = this.scenarioId
    const map: {[k: string]: any} = {
      "c1-pinch-dot-reads": C1PinchDotReads.getTypeName(),
      "c2-alarm-blocks-ready": C2AlarmBlocksReady.getTypeName(),
      "c3-fogged-by-eye": C3FoggedByEye.getTypeName(),
      "c4-correct-steps": C4CorrectSteps.getTypeName(),
      "c5-sign-summary-code": C5SignSummaryCode.getTypeName(),
      "extra-overlay-hidden": ExtraOverlayHidden.getTypeName(),
      "extra-fault-reader": ExtraFaultReader.getTypeName(),
      "extra-pinch-targets": ExtraPinchTargets.getTypeName(),
      "extra-chevron": ExtraChevron.getTypeName(),
      "extra-send": ExtraSend.getTypeName(),
    }
    const tn = map[id]
    if (!tn) {
      print("LEAF_INLENS FAILED " + id + " unknown scenario id")
      return
    }
    print("LEAF_INLENS RUNS " + id)
    const t0 = getTime()
    try {
      const host = global.scene.createSceneObject("InLensScenario " + id)
      const sc = host.createComponent(tn) as any
      await sc.run()
      print("LEAF_INLENS PASSED " + id + " secs=" + (getTime() - t0).toFixed(1))
    } catch (e) {
      const err = e as any
      print("LEAF_INLENS FAILED " + id + " secs=" + (getTime() - t0).toFixed(1) + " " + String(err) + (err && err.stack ? " | " + err.stack : ""))
    }
  }
}
