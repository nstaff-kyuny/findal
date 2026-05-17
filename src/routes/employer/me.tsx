import { createFileRoute } from "@tanstack/react-router";
import { MobileLayout } from "@/components/MobileLayout";
import { RoleGate } from "@/components/RoleGate";
import { SettingsPage } from "@/components/SettingsPage";

export const Route = createFileRoute("/employer/me")({
  component: () => (
    <RoleGate role="employer">
      <MobileLayout role="employer"><SettingsPage role="employer" /></MobileLayout>
    </RoleGate>
  ),
});
