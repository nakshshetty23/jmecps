"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Navigation() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const router = useRouter();

  const searchData = [
    { title: "Home", type: "PAGE", link: "/" },
    { title: "Vision and Mission", type: "PAGE", link: "/vision-and-mission" },
    { title: "About Journal", type: "PAGE", link: "/about-the-journal" },
    { title: "Editor's Message", type: "PAGE", link: "/monthly-message" },
    { title: "Aims & Scope", type: "PAGE", link: "/scope" },
    { title: "Editorial Board", type: "PAGE", link: "/editorial-board" },
    { title: "Author Guidelines", type: "PAGE", link: "/author-guidelines" },
    { title: "Submit Manuscript", type: "PAGE", link: "/submission" },
    { title: "Publication Charges", type: "PAGE", link: "/publication-charges" },
    { title: "Publication Ethics", type: "PAGE", link: "/publication-policy" },
    { title: "Archives", type: "PAGE", link: "/volumes-and-issues" },
    { title: "Contact Us", type: "PAGE", link: "/contact-us" },
    { title: "Smart Manufacturing using IoT", type: "ARTICLE", link: "#" },
    { title: "AI in Robotics", type: "ARTICLE", link: "#" },
    { title: "Cyber Physical Systems Security", type: "ARTICLE", link: "#" }
  ];

  const filteredResults = searchQuery.trim() === "" 
    ? [] 
    : searchData.filter(item => item.title.toLowerCase().includes(searchQuery.toLowerCase()));

  useEffect(() => {
    const checkLogin = () => {
      setIsLoggedIn(localStorage.getItem("isLoggedIn") === "true");
    };
    checkLogin();
    
    window.addEventListener("auth-change", checkLogin);
    return () => window.removeEventListener("auth-change", checkLogin);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("isLoggedIn");
    window.dispatchEvent(new Event("auth-change"));
  };

  return (
    <header className="w-full bg-[#0D1117] border-b border-[#EAB308] sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between py-3 lg:py-0 lg:h-16 items-center">
          {/* Left Area: Menu + Brand */}
          <div className="flex items-center">
            {/* Hover Menu */}
            <div className="relative group mr-4">
              <button className="p-2 border border-transparent hover:border-[#38BDF8] hover:bg-[#161B22] transition-none focus:outline-none flex items-center justify-center cursor-default">
                <svg className="w-6 h-6 text-[#F8FAFC] group-hover:text-[#38BDF8]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="square" strokeLinejoin="miter" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              
              {/* Dropdown Navigation */}
              <div className="absolute left-0 top-full pt-2 w-64 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-none z-50">
                <div className="bg-[#161B22] border border-[#30363D] overflow-hidden">
                  <nav className="flex flex-col py-2 font-mono text-sm">
                    <Link href="/" className="px-5 py-2.5 text-[#F8FAFC] hover:text-[#EAB308] hover:bg-[#30363D] transition-none">
                      Home
                    </Link>
                    <Link href="/vision-and-mission" className="px-5 py-2.5 text-[#F8FAFC] hover:text-[#EAB308] hover:bg-[#30363D] transition-none">
                      Vision and Mission
                    </Link>
                    <Link href="/about-the-journal" className="px-5 py-2.5 text-[#F8FAFC] hover:text-[#EAB308] hover:bg-[#30363D] transition-none">
                      About Journal
                    </Link>
                    <Link href="/monthly-message" className="px-5 py-2.5 text-[#F8FAFC] hover:text-[#EAB308] hover:bg-[#30363D] transition-none">
                      Editor's Message
                    </Link>
                    <Link href="/scope" className="px-5 py-2.5 text-[#F8FAFC] hover:text-[#EAB308] hover:bg-[#30363D] transition-none">
                      Aims & Scope
                    </Link>
                    <Link href="/editorial-board" className="px-5 py-2.5 text-[#F8FAFC] hover:text-[#EAB308] hover:bg-[#30363D] transition-none">
                      Editorial Board
                    </Link>
                    <Link href="/author-guidelines" className="px-5 py-2.5 text-[#F8FAFC] hover:text-[#EAB308] hover:bg-[#30363D] transition-none">
                      Author Guidelines
                    </Link>
                    <Link href="/submission" className="px-5 py-2.5 text-[#F8FAFC] hover:text-[#EAB308] hover:bg-[#30363D] transition-none">
                      Submit Manuscript
                    </Link>
                    <Link href="/publication-charges" className="px-5 py-2.5 text-[#F8FAFC] hover:text-[#EAB308] hover:bg-[#30363D] transition-none">
                      Publication Charges
                    </Link>
                    <Link href="/publication-policy" className="px-5 py-2.5 text-[#F8FAFC] hover:text-[#EAB308] hover:bg-[#30363D] transition-none">
                      Publication Ethics
                    </Link>
                    <Link href="/current-issue" className="px-5 py-2.5 text-[#F8FAFC] hover:text-[#EAB308] hover:bg-[#30363D] transition-none">
                      Current Issue
                    </Link>
                    <Link href="/volumes-and-issues" className="px-5 py-2.5 text-[#F8FAFC] hover:text-[#EAB308] hover:bg-[#30363D] transition-none">
                      Archives
                    </Link>
                    <Link href="/indexing" className="px-5 py-2.5 text-[#F8FAFC] hover:text-[#EAB308] hover:bg-[#30363D] transition-none">
                      Indexing
                    </Link>
                    <Link href="/contact-us" className="px-5 py-2.5 text-[#F8FAFC] hover:text-[#EAB308] hover:bg-[#30363D] transition-none">
                      Contact Us
                    </Link>
                  </nav>
                </div>
              </div>
            </div>

            {/* Brand */}
            <div className="flex-shrink-0 flex items-center gap-4">
              <Link href="/" className="heading-display text-2xl tracking-widest hover:text-[#EAB308]">
                JMECPS
              </Link>
              <div className="hidden lg:flex flex-col border-l border-[#30363D] pl-4">
                <span className="font-mono text-xs text-[#38BDF8] tracking-widest uppercase">The Journal of Mechanical, Electronics and Cyber Physical System</span>
                <span className="font-mono text-[10px] text-[#F8FAFC] opacity-60 uppercase tracking-widest mt-0.5">Peer-Reviewed | Open Access | Intl. Journal</span>
              </div>
            </div>
          </div>

          {/* Top Actions */}
          <div className="hidden md:flex items-center space-x-5 relative">
            {isSearchOpen ? (
              <div className="flex flex-col relative">
                <form 
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (filteredResults.length > 0) {
                      router.push(filteredResults[0].link);
                      setIsSearchOpen(false);
                      setSearchQuery("");
                    }
                  }}
                  className="flex items-center"
                >
                  <input 
                    type="text" 
                    autoFocus
                    placeholder="QUERY..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="bg-[#161B22] border border-[#30363D] text-[#F8FAFC] font-mono text-sm px-3 py-1 focus:outline-none focus:border-[#EAB308] w-64 placeholder:text-[#F8FAFC] placeholder:opacity-40"
                  />
                  <button 
                    type="button"
                    onClick={() => {
                      setIsSearchOpen(false);
                      setSearchQuery("");
                    }}
                    className="ml-2 font-mono text-sm text-[#F8FAFC] hover:text-red-500"
                  >
                    [X]
                  </button>
                </form>

                {searchQuery.trim() !== "" && (
                  <div className="absolute top-full mt-2 w-64 bg-[#161B22] border border-[#30363D] z-50 font-mono shadow-2xl">
                    {filteredResults.length > 0 ? (
                      <ul className="flex flex-col max-h-64 overflow-y-auto">
                        {filteredResults.map((res, idx) => (
                          <li key={idx} className="border-b border-[#30363D] last:border-0">
                            <button
                              onClick={() => {
                                router.push(res.link);
                                setIsSearchOpen(false);
                                setSearchQuery("");
                              }}
                              className="w-full text-left px-3 py-2 text-xs text-[#F8FAFC] hover:bg-[#30363D] hover:text-[#EAB308] transition-none flex flex-col"
                            >
                              <span className="font-bold opacity-100">{res.title}</span>
                              <span className="opacity-50 text-[10px] mt-0.5 tracking-widest">[{res.type}]</span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div className="px-3 py-4 text-xs text-[#F8FAFC] opacity-60 text-center uppercase tracking-widest">
                        NO MATCHES FOUND
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <button 
                onClick={() => setIsSearchOpen(true)}
                className="font-mono text-sm text-[#F8FAFC] hover:text-[#38BDF8] uppercase tracking-widest border border-transparent hover:border-[#38BDF8] px-3 py-1 transition-none"
              >
                [ SEARCH ]
              </button>
            )}
            
            {!isLoggedIn ? (
              <>
                <Link href="/login" className="font-mono text-sm text-[#F8FAFC] hover:text-[#EAB308] uppercase tracking-widest px-3 py-1 transition-none border border-transparent hover:border-[#EAB308]">
                  [ LOGIN ]
                </Link>
                <Link href="/login?register=true" className="btn-primary text-sm px-4 py-1.5">
                  REGISTER
                </Link>
              </>
            ) : (
              <div className="relative group">
                <Link href="/profile" className="flex items-center justify-center w-8 h-8 bg-[#38BDF8] text-black font-bold font-mono hover:bg-[#EAB308] transition-none border border-black">
                  U
                </Link>
                <div className="absolute right-0 top-full pt-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-none">
                  <div className="bg-[#161B22] border border-[#30363D] flex flex-col font-mono text-sm min-w-[120px]">
                    <Link href="/profile" className="px-4 py-2 text-[#F8FAFC] hover:bg-[#30363D] hover:text-[#38BDF8]">PROFILE</Link>
                    <button onClick={handleLogout} className="px-4 py-2 text-left text-red-500 hover:bg-[#30363D] hover:text-red-400">LOGOUT</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

