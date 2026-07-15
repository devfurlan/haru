import { Btn } from './btn';

export function FinalCta() {
  return (
    <section
      style={{
        maxWidth: '1080px',
        margin: '0 auto',
        padding: 'clamp(48px,6vw,72px) clamp(20px,5vw,40px) clamp(56px,7vw,88px)',
      }}
    >
      <div
        style={{
          position: 'relative',
          background: 'var(--emerald)',
          borderRadius: '28px',
          padding: 'clamp(38px,5vw,64px) clamp(24px,4vw,48px)',
          textAlign: 'center',
          overflow: 'hidden',
          boxShadow: '0 40px 80px -40px rgba(10,51,36,.7)',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: '-50px',
            left: '16%',
            width: '300px',
            height: '300px',
            background: 'radial-gradient(circle,rgba(47,211,122,.22),transparent 70%)',
            pointerEvents: 'none',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: '-70px',
            right: '10%',
            width: '320px',
            height: '320px',
            background: 'radial-gradient(circle,rgba(255,90,54,.16),transparent 70%)',
            pointerEvents: 'none',
          }}
        />
        <div style={{ position: 'relative' }}>
          <h2
            style={{
              font: '400 clamp(30px,5vw,44px)/1.1 var(--font-display)',
              color: 'var(--on-emerald)',
              letterSpacing: '-.02em',
              margin: '0 0 14px',
            }}
          >
            Teste sem risco por{' '}
            <span style={{ fontStyle: 'italic', color: 'var(--green)' }}>30 dias</span>.
          </h2>
          <p
            style={{
              font: '400 17px/1.55 var(--font-ui)',
              color: 'var(--on-emerald-mut)',
              margin: '0 auto 30px',
              maxWidth: '520px',
            }}
          >
            Contrate, use tudo, e se não for pra você devolvemos o valor integral. O fundador
            responde no WhatsApp.
          </p>
          <div style={{ display: 'flex', gap: '14px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Btn variant="primary" size="lg" href="/signup">
              Começar agora
            </Btn>
            <Btn variant="secondary" size="lg" href="/precos">
              Ver planos
            </Btn>
          </div>
        </div>
      </div>
    </section>
  );
}
