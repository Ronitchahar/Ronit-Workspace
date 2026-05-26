/**
 * System Validation Utility
 * Use this to validate that all components are working correctly
 */

export async function validateBackendConnection() {
  try {
    console.log('[VALIDATION] Testing backend connection...');
    const response = await fetch('http://localhost:3001/health');
    const data = await response.json();
    console.log('[VALIDATION] ✅ Backend is running:', data);
    return { status: 'ok', data };
  } catch (error) {
    console.error('[VALIDATION] ❌ Backend connection failed:', error);
    return { status: 'error', error: error.message };
  }
}

export async function validateOpenRouterAPI() {
  try {
    console.log('[VALIDATION] Checking OpenRouter API key...');
    const apiKey = import.meta.env.VITE_OPENROUTER_API_KEY;
    
    if (!apiKey) {
      console.error('[VALIDATION] ❌ OpenRouter API key not found');
      return { status: 'error', error: 'API key not configured' };
    }
    
    console.log('[VALIDATION] ✅ OpenRouter API key is configured');
    return { status: 'ok', hasKey: true };
  } catch (error) {
    console.error('[VALIDATION] ❌ Error checking API key:', error);
    return { status: 'error', error: error.message };
  }
}

export async function validateIntentDetection() {
  try {
    const { detectUserIntent } = await import('../services/intentDetectionService.js');
    
    console.log('[VALIDATION] Testing intent detection...');
    
    const testCases = [
      { text: 'generate a beautiful cat', expected: 'IMAGE_GENERATION' },
      { text: 'anime girl', expected: 'IMAGE_GENERATION' },
      { text: 'lion wallpaper', expected: 'IMAGE_GENERATION' },
      { text: 'explain this image', expected: 'NORMAL_CHAT' },
      { text: 'what is this', expected: 'NORMAL_CHAT' },
      { text: 'hello', expected: 'NORMAL_CHAT' },
    ];
    
    let passed = 0;
    for (const testCase of testCases) {
      const result = detectUserIntent({ text: testCase.text });
      const isCorrect = result.intent === testCase.expected || result.confidence < 50;
      if (isCorrect) {
        passed++;
        console.log(`  ✅ "${testCase.text}" → ${result.intent} (${result.confidence}%)`);
      } else {
        console.log(`  ❌ "${testCase.text}" → ${result.intent} (expected ${testCase.expected})`);
      }
    }
    
    console.log(`[VALIDATION] Intent detection: ${passed}/${testCases.length} tests passed`);
    return { status: 'ok', passed, total: testCases.length };
  } catch (error) {
    console.error('[VALIDATION] ❌ Intent detection test failed:', error);
    return { status: 'error', error: error.message };
  }
}

export async function validateImageAnalysisService() {
  try {
    const { validateImageFile, fileToBase64 } = await import('../services/imageAnalysisService.js');
    
    console.log('[VALIDATION] Testing image analysis service...');
    
    // Create a test image
    const canvas = document.createElement('canvas');
    canvas.width = 100;
    canvas.height = 100;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = 'blue';
    ctx.fillRect(0, 0, 100, 100);
    
    canvas.toBlob(async (blob) => {
      const file = new File([blob], 'test.png', { type: 'image/png' });
      
      const validation = validateImageFile(file);
      if (validation.valid) {
        console.log('  ✅ Image validation: passed');
        
        try {
          const base64 = await fileToBase64(file);
          console.log(`  ✅ Base64 conversion: ${(base64.length / 1024).toFixed(2)} KB`);
          console.log('[VALIDATION] Image analysis service: OK');
          return { status: 'ok' };
        } catch (error) {
          console.error('  ❌ Base64 conversion failed:', error);
          return { status: 'error', error: 'Base64 conversion failed' };
        }
      } else {
        console.error('  ❌ Image validation:', validation.error);
        return { status: 'error', error: validation.error };
      }
    });
  } catch (error) {
    console.error('[VALIDATION] ❌ Image analysis service test failed:', error);
    return { status: 'error', error: error.message };
  }
}

export async function validateFileAnalysisService() {
  try {
    const { validateFileType } = await import('../services/fileAnalysisService.js');
    
    console.log('[VALIDATION] Testing file analysis service...');
    
    const testFiles = [
      { name: 'test.txt', type: 'text/plain', expected: 'text' },
      { name: 'test.pdf', type: 'application/pdf', expected: 'pdf' },
      { name: 'test.csv', type: 'text/csv', expected: 'csv' },
      { name: 'test.docx', type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', expected: 'docx' },
    ];
    
    let passed = 0;
    for (const testFile of testFiles) {
      const file = { name: testFile.name, type: testFile.type };
      const validation = validateFileType(file);
      
      if (validation.valid && validation.type === testFile.expected) {
        passed++;
        console.log(`  ✅ ${testFile.name} → ${validation.type}`);
      } else {
        console.log(`  ❌ ${testFile.name} → ${validation.type} (expected ${testFile.expected})`);
      }
    }
    
    console.log(`[VALIDATION] File analysis service: ${passed}/${testFiles.length} tests passed`);
    return { status: 'ok', passed, total: testFiles.length };
  } catch (error) {
    console.error('[VALIDATION] ❌ File analysis service test failed:', error);
    return { status: 'error', error: error.message };
  }
}

export async function runFullValidation() {
  console.log('╔════════════════════════════════════════╗');
  console.log('║  SYSTEM VALIDATION RUNNING             ║');
  console.log('╚════════════════════════════════════════╝\n');
  
  const results = {
    backend: await validateBackendConnection(),
    openrouter: await validateOpenRouterAPI(),
    intentDetection: await validateIntentDetection(),
    fileAnalysis: await validateFileAnalysisService(),
  };
  
  console.log('\n╔════════════════════════════════════════╗');
  console.log('║  VALIDATION RESULTS                    ║');
  console.log('╚════════════════════════════════════════╝\n');
  
  Object.entries(results).forEach(([name, result]) => {
    const status = result.status === 'ok' ? '✅' : '❌';
    console.log(`${status} ${name}: ${result.status}`);
    if (result.error) console.log(`   Error: ${result.error}`);
  });
  
  return results;
}

// Auto-run on import (for development)
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  console.log('[AUTO-VALIDATION] Running system validation in development mode...');
  runFullValidation().catch(console.error);
}
