"use client";

import React from "react";
import { UserProfile } from "@skillx/shared-contracts";
import { Star, MapPin, Sparkles, BookOpen } from "lucide-react";

interface SkillCardProps {
  student: UserProfile;
  activeType: "teach" | "learn";
  onBook: (student: UserProfile) => void;
  isCurrentUser?: boolean;
}

export function SkillCard({ student, activeType, onBook, isCurrentUser }: SkillCardProps) {
  const displaySkills = activeType === "teach" ? student.skillsToTeach : student.skillsToLearn;

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition-all duration-200 p-5 flex flex-col justify-between group">
      <div>
        {/* Header: Avatar, Name & Department */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-iba-navy to-iba-light text-white font-bold text-lg flex items-center justify-center shadow-sm">
              {student.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h3 className="font-bold text-slate-900 group-hover:text-iba-navy transition-colors text-base leading-snug">
                {student.name}
              </h3>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[11px] font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded-md border border-teal-100">
                  {student.department}
                </span>
                {student.campusHubPreference && (
                  <span className="hidden sm:flex items-center gap-0.5 text-[11px] text-slate-500">
                    <MapPin className="w-3 h-3 text-slate-400" />
                    {student.campusHubPreference}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Rating Badge */}
          <div className="flex items-center gap-1 bg-amber-50 border border-amber-200/60 px-2 py-1 rounded-lg">
            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500" />
            <span className="text-xs font-bold text-amber-900">
              {student.rating ? student.rating.toFixed(1) : "5.0"}
            </span>
            <span className="text-[10px] text-amber-700/70">
              ({student.reviewCount || 0})
            </span>
          </div>
        </div>

        {/* Bio */}
        {student.bio && (
          <p className="mt-3 text-xs text-slate-600 line-clamp-2 leading-relaxed">
            {student.bio}
          </p>
        )}

        {/* Skills Tags */}
        <div className="mt-4">
          <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-2 flex items-center gap-1">
            {activeType === "teach" ? (
              <>
                <Sparkles className="w-3 h-3 text-teal-600" />
                Teaching Skills
              </>
            ) : (
              <>
                <BookOpen className="w-3 h-3 text-iba-navy" />
                Looking to Learn
              </>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {displaySkills && displaySkills.length > 0 ? (
              displaySkills.map((skill, idx) => (
                <span
                  key={idx}
                  className={`text-xs font-medium px-2.5 py-1 rounded-md transition-colors ${
                    activeType === "teach"
                      ? "bg-teal-50 text-teal-800 border border-teal-200/60 hover:bg-teal-100"
                      : "bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200/70"
                  }`}
                >
                  {skill}
                </span>
              ))
            ) : (
              <span className="text-xs text-slate-400 italic">No specific skills listed</span>
            )}
          </div>
        </div>
      </div>

      {/* Action Footer */}
      <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
        <div className="text-xs font-semibold text-slate-500">
          Rate: <span className="font-bold text-amber-700">1 Token / hr</span>
        </div>

        {!isCurrentUser ? (
          <button
            onClick={() => onBook(student)}
            className="bg-iba-navy hover:bg-primary-hover text-white text-xs font-bold px-4 py-2 rounded-xl shadow-sm hover:shadow transition-all duration-150 active:scale-95"
          >
            Book Session
          </button>
        ) : (
          <span className="text-xs font-medium text-slate-400 bg-slate-100 px-3 py-1.5 rounded-lg">
            Your Profile
          </span>
        )}
      </div>
    </div>
  );
}
