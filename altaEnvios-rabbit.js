const amqp = require("amqplib");
const { getCompanyById } = require("./dbconfig");
const { AltaEnvio } = require("./controllerAlta/controllerAltaEnvio");
const { TTLDeduper } = require("./fuctions/ttlDedyper");


const AMQP_URL = "amqp://lightdata:QQyfVBKRbw6fBb@158.69.131.226:5672";
const QUEUE = "insertMLIA";

// Back-pressure
const PREFETCH = 5;
const RATE_LIMIT_PER_SEC = 500;

// Rate limiter simple
class RateLimiter {
  constructor(rps) {
    this.capacity = rps;
    this.tokens = rps;
    setInterval(() => {
      this.tokens = this.capacity;
    }, 1000).unref();
  }
  async take() {
    if (this.tokens > 0) {
      this.tokens -= 1;
      return;
    }
    await new Promise((r) => setTimeout(r, 50));
    return this.take();
  }
}
const limiter = new RateLimiter(RATE_LIMIT_PER_SEC);

// ---- DEDUPE EN MEMORIA (10s) ----
const deduper = new TTLDeduper({ ttlMs: 10_000 }); // 10 segundos
const makeKey = (payload) => {
  const v = payload?.data?.ml_vendedor_id ?? "";
  const s = payload?.data?.ml_shipment_id ?? "";
  return `${v}:${s}`; // clave compuesta
};

async function startConsumer() {
  for (; ;) {
    try {
      console.log(`[amqp] conectando a ${AMQP_URL}`);
      const connection = await amqp.connect(AMQP_URL, { heartbeat: 15 });
      const channel = await connection.createChannel();
      await channel.assertQueue(QUEUE, { durable: true });
      await channel.prefetch(PREFETCH);

      console.log(
        `[amqp] Esperando mensajes en ${QUEUE} (prefetch=${PREFETCH}, rps=${RATE_LIMIT_PER_SEC})`
      );

      const empresasIgnoradas = new Set([149, 44, 86, 36]);
      const empresasPermitidas = new Set([
        159, 214, 274, 108, 268, 201, 237, 61, 106, 198, 247, 287, 297, 232, 105,
        205, 225, 257, 111, 170, 160, 333, 192, 47, 51, 115, 162, 165, 174, 177,
        203, 206, 215, 229, 230, 231, 260, 278, 283, 316, 343, 211, 124, 167, 97,
        271, 200, 20, 217, 319, 175
      ]);

      channel.consume(
        QUEUE,
        async (msg) => {
          if (!msg) return;
          await limiter.take();

          try {
            const data = JSON.parse(msg.content.toString());
            const idEmpresa = data?.data?.didEmpresa;

            if (empresasIgnoradas.has(idEmpresa)) {
              console.log(`Ignorado idEmpresa=${idEmpresa}`);
              channel.ack(msg);
              return;
            }

            // ---- DEDUPE: si ya lo vimos en los últimos 10s, descartar ----
            const key = makeKey(data);
            if (deduper.seen(key)) {
              console.log(`Descartado por duplicado reciente (TTL) key=${key}`);
              channel.ack(msg); // IMPORTANTÍSIMO: ack para que no vuelva a la cola
              return;
            }

            if (empresasPermitidas.has(idEmpresa)) {
              const company = await getCompanyById(idEmpresa);
              await AltaEnvio(company, data);
            }
            channel.ack(msg);
          } catch (err) {
            console.error("Error procesando mensaje:", err);
            channel.nack(msg, false, false);
          }
        },
        { noAck: false }
      );

      await new Promise((resolve) => connection.once("close", resolve));
      console.warn("[amqp] conexión cerrada, reintentando...");
    } catch (err) {
      console.error("[amqp] error al consumir:", err);
      await new Promise((r) => setTimeout(r, 5000));
    }
  }
}

startConsumer();
