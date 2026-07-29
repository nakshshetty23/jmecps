"use client";

import { useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, FileText, Loader2, UploadCloud } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { sha256HexFromFile, hashSnippet } from "@/lib/crypto";
import { requestUploadUrlAction, confirmUploadAction } from "@/lib/actions/upload";

const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024;
const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];
const ALLOWED_EXTENSIONS = ["pdf", "doc", "docx"];

type Stage = "idle" | "hashing" | "checking-duplicates" | "uploading" | "completed" | "error";

interface UploadedFileInfo {
  fileName: string;
  fileSizeBytes: number;
  fileHash: string;
  fileUrl: string;
  editorialRouting: "SIT_TRACK" | "STANDARD_TRACK";
}

interface FileUploadProps {
  manuscriptId: string;
  initialFile?: {
    fileUrl: string;
    fileHash: string;
    isSITConference: boolean;
  } | null;
  disabled?: boolean;
}

function uploadWithProgress(url: string, file: File, onProgress: (percent: number) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.setRequestHeader("Content-Type", file.type);
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(Math.round((event.loaded / event.total) * 100));
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new Error(`Upload to storage failed (status ${xhr.status}).`));
    };
    xhr.onerror = () => reject(new Error("Upload to storage failed — network error."));
    xhr.send(file);
  });
}

function validateFile(file: File): string | null {
  if (file.size > MAX_FILE_SIZE_BYTES) return "File exceeds the 25MB size limit.";
  const extension = file.name.includes(".") ? file.name.split(".").pop()!.toLowerCase() : "";
  if (!ALLOWED_MIME_TYPES.includes(file.type) || !ALLOWED_EXTENSIONS.includes(extension)) {
    return "Only PDF and Word documents (.pdf, .doc, .docx) are allowed.";
  }
  return null;
}

