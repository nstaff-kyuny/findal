import { Link } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";
import { useAuth } from "@/lib/auth";

export function BackToSettings() {
  const { roles } = useAuth();
  const to = roles.includes("employer") ? "/employer/me" : "/seeker/me";
  return (
    <Link to={to} aria-label="뒤로 가기"><ChevronLeft size={20} /></Link>
  );
}
