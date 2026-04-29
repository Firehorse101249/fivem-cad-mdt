"use server";

type AdminActionResult = {
  ok: boolean;
  message: string;
};

function serviceRoleTodo(action: string): AdminActionResult {
  // TODO: Implement this server-only action with the Supabase service-role key
  // stored in a server environment variable. Never expose that key to client code.
  return {
    ok: false,
    message: `${action} requires a server-only Supabase admin client.`,
  };
}

export async function createUserAction(): Promise<AdminActionResult> {
  return serviceRoleTodo("User creation");
}

export async function updatePermissionsAction(): Promise<AdminActionResult> {
  return serviceRoleTodo("Permission updates");
}

export async function removeUserAction(): Promise<AdminActionResult> {
  return serviceRoleTodo("User removal");
}

export async function resetPasswordAction(): Promise<AdminActionResult> {
  return serviceRoleTodo("Password resets");
}
