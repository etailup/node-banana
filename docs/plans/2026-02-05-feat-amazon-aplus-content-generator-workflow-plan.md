---
title: Amazon A+ Content Generator Workflow
type: feat
date: 2026-02-05
---

# Amazon A+ Content Generator Workflow

## Overview

Create a reusable Node Banana workflow JSON file that generates all 5 Amazon A+ content images for a book, starting from:
- **Reference book cover** (the target book)
- **5 A+ template images** (layout references from another book)

The workflow uses an LLM to analyze the cover and generate tailored prompts, then runs 5 parallel Nano Banana Pro generations to produce the final A+ images.

## Problem Statement

Creating Amazon A+ content images manually is time-consuming. Each book needs 5 banner images (970x600px) with:
- Consistent background theme matching the book's style
- Book mockup shown in each image
- Tailored Italian marketing copy per section
- Different layout per image (hero, features, benefits, testimonials, bonus)

We previously had a workflow but lost it. This plan recreates it properly using the Node Banana workflow JSON format.

## Workflow Architecture

```
                                    ┌──────────────┐
                                    │  Book Cover   │
                                    │ (imageInput)  │
                                    └──────┬───────┘
                                           │ image
                                    ┌──────▼───────┐
                                    │  LLM Analyze  │◄── System Prompt
                                    │  (llmGenerate)│    (prompt node)
                                    └──────┬───────┘
                                           │ text (background description + 5 prompts)
                                           │
                          ┌────────────────┼────────────────┐
                          │                │                │
              ┌───────────▼──┐  ┌─────────▼────┐  ┌───────▼────────┐
              │ Prompt A+1   │  │ Prompt A+2   │  │ ... Prompt A+5 │
              │ (prompt)     │  │ (prompt)     │  │ (prompt)       │
              └──────┬───────┘  └──────┬───────┘  └───────┬────────┘
                     │ text            │ text              │ text
              ┌──────▼───────┐  ┌──────▼───────┐  ┌───────▼────────┐
  Cover ──►   │ NanoBanana 1 │  │ NanoBanana 2 │  │ NanoBanana 5   │  ◄── Cover
  A+1 ref ──► │ (generate)   │  │ (generate)   │  │ (generate)     │  ◄── A+5 ref
              └──────┬───────┘  └──────┬───────┘  └───────┬────────┘
                     │ image           │ image             │ image
              ┌──────▼───────┐  ┌──────▼───────┐  ┌───────▼────────┐
              │  Output 1    │  │  Output 2    │  │  Output 5      │
              └──────────────┘  └──────────────┘  └────────────────┘
```

### Execution Levels (Parallel Groups)

| Level | Nodes | Execution |
|-------|-------|-----------|
| 0 | Book Cover, A+1-5 refs, System Prompt, 5 Static Prompts | Parallel (inputs, no deps) |
| 1 | LLM Analyze | Sequential (needs cover + system prompt) |
| 2 | 5x NanoBanana Pro | **Parallel** (each needs: cover + ref + prompt) |
| 3 | 5x Output | Parallel (display results) |

## Detailed Node Specification

### Node 1: Book Cover (imageInput)
- **ID**: `imageInput-cover`
- **Purpose**: Load the target book cover image
- **Data**: User loads `reference book cover.png` (Persuasione Istantanea)

### Nodes 2-6: A+ Template References (imageInput x5)
- **IDs**: `imageInput-ref-1` through `imageInput-ref-5`
- **Purpose**: Load the 5 A+ layout templates (from another book like "Lasciare Andare")
- **Data**: User loads `a+1.jpg` through `A+5.jpg`

### Node 7: System Prompt (prompt)
- **ID**: `prompt-system`
- **Purpose**: Master prompt instructing the LLM how to analyze and generate

