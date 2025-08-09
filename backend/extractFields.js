const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);
const fs = require('fs').promises;
const { extractFieldsWithLabels } = require('./extractFieldsWithLabels');

/**
 * Extract field names and information from a PDF using pdftk
 * @param {string} pdfPath - Path to the PDF file
 * @returns {Object} Extracted field information
 */
async function extractPdfFields(pdfPath) {
  try {
    // Verify file exists
    await fs.access(pdfPath);
    
    // Get file stats
    const stats = await fs.stat(pdfPath);
    const fileSizeKB = Math.round(stats.size / 1024);
    
    // Run pdftk to extract field data
    console.log('Running pdftk to extract fields...');
    const { stdout, stderr } = await execAsync(`pdftk "${pdfPath}" dump_data_fields`);
    
    if (stderr && !stderr.includes('Warning')) {
      console.error('pdftk stderr:', stderr);
    }
    
    // Parse the output
    const fields = parseFieldData(stdout);
    
    // Generate formatted text output
    const textOutput = generateTextOutput(fields);
    
    // Try to extract fields with labels
    let enhancedFields = [];
    try {
      enhancedFields = await extractFieldsWithLabels(pdfPath);
    } catch (error) {
      console.log('Could not extract field labels:', error.message);
      // Fall back to fields without labels
      enhancedFields = fields.map(field => ({
        ...field,
        label: 'Unknown',
        labelConfidence: 0
      }));
    }
    
    // Organize fields by section/part (now with enhanced fields)
    const organizedFields = organizeFields(enhancedFields);
    
    // Generate enhanced text output with labels
    const enhancedTextOutput = generateEnhancedTextOutput(enhancedFields);
    
    return {
      totalFields: fields.length,
      fileSizeKB,
      fields: organizedFields,
      rawFields: fields,
      enhancedFields: enhancedFields,
      textOutput,
      enhancedTextOutput,
      hasFields: fields.length > 0
    };
    
  } catch (error) {
    if (error.code === 'ENOENT' && error.message.includes('pdftk')) {
      throw new Error('pdftk is not installed. Please install pdftk to use this tool.');
    }
    throw new Error(`Failed to extract fields: ${error.message}`);
  }
}

/**
 * Parse pdftk output into structured field data
 */
function parseFieldData(output) {
  const fields = [];
  const lines = output.split('\n');
  let currentField = {};
  
  for (const line of lines) {
    const trimmedLine = line.trim();
    
    if (trimmedLine === '---') {
      // Field separator - save current field if it has a name
      if (currentField.name) {
        fields.push(currentField);
      }
      currentField = {};
      continue;
    }
    
    if (trimmedLine.startsWith('FieldName:')) {
      currentField.name = trimmedLine.substring(10).trim();
    } else if (trimmedLine.startsWith('FieldType:')) {
      currentField.type = trimmedLine.substring(10).trim();
    } else if (trimmedLine.startsWith('FieldFlags:')) {
      currentField.flags = trimmedLine.substring(11).trim();
    } else if (trimmedLine.startsWith('FieldValue:')) {
      currentField.value = trimmedLine.substring(11).trim();
    } else if (trimmedLine.startsWith('FieldJustification:')) {
      currentField.justification = trimmedLine.substring(19).trim();
    } else if (trimmedLine.startsWith('FieldMaxLength:')) {
      currentField.maxLength = parseInt(trimmedLine.substring(15).trim());
    } else if (trimmedLine.startsWith('FieldStateOption:')) {
      if (!currentField.stateOptions) {
        currentField.stateOptions = [];
      }
      const option = trimmedLine.substring(17).trim();
      // Keep ALL options including 'Off' to show complete state
      currentField.stateOptions.push(option);
      
      // Also maintain the filtered options for backward compatibility
      if (!currentField.options) {
        currentField.options = [];
      }
      if (option && option !== 'Off') {
        currentField.options.push(option);
      }
    }
  }
  
  // Don't forget the last field
  if (currentField.name) {
    fields.push(currentField);
  }
  
  return fields;
}

/**
 * Organize fields by section/part based on field naming patterns
 */
