import express from 'express';
import { PDFDocument } from 'pdf-lib';
import multer from 'multer';
import cors from 'cors';
import path from 'path';

const app = express();
app.use(cors());
app.use(express.json());

// Configure multer for handling file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

app.post('/api/pdf/split', upload.single('file'), async (req, res) => {
  try {
    if (!req.file || !req.body.pages) {
      return res.status(400).json({ error: 'Missing PDF file or pages selection' });
    }

    // Parse selected pages
    const selectedPages = JSON.parse(req.body.pages);
    if (!Array.isArray(selectedPages) || selectedPages.length === 0) {
      return res.status(400).json({ error: 'Invalid page selection' });
    }

    // Load the uploaded PDF
    const pdfDoc = await PDFDocument.load(req.file.buffer);

    // Create a new PDF document
    const newPdfDoc = await PDFDocument.create();

    // Copy selected pages to new document
    for (const pageNum of selectedPages) {
      if (pageNum <= pdfDoc.getPageCount()) {
        const [page] = await newPdfDoc.copyPages(pdfDoc, [pageNum - 1]);
        newPdfDoc.addPage(page);
      }
    }

    // Save the new PDF
    const pdfBytes = await newPdfDoc.save();

    // Send the new PDF as response
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="split.pdf"');
    res.send(Buffer.from(pdfBytes));

  } catch (error) {
    console.error('Error processing PDF:', error);
    res.status(500).json({ error: 'Error processing PDF file' });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something broke!' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