**Prompt Content:**
```
Analyze the provided book cover image carefully. Extract:
1. Book title, author, subtitle
2. Color palette (primary, secondary, accent colors)
3. Design style (modern, classic, minimalist, bold)
4. Genre and target audience
5. Key visual elements and mood

Then generate a BACKGROUND DESCRIPTION that would work perfectly for Amazon A+ content
images for this specific book. The background should:
- Match the book's color palette and mood
- Be suitable for text overlays (not too busy)
- Feel professional and premium
- Work at 970x600px banner dimensions

Finally, generate 5 specific A+ image prompts, one for each section:

**A+1 - HERO IMAGE**: The main showcase. Show the book cover held in hands or displayed
prominently on the LEFT side. RIGHT side has the main headline and a compelling description.
Include a badge/seal element. Dark, premium background matching the book's palette.

**A+2 - WHY CHOOSE THIS BOOK**: Book displayed at an angle with dimensions shown.
RIGHT side lists 3-4 key benefits with emoji icons and bold headlines.
Clean layout, professional typography.

**A+3 - DEEP DIVE / TESTIMONIALS**: Book shown in center. Bold headlines on both sides.
Includes a motivational quote and a call-to-action. Dynamic composition with arrows or
visual flow elements.

**A+4 - EMOTIONAL CONNECTION**: Split layout. LEFT side shows a relatable person/scene
matching the book's target audience. RIGHT side has emotional headlines and descriptive text.
Book cover visible. Human element adds trust.

**A+5 - BONUS / EBOOK INCLUDED**: Shows a tablet/device displaying the ebook version.
Includes headphone icon for audiobook. "INCLUSO" / "BONUS" badge prominently displayed.
Clean modern tech aesthetic mixed with the book's color palette.

For each prompt:
- Write the EXACT Italian text that should appear in the image
- Describe the layout precisely (left/right/center positioning)
- Specify typography style (bold, serif, handwritten etc.)
- Reference the book's actual title, author, and themes
- Include "aspect ratio 16:9" and "professional Amazon A+ marketing banner"
- Describe the background as: [use the background description you generated]

CRITICAL: Adapt ALL text content to match THIS book's topic (persuasion, neuroscience,
communication). Do NOT copy text from the reference layouts.

Output format - return ONLY the 5 prompts, clearly separated with headers:
===A+1===
[prompt]
===A+2===
[prompt]
===A+3===
[prompt]
===A+4===
[prompt]
===A+5===
[prompt]
```

### Node 8: LLM Analyzer (llmGenerate)
- **ID**: `llm-analyze`
- **Purpose**: Analyze cover + generate all 5 tailored prompts
- **Model**: `gemini-2.5-flash` (fast, good at analysis)
- **Inputs**: Book Cover image + System Prompt text
- **Output**: Text containing 5 separated prompts

### Nodes 9-13: Individual A+ Prompts (prompt x5)
- **IDs**: `prompt-aplus-1` through `prompt-aplus-5`
- **Purpose**: Static prompts for each A+ image (user copies LLM output here after first run, or connects LLM directly)

**Alternative approach**: Since text connections are single-value (last wins), and we need different prompts per generator, we use **5 static prompt nodes** that the user fills after the LLM generates the text. This is the most reliable pattern.

**Pre-filled prompts for Persuasione Istantanea:**

**A+1 (Hero):**
```
Create a professional Amazon A+ marketing banner, aspect ratio 16:9, 970x600 pixels.
The background is a deep dark navy-blue gradient with subtle golden light rays emanating
from the center, evoking neuroscience and mental power. Faint neural network patterns
in the background, very subtle.

LEFT SIDE: Show the book "PERSUASIONE ISTANTANEA IN 21 GIORNI" by Matt Rawling held
naturally in two hands, the full front cover clearly visible. The book has an orange/amber
and dark blue color scheme.

TOP LEFT: A golden circular badge/seal with text "TECNICHE SCIENTIFICHE" and a small
"1st" ribbon badge in red.

TOP RIGHT: Bold text "METODO IN 21 GIORNI" in white.

RIGHT SIDE - large bold serif text: "COMUNICAZIONE EFFICACE: OTTIENI IL SUCCESSO!" in white.

Below in smaller elegant text: "Vuoi influenzare positivamente chi ti circonda?"

Below that, body text in white/light gray:
"E il momento di sbloccare il tuo potenziale. Questa guida e il tuo alleato per
padroneggiare il linguaggio del corpo, superare ogni obiezione e convincere con carisma.
Con strategie testate e tecniche pratiche, imparerai a guidare le conversazioni
e creare una mentalita vincente."

Professional typography, clean hierarchy. Premium feel matching dark blue and gold theme.
```

