# {Shan, Shui}* with learned hands

A fork of Lingdong Huang's [{Shan, Shui}*](https://github.com/LingDong-/shan-shui-inf), the infinitely scrolling
procedural Chinese landscape. This fork adds one thing: the scroll can be drawn in a **learned hand**, the marks
of a particular artist, in place of the single built-in brush.

For live version: [Website link](https://parallaxmetrology.com/shan-shui/)  

The landscape itself is untouched. Same seed, same mountains, trees, huts and boats; only the hand changes.
With no hand chosen, the output is byte-for-byte the original's.

![The same scroll in six hands](/screenshots/hands.jpg?raw=true "Seed 1028: the original brush, Shen Zhou, Shitao, Buson, Rembrandt, Van Gogh")

## The hands

| | hand | learned from |
|---|---|---|
| Brush | Shen Zhou, steady brush | 25 works, the Met and Cleveland Museum of Art (CC0) |
| | Shitao, Chinese brush | 23 works, the Met (CC0) |
| | Taiga, literati brush | 20 works, the Met and Cleveland (CC0) |
| | Buson, haiga brush | 15 works, the Met and Cleveland (CC0), Aichi Prefectural Museum of Art (Public Domain Mark) |
| | Hokusai, brush and ink | 20 works, Freer Gallery of Art, Smithsonian (CC0) |
| | Hakuin, Zen brush | 12 works, the Met and Cleveland (CC0), Aichi (Public Domain Mark) |
| | Kyōsai, wet brush | 24 works, the Met (CC0) |
| Pen | Rembrandt, pen and bistre | 12 works, Rijksmuseum (public domain), the Met and Cleveland (CC0) |
| | Van Gogh, reed pen | 16 works, Rijksmuseum, Art Institute of Chicago, the Met, Wikimedia Commons (public domain) |

A hand is a small vocabulary of marks (length, width, taper, pressure, dryness, hatching, zigzag, dots, wash),
each with how often the artist used it. The vocabularies were learned from those works by the Hands engine
(Parallax Metrology). Every source is public domain or CC0.

## Use

Open the settings menu (☰) and pick a hand, or add it to the address:

    index.html?seed=1028&hand=shitao

Keys: `shenzhou`, `shitao`, `taiga`, `buson`, `hokusai`, `hakuin`, `kyosai`, `rembrandt`, `vangogh`.
Optional: `&hscale=1.6` (how big the marks are against the scroll), `&ink=1.8` (ink strength).

## How it works

- `hands-data.js`: the nine vocabularies, their ink and paper colours, and source credits.
- `hands.js`: in place of `stroke()`, each path is cut into marks of the hand's own lengths. A mark is chosen by
  how often the artist used it and how near its width is to what the scroll asked for, then shaped the way
  the artist's tool behaves: a brush tapers, and when dry its bristles run out and skip; a reed pen swells and
  thins with direction and fades as it runs dry. Hatching, zigzags, stippling and washes come out as several
  lines, a swinging line, dots and pale fills. Mountain texture draws on the hand's "mass" marks, outlines on
  its "edge" marks, and each mountain gets as much wash as the artist used (Buson about 41%, Shitao 12%).
- `index.html`: about 60 changed lines. It loads the two files, routes `stroke()` and `blob()` to the hand when
  one is chosen, and adds the menu entry.

The hand code never calls `Math.random`: its choices come from a hash of where each stroke sits, so the
scroll's own random sequence, and therefore its landscape, is exactly the original's.

A hand costs about 25% more time to generate and roughly twice the SVG elements.

---

## Original README

# {Shan, Shui}*
Procedurally-generated vector-format infinitely-scrolling Chinese landscape for the browser.
Generate your own on https://lingdong-.github.io/shan-shui-inf/ (or [Alternative link](https://shan-shui-inf.glitch.me)).

Some examples:
![Screenshot1](/screenshots/screen001.jpg?raw=true "")
![Screenshot2](/screenshots/screen002.jpg?raw=true "")

{Shan, Shui}\* is inspired by [traditional Chinese landscape scrolls](https://en.wikipedia.org/wiki/Shan_shui) (such as [this](https://en.wikipedia.org/wiki/Dwelling_in_the_Fuchun_Mountains) and [this](https://en.wikipedia.org/wiki/Wang_Ximeng)) and uses noises and mathematical functions to model the mountains and trees from scratch. It is written entirely in javascript and outputs Scalable Vector Graphics (SVG) format.