function organizeFields(fields) {
  const organized = {
    byPart: {},
    byType: {
      text: [],
      checkbox: [],
      button: [],
      choice: [],
      signature: [],
      other: []
    },
    all: []
  };
  
  for (const field of fields) {
    // Organize by part (if field name contains Pt1, Pt2, etc.)
    const partMatch = field.name.match(/Pt(\d+)/);
    if (partMatch) {
      const part = `Part ${partMatch[1]}`;
      if (!organized.byPart[part]) {
        organized.byPart[part] = [];
      }
      organized.byPart[part].push(field);
    } else {
      if (!organized.byPart['Other']) {
        organized.byPart['Other'] = [];
      }
      organized.byPart['Other'].push(field);
    }
    
    // Organize by type
    switch (field.type) {
      case 'Text':
        organized.byType.text.push(field);
        break;
      case 'Button':
        if (field.name.toLowerCase().includes('checkbox') || 
            field.name.includes('CB') || 
            field.name.includes('_YN')) {
          organized.byType.checkbox.push(field);
        } else {
          organized.byType.button.push(field);
        }
        break;
      case 'Choice':
        organized.byType.choice.push(field);
        break;
      case 'Sig':
        organized.byType.signature.push(field);
        break;
      default:
        organized.byType.other.push(field);
    }
    
    // Add to all fields list with complete info including checkbox values
    organized.all.push({
      name: field.name,
      type: field.type,
      value: field.value || '',
      maxLength: field.maxLength,
      options: field.options,
      stateOptions: field.stateOptions,
      checkboxValues: field.stateOptions ? {
        toCheck: field.stateOptions.filter(v => v !== 'Off'),
        toUncheck: 'Off'
      } : undefined,
      label: field.label,
      labelConfidence: field.labelConfidence,
      flags: field.flags,
      justification: field.justification
    });
  }
  
  return organized;
}

/**
 * Generate enhanced text output with field labels
 */
function generateEnhancedTextOutput(fields) {
  let output = '=================================\n';
  output += '  PDF FIELD EXTRACTION WITH LABELS\n';
  output += '=================================\n\n';
  output += `Total Fields: ${fields.length}\n`;
  output += `Extraction Date: ${new Date().toISOString()}\n`;
  output += '\n---------------------------------\n';
  output += '      FIELDS WITH LABELS\n';
  output += '---------------------------------\n\n';
  
  // Group by type for better readability
  const byType = {};
  for (const field of fields) {
    const type = field.type || 'Unknown';
    if (!byType[type]) byType[type] = [];
    byType[type].push(field);
  }
  
  // Output each type section
  for (const [type, typeFields] of Object.entries(byType)) {
    output += `\n[${type.toUpperCase()} FIELDS] (${typeFields.length} fields)\n`;
    output += '─'.repeat(50) + '\n';
    
    for (const field of typeFields) {
      output += `\nField Name: ${field.name}\n`;
      
      // Add the label information
      if (field.label && field.label !== 'Unknown') {
        output += `  📝 Label: "${field.label}"`;
        if (field.labelConfidence !== undefined) {
          const confidencePercent = Math.round(field.labelConfidence * 100);
          output += ` (${confidencePercent}% confidence)\n`;
        } else {
          output += '\n';
        }
      } else {
        output += `  📝 Label: Not identified\n`;
      }
      
      if (field.value) {
        output += `  Current Value: ${field.value}\n`;
      }
      
      if (field.maxLength) {
        output += `  Max Length: ${field.maxLength}\n`;
      }
      
      // Enhanced checkbox/radio value display
      if (field.stateOptions && field.stateOptions.length > 0) {
        output += `  ✓ CHECKBOX/RADIO VALUES:\n`;
        for (const option of field.stateOptions) {
          if (option === 'Off') {
            output += `    • "${option}" = Unchecked/Unselected\n`;
          } else {
            output += `    • "${option}" = Checked/Selected\n`;
          }
        }
      }
      
      if (field.flags && field.flags !== '0') {
        output += `  Flags: ${field.flags}\n`;
      }
    }
  }
  
  output += '\n\n=================================\n';
  output += '       JSON FIELD MAPPING\n';
  output += '=================================\n\n';
  output += 'For programmatic use, here is the field mapping:\n\n';
  output += '[\n';
  for (let i = 0; i < fields.length; i++) {
    const field = fields[i];
    output += '  {\n';
    output += `    "fieldName": "${field.name}",\n`;
    output += `    "label": "${field.label || 'Unknown'}",\n`;
    output += `    "type": "${field.type}",\n`;
    if (field.maxLength) {
      output += `    "maxLength": ${field.maxLength},\n`;
    }
    if (field.stateOptions) {
      output += `    "options": ${JSON.stringify(field.stateOptions)},\n`;
    }
    output += `    "confidence": ${field.labelConfidence || 0}\n`;
    output += '  }' + (i < fields.length - 1 ? ',' : '') + '\n';
  }
  output += ']\n';
  
  return output;
}

