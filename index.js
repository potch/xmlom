var xml = require('node-xml');


function Document(dom) {
  this.doc = {root: dom};
}

Document.prototype.find = function (name) {
  var results = [];

  function walk(node) {
    if (node.name === name) {
      results.push(node);
    }

    node.children.forEach(walk);
  }

  walk(this.doc.root);

  return results;
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


exports.parseFile = function parseFile (path) {
  return new Promise(function (resolve, reject) {
    var parser = getParser(resolve);
    parser.parseFile(path);
  });
};

exports.parseString = function parseString (str) {
  return new Promise(function (resolve, reject) {
    var parser = getParser(resolve);
    parser.parseString(str);
  });
};

function getParser(callback) {
  var dom = {};
  var cur;

  return new xml.SaxParser(function(cb) {
    cb.onStartDocument(function() {
      cur = new Node();
      cur.root = true;
    });
    cb.onEndDocument(function() {
      callback(new Document(cur));
    });
    cb.onStartElementNS(function(elem, attrs, prefix, uri, namespaces) {
      var o = new Node(elem);
      attrs.forEach(function (a) {
        o.attrs[a[0]] = a[1];
      });
      o.parent = cur;
      cur.children.push(o);
      cur = o;
    });
    cb.onEndElementNS(function(elem) {
      cur = cur.parent;
    });
    cb.onCharacters(function(chars) {
      var s = chars.trim();
      if (s.length) {
        cur.value = s;
      }
    });
    cb.onCdata(function(cdata) {
    });
    cb.onComment(function(msg) {
    });
    cb.onWarning(function(msg) {
    });
    cb.onError(function(msg) {
      console.log('<ERROR>'+JSON.stringify(msg)+"</ERROR>");
    });
  });
}
