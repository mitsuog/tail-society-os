import { requireAdminAccess } from "@/utils/auth-guards";
import UsersClient from "./UsersClient";

export default async function UsersPage() {
  // Aquí se verifica la seguridad en el servidor
  await requireAdminAccess();

  // Si pasa la seguridad, muestra el componente cliente
  return <UsersClient />;
}