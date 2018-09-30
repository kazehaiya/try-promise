const PENDING = 'pending';
const RESOLVED = 'resolved';
const REJECTED = 'rejected';

/**
 * 仿写实现 Promise
 *
 * @class promise
 */
class promise {
  constructor(resolver) {
    // 传入的非函数则报错
    if (Object.prototype.toString.call(resolver) !== '[object Function]') {
      throw Error('promise resolver is not a function at new promise!');
    }
    // 初始化状态
    this.currentStatus = PENDING;
    // 两种状态的数组（仅当有 then 时存入待处理的内容）
    this.resolverArr = [];
    this.rejectedArr = [];
    // 异步的结果
    this.result = undefined;
    // 成功时的回调
    this.resolved = result => {
      // then 链传入的为 promise 的情况
      if (result instanceof promise) {
        return result(this.resolved, this.rejected);
      }
      // 其他情况
      setTimeout(() => {
        if (this.currentStatus === PENDING) {
          this.currentStatus = RESOLVED;
          this.result = result;
          this.resolverArr.forEach(callback => callback(), 0);
        }
      });
    };
    // 失败时的回调
    this.rejected = reason => {
      setTimeout(() => {
        if (this.currentStatus === PENDING) {
          this.currentStatus = REJECTED;
          this.result = reason;
          this.rejectedArr.forEach(callback => callback(), 0);
        }
      });
    };
    // 执行回调（捕获传入函数的 throw Error 报错）
    try {
      resolver(this.resolved, this.rejected);
    } catch (e) {
      this.rejected(e);
    }
  }

  // then 链，处理各种状态
  then() {}
}

let test = new promise(() => {
  new promise(() => {
    console.log('test');
  });
  // throw Error('error');
});

console.log(test);
