export function getFriendlyErrorMessage(error) {
  const apiError = error?.response?.data?.error;

  if (apiError?.message) {
    return apiError.message;
  }

  if (error?.response?.status === 504) {
    return "Сайт отвечает слишком долго. Попробуйте снова.";
  }

  if (error?.response?.status === 502) {
    return "Не удалось открыть сайт. Проверьте ссылку и повторите попытку.";
  }

  return "Не удалось выполнить анализ. Попробуйте снова.";
}
