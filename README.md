# xmlom - a tiny XML object model

## Usage

### `xmlom.parseString(str)`

Parse an XML String.

Returns a Promise which resolves to a Document.

```js
var xmlom = require('xmlom');
xmlom.parseString('<res><foo>bar</foo></res>').then(function (doc) {
  doc.find('foo').value; // "bar"
}).catch(function (error) {
  // parsing is hard
});
```

## Document

Top-level result of `parseString`.

### Document.root

The document-level Node of the XML Document

### Document.find(nodeName)

Locate all nodes with named `nodeName`

Returns an Array of all matching Nodes.

Is an alias of `Document.root.find`.

## Node

An element in the XML document.

### Node.name

The name of the Node. e.g. &lt;foo> would return "foo".

### Node.value

A concatenated string of all the direct CDATA children of this Node.

### Node.parent

This Node's parent Node. If this is the root Node, then `null`.

### Node.children

An Array of the Node's children.

### Node.attrs

An Object containing each of the Node's attributes as keys.

```js
// <foo bar="baz">
node.attrs.bar; // "baz"
```

### Node.find(nodeName)

Locate all child Nodes named `nodeName`

Returns an Array of all matching Nodes.

### Node.parents(nodeName)

Locate all Nodes in the Node's parent tree named `nodeName`.
