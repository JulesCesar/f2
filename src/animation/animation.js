/**
 * 精细动画，包含入场、更新、出场
 * @author sima.zhang
 */
const Util = require('../util/common');
const Animate = require('./animate');
const ShapeAction = require('./shape-action');
const GroupAction = require('./group-action');
require('../graphic/animate/index');

Animate.Action = ShapeAction;
Animate.defaultCfg = {
  interval: {
    enter() {
      return ShapeAction.fadeIn;
    }
  },
  area: {
    enter(coord) {
      if (coord.isPolar) return null;
      return ShapeAction.fadeIn;
    }
  },
  line: {
    enter(coord) {
      if (coord.isPolar) return null;

      return ShapeAction.fadeIn;
    }
  },
  path: {
    enter(coord) {
      if (coord.isPolar) return null;

      return ShapeAction.fadeIn;
    }
  }
};

const GROUP_ANIMATION = {
  line(coord) {
    if (coord.isPolar) {
      return GroupAction.groupScaleInXY;
    }
    return GroupAction.groupWaveIn;
  },
  area(coord) {
    if (coord.isPolar) {
      return GroupAction.groupScaleInXY;
    }
    return GroupAction.groupWaveIn;
  },
  path(coord) {
    if (coord.isPolar) {
      return GroupAction.groupScaleInXY;
    }
    return GroupAction.groupWaveIn;
  },
  point(coord) {
    if (coord.isPolar) {
      return GroupAction.groupScaleInXY;
    }
    return GroupAction.groupWaveIn;
  },
  interval(coord) {
    let result;
    if (coord.isPolar) { // 极坐标
      result = GroupAction.groupScaleInXY; // 南丁格尔玫瑰图
      if (coord.transposed) { // 饼图
        result = GroupAction.groupWaveIn;
      }
    } else {
      result = coord.transposed ? GroupAction.groupScaleInX : GroupAction.groupScaleInY;
    }
    return result;
  },
  schema() {
    return GroupAction.groupWaveIn;
  }
};

const animateAttrs = {
  x: 'x',
  y: 'y',
  lineWidth: 'lineWidth',
  points: 'points',
  matrix: 'matrix',
  opacity: 'opacity',
  strokeOpacity: 'strokeOpacity',
  fillOpacity: 'fillOpacity',
  r: 'r',
  r0: 'r0',
  startAngle: 'startAngle',
  endAngle: 'endAngle',
  x1: 'x1',
  y1: 'y1',
  x2: 'x2',
  y2: 'y2',
  width: 'width',
  height: 'height'
};

function diff(fromAttrs, toAttrs) {
  const endState = {};
  for (const k in toAttrs) {
    if (animateAttrs[k]) {
      if (k === 'points' || k === 'matrix') {
        if (JSON.stringify(fromAttrs[k]) !== JSON.stringify(toAttrs[k])) {
          endState[k] = toAttrs[k];
        }
      } else if (fromAttrs[k] !== toAttrs[k]) {
        endState[k] = toAttrs[k];
      }
    }
  }
  return endState;
}

// 给每个 shape 加上唯一的 id 标识
function _getShapeId(geom, dataObj) {
  const type = geom.get('type');
  let id = 'geom-' + type;
  const xScale = geom.getXScale();
  const yScale = geom.getYScale();
  const xField = xScale.field || 'x';
  const yField = yScale.field || 'y';
  const yVal = dataObj[yField];
  let xVal;
  if (xScale.isIdentity) {
    xVal = xScale.value;
  } else {
    xVal = dataObj[xField];
  }

  if (type === 'interval' || type === 'schema') {
    id += '-' + xVal;
  } else if (type === 'line' || type === 'area' || type === 'path') {
    id += '-' + type;
  } else {
    id += '-' + xVal + '-' + yVal;
  }

  const groupScales = geom._getGroupScales();
  if (groupScales.length) {
    groupScales.map(groupScale => {
      const field = groupScale.field;
      if (groupScale.type !== 'identity') {
        id += '-' + dataObj[field];
      }
      return groupScale;
    });
  }

  return id;
}

// 获取图组内所有的shapes
function getShapes(geoms) {
  const shapes = [];

  geoms.map(geom => {
    const geomShapes = geom.get('shapes');
    const coord = geom.get('coord');
    const type = geom.get('type');
    const animateCfg = geom.get('animateCfg');
    geomShapes.map((shape, index) => {
      shape._id = _getShapeId(geom, shape.get('origin')._origin);
      shape.geomType = type;
      shape.set('coord', coord);
      shape.set('animateCfg', animateCfg);
      shape.set('index', index);
      shapes.push(shape);
      return shape;
    });
    return geom;
  });
  return shapes;
}

function cache(shapes) {
  const rst = {};
  for (let i = 0, len = shapes.length; i < len; i++) {
    const shape = shapes[i];
    if (!shape._id || shape.isClip) continue;
    const id = shape._id;
    rst[id] = {
      _id: id,
      type: shape.get('type'), // 图形形状
      attrs: Util.deepMix({}, shape._attrs.attrs), // 原始属性
      geomType: shape.geomType,
      index: shape.get('index'),
      coord: shape.get('coord')
    };
  }
  return rst;
}

function getAnimate(geomType, coord, animationType, animationName) {
  let result;
  if (animationName) {
    result = Animate.Action[animationName];
  } else {
    result = Animate.getAnimation(geomType, coord, animationType);
  }
  return result;
}

