const { getConnection, getFromRedis, executeQuery } = require("../../dbconfig");
const { logYellow, logBlue } = require("../../fuctions/logsCustom");

// Clase Ordenes
class Ordenes {
  constructor({
    did = "",
    didEnvio = "",
    didCliente = "",
    didCuenta = "",
    status = "",
    flex = 0,
    fecha_venta = null,
    number = "",
    observaciones = "",
    armado = 0,
    descargado = 0,
    fecha_armado = null,
    quien_armado = "",
    connection = null,
  }) {
    this.did = did;
    this.didEnvio = didEnvio;
    this.didCliente = didCliente;
    this.didCuenta = didCuenta;
    this.status = status;
    this.flex = flex;
    this.fecha_venta = fecha_venta;
    this.number = number;
    this.observaciones = observaciones || "Observación por defecto"; // Valor por defecto
    this.armado = armado;
    this.descargado = descargado;
    this.fecha_armado = fecha_armado;
    this.quien_armado = quien_armado;
    this.connection = connection;
  }

  // Método para convertir a JSON
  toJSON() {
    return JSON.stringify(this);
  }

  // Método para insertar en la base de datos
  async insert() {
    try {
      if (this.did === null) {
        return this.createNewRecord(this.connection);
      } else {
        return this.checkAndUpdateDid(this.connection);
      }
    } catch (error) {
      console.error("Error en el método insert:", error.message);
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
    try {
      const checkDidQuery = "SELECT id FROM ordenes WHERE did = ?";
      const results = await executeQuery(connection, checkDidQuery, [this.did]);

      if (results.length > 0) {
        const updateQuery = "UPDATE ordenes SET superado = 1 WHERE did = ?";
        await executeQuery(connection, updateQuery, [this.did]);
        return this.createNewRecord(connection);
      } else {
        return this.createNewRecord(connection);
      }
    } catch (error) {
      throw error;
    }
  }

  async createNewRecord(connection) {
    try {
      const columnsQuery = "DESCRIBE ordenes";
      const results = await executeQuery(connection, columnsQuery, []);

      const tableColumns = results.map((column) => column.Field);
      const filteredColumns = tableColumns.filter(
        (column) => this[column] !== undefined
      );
      const values = filteredColumns.map((column) => this[column]);
      const insertQuery = `INSERT INTO ordenes (${filteredColumns.join(
        ", "
      )}) VALUES (${filteredColumns.map(() => "?").join(", ")})`;

      logYellow("Insert Query", insertQuery);
      logBlue("Values:", values);

      const insertResult = await executeQuery(connection, insertQuery, values);
      return { insertId: insertResult.insertId };
    } catch (error) {
      throw error;
    }
  }
}

module.exports = Ordenes;
