"use client";
import React, { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { Search, ArrowLeft, Home, Settings, ChevronRight } from "lucide-react";
import { Button } from "../components/ui/Button";

const SITE_LINKS = [
  { title: "Home", url: "/", description: "Back to the GymOS" },
  { title: "Plan", url: "/plan", description: "View our Plans and plan your growth" },
  { title: "Member Login", url: "/member-login", description: "Login/Sign-up as a Member" },
  { title: "Settings", url: "/settings", description: "View settings for theme and cache stale build" },
  { title: "Admin Login", url: "/login", description: "Login/Sign-up as a Admin" },
];

export default function NotFound() {
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [isFocused, setIsFocused] = useState(false);

  // Debounce the search query
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300); // 300ms delay
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Filter links based on debounced query
  const filteredLinks = useMemo(() => {
    if (!debouncedQuery.trim()) return [];
    const lowerQuery = debouncedQuery.toLowerCase();
    return SITE_LINKS.filter(
      (link) =>
        link.title.toLowerCase().includes(lowerQuery) ||
        link.description.toLowerCase().includes(lowerQuery)
    );
  }, [debouncedQuery]);
  return (
    <div className="min-h-screen scroll-smooth w-full flex items-center justify-center relative py-20 md:py-32">
      {/* Subtle ambient glows for the background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
      </div>

      <div className="container px-6 mx-auto relative z-10 w-full">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-16 w-full max-w-6xl mx-auto">
          {/* Left Text Content */}
          <div className="flex-1 space-y-8 w-full max-w-xl text-center lg:text-left">
            <div className="space-y-4">
              <h1 className="text-primary font-semibold tracking-wider uppercase text-2xl sm:text-3xl">
                404 Error
              </h1>
              <h1 className="font-bold tracking-tight text-foreground font-outfit text-6xl sm:text-7xl md:text-8xl leading-[1.1]">
                Page not <br className="hidden lg:block" /> found
              </h1>
              <p className="text-lg text-muted-foreground leading-relaxed max-w-md mx-auto lg:mx-0">
                Sorry, the page you are looking for doesn't exist or has been moved. Try searching our site or head back to safety.
              </p>
            </div>

            {/* Search Input & Dropdown */}
            <div className="relative w-full max-w-md mx-auto lg:mx-0">
              <div className="flex flex-col sm:flex-row gap-3 w-full">
                <div className="relative flex-1">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setTimeout(() => setIsFocused(false), 200)} // delay to allow clicks
                    placeholder="Search inside the app"
                    className="input-base pl-10 h-12 w-full"
                  />
                </div>
              </div>

              {/* Search Results Dropdown */}
              {isFocused && searchQuery.trim() && (
                <div className="absolute top-full left-0 right-0 mt-2 card-base overflow-auto z-50 animate-in fade-in slide-in-from-top-2">
                  {filteredLinks.length > 0 ? (
                    <ul className="max-h-60 overflow-y-auto py-2">
                      {filteredLinks.map((link, idx) => (
                        <li key={idx}>
                          <Link
                            to={link.url}
                            className="flex flex-col px-4 py-2 hover:bg-muted/50 transition-colors group"
                          >
                            <span className="text-foreground font-medium flex items-center justify-between">
                              {link.title}
                              <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all" />
                            </span>
                            <span className="text-xs text-muted-foreground">{link.description}</span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="p-4 text-center text-sm text-muted-foreground">
                      No matching pages found for "{debouncedQuery}"
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Back Links */}
            <div className="pt-4 flex flex-wrap gap-4 justify-center lg:justify-start">
              <Link to="/">
                <Button
                  variant="ghost"
                  className="rounded-full px-6 py-5 text-muted-foreground hover:text-foreground hover:bg-muted/50 group"
                >
                  <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
                  Go back
                </Button>
              </Link>
              <Link to="/">
                <Button
                  variant="outline"
                  className="rounded-full px-6 py-5 btn-outline"
                >
                  <Home className="w-4 h-4 mr-2" />
                  Take me home
                </Button>
              </Link>
            </div>
          </div>

          {/* Right Illustration */}
          <div className="flex-1 w-full max-w-xl relative flex justify-center items-center">
            <div className="relative w-full aspect-video flex items-center justify-center opacity-80 select-none">
              {/* Abstract 404 Illustration using SVG */}
              <svg width="100%" height="100%" viewBox="0 0 400 200" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-primary stroke-current">
                {/* Horizontal Tracks */}
                <line x1="20" y1="40" x2="380" y2="40" strokeWidth="2" />
                <line x1="20" y1="160" x2="380" y2="160" strokeWidth="2" />

                {/* First '4' */}
                <path d="M120 40 L60 120 L120 120 Z" strokeWidth="2" strokeLinejoin="round" />
                <line x1="120" y1="40" x2="120" y2="160" strokeWidth="2" />
                <circle cx="120" cy="40" r="12" fill="currentColor" className="animate-pulse" />
                <circle cx="60" cy="120" r="12" fill="currentColor" className="animate-pulse" />
                <circle cx="120" cy="120" r="12" fill="currentColor" className="animate-pulse" />
                <circle cx="120" cy="160" r="12" fill="currentColor" className="animate-pulse" />

                {/* The '0' is replaced by the absolute Settings icon below */}


                {/* Second '4' */}
                <path d="M340 40 L280 120 L340 120 Z" strokeWidth="2" strokeLinejoin="round" />
                <line x1="340" y1="40" x2="340" y2="160" strokeWidth="2" />
                <circle cx="340" cy="40" r="12" fill="currentColor" className="animate-pulse" />
                <circle cx="280" cy="120" r="12" fill="currentColor" className="animate-pulse" />
                <circle cx="340" cy="120" r="12" fill="currentColor" className="animate-pulse" />
                <circle cx="340" cy="160" r="12" fill="currentColor" className="animate-pulse" />
              </svg>

              {/* Spinning Gear for '0' */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
                <Settings className="w-24 h-24 sm:w-32 sm:h-32 text-primary transition-tranform duration-1000 animate-spin-reverse" strokeWidth={1.5} />
              </div>

              {/* Glass overlay effect to make it premium */}
              {/* <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-background opacity-20 pointer-events-none" /> */}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
