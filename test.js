var test = require('tap').test;
var xml = require('./index');
var fs = require('fs');
var test01 = fs.readFileSync('./test/01.xml').toString();

test('string parse', function (t) {
  xml.parseString(test01).then(function (doc) {
    t.ok(doc, 'results object has Document');
    t.ok(doc.root, 'Document.root exists');
    t.end();
  }).catch(function (error) {
    t.bailout('parse error:', error);
  });
});

function loadTestDocument(t, cb) {
  var promise = xml.parseString(test01).then(function (results) {
    try {
      cb(results);
    } catch (e) {
      t.fail(e);
      t.end();
    }
  }).catch(function (error) {
    t.bailout('parse error:', error);
  });
}

test('Document.find', function (t) {
  loadTestDocument(t, function (doc) {
    t.equal(doc.find('node').length, 2, 'direct children search');
    t.equal(doc.find('details').length, 2, 'deep search');
    t.equal(doc.find('foobar').length, 0, 'bad search');
    t.end();
  });
});

test('Node properties', function (t) {
  loadTestDocument(t, function (doc) {
    var node = doc.find('node')[0];
    t.ok(node.attrs, 'attributes');
    t.equal(node.attrs.attribute, 'value', 'attribute value');

    t.equal(node.value.trim(), 'stuff', 'node content');

    t.ok(node.parent, 'parent');

    t.equal(node.comment.trim(), 'this is a comment', 'node comments');

    t.equal(node.children.length, 1, 'children');
    t.end();
  });
});

test('Node.find', function (t) {
  loadTestDocument(t, function (doc) {
    var nodes = doc.find('node');
    var node = nodes[0];
    t.equal(nodes.length, 2, 'doc.find');
    t.equal(node.find('details').length, 1, 'find details');
    t.equal(node.find('node').length, 0, 'find node');
    t.end();
  });
});

test('Node.parents', function (t) {
  loadTestDocument(t, function (doc) {
    var node = doc.find('details')[0];
    t.equal(node.parents('node').length, 1, 'direct parent');
    t.equal(node.parents('test').length, 1, 'deep parent');
    t.equal(node.parents('details').length, 0, 'look for self');

    t.equal(doc.root.parents('test').length, 0, 'root.parents');
    t.end();
  });
});

test('Nesting Errors', function (t) {
  xml.parseString('<root><foo><bar></foo></bar></root>').then(function () {
    t.fail('string should fail');
    t.end();
  }).catch(function (error) {
    t.ok(error);
    t.end();
  });
});

test('Attributes', function (t) {
  loadTestDocument(t, function (doc) {
    var node = doc.find('node')[0];
    t.equal('attribute' in node.attrs, true, 'attribute is key');
    t.equal(node.attrs.attribute, 'value', 'value is string');
    t.end();
  });
})
