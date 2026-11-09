# PLATFORM_PROBE

Run on 9 November 2026 in the Lens Studio 5.23.2 preview. All lines below are copied from the Lens Studio log.
The probe script is kept at `devpost/evidence/PlatformProbe.ts.txt`. Probe objects were deleted from the scene afterwards.

## Setup facts that affect the build

- Project target platform was `Snapchat`. It was set to `Spectacles`. Without that, `InternetModule.fetch` and `CameraModule` throw "API not available on the simulated platform".
- Preview panel device is `SPECS 27` (stereo). Input type Interactive, scene Sunlit Room.
- Remote Service Gateway `0.2.0` is installed with SnapDecorators 1.1.0 and Utilities 1.1.0. Version 4.0.0 and its InteractionKit 4.0.0 do not compile on 5.23.2 (`SpecsInteractionModule` is missing from the typings), so they were removed.
- The package folder is named `Remote Service Gateway.lspkg` (with spaces). Import path in code: `Remote Service Gateway.lspkg/HostedExternal/Gemini`. A compile-time alias for the bundled examples is in `Assets/Scripts/Shims/RsgAlias.d.ts`.
- The `RemoteServiceGatewayExamples` prefab must not be placed in the scene. Its demo scripts call hand APIs that crash the preview.
- RSG tokens were generated through `ExecuteEditorCode` with `Network.performAuthorizedHttpRequest` (SNAP, OPENAI, GOOGLE) and written to the `RemoteServiceGatewayCredentials` component. The write only persists if `project.save()` is called in the same execution. Tokens expire in about one hour and must be regenerated.

## (a) RSG token plugin and one Gemini text call

```
PROBE_A ok model=gemini-2.5-flash ms=1942 text="{\"word\":\"ready\"}"
```

Other runs: 1628 ms, 1810 ms, 1976 ms. Result: pass.

## (b) Composite crop encodes to a non-blank JPEG

Camera frame awaited for one `onNewFrame`, then a `ScreenCropTexture` with a central rectangle (-0.4 to 0.4 on both axes), then another frame, then `Base64.encodeTextureAsync`.

```
PROBE_B bytes=21876 distinctByteValues=256 ms=957 nonblank=true
```

Result: pass. Limit of this test: the crop was a fixed central rectangle of the preview camera feed, not a rectangle projected from a dial rim.

## (c) One vision call returns parseable JSON

Crop from (b):

```
PROBE_C_CROP ok ms=2127 parsed={"subject":"Two framed artworks with abstract patterns, possibly Morse code, hanging on a light-colored wall.","person_visible":false}
```

Plain test dial (a drawn PNG, scale 0 to 100 bar, needle at 70):

```
PROBE_C_DIAL ok ms=3064 parsed={"reading":70,"unit":"bar"} expected=70 bar
```

Result: pass. Limit: one synthetic dial, one read. This is a platform check, not an accuracy measurement. Accuracy is measured in Phase 4.

## (d) InternetModule POST

```
PROBE_D status=200 ms=994
```

URL: https://httpbin.org/post, device SPECS 27. Result: pass. Repeat against the Vercel URL once it exists (Phase 6).
