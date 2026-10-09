# MSI Vigor GK50 Elite: lighting protocol

Decoded from the Dragon Center USB captures attached to
[OpenRGB issue #2429](https://gitlab.com/CalcProgrammer1/OpenRGB/-/issues/2429). Those captures were recorded on firmware `0x0120`, the same firmware as this keyboard.

## Device
- USB `0DB0:0B5B`, bcdDevice `0x0120`, "MSI GK50 ELITE Gaming Keyboard"
- Interface 1, vendor HID (usage page `0xFF00`, usage `0x01`). Interrupt OUT EP `0x04` and IN EP `0x83`, 64-byte reports, no report IDs.
- Every command is echoed on EP `0x83`, usually within about 2 ms. **Wait for each echo before sending the next command**, as Dragon Center does. Streaming 8 commands back-to-back per frame locked up the lighting controller after about 10 minutes. Writes then hung with `hid_write` timeouts, the keyboard kept typing normally, and only a replug cleared it.

## Commands (host → device, zero-padded to 64 bytes)
| Bytes | Meaning |
|---|---|
| `41 80` | Session start. Dragon Center sends it before every lighting change. |
| `56 20 NN` | Read config block `NN`. The reply is `56 20 NN 00` followed by 60 bytes of payload. |
| `56 21 NN 00 <60 bytes>` | Write config block `NN` to RAM. |
| `51 28 00 00 MM` | Activate effect `MM` from RAM. Seen: `01` steady, `0B` per-key custom, `0C` off. |
| `50 55` | Save RAM to flash. Replies after about 130 ms. **Never send this per frame.** |

After a SignalRGB session, a replugged keyboard came back with every LED off until the onboard lighting profile was switched. Something survives a power cycle even without `50 55`: either `51 28` persists the active-effect choice, or the firmware saves the colour table on its own. The captures don't show which.

Dragon Center's "sync" mode, which SignalRGB's built-in plugin copies, streams `56 21 01` + `51 28 00 00 01` at about 13 fps with no `50 55`.

## Config blocks
- **`0x01`**: steady effect. The colour sits at payload offset 44 (packet offset 48).
- **`0x05`**: settings for several effects. Payload byte 55 (packet byte 59) is the **per-key brightness**: `33`/`66`/`99`/`CC`/`FF` = 20–100 %. Other bytes vary between captures, so always read-modify-write this block.
- **`0x06`–`0x0C`**: **per-key colour table**, 7 × 60 bytes.
  - Bytes 0–395 hold 132 RGB triplets. Slot = `column * 6 + row` on a 22 × 6 matrix.
  - Bytes 396–419 (the tail of block `0x0C`) hold other settings and must be preserved.
  - The ISO board uses 105 of the 132 slots. Unused slots are sent as `00 00 00`.

## Per-key frame (what `MSI_Vigor_GK50_Elite.js` sends)
The plugin waits for each command's echo before sending the next. If an echo doesn't arrive within about 100 ms, it drops that frame and resends every block on the next one.

1. Once: `41 80`. Read blocks `0x0C` and `0x05`, then write `0x05` back with the brightness patched.
2. Each frame, limited by the "Frames Per Second" setting (5–30, default 30): `56 21 06…0C`, sending only the blocks that changed, then `51 28 00 00 0B`.

With every key forced to red, the plugin's output is byte-identical to Dragon Center's own per-key packets (SHA-256 `1918a98e…`).

## Matrix (column-major; `#` = key present)
```
col:  0 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15 16 17 18 19 20 21
r0:   # . # # # # . # # # #  #  #  #  #  #  #  #  .  .  .  .     Esc F1-F4 F5-F12 PrtSc ScrLk Pause
r1:   # # # # # # # # # # #  #  #  .  #  #  #  #  #  #  #  #     \ 1-0 ' « Bksp Ins Home PgUp NumLk / * -
r2:   # # # # # # # # # # #  #  #  .  .  #  #  #  #  #  #  #     Tab Q-P + ´ Del End PgDn 7 8 9 +
r3:   # # # # # # # # # # #  #  #  .  #  .  .  .  #  #  #  .     Caps A-L Ç º ~ Enter 4 5 6
r4:   # # # # # # # # # # #  #  .  #  .  .  #  .  #  #  #  .     LShift < Z-M , . - RShift Up 1 2 3
r5:   # # # . . . # . . . #  .  #  #  #  #  #  #  #  .  #  #     Ctrl Win Alt Space AltGr Win Menu Ctrl ← ↓ → 0 . Enter
```
