"use server";

/**
 * analyzeScreenshot — Server Action для AI Vision Help квестов.
 *
 * На текущем этапе это мок-имитация Vision-LLM (например, Claude 3.5 Sonnet
 * с image input или GPT-4o). Когда подключим реальный провайдер, заменим тело
 * функции, но контракт оставим — фронту достаточно `{ success, analysis }`.
 *
 * Контракт:
 *   - questId: string  — id квеста из таблицы `smart_quests`.
 *   - file:    ScreenshotPayload — метаданные скриншота (имя, тип, размер).
 *     Для будущей реальной интеграции добавим поле `dataUrl` (base64) или
 *     `storagePath` (Supabase Storage). Сейчас мок их игнорирует.
 *
 * Возвращает дискриминированный union:
 *   - { success: true,  analysis: string }
 *   - { success: false, error:    string }
 */

export interface ScreenshotPayload {
  name: string;
  type: string;
  size: number;
  /** base64 data URL, опционально (для будущей реальной Vision-интеграции). */
  dataUrl?: string;
}

export type AnalyzeScreenshotResult =
  | { success: true; analysis: string }
  | { success: false; error: string };

const ARTIFICIAL_LATENCY_MS = 1500; // имитируем тяжёлый Vision-вызов
const MAX_BYTES = 10 * 1024 * 1024; // 10 MB — нашa визуальная граница в карточке

const MOCK_ANALYSIS =
  "Я вижу, что ты открыл настройки Web Application, но RLS политики ещё не настроены. " +
  'Посмотри на вкладку "Authentication" → "Policies". ' +
  "Я пометил это место на твоём скриншоте (представь, что пометил). " +
  'Перейди туда и нажми "Enable RLS".';

export async function analyzeScreenshot(
  questId: string,
  file: ScreenshotPayload
): Promise<AnalyzeScreenshotResult> {
  // Минимальная серверная валидация: не даём моку упасть на мусоре.
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

  await new Promise((resolve) => setTimeout(resolve, ARTIFICIAL_LATENCY_MS));

  return {
    success: true,
    analysis: MOCK_ANALYSIS,
  };
}
