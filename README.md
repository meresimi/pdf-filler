# PDF Editor App

A Cordova-based Android application for viewing and editing PDF forms with text and checkbox annotations.

## Features

- 📄 Open and view PDF files
- ✍️ Add text annotations to PDF forms
- ☑️ Add and check/uncheck checkboxes
- 🔍 Zoom in/out functionality
- 📑 Page navigation
- 💾 Save edited PDFs to device storage
- 🖱️ Drag and drop annotations
- ✏️ Edit text annotations directly

## Requirements

- Node.js and npm
- Cordova CLI: `npm install -g cordova`
- Android Studio (for Android development)
- VoltBuilder account (optional, for cloud builds)

## Project Structure
pdf-editor-app/
├── config.xml              # Cordova configuration
├── package.json            # Node dependencies
├── www/                    # Web application files
│   ├── index.html         # Main HTML file
│   ├── css/
│   │   └── styles.css     # Application styles
│   ├── js/
│   │   ├── app.js         # Main app logic
│   │   ├── pdfHandler.js  # PDF viewing logic
│   │   └── formEditor.js  # Form editing logic
│   └── lib/               # Third-party libraries
│       ├── pdf.min.js     # PDF.js library
│       ├── pdf.worker.min.js
│       └── pdf-lib.min.js # pdf-lib library
└── res/                   # Resources (icons, splash screens)
├── icon/
└── screen/
## Setup Instructions

### 1. Install Dependencies

```bash
npm install