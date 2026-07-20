"use client";

import { useState } from "react";
import Sidebar from "@/components/shared/Sidebar";

export default function Submission() {
  const [formData, setFormData] = useState({
    authorName: "",
    email: "",
    paperTitle: "",
    abstract: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    // Simulate API call for submission
    setTimeout(() => {
      setIsSubmitting(false);
      setSuccess(true);
      setFormData({ authorName: "", email: "", paperTitle: "", abstract: "" });
    }, 1500);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 relative z-10">

      <div className="flex flex-col lg:flex-row gap-12">
        <div className="flex-grow">
          <h1 className="heading-display text-3xl pb-4 mb-8 border-b border-border text-accent">
            [ AUTHOR PORTAL: SUBMIT MANUSCRIPT ]
          </h1>

          {success && (
            <div className="bg-card border-l-4 border-accent text-text p-6 mb-8">
              <div className="flex items-center mb-2">
                <span className="text-accent mr-3 font-mono">[SUCCESS]</span>
                <p className="heading-display text-lg">Submission acknowledged.</p>
              </div>
              <p className="font-mono text-sm opacity-80 mt-2">SYS_MSG: We will review your manuscript shortly and contact you via email.</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="card-terminal space-y-6">
            
            <div className="relative">
              <label htmlFor="authorName" className="block text-xs font-mono text-primary mb-2 uppercase tracking-widest">[ AUTHOR FULL NAME ]</label>
              <input
                type="text"
                id="authorName"
                name="authorName"
                required
                value={formData.authorName}
                onChange={handleChange}
                className="block w-full border border-border focus:border-accent focus:ring-0 sm:text-sm px-4 py-3 bg-background text-text transition-none outline-none font-mono"
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
                value={formData.email}
                onChange={handleChange}
                className="block w-full border border-border focus:border-accent focus:ring-0 sm:text-sm px-4 py-3 bg-background text-text transition-none outline-none font-mono"
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
                value={formData.paperTitle}
                onChange={handleChange}
                className="block w-full border border-border focus:border-accent focus:ring-0 sm:text-sm px-4 py-3 bg-background text-text transition-none outline-none font-mono"
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
                value={formData.abstract}
                onChange={handleChange}
                className="block w-full border border-border focus:border-accent focus:ring-0 sm:text-sm px-4 py-3 bg-background text-text transition-none outline-none resize-none font-mono"
                placeholder="Provide a brief summary of your paper (max 300 words)..."
              />
            </div>

            <div className="pt-4 relative">
              <button
                type="submit"
                disabled={isSubmitting}
                className="btn-primary w-full flex justify-center py-4"
              >
                {isSubmitting ? (
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
        </div>
        <div className="w-full lg:w-80 flex-shrink-0">
          <Sidebar />
        </div>
      </div>
    </div>
  );
}