**A+2 (Why Choose):**
```
Create a professional Amazon A+ marketing banner, aspect ratio 16:9, 970x600 pixels.
Dark navy-blue background with subtle golden accents and neural network patterns.

LEFT SIDE: Large bold white serif text reading "PERCHE SCEGLIERE IL NOSTRO LIBRO?"

CENTER-LEFT: The book "PERSUASIONE ISTANTANEA IN 21 GIORNI" shown at a slight angle
with dimension lines showing "22,86 CM" height and "15,24 CM" width. Book cover clearly
visible with orange and dark blue design.

RIGHT SIDE: Three benefit sections stacked vertically, each with an emoji icon and bold headline:

1. Brain emoji icon + "21 GIORNI DI METODO" in bold white
   Below: "Un percorso completo per padroneggiare persuasione, comunicazione e neuroscienze."

2. Lightbulb emoji + "TECNICHE SCIENTIFICHE" in bold white
   Below: "Strategie basate sulle neuroscienze per influenzare e comunicare con efficacia."

3. Fire emoji + "RISULTATI CONCRETI" in bold white
   Below: "Metodi pratici e immediati per trasformare le tue conversazioni da subito."

Clean layout, professional typography, white text on dark background.
```

**A+3 (Deep Dive):**
```
Create a professional Amazon A+ marketing banner, aspect ratio 16:9, 970x600 pixels.
Dark navy-blue background with golden light effects and subtle brain/neuroscience imagery.

TOP LEFT: Large bold white serif text: "PERSUASIONE ISTANTANEA: RIPRENDITI IL TUO POTERE!"

CENTER: The book "PERSUASIONE ISTANTANEA IN 21 GIORNI" held in a hand, cover visible.
A golden "BONUS & AUDIOLIBRO" badge near the book.

A curved arrow pointing from the book toward the right side text.

Below the book: "Smetti di subire le conversazioni. Tutto cio di cui hai bisogno e gia dentro di te."

TOP RIGHT: Bold white text "LA COMUNICAZIONE E UNA SCIENZA: PADRONEGGIALA!"

Below: "Il segreto per relazioni piu efficaci? Imparare la persuasione etica.
Questo libro e una guida pratica per comunicare con impatto, leggere il linguaggio
del corpo e influenzare positivamente ogni interazione."

BOTTOM RIGHT: Large bold italic text: "Inizia ora il tuo percorso verso la comunicazione efficace!"

Professional typography, dramatic composition with visual flow.
```

**A+4 (Emotional Connection):**
```
Create a professional Amazon A+ marketing banner, aspect ratio 16:9, 970x600 pixels.

LEFT SIDE: A professional-looking person (man or woman in business attire) in a confident
pose, arms crossed, slight smile. Warm lighting. The person represents someone who has
mastered communication and persuasion. Background behind them has a subtle dark blue
gradient with golden highlights.

Bold white text overlay on left: "ANSIA SOCIALE, TIMIDEZZA? ECCO LA SOLUZIONE!"

RIGHT SIDE: Dark navy background with golden accents.

TOP: Bold white text "COMUNICARE CON SICUREZZA E LA CHIAVE!"

Below in italic: "Quanto potere hanno le tue parole? La persuasione etica ti aiutera
a trasformare ogni conversazione in opportunita e a vivere con piu sicurezza."

MIDDLE: "SCOPRI IL SEGRETO PER CONVINCERE E INFLUENZARE" in bold

Below: "Le tecniche di comunicazione avanzata possono cambiare la tua vita? Questo libro
ti guida passo dopo passo per sviluppare carisma, superare la timidezza e comunicare
con impatto."

Book cover visible on the right edge, held naturally.

Professional, empowering aesthetic.
```

