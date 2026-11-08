"use client";

import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { UserProfile, Department, DepartmentSchema, PaginatedResult } from "@skillx/shared-contracts";
import { Search, Sparkles, BookOpen, Filter, CheckCircle2 } from "lucide-react";
import { apiClient } from "@/lib/apiClient";
import { useAuth } from "@/hooks/useAuth";
import { SkillCard } from "@/components/SkillCard";
import { BookingDrawer } from "@/components/BookingDrawer";

const departments: ("All" | Department)[] = [
  "All",
  "CS",
  "BBA",
  "EE",
  "Mathematics",
  "Accounting & Finance"
];

export default function ExplorePage() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [selectedDept, setSelectedDept] = useState<"All" | Department>("All");
  const [activeType, setActiveType] = useState<"teach" | "learn">("teach");
  const [bookingTutor, setBookingTutor] = useState<UserProfile | null>(null);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  // Debounce search query by 300ms
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  const { data: searchResult, isLoading, refetch } = useQuery<PaginatedResult<UserProfile>>({
    queryKey: ["usersSearch", debouncedQuery, selectedDept, activeType],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (debouncedQuery.trim()) params.append("q", debouncedQuery.trim());
      if (selectedDept !== "All") params.append("department", selectedDept);
      params.append("type", activeType);
      params.append("limit", "24");

      const res = await apiClient.get(`/users/search?${params.toString()}`);
      return res.data;
    }
  });

  const students = searchResult?.data || [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-iba-navy via-slate-900 to-teal-900 rounded-3xl p-6 sm:p-10 text-white shadow-lg relative overflow-hidden">
        <div className="max-w-2xl relative z-10">
          <div className="inline-flex items-center gap-1.5 bg-teal-400/20 border border-teal-300/30 rounded-full px-3 py-1 text-xs font-bold text-teal-200 mb-3">
            <Sparkles className="w-3.5 h-3.5 text-teal-300" />
            <span>Sukkur IBA Peer Skill Network</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight leading-tight">
            Exchange Knowledge. Earn Tokens. Learn Faster.
          </h1>
          <p className="mt-2 text-sm text-slate-300 leading-relaxed">
            Find vetted Sukkur IBA students teaching CS algorithms, calculus, financial modeling, or language skills. Book sessions with zero fiat cost using SkillX Tokens.
          </p>
        </div>
      </div>

      {successBanner && (
        <div className="p-4 bg-teal-50 border border-teal-200 rounded-2xl flex items-center justify-between text-teal-900 text-xs font-semibold animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0" />
            <span>{successBanner}</span>
          </div>
          <button
            onClick={() => setSuccessBanner(null)}
            className="text-teal-700 hover:text-teal-900 font-bold ml-4"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Search & Filter Controls */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by skill (e.g. Python, Linear Algebra, Accounting) or student name..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 bg-slate-50 focus:bg-white text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500 transition"
            />
          </div>

          {/* Toggle: Skills to Teach vs Learn */}
          <div className="flex bg-slate-100 p-1 rounded-xl shrink-0 self-start sm:self-auto border border-slate-200">
            <button
              onClick={() => setActiveType("teach")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeType === "teach"
                  ? "bg-white text-iba-navy shadow-sm"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-teal-600" />
              Tutors (Teaching)
            </button>
            <button
              onClick={() => setActiveType("learn")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeType === "learn"
                  ? "bg-white text-iba-navy shadow-sm"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <BookOpen className="w-3.5 h-3.5 text-iba-navy" />
              Learners (Seeking)
            </button>
          </div>
        </div>

        {/* Department Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
          <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px] mr-1 flex items-center gap-1 shrink-0">
            <Filter className="w-3 h-3" />
            Dept:
          </span>
          {departments.map((dept) => (
            <button
              key={dept}
              onClick={() => setSelectedDept(dept)}
              className={`px-3 py-1 rounded-lg font-semibold shrink-0 transition-all ${
                selectedDept === dept
                  ? "bg-iba-navy text-white shadow-sm"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {dept}
            </button>
          ))}
        </div>
      </div>

      {/* Grid of Results */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-extrabold text-slate-900">
            {activeType === "teach" ? "Available Peer Tutors" : "Students Seeking Mentors"}
          </h2>
          <span className="text-xs font-semibold text-slate-500">
            {searchResult?.total ?? 0} students found
          </span>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-64 bg-slate-200/60 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : students.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {students.map((student) => (
              <SkillCard
                key={student._id}
                student={student}
                activeType={activeType}
                onBook={(tutor) => setBookingTutor(tutor)}
                isCurrentUser={user?._id === student._id}
              />
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center max-w-md mx-auto my-8">
            <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
              <Search className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-slate-900 text-base">No students matched</h3>
            <p className="text-xs text-slate-500 mt-1">
              Try adjusting your search terms or selecting a different academic department.
            </p>
          </div>
        )}
      </div>

      {/* Booking Drawer / Modal */}
      <BookingDrawer
        tutor={bookingTutor}
        isOpen={Boolean(bookingTutor)}
        onClose={() => setBookingTutor(null)}
        onSuccess={() => {
          setSuccessBanner("Session booked successfully! 1 Token locked into escrow.");
          refetch();
        }}
      />
    </div>
  );
}
