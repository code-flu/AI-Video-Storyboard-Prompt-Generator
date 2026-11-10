# AI Video Storyboard Prompt Generator

[Open the live Storyboard Prompt Generator](https://code-flu.github.io/AI-Video-Storyboard-Prompt-Generator/)

A zero-dependency web page that turns a short video brief into one ready-to-paste prompt for ChatGPT, Claude, Gemini or any LLM. The LLM then returns a complete clip-by-clip storyboard with **first frame image prompts, last frame image prompts and video prompts** for every clip, written so the clips look like one consistent video when you stitch them together.

No build step, no backend, no API keys. Open `index.html` and go.

## Why

AI video tools generate short clips, usually 2 to 10 seconds each. A longer video means generating many clips, and they rarely match: the character changes, the colors drift, one clip looks photoreal and the next looks like a cartoon.

This tool fixes that at the prompt level. The generated prompt makes the LLM:

- Define a **style anchor** and a **visual theme** that every prompt repeats word for word
- **Lock** every recurring character, creature, product or location with one fixed description and a reference image prompt
- Write a **first frame** and a **last frame** for each clip, so you can drive image-to-video tools with keyframes
- Respect your exact **timeline**: clip count, clip lengths and voice-over word limits per clip

## Features

- **Any platform and aspect ratio:** TikTok, Instagram Reels, YouTube Shorts, YouTube landscape, Instagram feed, Facebook, LinkedIn, websites, or your own
- **Any graphic style:** cinematic / photorealistic, 3D cartoon, 2D flat, 2D anime, claymation, paper cutout, watercolor, pixel art, comic book, or a custom style. Each style gets its own prompt endings and vocabulary.
- **Flexible clip timeline**, with a live preview:
  - **Equal, by clip length:** 20s with 2s clips gives 10 clips
  - **Equal, by number of clips:** 20s split into 4 clips gives 5s each
  - **Custom length per clip:** for example 3s + 2s + 2s + 5s + 8s
- **Smart warnings** for uneven splits, clips over 10s (many tools can't generate that much at once) and clips under 2s
- **Voice-over budgeting:** a per-clip word limit at about 2.5 words per second
- **Built-in prompt rules:** no text rendered inside images, platform safe zones for vertical video, positive phrasing instead of "no X", hedged and sourced facts for educational content
- **Preview** and **Edit** modes for the generated Markdown, with **Copy** and **Download .md** buttons
- **Autosave:** your inputs are stored in the browser's `localStorage`
- **Private:** nothing leaves your browser

## Quick start

```bash
git clone https://github.com/<your-username>/<repo-name>.git
cd <repo-name>
open index.html        # macOS
# xdg-open index.html  # Linux
# start index.html     # Windows
```

You can also double-click `index.html`, or host the folder on GitHub Pages, Netlify or any static host.

## How to use

1. **Fill in the brief.** Required fields are marked with `*`: platform, aspect ratio, graphic style, video type, what the video is about, and the length and clip setup. Everything else is optional; the more you give, the better the result.
2. **Set the timeline.** Choose a max length, then how to split it into clips. Check the timeline bar.
3. **Click Generate prompt** and copy the result.
4. **Paste it into your LLM.** You get a full storyboard: header, style anchor, visual theme, subject lock, every clip, the voice-over script and a post-production checklist.
5. **Generate the visuals,** in this order:
   1. Generate a **reference image** for each locked subject and pick the best one.
   2. Generate each clip's **first frame**, attaching the reference image: "Keep this exact subject, style, lighting and palette."
   3. Generate each clip's **last frame** from its first frame: "Same scene, only the described change differs."
   4. In your video tool, use each first and last frame pair as start and end keyframes, together with that clip's **video prompt**.
6. **Edit:** trim every clip to its exact length, stitch, apply one uniform color grade, then add the voice-over, music and on-screen text.

## Example

Input:

| Field | Value |
|---|---|
| Platform | Instagram Reel (9:16) |
| Graphic style | 3D cartoon / animated |
| Video type | Educational / facts |
| About | Sharks are older than trees: shark ancestors appeared around 450 million years ago, the earliest known forests around 390 million years ago. |
| Length | 20s, equal 2s clips (10 clips) |
| Voice-over | Yes, English |
| Call to action | Follow for more facts that sound fake but are real |

Generated prompt (excerpt):

```text
## Timeline (fixed: 10 clips, 20s total)
- Clip 1: 0–2s (2s, voice-over max 5 words)
- Clip 2: 2–4s (2s, voice-over max 5 words)
...

## Rules
- Consistency: paste the style anchor and each locked subject description word
  for word into every image and video prompt.
- Frame prompts: 30–60 words describing one frozen moment, no motion verbs.
  End with "9:16 vertical, 3D animated still, high detail".
- Video prompts: 40–80 words, one action and one camera move that carry the
  first frame to the last within the clip length.
  End with "[clip length] seconds, 9:16 vertical, 3D animation, 1080p".
...
```

## Project structure

```
.
├── index.html   # Form markup
├── styles.css   # Styling (responsive, no framework)
├── app.js       # Timeline math, validation, prompt builder, autosave
├── README.md
└── LICENSE
```

## Customizing

All prompt logic lives in `app.js`:

| What | Where |
|---|---|
| Add or change a graphic style's prompt endings | `STYLE_TAGS` |
| Change the voice-over speaking rate | `WORDS_PER_SECOND` |
| Change the maximum number of clips | `MAX_CLIPS` |
| Change required fields | `REQUIRED` |
| Edit the prompt's output sections or rules | `buildPrompt()` |

To add a new graphic style, add an `<option>` to the `#style` select in `index.html` and a matching entry in `STYLE_TAGS`:

```js
'Low-poly 3D': { frame: 'low-poly 3D still, crisp facets', video: 'low-poly 3D animation, 1080p' },
```

Styles without an entry fall back to `"<style> still, high detail"` and `"<style> animation, 1080p"`.

## Browser support

Works in any modern browser: Chrome, Edge, Firefox and Safari. If the clipboard API is blocked (some browsers restrict it on `file://` pages), the Copy button falls back to selecting the text so you can copy it manually.

## Contributing

Issues and pull requests are welcome. Ideas:

- More graphic styles and platform presets
- Prompt templates tuned for specific video tools
- Translations of the UI
- Import and export of briefs as JSON

Please keep the project dependency-free: plain HTML, CSS and JavaScript only.

## License

[MIT](LICENSE). Free for personal and commercial use.
