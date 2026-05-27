/**
 * auth-guard.ts — единая защита API-роутов и Server Actions.
 *
 * Контекст: middleware намеренно пропускает `/api/*` (чтобы OAuth-callback
 * и стриминговые ответы не ломались). Поэтому каждая серверная точка входа
 * ОБЯЗАНА проверять сессию сама.
 *
 * Утилиты:
 *   - `requireUser()`     — кидает `AuthError`, если нет валидной сессии.
 *                           Возвращает Supabase `User`.
 *   - `guardApiRoute()`   — оборачивает `requireUser()` для Route Handlers:
 *                           возвращает либо `{ ok: true, user }`,
 *                           либо `{ ok: false, response }` с HTTP 401.
 *   - `guardServerAction(errorMapper)` — аналогичный wrapper для Server Actions:
 *                           вместо HTTP-ответа отдаёт типизированный
 *                           бизнес-ответ (`{ success: false, error }`).
 *
 * Все три используют один и тот же cookie-based Supabase client (`createClient()`
 * из `lib/supabase-server.ts`), так что RLS работает с реальным `auth.uid()`.
 */

import { NextResponse } from "next/server";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase-server";

export class AuthError extends Error {
  readonly httpStatus: number;

  constructor(message = "Unauthorized", httpStatus = 401) {
    super(message);
    this.name = "AuthError";
    this.httpStatus = httpStatus;
  }
}

/**
 * Низкоуровневый guard. Бросает `AuthError`, если нет валидной серверной сессии.
 * Подходит для прямого использования внутри Server Actions, где есть свой
 * try/catch с типизированным ответом.
 */
export async function requireUser(): Promise<User> {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new AuthError();
  }

  return user;
}

export type ApiRouteGuard =
  | { ok: true; user: User }
  | { ok: false; response: NextResponse };

/**
 * Использование в Route Handler (`/api/**`):
 *
 *   const guard = await guardApiRoute();
 *   if (!guard.ok) return guard.response;
 *   const user = guard.user;
 *
 * Возвращает 401 JSON с фиксированной формой `{ error: "Unauthorized" }`,
 * чтобы клиент мог детектить статус единообразно.
 */
export async function guardApiRoute(): Promise<ApiRouteGuard> {
  try {
    const user = await requireUser();
    return { ok: true, user };
  } catch (err) {
    if (err instanceof AuthError) {
      return {
        ok: false,
        response: NextResponse.json(
          { error: "Unauthorized" },
          { status: err.httpStatus }
        ),
      };
    }
    // Не-Auth ошибки (сеть, неожиданные исключения) пробрасываем дальше —
    // их поймает общий catch роута и отдаст 500.
    throw err;
  }
}

export type ActionGuard<TErrorPayload> =
  | { ok: true; user: User }
  | { ok: false; error: TErrorPayload };

/**
 * Использование в Server Action:
 *
 *   const guard = await guardServerAction(() => ({
 *     success: false as const,
 *     error: "Войди в аккаунт, чтобы выполнить действие.",
 *   }));
 *   if (!guard.ok) return guard.error;
 *   const user = guard.user;
 *
 * Принимает фабрику ошибки, чтобы каждый action мог вернуть СВОЙ
 * дискриминированный union (типы actions разные).
 */
export async function guardServerAction<TErrorPayload>(
  buildErrorPayload: () => TErrorPayload
): Promise<ActionGuard<TErrorPayload>> {
  try {
    const user = await requireUser();
    return { ok: true, user };
  } catch (err) {
    if (err instanceof AuthError) {
      return { ok: false, error: buildErrorPayload() };
    }
    throw err;
  }
}
