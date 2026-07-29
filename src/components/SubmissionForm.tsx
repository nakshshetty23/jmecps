"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import {
  draftSchema,
  submitSchema,
  countWords,
  SUBJECT_CATEGORIES,
  SUBJECT_CATEGORY_LABELS,
  type DraftFormValues,
} from "@/lib/validations/submission";
import { saveDraftAction, submitManuscriptAction } from "@/lib/actions/submission";
import FileUpload from "@/components/FileUpload";

const WORD_LIMIT = 300;

const emptyAuthor = {
  firstName: "",
  lastName: "",
  email: "",
  institution: "",
  isCorresponding: false,
  orcid: "",
};

interface SubmissionFormProps {
  manuscriptId: string | null;
  initialData?: Partial<DraftFormValues>;
  initialFile?: { fileUrl: string; fileHash: string; isSITConference: boolean } | null;
  readOnly?: boolean;
}

export default function SubmissionForm({
  manuscriptId,
  initialData,
  initialFile,
  readOnly = false,
}: SubmissionFormProps) {
  const router = useRouter();
  const [currentId, setCurrentId] = useState(manuscriptId);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [keywordInput, setKeywordInput] = useState("");
  const [referenceInput, setReferenceInput] = useState("");

  const {
    register,
    control,
    handleSubmit,
    watch,
    getValues,
    setValue,
    setError,
    formState: { errors },
  } = useForm<DraftFormValues>({
    resolver: zodResolver(draftSchema),
    defaultValues: {
      title: initialData?.title ?? "",
      abstract: initialData?.abstract ?? "",
      keywords: initialData?.keywords ?? [],
      authors: initialData?.authors?.length ? initialData.authors : [{ ...emptyAuthor, isCorresponding: true }],
      category: initialData?.category,
      references: initialData?.references ?? [],
    },
  });

  const {
    fields: authorFields,
    append: appendAuthor,
    remove: removeAuthor,
  } = useFieldArray({ control, name: "authors" });

  const keywords = watch("keywords") ?? [];
  const references = watch("references") ?? [];
  const abstractValue = watch("abstract");
  const wordCount = countWords(abstractValue ?? "");
  const isOverLimit = wordCount > WORD_LIMIT;

  function addKeyword() {
    const value = keywordInput.trim();
    if (!value || keywords.length >= 10 || keywords.includes(value)) {
      setKeywordInput("");
      return;
    }
    setValue("keywords", [...keywords, value]);
    setKeywordInput("");
  }

  function removeKeyword(index: number) {
    setValue(
      "keywords",
      keywords.filter((_, i) => i !== index)
    );
  }

  function addReference() {
    const value = referenceInput.trim();
    if (!value) return;
    setValue("references", [...references, value]);
    setReferenceInput("");
  }

  function removeReference(index: number) {
    setValue(
      "references",
      references.filter((_, i) => i !== index)
    );
  }

  function markCorresponding(index: number) {
    authorFields.forEach((_, i) => setValue(`authors.${i}.isCorresponding`, i === index));
  }

  async function onSaveDraft(values: DraftFormValues) {
    setFormError(null);
    setIsSavingDraft(true);
    try {
      const result = await saveDraftAction(currentId, values);
      if (!result.success) {
        setFormError(result.errors?._form?.[0] ?? "Could not save draft. Please check the form for errors.");
        return;
      }
      if (result.data?.id && result.data.id !== currentId) {
        setCurrentId(result.data.id);
        router.replace(`/submissions/${result.data.id}`, { scroll: false });
      }
    } finally {
      setIsSavingDraft(false);
    }
  }

  async function onSubmitManuscript() {
    setFormError(null);
    const values = getValues();
    const parsed = submitSchema.safeParse(values);

    if (!parsed.success) {
      parsed.error.issues.forEach((issue) => {
        setError(issue.path.join(".") as any, { type: "manual", message: issue.message });
      });
      setFormError("Please fix the highlighted fields before submitting.");
      return;
    }

    if (!currentId) {
      setFormError("Save this manuscript as a draft before submitting.");
      return;
    }

    const confirmed = window.confirm(
      "Once submitted, this manuscript can no longer be edited. Submit for review?"
    );
    if (!confirmed) return;

    setIsSubmitting(true);
    try {
      const result = await submitManuscriptAction(currentId, values);
      if (!result.success) {
        setFormError(result.errors?._form?.[0] ?? "Could not submit manuscript. Please check the form for errors.");
        return;
      }
      router.push(`/submissions/${currentId}`);
      router.refresh();
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form
      noValidate
      onSubmit={handleSubmit(onSaveDraft)}
      className="flex flex-col gap-6 max-w-3xl mx-auto px-4 py-10"
    >
      <fieldset disabled={readOnly} className="contents">
      {readOnly && (
        <div className="rounded-md border border-primary/40 bg-primary/10 px-3 py-2 text-sm text-primary">
          This manuscript has already been submitted and can no longer be edited.
        </div>
      )}
      {formError && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {formError}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="heading-display text-2xl text-primary">Manuscript Details</CardTitle>
          <CardDescription>Title, abstract, and subject category.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="title">Title</Label>
            <Input id="title" maxLength={250} {...register("title")} />
            {errors.title && <p className="text-sm text-destructive">{errors.title.message}</p>}
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="abstract">Abstract</Label>
              <span
                className={
                  isOverLimit ? "text-sm font-medium text-destructive" : "text-sm text-muted-foreground"
                }
              >
                {wordCount} / {WORD_LIMIT} words
              </span>
            </div>
            <Textarea id="abstract" rows={8} {...register("abstract")} />
            {errors.abstract && <p className="text-sm text-destructive">{errors.abstract.message}</p>}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="category">Subject Category</Label>
            <select
              id="category"
              {...register("category")}
              defaultValue=""
              className="flex h-9 w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <option value="">Select a category…</option>
              {SUBJECT_CATEGORIES.map((value) => (
                <option key={value} value={value}>
                  {SUBJECT_CATEGORY_LABELS[value]}
                </option>
              ))}
            </select>
            {errors.category && <p className="text-sm text-destructive">{errors.category.message}</p>}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="heading-display text-xl text-primary">Keywords</CardTitle>
          <CardDescription>3–10 keywords required for submission.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="flex gap-2">
            <Input
              value={keywordInput}
              onChange={(e) => setKeywordInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addKeyword();
                }
              }}
              placeholder="Add a keyword and press Enter"
            />
            <Button type="button" variant="outline" onClick={addKeyword}>
              Add
            </Button>
          </div>
          {keywords.length > 0 && (
            <ul className="flex flex-wrap gap-2">
              {keywords.map((keyword, index) => (
                <li
                  key={`${keyword}-${index}`}
                  className="flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-sm"
                >
                  {keyword}
                  <button
                    type="button"
                    onClick={() => removeKeyword(index)}
                    className="text-muted-foreground hover:text-destructive"
                    aria-label={`Remove ${keyword}`}
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          )}
          {errors.keywords && (
            <p className="text-sm text-destructive">{errors.keywords.message as string}</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="heading-display text-xl text-primary">Authors</CardTitle>
          <CardDescription>Mark exactly one author as corresponding.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          {authorFields.map((field, index) => (
            <div key={field.id} className="flex flex-col gap-3 rounded-md border border-border p-4">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
                  Author {index + 1}
                </span>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="corresponding-author"
                    checked={watch(`authors.${index}.isCorresponding`) ?? false}
                    onChange={() => markCorresponding(index)}
                    className="accent-primary"
                  />
                  Corresponding author
                </label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor={`authors.${index}.firstName`}>First Name</Label>
                  <Input id={`authors.${index}.firstName`} {...register(`authors.${index}.firstName`)} />
                  {errors.authors?.[index]?.firstName && (
                    <p className="text-sm text-destructive">{errors.authors[index]?.firstName?.message}</p>
                  )}
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor={`authors.${index}.lastName`}>Last Name</Label>
                  <Input id={`authors.${index}.lastName`} {...register(`authors.${index}.lastName`)} />
                  {errors.authors?.[index]?.lastName && (
                    <p className="text-sm text-destructive">{errors.authors[index]?.lastName?.message}</p>
                  )}
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor={`authors.${index}.email`}>Email</Label>
                  <Input id={`authors.${index}.email`} type="email" {...register(`authors.${index}.email`)} />
                  {errors.authors?.[index]?.email && (
                    <p className="text-sm text-destructive">{errors.authors[index]?.email?.message}</p>
                  )}
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor={`authors.${index}.institution`}>Institution</Label>
                  <Input id={`authors.${index}.institution`} {...register(`authors.${index}.institution`)} />
                  {errors.authors?.[index]?.institution && (
                    <p className="text-sm text-destructive">{errors.authors[index]?.institution?.message}</p>
                  )}
                </div>
                <div className="flex flex-col gap-1.5 sm:col-span-2">
                  <Label htmlFor={`authors.${index}.orcid`}>ORCID (optional)</Label>
                  <Input
                    id={`authors.${index}.orcid`}
                    placeholder="0000-0000-0000-0000"
                    {...register(`authors.${index}.orcid`)}
                  />
                  {errors.authors?.[index]?.orcid && (
                    <p className="text-sm text-destructive">{errors.authors[index]?.orcid?.message}</p>
                  )}
                </div>
              </div>

              {authorFields.length > 1 && (
                <Button
                  type="button"
                  variant="outline"
                  className="self-start text-destructive hover:bg-destructive/10"
                  onClick={() => removeAuthor(index)}
                >
                  Remove author
                </Button>
              )}
            </div>
          ))}

          {typeof errors.authors?.message === "string" && (
            <p className="text-sm text-destructive">{errors.authors.message}</p>
          )}

          <Button type="button" variant="outline" className="self-start" onClick={() => appendAuthor({ ...emptyAuthor })}>
            + Add author
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="heading-display text-xl text-primary">References</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="flex gap-2">
            <Input
              value={referenceInput}
              onChange={(e) => setReferenceInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addReference();
                }
              }}
              placeholder="Add a citation and press Enter"
            />
            <Button type="button" variant="outline" onClick={addReference}>
              Add
            </Button>
          </div>
          {references.length > 0 && (
            <ol className="flex flex-col gap-2 list-decimal list-inside">
              {references.map((reference, index) => (
                <li key={`${reference}-${index}`} className="flex items-start justify-between gap-3 text-sm">
                  <span className="flex-1">{reference}</span>
                  <button
                    type="button"
                    onClick={() => removeReference(index)}
                    className="text-muted-foreground hover:text-destructive"
                    aria-label="Remove reference"
                  >
                    ×
                  </button>
                </li>
              ))}
            </ol>
          )}
        </CardContent>
      </Card>

      {currentId ? (
        <FileUpload manuscriptId={currentId} initialFile={initialFile} disabled={readOnly} />
      ) : (
        !readOnly && (
          <div className="rounded-md border border-border bg-card px-3 py-2 text-sm text-muted-foreground">
            Save this manuscript as a draft first to enable file upload.
          </div>
        )
      )}

      {!readOnly && (
        <div className="flex gap-3">
          <Button type="submit" variant="outline" disabled={isSavingDraft || isSubmitting}>
            {isSavingDraft ? "Saving…" : "Save Draft"}
          </Button>
          <Button
            type="button"
            onClick={onSubmitManuscript}
            disabled={isSavingDraft || isSubmitting}
            className="bg-primary text-primary-foreground hover:bg-primary/80"
          >
            {isSubmitting ? "Submitting…" : "Submit Manuscript"}
          </Button>
        </div>
      )}
      </fieldset>
    </form>
  );
}
