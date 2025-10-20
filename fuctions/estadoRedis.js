const { default: axios } = require("axios");


async function estadoRedis(companyId, estado, shipmentId, ml_shipment_id, sellerId) {

    await axios.post(
        "https://altaenvios.lightdata.com.ar/api/enviosMLredis",
        {
            idEmpresa: companyId,
            estado: estado,
            did: shipmentId,
            ml_shipment_id: ml_shipment_id,
            ml_vendedor_id: sellerId,
        },
        {
            headers: {
                "Content-Type": "application/json",
            },
        }
    );



    return result.insertId;

}
module.exports = { estadoRedis };