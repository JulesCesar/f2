const Util = require('../util/common');
const { Group } = require('../graphic/index');
const Marker = require('./marker');
const MARKER_RADIUS = 6;

class List {
  getDefaultCfg() {
    return {
      showTitle: false,
      /**
       * 标题文本
       * @type {?String}
       */
      title: null,
      // titleStyle: {},
      /**
       * 记录项的集合
       * @type {?Array}
       */
      items: null,
      /**
       * 标题距离记录项的间距
       * @type {Number}
       */
      titleGap: 12,
      /**
       * 各个记录项水平方向的间距
       * @type {Number}
       */
      itemGap: 20,
      /**
       * 各个记录项水平方向的间距
       * @type {Number}
       */
      itemMarginBottom: 24,
      /**
       * 记录项置灰的颜色
       * @type {String}
       */
      unCheckColor: '#bfbfbf',
      /**
       * 记录项文本格式化
       * @type {[type]}
       */
      itemFormatter: null,
      titleStyle: {},
      nameStyle: {
        fontSize: 14,
        fill: '#808080',
        textAlign: 'start',
        textBaseline: 'middle'
      },
      valueStyle: {
        fontSize: 14,
        fill: '#2E2E2E',
        textAlign: 'start',
        textBaseline: 'middle'
      },
      itemWidth: null,
      /**
       * marker 和文字的距离
       * @type {Number}
       */
      wordSpace: 12,
      /**
       * 是否自动换行，默认为 true
       * @type {Boolean}
       */
      autoWrap: true,
      /**
       * 在画布上的位置
       * @type {[type]}
       */
      x: 0,
      /**
       * 在画布上的位置
       * @type {[type]}
       */
      y: 0,
      layout: 'horizontal',
      /**
       * 容器内边距
       * @type {Array}
       */
      padding: [ 0, 0, 0, 0 ]
    };
  }

  constructor(cfg) {
    Util.deepMix(this, this.getDefaultCfg(), cfg);
    this._init();
    this._renderTitle();
    this._renderItems();
  }

  _init() {
    const container = new Group();
    this.container = container;
    const itemsGroup = container.addGroup({
      className: 'itemsGroup'
    });
    this.itemsGroup = itemsGroup;
  }

  _renderTitle() {
    const { showTitle, title } = this;

    if (showTitle && title) {
      const { container, titleStyle } = this;
      const titleShape = container.addShape('text', {
        className: 'title',
        attrs: Util.mix({
          x: 0,
          y: 0,
          text: title
        }, titleStyle)
      });
      this.titleShape = titleShape;
    }
  }

  _renderItems(items) {
    const self = this;
    items = items || self.items;

    if (!items) {
      return;
    }

    if (self.reversed) {
      items.reverse();
    }
    Util.each(items, (item, index) => {
      self._addItem(item, index);
    });
    this._adjustItems(items);
    this._renderBackground(); // 渲染背景
  }

  _renderBackground() {
    const background = this.background;
    if (background) {
      const container = this.container;
      const itemsGroup = this.itemsGroup;
      const { minX, minY, width, height } = itemsGroup.getBBox();
      let padding = background.padding || [ 0, 0, 0, 0 ];
      padding = Util.parsePadding(padding);
      const attrs = Util.mix({
        x: minX - padding[3],
        y: minY - padding[0],
        width: width + padding[1] + padding[3],
        height: height + padding[0] + padding[2]
      }, background);
      let backShape = this.backShape;
      if (backShape) {
        backShape.attr(attrs);
      } else {
        backShape = container.addShape('Rect', {
          zIndex: -1,
          attrs
        });
      }
      this.backShape = backShape;
      container.sort();
    }
  }

  _addItem(item) {
    const itemsGroup = this.itemsGroup;
    const itemGroup = itemsGroup.addGroup({
      name: item.name,
      value: item.value, // 显示的内容
      dataValue: item.dataValue, // 图例项对应原始数据中的数值
      checked: item.checked
    });
    const { unCheckColor, nameStyle, valueStyle, wordSpace } = this;
    const { marker, name, value } = item;
    let startX = 0;

    if (marker) { // 如果有 marker 添加 marker, 格式： { radius, symbol, fill / stroke}
      const radius = marker.radius || MARKER_RADIUS;
      const markerAttrs = Util.mix({
        x: radius,
        y: 0
      }, marker);

      if (item.checked === false) {
        if (markerAttrs.fill) {
          markerAttrs.fill = unCheckColor;
        }
        if (markerAttrs.stroke) {
          markerAttrs.stroke = unCheckColor;
        }
      }

      const markerShape = new Marker({
        className: 'item-marker',
        attrs: markerAttrs
      });
      itemGroup.add(markerShape);
      startX += markerShape.getBBox().width + wordSpace;
    }

    let nameText;
    if (name) {
      nameText = itemGroup.addShape('text', {
        className: 'name',
        attrs: Util.mix({
          x: startX,
          y: 0,
          text: name + ': '
        }, nameStyle, item.checked === false ? { fill: unCheckColor } : null)
      });
    }

    if (value) {
      let valueX = startX;
      if (nameText) {
        valueX += nameText.getBBox().width;
      }

      itemGroup.addShape('text', {
        className: 'value',
        attrs: Util.mix({
          x: valueX,
          y: 0,
          text: this._formatItemValue(value)
        }, valueStyle, item.checked === false ? { fill: unCheckColor } : null)
      });
    }
    return itemGroup;
  }

