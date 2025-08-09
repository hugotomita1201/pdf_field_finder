// DOM Elements
const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');
const browseBtn = document.getElementById('browseBtn');
const fileInfo = document.getElementById('fileInfo');
const extractBtn = document.getElementById('extractBtn');
const removeFileBtn = document.getElementById('removeFile');
const loading = document.getElementById('loading');
const results = document.getElementById('results');
const error = document.getElementById('error');
const resetBtn = document.getElementById('resetBtn');

// Tab Elements
const tabButtons = document.querySelectorAll('.tab-btn');
const tabPanes = document.querySelectorAll('.tab-pane');

// Output Elements
const formattedOutput = document.getElementById('formattedOutput');
const rawOutput = document.getElementById('rawOutput');
const jsonOutput = document.getElementById('jsonOutput');
const fieldCount = document.getElementById('fieldCount');
const fileSize = document.getElementById('fileSize');

// Current file and results
let currentFile = null;
let currentResults = null;

// API Base URL - use config or fallback to localhost for development
const API_URL = window.APP_CONFIG?.API_URL || 
    (window.location.hostname === 'localhost' ? 'http://localhost:3002' : 'https://pdf-field-finder-backend.onrender.com');

// Initialize event listeners
function init() {
    // File upload events
    browseBtn.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', handleFileSelect);
    removeFileBtn.addEventListener('click', removeFile);
    extractBtn.addEventListener('click', extractFields);
    resetBtn.addEventListener('click', reset);
    
    // Drag and drop events
    dropZone.addEventListener('click', () => fileInput.click());
    dropZone.addEventListener('dragover', handleDragOver);
    dropZone.addEventListener('dragleave', handleDragLeave);
    dropZone.addEventListener('drop', handleDrop);
    
    // Tab events
    tabButtons.forEach(btn => {
        btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });
    
    // Copy and download buttons
    document.getElementById('copyFormatted').addEventListener('click', () => copyToClipboard(formattedOutput.value));
    document.getElementById('copyRaw').addEventListener('click', () => copyToClipboard(rawOutput.value));
    document.getElementById('copyJson').addEventListener('click', () => copyToClipboard(jsonOutput.value));
    document.getElementById('downloadTxt').addEventListener('click', downloadText);
    document.getElementById('downloadJson').addEventListener('click', downloadJSON);
    
    // Error close button
    document.getElementById('errorClose').addEventListener('click', () => {
        error.style.display = 'none';
    });
}

// Handle file selection
function handleFileSelect(e) {
    const file = e.target.files[0];
    if (file && file.type === 'application/pdf') {
        setFile(file);
    } else if (file) {
        showError('Please select a PDF file');
    }
}

// Handle drag over
function handleDragOver(e) {
    e.preventDefault();
    dropZone.classList.add('drag-over');
}

// Handle drag leave
function handleDragLeave(e) {
    e.preventDefault();
    dropZone.classList.remove('drag-over');
}

// Handle file drop
function handleDrop(e) {
    e.preventDefault();
    dropZone.classList.remove('drag-over');
    
    const file = e.dataTransfer.files[0];
    if (file && file.type === 'application/pdf') {
        setFile(file);
    } else if (file) {
        showError('Please drop a PDF file');
    }
}

// Set current file
function setFile(file) {
    currentFile = file;
    
    // Update UI
    dropZone.style.display = 'none';
    fileInfo.style.display = 'block';
    
    // Display file info
    document.querySelector('.file-name').textContent = file.name;
    document.querySelector('.file-size').textContent = formatFileSize(file.size);
    
    // Reset any previous results
    results.style.display = 'none';
    error.style.display = 'none';
}

// Remove current file
function removeFile() {
    currentFile = null;
    fileInput.value = '';
    dropZone.style.display = 'block';
    fileInfo.style.display = 'none';
}

