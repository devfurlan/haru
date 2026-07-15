export function Hero() {
  return (
    <section
      id="planos"
      style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: 'clamp(48px,7vw,76px) clamp(20px,5vw,40px) 44px',
        textAlign: 'center',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '9px',
          marginBottom: '18px',
        }}
      >
        <span
          style={{ width: '20px', height: '2px', background: 'var(--coral)', borderRadius: '2px' }}
        />
        <span
          style={{
            font: '700 11px var(--font-ui)',
            letterSpacing: '.16em',
            textTransform: 'uppercase',
            color: '#0C7E41',
          }}
        >
          Planos &amp; preços
        </span>
        <span
          style={{ width: '20px', height: '2px', background: 'var(--coral)', borderRadius: '2px' }}
        />
      </div>
      <h1
        style={{
          font: '400 clamp(30px,6vw,52px)/1.07 var(--font-display)',
          color: 'var(--emerald)',
          letterSpacing: '-.025em',
          margin: '0 auto 18px',
          maxWidth: '840px',
        }}
      >
        A plataforma <span style={{ fontStyle: 'italic', color: '#0C7E41' }}>completa</span> pela
        qual você já ia pagar.
      </h1>
      <p
        style={{
          font: '400 19px/1.55 var(--font-ui)',
          color: 'var(--ink-70)',
          margin: '0 auto 26px',
          maxWidth: '620px',
        }}
      >
        Agenda, app do cliente, pagamentos, fidelidade e clube de assinatura. Tudo junto, pelo preço
        de um sistema comum.
      </p>
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '9px',
          background: 'var(--paper)',
          border: '1px solid var(--border-soft)',
          borderRadius: '999px',
          padding: '8px 16px 8px 12px',
          boxShadow: 'var(--shadow-card)',
        }}
      >
        <span
          style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: 'var(--green)',
            animation: 'dmd-pulse 1.8s ease-in-out infinite',
          }}
        />
        <span style={{ font: '600 13.5px var(--font-ui)', color: 'var(--ink-70)' }}>
          Agendamentos ilimitados em todos os planos
        </span>
      </div>
    </section>
  );
}
