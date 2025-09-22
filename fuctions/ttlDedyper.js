// utils/ttlDeduper.js
class TTLDeduper {
    /**
     * @param {object} opts
     * @param {number} opts.ttlMs   Tiempo de vida en ms (ej: 10000 = 10s)
     * @param {number} opts.sweepMs Cada cuánto limpiar expirados (ms)
     */
    constructor({ ttlMs = 10_000, sweepMs = 30_000 } = {}) {
        this.ttlMs = ttlMs;
        this.map = new Map(); // key -> expiresAt (epoch ms)
        this.sweeper = setInterval(() => this.sweep(), sweepMs).unref();
    }

    now() { return Date.now(); }

    sweep() {
        const now = this.now();
        for (const [k, exp] of this.map.entries()) {
            if (exp <= now) this.map.delete(k);
        }
    }

    /**
     * Marca y verifica si es duplicado:
     * - true  => ya visto dentro del TTL (descartar)
     * - false => no visto (se marca ahora) y procesar
     */
    seen(key) {
        const now = this.now();
        const exp = this.map.get(key);
        if (exp && exp > now) return true;
        this.map.set(key, now + this.ttlMs);
        return false;
    }

    /**
     * Podés llamar manualmente si querés bajar la memoria rápido.
     */
    clear() {
        this.map.clear();
    }
}

module.exports = { TTLDeduper };
