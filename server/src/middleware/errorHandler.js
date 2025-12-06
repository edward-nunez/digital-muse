export default function errorHandler(err, req, res, next) {
  console.error("[error]", err);
  
  // Don't try to send response if headers already sent
  if (res.headersSent) {
    console.error("[error] Headers already sent, cannot respond");
    return;
  }
  
  const status = err.status || 500;
  const message = err.message || "Internal Server Error";
  res.status(status).json({ error: message });
}
