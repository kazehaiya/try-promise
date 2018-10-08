const PENDING = 'pending';
const RESOLVED = 'resolved';
const REJECTED = 'rejected';
const REASON = 'promise resolver is not a function at new promise!';

/**
 * 仿写 promise
 *
 * @class promise
 */
class promise {
  constructor(resolver) {
    // 传入的非函数则报错
    if (!this._isFunction(resolver)) {
      throw new TypeError(REASON);
    }
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
        this._setResolvedList(onResolved, onRejected, resolved, rejected);
        // 处理 reject 部分函数
        this._setRejectedList(onRejected, resolved, rejected);
      })
    }
    // resolved 状态
    if (statusNow === RESOLVED) {
      promiseNext = new promise((resolved, rejected) => {
        setTimeout(() => {
          this._setResolvedList(onResolved, onRejected, resolved, rejected);
        })
      });
    }
    // rejected 状态
    if (statusNow === REJECTED) {
      promiseNext = new promise((resolved, rejected) => {
        setTimeout(() => {
          this._setRejectedList(onRejected, resolved, rejected);
        })
      });
    }
    // 返回新的 promise
    return promiseNext;
  }

  /**
   * 异常捕捉
   *
   * @memberof promise
   */
  catch() {}

  /**
   * 为 resolvedArr 列表添加回调项
   *
   * @param {Function} onResolved
   * @param {Function} onRejected
   * @param {Function} resolved
   * @param {Function} rejected
   * @memberof promise
   */
  _setResolvedList(onResolved, onRejected, resolved, rejected) {
    let callback = null;
    this.resolvedArr.push(() => {
      // 考虑到传入的函数为 () => { throw new Error('reason') }
      try {
        // 获取当前 then 函数的返回值（入参为前者的结果）
        callback = onResolved(this.result);
        // 单个 then 链
        resolved(callback);
      } catch(reason) {
        rejected(reason);
      }
    });
  }

  /**
   * 为 resolvedArr 列表添加回调项
   *
   * @param {*} onResolved
   * @param {*} resolved
   * @param {*} rejected
   * @memberof promise
   */
  _setRejectedList(onRejected, resolved, rejected) {
    let callback = null;
    this.rejectedArr.push(() => {
      // 考虑到传入的函数为 () => { throw new Error('reason') }
      try {
        // 获取当前 then 函数的返回值（入参为前者的结果）
        callback = onRejected(this.result);
        // 单个 then 链
        resolved(callback);
      } catch(reason) {
        rejected(reason);
      }
    });
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
new promise(1);

// Case 1: 直接输入报错的函数
// new promise(() => {
//   throw new Error('error');
// });

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
