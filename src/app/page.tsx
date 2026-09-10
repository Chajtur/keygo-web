import Image from "next/image";

export default function Home() {
  return (
    <main>
      <header className="site-header">
        <a className="brand" href="#inicio" aria-label="KeyGo, inicio">
          <Image
            src="/brand/imagotipo.png"
            alt=""
            width={64}
            height={64}
            priority
          />
        </a>
        <nav aria-label="Navegación principal">
          <a href="#servicios">Servicios</a>
          <a href="#como-funciona">Cómo funciona</a>
          <a href="#sucursales">Sucursales</a>
        </nav>
        <div className="header-actions">
          <a className="sign-in" href="/ingresar">
            Ingresar
          </a>
          <a className="button button-small" href="/registrarse">
            Crear casillero
          </a>
        </div>
      </header>

      <section className="hero" id="inicio">
        <div className="hero-content">
          <div>
            <Image
              className="hero-logo"
              src="/brand/isologo.png"
              alt="KeyGo Cargo Express"
              width={360}
              height={270}
              priority
            />
          </div>
          <div className="mt-15">
            <p className="eyebrow">
              Tu puente de compras entre Estados Unidos y Honduras
            </p>
            <h1>
              Compra allá.
              <br />
              <em>Recibe aquí.</em>
            </h1>
            <p className="hero-copy">
              Te damos una dirección en Miami para tus compras y las llevamos
              hasta Honduras con seguimiento en cada etapa.
            </p>
            <div className="hero-actions">
              <a className="button" href="/registrarse">
                Obtén tu casillero <span aria-hidden="true">→</span>
              </a>
              <a className="text-link" href="/cotizar">
                Cotiza tu envío <span aria-hidden="true">↗</span>
              </a>
            </div>
          </div>
        </div>
        <div
          className="hero-visual"
          aria-label="Contenedor de carga de KeyGo listo para despacho"
          role="img"
        >
          <div className="cargo-label">
            <Image
              src="/brand/imagotipoB.png"
              alt="Contenedor de carga de KeyGo"
              width={120}
              height={120}
              priority
            />
            <span>MIAMI · HONDURAS</span>
          </div>
          <div className="route-card">
            <span>MIAMI</span>
            <i></i>
            <span>HONDURAS</span>
          </div>
        </div>
        <a className="scroll-cue" href="#servicios">
          Descubre KeyGo <span aria-hidden="true">↓</span>
        </a>
      </section>

      <section className="service-intro" id="servicios">
        <p className="eyebrow">Envíos simples, información clara</p>
        <div className="section-heading">
          <h2>
            Tu carga, siempre
            <br />
            en movimiento.
          </h2>
          <p>
            Desde una compra puntual hasta varios paquetes, KeyGo te acompaña
            con una operación pensada para que sepas qué pasa y qué sigue.
          </p>
        </div>
        <div className="service-grid">
          <article>
            <span className="service-number">01</span>
            <h3>Casillero en Miami</h3>
            <p>
              Recibe una dirección personal para comprar en tus tiendas
              favoritas de Estados Unidos.
            </p>
          </article>
          <article>
            <span className="service-number">02</span>
            <h3>Aéreo o marítimo</h3>
            <p>
              Elige la vía que mejor se adapte a tu compra, tu presupuesto y tu
              urgencia.
            </p>
          </article>
          <article>
            <span className="service-number">03</span>
            <h3>Control por paquete</h3>
            <p>
              Consulta el estado, paga solo las piezas que elijas y retíralas
              cuando estén listas.
            </p>
          </article>
        </div>
      </section>

      <section className="how-it-works" id="como-funciona">
        <div>
          <p className="eyebrow">Así de claro</p>
          <h2>
            De la tienda
            <br />a tus manos.
          </h2>
        </div>
        <ol>
          <li>
            <b>01</b>
            <div>
              <h3>Crea tu casillero</h3>
              <p>
                Regístrate y recibe tu código y dirección de compra en Miami.
              </p>
            </div>
          </li>
          <li>
            <b>02</b>
            <div>
              <h3>Compra y preregistra</h3>
              <p>
                Usa tu dirección KeyGo y avísanos el tracking de cada compra.
              </p>
            </div>
          </li>
          <li>
            <b>03</b>
            <div>
              <h3>Elige cómo enviar</h3>
              <p>Consolida tus paquetes o solicita un envío individual.</p>
            </div>
          </li>
          <li>
            <b>04</b>
            <div>
              <h3>Paga y retira</h3>
              <p>
                Cuando llegue a Honduras, paga y retira solo los paquetes que
                necesites.
              </p>
            </div>
          </li>
        </ol>
      </section>

      <section className="cta-band" id="sucursales">
        <p className="eyebrow">Tu próxima compra comienza aquí</p>
        <h2>Un casillero. Todo más cerca.</h2>
        <a className="button button-light" href="/registrarse">
          Crear mi casillero <span aria-hidden="true">→</span>
        </a>
      </section>

      <footer>
        <a className="brand" href="#inicio">
          <Image src="/brand/isotipo.png" alt="" width={42} height={42} />
        </a>
        <p>Miami · Honduras</p>
        <a href="/contacto">Contáctanos</a>
      </footer>
    </main>
  );
}
