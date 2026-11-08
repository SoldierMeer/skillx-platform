import { Request, Response } from "express";
import {
  UpdateProfileInput,
  SearchSkillsQuery,
  PaginatedResult,
  UserProfile
} from "@skillx/shared-contracts";
import { User } from "../models/User";
import { formatUserProfile } from "./authController";

export async function updateProfile(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user?.id) {
      res.status(401).json({ error: "Unauthorized", message: "User not authenticated" });
      return;
    }

    const updates: UpdateProfileInput = req.body;

    const user = await User.findById(req.user.id);
    if (!user) {
      res.status(404).json({ error: "NotFound", message: "User not found" });
      return;
    }

    if (updates.name !== undefined) user.name = updates.name;
    if (updates.bio !== undefined) user.bio = updates.bio;
    if (updates.skillsToTeach !== undefined) user.skillsToTeach = updates.skillsToTeach;
    if (updates.skillsToLearn !== undefined) user.skillsToLearn = updates.skillsToLearn;
    if (updates.campusHubPreference !== undefined) user.campusHubPreference = updates.campusHubPreference;

    await user.save();

    res.status(200).json({
      success: true,
      user: formatUserProfile(user)
    });
  } catch (error: any) {
    console.error("[UserController] updateProfile error:", error);
    res.status(500).json({
      error: "InternalServerError",
      message: "Failed to update user profile"
    });
  }
}

export async function searchSkills(req: Request, res: Response): Promise<void> {
  try {
    const queryParams = req.query as unknown as SearchSkillsQuery;
    const { q, department, type = "teach", page = 1, limit = 12 } = queryParams;

    const filter: Record<string, any> = {
      isVerified: true
    };

    if (department) {
      filter.department = department;
    }

    if (q && q.trim().length > 0) {
      const skillField = type === "learn" ? "skillsToLearn" : "skillsToTeach";
      // Case-insensitive substring regex match on target skills array
      filter[skillField] = { $regex: q.trim(), $options: "i" };
    }

    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      User.find(filter)
        .sort({ rating: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit),
      User.countDocuments(filter)
    ]);

    const totalPages = Math.ceil(total / limit) || 1;

    const responseData: PaginatedResult<UserProfile> = {
      data: users.map(formatUserProfile),
      total,
      page,
      limit,
      totalPages
    };

    res.status(200).json(responseData);
  } catch (error: any) {
    console.error("[UserController] searchSkills error:", error);
    res.status(500).json({
      error: "InternalServerError",
      message: "Failed to search skills"
    });
  }
}
