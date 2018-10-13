> [Promise/A+ 规范](http://malcolmyu.github.io/malnote/2015/06/12/Promises-A-Plus/)

## 学习心得
#### Promise 运行流程
1. 先处理最初的 new Promise(...) 的传入函数（传入非函数则报错），先处理函数内的同步内容，之后将回调函数存入异步数组，压入栈底。
> 注： 没有回调函数则不会处理之后的 then 链的异步方法，虽然会遍历完 then 链。

2. 处理 then 链，由于 Promise 有三种状态（pending, resolved/fulfilled, rejected），因此根据状态不同执行不同操作（每次都返回一个新的 Promise 对象）：
- pending 状态：将回调函数存入对应的两种状态的数组内，以便回调函数触发的内容来触发相应操作。
- resolved 状态：获取前一个 Promise 的处理值（ result 结果），触发相应的 resolvedArr 数组
- rejected 状态：获取前一个 Promise 的处理值（ result 结果），触发相应的 rejectedArr 数组
