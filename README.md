> [Promise/A+ 规范](http://malcolmyu.github.io/malnote/2015/06/12/Promises-A-Plus/)

## 学习心得
#### Promise 运行流程
1. 先处理最初的 new Promise(...) 的传入函数（传入非函数则报错），先处理函数内的同步内容，之后将回调函数存入异步数组，压入任务队列。
> 注： 最初的那一步如果没有回调函数则不会处理之后的 then 链的异步方法，虽然会遍历完 then 链（原因是状态改变无法被触发，因此仅仅进行了存储回调函数的操作）。

2. 处理 then 链，由于 Promise 有三种状态（pending, resolved/fulfilled, rejected），因此根据状态不同执行不同操作（每次都返回一个新的 Promise 对象）：
- pending 状态：将回调函数存入对应的两种状态的数组内，以便回调函数触发的内容来触发相应操作（待 then 链遍历完后在依次处理对应的数组队列）。
- resolved 状态：获取前一个 Promise 的处理值（ result 结果），触发相应的 resolvedArr 数组
- rejected 状态：获取前一个 Promise 的处理值（ result 结果），触发相应的 rejectedArr 数组

3. 其他
在链首确定 then 链后面的运行状态（一开始 rejected 就走 rejected 链，否则走 resolved 链），中间状态基本就都确定了（除非在 resolved 链中抛出异常或者返回一个新的Promise改变其返回的状态，即在其返回 resolve 结果之前改变了状态，rejected 同理）

```JS
// 举个状态改变的测试例子
(function() {
    new Promise((resolve,reject) => {
        reject(1);
    })
    .then(res => {
        console.log('resolve1', res);
        return res;
    }, err => {
        console.log('err1', err);
        return Promise.resolve(2);
    })
    .then(res => {
        console.log('resolve2', res);
        return res;
    }, err => {
        console.log('err2',err);
        return err;
    })
    .catch(e => {
        console.log('catch', e)
    })
}());
```