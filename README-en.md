# ADHD Text Highlighter - Phase One Quick Validation Version

[中文版](README.md) | **English**

This is the first phase implementation of the ADHDGoFly browser extension, focusing on rapid validation of core functionality.

## Features

- ✅ Multi-language vocabulary highlighting (Chinese, English, Japanese, French, Spanish, Russian)
- ✅ Part-of-speech classification display (noun/verb/adjective/adverb)
- ✅ Intelligent language detection
- ✅ CJK language segmentation (Chinese and Japanese using bidirectional maximum matching algorithm)
- ✅ One-click toggle control
- ✅ Clean popup interface
- ✅ State persistence

## Installation

### Chrome/Edge Developer Mode Installation

1. Open your browser and navigate to the extensions management page:

   - Chrome: `chrome://extensions/`
   - Edge: `edge://extensions/`

2. Enable "Developer mode"

3. Click "Load unpacked extension"

4. Select this project folder

5. Extension installation complete, the plugin icon will appear in the toolbar

## Usage

1. Visit any webpage (recommend testing with `test.html` first)
2. Click the plugin icon in the browser toolbar
3. Click the "Enable Highlighting" button
4. Observe the highlighting effects on English vocabulary in the page

## Highlighting Color Legend

- 🔵 **Blue background**: Nouns (n)
- 🔴 **Red background**: Verbs (v)
- 🟢 **Green background**: Adjectives (adj/a)
- 🟠 **Orange background**: Adverbs (adv)
- ⚪ **Gray background**: Other parts of speech

## Supported Languages

- **Chinese (ZH)**: Using bidirectional maximum matching segmentation algorithm
- **English (EN)**: Space and punctuation-based segmentation
- **Japanese (JA)**: Using bidirectional maximum matching segmentation algorithm
- **French (FR)**: Space and punctuation-based segmentation
- **Spanish (ES)**: Space and punctuation-based segmentation
- **Russian (RU)**: Space and punctuation-based segmentation

**Dictionary Scale**: Each language contains tens of thousands of vocabulary entries

## Testing Recommendations

### Recommended Test Websites

- Local `test.html` file (contains 6-language testing)
- Wikipedia multilingual pages
- News websites (CNN, BBC, Le Monde, El País, RT)
- Technical blogs and forums

### Validation Points

- [ ] Can the plugin load normally
- [ ] Are basic English vocabulary correctly highlighted
- [ ] Does the toggle function work properly
- [ ] Does it affect the original webpage functionality
- [ ] Is the state correctly saved

## Known Limitations

- Chinese segmentation algorithm is relatively simple (maximum matching method)
- Does not support complex grammatical structures
- Dictionary files are large, first load requires time
- Only supports basic part-of-speech tagging

## Next Steps

Phase Two will implement:

- Chinese segmentation support
- Real dictionary files
- Automatic language detection
- More comprehensive settings panel

## File Structure

```
├── manifest.json          # Plugin configuration file
├── content.js             # Content script (core logic)
├── popup.html             # Popup interface
├── popup.js               # Popup interface logic
├── styles.css             # Highlighting styles
├── dictionaries/          # Dictionary folder
│   ├── EN_word.json       # English dictionary
│   ├── ZH_word.json       # Chinese dictionary
│   ├── JA_word.json       # Japanese dictionary
│   ├── FR_word.json       # French dictionary
│   ├── ES_word.json       # Spanish dictionary
│   └── RU_word.json       # Russian dictionary
├── test.html              # Test page
└── README.md              # Documentation
```

## Technical Implementation

- **Manifest V3**: Using the latest Chrome extension API
- **Content Scripts**: Page content processing
- **Storage API**: State persistence
- **Dynamic Dictionary Loading**: JSON format dictionary files
- **Asynchronous Processing**: Dictionary loading and page processing
- **Intelligent Language Detection**: Multi-language recognition based on character features
- **Segmentation Algorithms**:
  - CJK languages (Chinese and Japanese): Bidirectional maximum matching algorithm
  - Latin languages: Space and punctuation-based segmentation

## Feedback

If you have any issues or suggestions, please provide feedback for improvement in subsequent phases.