// src/servicios/db/DatabaseManager.ts
import * as SQLite from 'expo-sqlite';
import { Comercio } from '../../tipos';

// Agregá esta interfaz arriba o dentro de DatabaseManager.ts
interface FilaComercioDb {
    id: string;
    nombre: string;
    rubroId: string;
    descripcion: string;
    direccion: string;
    latitud: number;
    longitud: number;
    telefono: string | null;
    whatsapp: string | null;
    horariosJson: string;
    puntaje: number;
    cantidadResenas: number;
    activo: number;
}
export class DatabaseManager {
    private static instancia: DatabaseManager | null = null;
    private db: SQLite.SQLiteDatabase | null = null;
    private inicializado: boolean = false;

    // Constructor privado para impedir instanciación externa
    private constructor() { }

    /**
     * Punto de acceso global al Singleton
     */
    public static getInstancia(): DatabaseManager {
        if (!DatabaseManager.instancia) {
            DatabaseManager.instancia = new DatabaseManager();
        }
        return DatabaseManager.instancia;
    }

    /**
     * Abre la base SQLite y crea las tablas si no existen
     */
    public async inicializar(): Promise<void> {
        if (this.inicializado) return;

        this.db = await SQLite.openDatabaseAsync('comercios_cdelu.db');

        // Tabla de comercios cacheados para modo offline
        await this.db.execAsync(`
      PRAGMA journal_mode = WAL;
      CREATE TABLE IF NOT EXISTS comercios_locales (
        id TEXT PRIMARY KEY NOT NULL,
        nombre TEXT NOT NULL,
        rubroId TEXT NOT NULL,
        descripcion TEXT,
        direccion TEXT,
        latitud REAL,
        longitud REAL,
        telefono TEXT,
        whatsapp TEXT,
        horariosJson TEXT,
        puntaje REAL,
        cantidadResenas INTEGER,
        activo INTEGER
      );
    `);

        this.inicializado = true;
    }

    /**
     * Sincroniza la lista de comercios obtenida desde la API en SQLite local
     */
    public async guardarComercios(comercios: Comercio[]): Promise<void> {
        if (!this.db) await this.inicializar();

        await this.db!.withTransactionAsync(async () => {
            for (const c of comercios) {
                await this.db!.runAsync(
                    `INSERT OR REPLACE INTO comercios_locales (
            id, nombre, rubroId, descripcion, direccion, latitud, longitud, 
            telefono, whatsapp, horariosJson, puntaje, cantidadResenas, activo
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
                    [
                        c.id,
                        c.nombre,
                        c.rubroId,
                        c.descripcion,
                        c.direccion,
                        c.coordenadas.latitud,
                        c.coordenadas.longitud,
                        c.telefono,
                        c.whatsapp,
                        JSON.stringify(c.horarios),
                        c.puntaje,
                        c.cantidadResenas,
                        c.activo ? 1 : 0,
                    ]
                );
            }
        });
    }

    /**
     * Recupera comercios de la base de datos local si no hay conexión
     */
    public async obtenerComerciosLocales(): Promise<Comercio[]> {
        if (!this.db) await this.inicializar();

        const filas = await this.db!.getAllAsync<FilaComercioDb>(
            'SELECT * FROM comercios_locales WHERE activo = 1 ORDER BY nombre ASC;'
        );

        return filas.map((fila) => ({
            id: fila.id,
            nombre: fila.nombre,
            rubroId: fila.rubroId,
            descripcion: fila.descripcion,
            direccion: fila.direccion,
            coordenadas: {
                latitud: fila.latitud,
                longitud: fila.longitud,
            },
            telefono: fila.telefono,
            whatsapp: fila.whatsapp,
            instagram: null,
            imagenes: [],
            videoUrl: null,
            horarios: JSON.parse(fila.horariosJson || '[]'),
            mediosDePago: ['efectivo'],
            puntaje: fila.puntaje,
            cantidadResenas: fila.cantidadResenas,
            codigoQr: null,
            activo: fila.activo === 1,
        }));
    }
}