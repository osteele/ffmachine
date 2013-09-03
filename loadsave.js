(function() {
  var filename, getUrlVars, readonly, sync, wiresString;

  filename = null;

  readonly = null;

  sync = null;

  this.setup = function() {
    var urlvars;
    urlvars = getUrlVars();
    filename = urlvars['name'];
    readonly = urlvars['readonly'];
    sync = urlvars['sync'];
    this.setupCanvas();
    if (filename) {
      return loadWires(filename);
    }
  };

  this.wires_changed = function(wires) {
    if (readonly) {
      return;
    }
    return saveWires(name, wiresString(wires));
  };

  wiresString = function(wires) {
    var wire;
    return ((function() {
      var _i, _len, _results;
      _results = [];
      for (_i = 0, _len = wires.length; _i < _len; _i++) {
        wire = wires[_i];
        _results.push(wire.join(' '));
      }
      return _results;
    })()).join('\r\n');
  };

  getUrlVars = function() {
    var hash, k, q, v, vars, _i, _len, _ref, _ref1;
    vars = [];
    hash = null;
    _ref = window.location.search.slice(1).split(/&/);
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      q = _ref[_i];
      _ref1 = q.split('=', 2), k = _ref1[0], v = _ref1[1];
      vars.push(k);
      vars[k] = decodeURIComponent(v);
    }
    return vars;
  };

}).call(this);
