"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isRegistering, setIsRegistering] = useState(false);

  useEffect(() => {
    if (searchParams.get("register") === "true") {
      setIsRegistering(true);
    }
  }, [searchParams]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Simulate authentication
    localStorage.setItem("isLoggedIn", "true");
    window.dispatchEvent(new Event("auth-change"));
    router.push("/");
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 relative z-10">
      
      <div className="max-w-md w-full space-y-8 card-terminal">
        
        <div>
          <h2 className="mt-2 text-center heading-display text-3xl text-text">
            {isRegistering ? "[ SYSTEM_REGISTER ]" : "[ SYSTEM_AUTH ]"}
          </h2>
          <p className="mt-2 text-center font-mono text-sm text-text opacity-60">
            {isRegistering ? "OR " : "OR "}
            <button 
              onClick={() => setIsRegistering(!isRegistering)} 
              className="font-medium text-accent hover:text-primary transition-none focus:outline-none uppercase tracking-widest"
            >
              {isRegistering ? "ACCESS EXISTING NODE" : "INITIALIZE NEW NODE"}
            </button>
          </p>
        </div>
        
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            {isRegistering && (
              <>
                <div>
                  <label htmlFor="name" className="sr-only">Full Name</label>
                  <input id="name" name="name" type="text" required className="appearance-none relative block w-full px-3 py-3 border border-border placeholder-[var(--color-border)] text-text bg-background focus:outline-none focus:border-accent focus:ring-0 font-mono text-sm" placeholder="[ FULL_NAME ]" />
                </div>
                <div>
                  <label htmlFor="mobile" className="sr-only">Mobile Number</label>
                  <input id="mobile" name="mobile" type="tel" required className="appearance-none relative block w-full px-3 py-3 border border-border placeholder-[var(--color-border)] text-text bg-background focus:outline-none focus:border-accent focus:ring-0 font-mono text-sm" placeholder="[ MOBILE_NUMBER ]" />
                </div>
                <div>
                  <label htmlFor="affiliation" className="sr-only">Affiliation / Institution</label>
                  <input id="affiliation" name="affiliation" type="text" required className="appearance-none relative block w-full px-3 py-3 border border-border placeholder-[var(--color-border)] text-text bg-background focus:outline-none focus:border-accent focus:ring-0 font-mono text-sm" placeholder="[ INSTITUTION ]" />
                </div>
                <div>
                  <label htmlFor="department" className="sr-only">Department</label>
                  <input id="department" name="department" type="text" required className="appearance-none relative block w-full px-3 py-3 border border-border placeholder-[var(--color-border)] text-text bg-background focus:outline-none focus:border-accent focus:ring-0 font-mono text-sm" placeholder="[ DEPARTMENT ]" />
                </div>
                <div>
                  <label htmlFor="title" className="sr-only">Academic Title / Degree</label>
                  <input id="title" name="title" type="text" required className="appearance-none relative block w-full px-3 py-3 border border-border placeholder-[var(--color-border)] text-text bg-background focus:outline-none focus:border-accent focus:ring-0 font-mono text-sm" placeholder="[ ACADEMIC_TITLE ]" />
                </div>
              </>
            )}
            <div>
              <label htmlFor="email-address" className="sr-only">Email address</label>
              <input id="email-address" name="email" type="email" autoComplete="email" required className="appearance-none relative block w-full px-3 py-3 border border-border placeholder-[var(--color-border)] text-text bg-background focus:outline-none focus:border-accent focus:ring-0 font-mono text-sm" placeholder="[ EMAIL_ADDRESS ]" />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">Password</label>
              <input id="password" name="password" type="password" autoComplete="current-password" required className="appearance-none relative block w-full px-3 py-3 border border-border placeholder-[var(--color-border)] text-text bg-background focus:outline-none focus:border-accent focus:ring-0 font-mono text-sm" placeholder="[ PASSWORD ]" />
            </div>
            {isRegistering && (
              <div>
                <label htmlFor="confirm-password" className="sr-only">Confirm Password</label>
                <input id="confirm-password" name="confirm-password" type="password" required className="appearance-none relative block w-full px-3 py-3 border border-border placeholder-[var(--color-border)] text-text bg-background focus:outline-none focus:border-accent focus:ring-0 font-mono text-sm" placeholder="[ CONFIRM_PASSWORD ]" />
              </div>
            )}
          </div>

          {!isRegistering && (
            <div className="flex items-center justify-between font-mono text-xs">
              <div className="flex items-center">
                <input id="remember-me" name="remember-me" type="checkbox" className="h-4 w-4 text-accent focus:ring-[var(--color-accent)] border-border bg-background rounded-none" />
                <label htmlFor="remember-me" className="ml-2 block text-text opacity-80 uppercase tracking-widest">
                  Persist_Session
                </label>
              </div>

              <div>
                <a href="#" className="font-medium text-accent hover:text-primary uppercase tracking-widest transition-none">
                  Reset_Password?
                </a>
              </div>
            </div>
          )}

          <div>
            <button type="submit" className="btn-primary w-full flex justify-center py-3 px-4">
              {isRegistering ? "EXECUTE_REGISTRATION" : "EXECUTE_LOGIN"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Login() {
  return (
    <Suspense fallback={<div className="min-h-[80vh] flex items-center justify-center font-mono text-accent">LOADING_NODE...</div>}>
      <LoginContent />
    </Suspense>
  );
}
