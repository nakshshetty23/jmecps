"use client";

import { useRef, useState } from "react";
import { CheckCircle2, AlertTriangle } from "lucide-react";
import { sha256HexFromFile } from "@/lib/crypto";
import { saveDraftAction } from "@/lib/actions/submission";
import { requestUploadUrlAction, confirmUploadAction } from "@/lib/actions/upload";
import { ALLOWED_UPLOAD_MIME_TYPES } from "@/lib/validations/upload";

// Real Author Portal submission entry point — creates a real DRAFT
// manuscript (src/lib/actions/submission.ts's saveDraftAction) and uploads
// the file through the same secure pipeline every other submission path
// uses (src/lib/actions/upload.ts's requestUploadUrlAction/
// confirmUploadAction, R2 presigned URLs). This page only collects the
// minimal fields saveDraftAction's schema requires (see makeDraftSchema in
// src/lib/validations/submission.ts, which is deliberately lenient at draft
// stage) — keywords, subject category, and full per-author detail are
// still only collected on the full editor at /submissions/[id], which is
// also where finalizeSubmissionAction actually moves a manuscript out of
// DRAFT. Linking there after a successful draft+upload here, rather than
// silently calling finalizeSubmissionAction with fabricated field values,
// keeps this page honest about what it actually persisted.
const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024;
const ALLOWED_EXTENSIONS = ["pdf", "doc", "docx"];

type Stage =
  | "idle"
  | "creating-draft"
  | "hashing"
  | "checking-duplicates"
  | "uploading"
  | "done"
  | "error";

