const PENDING = 'pending';
const RESOLVED = 'resolved';
const REJECTED = 'rejected';

/**
 * 仿写 promise
 *
 * @class promise
 */
class promise {
  constructor(resolver) {
    // 初始化状态
    this.currentStatus = PENDING;
    // 两种状态的数组（仅当有 then 时存入待处理的内容）
    this.resolvedArr = [];
    this.rejectedArr = [];
    // 异步的结果
    this.result = undefined;

    // 选择 resolved 或者成功时的回调
    this.resolved = value => {
      // resolved 中传入的参数为 promise 的情况
      if (value instanceof promise) {
        return value(this.resolved, this.rejected);
      }
      // 其他情况放入下一宏任务队列，依次执行
      setTimeout(() => {
        if (this.currentStatus === PENDING) {
          this.currentStatus = RESOLVED;
          this.result = value;
          // 处理 then 链压入的队列
          this.resolvedArr.forEach(callback => callback());
        }
      });
    };
    // 选择 rejected 或者出错时的回调
    this.rejected = reason => {
      // 放入下一宏任务队列，依次执行
      setTimeout(() => {
        if (this.currentStatus === PENDING) {
          this.currentStatus = REJECTED;
          this.result = reason;
          // 处理 then 链压入的队列
          this.rejectedArr.forEach(callback => callback());
        }
      });
    };

    // 执行回调函数（捕获传入函数的 throw 报错）
    try {
      resolver(this.resolved, this.rejected);
    } catch (reason) {
      this.rejected(reason);
    }
  }

  /**
   * then 链
   *
   * @param {Function} onResolved 可选参数，非函数可忽略（规范2.2）
   * @param {Function} onRejected 可选参数，非函数可忽略（规范2.2）
   * @memberof promise
   */
  then(onResolved, onRejected) {
    // 此处处理 then 链，结果存入数组，实现透传，同时 onRejected 为错误捕获做准备
    onResolved = this._isFunction(onResolved) ? onResolved : value => value;
    onRejected = this._isFunction(onRejected) ? onRejected : reason => { throw (reason); };
    // 判断当前的状态，每次都返回一个新的 promise 实例（规范3.3）
    let statusNow = this.currentStatus;
    let promiseNext = null;
    // pending 状态
    if (statusNow === PENDING) {
      promiseNext = new promise((resolved, rejected) => {
        // 处理 resolved 部分函数
        this._setResolvedList(promiseNext, onResolved, resolved, rejected);
        // 处理 reject 部分函数
        this._setRejectedList(promiseNext, onRejected, resolved, rejected);
      })
    }
    // resolved 状态
    if (statusNow === RESOLVED) {
      promiseNext = new promise((resolved, rejected) => {
        setTimeout(() => {
          this._setResolvedList(promiseNext, onResolved, resolved, rejected);
        })
      });
    }
    // rejected 状态
    if (statusNow === REJECTED) {
      promiseNext = new promise((resolved, rejected) => {
        setTimeout(() => {
          this._setRejectedList(promiseNext, onRejected, resolved, rejected);
        })
      });
    }
    // 返回新的 promise
    return promiseNext;
  }

  /**
   * 异常捕捉
   *
   * @param {Function} onRejected
   * @returns
   * @memberof promise
   */
  catch(onRejected) {
    return this.then(undefined, onRejected);
  }

  /**
   * 为 resolvedArr 列表添加回调项
   *
   * @param {Object} newPromise
   * @param {Function} onResolved
   * @param {Function} onRejected
   * @param {Function} resolved
   * @param {Function} rejected
   * @memberof promise
   */
  _setResolvedList(newPromise, onResolved, resolved, rejected) {
    let callback = null;
    this.resolvedArr.push(() => {
      // 考虑到传入的函数为 () => { throw new Error('reason') }
      try {
        // 获取当前 then 函数的返回值（入参为前者的结果）
        callback = onResolved(this.result);
        this._thenable(newPromise, callback, resolved, rejected);
      } catch(reason) {
        rejected(reason);
      }
    });
  }

