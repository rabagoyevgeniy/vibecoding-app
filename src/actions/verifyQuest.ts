"use server";

/**
 * verifyQuest — Server Action для проверки пользовательского ввода в Smart Quest.
 *
 * На текущем этапе это мок-имитация ИИ-проверки: реальный LLM-валидатор
 * подключим позже, когда определим формат каждого квеста в таблице `smart_quests`.
 *
 * Контракт:
 *   - questId: string  — id квеста из таблицы `smart_quests`.
 *   - value:   string  — то, что ввёл "CEO" в карточке (API-ключ, токен, и т.п.).
 *
 * Возвращает дискриминированный union:
 *   - { success: true,  message: string }
 *   - { success: false, error:   string }
 *
 * Дизайн ответа намеренно текстовый, чтобы фронт мог сразу показать его в toast.
 *
 * Auth: action гарантированно требует залогиненного пользователя. Если сессии
 * нет — возвращаем `success: false` с понятным сообщением (Server Actions
 * не могут отдавать настоящий HTTP 401, поэтому семантика 401 → бизнес-ошибка).
 */

import { guardServerAction } from "@/lib/auth-guard";

export type VerifyQuestResult =
  | { success: true; message: string; xpAwarded?: number }
  | { success: false; error: string };

const STRIPE_KEY_PATTERN = /^sk_(test|live)_[A-Za-z0-9]{4,}$/;
const ARTIFICIAL_LATENCY_MS = 650; // имитируем «AI обдумывает ответ»

const UNAUTHORIZED_RESULT: VerifyQuestResult = {
  success: false,
  error: "Сессия истекла. Войди в аккаунт, чтобы AI-команда могла записать прогресс.",
};

export async function verifyQuest(
  questId: string,
  value: string
): Promise<VerifyQuestResult> {
  const guard = await guardServerAction<VerifyQuestResult>(() => UNAUTHORIZED_RESULT);
  if (!guard.ok) return guard.error;

  // Минимальная серверная валидация: даже мок не должен падать на мусоре.
  if (typeof questId !== "string" || !questId.trim()) {
    return { success: false, error: "Некорректный questId." };
  }

  const cleaned = typeof value === "string" ? value.trim() : "";
  if (!cleaned) {
    return { success: false, error: "Пустое значение — ИИ нечего проверять." };
  }

  await new Promise((resolve) => setTimeout(resolve, ARTIFICIAL_LATENCY_MS));

  // Мок-проверка: принимаем только Stripe-подобные ключи (`sk_test_...` / `sk_live_...`).
  if (STRIPE_KEY_PATTERN.test(cleaned)) {
    return {
      success: true,
      message: "Ключ успешно проверен AI-командой! +50 XP",
      xpAwarded: 50,
    };
  }

  // Дружелюбная подсказка, если префикс правильный, но формат — нет.
  if (cleaned.startsWith("sk_test") || cleaned.startsWith("sk_live")) {
    return {
      success: false,
      error: "Похоже на Stripe-ключ, но формат странный. Ожидаю sk_test_... / sk_live_... с буквенно-цифровым хвостом.",
    };
  }

  return { success: false, error: "ИИ не принял ключ. Проверь формат." };
}
