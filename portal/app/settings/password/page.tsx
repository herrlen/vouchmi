import type { Metadata } from "next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChangePasswordForm } from "./change-password-form";

export const metadata: Metadata = { title: "Passwort ändern" };

export default function PasswordSettingsPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Passwort ändern</CardTitle>
      </CardHeader>
      <CardContent>
        <ChangePasswordForm />
      </CardContent>
    </Card>
  );
}
