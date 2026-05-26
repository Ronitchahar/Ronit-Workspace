/**
 * ╔═══════════════════════════════════════════════════════════════════════╗
 * ║         UNIVERSAL ROUTING SERVICE - Production-Grade Architecture     ║
 * ║                                                                       ║
 * ║  Centralizes all message routing decisions with defensive guards.    ║
 * ║  Prevents cross-triggering between chat, generation, and analysis.   ║
 * ╚═══════════════════════════════════════════════════════════════════════╝
 * 
 * PURPOSE:
 * - Single source of truth for routing decisions
 * - Defensive validation at every gate
 * - Prevents false positives (e.g., plain text → image analysis)
 * - Ensures proper file state handling
 * 
 * ROUTING PRIORITY (STRICT):
 * 1. Check if file exists (defensive)
 *    → YES: Image file? → IMAGE_ANALYSIS
 *    → YES: Non-image file? → FILE_ANALYSIS
 * 2. Check if NO file exists
 *    → Analyze text for generation request? → IMAGE_GENERATION
 *    → Otherwise → NORMAL_CHAT
 * 
 * GUARDS:
 * - Null/undefined/empty checks on all inputs
 * - File type validation BEFORE routing
 * - Text pattern validation for generation
 * - No assumptions about previous state
 */

import {
  detectUserIntent,
  isValidIntent,
  shouldBlockGeneration,
} from './intentDetectionService';

/**
 * DEFENSIVE STATE VALIDATOR
 * Validates input with strict null/empty checks
 */
function validateInputState(context = {}) {
  const {
    text = '',
    file = null,
    fileBlob = null,
    messages = []
  } = context;

  return {
    // TEXT: Safely get trimmed text or empty string
    text: (typeof text === 'string' ? text.trim() : '').substring(0, 5000),
    
    // FILE OBJECT: Must be a real object with expected properties
    file: (file && typeof file === 'object' && file.name && file.type) ? file : null,
    
    // FILE BLOB: Must be an actual Blob instance
    fileBlob: (fileBlob instanceof Blob) ? fileBlob : null,
    
    // MESSAGES: Must be an array
    messages: Array.isArray(messages) ? messages : []
  };
}

/**
 * GUARD 1: DEFENSIVE FILE VALIDATION
 * Confirms file exists before any analysis routing
 * Returns: {exists: boolean, type: 'image'|'document'|null, reason: string}
 */
function validateUploadedFile(file, fileBlob) {
  // Guard 1.1: File object must exist
  if (!file) {
    return {
      exists: false,
      type: null,
      reason: 'NO_FILE_OBJECT'
    };
  }

  // Guard 1.2: File must have valid properties
  if (!file.name || !file.type) {
    return {
      exists: false,
      type: null,
      reason: 'INVALID_FILE_METADATA'
    };
  }

  // Guard 1.3: File blob must actually exist
  if (!fileBlob || !(fileBlob instanceof Blob)) {
    return {
      exists: false,
      type: null,
      reason: 'NO_FILE_BLOB'
    };
  }

  // Guard 1.4: File blob must have size
  if (fileBlob.size === 0) {
    return {
      exists: false,
      type: null,
      reason: 'EMPTY_FILE_BLOB'
    };
  }

  // Guard 1.5: File blob type must match declared type
  if (fileBlob.type !== file.type) {
    console.warn('[ROUTING] File blob type mismatch:', {
      declared: file.type,
      actual: fileBlob.type
    });
    // Warning but not fatal - use blob type
  }

  // Guard 1.6: Determine file type
  const mimeType = fileBlob.type || file.type;
  if (!mimeType) {
    return {
      exists: false,
      type: null,
      reason: 'NO_MIME_TYPE'
    };
  }

  // Guard 1.7: Classify file
  const isImageFile = mimeType.startsWith('image/');

  return {
    exists: true,
    type: isImageFile ? 'image' : 'document',
    fileType: mimeType,
    reason: isImageFile ? 'IMAGE_FILE_DETECTED' : 'DOCUMENT_FILE_DETECTED'
  };
}

