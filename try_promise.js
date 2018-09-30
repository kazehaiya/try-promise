const PENDING = 'pending';
const RESOLVED = 'resolved';
const REJECTED = 'rejected';

/**
 * 仿写 promise
 *
 * @class promise
 */
class promise {
  /**
   * 创建 promise 实例
   * @param {Function} resolver  // 传入的回调函数
   * @memberof promise
   */
  constructor(resolver) {
    // 初始化状态
    this.currentStatus = PENDING;
    // 两种状态的数组（仅当有 then 时存入待处理的内容）
    this.resolvedArr = [];
    this.rejectedArr = [];
    // 异步的结果
    this.result = undefined;
    // 选择 resolved 或者成功时的回调
    const resolved = value => {
      // resolved 中传入的参数为 promise 的情况
      if (value instanceof promise) {
        return value.then(resolved, rejected);
      }
      // 其他情况放入下一宏任务队列，依次执行（先执行完 then 链，再处理队列）
      setTimeout(() => {
        // 注：此处的 this 指向的是新返回的 promise 对象
        if (this.currentStatus === PENDING) {
          this.currentStatus = RESOLVED;
          this.result = value;
          // 处理 then 链压入的队列
          this.resolvedArr.forEach(callback => callback());
        }
      }, 0);
    };
    // 选择 rejected 或者出错时的回调
    const rejected = reason => {
      // 其他情况放入下一宏任务队列，依次执行（先执行完 then 链，再处理队列）
      setTimeout(() => {
        // 注：此处的 this 指向的是新返回的 promise 对象
        if (this.currentStatus === PENDING) {
          this.currentStatus = REJECTED;
          this.result = reason;
          // 处理 then 链压入的队列
          this.rejectedArr.forEach(callback => callback());
        }
      }, 0);
    };

    // 执行回调函数（捕获传入函数的 throw 报错）
    try {
      resolver(resolved, rejected);
    } catch (reason) {
      rejected(reason);
    }
  }

  /**
   * then 链
   *
   * @param {Function}  // onResolved 可选参数，非函数可忽略（规范2.2）
   * @param {Function}  // onRejected 可选参数，非函数可忽略（规范2.2）
   * @returns {Object}  // 返回一个新 promise
   * @memberof promise
   */
  then(onResolved, onRejected) {
    // 此处处理 then 链，结果存入数组，实现透传，同时 onRejected 为错误捕获做准备
    onResolved = promise._isFunction(onResolved) ? onResolved : value => value;
    onRejected = promise._isFunction(onRejected) ? onRejected : reason => { throw reason; };
    // 判断当前的状态，每次都返回一个新的 promise 实例（规范3.3）
    let statusNow = this.currentStatus;
    let promiseNext = null;
    // pending 状态
    if (statusNow === PENDING) {
      promiseNext = new promise((resolved, rejected) => {
        // 处理 resolved 部分函数
        this.resolvedArr.push(() => {
          promise._dealStatusCommonFunc(this, promiseNext, onResolved, resolved, rejected);
        });
        // 处理 rejected 部分函数
        this.rejectedArr.push(() => {
          promise._dealStatusCommonFunc(this, promiseNext, onRejected, resolved, rejected);
        });
      });
    }
    // resolved 状态
    if (statusNow === RESOLVED) {
      promiseNext = new promise((resolved, rejected) => {
        setTimeout(() => {
          promise._dealStatusCommonFunc(this, promiseNext, onResolved, resolved, rejected);
        }, 0);
      });
    }
    // rejected 状态
    if (statusNow === REJECTED) {
      promiseNext = new promise((resolved, rejected) => {
        setTimeout(() => {
          promise._dealStatusCommonFunc(this, promiseNext, onRejected, resolved, rejected);
        }, 0);
      });
    }
    // 返回新的 promise
    return promiseNext;
  }

  /**
   * 异常捕捉
   *
   * @param {Function} onRejected  // 传入函数
   * @returns {Object}             // 返回一个 then 链
   * @memberof promise
   */
  catch(onRejected) {
    // 返回一个 promise
    return this.then(undefined, onRejected);
  }