  _formatItemValue(value) {
    const formatter = this.itemFormatter;
    if (formatter) {
      value = formatter.call(this, value);
    }
    return value;
  }

  _getMaxItemWidth() {
    const itemsGroup = this.itemsGroup;
    const children = itemsGroup.get('children');
    let maxItemWidth = 0;
    const maxLength = this.maxLength;
    const itemGap = this.itemGap;
    const count = children.length;

    const itemWidth = this.itemWidth;
    if (itemWidth === 'auto') { // 按照默认规则自动计算
      const averageLength = (maxLength - (count - 1) * itemGap) / count;
      if (count <= 3) {
        maxItemWidth = averageLength;
      } else {
        maxItemWidth = (maxLength - itemGap) / 2;
      }
    } else if (Util.isNumber(itemWidth)) {
      maxItemWidth = itemWidth;
    } else {
      for (let i = 0; i < count; i++) {
        const bbox = children[i].getBBox();
        maxItemWidth = Math.max(maxItemWidth, bbox.width);
      }
    }
    this.maxItemWidth = maxItemWidth;
    return maxItemWidth;
  }

  _adjustHorizontal() {
    const { maxLength, itemsGroup } = this;

    const children = itemsGroup.get('children');
    const { itemGap, itemMarginBottom, titleShape } = this;
    let titleGap = 0;
    if (titleShape) {
      titleGap = titleShape.getBBox().height + this.titleGap;
    }

    let row = 0;
    let rowLength = 0;
    let width;
    let height;
    const itemWidth = this._getMaxItemWidth();
    const legendHitBoxes = [];
    for (let i = 0, len = children.length; i < len; i++) {
      const child = children[i];
      const box = child.getBBox();
      width = itemWidth || box.width;
      height = box.height + itemMarginBottom;

      if (width - (maxLength - rowLength) > 0.0001) {
        row++;
        rowLength = 0;
      }

      child.moveTo(rowLength, row * height + titleGap);
      legendHitBoxes.push({
        x: rowLength,
        y: row * height + titleGap - box.height / 2,
        width: box.width * 1.1,
        height: box.height * 1.1
      });
      rowLength += width + itemGap;
    }
    this.legendHitBoxes = legendHitBoxes;
    return;
  }

  _adjustVertical() {
    const { maxLength, itemsGroup } = this; // 垂直布局，则 maxLength 代表容器的高度
    const { titleShape, itemGap, itemMarginBottom, titleGap, itemWidth } = this;
    const titleHeight = titleShape ? (titleShape.getBBox().height + titleGap) : 0;
    const children = itemsGroup.get('children');

    let colLength = titleHeight;
    let width;
    let height;
    let maxItemWidth = 0;
    let totalLength = 0;
    const legendHitBoxes = [];

    for (let i = 0, length = children.length; i < length; i++) {
      const child = children[i];
      const bbox = child.getBBox();
      width = bbox.width;
      height = bbox.height;

      if (itemWidth) {
        maxItemWidth = itemWidth + itemGap;
      } else if (width > maxItemWidth) {
        maxItemWidth = width + itemGap;
      }

      if (maxLength - colLength < height) {
        colLength = titleHeight;
        totalLength += maxItemWidth;
        child.moveTo(totalLength, titleHeight);
        legendHitBoxes.push({
          x: totalLength,
          y: titleHeight - height / 2,
          width: width * 1.1,
          height: height * 1.1
        });
      } else {
        child.moveTo(totalLength, colLength);
        legendHitBoxes.push({
          x: totalLength,
          y: colLength - height / 2,
          width: width * 1.1,
          height: height * 1.1
        });
      }

      colLength += height + itemMarginBottom;
    }
    this.legendHitBoxes = legendHitBoxes;
    return;
  }

  _adjustItems(items) {
    if (this.autoWrap === false) {
      return;
    }
    const layout = this.layout;
    items = items || this.items;
    const count = items.length;

    if (count < 2) {
      return;
    }

    if (layout === 'horizontal') {
      this._adjustHorizontal();
    } else {
      this._adjustVertical();
    }
  }

  moveTo(x, y) {
    this.x = x;
    this.y = y;
    const container = this.container;
    container && container.moveTo(x, y);
    return this;
  }

  setItems(newItems) {
    if (this.items && newItems.length < this.items.length) { // 按照原先 items 的顺序补全 newItems
      const showItems = [];
      const items = this.items;
      let count = 0;
      items.map(item => {
        if (item.checked) {
          showItems.push(newItems[count]);
          count++;
        } else {
          showItems.push(item);
        }
        return item;
      });
      newItems = showItems;
    }
    this.clearItems();
    this._renderItems(newItems);
  }

  setTitle(title) {
    const titleShape = this.titleShape;
    if (titleShape) {
      titleShape.attr('text', title);
    }
  }

  clearItems() {
    const itemsGroup = this.itemsGroup;
    itemsGroup.clear();
  }

  getWidth() {
    const container = this.container;
    const bbox = container.getBBox();
    return bbox.width;
  }

  getHeight() {
    const container = this.container;
    const bbox = container.getBBox();
    return bbox.height;
  }

  show() {
    const container = this.container;
    container.show();
  }

  hide() {
    const container = this.container;
    container.hide();
  }

  clear() {
    const container = this.container;
    container.clear();
    container.remove(true);
  }
}

module.exports = List;
