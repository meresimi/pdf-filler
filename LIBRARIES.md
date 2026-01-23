# Required Libraries

This document explains how to obtain the required JavaScript libraries for the PDF Editor app.

## Libraries Needed

### 1. PDF.js (for viewing PDFs)

**Purpose**: Renders PDF pages on canvas for viewing

**Download**: 
- Visit: https://github.com/mozilla/pdf.js/releases
- Download the latest stable release (e.g., pdf.js-3.11.174-dist.zip)
- Extract the archive

**Files to copy to `www/lib/`**:
- `build/pdf.min.js` → `www/lib/pdf.min.js`
- `build/pdf.worker.min.js` → `www/lib/pdf.worker.min.js`

**Alternative - CDN**:
```html
<script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"></script>