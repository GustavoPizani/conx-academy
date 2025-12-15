import { UserRole } from "./auth";

export interface Video {
  title: string;
  url: string;
}

export interface Course {
  id: number;
  created_at: string;
  title: string;
  description: string | null;
  cover_image: string | null;
  target_roles: UserRole[];
  published: boolean;
  videos: Video[];
}