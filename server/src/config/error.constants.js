export const ERROR_CODES = {
  INVALID_URL: "INVALID_URL",
  INVALID_BODY: "INVALID_BODY",
  SITE_TIMEOUT: "SITE_TIMEOUT",
  SITE_UNAVAILABLE: "SITE_UNAVAILABLE",
  NOT_FOUND: "NOT_FOUND",
  INTERNAL_ERROR: "INTERNAL_ERROR"
};

export const ERROR_MESSAGES = {
  INVALID_URL_REQUIRED: "Введите ссылку на сайт.",
  INVALID_URL_FORMAT: "Проверьте формат ссылки. Пример: https://example.com",
  INVALID_URL_PROTOCOL: "Ссылка должна начинаться с http:// или https://",
  INVALID_BODY: "Неверный формат запроса.",
  SITE_TIMEOUT: "Сайт отвечает слишком долго. Попробуйте снова.",
  SITE_UNAVAILABLE: "Не удалось открыть сайт. Проверьте ссылку и повторите попытку.",
  SITE_EMPTY_CONTENT: "Не удалось получить данные сайта.",
  NOT_FOUND: "Маршрут не найден.",
  INTERNAL_ERROR: "Не удалось выполнить анализ. Попробуйте снова."
};
