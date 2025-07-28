import { AlertTriangle, FileText, Upload } from "lucide-react";
import * as React from "react";

interface PDFDropzoneProps {
  onFileSelect: (file: File) => void;
  accept?: string;
  maxSize?: number;
  title?: string;
  description?: string;
  isLoading?: boolean;
  error?: string;
  className?: string;
}

export const PDFDropzone: React.FC<PDFDropzoneProps> = ({
  onFileSelect,
  accept = "application/pdf",
  maxSize = 50,
  title = "Last opp PDF",
  description = "Dra og slipp PDF-filen her, eller klikk for å velge fil",
  isLoading = false,
  error = "",
  className = ""
}) => {
  const [isDragOver, setIsDragOver] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const files = Array.from(e.dataTransfer.files);
    handleFileSelection(files);
  };

  const handleFileSelection = (files: File[]) => {
    if (files.length === 0) return;
    
    const file = files[0];
    
    if (file.type !== accept) {
      console.error('Ugyldig filtype:', file.type, 'Forventet:', accept);
      return;
    }
    
    const maxSizeBytes = maxSize * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      console.error('Fil for stor:', file.size, 'Maks:', maxSizeBytes);
      return;
    }
    
    console.log('PDF-fil validert og klar for upload:', {
      name: file.name,
      size: `${(file.size / 1024 / 1024).toFixed(2)}MB`,
      type: file.type
    });
    
    onFileSelect(file);
  };

  const handleClick = () => {
    if (isLoading) return;
    fileInputRef.current?.click();
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    handleFileSelection(files);
    
    e.target.value = '';
  };

  return (
    <div className={`w-full ${className}`}>
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        onChange={handleFileInputChange}
        className="sr-only"
        disabled={isLoading}
      />
      
      <div
        onClick={handleClick}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          relative border-2 border-dashed rounded-2xl p-6 md:p-8 text-center cursor-pointer transition-all w-full min-h-[120px] md:min-h-[140px]
          ${isDragOver 
            ? 'border-orange-400 bg-orange-50' 
            : 'border-orange-300 bg-orange-50/30 hover:bg-orange-50/60'
          }
          ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}
          ${error ? 'border-red-300 bg-red-50/30' : ''}
        `}
      >
        <div className="flex flex-col items-center justify-center h-full">
          <div className="mb-3 md:mb-4">
            {error ? (
              <AlertTriangle className="w-10 h-10 md:w-12 md:h-12 mx-auto text-red-500" />
            ) : isDragOver ? (
              <Upload className="w-10 h-10 md:w-12 md:h-12 mx-auto text-orange-500 animate-bounce" />
            ) : (
              <FileText className="w-10 h-10 md:w-12 md:h-12 mx-auto text-orange-500" />
            )}
          </div>
          
          <div className="flex flex-col items-center">
            <h4 className="text-base md:text-lg font-semibold text-orange-800 mb-2">
              {title}
            </h4>
            <p className="text-sm md:text-base text-orange-600 mb-3 md:mb-4 px-2 break-words">
              {description}
            </p>
            
            <div className="text-xs md:text-sm text-orange-500 flex flex-col sm:flex-row sm:gap-4 gap-1 text-center">
              <p>Støttede formater: PDF</p>
              <p>Maksimal størrelse: {maxSize}MB</p>
            </div>
          </div>
        </div>
        
        {isLoading && (
          <div className="absolute inset-0 bg-white/80 flex items-center justify-center rounded-2xl">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto mb-2"></div>
              <p className="text-orange-700 font-medium text-sm">Laster opp...</p>
            </div>
          </div>
        )}
      </div>
      
      {error && (
        <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg w-full">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />
            <p className="text-red-700 text-sm break-words">{error}</p>
          </div>
        </div>
      )}
    </div>
  );
}; 