**A+5 (Bonus/Ebook):**
```
Create a professional Amazon A+ marketing banner, aspect ratio 16:9, 970x600 pixels.
Dark navy-blue background with golden light effects.

TOP LEFT: Small text "CON L'ACQUISTO DEL LIBRO"

Large bold white text: "INCLUSO"

A circular badge: "INCLUSO BONUS & AUDIOLIBRO" in gold and white.

A headphone/audio icon in the top right corner suggesting audiobook.

MAIN TEXT in white: "UN FANTASTICO EBOOK DA SCARICARE PER TE IN PDF CON AUDIOLIBRO"

Below in italic: "La persuasione non si impara solo leggendo, ma praticando ogni giorno."

Below that, body text: "Non aspettarti risultati senza azione. La vera padronanza
della comunicazione avviene con la pratica quotidiana. Ogni giorno, dedica tempo
ai piccoli gesti: una conversazione consapevole, un ascolto attivo, un feedback costruttivo."

RIGHT SIDE: A modern tablet/iPad device showing the ebook cover "21 GIORNI DI
MICROPRATICHE" with a stylus pen leaning against it. The tablet shows the book cover
adapted for digital format. Author "MATT RAWLING" visible on the ebook.

Clean, modern tech aesthetic blended with the dark blue and gold book theme.
```

### Nodes 14-18: NanoBanana Pro Generators (nanoBanana x5)
- **IDs**: `nanoBanana-1` through `nanoBanana-5`
- **Model**: `nano-banana-pro` (required for text rendering accuracy)
- **Aspect Ratio**: `16:9` (Amazon A+ standard: 970x600)
- **Each receives**:
  - **Image 1**: Book cover (from `imageInput-cover`)
  - **Image 2**: A+ template reference (from `imageInput-ref-N`)
  - **Text**: Specific prompt (from `prompt-aplus-N`)

### Nodes 19-23: Outputs (output x5)
- **IDs**: `output-1` through `output-5`
- **Purpose**: Display generated A+ images

## Workflow JSON File

The workflow JSON will be saved to:
```
/Volumes/T7/node-banana/workflows/Amazon_A_Plus_Content_Generator.json
```

### Layout Positioning

```
Column 1 (x=50):     Image inputs (cover + 5 refs) + system prompt
Column 2 (x=450):    LLM analyzer
Column 3 (x=850):    5 static A+ prompts (stacked vertically)
Column 4 (x=1300):   5 NanoBanana Pro generators (stacked)
Column 5 (x=1750):   5 output nodes (stacked)
```

### Edge Connections

For each A+ image (N = 1 to 5):
```
imageInput-cover     ──image──► nanoBanana-N
imageInput-ref-N     ──image──► nanoBanana-N
prompt-aplus-N       ──text───► nanoBanana-N
nanoBanana-N         ──image──► output-N
```

Plus the analysis chain:
```
imageInput-cover     ──image──► llm-analyze
prompt-system        ──text───► llm-analyze
```

## Acceptance Criteria

- [x] Workflow JSON loads correctly in Node Banana UI at localhost:3000
- [x] All nodes are properly positioned and visible without overlap
- [x] Edges connect correctly (type matching: image-to-image, text-to-text)
- [x] LLM node receives book cover image + system prompt
- [x] All 5 NanoBanana nodes receive: book cover + A+ reference + specific prompt
- [x] All 5 generation nodes are at the same dependency level (parallel execution)
- [x] NanoBanana nodes use `nano-banana-pro` model with `16:9` aspect ratio
- [x] Prompts contain correct Italian text for "Persuasione Istantanea"
- [x] Output nodes display generated images
- [ ] Workflow executes end-to-end with Cmd+Enter

## Implementation

Create a single JSON file following the exact format of the sample workflows (`Product_Shot.json`, `Background_Swap.json`), with all nodes, edges, positions, and pre-filled prompts.

## References

- Sample workflows: `/Volumes/T7/node-banana/workflows/sample_workflows/`
- Input images: `/Volumes/T7/node-banana/workflows/inputs/`
- Generated outputs: `/Volumes/T7/node-banana/workflows/generations/`
- Execution engine: `src/store/workflowStore.ts` (level-based parallel execution)
- Node types: `src/types/index.ts`