function validateFile(file: File): string | null {
  if (file.size > MAX_FILE_SIZE_BYTES) return "File exceeds the 25MB size limit.";
  const extension = file.name.includes(".") ? file.name.split(".").pop()!.toLowerCase() : "";
  if (
    !ALLOWED_UPLOAD_MIME_TYPES.includes(file.type as (typeof ALLOWED_UPLOAD_MIME_TYPES)[number]) ||
    !ALLOWED_EXTENSIONS.includes(extension)
  ) {
    return "Only PDF and Word documents (.pdf, .doc, .docx) are allowed.";
  }
  return null;
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

export default function AuthorPortalSubmissionForm() {
  const [formData, setFormData] = useState({
    authorName: "",
    email: "",
    paperTitle: "",
    abstract: "",
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [stage, setStage] = useState<Stage>("idle");
  const [progress, setProgress] = useState(0);
  const [formError, setFormError] = useState<string | null>(null);
  const [draftId, setDraftId] = useState<string | null>(null);
  const [duplicatePending, setDuplicatePending] = useState<{ hash: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isBusy = stage === "creating-draft" || stage === "hashing" || stage === "checking-duplicates" || stage === "uploading";

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const validationError = validateFile(file);
    if (validationError) {
      setFileError(validationError);
      setSelectedFile(null);
      e.target.value = "";
      return;
    }
    setFileError(null);
    setSelectedFile(file);
    setDuplicatePending(null);
    setStage("idle");
  }

  async function runUpload(manuscriptId: string, file: File, overrideDuplicate: boolean) {
    setStage("hashing");
    const fileHash = await sha256HexFromFile(file);

    setStage("checking-duplicates");
    const requestResult = await requestUploadUrlAction({
      manuscriptId,
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      fileHash,
      isSITConference: false,
      overrideDuplicate,
    });

    if (!requestResult.success || !requestResult.data) {
      setStage("error");
      if (requestResult.duplicate) {
        setDuplicatePending({ hash: fileHash });
        setFormError(
          `${requestResult.error ?? "Duplicate manuscript content detected."} Your draft was saved — you can upload anyway or continue from your saved draft.`
        );
      } else {
        setFormError(
          `${requestResult.error ?? "Could not prepare upload."} Your draft was saved — you can continue from your saved draft.`
        );
      }
      return;
    }

    const { uploadUrl, objectKey } = requestResult.data;

    setStage("uploading");
    setProgress(0);
    try {
      await uploadWithProgress(uploadUrl, file, setProgress);
    } catch (err) {
      setStage("error");
      setFormError(
        `${err instanceof Error ? err.message : "Upload failed."} Your draft was saved — you can continue from your saved draft.`
      );
      return;
    }

    const confirmResult = await confirmUploadAction({
      manuscriptId,
      objectKey,
      fileHash,
      isSITConference: false,
    });

    if (!confirmResult.success || !confirmResult.data) {
      setStage("error");
      setFormError(
        `${confirmResult.error ?? "Upload completed but could not be confirmed."} Your draft was saved — you can continue from your saved draft.`
      );
      return;
    }

    setStage("done");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (isBusy) return;
    setFormError(null);

    if (!selectedFile) {
      setFileError("Please attach your manuscript file before submitting.");
      return;
    }

    setStage("creating-draft");
    const draftResult = await saveDraftAction(null, {
      title: formData.paperTitle,
      abstract: formData.abstract,
      keywords: [],
      references: [],
      authors: [
        {
          firstName: formData.authorName,
          lastName: "",
          email: formData.email,
          institution: "",
          isCorresponding: true,
          orcid: "",
        },
      ],
    });

    if (!draftResult.success || !draftResult.data) {
      setStage("error");
      setFormError(
        draftResult.errors?._form?.[0] ?? "Could not save your submission. Please check the form for errors."
      );
      return;
    }

    setDraftId(draftResult.data.id);
    await runUpload(draftResult.data.id, selectedFile, false);
  }

  if (stage === "done" && draftId) {
    return (
      <div className="bg-card border-l-4 border-accent text-text p-6 mb-8">
        <div className="flex items-center mb-2">
          <span className="text-accent mr-3 font-mono">[SUCCESS]</span>
          <p className="heading-display text-lg">Draft saved and file attached.</p>
        </div>
        <p className="font-mono text-sm opacity-80 mt-2">
          SYS_MSG: Your manuscript and file were saved to your Author Portal draft. Sign in to{" "}
          <a href={`/submissions/${draftId}`} className="text-accent underline">
            continue your submission
          </a>{" "}
          — add keywords, subject category, and co-author details, then formally submit for review.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="card-terminal space-y-6" noValidate>
      <div className="relative">
        <label htmlFor="authorName" className="block text-xs font-mono text-primary mb-2 uppercase tracking-widest">[ AUTHOR FULL NAME ]</label>
        <input
          type="text"
          id="authorName"
          name="authorName"
          required
          disabled={isBusy}
          value={formData.authorName}
          onChange={handleChange}
          className="block w-full border border-border focus:border-accent focus:ring-0 sm:text-sm px-4 py-3 bg-background text-text transition-none outline-none font-mono disabled:opacity-60"
          placeholder="Dr. John Smith"
        />
      </div>

      <div className="relative">
        <label htmlFor="email" className="block text-xs font-mono text-primary mb-2 uppercase tracking-widest">[ EMAIL ADDRESS ]</label>
        <input
          type="email"
          id="email"
          name="email"
          required
          disabled={isBusy}
          value={formData.email}
          onChange={handleChange}
          className="block w-full border border-border focus:border-accent focus:ring-0 sm:text-sm px-4 py-3 bg-background text-text transition-none outline-none font-mono disabled:opacity-60"
          placeholder="john.smith@university.edu"
        />
      </div>

      <div className="relative">
        <label htmlFor="paperTitle" className="block text-xs font-mono text-primary mb-2 uppercase tracking-widest">[ MANUSCRIPT TITLE ]</label>
        <input
          type="text"
          id="paperTitle"
          name="paperTitle"
          required
          disabled={isBusy}
          value={formData.paperTitle}
          onChange={handleChange}
          className="block w-full border border-border focus:border-accent focus:ring-0 sm:text-sm px-4 py-3 bg-background text-text transition-none outline-none font-mono disabled:opacity-60"
          placeholder="Enter the full title of your research"
        />
      </div>

      <div className="relative">
        <label htmlFor="abstract" className="block text-xs font-mono text-primary mb-2 uppercase tracking-widest">[ ABSTRACT ]</label>
        <textarea
          id="abstract"
          name="abstract"
          required
          rows={5}
          disabled={isBusy}
          value={formData.abstract}
          onChange={handleChange}
          className="block w-full border border-border focus:border-accent focus:ring-0 sm:text-sm px-4 py-3 bg-background text-text transition-none outline-none resize-none font-mono disabled:opacity-60"
          placeholder="Provide a brief summary of your paper (max 300 words)..."
        />
      </div>

      <div className="relative">
        <span id="manuscriptFileLabel" className="block text-xs font-mono text-primary mb-2 uppercase tracking-widest">[ MANUSCRIPT FILE ]</span>
        <input
          ref={fileInputRef}
          type="file"
          id="manuscriptFile"
          aria-labelledby="manuscriptFileLabel"
          accept=".pdf,.doc,.docx"
          disabled={isBusy}
          className="hidden"
          onChange={handleFileChange}
        />
        <div className="flex flex-wrap items-center justify-between gap-3 border border-border bg-background px-4 py-3">
          <button
            type="button"
            disabled={isBusy}
            onClick={() => fileInputRef.current?.click()}
            aria-describedby="manuscriptFileStatus"
            className="btn-primary px-4 py-2 text-xs disabled:opacity-60"
          >
            {selectedFile ? "Change File" : "Add File"}
          </button>
          <span id="manuscriptFileStatus" className="font-mono text-sm text-text flex items-center gap-2">
            {selectedFile ? (
              <>
                <CheckCircle2 className="h-4 w-4 text-accent shrink-0" aria-hidden="true" />
                <span>[SELECTED] {selectedFile.name}</span>
              </>
            ) : (
              <span className="opacity-70">No manuscript file selected</span>
            )}
          </span>
        </div>
        <p className="font-mono text-xs opacity-60 mt-2">PDF or Word document (.pdf, .doc, .docx), up to 25MB.</p>

        {isBusy && (
          <div className="mt-3 font-mono text-xs text-primary" role="status" aria-live="polite">
            {stage === "creating-draft" && "SYS_MSG: Saving draft…"}
            {stage === "hashing" && "SYS_MSG: Verifying file (SHA-256)…"}
            {stage === "checking-duplicates" && "SYS_MSG: Checking for duplicate submissions…"}
            {stage === "uploading" && (
              <>
                SYS_MSG: Uploading to storage… {progress}%
                <div className="h-1.5 w-full max-w-xs bg-border mt-1">
                  <div className="h-1.5 bg-accent transition-all" style={{ width: `${progress}%` }} />
                </div>
              </>
            )}
          </div>
        )}

        {fileError && (
          <p className="font-mono text-xs text-destructive mt-2 flex items-center gap-2" role="alert">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            [ERROR] {fileError}
          </p>
        )}

        {duplicatePending && selectedFile && (
          <button
            type="button"
            disabled={isBusy}
            onClick={() => draftId && runUpload(draftId, selectedFile, true)}
            className="mt-3 border border-accent text-accent px-3 py-1.5 text-xs font-mono uppercase tracking-widest disabled:opacity-60"
          >
            Upload Anyway
          </button>
        )}
      </div>

      {formError && (
        <div className="bg-card border-l-4 border-destructive text-text p-4" role="alert">
          <span className="text-destructive font-mono text-xs">[ERROR]</span>{" "}
          <span className="font-mono text-sm">{formError}</span>
          {draftId && (
            <p className="font-mono text-xs opacity-80 mt-2">
              <a href={`/submissions/${draftId}`} className="text-accent underline">
                Continue from your saved draft
              </a>
            </p>
          )}
        </div>
      )}

      <div className="pt-4 relative">
        <button
          type="submit"
          disabled={isBusy}
          className="btn-primary w-full flex justify-center py-4"
        >
          {isBusy ? (
            <span className="flex items-center font-mono">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-text" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              PROCESSING...
            </span>
          ) : "SUBMIT_MANUSCRIPT"}
        </button>
      </div>
    </form>
  );
}