  /**
   * 为 resolvedArr 列表添加回调项
   *
   * @param {Object} newPromise
   * @param {Function} onResolved
   * @param {Function} resolved
   * @param {Function} rejected
   * @memberof promise
   */
  _setRejectedList(newPromise, onRejected, resolved, rejected) {
    let callback = null;
    this.rejectedArr.push(() => {
      // 考虑到传入的函数为 () => { throw new Error('reason') }
      try {
        // 获取当前 then 函数的返回值（入参为前者的结果）
        callback = onRejected(this.result);
        this._thenable(newPromise, callback, resolved, rejected);
      } catch(reason) {
        rejected(reason);
      }
    });
  }

  /**
   * Promise 解决过程
   *
   * @param {Object} newPromise  返回的新 promise 对象
   * @param {*} x                上一个回调函数返回值
   * @param {Function} resolved  回调函数
   * @param {Function} rejected  回调函数
   * @memberof promise
   */
  _thenable(newPromise, x, resolved, rejected) {
    // x 与 传入的 promise 相等
    if (newPromise === x) {
      return rejected(new TypeError("Try to use the same promise object as return object!"));
    }
    // x 为 promise 类型
    if (x instanceof promise) {
      // 判断 x 当前的状态，如果 x 处于等待态，promise 需保持为等待态直至 x 被执行或拒绝
      if (x.currentStatus === PENDING) {
        x.then(value => {
          this._thenable(promise2, value, resolve, reject);
        }, reject);
      } else {
        // 当为 resolved/rejected 状态时，直接执行返回对应状态即可
        x.then(resolve, reject);
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
              this._thenable(newPromise, x, resolved, rejected);
            }, // 如果 resolvePromise 以值 y 为参数被调用，则运行 [[Resolve]](promise, y)
            r => {
              if (statusChanged) { return; }
              statusChanged = true;
              rejected(r)
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

  /**
   * 判断是否是函数(内部方法)
   *
   * @param {Function} target
   * @memberof promise
   */
  _isFunction(target) {
    return Object.prototype.toString.call(target) === '[object Function]';
  }
}

/**
 * 测试部分
 */
// Case 0: 初次传入非函数
// new promise(1);

// Case 1: 直接输入报错的函数
new promise(() => {
  throw new Error('error');
}).catch(e => {
  console.log(e);
});

// Case 2: 没有触发状态数组
// new promise((resolved, rejected) => {
//   console.log(1);
// })
// .then(() => {
//   console.log(2);
// })
// .then( console.log(3) );

// Case 3: 透传
// new promise((resolved, rejected) => {
//   resolved(1);
// }).then().then(res => {
//   console.log('result' ,res);
// });

// Case 4: 正常流程测试
// new promise((resolved, rejected) => {
//   resolved(1);
// }).then(res1 => {
//   console.log(res1);
//   return 2;
// }).then( res2 => {
//   console.log(res2);
// }).then( console.log('test') );

// Case 5: 链首传入报错内容（待处理）
// new promise((resolved, rejected) => {
//   // throw new Error('error');
//   rejected(1);
// }).then(res => {
//   console.log('rejected', res);
// });

// Case 6: 链中传入报错内容
// new promise((resolved, rejected) => {
//   resolved(1)
// }).then(res => {
//   console.log(res);
//   return 2;
// }).then(res => {
//   console.log(res);
//   throw new Error('test');
// }).then(res => {
//   console.log(res);
// });

// Case 7: 回调处理类型为 promise 类型（待处理）
// new promise((resolve, reject)=>{
//   let innerPromise = new promise((resolve, reject)=>{
//       console.log(4);
//       resolve('test');
//   }
//   );
//   console.log(1)
//   resolve(innerPromise);
// }).then(res => {
//   console.log(2);
//   console.log(res, typeof res)
// }).then(console.log(3));
