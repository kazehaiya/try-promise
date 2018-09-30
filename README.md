## 术语
- `promise` 是一个包含了兼容promise规范then方法的对象或函数
- `thenable` 是一个包含了then方法的对象或函数
- `value` 是任何Javascript值。 (包括 undefined, thenable, promise等)
- `exception` 是由throw表达式抛出来的值
- `reason` 是一个用于描述Promise被拒绝原因的值

## 要求
#### Promise 状态
1. 一个Promise必须处在其中之一的状态：pending, fulfilled 或 rejected.<br>
pending 可转状态为 fulfilled 和 rejected，其余状态不可更改（代码中用的是 resolved ）

2. **then 方法**


> 内容来自：[Promise/A+ 规范](https://segmentfault.com/a/1190000002452115)

## 学习心得
#### Promise 最初的流程
1. 先处理 new Promise() 内部的同步任务，遇见异步会压入宏任务队列，然后执行后面的内容
> 注：此时如果 throw Error('reason') 就不能走 then 路线，而是 catch 路线
2. 看是否有 then 链，如果有则继续走 then 链的内容，由于 resolve 和 reject 都为异步队列，因此此时的状态都为 pending ，由 规则Promise[3.3]，构建一个新的 promise 函数将值压入待处理的队列中