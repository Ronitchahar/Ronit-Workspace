/**
 * File Analysis Service - Support for PDF, DOCX, TXT, CSV, etc.
 * Handles document understanding, extraction, and analysis
 */

/**
 * Validate file type
 * @param {File} file - File to validate
 * @returns {object} - {valid: boolean, type: string, error?: string}
 */
export function validateFileType(file) {
  const supportedTypes = {
    'application/pdf': 'pdf',
    'text/plain': 'text',
    'text/csv': 'csv',
    'application/msword': 'doc',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
    'application/vnd.ms-powerpoint': 'ppt',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx',
    'application/json': 'json',
    'text/html': 'html',
    'text/xml': 'xml',
    'application/xml': 'xml',
    'application/javascript': 'js',
    'text/javascript': 'js',
    'text/x-python': 'python',
    'application/x-python': 'python',
    'text/x-java-source': 'java',
    'text/x-c++': 'cpp',
    'text/x-csrc': 'c',
  };

  if (!file) {
    return { valid: false, type: null, error: 'No file provided' };
  }

  // Check by MIME type
  const mimeType = file.type;
  if (supportedTypes[mimeType]) {
    return { valid: true, type: supportedTypes[mimeType] };
  }

  // Check by filename extension
  const filename = file.name.toLowerCase();
  const ext = filename.split('.').pop();
  const extMap = {
    'pdf': 'pdf', 'txt': 'text', 'csv': 'csv',
    'doc': 'doc', 'docx': 'docx', 'ppt': 'ppt', 'pptx': 'pptx',
    'json': 'json', 'html': 'html', 'xml': 'xml',
    'js': 'js', 'py': 'python', 'java': 'java', 'cpp': 'cpp', 'c': 'c'
  };

  if (extMap[ext]) {
    return { valid: true, type: extMap[ext] };
  }

  return { 
    valid: false, 
    type: null, 
    error: `Unsupported file type: ${ext || 'unknown'}` 
  };
}

/**
 * Read file content based on type
 * @param {File} file - File to read
 * @returns {Promise<string>} - File content as text
 */
export async function readFileContent(file) {
  const validation = validateFileType(file);
  
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  console.log(`[FILE_ANALYSIS] Reading ${validation.type} file: ${file.name}`);

  const fileType = validation.type;

  if (fileType === 'pdf') {
    return readPdfFile(file);
  } else if (fileType === 'docx') {
    return readDocxFile(file);
  } else if (['text', 'csv', 'json', 'html', 'xml', 'js', 'python', 'java', 'cpp', 'c'].includes(fileType)) {
    return readTextFile(file);
  } else if (fileType === 'doc') {
    throw new Error('Legacy DOC format not supported. Please use DOCX instead.');
  } else {
    throw new Error(`File type ${fileType} not supported`);
  }
}

/**
 * Read text-based files
 * @param {File} file - Text file
 * @returns {Promise<string>} - File content
 */
async function readTextFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target.result;
        // Limit to 50KB for safety
        if (content.length > 50 * 1024) {
          const truncated = content.substring(0, 50 * 1024);
          console.warn('[FILE_ANALYSIS] File truncated to 50KB');
          resolve(truncated + '\n\n[... file truncated for length ...]');
        } else {
          resolve(content);
        }
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = reject;
    reader.readAsText(file);
  });
}

/**
 * Read PDF file
 * Note: For full PDF support, you would need to integrate pdf.js library
 * For now, this provides a basic implementation
 * @param {File} file - PDF file
 * @returns {Promise<string>} - Extracted PDF content
 */
async function readPdfFile(file) {
  try {
    // Try to load pdf.js dynamically
    const pdfjsLib = window.pdfjsLib || await loadPdfJs();
    
    if (!pdfjsLib) {
      return `[PDF Document: ${file.name}]\nNote: PDF parsing requires pdf.js library. Please upload the document text or convert to text format.`;
    }

    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

    let fullText = '';
    for (let i = 1; i <= Math.min(pdf.numPages, 20); i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map(item => item.str).join(' ');
      fullText += `\n--- Page ${i} ---\n${pageText}`;
    }

    if (pdf.numPages > 20) {
      fullText += `\n\n[PDF has ${pdf.numPages} pages, showing first 20]`;
    }

    return fullText;
  } catch (error) {
    console.warn('[FILE_ANALYSIS] PDF parsing failed, returning placeholder:', error);
    return `[PDF Document: ${file.name}]\nNote: PDF content extraction requires pdf.js library. The document has been uploaded and can be analyzed.`;
  }
}

