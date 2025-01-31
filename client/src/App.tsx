import React, { useState } from 'react';
import PdfPreview from './components/PdfPreview';
import axios from 'axios';

const App: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedPages, setSelectedPages] = useState<number[]>([]);
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      setSelectedFile(event.target.files[0]);
    }
  };

  const handleSelectionChange = (pages: number[]) => {
    setSelectedPages(pages);
  };

  const handleSplit = async () => {
    if (!selectedFile || selectedPages.length === 0) {
      return alert('Please select pages to split.');
    }

    console.log('----------------selectedFile-------------------\n', selectedFile);
    console.log('----------------selectedPages-------------------\n', selectedPages);
    // sort the selected files
    selectedPages.sort((a, b) => a - b);

    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('pages', JSON.stringify(selectedPages));

    try {
      const response = await axios.post('http://localhost:5000/api/pdf/split', formData, {
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'split.pdf');
      document.body.appendChild(link);
      link.click();
    } catch (error) {
      console.error('Error splitting PDF', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-screen mx-auto bg-white shadow-lg rounded-lg p-6">
        <h1 className="text-2xl font-semibold text-gray-800 mb-4">Split PDF</h1>
        <input
          type="file"
          accept="application/pdf"
          onChange={handleFileChange}
          className="mb-4 block w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-500 file:text-white hover:file:bg-blue-600"
        />
        {selectedFile && (
          <PdfPreview file={selectedFile} onSelectionChange={handleSelectionChange} />
        )}

        <button
          onClick={handleSplit}
          disabled={!selectedFile || selectedPages.length === 0}
          className="mt-4 bg-green-500 text-white py-2 px-4 rounded-lg hover:bg-green-600 disabled:bg-gray-400"
        >
          Split Selected Pages
        </button>
      </div>
    </div>
  );
};

export default App;
