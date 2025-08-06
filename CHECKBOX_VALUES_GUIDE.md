# PDF Checkbox & Radio Button Values Guide

## ✅ What's New

The PDF Field Extractor now shows the **exact values** needed to mark checkboxes and radio buttons when filling PDFs programmatically.

## 🎯 Key Findings

### Common Checkbox Values

1. **Unit Type Checkboxes** (Apt/Ste/Flr)
   - `"APT"` = Check Apartment box
   - `"STE"` = Check Suite box  
   - `"FLR"` = Check Floor box
   - `"Off"` or empty = Uncheck

2. **Yes/No Checkboxes**
   - `"Y"` or `"Yes"` = Check Yes
   - `"N"` or `"No"` = Check No
   - `"Off"` or empty = Uncheck

3. **Generic Checkboxes**
   - `"1"`, `"X"`, or specific value = Check
   - `"Off"` or empty = Uncheck

## 📋 How to Use

### In the Web App

1. Upload any PDF form
2. Click "Extract Fields"
3. Look for the **"CHECKBOX/RADIO VALUE GUIDE"** section
4. Each checkbox field shows:
   - The exact value to check it
   - Alternative values (if any)
   - How to uncheck (always "Off")

### Example Output

```
form1[0].#subform[0].P1_checkbox6c_Unit[0]
  → To check/select: Use value "APT"
  → To uncheck: Use value "Off" or leave empty

form1[0].#subform[0].Pt1Line3_YN[0]
  → To check/select: Use value "Y"
  → To uncheck: Use value "Off" or leave empty
```

## 🔧 For Developers

When filling PDFs programmatically (using pdftk, pdf-lib, etc.):

```javascript
// Example with pdftk FDF format
fieldValues = {
  "P1_checkbox6c_Unit[0]": "APT",     // Checks Apartment
  "P1_checkbox6c_Unit[1]": "Off",     // Unchecks Suite
  "Pt1Line3_YN[0]": "Y",              // Checks Yes
  "Pt1Line3_YN[1]": "Off"             // Unchecks No
}
```

## ⚠️ Important Notes

1. **Case Sensitive**: Use exact values (`"APT"` not `"apt"`)
2. **"Off" is Universal**: Always use `"Off"` to uncheck
3. **Radio Groups**: Only one option in a group should be checked
4. **State Options**: The app shows ALL possible values from `FieldStateOption`

## 🎨 Visual Indicators

The enhanced app now includes:
- ☑️ Icon for checkbox fields in the breakdown
- Clear value guide for each checkbox
- Tooltips showing example values
- Dedicated section for checkbox/radio values

## 💡 Tips

- If a checkbox doesn't check, verify the exact value using this tool
- Some PDFs use unusual values like "2e", "2f" for options
- The value "Off" is built into the PDF standard for unchecked state
- Leave field empty or use "Off" - both work for unchecking

## 🚀 Quick Test

Run the included test script to see examples:

```bash
./test_checkbox_values.sh
```

This will show real checkbox values from USCIS forms (I-90, I-485) demonstrating the different value patterns.