export default function FileUpload({ manuscriptId, initialFile, disabled = false }: FileUploadProps) {
  const [stage, setStage] = useState<Stage>("idle");
  const [progress, setProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [duplicatePending, setDuplicatePending] = useState<{ file: File; hash: string } | null>(null);
  const [isSITConference, setIsSITConference] = useState(initialFile?.isSITConference ?? false);
  const [uploaded, setUploaded] = useState<UploadedFileInfo | null>(
    initialFile
      ? {
          fileName: initialFile.fileUrl.split("/").pop() ?? "manuscript file",
          fileSizeBytes: 0,
          fileHash: initialFile.fileHash,
          fileUrl: initialFile.fileUrl,
          editorialRouting: initialFile.isSITConference ? "SIT_TRACK" : "STANDARD_TRACK",
        }
      : null
  );
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function processFile(file: File, overrideDuplicate = false) {
    const validationError = validateFile(file);
    if (validationError) {
      setStage("error");
      setErrorMessage(validationError);
      return;
    }

    setErrorMessage(null);
    setDuplicatePending(null);
    setStage("hashing");
    const fileHash = await sha256HexFromFile(file);

    setStage("checking-duplicates");
    const requestResult = await requestUploadUrlAction({
      manuscriptId,
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      fileHash,
      isSITConference,
      overrideDuplicate,
    });

    if (!requestResult.success || !requestResult.data) {
      setStage("error");
      setErrorMessage(requestResult.error ?? "Could not prepare upload.");
      if (requestResult.duplicate) setDuplicatePending({ file, hash: fileHash });
      return;
    }

    const { uploadUrl, objectKey } = requestResult.data;

    setStage("uploading");
    setProgress(0);
    try {
      await uploadWithProgress(uploadUrl, file, setProgress);
    } catch (err) {
      setStage("error");
      setErrorMessage(err instanceof Error ? err.message : "Upload failed.");
      return;
    }

    const confirmResult = await confirmUploadAction({
      manuscriptId,
      objectKey,
      fileHash,
      isSITConference,
    });

    if (!confirmResult.success || !confirmResult.data) {
      setStage("error");
      setErrorMessage(confirmResult.error ?? "Upload completed but could not be confirmed.");
      return;
    }

    setUploaded({
      fileName: file.name,
      fileSizeBytes: file.size,
      fileHash,
      fileUrl: confirmResult.data.fileUrl,
      editorialRouting: confirmResult.data.editorialRouting,
    });
    setStage("completed");
  }

  function handleFiles(fileList: FileList | null) {
    const file = fileList?.[0];
    if (file) processFile(file);
  }

  const isBusy = stage === "hashing" || stage === "checking-duplicates" || stage === "uploading";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="heading-display text-xl text-primary">Manuscript File</CardTitle>
        <CardDescription>PDF or Word document, up to 25MB. Required before submission.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={isSITConference}
            disabled={disabled || isBusy}
            onChange={(e) => setIsSITConference(e.target.checked)}
            className="accent-primary"
          />
          This manuscript is a SIT Conference submission
        </label>

        {!disabled && (
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragActive(true);
            }}
            onDragLeave={() => setDragActive(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragActive(false);
              handleFiles(e.dataTransfer.files);
            }}
            onClick={() => !isBusy && inputRef.current?.click()}
            className={`flex flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed p-8 text-center text-sm cursor-pointer transition-colors ${
              dragActive ? "border-primary bg-primary/5" : "border-border"
            } ${isBusy ? "pointer-events-none opacity-60" : ""}`}
          >
            <input
              ref={inputRef}
              type="file"
              accept=".pdf,.doc,.docx"
              className="hidden"
              onChange={(e) => handleFiles(e.target.files)}
            />
            {isBusy ? (
              <>
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                <span>
                  {stage === "hashing" && "Hashing file (SHA-256)…"}
                  {stage === "checking-duplicates" && "Checking for duplicate submissions…"}
                  {stage === "uploading" && `Uploading to storage… ${progress}%`}
                </span>
                {stage === "uploading" && (
                  <div className="h-2 w-full max-w-xs rounded-full bg-secondary">
                    <div
                      className="h-2 rounded-full bg-primary transition-all"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                )}
              </>
            ) : (
              <>
                <UploadCloud className="h-6 w-6 text-muted-foreground" />
                <span>Drag and drop your manuscript here, or click to browse.</span>
              </>
            )}
          </div>
        )}

        {stage === "error" && errorMessage && (
          <div className="flex flex-col gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            <span className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              {errorMessage}
            </span>
            {duplicatePending && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="self-start"
                onClick={() => processFile(duplicatePending.file, true)}
              >
                Upload anyway (updating this draft)
              </Button>
            )}
          </div>
        )}

        {stage === "completed" && uploaded && (
          <div className="flex flex-col gap-1.5 rounded-md border border-primary/40 bg-primary/10 px-3 py-3 text-sm">
            <span className="flex items-center gap-2 font-medium text-primary">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              File attached
            </span>
            <span className="flex items-center gap-2 text-muted-foreground">
              <FileText className="h-4 w-4 shrink-0" />
              {uploaded.fileName}
              {uploaded.fileSizeBytes > 0 && ` (${(uploaded.fileSizeBytes / (1024 * 1024)).toFixed(2)} MB)`}
            </span>
            <span className="font-mono text-xs text-muted-foreground">SHA-256: {hashSnippet(uploaded.fileHash)}</span>
            <span className="w-fit rounded-full border border-accent/40 bg-accent/10 px-2 py-0.5 font-mono text-xs uppercase tracking-wide text-accent">
              {uploaded.editorialRouting === "SIT_TRACK" ? "SIT Track" : "Standard Track"}
            </span>
            {!disabled && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-1 self-start"
                onClick={() => {
                  setStage("idle");
                  setUploaded(null);
                }}
              >
                Replace file
              </Button>
            )}
          </div>
        )}

        {disabled && !uploaded && (
          <p className="text-sm text-muted-foreground">No file was uploaded for this manuscript.</p>
        )}
      </CardContent>
    </Card>
  );
}
