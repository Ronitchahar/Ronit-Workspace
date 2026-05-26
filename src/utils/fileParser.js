import * as pdfjsLib from "pdfjs-dist";

// Initialize the PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

export const readFileAsBase64 = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
};

export const readFileAsText = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = (error) => reject(error);
    reader.readAsText(file);
  });
};

export const extractTextFromPDF = async (file) => {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument(new Uint8Array(arrayBuffer));
    const pdfDocument = await loadingTask.promise;
    
    let fullText = "";
    
    // Extract text from each page
    for (let i = 1; i <= pdfDocument.numPages; i++) {
      const page = await pdfDocument.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map(item => item.str).join(" ");
      fullText += `[Page ${i}]\\n${pageText}\\n\\n`;
    }
    
    return fullText;
  } catch (error) {
    console.error("Error parsing PDF:", error);
    throw new Error("Failed to parse PDF document.");
  }
};

export const processSelectedFile = async (file) => {
  if (!file) return null;

  try {
    if (file.type.startsWith("image/")) {
      const base64 = await readFileAsBase64(file);
      return { file, type: "image", content: base64 };
    } else if (file.type === "application/pdf") {
      const text = await extractTextFromPDF(file);
      return { file, type: "pdf", content: text };
    } else {
      // Default to trying text for everything else (csv, txt, js, json, md, etc)
      const text = await readFileAsText(file);
      return { file, type: "text", content: text };
    }
  } catch (err) {
    console.error("Error processing file:", err);
    throw new Error("Could not process the selected file.");
  }
};
