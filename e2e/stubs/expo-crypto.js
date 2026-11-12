const nodeCrypto = require("node:crypto");
module.exports = {
  randomUUID: () => nodeCrypto.randomUUID(),
  getRandomBytes: (length) => new Uint8Array(nodeCrypto.randomBytes(length)),
};
