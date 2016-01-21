# xmlom - a tiny XML object model

## Usage

### `xmlom.parseString(str)`

Parse an XML String.

Returns a Promise which resolves to a Document.

'''js
var xmlom = require('xmlom');
xmlom.parseString('<res><result>foo</result></res>').then(function (doc) {
    doc.find('result').value; // foo
}).catch(function (error) {
  // parsing is hard
});
'''

### Document
