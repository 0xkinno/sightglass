# Disclosures

## How AI was used
- Claude Code, with the CLAD plugin and the Lens Studio MCP tools, wrote and tested most of the Lens code, the web door and the documents in this repository, under the direction of the owner. Every commit is authored by 0xkinno.
- The `plan-lens` interview was answered by the owner in their own words. The design brief was approved by the owner.
- The hero photograph on the landing page is an AI-generated image made from a written prompt by the owner. It shows an anonymous engineer and no real person.
- At run time Gemini 2.5 Flash, through Snap's Remote Service Gateway, places four points on a cropped dial image. It does not supply the scale or the value.

## Code written during the submission period
The Core files (`Assets/Scripts/Core/`), their tests, the evaluation scripts in `headstart/` and everything else in this repository were written on 9 November 2026, during the submission period. Nothing was brought in from an earlier project.

## What is a stand-in
The engine room, its three stations, the eight dials and the plant values are built for the Lens Studio preview and are labelled as stand-ins in the scene. The round card is an example, not a real ship's. A pinch on a dot stands for looking at a gauge.

## Snap packages and templates
The project started from the SPECS Base Template in Lens Studio 5.23.2. It uses Spectacles Interaction Kit, Spectacles UI Kit, Remote Service Gateway, LEAF, Utilities and SnapDecorators from the Lens Studio asset library, under their own licences.

## Sounds
The click and alarm tones are plain synthesised sine bursts made for this project.

## Evidence limits
- All live reads were taken in the Lens Studio preview, against a plant simulator, not on a device and not on a ship.
- The 200 photo wild-set evaluation is pre-registered and has not been run.
- The gateway returns no token usage, so cost per read is not recorded.
- The LEAF editor plugin did not connect to the installed LEAF version, so scenarios were run with `Assets/Tests/InLensRunner.ts`. The scenarios themselves are unchanged.
- Running the `extra-send` scenario posts a real round to the handover door each time, so the door holds several test rounds dated 9 November 2026.

## Data
The handover door stores signed round sheets and their crops in Vercel Blob. It has no login and is capped at 2 MB per sheet and 10 sheets per hour per address. Do not send real operational data to it.
