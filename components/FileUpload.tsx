
import React, { useCallback } from 'react';
import { UploadIcon } from './IconComponents';

interface FileUploadProps {
  onFileSelect: (files: File[]) => void;
  onFileRemove: (index: number) => void;
  onClearAll: () => void;
  previews: string[];
  title: string;
  description: string;
  multiple?: boolean;
}

const FileUpload: React.FC<FileUploadProps> = ({ onFileSelect, onFileRemove, onClearAll, previews, title, description, multiple = false }) => {

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = event.target.files;
    if (selectedFiles) {
      onFileSelect(Array.from(selectedFiles));
    }
    // Clear the input value to allow re-uploading the same file
    event.target.value = '';
  };

  const onDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const droppedFiles = event.dataTransfer.files;
    if (droppedFiles) {
        // Fix: Explicitly type 'file' as File to resolve TypeScript error.
        const imageFiles = Array.from(droppedFiles).filter((file: File) => file.type.startsWith('image/'));
        onFileSelect(imageFiles);
    }
  }, [onFileSelect]);
  
  const onDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  };
  
  const fileInputId = `file-upload-${title.replace(/\s+/g, '-').toLowerCase()}`;

  return (
    <div className="w-full">
      <input
            type="file"
            id={fileInputId}
            className="hidden"
            accept="image/*"
            onChange={handleFileChange}
            multiple={multiple}
          />
      {previews.length > 0 ? (
        <div className="w-full p-4 border-2 border-dashed border-gray-600 rounded-lg text-center bg-black/20">
             <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 mb-4">
                {previews.map((src, index) => (
                    <div key={src + index} className="relative group aspect-square">
                        <img src={src} alt={`Xem trước ảnh ${index + 1}`} className="w-full h-full object-cover rounded-lg shadow-md" />
                        <button
                            onClick={() => onFileRemove(index)}
                            className="absolute top-1 right-1 bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-lg font-bold opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-700 focus:opacity-100"
                            aria-label="Xóa ảnh"
                        >
                            &times;
                        </button>
                    </div>
                ))}
             </div>
            <div className="flex flex-wrap justify-center items-center gap-4">
                {multiple && (
                     <button
                        onClick={() => document.getElementById(fileInputId)?.click()}
                        className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
                    >
                        Thêm ảnh khác
                    </button>
                )}
                <button
                    onClick={onClearAll}
                    className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors"
                >
                    {multiple ? 'Xóa tất cả' : 'Xóa ảnh'}
                </button>
            </div>
        </div>
      ) : (
        <div 
            className="w-full p-6 border-2 border-dashed border-gray-600 rounded-lg text-center cursor-pointer hover:border-yellow-400 transition-colors bg-black/20"
            onDrop={onDrop}
            onDragOver={onDragOver}
            onClick={() => document.getElementById(fileInputId)?.click()}
        >
          <div className="flex flex-col items-center">
            <UploadIcon />
            <p className="mt-2 text-lg font-semibold text-gray-200">{title}</p>
            <p className="text-sm text-gray-400">{description}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default FileUpload;