// Extract fields from PDF
async function extractFields() {
    if (!currentFile) return;
    
    // Show loading
    loading.style.display = 'block';
    results.style.display = 'none';
    error.style.display = 'none';
    
    // Create form data
    const formData = new FormData();
    formData.append('pdf', currentFile);
    
    try {
        const response = await fetch(`${API_URL}/api/extract`, {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        
        if (response.ok && data.success) {
            displayResults(data);
        } else {
            showError(data.error || 'Failed to extract fields');
        }
    } catch (err) {
        showError('Failed to connect to server. Is the backend running?');
        console.error(err);
    } finally {
        loading.style.display = 'none';
    }
}

// Display extraction results
function displayResults(data) {
    currentResults = data;
    
    // Update stats
    fieldCount.textContent = `${data.totalFields} fields`;
    fileSize.textContent = `${data.fileSizeKB} KB`;
    
    // Populate outputs - use enhanced text output if available
    formattedOutput.value = data.enhancedTextOutput || data.textOutput || '';
    
    // Create raw field names output
    const fieldNames = data.rawFields.map(f => f.name).join('\n');
    rawOutput.value = fieldNames;
    
    // Create enhanced JSON output with labels
    let jsonData;
    if (data.enhancedFields && data.enhancedFields.length > 0) {
        // Create a clean JSON structure with labels
        jsonData = data.enhancedFields.map(field => ({
            type: field.type,
            name: field.name,
            label: field.label || 'Unknown',
            labelConfidence: field.labelConfidence !== undefined ? 
                Math.round(field.labelConfidence * 100) + '%' : 'N/A',
            flags: field.flags || '1',
            justification: field.justification || 'Left',
            maxLength: field.maxLength || null,
            value: field.value || '',
            options: field.stateOptions || field.options || null,
            checkboxValues: field.stateOptions ? {
                toCheck: (field.stateOptions || []).filter(v => v !== 'Off'),
                toUncheck: 'Off'
            } : null
        }));
    } else {
        // Fallback to original fields structure
        jsonData = data.fields;
    }
    
    jsonOutput.value = JSON.stringify(jsonData, null, 2);
    
    // Display field type breakdown
    displayBreakdown(data.fields.byType);
    
    // Show results section
    results.style.display = 'block';
    
    // Scroll to results
    results.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// Display field type breakdown
function displayBreakdown(byType) {
    const container = document.querySelector('.type-stats');
    container.innerHTML = '';
    
    for (const [type, fields] of Object.entries(byType)) {
        if (fields.length > 0) {
            const stat = document.createElement('div');
            stat.className = 'type-stat';
            
            // Add special highlighting for checkboxes
            let typeName = type.charAt(0).toUpperCase() + type.slice(1);
            if (type === 'checkbox') {
                typeName = '☑️ ' + typeName;
            }
            
            stat.innerHTML = `
                <span class="type-name">${typeName}</span>
                <span class="type-count">${fields.length}</span>
            `;
            
            // Add tooltip for checkbox fields showing value info
            if (type === 'checkbox' && fields.length > 0) {
                const sample = fields[0];
                if (sample.checkboxValues) {
                    stat.title = `Example values: ${sample.checkboxValues.toCheck.join(', ')} (to check), "Off" (to uncheck)`;
                }
            }
            
            container.appendChild(stat);
        }
    }
}

// Switch tabs
function switchTab(tabName) {
    // Update active tab button
    tabButtons.forEach(btn => {
        if (btn.dataset.tab === tabName) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
    
    // Show corresponding tab pane
    tabPanes.forEach(pane => {
        if (pane.id === tabName) {
            pane.style.display = 'block';
        } else {
            pane.style.display = 'none';
        }
    });
}

// Copy to clipboard
async function copyToClipboard(text) {
    try {
        await navigator.clipboard.writeText(text);
        showToast('Copied to clipboard!');
    } catch (err) {
        showError('Failed to copy to clipboard');
    }
}

// Download as text file
function downloadText() {
    if (!currentResults) return;
    
    // Use enhanced text output if available, otherwise fall back to regular
    const textContent = currentResults.enhancedTextOutput || currentResults.textOutput;
    const blob = new Blob([textContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentFile.name.replace('.pdf', '')}_fields_with_labels.txt`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Download started!');
}

// Download as JSON file
function downloadJSON() {
    if (!currentResults) return;
    
    // Use enhanced fields if available, otherwise fall back to regular fields
    let jsonData;
    if (currentResults.enhancedFields && currentResults.enhancedFields.length > 0) {
        jsonData = JSON.stringify(currentResults.enhancedFields.map(field => ({
            type: field.type,
            name: field.name,
            label: field.label || 'Unknown',
            labelConfidence: field.labelConfidence !== undefined ? 
                Math.round(field.labelConfidence * 100) + '%' : 'N/A',
            flags: field.flags || '1',
            justification: field.justification || 'Left',
            maxLength: field.maxLength || null,
            value: field.value || '',
            options: field.stateOptions || field.options || null,
            checkboxValues: field.stateOptions ? {
                toCheck: (field.stateOptions || []).filter(v => v !== 'Off'),
                toUncheck: 'Off'
            } : null
        })), null, 2);
    } else {
        jsonData = JSON.stringify(currentResults.fields, null, 2);
    }
    
    const blob = new Blob([jsonData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentFile.name.replace('.pdf', '')}_fields_with_labels.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Download started!');
}

// Reset everything
function reset() {
    currentFile = null;
    currentResults = null;
    fileInput.value = '';
    dropZone.style.display = 'block';
    fileInfo.style.display = 'none';
    results.style.display = 'none';
    error.style.display = 'none';
}

// Show error message
function showError(message) {
    document.getElementById('errorText').textContent = message;
    error.style.display = 'flex';
}

// Show toast notification
function showToast(message) {
    // Create toast element
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    toast.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: #48bb78;
        color: white;
        padding: 12px 24px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 1000;
        animation: slideUp 0.3s ease;
    `;
    
    document.body.appendChild(toast);
    
    // Remove after 3 seconds
    setTimeout(() => {
        toast.style.animation = 'slideDown 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Format file size
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

// Add animation styles
const style = document.createElement('style');
style.textContent = `
    @keyframes slideUp {
        from {
            transform: translateY(100%);
            opacity: 0;
        }
        to {
            transform: translateY(0);
            opacity: 1;
        }
    }
    
    @keyframes slideDown {
        from {
            transform: translateY(0);
            opacity: 1;
        }
        to {
            transform: translateY(100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

// Initialize app when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

// Log any custom element conflicts (likely from browser extensions)
if (window.customElements) {
    const originalDefine = customElements.define;
    customElements.define = function(name, constructor, options) {
        try {
            originalDefine.call(this, name, constructor, options);
        } catch (e) {
            if (!e.message.includes('mce-autosize-textarea')) {
                console.warn('Custom element conflict (likely from extension):', e.message);
            }
        }
    };
}