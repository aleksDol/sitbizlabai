export function FinalCTA({
  status = "idle",
  onClick,
  onRetry,
  error = "",
  telegramUrl = ""
}) {
  return (
    <section className="final-cta-wrap fade-slide-in">
      <h3>Можно подготовить детальный план внедрения под ваш бизнес</h3>
      <p>Покажем, что именно можно сделать, с чего лучше начать и сколько этапов потребуется.</p>

      {status !== "success" && (
        <button type="button" className="implement-cta" onClick={onClick} disabled={status === "loading"}>
          {status === "loading" ? (
            <span className="cta-loading">
              <span className="spinner" />
              Отправляем...
            </span>
          ) : (
            "Хочу получить детальный план"
          )}
        </button>
      )}

      {status === "success" && (
        <div className="final-cta-success fade-up">
          <p className="final-cta-success-title">Контакт сохранен. Скоро свяжемся и покажем подходящий план.</p>
          <p className="final-cta-success-sub">Обычно отвечаем в течение 10-30 минут</p>
          {telegramUrl ? (
            <a className="final-cta-telegram" href={telegramUrl} target="_blank" rel="noreferrer">
              Написать в Telegram
            </a>
          ) : null}
        </div>
      )}

      {error ? (
        <div className="final-cta-error">
          <p className="lead-error">Не удалось отправить контакт</p>
          <p className="lead-error-detail">{error}</p>
          <button type="button" className="retry-btn" onClick={onRetry || onClick} disabled={status === "loading"}>
            Попробовать снова
          </button>
        </div>
      ) : null}
    </section>
  );
}