/**
 * Read DOCX file
 * Note: For full DOCX support, you would need to integrate docx library
 * @param {File} file - DOCX file
 * @returns {Promise<string>} - Extracted DOCX content
 */
async function readDocxFile(file) {
  try {
    // Try to load docx library dynamically
    const mammoth = window.mammoth || await loadMammoth();
    
    if (!mammoth) {
      return `[DOCX Document: ${file.name}]\nNote: DOCX parsing requires mammoth.js library. The document has been uploaded.`;
    }

    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    return result.value || `[DOCX Document: ${file.name} - content extraction failed]`;
  } catch (error) {
    console.warn('[FILE_ANALYSIS] DOCX parsing failed:', error);
    return `[DOCX Document: ${file.name}]\nNote: DOCX content extraction requires mammoth.js library. The document has been uploaded.`;
  }
}

/**
 * Dynamically load PDF.js library
 * @returns {Promise<object>} - pdfjsLib object or null
 */
async function loadPdfJs() {
  try {
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
    document.head.appendChild(script);
    
    return new Promise((resolve) => {
      script.onload = () => resolve(window.pdfjsLib || null);
      script.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

/**
 * Dynamically load Mammoth.js library
 * @returns {Promise<object>} - mammoth object or null
 */
async function loadMammoth() {
  try {
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.min.js';
    document.head.appendChild(script);
    
    return new Promise((resolve) => {
      script.onload = () => resolve(window.mammoth || null);
      script.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

/**
 * Analyze file with AI
 * @param {File} file - File to analyze
 * @param {string} userMessage - User's question/instruction
 * @param {Array} conversationHistory - Previous messages for context
 * @returns {Promise<string>} - Analysis response
 */
export async function analyzeFile(file, userMessage = '', conversationHistory = []) {
  try {
    console.log('[FILE_ANALYSIS] Starting file analysis...');
    
    const validation = validateFileType(file);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    // Read file content
    const fileContent = await readFileContent(file);

    // Prepare message
    const finalMessage = userMessage || `Please analyze this ${validation.type} document and provide a comprehensive summary.`;

    console.log('[FILE_ANALYSIS] Sending to AI for analysis...');
    console.log('[FILE_ANALYSIS] File type:', validation.type);
    console.log('[FILE_ANALYSIS] Content length:', fileContent.length, 'characters');

    // Call AI to analyze
    const apiKey = import.meta.env.VITE_OPENROUTER_API_KEY;
    if (!apiKey) {
      throw new Error('OpenRouter API key not configured');
    }

    const model = import.meta.env.VITE_OPENROUTER_MODEL || 'gpt-4o-mini';

    const messages = [];

    // Add conversation history
    if (Array.isArray(conversationHistory) && conversationHistory.length > 0) {
      conversationHistory.forEach(msg => {
        if (msg.role && msg.content) {
          messages.push(msg);
        }
      });
    }

    // Add file analysis request
    const analysisPrompt = `FILE: ${file.name} (${validation.type.toUpperCase()})
CONTENT:
${fileContent}

USER REQUEST: ${finalMessage}

Please analyze this document and respond to the user's request.`;

    messages.push({
      role: 'user',
      content: analysisPrompt
    });

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': window.location.href,
        'X-Title': 'Ronit AI Assistant'
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.7,
        max_tokens: 2000
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || `API Error: ${response.status}`);
    }

    const data = await response.json();
    const analysisResult = data.choices?.[0]?.message?.content;

    if (!analysisResult) {
      throw new Error('No response from AI service');
    }

    console.log('[FILE_ANALYSIS] ✅ Analysis complete');
    return analysisResult;
  } catch (error) {
    console.error('[FILE_ANALYSIS] ❌ Error:', error);
    throw error;
  }
}

/**
 * Summarize file
 * @param {File} file - File to summarize
 * @returns {Promise<string>} - Summary
 */
export async function summarizeFile(file) {
  const message = `Please provide a comprehensive summary of this ${file.name.split('.').pop()} document. Include key points, important details, and main conclusions.`;
  return analyzeFile(file, message);
}

/**
 * Extract key information from file
 * @param {File} file - File to analyze
 * @returns {Promise<string>} - Key information
 */
export async function extractKeyInfo(file) {
  const message = 'Extract and list all key information, important data points, names, dates, numbers, and important conclusions from this document.';
  return analyzeFile(file, message);
}

/**
 * Answer question from file
 * @param {File} file - File to search
 * @param {string} question - Question to answer
 * @returns {Promise<string>} - Answer
 */
export async function answerQuestionFromFile(file, question) {
  const message = `Based on this document, answer the following question: ${question}`;
  return analyzeFile(file, message);
}
