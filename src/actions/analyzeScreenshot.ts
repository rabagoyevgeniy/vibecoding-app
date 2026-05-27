"use server";

/**
 * analyzeScreenshot — Server Action для AI Vision Help квестов.
 *
 * Реальная Vision-интеграция через OpenAI Chat Completions API (модель `gpt-4o`):
 * принимает скриншот пользователя как base64 data URL и возвращает короткий,
 * дружелюбный совет "Senior CTO" о том, что делать дальше.
 *
 * Контракт:
 *   - questId: string  — id квеста из таблицы `smart_quests`.
 *   - file:    ScreenshotPayload — метаданные + обязательный `dataUrl` (base64).
 *
 * Возвращает дискриминированный union:
 *   - { success: true,  analysis: string }
 *   - { success: false, error:    string }
 */

import OpenAI from "openai";

export interface ScreenshotPayload {
  name: string;
  type: string;
  size: number;
  /** base64 data URL вида `data:image/png;base64,...` — обязательно для реального Vision-вызова. */
  dataUrl?: string;
}

/**
 * Контекст текущего квеста, чтобы Vision-LLM сравнивала скриншот не
 * "вообще", а с конкретной целью пользователя (например: "включить RLS",
 * "взять API key из Stripe") и могла отправить его прямой ссылкой в нужный
 * раздел Supabase.
 */
export interface QuestContext {
  /** Название квеста (что нужно сделать). */
  title: string;
  /** Описание цели — что именно ожидается от пользователя. */
  description: string;
  /** Supabase project id для генерации deep-link'ов в dashboard. */
  projectId?: string | null;
}

export type AnalyzeScreenshotResult =
  | { success: true; analysis: string }
  | { success: false; error: string };

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB — визуальный лимит карточки
const VISION_MODEL = "gpt-4o";

const USER_PROMPT = "Я застрял на этом экране. Что я вижу и какой мой следующий шаг?";

/**
 * Строит системный промпт для GPT-4o с учётом контекста квеста.
 *
 * Если контекст пустой — фолбэк на старое поведение "просто опиши экран".
 * Если есть контекст с `projectId` — даём модели готовый шаблон deep-link'а
 * именно для этого проекта, чтобы пользователь мог кликнуть и перейти.
 */
function buildSystemPrompt(context?: QuestContext): string {
  const intro =
    "Ты — технический наставник (Senior CTO). Пользователь строит платформу " +
    "и застрял. Проанализируй этот скриншот. Коротко и дружелюбно (2-3 предложения) " +
    "объясни, что ты видишь на экране, и дай конкретную подсказку, что нужно " +
    "сделать или куда нажать дальше.";

  if (!context) return intro;

  const safeTitle = context.title?.trim() || "Без названия";
  const safeGoal = context.description?.trim() || "Цель не указана.";
  const projectId = context.projectId?.trim();

  const linkInstruction = projectId
    ? `ID проекта пользователя в Supabase: "${projectId}". ` +
      "Если нужно отправить пользователя в конкретный раздел Supabase, " +
      "ОБЯЗАТЕЛЬНО приложи прямую ссылку в формате " +
      `https://supabase.com/dashboard/project/${projectId}/<раздел> ` +
      '(например, /auth/policies, /editor, /api, /settings/api). ' +
      "Ссылка должна стоять отдельной строкой в конце ответа — фронтенд распознает её и сделает кнопку."
    : "Если нужно отправить пользователя в раздел Supabase, формируй ссылку в формате " +
      "https://supabase.com/dashboard/project/<project_id>/<раздел> и положи её отдельной строкой в конце ответа.";

  return [
    intro,
    "",
    "КОНТЕКСТ КВЕСТА:",
    `• Название: ${safeTitle}`,
    `• Текущая цель: ${safeGoal}`,
    "",
    "ИНСТРУКЦИЯ:",
    "1. Сравни то, что ты видишь на скриншоте, с целью квеста.",
    "2. Если пользователь находится В нужном месте — подскажи следующий конкретный клик.",
    "3. Если пользователь НЕ ТАМ, где должен быть — начни ответ с фразы " +
      '"Ты сейчас не там, где нужно. Тебе нужно перейти в [Конкретная вкладка]" ' +
      "и обязательно дай прямую ссылку на нужный раздел.",
    "",
    linkInstruction,
  ].join("\n");
}

export async function analyzeScreenshot(
  questId: string,
  file: ScreenshotPayload,
  context?: QuestContext
): Promise<AnalyzeScreenshotResult> {
  // ===== 1. Валидация входа =====
  if (typeof questId !== "string" || !questId.trim()) {
    return { success: false, error: "Некорректный questId." };
  }

  if (!file || typeof file !== "object") {
    return { success: false, error: "Файл не получен сервером." };
  }

  if (!file.type?.startsWith("image/")) {
    return { success: false, error: "Я умею анализировать только изображения (PNG/JPG/WebP)." };
  }

  if (typeof file.size === "number" && file.size > MAX_BYTES) {
    return { success: false, error: "Скриншот тяжелее 10 MB — урежь и попробуй ещё раз." };
  }

  const dataUrl = file.dataUrl?.trim();
  if (!dataUrl || !dataUrl.startsWith("data:image/")) {
    return {
      success: false,
      error: "Сервер не получил содержимое скриншота. Перезагрузи файл и попробуй ещё раз.",
    };
  }

  // ===== 2. Конфигурация LLM =====
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return {
      success: false,
      error: "AI Vision не настроен на сервере (нет OPENAI_API_KEY).",
    };
  }

  const client = new OpenAI({ apiKey });

  // ===== 3. Вызов GPT-4o с картинкой =====
  try {
    const completion = await client.chat.completions.create({
      model: VISION_MODEL,
      // 2-3 предложения по системному промпту → 300 токенов с запасом.
      max_completion_tokens: 300,
      temperature: 0.4,
      messages: [
        { role: "system", content: buildSystemPrompt(context) },
        {
          role: "user",
          content: [
            { type: "text", text: USER_PROMPT },
            {
              type: "image_url",
              image_url: {
                url: dataUrl,
                // `auto` — пусть OpenAI сам выбирает разрешение (баланс цены/качества).
                detail: "auto",
              },
            },
          ],
        },
      ],
    });

    const analysis = completion.choices?.[0]?.message?.content?.trim();

    if (!analysis) {
      return {
        success: false,
        error: "AI вернул пустой ответ. Попробуй другой скриншот.",
      };
    }

    return { success: true, analysis };
  } catch (err) {
    // Логируем подробности на сервере, на клиент отдаём дружелюбное сообщение.
    console.error("[analyzeScreenshot] OpenAI error:", err);

    if (err instanceof OpenAI.APIError) {
      // Аутентификация → значит ключ битый/просрочен, отдадим явный сигнал.
      if (err.status === 401 || err.status === 403) {
        return {
          success: false,
          error: "AI Vision отклонил запрос: проверь OPENAI_API_KEY на сервере.",
        };
      }
      // Слишком большой/невалидный image payload.
      if (err.status === 400) {
        return {
          success: false,
          error: "AI не смог обработать изображение. Попробуй PNG или JPG поменьше.",
        };
      }
      // Rate limit.
      if (err.status === 429) {
        return {
          success: false,
          error: "Слишком много запросов к AI. Подожди минуту и попробуй ещё раз.",
        };
      }
    }

    const message = err instanceof Error ? err.message : "неизвестная ошибка";
    return {
      success: false,
      error: `AI Vision сломался: ${message}`,
    };
  }
}
