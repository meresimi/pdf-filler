# Building with VoltBuilder

VoltBuilder is a cloud-based Cordova build service that makes it easy to build Android and iOS apps without setting up local development environments.

## Prerequisites

1. VoltBuilder account: https://voltbuilder.com
2. This project folder with all files
3. The required JavaScript libraries in `www/lib/` (see LIBRARIES.md)

## Step-by-Step Guide

### 1. Prepare Your Project

Ensure you have:
- All files from this project
- PDF.js and pdf-lib libraries in `www/lib/`
- Icons in `res/icon/android/` (or use placeholders)
- Splash screen in `res/screen/android/` (or use placeholder)

### 2. Create a ZIP File

Create a ZIP file of your entire project:

**On Windows**:
- Right-click the `pdf-editor-app` folder
- Select "Send to" → "Compressed (zipped) folder"

**On Mac**:
- Right-click the `pdf-editor-app` folder
- Select "Compress pdf-editor-app"

**On Linux**:
```bash
zip -r pdf-editor-app.zip pdf-editor-app/