function getAnimateCfg(geomType, animationType, animateCfg) {
  const defaultCfg = Animate.getAnimateCfg(geomType, animationType);
  if (animateCfg && animateCfg[animationType]) {
    return Util.deepMix({}, defaultCfg, animateCfg[animationType]);
  }
  return defaultCfg;
}

function addAnimate(cache, shapes, canvas) {
  let animate;
  let animateCfg;

  // Step: leave -> update -> enter
  const updateShapes = []; // 存储的是 shapes
  const newShapes = []; // 存储的是 shapes
  shapes.map(shape => {
    const result = cache[shape._id];
    if (!result) {
      newShapes.push(shape);
    } else {
      shape.set('cacheShape', result);
      updateShapes.push(shape);
      delete cache[shape._id];
    }
    return shape;
  });

  // 销毁动画
  Util.each(cache, deletedShape => {
    const {
      geomType,
      coord,
      _id,
      attrs,
      index,
      type
    } = deletedShape;
    animateCfg = getAnimateCfg(geomType, 'leave', deletedShape.animateCfg);
    animate = getAnimate(geomType, coord, 'leave', animateCfg.animation);
    if (Util.isFunction(animate)) { // TODO
      const tempShape = canvas.addShape(type, {
        attrs,
        index,
        canvas
      });
      tempShape._id = _id;
      tempShape.name = name;
      animate(tempShape, animateCfg, coord);
    }
    return cache;
  });

  // 更新动画
  updateShapes.map(updateShape => {
    const geomType = updateShape.geomType;
    const coord = updateShape.get('coord');
    const cacheAttrs = updateShape.get('cacheShape').attrs;
    // 判断如果属性相同的话就不进行变换
    const endState = diff(cacheAttrs, updateShape._attrs.attrs);

    if (Object.keys(endState).length) { // TODO: 需要优化
      animateCfg = getAnimateCfg(geomType, 'update', updateShape.get('animateCfg'));
      animate = getAnimate(geomType, coord, 'update', animateCfg.animation);
      if (Util.isFunction(animate)) {
        animate(updateShape, animateCfg, coord);
      } else {
        // const endState = Util.deepMix({}, updateShape._attrs.attrs);
        updateShape.attr(cacheAttrs);
        updateShape.animate().to({
          attrs: endState,
          duration: animateCfg.duration,
          easing: animateCfg.easing,
          delay: animateCfg.delay
        }).onEnd(function() {
          updateShape.set('cacheShape', null);
        });
      }
    }
    return updateShape;
  });

  // 新进场 shape 动画
  Util.each(newShapes, newShape => {
    // 新图形元素的进场元素
    const geomType = newShape.geomType;
    const coord = newShape.get('coord');

    animateCfg = getAnimateCfg(geomType, 'enter', newShape.get('animateCfg'));
    animate = getAnimate(geomType, coord, 'enter', animateCfg.animation);
    if (Util.isFunction(animate)) {
      if (geomType === 'interval' && coord.isPolar && coord.transposed) {
        const index = (newShape.get('index'));
        const lastShape = updateShapes[index - 1];
        animate(newShape, animateCfg, lastShape);

      } else {
        animate(newShape, animateCfg, coord);

      }
    }
    return newShape;
  });
}

module.exports = {
  beforeCanvasDraw(chart) {
    let isUpdate = chart.get('isUpdate');
    const canvas = chart.get('canvas');
    const coord = chart.get('coord');
    const geoms = chart.get('geoms');
    const caches = canvas.get('caches') || [];
    if (caches.length === 0) {
      isUpdate = false;
    }

    const shapes = getShapes(geoms); // geom 上的图形

    const { frontPlot, backPlot } = chart.get('axisController');
    const axisShapes = [];
    frontPlot.get('children').map(frontShape => {
      frontShape.geomType = frontShape.get('className');
      frontShape.set('coord', coord);
      axisShapes.push(frontShape);
      return frontShape;
    });
    backPlot.get('children').map(backShape => {
      backShape.geomType = backShape.get('className');
      backShape.set('coord', coord);
      axisShapes.push(backShape);
      return backShape;
    });
    const cacheShapes = shapes.concat(axisShapes);
    canvas.set('caches', cache(cacheShapes));

    if (isUpdate) {
      addAnimate(caches, cacheShapes, canvas);
    } else { // 初次入场动画
      let animateCfg;
      let animate;
      geoms.map(geom => {
        const type = geom.get('type');
        animateCfg = getAnimateCfg(type, 'appear', geom.get('animateCfg'));
        animate = getAnimate(type, coord, 'appear', animateCfg.animation);
        if (Util.isFunction(animate)) { // 用户指定了动画类型
          const shapes = geom.get('shapes');
          shapes.map(shape => {
            animate(shape, animateCfg, coord);
            return shape;
          });
        } else if (GROUP_ANIMATION[type]) { // 默认进行整体动画
          animate = GroupAction[animateCfg.animation] || GROUP_ANIMATION[type](coord);

          const yScale = geom.getYScale();
          const zeroY = coord.convertPoint({
            x: 0,
            y: yScale.scale(geom.getYMinValue())
          });

          const container = geom.get('container');
          animate && animate(container, animateCfg, coord, zeroY);
        }
        return geom;
      });
    }
  }
};
