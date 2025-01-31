import { useEffect, useState, useRef } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import 'pdfjs-dist/build/pdf.worker';

interface PdfPreviewProps {
  file: File | null;
  onSelectionChange: (selectedPages: number[]) => void;
}

const PdfPreview: React.FC<PdfPreviewProps> = ({ file, onSelectionChange }) => {
  const [pdfPages, setPdfPages] = useState<string[]>([]);
  const [selectedPages, setSelectedPages] = useState<number[]>([]);
  const [isShiftPressed, setIsShiftPressed] = useState<boolean>(false);
  const [isCtrlPressed, setIsCtrlPressed] = useState<boolean>(false);
  const [isAPressed, setIsAPressed] = useState<boolean>(false);
  const [pageInput, setPageInput] = useState('');
  const lastSelectedPage = useRef<number | null>(null);

  // Convert page numbers array to range string
  const convertToRangeString = (pages: number[]): string => {
    if (pages.length === 0) return '';

    const sortedPages = [...pages].sort((a, b) => a - b);
    const ranges: string[] = [];
    let rangeStart = sortedPages[0];
    let prev = sortedPages[0];

    for (let i = 1; i <= sortedPages.length; i++) {
      if (i === sortedPages.length || sortedPages[i] !== prev + 1) {
        if (rangeStart === prev) {
          ranges.push(rangeStart.toString());
        } else {
          ranges.push(`${rangeStart}-${prev}`);
        }
        if (i < sortedPages.length) {
          rangeStart = sortedPages[i];
          prev = sortedPages[i];
        }
      } else {
        prev = sortedPages[i];
      }
    }

    return ranges.join(',');
  };

  useEffect(() => {
    if (file) {
      const reader = new FileReader();
      reader.readAsArrayBuffer(file);
      reader.onload = async (e) => {
        if (e.target?.result) {
          const loadingTask = pdfjsLib.getDocument({ data: e.target.result });
          const pdf = await loadingTask.promise;
          const pages: string[] = [];

          for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const viewport = page.getViewport({ scale: 1 });
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');

            if (context) {
              canvas.width = viewport.width;
              canvas.height = viewport.height;
              const renderTask = page.render({ canvasContext: context, viewport });
              await renderTask.promise;
              pages.push(canvas.toDataURL());
            }
          }
          setPdfPages(pages);
        }
      };
    }
  }, [file]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Shift') setIsShiftPressed(true);
      if (event.key === 'Control') setIsCtrlPressed(true);
      if (event.key.toLowerCase() === 'a') setIsAPressed(true);
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.key === 'Shift') setIsShiftPressed(false);
      if (event.key === 'Control') setIsCtrlPressed(false);
      if (event.key.toLowerCase() === 'a') setIsAPressed(false);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  const handleRangeSelection = (startPage: number, endPage: number) => {
    const start = Math.min(startPage, endPage);
    const end = Math.max(startPage, endPage);
    const newPages = new Set(selectedPages);

    for (let i = start; i <= end; i++) {
      newPages.add(i);
    }

    return Array.from(newPages).sort((a, b) => a - b);
  };

  const togglePageSelection = (pageNumber: number) => {
    setSelectedPages((prev) => {
      let newPages: number[];

      if (isShiftPressed && lastSelectedPage.current !== null) {
        // Handle shift-click range selection
        newPages = handleRangeSelection(lastSelectedPage.current, pageNumber);
      } else {
        // Normal toggle behavior
        newPages = prev.includes(pageNumber)
          ? prev.filter((p) => p !== pageNumber)
          : [...prev, pageNumber];
        lastSelectedPage.current = pageNumber;
      }

      // Update the page input whenever pages are toggled
      const rangeString = convertToRangeString(newPages);
      setPageInput(rangeString);

      return newPages;
    });
  };

  const handlePageInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPageInput(e.target.value);
    const pages = new Set<number>();

    e.target.value.split(',').forEach((part) => {
      part = part.trim();
      if (part.includes('-')) {
        const [start, end] = part.split('-').map((num) => parseInt(num.trim()));
        if (!isNaN(start) && !isNaN(end)) {
          for (let i = start; i <= end; i++) {
            pages.add(i);
          }
        }
      } else {
        const num = parseInt(part);
        if (!isNaN(num)) {
          pages.add(num);
        }
      }
    });

    const newPages = Array.from(pages).sort((a, b) => a - b);
    setSelectedPages(newPages);
    lastSelectedPage.current = newPages[newPages.length - 1] || null;
  };

  useEffect(() => {
    onSelectionChange(selectedPages);
  }, [selectedPages, onSelectionChange]);

  return (
    <div className="p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-semibold text-gray-800">Split PDF</h2>
      <p className="text-gray-600">Split PDF file into pieces or pick just a few pages</p>
      <p className="text-sm text-gray-500 mt-2">
        Select specific pages. Use{' '}
        <kbd
          className={`px-2 py-1 rounded transition-all ${
            isShiftPressed ? 'bg-blue-500 text-white transform scale-110' : 'bg-gray-200'
          }`}
        >
          Shift
        </kbd>{' '}
        to select multiple pages or{' '}
        <kbd
          className={`px-2 py-1 rounded transition-all ${
            isCtrlPressed ? 'bg-blue-500 text-white transform scale-110' : 'bg-gray-200'
          }`}
        >
          Ctrl
        </kbd>{' '}
        +{' '}
        <kbd
          className={`px-2 py-1 rounded transition-all ${
            isAPressed ? 'bg-blue-500 text-white transform scale-110' : 'bg-gray-200'
          }`}
        >
          A
        </kbd>{' '}
        to select all.
      </p>
      <div className="grid grid-cols-3 gap-4 p-4 bg-gray-100 rounded-md mt-4 w-full">
        {pdfPages.map((img, index) => (
          <div
            key={index}
            className={`relative border-2 rounded-lg overflow-hidden transition-all transform hover:scale-105 cursor-pointer ${
              selectedPages.includes(index + 1) ? 'border-blue-500' : 'border-transparent'
            }`}
            onClick={() => togglePageSelection(index + 1)}
          >
            <img src={img} alt={`Page ${index + 1}`} className="w-full h-auto" />
            <p className="text-center text-gray-700 mt-2">{index + 1}</p>
          </div>
        ))}
      </div>
      <input
        type="text"
        className="mt-2 p-2 border rounded w-full"
        placeholder="Enter pages (e.g., 1,3,5-7)"
        value={pageInput}
        onChange={handlePageInputChange}
      />
    </div>
  );
};

export default PdfPreview;
