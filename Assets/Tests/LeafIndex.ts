// LeafIndex.ts
// Registers the Sightglass LEAF scenarios (fixture reader mode).

import {scenariosIndex} from "Leaf.lspkg/Scenarios/decorator/ScenarioIndexDecorator"
import {ScenarioMetadata} from "Leaf.lspkg/Scenarios/scenario/ScenarioMetadata"
import {C1PinchDotReads} from "./C1PinchDotReads"
import {C2AlarmBlocksReady} from "./C2AlarmBlocksReady"
import {C3FoggedByEye} from "./C3FoggedByEye"
import {C4CorrectSteps} from "./C4CorrectSteps"
import {C5SignSummaryCode} from "./C5SignSummaryCode"

@component
export class LeafIndex extends BaseScriptComponent {
  @scenariosIndex
  static scenariosIndex: ScenarioMetadata[] = [
    {id: "c1-pinch-dot-reads", typename: C1PinchDotReads.getTypeName()},
    {id: "c2-alarm-blocks-ready", typename: C2AlarmBlocksReady.getTypeName()},
    {id: "c3-fogged-by-eye", typename: C3FoggedByEye.getTypeName()},
    {id: "c4-correct-steps", typename: C4CorrectSteps.getTypeName()},
    {id: "c5-sign-summary-code", typename: C5SignSummaryCode.getTypeName()},
  ]
}
