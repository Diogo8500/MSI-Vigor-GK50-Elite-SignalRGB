# MSI Vigor GK50 Elite: per-key SignalRGB plugin

A [SignalRGB](https://signalrgb.com) plugin that controls every key of the **MSI Vigor GK50 Elite** keyboard (USB `0DB0:0B5B`) individually. SignalRGB's built-in plugin treats this keyboard as a single zone. This one maps all 105 keys of the ISO layout.

## Status
- Tested on an ISO (Portuguese) GK50 Elite with firmware `0x0120`. Every key lights, with correct labels and positions.
- Ran for 5+ hours with no issues.
- ANSI (US) boards are untested. Their keys around Enter, `\` and left Shift probably map to different LEDs.
- This is not part of SignalRGB's official plugins yet.

## Install
1. Download [`MSI_Vigor_GK50_Elite.js`](MSI_Vigor_GK50_Elite.js).
2. Put it in `Documents\WhirlwindFX\Plugins`. The **Plugins** button on the keyboard's Device Information page in SignalRGB opens this folder.
3. Fully quit SignalRGB from the system tray and start it again.

The plugin replaces SignalRGB's built-in single-zone support for this keyboard. To go back, delete the file and restart SignalRGB.

## Settings
| Setting | What it does |
|---|---|
| Lighting Mode / Forced Color | Show the active effect, or force one colour on every key. |
| Shutdown Color | Colour applied when SignalRGB or Windows shuts down. |
| Hardware Brightness | The keyboard's own per-key brightness step (20–100 %). |
| Frames Per Second | Upper limit on updates sent to the keyboard (5–30, default 30). |

## Known issues
- After SignalRGB has used the keyboard, unplugging and replugging it can leave every LED off. Switch the onboard lighting profile to bring the lighting back.
- If the lighting stops responding, the device console logs "Keyboard lighting controller is not responding". Unplug and replug the keyboard, then lower **Frames Per Second**. Please open an issue and attach a SignalRGB device snapshot.

## How it works
See [`MSI_Vigor_GK50_Elite_PROTOCOL.md`](MSI_Vigor_GK50_Elite_PROTOCOL.md). The protocol was decoded from the Dragon Center USB captures attached to [OpenRGB issue #2429](https://gitlab.com/CalcProgrammer1/OpenRGB/-/issues/2429). Thanks to its reporter for recording them.

## License
[MIT](LICENSE)
