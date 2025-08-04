const { executeQuery } = require("../../dbconfig");
const { logYellow, logBlue } = require("../../fuctions/logsCustom");

class Envios {
  constructor(data, company = null, connection = null) {
    this.gtoken = this.generateGToken();
    this.fechaunix = this.generateFechaUnix();

    // Fecha de inicio ajustada
    const fecha = new Date();
    fecha.setHours(fecha.getHours() - 3); // Ajustar la hora según sea necesario
    this.fecha_inicio = fecha.toISOString();
    const horaActual = String(fecha.getHours()).padStart(2, "0");
    this.horaActual = horaActual
    this.data = data // Asignar la fecha en formato ISO

    const campos = {
      did: data.did ?? 0,
      didDeposito: data.didDeposito ?? 1,
      flex: data.flex ?? 0,
      turbo: data.turbo ?? 0,
      exterior: data.exterior ?? 0,
      lote: data.lote ?? "",
      ml_shipment_id: data.ml_shipment_id ?? "",
      ml_vendedor_id: data.ml_vendedor_id ?? "",
      ml_venta_id: data.ml_venta_id ?? "",
      ml_pack_id: data.ml_pack_id ?? "",
      ml_qr_seguridad: data.ml_qr_seguridad ?? "",
      didCliente: data.didCliente ?? 0,
      didCuenta: data.didCuenta,
      didServicio: data.didServicio ?? 1,
      mode: data.mode ?? " ",
      didMetodoEnvio: data.didMetodoEnvio ?? 1,
      didSucursalDistribucion: data.didSucursalDistribucion ?? 1,
      peso: data.peso ?? "",
      volumen: data.volumen ?? "",
      bultos: data.bultos ?? 1,
      valor_declarado: data.valor_declarado ?? "",
      monto_total_a_cobrar: data.monto_total_a_cobrar ?? "",
      tracking_method: data.tracking_method ?? "",
      tracking_number: data.tracking_number,
      fecha_venta: data.fecha_venta ?? "",
      destination_receiver_name: data.destination_receiver_name ?? " ",
      destination_receiver_phone: data.destination_receiver_phone,
      destination_receiver_email: data.destination_receiver_email,
      destination_comments: data.destination_comments ?? "   ",
      destination_types: data.destination_types ?? " ",


      delivery_preference: data.delivery_preference ?? " ",
      quien: data.quien,
      elim: data.elim ?? 0,
    };


    // Solo asignar si el campo no es null
    for (const [key, value] of Object.entries(campos)) {
      if (value !== null) {
        this[key] = value;
      }
    }

    this.company = company;
    this.connection = connection;
  }

  // Getter para fecha_inicio

  generateGToken() {
    return Math.random().toString(36).substring(2);
  }

  generateFechaUnix() {
    return Math.floor(Date.now() / 1000);
  }

  async insert() {
    try {

      // Establecer elim en 52 si es necesario
      if (this.elim === "") {
        this.elim = 52; // Cambiar a 52 si elim está vacío
      }

      if (this.did === 0 || this.did === "0" || this.did === "") {
        return this.createNewRecordWithIdUpdate(this.connection,);
      } else {
        return this.checkAndUpdateDid(this.connection);
      }
    } catch (error) {
      console.error("Error en insert:", error.message);
      throw {
        status: 500,
        response: {
          estado: false,
          error: -1,
        },
      };
    }
  }

  async checkAndUpdateDid(connection) {
    const query = "SELECT id FROM envios WHERE did = ?";
    try {
      const results = await executeQuery(connection, query, [this.did]);
      if (results.length > 0) {
        const updateQuery = "UPDATE envios SET superado = 1 WHERE did = ?";
        await executeQuery(connection, updateQuery, [this.did]);
      }
      return this.createNewRecord(connection, this.did);
    } catch (error) {
      throw error;
    }
  }

  async createNewRecordWithIdUpdate(connection) {
    try {
      let hora;

      const query = `
      SELECT hora 
      FROM clientes_cierre_ingreso 
      WHERE superado = 0 AND elim = 0 AND didCliente = ?
    `;
      const result2 = await executeQuery(this.connection, query, [this.data.didCliente]);

      if (result2.length > 0) {
        hora = result2[0].hora;
      } else {
        const query2 = `
        SELECT config 
        FROM sistema_config 
        WHERE superado = 0 AND elim = 0 
      `;
        const result3 = await executeQuery(this.connection, query2, []);
        const config = JSON.parse(result3[0].config);
        hora = config.hora_cierre;
      }

      // Calcular fecha_despacho según hora actual y hora de cierre
      const ahora = new Date();
      ahora.setHours(ahora.getHours()); // Ajuste horario si es necesario

      const horaActual = ahora.getHours(); // número 0-23

      const horaCierre = parseInt(hora);   // también como número 0-23

      const fechaDespacho = new Date(ahora);
      if (horaActual >= horaCierre) {
        fechaDespacho.setDate(fechaDespacho.getDate() + 1); // Sumar un día
      }

      const year = fechaDespacho.getFullYear();
      const month = String(fechaDespacho.getMonth() + 1).padStart(2, "0");
      const day = String(fechaDespacho.getDate()).padStart(2, "0");

      this.fecha_despacho = `${year}-${month}-${day}`; // YYYY-MM-DD

      // --- Insertar el nuevo registro como ya lo tenías ---
      const describeQuery = "DESCRIBE envios";
      const results = await executeQuery(connection, describeQuery, []);
      const columns = results.map((col) => col.Field);
      const filteredColumns = columns.filter((col) => this[col] !== undefined);
      const values = filteredColumns.map((col) => this[col]);

      const insertQuery = `INSERT INTO envios (${filteredColumns.join(", ")}) VALUES (${filteredColumns.map(() => "?").join(", ")})`;

      logYellow(`Insert Query: ${JSON.stringify(insertQuery)}`);
      logBlue(`Values: ${JSON.stringify(values)}`);

      const result = await executeQuery(connection, insertQuery, values);
      const insertId = result.insertId;

      const updateQuery = "UPDATE envios SET did = ? WHERE id = ?";
      await executeQuery(connection, updateQuery, [insertId, insertId]);

      return { insertId, did: insertId };
    } catch (error) {
      throw error;
    }
  }

  async createNewRecord(connection, did) {
    try {
      const describeQuery = "DESCRIBE envios";
      const results = await executeQuery(connection, describeQuery, []);

      const columns = results.map((col) => col.Field);
      const filteredColumns = columns.filter((col) => this[col] !== undefined);
      const values = filteredColumns.map((col) => this[col]);

      const insertQuery = `INSERT INTO envios (${filteredColumns.join(
        ", "
      )}) VALUES (${filteredColumns.map(() => "?").join(", ")})`;
      const result = await executeQuery(connection, insertQuery, values);
      logYellow(`Insert Query: ${JSON.stringify(insertQuery)}`);
      logBlue(`Values: ${JSON.stringify(values)}`);

      const insertId = result.insertId;
      if (did === 0 || did === "0") {
        const updateQuery = "UPDATE envios SET did = ? WHERE id = ?";
        await executeQuery(connection, updateQuery, [insertId, insertId]);
        return { insertId, did: insertId };
      } else {
        return { insertId, did };
      }
    } catch (error) {
      throw error;
    }
  }
}

module.exports = Envios;



