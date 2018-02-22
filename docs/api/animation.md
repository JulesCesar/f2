# 动画

F2 默认提供了两种动画版本：

1. 入场动画
2. 精细动画，包含入场动画、更新动画以及销毁动画

当图表仅用于展示时，为了缩减代码体量，用户可以选择第一种动画，即仅包含入场动画。如果图表包含较多交互，可以选择第二种动画策略。

另外 F2 还提供了自定义动画机制，帮助用户定制更加生动、更具场景的动画。

默认我们提供的是精细动画，当然用户也可以使用按需引用策略，选择适合自己场景的动画：

## 如何按需引用

1. 入场动画版本

```js
const GroupAnimation = require('@antv/f2/lib/animation/group-animation');
Chart.plugins.register(GroupAnimation); // 这里进行全局注册，也可以给 chart 的实例注册
```

2. 精细动画版本

```js
const Animation = require('@antv/f2/lib/animation/animation');
Chart.plugins.register(Animation); // 这里进行全局注册，也可以给 chart 的实例注册
```

## 配置动画

### 动画场景类型：

在 F2 中，我们提供了四种动画场景类型：

- appear: 初始化时的入场动画；
- enter: 更新时的出现动画；
- update: 更新时的变化动画；
- leave: 更新时的动画；

### geom.animate()

默认我们为各个类型的 geom 设定了动画类型以及配置，用户也可以通过 geom.animate() 接口进行配置，使用如下：

```js
// 配置更新时的入场动画，其他动画场景类型相同
geom.animate({
  enter: {
    animation: 'fadeIn', // 动画名称
    easing: 'elasticIn', // 动画缓动效果
    delay: 0.1, // 动画延迟执行时间，单位 s
    duration: 0.6 // 动画执行时间， 单位 s
  }
});
```

- `animation` 动画名称

默认我们提供了如下几种动画：


// TODO


- `easing` 缓动函数

默认提供的缓动函数如下：

// TODO



### 自定义动画

如果上述动画动作不满足需求，用户也可以自己注册动画动作：

```js
const Animate = require('@antv/f2/lib/animation/animate');
/**
 * @param  {String} animationType      动画场景类型 appear enter leave update
 * @param  {String} 动画名称，用户自定义即可
 * @param  {Function} 动画执行函数
 **/
Animate.registerAnimation(animationType, animationName, animationFun);
```

### shape.animate()

我们为每个 shape 提供了 animate 接口，使用如下
```js
shape.animate().to({
  attrs: {Object}, // shape 最终的图形属性
  easing: {String}, // 缓动函数
  duration: {Number}, // 动画持续时间，单位为 s
  delay: {Number} // 动画延迟时间，单位为 s
}).onStart(function() {
  // 动画开始的回调函数
}).onUpdate(function() {
  // 动画进行时的回调函数
}).onEnd(function() {
  // 动画结束时的回调函数
});
```

