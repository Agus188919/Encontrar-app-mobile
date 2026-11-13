// src/errores/AppError.ts
export type CodigoError = 
  | 'SIN_CONEXION'
  | 'PROMO_VENCIDA'
  | 'QR_INVALIDO'
  | 'COMERCIO_NO_ENCONTRADO'
  | 'PERMISO_DENEGADO'
  | 'ERROR_DESCONOCIDO';

export class AppError extends Error {
  constructor(
    public readonly codigo: CodigoError,
    public readonly mensajeUsuario: string,
    public readonly detalleTecnico?: unknown
  ) {
    super(mensajeUsuario);
    this.name = 'AppError';
  }

  public static desdeApi(errorData: { codigo: string; mensaje: string }): AppError {
    return new AppError(
      (errorData.codigo as CodigoError) || 'ERROR_DESCONOCIDO',
      errorData.mensaje
    );
  }
}