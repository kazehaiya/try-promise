> [Promise/A+ 规范](http://malcolmyu.github.io/malnote/2015/06/12/Promises-A-Plus/)

## 学习心得
#### Promise 运行流程
1. 先处理最初的 new Promise(...) 的传入函数（传入非函数则报错），先处理函数内的同步内容，之后将回调函数存入异步的任务队列。

> **注：** 最初的那一步如果没有回调函数则不会处理之后的 then 链的异步方法，虽然会遍历完 then 链（原因是状态改变无法被触发，因此仅仅进行了存储回调函数的操作）。

2. 处理 then 链，由于 Promise 有三种状态（pending, resolved/fulfilled, rejected），因此根据状态不同执行不同操作（每次都返回一个新的 Promise 对象）：
- pending 状态：将回调函数存入对应的两种状态的数组内，以便回调函数触发的内容来触发相应操作（待 then 链遍历完后在依次处理对应的数组队列）。
- resolved 状态：获取前一个 Promise 的处理值（ result 结果），触发相应的 resolvedArr 数组
- rejected 状态：获取前一个 Promise 的处理值（ result 结果），触发相应的 rejectedArr 数组

> **注：** 在 _thenable 中，对于 then 传入的回调函数无返回值得情况，一律都以 resolved 状态来处理。

#### 其他
1. 在链首确定 then 链后面的运行状态（一开始 rejected 就走 rejected 链，否则走 resolved 链），then 链中对应位置的函数如果没有写则实现透传（resolved 链直接返回结果，rejected 链直接抛异常），无论哪一条链捕获到了回调函数会直接执行该回调函数，非特别处理，默认返回值都为 resolved 状态（rejected 链也不例外）。

2. catch 如果没有返回值（即 return xxx;），那么后面的 then 链的状态会为 resoved （结果值会改变，如果 catch 内没有返回值）

3. finnaly 无论有没有返回值，其都不会改变上一个 then 传过来的状态和结果值，同样，它也获取不到任何传入的值（即 finally 函数不需要参数，因为参数都是 undefined， 同样也不需要返回值）

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
    .then(res => {
        console.log('the currentStatus is resolved');
    })
}());
```