// Compile-time alias. The AiPreviewAgentInspect package examples import "UIKit.lspkg/...", while the
// installed UI Kit 2.0.0 folder is "SpectaclesUIKit 2.lspkg". Only the examples use these paths and they
// are not placed in the scene.
declare module "UIKit.lspkg/Scripts/Components/Button/Button" {
  export * from "SpectaclesUIKit 2.lspkg/Scripts/Components/Button/Button"
}
declare module "UIKit.lspkg/Scripts/Components/Button/RectangleButton" {
  export * from "SpectaclesUIKit 2.lspkg/Scripts/Components/Button/RectangleButton"
}
declare module "UIKit.lspkg/Scripts/Components/Frame/Frame" {
  export * from "SpectaclesUIKit 2.lspkg/Scripts/Components/Frame/Frame"
}
declare module "InteractionKit.lspkg/Providers/CameraProvider/WorldCameraFinderProvider" {
  import WorldCameraFinderProvider from "SpectaclesInteractionKit.lspkg/Providers/CameraProvider/WorldCameraFinderProvider"
  export {WorldCameraFinderProvider}
  export default WorldCameraFinderProvider
}
