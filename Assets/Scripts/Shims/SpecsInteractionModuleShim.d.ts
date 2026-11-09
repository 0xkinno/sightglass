// Compile-time shim. Lens Studio 5.23.2 typings do not declare SpecsInteractionModule, which the
// InteractionKit 4.0.0 package folder (left in Packages/ by an install that was superseded by
// SpectaclesInteractionKit 2.0.0) refers to. Nothing in this project imports that package, so these
// declarations only let the project compile. They are never used at runtime.
declare class SpecsInteractionModule {
  [key: string]: any
  static isEnabled: any
}
declare namespace SpecsInteractionModule {
  class Interactor {
    [key: string]: any
  }
  class Overlap {
    [key: string]: any
  }
  class CursorVisualState {
    [key: string]: any
  }
  class InteractionPlaneOptions {
    [key: string]: any
  }
  class InteractableOptions {
    [key: string]: any
  }
  class OverlapProbeOptions {
    [key: string]: any
  }
  class SphereOverlapProbe {
    [key: string]: any
  }
  class OverlapExitEventArgs {
    [key: string]: any
  }
  class OverlapEnterEventArgs {
    [key: string]: any
  }
  class CastHit {
    [key: string]: any
  }
  class Cursor {
    [key: string]: any
  }
  class TargetingRay {
    [key: string]: any
  }
  enum FieldState {
    FarField,
    Physical,
    NearField,
    BehindNearField,
  }
  enum CursorVisualMode {
    Auto,
    Translate,
    ScaleTopLeft,
    ScaleTopRight,
  }
  enum TargetingVisual {
    None,
    Cursor,
  }
  enum TargetingPriority {
    Normal,
    High,
  }
  enum TargetingMode {
    None,
    Poke,
    Indirect,
    Direct,
  }
  enum InteractorKind {
    LeftHand,
    RightHand,
  }
}
