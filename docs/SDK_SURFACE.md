# SDK surface

What the Lens actually calls, with file and line. A row is here only if the code calls it.

| API | Used for | Where |
|---|---|---|
| `CameraModule.createCameraRequest`, `requestCamera` | The single camera request that keeps the camera awake | `Assets/Scripts/FrameCapture.ts:84`, `:86` |
| `RectCropTextureProvider` on a Screen Crop Texture | Crop of the scene render target (camera feed plus the virtual scene) to the dial rim | `Assets/Scripts/FrameCapture.ts:89` |
| `Camera.worldSpaceToScreenSpace` | Project the dial rim to screen space for the crop | `Assets/Scripts/FrameCapture.ts:138` |
| `Base64.encodeTextureAsync` | JPEG of the crop | `Assets/Scripts/FrameCapture.ts:210` |
| `Gemini.models` from Remote Service Gateway | Four points as JSON, gemini-2.5-flash, temperature 0 | `Assets/Scripts/GaugeReader.ts:122` |
| `InternetModule.fetch` | POST of the signed sheet to the handover door | `Assets/Scripts/SheetSender.ts:42` |
| `WorldCameraFinderProvider` (Interaction Kit) | Head pose for the chevron and the round card follow | `Assets/Scripts/ChevronGuide.ts:83` |
| `RoundButton`, `Button`, `BackPlate`, `FlexLayout` (UI Kit) | Dot, decision buttons, tag plate, layout | `Assets/Scripts/GaugeTag.ts:222`, `:339`, `:241`, `:254` |
| `AudioComponent` | Click and alarm cues from the dial's direction | `Assets/Scripts/SightglassAudio.ts:35` |
| LEAF `Scenario`, `@scenariosIndex`, `findInteractablesByName` | Scenarios and real pinches | `Assets/Tests/C1PinchDotReads.ts:14`, `Assets/Tests/LeafIndex.ts:19`, `Assets/Tests/SightglassTestKit.ts:9` |

## Not used, so not claimed
Depth, World Query, Spectacles Sync Kit, speech recognition, text to speech, hand tracking APIs used directly, Snap Cloud, and the Remote Service Gateway OpenAI and Snap3D endpoints. The OpenAI and Snap tokens are generated with the others because the token plugin issues all three, and nothing calls them.
