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
      throw Error(REASON);
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

    // 执行回调函数（捕获传入函数的 throw Error 报错）
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
    onResolved = this._isFunction(onResolved) ? onResolved : value => value;
    onRejected = this._isFunction(onRejected) ? onRejected : () => { throw Error(REASON); };
    // 判断当前的状态，每次都返回一个新的 promise 实例（规范3.3）
    let statusNow = this.currentStatus;
    let promiseNext = null;
    // pending 状态
    if (statusNow === PENDING) {
      promiseNext = new promise((resolved, rejected) => {
        // 处理 resolved 部分函数
        this._setResolvedList(onResolved, resolved, rejected);
        // 处理 reject 部分函数
        this._setRejectedList(onRejected, resolved, rejected);
      })
    }
    // resolved 状态
    if (statusNow === RESOLVED) {
      promiseNext = new promise((resolved, rejected) => {
        setTimeout(() => {
          this._setResolvedList(onResolved, resolved, rejected);
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
   * @param {*} onResolved 回调函数
   * @param {*} resolved
   * @param {*} rejected
   * @memberof promise
   */
  _setResolvedList(onResolved, resolved, rejected) {
    this.resolvedArr.push(() => {
      // 考虑到传入的函数为 () => { throw Error('reason') }
      try {
        // 获取当前 then 函数的返回值（入参为前者的结果）
        const callback = onResolved(this.result);
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
    this.rejectedArr.push(() => {
      // 考虑到传入的函数为 () => { throw Error('reason') }
      try {
        // 获取当前 then 函数的返回值（入参为前者的结果）
        let callback = onRejected(this.result);
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

new promise((resolved, rejected) => {
  resolved(1);
}).then(res => {
  console.log(res);
}).then(console.log('test'));

// let test = new promise(() => {
//   new promise(() => {
//     console.log('test');
//   });
// });
// console.log(test);


// new promise(() => {
//   throw Error('error');
// });