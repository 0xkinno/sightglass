// SightglassAudio.ts
// Owns: the two spatial cues: a soft click from the direction of the next gauge, and a low two note alarm
// from the dial in alarm. Both are plain placeholder tones (sine bursts), not designed sound.
// Expects @inputs: clickTrack, alarmTrack, clickVolume, alarmVolume.
// Must not: decide when to play. SightglassMain and ChevronGuide call playClickAt and playAlarmAt.

@component
export class SightglassAudio extends BaseScriptComponent {
  @ui.label('<span style="color: #60A5FA;">SightglassAudio: spatial cues</span>')
  @ui.separator
  @ui.group_start("References")
  @input
  @hint("Soft click for the chevron. Placeholder tone.")
  clickTrack!: AudioTrackAsset

  @input
  @hint("Low two note cue for an alarm reading. Placeholder tone.")
  alarmTrack!: AudioTrackAsset
  @ui.group_end

  @ui.group_start("Settings")
  @input
  @hint("Click volume, 0 to 1.")
  @widget(new SliderWidget(0, 1, 0.05))
  clickVolume: number = 0.5

  @input
  @hint("Alarm cue volume, 0 to 1.")
  @widget(new SliderWidget(0, 1, 0.05))
  alarmVolume: number = 0.7
  @ui.group_end

  private clickEmitter!: SceneObject
  private alarmEmitter!: SceneObject
  private clickAudio!: AudioComponent
  private alarmAudio!: AudioComponent
  private _clicks: number = 0
  private _alarms: number = 0

  // How many cues have been requested, for tests.
  get clickCount(): number {
    return this._clicks
  }
  get alarmCount(): number {
    return this._alarms
  }

  onAwake() {
    this.clickEmitter = global.scene.createSceneObject("ClickEmitter")
    this.clickEmitter.setParent(this.sceneObject)
    this.alarmEmitter = global.scene.createSceneObject("AlarmEmitter")
    this.alarmEmitter.setParent(this.sceneObject)
    this.clickAudio = this.makeAudio(this.clickEmitter, this.clickTrack, this.clickVolume)
    this.alarmAudio = this.makeAudio(this.alarmEmitter, this.alarmTrack, this.alarmVolume)
  }

  private makeAudio(o: SceneObject, track: AudioTrackAsset, volume: number): AudioComponent {
    const a = o.createComponent("Component.AudioComponent") as AudioComponent
    if (track) a.audioTrack = track
    a.volume = volume
    a.playbackMode = Audio.PlaybackMode.LowLatency
    a.spatialAudio.enabled = true
    return a
  }

  playClickAt(worldPos: vec3): void {
    this._clicks += 1
    this.clickEmitter.getTransform().setWorldPosition(worldPos)
    if (this.clickTrack) this.clickAudio.play(1)
  }

  playAlarmAt(worldPos: vec3): void {
    this._alarms += 1
    this.alarmEmitter.getTransform().setWorldPosition(worldPos)
    if (this.alarmTrack) this.alarmAudio.play(1)
  }
}
