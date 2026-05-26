// Test the image detection logic
const fs = require('fs');
const path = require('path');

// Read and evaluate the imageGenerationService
const serviceCode = fs.readFileSync(
  path.join(__dirname, 'src/services/imageGenerationService.js'),
  'utf8'
);

// Extract just the isImageGenerationRequest function
const functionMatch = serviceCode.match(/export function isImageGenerationRequest[\s\S]*?(?=^export|^\/\/|\Z)/m);
if (!functionMatch) {
  console.log('Could not extract function');
  process.exit(1);
}

// Create a testable version
const testCode = `
${functionMatch[0].replace('export function', 'function')}

// Test cases
const testCases = [
  { text: 'lion in jungle', expected: true, category: 'IMAGE' },
  { text: 'anime girl with pink hair', expected: true, category: 'IMAGE' },
  { text: 'cyberpunk wallpaper', expected: true, category: 'IMAGE' },
  { text: 'futuristic gaming setup', expected: true, category: 'IMAGE' },
  { text: 'girl with blue hair', expected: true, category: 'IMAGE' },
  { text: 'What is artificial intelligence?', expected: false, category: 'TEXT' },
  { text: 'Tell me about Python', expected: false, category: 'TEXT' },
  { text: 'How does machine learning work?', expected: false, category: 'TEXT' },
  { text: 'dark cyberpunk neon city', expected: true, category: 'IMAGE' },
  { text: 'dragon flying in space', expected: true, category: 'IMAGE' },
];

console.log('🧪 Testing Image Detection Logic\\n');
console.log('═'.repeat(70));

let passed = 0;
let failed = 0;

testCases.forEach(test => {
  const result = isImageGenerationRequest(test.text);
  const status = result === test.expected ? '✅ PASS' : '❌ FAIL';
  const expected = test.expected ? 'IMAGE' : 'TEXT';
  const actual = result ? 'IMAGE' : 'TEXT';
  
  console.log(status);
  console.log('Prompt: "' + test.text + '"');
  console.log('Expected: ' + expected + ' | Got: ' + actual);
  console.log('');
  
  if (result === test.expected) {
    passed++;
  } else {
    failed++;
  }
});

console.log('═'.repeat(70));
console.log(\`\\n✅ PASSED: \${passed}/${testCases.length}\`);
console.log(\`❌ FAILED: \${failed}/${testCases.length}\\n\`);

if (failed === 0) {
  console.log('🎉 ALL DETECTION TESTS PASSED!');
  process.exit(0);
} else {
  console.log('⚠️ Some tests failed');
  process.exit(1);
}
`;

eval(testCode);
