const promisesAplusTests = require('promises-aplus-tests');
const promise = require('./try_promise');

const adapter = {
  deferred: function() {
    let deferred = {};
    deferred.promise = new promise((resolve, reject) => {
      deferred.resolve = resolve;
      deferred.reject = reject;
    });
    return deferred;
  }
};

promisesAplusTests(adapter, function(err) {
  console.log('Failures: ' + err);
});
