import { AlertTriangle, FileText, Upload } from "lucide-react";
import * as React from "react";

interface PDFDropzoneProps {
  onFileSelect: (file: File) => void;
  accept?: string;
  maxSize?: number; // i MB
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

  // Håndter drag events
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

  // Håndter filvalg (både drag&drop og klikk)
  const handleFileSelection = (files: File[]) => {
    if (files.length === 0) return;
    
    const file = files[0];
    
    // Valider filtype
    if (file.type !== accept) {
      console.error('Ugyldig filtype:', file.type, 'Forventet:', accept);
      return;
    }
    
    // Valider filstørrelse
    const maxSizeBytes = maxSize * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      console.error('Fil for stor:', file.size, 'Maks:', maxSizeBytes);
      return;
    }
    
    console.log('✅ PDF-fil validert og klar for upload:', {
      name: file.name,
      size: `${(file.size / 1024 / 1024).toFixed(2)}MB`,
      type: file.type
    });
    
    onFileSelect(file);
  };

  // Håndter klikk på dropzone
  const handleClick = () => {
    if (isLoading) return;
    fileInputRef.current?.click();
  };

  // Håndter filvalg fra input
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    handleFileSelection(files);
    
    // Reset input slik at samme fil kan velges igjen
    e.target.value = '';
  };

  return (
    <div className={`relative ${className}`}>
      {/* Skjult file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        onChange={handleFileInputChange}
        className="hidden"
        disabled={isLoading}
      />
      
      {/* Dropzone område */}
      <div
        onClick={handleClick}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          relative border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all
          ${isDragOver 
            ? 'border-orange-400 bg-orange-50' 
            : 'border-orange-300 bg-orange-50/30 hover:bg-orange-50/60'
          }
          ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}
          ${error ? 'border-red-300 bg-red-50/30' : ''}
        `}
      >
        {/* Ikon */}
        <div className="mb-4">
          {error ? (
            <AlertTriangle className="w-12 h-12 mx-auto text-red-500" />
          ) : isDragOver ? (
            <Upload className="w-12 h-12 mx-auto text-orange-500 animate-bounce" />
          ) : (
            <FileText className="w-12 h-12 mx-auto text-orange-500" />
          )}
        </div>
        
        {/* Tekst */}
        <div>
          <h4 className="text-lg font-semibold text-orange-800 mb-2">
            {title}
          </h4>
          <p className="text-orange-600 mb-4">
            {description}
          </p>
          
          {/* Fil-krav */}
          <div className="text-sm text-orange-500">
            <p>Støttede formater: PDF</p>
            <p>Maksimal størrelse: {maxSize}MB</p>
          </div>
        </div>
        
        {/* Loading overlay */}
        {isLoading && (
          <div className="absolute inset-0 bg-white/80 flex items-center justify-center rounded-2xl">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto mb-2"></div>
              <p className="text-orange-700 font-medium">Laster opp...</p>
            </div>
          </div>
        )}
      </div>
      
      {/* Feilmelding */}
      {error && (
        <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        </div>
      )}
    </div>
  );
}; 