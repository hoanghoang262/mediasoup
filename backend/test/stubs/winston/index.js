module.exports = {
  createLogger: () => ({ info() {}, warn() {}, error() {}, debug() {} }),
  format: { combine: () => {}, timestamp: () => {}, printf: () => {}, colorize: () => {}, errors: () => {} },
  transports: { Console: function() {}, File: function() {} }
};
