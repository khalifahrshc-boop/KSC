import fs from 'fs';
let code = fs.readFileSync('src/components/FieldOperations.tsx', 'utf-8');

const searchStrStart = "try {\n                      const jsPDF = (await import('jspdf')).default;";
const searchStrEnd = "alert('Failed to generate PDF');\n                    }}";

const startIdx = code.indexOf("onClick={");
const actualStartIdx = code.indexOf("try {\n                      const jsPDF", startIdx);

// Wait, let's just replace the exact block.
