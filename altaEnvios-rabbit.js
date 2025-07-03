const amqp = require("amqplib");
const { getCompanyById, getConnection } = require("./dbconfig");
const { AltaEnvio } = require("./controllerAlta/controllerAltaEnvio");

async function startConsumer() {
  let connection, channel;

  try {
    connection = await amqp.connect(
      "amqp://lightdata:QQyfVBKRbw6fBb@158.69.131.226:5672"
    );
    channel = await connection.createChannel();

    const queue = "insertMLIA";
    await channel.assertQueue(queue, { durable: true });

    console.log("Esperando mensajes en la cola:", queue);

    channel.consume(queue, async (msg) => {
      if (msg !== null) {
        try {
          const data = JSON.parse(msg.content.toString());
          const idEmpresa = data.data.didEmpresa;

          const empresasIgnoradas = new Set([149, 44, 86, 36]);
          const empresasPermitidas = new Set([159, 214, 274, 108, 268, 201, 237, 61, 106, 198, 247, 287, 297, 232, 105, 205, 225,257]);


          if (empresasIgnoradas.has(idEmpresa)) {
            console.log(`Mensaje con idEmpresa ${idEmpresa} ignorado.`);
            return channel.ack(msg);
          }

          if (empresasPermitidas.has(idEmpresa)) {
            //  const connectionDb = await getConnection(idEmpresa);
            const company = await getCompanyById(idEmpresa);
            console.log(data);

            await AltaEnvio(company, data);


            channel.ack(msg);
          } else {
            // Si no es 97 ni excluida, solo confirmo sin procesar
            channel.ack(msg);
          }
        } catch (error) {
          console.error("Error procesando el mensaje:", error);
          // Nack con reintento
          channel.nack(msg);
        }
      }
    });
  } catch (error) {
    console.error("Error en el consumidor de RabbitMQ:", error);
    // Aquí no hay 'msg' para hacer nack, solo loguear el error
  }
}

startConsumer();
