(function() {
  var add_wire, arctan2, clickWillDeleteWire, cmerge, cos, delete_wire, dragKnob, dragOrDeleteWire, drawKnob, drawKnobs, endpointsToColor, endpointsToPath, findNearest, hexd, knobAngle, knoboffset, knobs, localEvent, localx, localy, mod360, mouseDownAddWire, pickColor, redraw, releaseKnob, sin, wireColor, wirePath, wirebuffer, wires,
    __slice = [].slice;

  knobs = [[100, 252, 288, '#f0f0f0'], [100, 382, 0, '#f0f0f0'], [1700, 252, 292, '#202020'], [1700, 382, 0, '#202020']];

  wirebuffer = null;

  wires = [];

  knoboffset = null;

  this.setupCanvas = function() {
    wirebuffer = document.getElementById('wirebuffer');
    wirebuffer.width = 1800;
    wirebuffer.height = 2000;
    d3.select(wirebuffer).selectAll('.hole').data(holePositions()).enter().append('circle').classed('hole', true).attr('id', function(pos) {
      return pos.name;
    }).attr('cx', function(pos) {
      return pos.x / 2;
    }).attr('cy', function(pos) {
      return pos.y / 2;
    }).attr('r', 3).on('mousedown', mouseDownAddWire).append('title').text(function(pos) {
      return "Drag " + pos.name + " to another pin to create a wire.";
    });
    return redraw();
  };

  this.set_wires = function(wires_) {
    wires = wires_;
    redraw();
    return document.getElementById('loading').style.display = 'none';
  };

  add_wire = function(wire) {
    wires.push(wire);
    redraw();
    return wires_changed(wires);
  };

  delete_wire = function(wire) {
    var w;
    wires = (function() {
      var _i, _len, _results;
      _results = [];
      for (_i = 0, _len = wires.length; _i < _len; _i++) {
        w = wires[_i];
        if (w.join(' ') !== wire.join(' ')) {
          _results.push(w);
        }
      }
      return _results;
    })();
    redraw();
    return wires_changed(wires);
  };

  mouseDownAddWire = function() {
    var lastEndPin, startpin, view;
    startpin = xyToPinout.apply(null, localEvent(d3.event));
    if (!startpin) {
      return;
    }
    lastEndPin = null;
    view = d3.select(wirebuffer).append('path').classed('wire', true).classed('dragging', true).attr('stroke', 'red');
    window.onmousemove = function(e) {
      var endpin, endpoints;
      endpoints = [pinoutToXy(startpin), localEvent(e)];
      endpin = xyToPinout.apply(null, localEvent(e));
      if (endpin === startpin) {
        endpin = null;
      }
      if (lastEndPin !== endpin) {
        lastEndPin = endpin;
        d3.select(wirebuffer).select('.active.end').classed('active', false).classed('end', false);
        if (endpin) {
          d3.select(wirebuffer.getElementById(endpin)).classed('active', true).classed('end', true);
        }
      }
      return view.attr('d', endpointsToPath.apply(null, endpoints)).attr('stroke', endpointsToColor.apply(null, endpoints));
    };
    return window.onmouseup = function(e) {
      var endpin;
      window.onmousemove = null;
      window.onmouseup = null;
      view.remove();
      d3.select(wirebuffer).select('.active').classed('active', false).classed('end', false);
      endpin = xyToPinout.apply(null, localEvent(e));
      if (endpin && endpin !== startpin) {
        return add_wire([startpin, endpin]);
      }
    };
  };

  clickWillDeleteWire = function(wire) {
    var d1, d2, p1, p2, x, y, _ref;
    _ref = localEvent(d3.event), x = _ref[0], y = _ref[1];
    p1 = wire[0], p2 = wire[1];
    d1 = dist([x, y], pinoutToXy(p1));
    d2 = dist([x, y], pinoutToXy(p2));
    return Math.min(d1, d2) > 20 || 45 > dist(pinoutToXy(p1), pinoutToXy(p2));
  };

  dragOrDeleteWire = function(wire) {
    var d1, d2, lastEndPin, p1, p2, pinIndex, view, x, y, _ref;
    _ref = localEvent(d3.event), x = _ref[0], y = _ref[1];
    p1 = wire[0], p2 = wire[1];
    d1 = dist([x, y], pinoutToXy(p1));
    d2 = dist([x, y], pinoutToXy(p2));
    if (clickWillDeleteWire(wire)) {
      delete_wire(wire);
      return;
    }
    pinIndex = (d1 < d2 ? 0 : 1);
    view = d3.select(wirebuffer).selectAll('.wire').filter(function(d) {
      return d === wire;
    });
    view.classed('repinning', true);
    lastEndPin = null;
    window.onmousemove = function(e) {
      var endPin, endpoints;
      endpoints = [pinoutToXy(p1), pinoutToXy(p2)];
      endpoints[pinIndex] = localEvent(e);
      endPin = xyToPinout.apply(null, localEvent(e));
      if (lastEndPin !== endPin) {
        lastEndPin = endPin;
        d3.select(wirebuffer).select('.active').classed('active', false);
        if (endPin) {
          d3.select(wirebuffer.getElementById(endPin)).classed('active', true);
        }
      }
      view.attr('stroke', 'blue');
      return view.attr('d', endpointsToPath.apply(null, endpoints)).attr('stroke', endpointsToColor.apply(null, endpoints));
    };
    return window.onmouseup = function(e) {
      var endPin;
      view.classed('repinning', false);
      d3.select(wirebuffer).select('.active').classed('active', false);
      window.onmousemove = null;
      window.onmouseup = null;
      endPin = xyToPinout.apply(null, localEvent(e));
      if (endPin && wire[pinIndex] !== endPin) {
        wire[pinIndex] = endPin;
        redraw();
        return wires_changed(wires);
      } else {
        return redraw();
      }
    };
  };

  dragKnob = function(e) {
    var a, knob;
    knob = knobs[starty];
    a = knobAngle.apply(null, [knob].concat(__slice.call(localEvent(e))));
    if (!moved) {
      knoboffset = mod360(knob[2] - a);
    }
    knob[2] = mod360(a + knoboffset);
    redraw();
    return wires_changed(wires);
  };

  releaseKnob = function() {
    var knob;
    knob = knobs[starty];
    if (starty === 0) {
      knob[2] = findNearest(knob[2], [-72, -36, 0, 36, 72]);
    }
    if (starty === 2) {
      knob[2] = findNearest(knob[2], [-68, -23, 22, 67]);
    }
    redraw();
    return wires_changed(wires);
  };

  redraw = function() {
    var setWireClasses, wireTargets, wireViews;
    setWireClasses = function(w) {
      var flag;
      flag = clickWillDeleteWire(w);
      return d3.select(this).classed('delete', flag).select('title').text(flag ? 'Click to delete this wire.' : 'Hold the mouse to drag the wire to another contact.');
    };
    wireViews = d3.select(wirebuffer).selectAll('.wire').data(wires);
    wireViews.enter().append('path');
    wireViews.exit().remove();
    wireViews.classed('wire', true).attr('d', wirePath).attr('stroke', wireColor);
    wireTargets = d3.select(wirebuffer).selectAll('.wire-target').data(wires);
    wireTargets.enter().append('path').append('title');
    wireTargets.exit().remove();
    return wireTargets.classed('wire-mouse-target', true).attr('d', wirePath).on('mousedown', dragOrDeleteWire).on('mouseenter', setWireClasses).on('mousemove', setWireClasses).on('mouseeexit', function() {
      return d3.select(this).classed('delete', false);
    });
  };

  wirePath = function(_arg) {
    var p1, p2;
    p1 = _arg[0], p2 = _arg[1];
    return endpointsToPath(pinoutToXy(p1), pinoutToXy(p2));
  };

  endpointsToPath = function(_arg, _arg1) {
    var dx, dy, mx, my, x1, x2, y1, y2, _ref;
    x1 = _arg[0], y1 = _arg[1];
    x2 = _arg1[0], y2 = _arg1[1];
    x1 /= 2;
    y1 /= 2;
    x2 /= 2;
    y2 /= 2;
    mx = (x1 + x2) / 2;
    my = (y1 + y2) / 2;
    dx = (x2 - x1) / 5;
    dy = 0;
    dx += 5 * (dx < 0 ? -1 : 1);
    if (Math.abs(y1 - y2) < 10) {
      _ref = [0, 5], dx = _ref[0], dy = _ref[1];
    }
    return ['M', x1, y1, 'Q', x1 + dx, y1 + dy, mx, my, 'T', x2, y2].join(' ');
  };

  wireColor = function(_arg, n) {
    var p1, p2;
    p1 = _arg[0], p2 = _arg[1];
    return endpointsToColor(pinoutToXy(p1), pinoutToXy(p2));
  };

  endpointsToColor = function(_arg, _arg1, n) {
    var x1, x2, y1, y2;
    x1 = _arg[0], y1 = _arg[1];
    x2 = _arg1[0], y2 = _arg1[1];
    n || (n = wires.length);
    return cmerge(pickColor(x1, y1, x2, y2), n);
  };

  drawKnobs = function() {
    var k, _i, _len, _results;
    _results = [];
    for (_i = 0, _len = knobs.length; _i < _len; _i++) {
      k = knobs[_i];
      _results.push(drawKnob.apply(null, k));
    }
    return _results;
  };

  drawKnob = function(x, y, a, c) {
    ctx.fillStyle = c;
    ctx.beginPath();
    ctx.arc(x + 22 * sin(a), y - 22 * cos(a), 4, 0, Math.PI * 2, true);
    ctx.closePath();
    return ctx.fill();
  };

  knobAngle = function(knob, x, y) {
    return arctan2(x - knob[0], knob[1] - y);
  };

  cmerge = function(c, n) {
    var high, low, mid;
    high = hexd((n >> 8) & 15);
    mid = hexd((n >> 4) & 15);
    low = hexd(n & 15);
    return '#' + c[1] + high + c[3] + mid + c[5] + low;
  };

  pickColor = function(x1, y1, x2, y2) {
    var colors, dx, dy, i, len, _ref;
    dx = x2 - x1;
    dy = y2 - y1;
    len = Math.sqrt(dx * dx + dy * dy);
    i = Math.round(len / 100);
    colors = ['#804010', '#f00000', '#f0a000', '#f0f000', '#00f000', '#0000f0'];
    return (_ref = colors[i]) != null ? _ref : '#d02090';
  };

  findNearest = function(n, ls) {
    var d, diff, l, res, _i, _len;
    diff = Infinity;
    res = null;
    for (_i = 0, _len = ls.length; _i < _len; _i++) {
      l = ls[_i];
      d = Math.abs(n - l);
      if (d > diff) {
        continue;
      }
      diff = d;
      res = l;
    }
    return res;
  };

  mod360 = function(n) {
    n %= 360;
    if (n < 0) {
      n += 360;
    }
    if (n > 180) {
      n -= 360;
    }
    return n;
  };

  this.dist = function(a, b) {
    var dx, dy;
    dx = b[0] - a[0];
    dy = b[1] - a[1];
    return Math.sqrt(dx * dx + dy * dy);
  };

  cos = function(n) {
    return Math.cos(n * Math.PI / 180);
  };

  sin = function(n) {
    return Math.sin(n * Math.PI / 180);
  };

  arctan2 = function(x, y) {
    return Math.atan2(x, y) * 180 / Math.PI;
  };

  hexd = (function(hexdigits) {
    return function(n) {
      return hexdigits[n];
    };
  })('0123456789abcdef');

  localx = function(gx) {
    return (gx - wirebuffer.getBoundingClientRect().left) * 1800 / 900;
  };

  localy = function(gy) {
    return (gy - wirebuffer.getBoundingClientRect().top) * 2000 / 1000;
  };

  localEvent = function(e) {
    return [localx(e.clientX), localy(e.clientY)];
  };

}).call(this);
