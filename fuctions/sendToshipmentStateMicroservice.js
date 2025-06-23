const { connect } = require('amqplib');
const { logRed, logGreen } = require('./logsCustom.js');
const { formatFechaUTC3 } = require('./formatFechaUTC3.js');

const RABBITMQ_URL = "amqp://lightdata:QQyfVBKRbw6fBb@158.69.131.226:5672";
const QUEUE_ESTADOS = "srvshipmltosrvstates";

let rabbitConnection = null;
let rabbitChannel = null;

async function initRabbitMQ() {
    try {
        if (!rabbitConnection || !rabbitChannel) {
            rabbitConnection = await connect(RABBITMQ_URL);
            rabbitChannel = await rabbitConnection.createChannel();
            await rabbitChannel.assertQueue(QUEUE_ESTADOS, { durable: true });

            logGreen("✅ Conexión a RabbitMQ establecida");

            rabbitConnection.on('close', () => {
                logRed("⚠️  Conexión a RabbitMQ cerrada, reiniciando...");
                rabbitConnection = null;
                rabbitChannel = null;
            });

            rabbitConnection.on('error', (err) => {
                logRed("❌ Error en conexión RabbitMQ:", err.message);
            });
        }
    } catch (error) {
        logRed("❌ Error inicializando RabbitMQ: " + error.message);
    }
}

async function sendToShipmentStateMicroService(companyId, userId, shipmentId, estado) {
    try {
        await initRabbitMQ(); // Asegura que la conexión esté lista

        const message = {
            didempresa: companyId,
            didenvio: shipmentId,
            estado: estado,
            subestado: null,
            estadoML: null,
            fecha: formatFechaUTC3(),
            quien: userId,
            operacion: "Altamasiva"
        };

        const sent = rabbitChannel.sendToQueue(
            QUEUE_ESTADOS,
            Buffer.from(JSON.stringify(message)),
            { persistent: true }
        );

        if (sent) {
            logGreen('✅ Mensaje enviado correctamente al microservicio de estados');
        } else {
            logRed('⚠️  El mensaje no pudo encolarse (posible buffer lleno)');
        }

    } catch (error) {
        logRed(`❌ Error en sendToShipmentStateMicroService: ${error.stack}`);
        throw error;
    }
}

module.exports = sendToShipmentStateMicroService;
