#!/bin/bash

echo "======================================"
echo "   PDF CHECKBOX VALUE TEST"
echo "======================================"
echo ""
echo "Testing I-90 form checkbox values..."
echo ""

# Extract and show just the checkbox values for unit fields
echo "Unit Type Checkboxes in I-90:"
echo "------------------------------"

curl -s -X POST http://localhost:3002/api/extract \
  -F "pdf=@/Users/hugo/Desktop/WATANABE/pdf-combiner-app/i129-pdf-filler/backend/assets/forms/i-90.pdf" \
  | python3 -c "
import sys, json

data = json.load(sys.stdin)
fields = data['fields']['all']

# Find unit checkboxes
unit_fields = [f for f in fields if 'Unit' in f['name'] and f.get('stateOptions')]

print('\\nFound', len(unit_fields), 'unit checkbox fields:\\n')

for field in unit_fields:
    print(f\"Field: {field['name']}\")
    if field.get('checkboxValues'):
        values = field['checkboxValues']['toCheck']
        if values:
            print(f\"  ✓ Value to check: '{values[0]}'\" )
            if values[0] == 'APT':
                print('     (This marks Apartment)')
            elif values[0] == 'STE':
                print('     (This marks Suite)')
            elif values[0] == 'FLR':
                print('     (This marks Floor)')
    print(f\"  ✗ Value to uncheck: 'Off' or leave empty\")
    print()
"

echo ""
echo "======================================"
echo "   YES/NO CHECKBOXES"
echo "======================================"
echo ""

curl -s -X POST http://localhost:3002/api/extract \
  -F "pdf=@/Users/hugo/Desktop/WATANABE/pdf-combiner-app/i129-pdf-filler/backend/assets/forms/i-485.pdf" \
  | python3 -c "
import sys, json

data = json.load(sys.stdin)
fields = data['fields']['all']

# Find Yes/No checkboxes
yn_fields = [f for f in fields if '_YN' in f['name'] and f.get('stateOptions')][:5]

print('Sample Yes/No checkboxes from I-485:\\n')

for field in yn_fields:
    print(f\"Field: {field['name']}\")
    if field.get('checkboxValues'):
        values = field['checkboxValues']['toCheck']
        if values:
            for v in values:
                if v in ['Y', 'Yes', '1']:
                    print(f\"  ✓ '{v}' = Yes/Checked\")
                elif v in ['N', 'No', '0']:
                    print(f\"  ✓ '{v}' = No/Checked\")
                else:
                    print(f\"  ✓ '{v}' = Selected\")
    print()
"

echo ""
echo "======================================"
echo "TIP: When filling PDFs programmatically:"
echo "- Use the exact values shown above"
echo "- 'Off' always means unchecked"
echo "- Case matters (APT not apt)"
echo "======================================"