/**
 * GUARD 2: GENERATION REQUEST VALIDATION
 * Confirms text is a genuine generation request (not false positive)
 */
function validateGenerationRequest(text) {
  if (!text || typeof text !== 'string') {
    return {
      isGeneration: false,
      confidence: 0,
      reason: 'NO_TEXT'
    };
  }

  // Use intentDetectionService's built-in analysis
  const intentResult = detectUserIntent({
    text,
    uploadedImages: [],  // NO FILES
    uploadedFiles: [],   // NO FILES
    previousMessages: []
  });

  // Guard 2.1: Check confidence threshold
  const isLikelyGeneration = 
    intentResult.intent === 'IMAGE_GENERATION' && 
    intentResult.confidence >= 65;

  // Guard 2.2: Block false positives
  const isBlockedByFalsePositiveFilter = shouldBlockGeneration(text);

  return {
    isGeneration: isLikelyGeneration && !isBlockedByFalsePositiveFilter,
    confidence: intentResult.confidence,
    reason: isBlockedByFalsePositiveFilter ? 'FALSE_POSITIVE' : 'ANALYSIS_RESULT',
    intentResult
  };
}

/**
 * CRITICAL ROUTING FUNCTION
 * Determines which pipeline should handle this message
 * 
 * Returns: {
 *   route: 'IMAGE_ANALYSIS' | 'FILE_ANALYSIS' | 'IMAGE_GENERATION' | 'NORMAL_CHAT',
 *   confidence: number,
 *   canProceed: boolean,
 *   reason: string,
 *   details: object
 * }
 */
export function determineRoute(context = {}) {
  console.log(`
╔═════════════════════════════════════════════════════════════════╗
║              🛣️  UNIVERSAL ROUTING ENGINE                       ║
╚═════════════════════════════════════════════════════════════════╝`);

  // ========================================
  // STEP 1: VALIDATE ALL INPUT STATE
  // ========================================
  const validated = validateInputState(context);
  
  console.log(`
📋 INPUT VALIDATION:
   Text: "${validated.text ? validated.text.substring(0, 40) : '(empty)'}"
   File object exists: ${!!validated.file}
   File blob exists: ${!!validated.fileBlob}
   Blob is actual Blob: ${validated.fileBlob instanceof Blob}
   Blob size: ${validated.fileBlob ? validated.fileBlob.size : 'N/A'} bytes
   Blob type: ${validated.fileBlob ? validated.fileBlob.type : 'N/A'}`);

  // ========================================
  // STEP 2: GATE A - FILE UPLOADED?
  // ========================================
  const fileValidation = validateUploadedFile(validated.file, validated.fileBlob);

  if (fileValidation.exists) {
    console.log(`
✅ FILE DETECTED: ${fileValidation.reason}
   Type: ${fileValidation.type}
   MIME: ${fileValidation.fileType}`);

    // Gate A1: IMAGE FILE + IMAGE ANALYSIS
    if (fileValidation.type === 'image') {
      console.log(`
🚀 ROUTING TO: IMAGE_ANALYSIS
   File: ${validated.file.name}
   Type: ${fileValidation.fileType}
   Confidence: 100%`);

      return {
        route: 'IMAGE_ANALYSIS',
        confidence: 100,
        canProceed: true,
        reason: fileValidation.reason,
        details: {
          file: validated.file,
          fileBlob: validated.fileBlob,
          fileType: fileValidation.fileType
        }
      };
    }

    // Gate A2: NON-IMAGE FILE + FILE ANALYSIS
    if (fileValidation.type === 'document') {
      console.log(`
🚀 ROUTING TO: FILE_ANALYSIS
   File: ${validated.file.name}
   Type: ${fileValidation.fileType}
   Confidence: 100%`);

      return {
        route: 'FILE_ANALYSIS',
        confidence: 100,
        canProceed: true,
        reason: fileValidation.reason,
        details: {
          file: validated.file,
          fileBlob: validated.fileBlob,
          fileType: fileValidation.fileType
        }
      };
    }
  }

  console.log(`
❌ NO FILE: ${fileValidation.reason}
   Proceeding to text-based routing...`);

  // ========================================
  // STEP 3: GATE B - NO FILE EXISTS
  // ========================================
  // Gate B1: Is this a generation request?
  const genValidation = validateGenerationRequest(validated.text);

  if (genValidation.isGeneration) {
    console.log(`
🚀 ROUTING TO: IMAGE_GENERATION
   Confidence: ${genValidation.confidence}%
   Reason: ${genValidation.reason}`);

    return {
      route: 'IMAGE_GENERATION',
      confidence: genValidation.confidence,
      canProceed: true,
      reason: genValidation.reason,
      details: {
        text: validated.text,
        intentResult: genValidation.intentResult
      }
    };
  }

  // Gate B2: Default to normal chat
  console.log(`
🚀 ROUTING TO: NORMAL_CHAT
   Text: "${validated.text.substring(0, 40)}..."
   Reason: No file, not a generation request`);

  return {
    route: 'NORMAL_CHAT',
    confidence: 95,
    canProceed: true,
    reason: 'DEFAULT_TEXT_CHAT',
    details: {
      text: validated.text
    }
  };
}

