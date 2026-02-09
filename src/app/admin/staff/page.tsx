import { requireAdminAccess } from "@/utils/auth-guards";
import StaffClient from "./StaffClient";

export default async function StaffPage() {
  // Seguridad de servidor
  await requireAdminAccess();

  return <StaffClient />;
}