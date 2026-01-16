'use client';

import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, File, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { formatFileSize } from '@/lib/utils';
import type { ResearchFile } from '@/types';

interface FileUploadProps {
  researchId: string;
  onUpload: (file: File) => Promise<void>;
  files?: ResearchFile[];
  onDelete?: (fileId: string) => Promise<void>;
}

export function FileUpload({ researchId, onUpload, files = [], onDelete }: FileUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (acceptedFiles.length === 0) return;

      const file = acceptedFiles[0];
      setUploading(true);
      setUploadError(null);

      try {
        await onUpload(file);
      } catch (error) {
        setUploadError(error instanceof Error ? error.message : 'Failed to upload file');
      } finally {
        setUploading(false);
      }
    },
    [onUpload]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'text/plain': ['.txt'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
    },
    maxSize: 10 * 1024 * 1024, // 10MB
    maxFiles: 1,
  });

  const handleDelete = async (fileId: string) => {
    if (onDelete) {
      try {
        await onDelete(fileId);
      } catch (error) {
        console.error('Failed to delete file:', error);
      }
    }
  };

  return (
    <div className="space-y-4">
      <Card className="p-6">
        <div
          {...getRootProps()}
          className={cn(
            'flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-8 cursor-pointer transition-colors',
            isDragActive
              ? 'border-indigo-500 bg-indigo-50'
              : 'border-gray-300 hover:border-indigo-400 hover:bg-gray-50',
            uploading && 'opacity-50 cursor-not-allowed'
          )}
        >
          <input {...getInputProps()} disabled={uploading} />
          {uploading ? (
            <Loader2 className="h-12 w-12 text-indigo-600 animate-spin" />
          ) : (
            <Upload className="h-12 w-12 text-gray-400" />
          )}
          <p className="mt-4 text-sm text-gray-600">
            {isDragActive
              ? 'Drop the file here...'
              : uploading
              ? 'Uploading...'
              : 'Drag & drop a file here, or click to select'}
          </p>
          <p className="mt-2 text-xs text-gray-500">
            Supported: PDF, TXT, DOC, DOCX (max 10MB)
          </p>
        </div>

        {uploadError && (
          <div className="mt-4 p-3 rounded-md bg-red-50 border border-red-200 text-red-800 text-sm">
            {uploadError}
          </div>
        )}
      </Card>

      {files.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-gray-900">Uploaded Files</h3>
          {files.map((file) => (
            <Card key={file.id} className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <File className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">{file.filename}</p>
                    <p className="text-xs text-gray-500">
                      {formatFileSize(file.file_size)} • {file.file_type}
                    </p>
                  </div>
                </div>
                {onDelete && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(file.id)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
              {file.content_summary && (
                <p className="mt-2 text-xs text-gray-600 line-clamp-2">{file.content_summary}</p>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

