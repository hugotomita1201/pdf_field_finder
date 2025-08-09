const fs = require('fs').promises;
const pdf = require('pdf-parse');
const { PDFDocument } = require('pdf-lib');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

/**
 * Extract field information along with their corresponding labels/text
 * @param {string} pdfPath - Path to the PDF file
 * @returns {Object} Enhanced field information with labels
 */
async function extractFieldsWithLabels(pdfPath) {
  try {
    // Get basic field data using pdftk
    const fieldData = await extractFieldsWithPdftk(pdfPath);
    
    // Extract text content from PDF
    const textContent = await extractTextContent(pdfPath);
    
    // Match fields with their labels
    const enhancedFields = matchFieldsWithLabels(fieldData, textContent);
    
    return enhancedFields;
  } catch (error) {
    throw new Error(`Failed to extract fields with labels: ${error.message}`);
  }
}

/**
 * Extract fields using pdftk (existing functionality)
 */
async function extractFieldsWithPdftk(pdfPath) {
  const { stdout } = await execAsync(`pdftk "${pdfPath}" dump_data_fields`);
  
  const fields = [];
  const lines = stdout.split('\n');
  let currentField = {};
  
  for (const line of lines) {
    const trimmedLine = line.trim();
    
    if (trimmedLine === '---') {
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
      currentField.stateOptions.push(trimmedLine.substring(17).trim());
    }
  }
  
  if (currentField.name) {
    fields.push(currentField);
  }
  
  return fields;
}

/**
 * Extract text content from PDF with positional information
 */
async function extractTextContent(pdfPath) {
  try {
    const dataBuffer = await fs.readFile(pdfPath);
    const data = await pdf(dataBuffer);
    
    // Split text into lines and process
    const lines = data.text.split('\n');
    const textElements = [];
    
    // Process each line to identify potential labels
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line) {
        // Look for common label patterns - expanded detection
        const isLikelyLabel = 
          line.endsWith(':') || 
          line.endsWith('?') ||
          line.includes('Name') || 
          line.includes('Address') || 
          line.includes('Date') ||
          line.includes('Phone') ||
          line.includes('Email') ||
          line.includes('Number') ||
          line.includes('Code') ||
          line.includes('Country') ||
          line.includes('State') ||
          line.includes('City') ||
          line.includes('ZIP') ||
          line.includes('Yes') ||
          line.includes('No') ||
          line.includes('Type') ||
          line.includes('Status') ||
          line.includes('Application') ||
          line.includes('Applicant') ||
          line.includes('Beneficiary') ||
          line.includes('Petitioner') ||
          line.includes('Employer') ||
          line.includes('Form') ||
          line.includes('Part') ||
          line.includes('Section') ||
          line.includes('Information') ||
          line.includes('Select') ||
          line.includes('Check') ||
          line.includes('Mark') ||
          line.includes('Indicate') ||
          /^\d+\./.test(line) || // Numbered items (1. 2. etc)
          /^[A-Z]\./.test(line) || // Lettered items (A. B. etc)
          /^\([a-z]\)/.test(line) || // Parenthetical items ((a) (b) etc)
          /^Part \d+/i.test(line) || // Part references
          /^Section \d+/i.test(line) || // Section references
          /^Item \d+/i.test(line); // Item references
        
        textElements.push({
          text: line,
          lineNumber: i,
          isLikelyLabel: isLikelyLabel
        });
      }
    }
    
    return {
      fullText: data.text,
      textElements: textElements,
      pages: data.numpages
    };
  } catch (error) {
    console.error('Error extracting text content:', error);
    return {
      fullText: '',
      textElements: [],
      pages: 0
    };
  }
}

/**
 * Match fields with their corresponding labels using various heuristics
 */
function matchFieldsWithLabels(fields, textContent) {
  const enhancedFields = [];
  
  for (const field of fields) {
    let matchedLabel = null;
    let confidence = 0;
    
    // Try different matching strategies
    
    // Strategy 1: Look for field name patterns in text
    const fieldNameParts = parseFieldName(field.name);
    
    // Strategy 2: Search for exact or partial matches in text
    for (const element of textContent.textElements) {
      if (!element.isLikelyLabel) continue;
      
      const similarity = calculateSimilarity(fieldNameParts, element.text);
      if (similarity > confidence) {
        confidence = similarity;
        matchedLabel = element.text;
      }
    }
    
    // Strategy 3: Use common patterns based on field type and name
    if (!matchedLabel || confidence < 0.5) {
      const inferredLabel = inferLabelFromFieldName(field.name, field.type);
      if (inferredLabel && inferredLabel !== field.name) {
        matchedLabel = inferredLabel;
        confidence = 0.7; // Medium confidence for inferred labels
      }
    }
    
    // If still no good label found, don't just return the field name
    if (!matchedLabel || matchedLabel === field.name) {
      matchedLabel = null;
      confidence = 0;
    }
    
    enhancedFields.push({
      ...field,
      label: matchedLabel,
      labelConfidence: confidence,
      fieldNameParts: fieldNameParts
    });
  }
  
  return enhancedFields;
}

/**
 * Parse field name to extract meaningful parts
 */
