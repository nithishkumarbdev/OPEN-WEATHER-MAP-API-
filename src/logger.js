function timestamp() {
  return new Date().toISOString();
}

function info(message) {
  console.log(`[${timestamp()}] INFO  ${message}`);
}

function warn(message) {
  console.warn(`[${timestamp()}] WARN  ${message}`);
}

function error(message) {
  console.error(`[${timestamp()}] ERROR ${message}`);
}

function success(message) {
  console.log(`[${timestamp()}] DONE  ${message}`);
}

export default { info, warn, error, success };
