"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Upload, FileIcon, X, Loader2 } from "lucide-react";
import { useState, useRef } from "react";
import axios from "axios";
import { cn } from "@/lib/utils";

interface FileUploaderProps {
    researchId: string;
}

export default function FileUploader({ researchId }: FileUploaderProps) {
    const [dragActive, setDragActive] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const queryClient = useQueryClient();

    const uploadMutation = useMutation({
        mutationFn: async (files: FileList | File[]) => {
            const formData = new FormData();
            Array.from(files).forEach((file) => {
                formData.append("files", file);
            });

            // Using direct axios post to handle multipart/form-data correctly
            const response = await axios.post(
                `http://127.0.0.1:8000/api/research/${researchId}/upload`,
                formData,
                {
                    headers: {
                        "Content-Type": "multipart/form-data",
                    },
                }
            );
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["research", researchId] });
        },
    });

    const handleDrag = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            uploadMutation.mutate(e.dataTransfer.files);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        e.preventDefault();
        if (e.target.files && e.target.files.length > 0) {
            uploadMutation.mutate(e.target.files);
        }
    };

    const openFileExplorer = () => {
        inputRef.current?.click();
    };

    return (
        <div className="w-full">
            <div
                className={cn(
                    "relative border-2 border-dashed rounded-xl p-8 transition-colors text-center cursor-pointer",
                    dragActive
                        ? "border-primary bg-primary/5"
                        : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50",
                    uploadMutation.isPending && "opacity-50 pointer-events-none"
                )}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={openFileExplorer}
            >
                <input
                    placeholder="fileInput"
                    className="hidden"
                    ref={inputRef}
                    type="file"
                    multiple
                    onChange={handleChange}
                    accept=".pdf,.txt,.md,.docx"
                />

                <div className="flex flex-col items-center gap-2">
                    {uploadMutation.isPending ? (
                        <Loader2 className="w-8 h-8 text-primary animate-spin" />
                    ) : (
                        <Upload className="w-8 h-8 text-muted-foreground" />
                    )}
                    <p className="text-sm font-medium text-foreground">
                        {uploadMutation.isPending ? "Uploading..." : "Click to upload or drag and drop"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                        PDF, TXT, MD, DOCX (max 10MB)
                    </p>
                </div>
            </div>

            {uploadMutation.isError && (
                <p className="mt-2 text-sm text-destructive">
                    Failed to upload file. Please try again.
                </p>
            )}
        </div>
    );
}
