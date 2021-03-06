var sax = require('sax');

function Document(dom) {
  this.root = dom;
}

Document.prototype.find = function (name) {
  return this.root.find(name);
};


function Node(name) {
  this.name = name;
  this.attrs = {};
  this.children = [];
  this.parent = null;
}

Node.prototype.parents = function (name) {
  var cur = this.parent;
  var results = [];
  while (cur) {
    if (cur.name === name) {
      results.push(cur);
    }
    cur = cur.parent;
  }
  return results;
};

Node.prototype.find = function (name) {
  var results = [];

  function walk(node) {
    if (node.name === name) {
      results.push(node);
    }

    node.children.forEach(walk);
  }

  this.children.forEach(walk);

  return results;
};

exports.parseString = function parseString (str, options) {
  return new Promise(function (resolve, reject) {
    var parser = getParser(resolve, reject, options);
    parser.write(str).close();
  });
};

function getParser(callback, error, options) {
  options = options || {};

  var comment = '';

  var cur = new Node();
  cur.root = true;

  var parser = sax.parser(
    'strict' in options ? options.strict : true,
    options
  );

  parser.onerror = function (e) {
    error(e);
  };

  parser.oncomment = function (text) {
    comment += text;
  };

  parser.onopentag = function (obj) {
    var o = new Node(obj.name);
    if (comment) {
      o.comment = comment;
      comment = '';
    }
    o.attrs = {};
    if (obj.attributes) {
      for (var attr in obj.attributes) {
        var val = obj.attributes[attr];
        if (typeof val === 'object' && 'value' in val) {
          o.attrs[attr] = val.value;
        } else {
          o.attrs[attr] = val;
        }
      }
    }
    o.parent = cur;
    cur.children.push(o);
    cur = o;
  };

  parser.onclosetag = function () {
    cur = cur.parent;
    if (!cur.parent) {
      callback(new Document(cur));
    }
  };

  parser.oncdata = function(cdata) {
    cur.cdata = cdata;
  };

  parser.ontext = function (text) {
    if (!cur.value) {
      cur.value = '';
    }
    cur.value += text;
  };

  return parser;
}
