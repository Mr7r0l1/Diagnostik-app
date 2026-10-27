export function errorHandler(err, req, res, next) {
  console.error('❌ Error capturado en el servidor:', err);

  const statusCode = err.statusCode || 500;
  const message = err.message || 'Ocurrió un error interno en el servidor.';

  res.status(statusCode).json({
    success: false,
    error: message
  });
}
