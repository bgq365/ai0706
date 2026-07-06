import { z } from "zod";
import { setSessionCookie, signSession } from "@/lib/auth";
import { findDemoUserByEmail } from "@/lib/mock-store";
import { fail, ok } from "@/lib/response";

const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(6),
});

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = loginSchema.safeParse(body);

  if (!parsed.success) {
    return fail(422, "validation_error", "Login payload is invalid.", [
      ...parsed.error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
        code: issue.code,
      })),
    ]);
  }

  const user = findDemoUserByEmail(parsed.data.email);
  if (!user || user.password !== parsed.data.password) {
    return fail(401, "invalid_credentials", "Email or password is incorrect.");
  }

  const token = signSession({
    id: user.id,
    name: user.name,
    email: user.email,
    warehouseId: user.warehouseId,
    roles: user.roles,
  });

  await setSessionCookie(token);

  return ok({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      warehouseId: user.warehouseId,
      roles: user.roles,
    },
  });
}
