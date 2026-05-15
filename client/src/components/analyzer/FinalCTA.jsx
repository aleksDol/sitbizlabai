export function FinalCTA({
  status = "idle",
  onClick,
  onRetry,
  error = "",
  telegramUrl = ""
}) {
  return (
    <section className="final-cta-wrap fade-slide-in">
      <h3>Можем показать, как это можно реализовать под ваш бизнес</h3>
      <p>
        Разберем варианты внедрения и покажем, что даст самый быстрый эффект
        без полной переделки текущей системы.
      </p>

      {status !== "success" && (
        <button type="button" className="implement-cta" onClick={onClick} disabled={status === "loading"}>
          {status === "loading" ? (
            <span className="cta-loading">
              <span className="spinner" />
              Отправляем...
            </span>
          ) : (
            "Да, хочу посмотреть варианты"
          )}
        </button>
      )}

      {status === "success" && (
        <div className="final-cta-success fade-up">
          <p className="final-cta-success-title">Контакт сохранен. Скоро свяжемся и покажем подходящие варианты.</p>
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
