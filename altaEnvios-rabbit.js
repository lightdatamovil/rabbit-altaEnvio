const amqp = require('amqplib');
const { getCompanyById, getConnection } = require('./dbconfig');
const { AltaEnvio } = require('./controllerAlta/controllerAltaEnvio');






async function startConsumer() {
    try {
        const connection = await amqp.connect('amqp://lightdata:QQyfVBKRbw6fBb@158.69.131.226:5672'); 
        const channel = await connection.createChannel();
        const queue = 'altaEnvios1';
        await channel.assertQueue(queue, { durable: true });
        
        console.log("Esperando mensajes en la cola:", queue);
        
        channel.consume(queue, async (msg) => {
            if (msg !== null) {
                const data = JSON.parse(msg.content.toString());
                console.log(data,"data");
                
                
                const company = await getCompanyById(data.data.idEmpresa);
                await AltaEnvio(company, data);

         
              
              

                    channel.ack(msg); // Confirmar que el mensaje fue procesado
                } 
      
        });
    } catch (error) {
        channel.nack(msg);
        console.error("Error en el consumidor de RabbitMQ:", error);
    }
    
}



startConsumer();

