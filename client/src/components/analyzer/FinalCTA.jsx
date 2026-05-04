export function FinalCTA({
  status = "idle",
  onClick,
  onRetry,
  error = "",
  telegramUrl = ""
}) {
  return (
    <section className="final-cta-wrap fade-slide-in">
      <h3>Хотите внедрить это у себя?</h3>
      <p>
        Мы уже разобрали ваш сайт и видим, где теряются заявки.
        <br />
        Можем внедрить эти улучшения в кратчайшие сроки и обычно дешевле рынка.
        <br />
        Связаться с вами и обсудить детали?
      </p>

      {status !== "success" && (
        <button type="button" className="implement-cta" onClick={onClick} disabled={status === "loading"}>
          {status === "loading" ? (
            <span className="cta-loading">
              <span className="spinner" />
              Отправляем...
            </span>
          ) : (
            "Да, хочу узнать детали"
          )}
        </button>
      )}

      {status === "success" && (
        <div className="final-cta-success fade-up">
          <p className="final-cta-success-title">✅ Заявка отправлена Мы свяжемся с вами в ближайшее время</p>
          <p className="final-cta-success-sub">Обычно отвечаем в течение 10–30 минут</p>
          {telegramUrl ? (
            <a className="final-cta-telegram" href={telegramUrl} target="_blank" rel="noreferrer">
              Написать в Telegram
            </a>
          ) : null}
        </div>
      )}

      {error ? (
        <div className="final-cta-error">
          <p className="lead-error">Не удалось отправить заявку</p>
          <p className="lead-error-detail">{error}</p>
          <button type="button" className="retry-btn" onClick={onRetry || onClick} disabled={status === "loading"}>
            Попробовать снова
          </button>
        </div>
      ) : null}
    </section>
  );
}
