const Util = require('../../util/common');
const Easing = require('./easing');
const { interpolate, interpolateArray } = require('d3-interpolate');

function plainArray(arr) {
  const result = [];
  for (let i = 0, len = arr.length; i < len; i++) {
    if (arr[i]) {
      result.push(arr[i].x);
      result.push(arr[i].y);
    }
  }
  return result;
}

class Animator {
  constructor(shape, target, timeline) {
    this.startTime = 0;
    this.endTime = 0;
    this.time = 0;
    this.propertyAnims = [];
    this.hasStarted = false;
    this.hasEnded = false;

    this.shape = shape;
    this.target = target;
    this.timeline = timeline;
    this.animGroups = [];
  }

  // delay, properties, duration, easing
  to(cfg = {}) {
    const defaultCfg = {
      delay: 0,
      attrs: {},
      duration: 1,
      easing: 'linear'
    };

    cfg = Util.mix(defaultCfg, cfg);
    const delay = cfg.delay;
    const properties = cfg.attrs;
    const duration = cfg.duration;
    const easing = Easing[cfg.easing];
    const animGroup = [];
    const nop = function() {};

    for (const propertyName in properties) {
      const animInfo = {
        hasStarted: false,
        timeline: this.timeline,
        shape: this.shape, // Shape 对象
        target: this.target,
        propertyName,
        endValue: properties[propertyName],
        delay,
        startTime: this.timeline.time + delay + this.endTime,
        endTime: this.timeline.time + delay + this.endTime + duration,
        easing,
        parent: this,
        onStart: nop,
        onEnd: nop
      };

      let diff;
      let startValue = this.target[propertyName];
      let endValue = properties[propertyName];
      if (propertyName === 'points') {
        startValue = plainArray(startValue);
        endValue = plainArray(endValue);
        diff = interpolateArray(startValue, endValue);
      } else if (propertyName === 'matrix') {
        diff = interpolateArray(startValue, endValue);
      } else {
        diff = interpolate(startValue, endValue);
      }
      animInfo.diff = diff;
      this.timeline.anims.push(animInfo);
      animGroup.push(animInfo);
    }
    this.animGroups.push(animGroup);
    this.endTime += delay + duration;
    return this;
  }

  onStart(callback) {
    const currentAnimGroup = this.animGroups[this.animGroups.length - 1];
    if (!currentAnimGroup) return;

    let called = false;

    currentAnimGroup.forEach(function(anim) {
      anim.onStart = function() {
        if (!called) {
          called = true;
          callback();
        }
      };
    });

    return this;
  }

  onUpdate(callback) {
    this.onUpdateCallback = function() {
      callback();
    };
    return this;
  }

  onEnd(callback) {
    const currentAnimGroup = this.animGroups[this.animGroups.length - 1];
    if (!currentAnimGroup) return;

    let called = false;

    currentAnimGroup.forEach(function(anim) {
      anim.onEnd = function() {
        if (!called) {
          called = true;
          callback();
        }
      };
    });

    return this;
  }
}

module.exports = Animator;
