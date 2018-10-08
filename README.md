> [Promise/A+ 规范](http://malcolmyu.github.io/malnote/2015/06/12/Promises-A-Plus/)

## 学习心得
#### Promise 最初的流程
1. 最初走完整个 promise 链，先处理同步内容（即 resolved 和 rejected 都不是函数的情况），直接执行该内容，遇见回调函数则存入数组（resolved 函数存入 resolveArr 数组，rejected 函数存入 rejectedArr 数组）
> 注：最初的函数如果没有调用 resolved/rejected 回调函数则 then 链的异步回调函数都会被忽略（因为没有触发存储状态的数组）;<br>
> then 链的函数由 promise 3.x 规范知默认返回 promise 类型的回调函数且可透传;

2. 待同步函数处理完成后，开始处理两条链的数组（如果最初有触发回调的话），由于触发的是异步的回调函数，根据该回调函数的内容来处理对应的 resolvedArr/rejectedArr 链，resolve 情况可继续向后部的链执行，rejected 情况则停止执行。

3. 待分析……