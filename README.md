# PDF Field Extractor

A simple web application for extracting field names from PDF forms. Upload any PDF with form fields and get a complete list of field names in text format.

## Features

- 📄 **PDF Upload**: Drag-and-drop or browse to upload PDF files
- 🔍 **Field Extraction**: Extracts all form field names using `pdftk`
- 📋 **Multiple Views**: 
  - Formatted text report with field details
  - Simple list of field names for copy/paste
  - JSON data for programmatic use
- 💾 **Export Options**: Download as .txt or .json file
- 📊 **Field Statistics**: Shows field count and type breakdown
- 🎨 **Clean UI**: Modern, responsive interface

## Prerequisites

- **Node.js** (v14 or higher)
- **pdftk** - Required for PDF field extraction
  
  Install pdftk:
  ```bash
  # macOS
  brew install pdftk-java
  
  # Ubuntu/Debian
  sudo apt-get install pdftk
  
  # Windows
  # Download from https://www.pdflabs.com/tools/pdftk-the-pdf-toolkit/
  ```

## Installation

1. Navigate to the backend directory and install dependencies:
   ```bash
   cd backend
   npm install
   ```

2. Start the backend server:
   ```bash
   npm start
   ```
   The server will run on http://localhost:3002

3. Open the frontend:
   - Open `frontend/index.html` in your browser
   - Or serve it with a simple HTTP server:
     ```bash
     cd frontend
     python -m http.server 8000
     # Then open http://localhost:8000
     ```

## Usage

1. **Upload a PDF**: Drag and drop a PDF file or click to browse
2. **Extract Fields**: Click the "Extract Fields" button
3. **View Results**: 
   - **Formatted View**: Complete field information with types and properties
   - **Field Names Only**: Simple list of field names
   - **JSON Data**: Structured data for developers
4. **Export**: Download the results as .txt or .json file

## Output Format

### Text Format (.txt)
```
=================================
     PDF FIELD EXTRACTION REPORT
=================================

Total Fields: 125
Extraction Date: 2024-01-15T10:30:00.000Z

---------------------------------
         FIELD LISTING
---------------------------------

[TEXT FIELDS] (85 fields)
────────────────────────────────

Field Name: form1[0].#subform[0].Pt1Line1_FamilyName[0]
  Max Length: 35

Field Name: form1[0].#subform[0].Pt1Line2_GivenName[0]
  Max Length: 25

...
```

### JSON Format (.json)
```json
{
  "byPart": {
    "Part 1": [...],
    "Part 2": [...]
  },
  "byType": {
    "text": [...],
    "checkbox": [...],
    "button": [...]
  },
  "all": [
    {
      "name": "form1[0].#subform[0].Pt1Line1_FamilyName[0]",
      "type": "Text",
      "value": "",
      "maxLength": 35
    }
  ]
}
```

## API Endpoint

The backend provides a single endpoint:

### POST /api/extract
Upload a PDF file to extract its field names.

**Request:**
- Method: POST
- Content-Type: multipart/form-data
- Body: PDF file

**Response:**
```json
{
  "success": true,
  "filename": "form.pdf",
  "totalFields": 125,
  "fileSizeKB": 2048,
  "fields": { ... },
  "rawFields": [ ... ],
  "textOutput": "...",
  "hasFields": true
}
```

## Supported PDF Types

Works with any PDF that contains form fields, including:
- USCIS forms (I-129, I-485, I-90, etc.)
- Tax forms
- Application forms
- Government forms
- Any fillable PDF

## Troubleshooting

### "pdftk is not installed"
Make sure pdftk is installed and available in your system PATH.

### No fields found
The PDF might be:
- Flattened (fields converted to static content)
- A scanned document without form fields
- A regular PDF without fillable fields

### CORS errors
Make sure the backend server is running on port 3002.

## License

MIT