/**
 * VALIDATION GATE
 * Confirms route is valid before proceeding
 */
export function isValidRoute(routeResult) {
  if (!routeResult || typeof routeResult !== 'object') {
    console.error('[ROUTING] Invalid route result: not an object');
    return false;
  }

  const validRoutes = ['IMAGE_ANALYSIS', 'FILE_ANALYSIS', 'IMAGE_GENERATION', 'NORMAL_CHAT'];
  
  if (!validRoutes.includes(routeResult.route)) {
    console.error('[ROUTING] Invalid route:', routeResult.route);
    return false;
  }

  if (!routeResult.canProceed) {
    console.warn('[ROUTING] Route returned canProceed=false:', routeResult.route);
    return false;
  }

  return true;
}

/**
 * CRITICAL: File State Cleanup
 * Must be called IMMEDIATELY after successful send or error
 * Returns fresh state object for component
 */
export function getCleanFileState() {
  return {
    selectedFile: null,
    fileInputRef: null
  };
}

/**
 * DEBUG UTILITY
 * Logs complete routing context (use in development)
 */
export function debugRouting(routeResult, context = {}) {
  console.log(`
╔═════════════════════════════════════════════════════════════════╗
║              📊 ROUTING DECISION DETAILS                        ║
╚═════════════════════════════════════════════════════════════════╝
Route: ${routeResult.route}
Confidence: ${routeResult.confidence}%
Can Proceed: ${routeResult.canProceed}
Reason: ${routeResult.reason}

Input Context:
  - Text: "${context.text ? context.text.substring(0, 50) : '(none)'}"
  - File: ${context.file ? context.file.name : '(none)'}
  - Blob: ${context.fileBlob instanceof Blob ? 'Yes (' + context.fileBlob.size + ' bytes)' : 'No'}

Route Details:
${JSON.stringify(routeResult.details, null, 2)}
`);
}

/**
 * STATE CONSISTENCY VALIDATOR
 * Ensures file state won't corrupt routing
 * Returns: {isClean: boolean, issues: string[]}
 */
export function validateFileStateConsistency(selectedFile, currentFile, currentFileBlob) {
  const issues = [];

  // Check 1: Orphaned selectedFile
  if (selectedFile && !currentFileBlob) {
    issues.push('selectedFile exists but currentFileBlob is null');
  }

  // Check 2: Orphaned blob
  if (currentFileBlob && !selectedFile && !currentFile) {
    issues.push('currentFileBlob exists but selectedFile is null');
  }

  // Check 3: Type mismatch
  if (selectedFile && currentFileBlob && selectedFile.type !== currentFileBlob.type) {
    issues.push('Type mismatch between selectedFile and currentFileBlob');
  }

  return {
    isClean: issues.length === 0,
    issues
  };
}