  /**
   * promise.resolve() 方法
   *
   * @static
   * @param {*} value   // 传入值
   * @returns {Object}  // 返回一个 resolve 状态的 promise
   * @memberof promise
   */
  static resolve(value) {
    return new promise((resolve, reject) => {
      resolve(value);
    });
  }

  /**
   * promise.reject() 方法
   *
   * @static
   * @param {*} reason  // 传入值
   * @returns {Object}  // 返回一个 resolve 状态的 promise
   * @memberof promise
   */
  static reject(reason) {
    return new promise((resolve, reject) => {
      reject(reason);
    });
  }

  /**
   * 处理三种状态的公用方法（私有）
   *
   * @static
   * @param {Object} self        this 指针的别名
   * @param {Object} newPromise  新创建的 promise
   * @param {Function} callback  传入的回调函数
   * @param {Function} resolved  新创建的 promise 的回调函数 resolved
   * @param {Function} rejected  新创建的 promise 的回调函数 rejected
   * @memberof promise
   */
  static _dealStatusCommonFunc(self, newPromise, callback, resolved, rejected) {
    // 考虑到传入的函数为 () => { throw new Error('reason') }
    try {
      // 获取当前 then 函数的返回值（入参为前者的结果）
      const x = callback(self.result);
      promise._thenable(newPromise, x, resolved, rejected);
    } catch(reason) {
      rejected(reason);
    }
  }

  /**
   * 判断是否是函数(私有)
   *
   * @static
   * @param {*} target   待对比的值
   * @returns {Boolean}  返回对比结果
   * @memberof promise
   */
  static _isFunction(target) {
    return Object.prototype.toString.call(target) === '[object Function]';
  }

  /**
   * Promise 解决过程（决定能否继续执行下一个 then 函数）（私有）
   *
   * @static
   * @param {Object} newPromise  返回的新 promise 对象
   * @param {*} x                上一个回调函数返回值
   * @param {Function} resolved  回调函数
   * @param {Function} rejected  回调函数
   * @returns
   * @memberof promise
   */
  static _thenable(newPromise, x, resolved, rejected) {
    // x 与 传入的 promise 相等
    if (newPromise === x) {
      return rejected(new TypeError("Try to use the same promise object as return object!"));
    }
    // x 为 promise 类型
    if (x instanceof promise) {
      // 判断 x 当前的状态，如果 x 处于等待态，promise 需保持为等待态直至 x 被执行或拒绝
      if (x.currentStatus === PENDING) {
        x.then(value => {
          promise._thenable(newPromise, value, resolved, rejected);
        }, error => {
          rejected(error);
        });
      } else {
        // 当为 resolved/rejected 状态时，直接执行返回对应状态即可
        x.then(resolved, rejected);
      }
    }
    // 调用时，如果状态一旦改变了就不再执行其余的内容
    let statusChanged = false;
    // x 为对象或函数
    if (x !== null && (typeof x === 'object' || typeof x === 'function')) {
      // 如果取 x.then 的值时抛出错误 e ，则以 e 为据因拒绝 promise
      try {
        const then = x.then;
        // 如果 then 是函数，将 x 作为函数的作用域 this 调用之，第一个参数叫做 resolvePromise ，第二个参数叫做 rejectPromise
        if (typeof then === 'function') {
          // 注：如果 resolvePromise 和 rejectPromise 均被调用，或者被同一参数调用了多次，则优先采用首次调用并忽略剩下的调用
          then.call(
            x,
            y => {
              if (statusChanged) { return; }
              statusChanged = true;
              promise._thenable(newPromise, y, resolved, rejected);
            }, // 如果 resolvePromise 以值 y 为参数被调用，则运行 [[Resolve]](promise, y)
            r => {
              if (statusChanged) { return; }
              statusChanged = true;
              rejected(r);
            } // 如果 rejectPromise 以据因 r 为参数被调用，则以据因 r 拒绝 promise
          );
        } else {
          // 如果 then 不是函数，以 x 为参数执行 promise
          resolved(x);
        }
      } catch (reason) {
        // 如果调用 then 方法抛出了异常 e
        if (statusChanged) { return; }
        statusChanged = true;
        rejected(reason);
      }
    } else {
      // 如果 x 不为对象或者函数，以 x 为参数执行 promise
      resolved(x);
    }
  }
}

module.exports = promise;
