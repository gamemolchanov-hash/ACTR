/**
 * Статичная 404 (FBG-126).
 *
 * Server Component (без `'use client'`) — тело страницы рендерится в готовый HTML и НЕ
 * гидратируется, что снижает площадь гидратации на мусорном/ботовом трафике (старые .php-URL),
 * который как раз и порождал восстановимые ошибки гидратации в GlitchTip. Ссылка «на главную» —
 * обычный `<a>` (а не клиентский next/link), чтобы не тянуть лишний клиентский код в 404.
 */
export default function NotFound() {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '60vh',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        padding: '24px',
        textAlign: 'center',
      }}
    >
      <p style={{ margin: '0 0 8px', fontSize: '48px', fontWeight: 700, lineHeight: 1 }}>404</p>
      <h2 style={{ margin: '0 0 12px', fontSize: '20px' }}>Страница не найдена</h2>
      <p style={{ margin: '0 0 24px', color: '#666', fontSize: '14px' }}>
        Возможно, она была удалена или адрес введён неверно.
      </p>
      <a
        href="/"
        style={{
          padding: '10px 24px',
          backgroundColor: '#111',
          color: '#fff',
          borderRadius: '4px',
          fontSize: '14px',
          fontWeight: 500,
          textDecoration: 'none',
        }}
      >
        На главную
      </a>
    </div>
  );
}