function parseFieldName(fieldName) {
  // Remove common prefixes and suffixes
  let cleanName = fieldName
    .replace(/^form\[?\d*\]?\.?/i, '')
    .replace(/\[?\d+\]?$/g, '')
    .replace(/^P\d+\./i, '')
    .replace(/^Pt\d+/i, '')
    .replace(/_/g, ' ')
    .replace(/\./g, ' ');
  
  // Extract line/section information
  const lineMatch = cleanName.match(/Line([A-Z0-9]+)/i);
  const sectionMatch = cleanName.match(/Section([A-Z0-9]+)/i);
  
  // Split by camelCase and other patterns
  const words = cleanName
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .split(/[\s_\-\.]+/)
    .filter(w => w.length > 0);
  
  return {
    original: fieldName,
    cleaned: cleanName,
    words: words,
    line: lineMatch ? lineMatch[1] : null,
    section: sectionMatch ? sectionMatch[1] : null
  };
}

/**
 * Calculate similarity between field name parts and text
 */
function calculateSimilarity(fieldNameParts, text) {
  const textLower = text.toLowerCase();
  let matchScore = 0;
  let totalWords = fieldNameParts.words.length;
  
  if (totalWords === 0) return 0;
  
  for (const word of fieldNameParts.words) {
    const wordLower = word.toLowerCase();
    
    // Exact word match
    if (textLower.includes(wordLower)) {
      matchScore += 1;
    }
    // Partial match (at least 3 characters)
    else if (wordLower.length >= 3) {
      for (let i = 3; i <= wordLower.length; i++) {
        const substr = wordLower.substring(0, i);
        if (textLower.includes(substr)) {
          matchScore += i / wordLower.length;
          break;
        }
      }
    }
  }
  
  return matchScore / totalWords;
}

/**
 * Infer label from field name using common patterns
 */
function inferLabelFromFieldName(fieldName, fieldType) {
  const patterns = {
    // Personal Information
    'FirstName': 'First Name',
    'LastName': 'Last Name',
    'MiddleName': 'Middle Name',
    'FullName': 'Full Name',
    'DOB': 'Date of Birth',
    'DateOfBirth': 'Date of Birth',
    'SSN': 'Social Security Number',
    'TaxID': 'Tax ID Number',
    'EmployerID': 'Employer ID Number',
    
    // Contact Information
    'Email': 'Email Address',
    'Phone': 'Phone Number',
    'Mobile': 'Mobile Number',
    'Fax': 'Fax Number',
    'Address': 'Address',
    'Street': 'Street Address',
    'City': 'City',
    'State': 'State',
    'Province': 'Province',
    'PostalCode': 'Postal Code',
    'ZipCode': 'ZIP Code',
    'Country': 'Country',
    
    // Form specific
    'Signature': 'Signature',
    'Date': 'Date',
    'Checkbox': 'Checkbox Selection',
    'YesNo': 'Yes/No Selection',
    
    // Application specific
    'ApplicantName': 'Name of Primary Applicant',
    'BeneficiaryName': 'Beneficiary Name',
    'PetitionerName': 'Petitioner Name',
    'EmployerName': 'Employer Name',
    'JobTitle': 'Job Title',
    'Occupation': 'Occupation',
    'Department': 'Department',
    'AppType': 'Application Type',
    'ApplicationType': 'Application Type',
    
    // Document specific
    'CaseNumber': 'Case Number',
    'ReceiptNumber': 'Receipt Number',
    'FileNumber': 'File Number',
    'AlienNumber': 'Alien Registration Number',
    'PassportNumber': 'Passport Number',
    'VisaNumber': 'Visa Number'
  };
  
  // Check for exact matches
  for (const [pattern, label] of Object.entries(patterns)) {
    if (fieldName.toLowerCase().includes(pattern.toLowerCase())) {
      return label;
    }
  }
  
  // Check for line references (e.g., Line5A becomes "Line 5A")
  const lineMatch = fieldName.match(/Line([A-Z0-9]+)/i);
  if (lineMatch) {
    return `Line ${lineMatch[1]}`;
  }
  
  // Check for part references (e.g., Part2 becomes "Part 2")
  const partMatch = fieldName.match(/Part(\d+)/i);
  if (partMatch) {
    return `Part ${partMatch[1]}`;
  }
  
  // Special handling for CB_AppType fields
  if (fieldName.includes('CB_AppType')) {
    return 'Application Type Selection';
  }
  
  // For checkboxes, try to extract meaningful text but avoid returning just the field name
  if (fieldType === 'Button' && (fieldName.includes('CB') || fieldName.includes('Check'))) {
    // Extract the meaningful part after CB_ or Check_
    let cleanedName = fieldName
      .replace(/^.*CB_/i, '')
      .replace(/^.*Check_/i, '')
      .replace(/\[\d+\]$/g, '') // Remove array indices
      .replace(/_/g, ' ')
      .trim();
    
    // Only return if we extracted something meaningful
    if (cleanedName && cleanedName !== fieldName && cleanedName.length > 2) {
      // Add context for common checkbox patterns
      if (cleanedName.toLowerCase().includes('yes') || cleanedName.toLowerCase().includes('no')) {
        return 'Yes/No Selection';
      }
      return cleanedName + ' Selection';
    }
  }
  
  return null;
}

module.exports = { 
  extractFieldsWithLabels,
  extractFieldsWithPdftk,
  extractTextContent,
  matchFieldsWithLabels
};