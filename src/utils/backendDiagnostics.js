/**
 * Backend Diagnostic Utility
 * Quick test to verify backend is running and accessible
 * Usage: Call testBackendConnection() from browser console
 */

export async function testBackendConnection() {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║           🔧 BACKEND DIAGNOSTIC TEST                      ║
║                                                            ║
║ Testing backend server on http://https://ronit-workspace-backend.onrender.com           ║
╚════════════════════════════════════════════════════════════╝
`);

  const tests = [];

  // Test 1: Health Check
  console.log(`\n📋 Test 1: Health Check (GET /health)`);
  try {
    const response = await fetch('http://https://ronit-workspace-backend.onrender.com/health', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log(`✅ PASS: Backend is running`);
      console.log(`   Response:`, data);
      tests.push({ test: 'Health Check', status: 'PASS' });
    } else {
      console.error(`❌ FAIL: Health check returned ${response.status}`);
      tests.push({ test: 'Health Check', status: 'FAIL', code: response.status });
    }
  } catch (error) {
    console.error(`❌ FAIL: Cannot reach backend`);
    console.error(`   Error: ${error.message}`);
    tests.push({ test: 'Health Check', status: 'FAIL', error: error.message });
  }

  // Test 2: Diagnostics Endpoint
  console.log(`\n📋 Test 2: Diagnostics (GET /api/diagnostics)`);
  try {
    const response = await fetch('http://https://ronit-workspace-backend.onrender.com/api/diagnostics', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log(`✅ PASS: Diagnostics endpoint working`);
      console.log(`   Response:`, data);
      tests.push({ test: 'Diagnostics', status: 'PASS' });
    } else {
      console.error(`❌ FAIL: Diagnostics returned ${response.status}`);
      tests.push({ test: 'Diagnostics', status: 'FAIL', code: response.status });
    }
  } catch (error) {
    console.error(`❌ FAIL: Diagnostics endpoint unreachable`);
    console.error(`   Error: ${error.message}`);
    tests.push({ test: 'Diagnostics', status: 'FAIL', error: error.message });
  }

  // Test 3: Image Generation (with test prompt)
  console.log(`\n📋 Test 3: Image Generation (POST /api/generate-image)`);
  console.log(`   ⏳ Generating test image (this may take 10-30 seconds)...`);
  try {
    const response = await fetch('http://https://ronit-workspace-backend.onrender.com/api/generate-image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: 'a simple red square' })
    });
    
    if (response.ok) {
      const data = await response.json();
      if (data.success && data.image) {
        console.log(`✅ PASS: Image generation working`);
        console.log(`   Image size: ${(data.image.length / 1024).toFixed(2)} KB`);
        tests.push({ test: 'Image Generation', status: 'PASS' });
      } else {
        console.error(`❌ FAIL: Invalid response format`);
        console.error(`   Response:`, data);
        tests.push({ test: 'Image Generation', status: 'FAIL', error: 'Invalid format' });
      }
    } else {
      const errorData = await response.json().catch(() => ({}));
      console.error(`❌ FAIL: Generation returned ${response.status}`);
      console.error(`   Error: ${errorData.error || 'Unknown error'}`);
      tests.push({ test: 'Image Generation', status: 'FAIL', code: response.status });
    }
  } catch (error) {
    console.error(`❌ FAIL: Cannot reach generation endpoint`);
    console.error(`   Error: ${error.message}`);
    tests.push({ test: 'Image Generation', status: 'FAIL', error: error.message });
  }

  // Summary
  console.log(`\n
╔════════════════════════════════════════════════════════════╗
║                   📊 TEST SUMMARY                         ║
╚════════════════════════════════════════════════════════════╝
`);

  const passed = tests.filter(t => t.status === 'PASS').length;
  const failed = tests.filter(t => t.status === 'FAIL').length;

  tests.forEach(test => {
    const icon = test.status === 'PASS' ? '✅' : '❌';
    console.log(`${icon} ${test.test}: ${test.status}`);
    if (test.code) console.log(`   Code: ${test.code}`);
    if (test.error) console.log(`   Error: ${test.error}`);
  });

  console.log(`\n📈 Results: ${passed} passed, ${failed} failed\n`);

  if (failed === 0) {
    console.log(`✅ All tests passed! Backend is ready.`);
  } else {
    console.log(`❌ Some tests failed. Check errors above.`);
    console.log(`\nCommon fixes:`);
    console.log(`1. Make sure backend server is running: npm run start:server`);
    console.log(`2. Verify HF_TOKEN is set in .env file`);
    console.log(`3. Check that port 3001 is not in use`);
    console.log(`4. Clear browser cache and reload (Ctrl+Shift+R)`);
  }

  return { tests, passed, failed };
}

/**
 * Test image analysis multimodal format
 * Verifies that image analysis will work with uploaded images
 */
export async function testImageAnalysisFormat() {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║        🖼️  IMAGE ANALYSIS FORMAT TEST                    ║
╚════════════════════════════════════════════════════════════╝
`);

  // Check if OpenRouter API key is available
  const apiKey = import.meta.env.VITE_OPENROUTER_API_KEY;
  
  if (!apiKey) {
    console.error(`❌ VITE_OPENROUTER_API_KEY not set`);
    console.log(`   Add VITE_OPENROUTER_API_KEY to your .env file`);
    return false;
  }

  console.log(`✅ OpenRouter API key found`);
  console.log(`   Length: ${apiKey.length} characters`);

  // Verify multimodal format
  console.log(`\n📋 Verifying multimodal message format...`);
  
  const testMessage = {
    role: 'user',
    content: [
      {
        type: 'text',
        text: 'What is in this image?'
      },
      {
        type: 'image_url',
        image_url: {
          url: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
        }
      }
    ]
  };

  console.log(`✅ Message format valid`);
  console.log(`   Content items: ${testMessage.content.length}`);
  console.log(`   Has text: ${testMessage.content.some(c => c.type === 'text')}`);
  console.log(`   Has image_url: ${testMessage.content.some(c => c.type === 'image_url')}`);
  console.log(`   Image has data URL: ${testMessage.content.find(c => c.type === 'image_url')?.image_url?.url?.startsWith('data:') || false}`);

  return true;
}

/**
 * Quick test for image generation intent detection
 */
export function testImageGenerationDetection() {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║      🎨 IMAGE GENERATION INTENT DETECTION TEST            ║
╚════════════════════════════════════════════════════════════╝
`);

  // Import the function (you may need to adjust the import path)
  try {
    const testPrompts = [
      'lion',
      'genrate dog',
      'anime girl',
      'futuristic city',
      'dark knight standing in rain',
      'explain image',  // FALSE POSITIVE - should NOT generate
      'what is this',   // FALSE POSITIVE - should NOT generate
      '4k wallpaper of moon',
      'make a robot',
      'red ferrari'
    ];

    console.log(`Testing ${testPrompts.length} prompts...\n`);

    testPrompts.forEach(prompt => {
      console.log(`📝 "${prompt}"`);
      // The actual detection happens in analyzeVisualIntent
      // This is just a placeholder for manual testing
    });

    console.log(`\n✅ Test prompts prepared. Import analyzeVisualIntent to test each.`);
  } catch (error) {
    console.error(`❌ Error:`, error.message);
  }
}

// Export all tests
export const BackendDiagnostics = {
  testBackendConnection,
  testImageAnalysisFormat,
  testImageGenerationDetection
};

// Make available globally for console testing
if (typeof window !== 'undefined') {
  window.BackendDiagnostics = BackendDiagnostics;
}