/**
 * Generate formatted text output for download
 */
function generateTextOutput(fields) {
  let output = '=================================\n';
  output += '     PDF FIELD EXTRACTION REPORT\n';
  output += '=================================\n\n';
  output += `Total Fields: ${fields.length}\n`;
  output += `Extraction Date: ${new Date().toISOString()}\n`;
  output += '\n---------------------------------\n';
  output += '         FIELD LISTING\n';
  output += '---------------------------------\n\n';
  
  // Group by type for better readability
  const byType = {};
  for (const field of fields) {
    const type = field.type || 'Unknown';
    if (!byType[type]) byType[type] = [];
    byType[type].push(field);
  }
  
  // Output each type section
  for (const [type, typeFields] of Object.entries(byType)) {
    output += `\n[${type.toUpperCase()} FIELDS] (${typeFields.length} fields)\n`;
    output += '─'.repeat(50) + '\n';
    
    for (const field of typeFields) {
      output += `\nField Name: ${field.name}\n`;
      
      if (field.value) {
        output += `  Current Value: ${field.value}\n`;
      }
      
      if (field.maxLength) {
        output += `  Max Length: ${field.maxLength}\n`;
      }
      
      // Enhanced checkbox/radio value display
      if (field.stateOptions && field.stateOptions.length > 0) {
        output += `  ✓ CHECKBOX/RADIO VALUES:\n`;
        for (const option of field.stateOptions) {
          if (option === 'Off') {
            output += `    • "${option}" = Unchecked/Unselected\n`;
          } else if (option === 'Yes') {
            output += `    • "${option}" = Checked (Yes)\n`;
          } else if (option === 'No') {
            output += `    • "${option}" = Checked (No)\n`;
          } else if (option === 'Y' || option === '1') {
            output += `    • "${option}" = Checked/Selected\n`;
          } else {
            output += `    • "${option}" = Selected/Checked\n`;
          }
        }
      } else if (field.options && field.options.length > 0) {
        output += `  Options: ${field.options.join(', ')}\n`;
      }
      
      if (field.flags && field.flags !== '0') {
        output += `  Flags: ${field.flags}\n`;
      }
    }
  }
  
  output += '\n\n=================================\n';
  output += '     CHECKBOX/RADIO VALUE GUIDE\n';
  output += '=================================\n\n';
  
  // Add a dedicated section for checkboxes and radios with their values
  const checkboxFields = fields.filter(f => 
    (f.type === 'Button' && f.stateOptions && f.stateOptions.length > 0) ||
    (f.name && (f.name.includes('checkbox') || f.name.includes('CB') || 
     f.name.includes('_YN') || f.name.includes('RadioButton')))
  );
  
  if (checkboxFields.length > 0) {
    output += `Found ${checkboxFields.length} checkbox/radio fields:\n\n`;
    
    for (const field of checkboxFields) {
      output += `${field.name}\n`;
      if (field.stateOptions && field.stateOptions.length > 0) {
        const validValues = field.stateOptions.filter(v => v !== 'Off');
        if (validValues.length > 0) {
          output += `  → To check/select: Use value "${validValues[0]}"\n`;
          if (validValues.length > 1) {
            output += `  → Alternative values: ${validValues.slice(1).map(v => `"${v}"`).join(', ')}\n`;
          }
        }
        output += `  → To uncheck: Use value "Off" or leave empty\n`;
      }
      output += '\n';
    }
  } else {
    output += 'No checkbox or radio button fields found in this PDF.\n';
  }
  
  output += '\n=================================\n';
  output += '        FIELD NAME LIST\n';
  output += '  (For easy copy/paste)\n';
  output += '=================================\n\n';
  
  // Simple list of field names
  for (const field of fields) {
    output += `${field.name}\n`;
  }
  
  return output;
}

module.exports = { extractPdfFields };