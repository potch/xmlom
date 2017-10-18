(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
'use strict';

window.xmlom = require('./index');

},{"./index":2}],2:[function(require,module,exports){
'use strict';

var xml = require('node-xml');

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

exports.parseString = function parseString (str) {
  return new Promise(function (resolve, reject) {
    var parser = getParser(resolve, reject);
    parser.parseString(str);
  });
};

function getParser(callback, error) {
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
      if (!cur.value) {
        cur.value = '';
      }
      cur.value += chars;
    });
    cb.onCdata(function(cdata) {
      cur.cdata = cdata;
    });
    cb.onComment(function(msg) {
    });
    cb.onWarning(function(msg) {
    });
    cb.onError(function(msg) {
      error(JSON.stringify(msg));
    });
  });
}

},{"node-xml":4}],3:[function(require,module,exports){

},{}],4:[function(require,module,exports){
// node-xml
// An xml parser for node.js
// (C) Rob Righter (@robrighter) 2009 - 2010, Licensed under the MIT-LICENSE
// Contributions from David Joham


(function () {

// CONSTANTS
var whitespace = "\n\r\t ";


//XMLP is a pull-based parser. The calling application passes in a XML string
//to the constructor, then repeatedly calls .next() to parse the next segment.
//.next() returns a flag indicating what type of segment was found, and stores
//data temporarily in couple member variables (name, content, array of
//attributes), which can be accessed by several .get____() methods.
//
//Basically, XMLP is the lowest common denominator parser - an very simple
//API which other wrappers can be built against.


var XMLP = function(strXML) {
    // Normalize line breaks
    strXML = SAXStrings.replace(strXML, null, null, "\r\n", "\n");
    strXML = SAXStrings.replace(strXML, null, null, "\r", "\n");

    this.m_xml = strXML;
    this.m_iP = 0;
    this.m_iState = XMLP._STATE_PROLOG;
    this.m_stack = new Stack();
    this._clearAttributes();
    this.m_pause = false;
    this.m_preInterruptIState = XMLP._STATE_PROLOG;
    this.m_namespaceList = new Array();
    this.m_chunkTransitionContinuation = null;

}


// CONSTANTS    (these must be below the constructor)
XMLP._NONE    = 0;
XMLP._ELM_B   = 1;
XMLP._ELM_E   = 2;
XMLP._ELM_EMP = 3;
XMLP._ATT     = 4;
XMLP._TEXT    = 5;
XMLP._ENTITY  = 6;
XMLP._PI      = 7;
XMLP._CDATA   = 8;
XMLP._COMMENT = 9;
XMLP._DTD     = 10;
XMLP._ERROR   = 11;
XMLP._INTERRUPT = 12;

XMLP._CONT_XML = 0;
XMLP._CONT_ALT = 1;

XMLP._ATT_NAME = 0;
XMLP._ATT_VAL  = 1;

XMLP._STATE_PROLOG = 1;
XMLP._STATE_DOCUMENT = 2;
XMLP._STATE_MISC = 3;

XMLP._errs = new Array();
XMLP._errs[XMLP.ERR_CLOSE_PI       = 0 ] = "PI: missing closing sequence";
XMLP._errs[XMLP.ERR_CLOSE_DTD      = 1 ] = "DTD: missing closing sequence";
XMLP._errs[XMLP.ERR_CLOSE_COMMENT  = 2 ] = "Comment: missing closing sequence";
XMLP._errs[XMLP.ERR_CLOSE_CDATA    = 3 ] = "CDATA: missing closing sequence";
XMLP._errs[XMLP.ERR_CLOSE_ELM      = 4 ] = "Element: missing closing sequence";
XMLP._errs[XMLP.ERR_CLOSE_ENTITY   = 5 ] = "Entity: missing closing sequence";
XMLP._errs[XMLP.ERR_PI_TARGET      = 6 ] = "PI: target is required";
XMLP._errs[XMLP.ERR_ELM_EMPTY      = 7 ] = "Element: cannot be both empty and closing";
XMLP._errs[XMLP.ERR_ELM_NAME       = 8 ] = "Element: name must immediatly follow \"<\"";
XMLP._errs[XMLP.ERR_ELM_LT_NAME    = 9 ] = "Element: \"<\" not allowed in element names";
XMLP._errs[XMLP.ERR_ATT_VALUES     = 10] = "Attribute: values are required and must be in quotes";
XMLP._errs[XMLP.ERR_ATT_LT_NAME    = 11] = "Element: \"<\" not allowed in attribute names";
XMLP._errs[XMLP.ERR_ATT_LT_VALUE   = 12] = "Attribute: \"<\" not allowed in attribute values";
XMLP._errs[XMLP.ERR_ATT_DUP        = 13] = "Attribute: duplicate attributes not allowed";
XMLP._errs[XMLP.ERR_ENTITY_UNKNOWN = 14] = "Entity: unknown entity";
XMLP._errs[XMLP.ERR_INFINITELOOP   = 15] = "Infininte loop";
XMLP._errs[XMLP.ERR_DOC_STRUCTURE  = 16] = "Document: only comments, processing instructions, or whitespace allowed outside of document element";
XMLP._errs[XMLP.ERR_ELM_NESTING    = 17] = "Element: must be nested correctly";



XMLP.prototype.continueParsing = function(strXML) {

    if(this.m_chunkTransitionContinuation){
        strXML = this.m_chunkTransitionContinuation + strXML;
    }
    // Normalize line breaks
    strXML = SAXStrings.replace(strXML, null, null, "\r\n", "\n");
    strXML = SAXStrings.replace(strXML, null, null, "\r", "\n");

    this.m_xml = strXML;
    this.m_iP = 0;
    this.m_iState = XMLP._STATE_DOCUMENT;
    //this.m_stack = new Stack();
    //this._clearAttributes();
    this.m_pause = false;
    this.m_preInterruptIState = XMLP._STATE_PROLOG;
    this.m_chunkTransitionContinuation = null;

}

XMLP.prototype._addAttribute = function(name, value) {
    this.m_atts[this.m_atts.length] = new Array(name, value);
}

XMLP.prototype._checkStructure = function(iEvent) {
	if(XMLP._STATE_PROLOG == this.m_iState) {
		if((XMLP._TEXT == iEvent) || (XMLP._ENTITY == iEvent)) {
            if(SAXStrings.indexOfNonWhitespace(this.getContent(), this.getContentBegin(), this.getContentEnd()) != -1) {
				return this._setErr(XMLP.ERR_DOC_STRUCTURE);
            }
        }

        if((XMLP._ELM_B == iEvent) || (XMLP._ELM_EMP == iEvent)) {
            this.m_iState = XMLP._STATE_DOCUMENT;
            // Don't return - fall through to next state
        }
    }
    if(XMLP._STATE_DOCUMENT == this.m_iState) {
        if((XMLP._ELM_B == iEvent) || (XMLP._ELM_EMP == iEvent)) {
            this.m_stack.push(this.getName());
        }

        if((XMLP._ELM_E == iEvent) || (XMLP._ELM_EMP == iEvent)) {
            var strTop = this.m_stack.pop();
            if((strTop == null) || (strTop != this.getName())) {
                return this._setErr(XMLP.ERR_ELM_NESTING);
            }
        }

        if(this.m_stack.count() == 0) {
            this.m_iState = XMLP._STATE_MISC;
            return iEvent;
        }
    }
    if(XMLP._STATE_MISC == this.m_iState) {
		if((XMLP._ELM_B == iEvent) || (XMLP._ELM_E == iEvent) || (XMLP._ELM_EMP == iEvent) || (XMLP.EVT_DTD == iEvent)) {
			return this._setErr(XMLP.ERR_DOC_STRUCTURE);
        }

        if((XMLP._TEXT == iEvent) || (XMLP._ENTITY == iEvent)) {
			if(SAXStrings.indexOfNonWhitespace(this.getContent(), this.getContentBegin(), this.getContentEnd()) != -1) {
				return this._setErr(XMLP.ERR_DOC_STRUCTURE);
            }
        }
    }

    return iEvent;

}

XMLP.prototype._clearAttributes = function() {
    this.m_atts = new Array();
}

XMLP.prototype._findAttributeIndex = function(name) {
    for(var i = 0; i < this.m_atts.length; i++) {
        if(this.m_atts[i][XMLP._ATT_NAME] == name) {
            return i;
        }
    }
    return -1;

}

XMLP.prototype.getAttributeCount = function() {
    return this.m_atts ? this.m_atts.length : 0;
}

XMLP.prototype.getAttributeName = function(index) {
    return ((index < 0) || (index >= this.m_atts.length)) ? null : this.m_atts[index][XMLP._ATT_NAME];
}

XMLP.prototype.getAttributeValue = function(index) {
    return ((index < 0) || (index >= this.m_atts.length)) ? null : __unescapeString(this.m_atts[index][XMLP._ATT_VAL]);
}

XMLP.prototype.getAttributeValueByName = function(name) {
    return this.getAttributeValue(this._findAttributeIndex(name));
}

XMLP.prototype.getColumnNumber = function() {
    return SAXStrings.getColumnNumber(this.m_xml, this.m_iP);
}

XMLP.prototype.getContent = function() {
    return (this.m_cSrc == XMLP._CONT_XML) ? this.m_xml : this.m_cAlt;
}

XMLP.prototype.getContentBegin = function() {
    return this.m_cB;
}

XMLP.prototype.getContentEnd = function() {
    return this.m_cE;
}

XMLP.prototype.getLineNumber = function() {
    return SAXStrings.getLineNumber(this.m_xml, this.m_iP);
}

XMLP.prototype.getName = function() {
    return this.m_name;
}

XMLP.prototype.pause = function(){
    this.m_pause = true;
}

XMLP.prototype.resume = function(){
    this.m_pause = false;
    this.m_iState = this.m_preInterruptIState;
}

XMLP.prototype.next = function() {
    if(!this.m_pause){
        return this._checkStructure(this._parse());
    }
    else{
        //save off the current event loop state and set the state to interrupt
        this.m_preInterruptIState = this.m_iState;
        return XMLP._INTERRUPT;
    }
}

XMLP.prototype._parse = function() {
    if(this.m_iP == this.m_xml.length) {
        return XMLP._NONE;
    }

    function _indexOf(needle, haystack, start) {
        // This is an improvement over the native indexOf because it stops at the
        // end of the needle and doesn't continue to the end of the haystack looking.
        for(var i = 0; i < needle.length; i++) {
            if(needle.charAt(i) != haystack.charAt(start + i))
                return -1;
        }
        return start;
    }

    var fc = this.m_xml.charAt(this.m_iP);
    if (fc !== '<' && fc !== '&') {
        return this._parseText   (this.m_iP);
    }
    else if(this.m_iP == _indexOf("<?", this.m_xml, this.m_iP)) {
        return this._parsePI     (this.m_iP + 2);
    }
    else if(this.m_iP == _indexOf("<!DOCTYPE", this.m_xml, this.m_iP)) {
        return this._parseDTD    (this.m_iP + 9);
    }
    else if(this.m_iP == _indexOf("<!--", this.m_xml, this.m_iP)) {
        return this._parseComment(this.m_iP + 4);
    }
    else if(this.m_iP == _indexOf("<![CDATA[", this.m_xml, this.m_iP)) {
        return this._parseCDATA  (this.m_iP + 9);
    }
    else if(this.m_iP == _indexOf("<", this.m_xml, this.m_iP)) {
        return this._parseElement(this.m_iP + 1);
    }
    else if(this.m_iP == _indexOf("&", this.m_xml, this.m_iP)) {
        return this._parseEntity (this.m_iP + 1);
    }
    else{
        return this._parseText   (this.m_iP);
    }
}

////////// NAMESPACE SUPPORT //////////////////////////////////////////
XMLP.prototype._parsePrefixAndElementName = function (elementlabel){
    splits = elementlabel.split(':',2);
    return { prefix : ((splits.length === 1) ? '' : splits[0]), name : ((splits.length === 1) ? elementlabel : splits[1]), };
}

XMLP.prototype._parseNamespacesAndAtts = function (atts){
   //translate namespaces into objects with "prefix","uri", "scopetag" Add them to: this.m_namespaceList
   //The function should return a new list of tag attributes with the namespaces filtered
    that = this;
    var newnamespaces = [];
    var filteredatts = [];
    atts.map(function (item){
        if(item[0].slice(0,5) === "xmlns"){
            newnamespaces.push({
                                   prefix : item[0].slice(6),
                                   uri : item[1],
                                   scopetag : that.m_name,
                                });
        }
        else{
            filteredatts.push(item);
        }
        return "not used";
    });
    this.m_namespaceList = this.m_namespaceList.concat(newnamespaces);
    return [ filteredatts, newnamespaces.map(function(item){return [item.prefix,item.uri];}) ];
}

XMLP.prototype._getContextualNamespace = function (prefix){
    if(prefix !== ''){
        for(item in this.m_namespaceList){
            item = this.m_namespaceList[item];
            if(item.prefix === prefix){
                return item.uri;
            }
        }
    }

    //no match was found for the prefix so pop off the first non-prefix namespace
    for(var i = (this.m_namespaceList.length-1); i>= 0; i--){
        var item = this.m_namespaceList[i];
        if(item.prefix === ''){
            return item.uri;
        }
    }

    //still nothing, lets just return an empty string
    return '';
}

XMLP.prototype._removeExpiredNamesapces = function (closingtagname) {
    //remove the expiring namespaces from the list (you can id them by scopetag)
    var keeps = [];
    this.m_namespaceList.map(function (item){
        if(item.scopetag !== closingtagname){
            keeps.push(item);
        }
    });

    this.m_namespaceList = keeps;

}

////////////////////////////////////////////////////////////////////////


XMLP.prototype._parseAttribute = function(iB, iE) {
    var iNB, iNE, iEq, iVB, iVE;
    var cQuote, strN, strV;

	this.m_cAlt = ""; //resets the value so we don't use an old one by accident (see testAttribute7 in the test suite)

	iNB = SAXStrings.indexOfNonWhitespace(this.m_xml, iB, iE);
    if((iNB == -1) ||(iNB >= iE)) {
        return iNB;
    }

    iEq = this.m_xml.indexOf("=", iNB);
    if((iEq == -1) || (iEq > iE)) {
        return this._setErr(XMLP.ERR_ATT_VALUES);
    }

    iNE = SAXStrings.lastIndexOfNonWhitespace(this.m_xml, iNB, iEq);

    iVB = SAXStrings.indexOfNonWhitespace(this.m_xml, iEq + 1, iE);
    if((iVB == -1) ||(iVB > iE)) {
        return this._setErr(XMLP.ERR_ATT_VALUES);
    }

    cQuote = this.m_xml.charAt(iVB);
    if(SAXStrings.QUOTES.indexOf(cQuote) == -1) {
        return this._setErr(XMLP.ERR_ATT_VALUES);
    }

    iVE = this.m_xml.indexOf(cQuote, iVB + 1);
    if((iVE == -1) ||(iVE > iE)) {
        return this._setErr(XMLP.ERR_ATT_VALUES);
    }

    strN = this.m_xml.substring(iNB, iNE + 1);
    strV = this.m_xml.substring(iVB + 1, iVE);

    if(strN.indexOf("<") != -1) {
        return this._setErr(XMLP.ERR_ATT_LT_NAME);
    }

    if(strV.indexOf("<") != -1) {
        return this._setErr(XMLP.ERR_ATT_LT_VALUE);
    }

    strV = SAXStrings.replace(strV, null, null, "\n", " ");
    strV = SAXStrings.replace(strV, null, null, "\t", " ");
	iRet = this._replaceEntities(strV);
    if(iRet == XMLP._ERROR) {
        return iRet;
    }

    strV = this.m_cAlt;

    if(this._findAttributeIndex(strN) == -1) {
        this._addAttribute(strN, strV);
    }
    else {
        return this._setErr(XMLP.ERR_ATT_DUP);
    }

    this.m_iP = iVE + 2;

    return XMLP._ATT;

}

XMLP.prototype._parseCDATA = function(iB) {
    var iE = this.m_xml.indexOf("]]>", iB);
    if (iE == -1) {
        //This item never closes, although it could be a malformed document, we will assume that we are mid-chunck, save the string and reurn as interrupted
        this.m_chunkTransitionContinuation = this.m_xml.slice(iB-9);//the '-<![CDATA[ adds the '<!DOCTYPE' back into the string
        return XMLP._INTERRUPT;
        //return this._setErr(XMLP.ERR_CLOSE_CDATA);
    }

    this._setContent(XMLP._CONT_XML, iB, iE);

    this.m_iP = iE + 3;

    return XMLP._CDATA;

}

XMLP.prototype._parseComment = function(iB) {
    var iE = this.m_xml.indexOf("-" + "->", iB);
    if (iE == -1) {
        //This item never closes, although it could be a malformed document, we will assume that we are mid-chunck, save the string and reurn as interrupted
        this.m_chunkTransitionContinuation = this.m_xml.slice(iB-4);//the '-4' adds the '<!--' back into the string
        return XMLP._INTERRUPT;
        //return this._setErr(XMLP.ERR_CLOSE_COMMENT);
    }

    this._setContent(XMLP._CONT_XML, iB, iE);

    this.m_iP = iE + 3;

    return XMLP._COMMENT;

}

XMLP.prototype._parseDTD = function(iB) {
    // Eat DTD
    var iE, strClose, iInt, iLast;

    iE = this.m_xml.indexOf(">", iB);
    if(iE == -1) {
        //This item never closes, although it could be a malformed document, we will assume that we are mid-chunck, save the string and reurn as interrupted
        this.m_chunkTransitionContinuation = this.m_xml.slice(iB-9);//the '-9' adds the '<!DOCTYPE' back into the string
        return XMLP._INTERRUPT;
        //return this._setErr(XMLP.ERR_CLOSE_DTD);
    }

    iInt = this.m_xml.indexOf("[", iB);
    strClose = ((iInt != -1) && (iInt < iE)) ? "]>" : ">";

    while(true) {
        // DEBUG: Remove
        if(iE == iLast) {
            return this._setErr(XMLP.ERR_INFINITELOOP);
        }

        iLast = iE;
        // DEBUG: Remove End

        iE = this.m_xml.indexOf(strClose, iB);
        if(iE == -1) {
            return this._setErr(XMLP.ERR_CLOSE_DTD);
        }

        // Make sure it is not the end of a CDATA section
        if (this.m_xml.substring(iE - 1, iE + 2) != "]]>") {
            break;
        }
    }

    this.m_iP = iE + strClose.length;

    return XMLP._DTD;

}

XMLP.prototype._parseElement = function(iB) {
    util = require('util');
    var iE, iDE, iNE, iRet;
    var iType, strN, iLast;

    iDE = iE = this.m_xml.indexOf(">", iB);
    if(iE == -1) {
        //This element never closes, although it could be a malformed document, we will assume that we are mid-chunck, save the string and reurn as interrupted
        this.m_chunkTransitionContinuation = this.m_xml.slice(iB-1);//the '-1' adds the '<' back into the string
        return XMLP._INTERRUPT;
        //return this._setErr(XMLP.ERR_CLOSE_ELM);
    }

    if(this.m_xml.charAt(iB) == "/") {
        iType = XMLP._ELM_E;
        iB++;
    } else {
        iType = XMLP._ELM_B;
    }

    if(this.m_xml.charAt(iE - 1) == "/") {
        if(iType == XMLP._ELM_E) {
            return this._setErr(XMLP.ERR_ELM_EMPTY);
        }
        iType = XMLP._ELM_EMP;
        iDE--;
    }

    iDE = SAXStrings.lastIndexOfNonWhitespace(this.m_xml, iB, iDE);

    //djohack
    //hack to allow for elements with single character names to be recognized

    if (iE - iB != 1 ) {
        if(SAXStrings.indexOfNonWhitespace(this.m_xml, iB, iDE) != iB) {
            return this._setErr(XMLP.ERR_ELM_NAME);
        }
    }
    // end hack -- original code below

    /*
    if(SAXStrings.indexOfNonWhitespace(this.m_xml, iB, iDE) != iB)
        return this._setErr(XMLP.ERR_ELM_NAME);
    */
    this._clearAttributes();

    iNE = SAXStrings.indexOfWhitespace(this.m_xml, iB, iDE);
    if(iNE == -1) {
        iNE = iDE + 1;
    }
    else {
        this.m_iP = iNE;
        while(this.m_iP < iDE) {
            // DEBUG: Remove
            if(this.m_iP == iLast) return this._setErr(XMLP.ERR_INFINITELOOP);
            iLast = this.m_iP;
            // DEBUG: Remove End


            iRet = this._parseAttribute(this.m_iP, iDE);
            if(iRet == XMLP._ERROR) return iRet;
        }
    }

    strN = this.m_xml.substring(iB, iNE);

    if(strN.indexOf("<") != -1) {
        return this._setErr(XMLP.ERR_ELM_LT_NAME);
    }

    this.m_name = strN;
    this.m_iP = iE + 1;

    return iType;

}

XMLP.prototype._parseEntity = function(iB) {
    var iE = this.m_xml.indexOf(";", iB);
    if(iE == -1) {
        //This item never closes, although it could be a malformed document, we will assume that we are mid-chunck, save the string and reurn as interrupted
        this.m_chunkTransitionContinuation = this.m_xml.slice(iB-1);//the '-1' adds the '&' back into the string
        return XMLP._INTERRUPT;
        //return this._setErr(XMLP.ERR_CLOSE_ENTITY);
    }

    this.m_iP = iE + 1;

    return this._replaceEntity(this.m_xml, iB, iE);

}

XMLP.prototype._parsePI = function(iB) {
    var iE, iTB, iTE, iCB, iCE;

    iE = this.m_xml.indexOf("?>", iB);
    if(iE   == -1) {
        //This item never closes, although it could be a malformed document, we will assume that we are mid-chunck, save the string and reurn as interrupted
        this.m_chunkTransitionContinuation = this.m_xml.slice(iB-2);//the '-2' adds the '?>' back into the string
        return XMLP._INTERRUPT;
        return this._setErr(XMLP.ERR_CLOSE_PI);
    }

    iTB = SAXStrings.indexOfNonWhitespace(this.m_xml, iB, iE);
    if(iTB == -1) {
        return this._setErr(XMLP.ERR_PI_TARGET);
    }

    iTE = SAXStrings.indexOfWhitespace(this.m_xml, iTB, iE);
    if(iTE  == -1) {
        iTE = iE;
    }

    iCB = SAXStrings.indexOfNonWhitespace(this.m_xml, iTE, iE);
    if(iCB == -1) {
        iCB = iE;
    }

    iCE = SAXStrings.lastIndexOfNonWhitespace(this.m_xml, iCB, iE);
    if(iCE  == -1) {
        iCE = iE - 1;
    }

    this.m_name = this.m_xml.substring(iTB, iTE);
    this._setContent(XMLP._CONT_XML, iCB, iCE + 1);
    this.m_iP = iE + 2;

    return XMLP._PI;

}

XMLP.prototype._parseText = function(iB) {
    var iE, ch;

    for (iE=iB; iE<this.m_xml.length; ++iE) {
        ch = this.m_xml.charAt(iE);
        if (ch === '<' || ch === '&') {
            break;
        }
    }
    
    this._setContent(XMLP._CONT_XML, iB, iE);

    this.m_iP = iE;

    return XMLP._TEXT;

}

XMLP.prototype._replaceEntities = function(strD, iB, iE) {
    if(SAXStrings.isEmpty(strD)) return "";
    iB = iB || 0;
    iE = iE || strD.length;


    var iEB, iEE, strRet = "";

    iEB = strD.indexOf("&", iB);
    iEE = iB;

    while((iEB > 0) && (iEB < iE)) {
        strRet += strD.substring(iEE, iEB);

        iEE = strD.indexOf(";", iEB) + 1;

        if((iEE == 0) || (iEE > iE)) {
            return this._setErr(XMLP.ERR_CLOSE_ENTITY);
        }

        iRet = this._replaceEntity(strD, iEB + 1, iEE - 1);
        if(iRet == XMLP._ERROR) {
            return iRet;
        }

        strRet += this.m_cAlt;

        iEB = strD.indexOf("&", iEE);
    }

    if(iEE != iE) {
        strRet += strD.substring(iEE, iE);
    }

    this._setContent(XMLP._CONT_ALT, strRet);

    return XMLP._ENTITY;

}

XMLP.prototype._replaceEntity = function(strD, iB, iE) {
    if(SAXStrings.isEmpty(strD)) return -1;
    iB = iB || 0;
    iE = iE || strD.length;

    switch(strD.substring(iB, iE)) {
        case "amp":  strEnt = "&";  break;
        case "lt":   strEnt = "<";  break;
        case "gt":   strEnt = ">";  break;
        case "apos": strEnt = "'";  break;
        case "quot": strEnt = "\""; break;
        case "nbsp":strEnt = ''; break;
        case "lt":strEnt = '<'; break;
        case "gt":strEnt = '>'; break;
        case "amp":strEnt = '&'; break;
        case "cent":strEnt = "¢"; break;
        case "pound":strEnt = '£'; break;
        case "yen":strEnt = '¥'; break;
        case "euro":strEnt = '€'; break;
        case "sect":strEnt = '§'; break;
        case "copy":strEnt = '©'; break;
        case "reg":strEnt = '®'; break;
        default:
            if(strD.charAt(iB) == "#") {
                strEnt = String.fromCharCode(parseInt(strD.substring(iB + 1, iE)));
            } else {
                strEnt = ' ';
                //return this._setErr(XMLP.ERR_ENTITY_UNKNOWN);
            }
        break;
    }
    this._setContent(XMLP._CONT_ALT, strEnt);

    return XMLP._ENTITY;
}

XMLP.prototype._setContent = function(iSrc) {
    var args = arguments;

    if(XMLP._CONT_XML == iSrc) {
        this.m_cAlt = null;
        this.m_cB = args[1];
        this.m_cE = args[2];
    } else {
        this.m_cAlt = args[1];
        this.m_cB = 0;
        this.m_cE = args[1].length;
    }
    this.m_cSrc = iSrc;

}

XMLP.prototype._setErr = function(iErr) {
    var strErr = XMLP._errs[iErr];

    this.m_cAlt = strErr;
    this.m_cB = 0;
    this.m_cE = strErr.length;
    this.m_cSrc = XMLP._CONT_ALT;

    return XMLP._ERROR;

}  // end function _setErr


//SaxParser is an object that basically wraps an XMLP instance, and provides an
//event-based interface for parsing. This is the object users interact with when coding
//with XML for <SCRIPT>
var SaxParser = function(eventhandlerfactory) {

    var eventhandler = new function(){

    }

    var thehandler = function() {};
    thehandler.prototype.onStartDocument = function (funct){
      eventhandler.onStartDocument = funct;
    }
    thehandler.prototype.onEndDocument = function (funct){
      eventhandler.onEndDocument = funct;
    }
    thehandler.prototype.onStartElementNS = function (funct){
      eventhandler.onStartElementNS = funct;
    }
    thehandler.prototype.onEndElementNS = function (funct){
      eventhandler.onEndElementNS = funct;
    }
    thehandler.prototype.onCharacters = function(funct) {
      eventhandler.onCharacters = funct;
    }
    thehandler.prototype.onCdata = function(funct) {
      eventhandler.onCdata = funct;
    }
    thehandler.prototype.onComment = function(funct) {
      eventhandler.onComment = funct;
    }
    thehandler.prototype.onWarning = function(funct) {
      eventhandler.onWarning = funct;
    }

    thehandler.prototype.onError = function(funct) {
      eventhandler.onError = funct;
    }


    eventhandlerfactory(new thehandler());
    //eventhandler = eventhandler(eventhandler);
    this.m_hndDoc = eventhandler;
    this.m_hndErr = eventhandler;
    this.m_hndLex = eventhandler;
    this.m_interrupted = false;
}


// CONSTANTS    (these must be below the constructor)
SaxParser.DOC_B = 1;
SaxParser.DOC_E = 2;
SaxParser.ELM_B = 3;
SaxParser.ELM_E = 4;
SaxParser.CHARS = 5;
SaxParser.PI    = 6;
SaxParser.CD_B  = 7;
SaxParser.CD_E  = 8;
SaxParser.CMNT  = 9;
SaxParser.DTD_B = 10;
SaxParser.DTD_E = 11;

SaxParser.prototype.parseFile = function(filename) { //This function will only work in the node.js environment.
    var fs = require('fs');
    var that = this;
    fs.readFile(filename, function (err, data) {
      that.parseString(data);
    });
}


SaxParser.prototype.parseString = function(strD) {
    util = require('util');
    var that = this;
    var startnew = true;
    if(!that.m_parser){
        that.m_parser = new XMLP(strD);
        startnew = false;
    }
    else{
        that.m_parser.continueParsing(strD);
        startnew = true;
    }

    //if(that.m_hndDoc && that.m_hndDoc.setDocumentLocator) {
    //    that.m_hndDoc.setDocumentLocator(that);
    //}

    that.m_bErr = false;

    if(!that.m_bErr && !startnew) {
        that._fireEvent(SaxParser.DOC_B);
    }
    that._parseLoop();
    if(!that.m_bErr && !that.m_interrupted) {
        that._fireEvent(SaxParser.DOC_E);
    }

    that.m_xml = null;
    that.m_iP = 0;
    that.m_interrupted = false;
}

SaxParser.prototype.pause = function() {
    this.m_parser.pause();
}

SaxParser.prototype.resume = function() {
    //reset the state
    this.m_parser.resume();
    this.m_interrupted = false;
    
    //now start up the parse loop
    var that = this;
    setTimeout(function(){
            that._parseLoop();
            if(!that.m_bErr && !that.m_interrupted) {
                that._fireEvent(SaxParser.DOC_E);
            }
    }, 0);
}

SaxParser.prototype.setDocumentHandler = function(hnd) {
    this.m_hndDoc = hnd;
}

SaxParser.prototype.setErrorHandler = function(hnd) {
    this.m_hndErr = hnd;
}

SaxParser.prototype.setLexicalHandler = function(hnd) {
    this.m_hndLex = hnd;
}

SaxParser.prototype.getColumnNumber = function() {
    return this.m_parser.getColumnNumber();
}

SaxParser.prototype.getLineNumber = function() {
    return this.m_parser.getLineNumber();
}

SaxParser.prototype.getMessage = function() {
    return this.m_strErrMsg;
}

SaxParser.prototype.getPublicId = function() {
    return null;
}

SaxParser.prototype.getSystemId = function() {
    return null;
}

SaxParser.prototype.getLength = function() {
    return this.m_parser.getAttributeCount();
}

SaxParser.prototype.getName = function(index) {
    return this.m_parser.getAttributeName(index);
}

SaxParser.prototype.getValue = function(index) {
    return this.m_parser.getAttributeValue(index);
}

SaxParser.prototype.getValueByName = function(name) {
    return this.m_parser.getAttributeValueByName(name);
}

SaxParser.prototype._fireError = function(strMsg) {
    this.m_strErrMsg = strMsg;
    this.m_bErr = true;

    if(this.m_hndErr && this.m_hndErr.onError) {
        this.m_hndErr.onError(this.m_strErrMsg);
    }
}



SaxParser.prototype._fireEvent = function(iEvt) {
    var hnd, func, args = arguments, iLen = args.length - 1;


    if(this.m_bErr) return;

    if(SaxParser.DOC_B == iEvt) {
        func = "onStartDocument";         hnd = this.m_hndDoc;
    }
    else if (SaxParser.DOC_E == iEvt) {
        func = "onEndDocument";           hnd = this.m_hndDoc;
    }
    else if (SaxParser.ELM_B == iEvt) {
        func = "onStartElementNS";          hnd = this.m_hndDoc;
    }
    else if (SaxParser.ELM_E == iEvt) {
        func = "onEndElementNS";            hnd = this.m_hndDoc;
    }
    else if (SaxParser.CHARS == iEvt) {
        func = "onCharacters";            hnd = this.m_hndDoc;
    }
    else if (SaxParser.PI    == iEvt) {
        func = "processingInstruction"; hnd = this.m_hndDoc;
    }
    else if (SaxParser.CD_B  == iEvt) {
        func = "onCdata";            hnd = this.m_hndLex;
    }
    else if (SaxParser.CD_E  == iEvt) {
        func = "onEndCDATA";              hnd = this.m_hndLex;
    }
    else if (SaxParser.CMNT  == iEvt) {
        func = "onComment";               hnd = this.m_hndLex;
    }

    if(hnd && hnd[func]) {
        if(0 == iLen) {
            hnd[func]();
        }
        else if (1 == iLen) {
            hnd[func](args[1]);
        }
        else if (2 == iLen) {
            hnd[func](args[1], args[2]);
        }
        else if (3 == iLen) {
            hnd[func](args[1], args[2], args[3]);
        }
        else if (4 == iLen) {
            hnd[func](args[1], args[2], args[3], args[4]);
        }
        else if (5 == iLen) {
            hnd[func](args[1], args[2], args[3], args[4], args[5]);
        }
        else if (6 == iLen) {
            hnd[func](args[1], args[2], args[3], args[4], args[5], args[6]);
        }
    }

}




SaxParser.prototype._parseLoop = function(parser) {
    var iEvent, parser;

    parser = this.m_parser;
    while(!this.m_bErr) {
        iEvent = parser.next();

        if(iEvent == XMLP._ELM_B) {
            theatts = this.m_parser.m_atts;
            nameobject = parser._parsePrefixAndElementName(parser.getName());
            theattsandnamespace = parser._parseNamespacesAndAtts(theatts);
            var theuri = parser._getContextualNamespace(nameobject.prefix);
            this._fireEvent(SaxParser.ELM_B, nameobject.name, theattsandnamespace[0], (nameobject.prefix === '')? null : nameobject.prefix, (theuri === '')? null : theuri ,theattsandnamespace[1] );
        }
        else if(iEvent == XMLP._ELM_E) {
            nameobject = parser._parsePrefixAndElementName(parser.getName());
            var theuri = parser._getContextualNamespace(nameobject.prefix);
            parser._removeExpiredNamesapces(parser.getName());
            this._fireEvent(SaxParser.ELM_E, nameobject.name, (nameobject.prefix === '')? null : nameobject.prefix, (theuri === '')? null : theuri);
        }
        else if(iEvent == XMLP._ELM_EMP) {
            //this is both a begin and end element
            theatts = this.m_parser.m_atts;
            nameobject = parser._parsePrefixAndElementName(parser.getName());
            theattsandnamespace = parser._parseNamespacesAndAtts(theatts);
            var theuri = parser._getContextualNamespace(nameobject.prefix);
            this._fireEvent(SaxParser.ELM_B, nameobject.name, theattsandnamespace[0], (nameobject.prefix === '')? null : nameobject.prefix, (theuri === '')? null : theuri ,theattsandnamespace[1], true );

            parser._removeExpiredNamesapces(parser.getName());
            this._fireEvent(SaxParser.ELM_E, nameobject.name, (nameobject.prefix === '')? null : nameobject.prefix, (theuri === '')? null : theuri, true);
            //this._fireEvent(SaxParser.ELM_B, parser.getName(), this.m_parser.m_atts.map(function(item){return { name : item[0], value : item[1], };}) );
            //this._fireEvent(SaxParser.ELM_E, parser.getName());
        }
        else if(iEvent == XMLP._TEXT) {
            this._fireEvent(SaxParser.CHARS, parser.getContent().slice(parser.getContentBegin(),parser.getContentEnd()));
        }
        else if(iEvent == XMLP._ENTITY) {
            this._fireEvent(SaxParser.CHARS, parser.getContent(), parser.getContentBegin(), parser.getContentEnd() - parser.getContentBegin());
        }
        else if(iEvent == XMLP._PI) {
            this._fireEvent(SaxParser.PI, parser.getName(), parser.getContent().substring(parser.getContentBegin(), parser.getContentEnd()));
        }
        else if(iEvent == XMLP._CDATA) {
            this._fireEvent(SaxParser.CD_B, parser.getContent().slice(parser.getContentBegin(),parser.getContentEnd()));
            //this._fireEvent(SaxParser.CHARS, parser.getContent(), parser.getContentBegin(), parser.getContentEnd() - parser.getContentBegin());
            //this._fireEvent(SaxParser.CD_E);
        }
        else if(iEvent == XMLP._COMMENT) {
            this._fireEvent(SaxParser.CMNT, parser.getContent().slice(parser.getContentBegin(),parser.getContentEnd()));
        }
        else if(iEvent == XMLP._DTD) {
        }
        else if(iEvent == XMLP._ERROR) {
            this._fireError(parser.getContent());
        }
        else if(iEvent == XMLP._INTERRUPT){
            this.m_interrupted = true;
            return;//just return and wait to be restarted
        }
        else if(iEvent == XMLP._NONE) {
            return;
        }
    }

}

//SAXStrings: a useful object containing string manipulation functions
var SAXStrings = function() {
//This is the constructor of the SAXStrings object
}


// CONSTANTS    (these must be below the constructor)
SAXStrings.WHITESPACE = " \t\n\r";
SAXStrings.QUOTES = "\"'";


SAXStrings.getColumnNumber = function(strD, iP) {
    if(SAXStrings.isEmpty(strD)) {
        return -1;
    }
    iP = iP || strD.length;

    var arrD = strD.substring(0, iP).split("\n");
    var strLine = arrD[arrD.length - 1];
    arrD.length--;
    var iLinePos = arrD.join("\n").length;

    return iP - iLinePos;

}

SAXStrings.getLineNumber = function(strD, iP) {
    if(SAXStrings.isEmpty(strD)) {
        return -1;
    }
    iP = iP || strD.length;

    return strD.substring(0, iP).split("\n").length
}

SAXStrings.indexOfNonWhitespace = function(strD, iB, iE) {
    if(SAXStrings.isEmpty(strD)) {
        return -1;
    }
    iB = iB || 0;
    iE = iE || strD.length;

    for(var i = iB; i < iE; i++){
        if(SAXStrings.WHITESPACE.indexOf(strD.charAt(i)) == -1) {
            return i;
        }
    }
    return -1;
}

SAXStrings.indexOfWhitespace = function(strD, iB, iE) {
    if(SAXStrings.isEmpty(strD)) {
        return -1;
    }
    iB = iB || 0;
    iE = iE || strD.length;

    for(var i = iB; i < iE; i++) {
        if(SAXStrings.WHITESPACE.indexOf(strD.charAt(i)) != -1) {
            return i;
        }
    }
    return -1;
}

SAXStrings.isEmpty = function(strD) {
    return (strD == null) || (strD.length == 0);
}

SAXStrings.lastIndexOfNonWhitespace = function(strD, iB, iE) {
    if(SAXStrings.isEmpty(strD)) {
        return -1;
    }
    iB = iB || 0;
    iE = iE || strD.length;

    for(var i = iE - 1; i >= iB; i--){
        if(SAXStrings.WHITESPACE.indexOf(strD.charAt(i)) == -1){
            return i;
        }
    }
    return -1;
}

SAXStrings.replace = function(strD, iB, iE, strF, strR) {
    if(SAXStrings.isEmpty(strD)) {
        return "";
    }
    iB = iB || 0;
    iE = iE || strD.length;

    return strD.toString().substring(iB, iE).split(strF).join(strR);

}

var Stack = function() {
    this.m_arr = new Array();
}

Stack.prototype.clear = function() {
    this.m_arr = new Array();
}

Stack.prototype.count = function() {
    return this.m_arr.length;
}

Stack.prototype.destroy = function() {
    this.m_arr = null;
}

Stack.prototype.peek = function() {
    if(this.m_arr.length == 0) {
        return null;
    }

    return this.m_arr[this.m_arr.length - 1];

}

Stack.prototype.pop = function() {
    if(this.m_arr.length == 0) {
        return null;
    }

    var o = this.m_arr[this.m_arr.length - 1];
    this.m_arr.length--;
    return o;

}

Stack.prototype.push = function(o) {
    this.m_arr[this.m_arr.length] = o;
}

// CONVENIENCE FUNCTIONS
function isEmpty(str) {
     return (str==null) || (str.length==0);
}


function trim(trimString, leftTrim, rightTrim) {
    if (isEmpty(trimString)) {
        return "";
    }

    // the general focus here is on minimal method calls - hence only one
    // substring is done to complete the trim.

    if (leftTrim == null) {
        leftTrim = true;
    }

    if (rightTrim == null) {
        rightTrim = true;
    }

    var left=0;
    var right=0;
    var i=0;
    var k=0;


    // modified to properly handle strings that are all whitespace
    if (leftTrim == true) {
        while ((i<trimString.length) && (whitespace.indexOf(trimString.charAt(i++))!=-1)) {
            left++;
        }
    }
    if (rightTrim == true) {
        k=trimString.length-1;
        while((k>=left) && (whitespace.indexOf(trimString.charAt(k--))!=-1)) {
            right++;
        }
    }
    return trimString.substring(left, trimString.length - right);
}

function __escapeString(str) {

    var escAmpRegEx = /&/g;
    var escLtRegEx = /</g;
    var escGtRegEx = />/g;
    var quotRegEx = /"/g;
    var aposRegEx = /'/g;

    str = str.replace(escAmpRegEx, "&amp;");
    str = str.replace(escLtRegEx, "&lt;");
    str = str.replace(escGtRegEx, "&gt;");
    str = str.replace(quotRegEx, "&quot;");
    str = str.replace(aposRegEx, "&apos;");

  return str;
}

function __unescapeString(str) {

    var escAmpRegEx = /&amp;/g;
    var escLtRegEx = /&lt;/g;
    var escGtRegEx = /&gt;/g;
    var quotRegEx = /&quot;/g;
    var aposRegEx = /&apos;/g;

    str = str.replace(escAmpRegEx, "&");
    str = str.replace(escLtRegEx, "<");
    str = str.replace(escGtRegEx, ">");
    str = str.replace(quotRegEx, "\"");
    str = str.replace(aposRegEx, "'");

  return str;
}

exports.SaxParser = SaxParser;


})()

},{"fs":3,"util":8}],5:[function(require,module,exports){
// shim for using process in browser
var process = module.exports = {};

// cached from whatever global is present so that test runners that stub it
// don't break things.  But we need to wrap it in a try catch in case it is
// wrapped in strict mode code which doesn't define any globals.  It's inside a
// function because try/catches deoptimize in certain engines.

var cachedSetTimeout;
var cachedClearTimeout;

function defaultSetTimout() {
    throw new Error('setTimeout has not been defined');
}
function defaultClearTimeout () {
    throw new Error('clearTimeout has not been defined');
}
(function () {
    try {
        if (typeof setTimeout === 'function') {
            cachedSetTimeout = setTimeout;
        } else {
            cachedSetTimeout = defaultSetTimout;
        }
    } catch (e) {
        cachedSetTimeout = defaultSetTimout;
    }
    try {
        if (typeof clearTimeout === 'function') {
            cachedClearTimeout = clearTimeout;
        } else {
            cachedClearTimeout = defaultClearTimeout;
        }
    } catch (e) {
        cachedClearTimeout = defaultClearTimeout;
    }
} ())
function runTimeout(fun) {
    if (cachedSetTimeout === setTimeout) {
        //normal enviroments in sane situations
        return setTimeout(fun, 0);
    }
    // if setTimeout wasn't available but was latter defined
    if ((cachedSetTimeout === defaultSetTimout || !cachedSetTimeout) && setTimeout) {
        cachedSetTimeout = setTimeout;
        return setTimeout(fun, 0);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedSetTimeout(fun, 0);
    } catch(e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't trust the global object when called normally
            return cachedSetTimeout.call(null, fun, 0);
        } catch(e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error
            return cachedSetTimeout.call(this, fun, 0);
        }
    }


}
function runClearTimeout(marker) {
    if (cachedClearTimeout === clearTimeout) {
        //normal enviroments in sane situations
        return clearTimeout(marker);
    }
    // if clearTimeout wasn't available but was latter defined
    if ((cachedClearTimeout === defaultClearTimeout || !cachedClearTimeout) && clearTimeout) {
        cachedClearTimeout = clearTimeout;
        return clearTimeout(marker);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedClearTimeout(marker);
    } catch (e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't  trust the global object when called normally
            return cachedClearTimeout.call(null, marker);
        } catch (e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error.
            // Some versions of I.E. have different rules for clearTimeout vs setTimeout
            return cachedClearTimeout.call(this, marker);
        }
    }



}
var queue = [];
var draining = false;
var currentQueue;
var queueIndex = -1;

function cleanUpNextTick() {
    if (!draining || !currentQueue) {
        return;
    }
    draining = false;
    if (currentQueue.length) {
        queue = currentQueue.concat(queue);
    } else {
        queueIndex = -1;
    }
    if (queue.length) {
        drainQueue();
    }
}

function drainQueue() {
    if (draining) {
        return;
    }
    var timeout = runTimeout(cleanUpNextTick);
    draining = true;

    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        while (++queueIndex < len) {
            if (currentQueue) {
                currentQueue[queueIndex].run();
            }
        }
        queueIndex = -1;
        len = queue.length;
    }
    currentQueue = null;
    draining = false;
    runClearTimeout(timeout);
}

process.nextTick = function (fun) {
    var args = new Array(arguments.length - 1);
    if (arguments.length > 1) {
        for (var i = 1; i < arguments.length; i++) {
            args[i - 1] = arguments[i];
        }
    }
    queue.push(new Item(fun, args));
    if (queue.length === 1 && !draining) {
        runTimeout(drainQueue);
    }
};

// v8 likes predictible objects
function Item(fun, array) {
    this.fun = fun;
    this.array = array;
}
Item.prototype.run = function () {
    this.fun.apply(null, this.array);
};
process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues
process.versions = {};

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;
process.prependListener = noop;
process.prependOnceListener = noop;

process.listeners = function (name) { return [] }

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };

},{}],6:[function(require,module,exports){
if (typeof Object.create === 'function') {
  // implementation from standard node.js 'util' module
  module.exports = function inherits(ctor, superCtor) {
    ctor.super_ = superCtor
    ctor.prototype = Object.create(superCtor.prototype, {
      constructor: {
        value: ctor,
        enumerable: false,
        writable: true,
        configurable: true
      }
    });
  };
} else {
  // old school shim for old browsers
  module.exports = function inherits(ctor, superCtor) {
    ctor.super_ = superCtor
    var TempCtor = function () {}
    TempCtor.prototype = superCtor.prototype
    ctor.prototype = new TempCtor()
    ctor.prototype.constructor = ctor
  }
}

},{}],7:[function(require,module,exports){
module.exports = function isBuffer(arg) {
  return arg && typeof arg === 'object'
    && typeof arg.copy === 'function'
    && typeof arg.fill === 'function'
    && typeof arg.readUInt8 === 'function';
}
},{}],8:[function(require,module,exports){
(function (process,global){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

var formatRegExp = /%[sdj%]/g;
exports.format = function(f) {
  if (!isString(f)) {
    var objects = [];
    for (var i = 0; i < arguments.length; i++) {
      objects.push(inspect(arguments[i]));
    }
    return objects.join(' ');
  }

  var i = 1;
  var args = arguments;
  var len = args.length;
  var str = String(f).replace(formatRegExp, function(x) {
    if (x === '%%') return '%';
    if (i >= len) return x;
    switch (x) {
      case '%s': return String(args[i++]);
      case '%d': return Number(args[i++]);
      case '%j':
        try {
          return JSON.stringify(args[i++]);
        } catch (_) {
          return '[Circular]';
        }
      default:
        return x;
    }
  });
  for (var x = args[i]; i < len; x = args[++i]) {
    if (isNull(x) || !isObject(x)) {
      str += ' ' + x;
    } else {
      str += ' ' + inspect(x);
    }
  }
  return str;
};


// Mark that a method should not be used.
// Returns a modified function which warns once by default.
// If --no-deprecation is set, then it is a no-op.
exports.deprecate = function(fn, msg) {
  // Allow for deprecating things in the process of starting up.
  if (isUndefined(global.process)) {
    return function() {
      return exports.deprecate(fn, msg).apply(this, arguments);
    };
  }

  if (process.noDeprecation === true) {
    return fn;
  }

  var warned = false;
  function deprecated() {
    if (!warned) {
      if (process.throwDeprecation) {
        throw new Error(msg);
      } else if (process.traceDeprecation) {
        console.trace(msg);
      } else {
        console.error(msg);
      }
      warned = true;
    }
    return fn.apply(this, arguments);
  }

  return deprecated;
};


var debugs = {};
var debugEnviron;
exports.debuglog = function(set) {
  if (isUndefined(debugEnviron))
    debugEnviron = process.env.NODE_DEBUG || '';
  set = set.toUpperCase();
  if (!debugs[set]) {
    if (new RegExp('\\b' + set + '\\b', 'i').test(debugEnviron)) {
      var pid = process.pid;
      debugs[set] = function() {
        var msg = exports.format.apply(exports, arguments);
        console.error('%s %d: %s', set, pid, msg);
      };
    } else {
      debugs[set] = function() {};
    }
  }
  return debugs[set];
};


/**
 * Echos the value of a value. Trys to print the value out
 * in the best way possible given the different types.
 *
 * @param {Object} obj The object to print out.
 * @param {Object} opts Optional options object that alters the output.
 */
/* legacy: obj, showHidden, depth, colors*/
function inspect(obj, opts) {
  // default options
  var ctx = {
    seen: [],
    stylize: stylizeNoColor
  };
  // legacy...
  if (arguments.length >= 3) ctx.depth = arguments[2];
  if (arguments.length >= 4) ctx.colors = arguments[3];
  if (isBoolean(opts)) {
    // legacy...
    ctx.showHidden = opts;
  } else if (opts) {
    // got an "options" object
    exports._extend(ctx, opts);
  }
  // set default options
  if (isUndefined(ctx.showHidden)) ctx.showHidden = false;
  if (isUndefined(ctx.depth)) ctx.depth = 2;
  if (isUndefined(ctx.colors)) ctx.colors = false;
  if (isUndefined(ctx.customInspect)) ctx.customInspect = true;
  if (ctx.colors) ctx.stylize = stylizeWithColor;
  return formatValue(ctx, obj, ctx.depth);
}
exports.inspect = inspect;


// http://en.wikipedia.org/wiki/ANSI_escape_code#graphics
inspect.colors = {
  'bold' : [1, 22],
  'italic' : [3, 23],
  'underline' : [4, 24],
  'inverse' : [7, 27],
  'white' : [37, 39],
  'grey' : [90, 39],
  'black' : [30, 39],
  'blue' : [34, 39],
  'cyan' : [36, 39],
  'green' : [32, 39],
  'magenta' : [35, 39],
  'red' : [31, 39],
  'yellow' : [33, 39]
};

// Don't use 'blue' not visible on cmd.exe
inspect.styles = {
  'special': 'cyan',
  'number': 'yellow',
  'boolean': 'yellow',
  'undefined': 'grey',
  'null': 'bold',
  'string': 'green',
  'date': 'magenta',
  // "name": intentionally not styling
  'regexp': 'red'
};


function stylizeWithColor(str, styleType) {
  var style = inspect.styles[styleType];

  if (style) {
    return '\u001b[' + inspect.colors[style][0] + 'm' + str +
           '\u001b[' + inspect.colors[style][1] + 'm';
  } else {
    return str;
  }
}


function stylizeNoColor(str, styleType) {
  return str;
}


function arrayToHash(array) {
  var hash = {};

  array.forEach(function(val, idx) {
    hash[val] = true;
  });

  return hash;
}


function formatValue(ctx, value, recurseTimes) {
  // Provide a hook for user-specified inspect functions.
  // Check that value is an object with an inspect function on it
  if (ctx.customInspect &&
      value &&
      isFunction(value.inspect) &&
      // Filter out the util module, it's inspect function is special
      value.inspect !== exports.inspect &&
      // Also filter out any prototype objects using the circular check.
      !(value.constructor && value.constructor.prototype === value)) {
    var ret = value.inspect(recurseTimes, ctx);
    if (!isString(ret)) {
      ret = formatValue(ctx, ret, recurseTimes);
    }
    return ret;
  }

  // Primitive types cannot have properties
  var primitive = formatPrimitive(ctx, value);
  if (primitive) {
    return primitive;
  }

  // Look up the keys of the object.
  var keys = Object.keys(value);
  var visibleKeys = arrayToHash(keys);

  if (ctx.showHidden) {
    keys = Object.getOwnPropertyNames(value);
  }

  // IE doesn't make error fields non-enumerable
  // http://msdn.microsoft.com/en-us/library/ie/dww52sbt(v=vs.94).aspx
  if (isError(value)
      && (keys.indexOf('message') >= 0 || keys.indexOf('description') >= 0)) {
    return formatError(value);
  }

  // Some type of object without properties can be shortcutted.
  if (keys.length === 0) {
    if (isFunction(value)) {
      var name = value.name ? ': ' + value.name : '';
      return ctx.stylize('[Function' + name + ']', 'special');
    }
    if (isRegExp(value)) {
      return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
    }
    if (isDate(value)) {
      return ctx.stylize(Date.prototype.toString.call(value), 'date');
    }
    if (isError(value)) {
      return formatError(value);
    }
  }

  var base = '', array = false, braces = ['{', '}'];

  // Make Array say that they are Array
  if (isArray(value)) {
    array = true;
    braces = ['[', ']'];
  }

  // Make functions say that they are functions
  if (isFunction(value)) {
    var n = value.name ? ': ' + value.name : '';
    base = ' [Function' + n + ']';
  }

  // Make RegExps say that they are RegExps
  if (isRegExp(value)) {
    base = ' ' + RegExp.prototype.toString.call(value);
  }

  // Make dates with properties first say the date
  if (isDate(value)) {
    base = ' ' + Date.prototype.toUTCString.call(value);
  }

  // Make error with message first say the error
  if (isError(value)) {
    base = ' ' + formatError(value);
  }

  if (keys.length === 0 && (!array || value.length == 0)) {
    return braces[0] + base + braces[1];
  }

  if (recurseTimes < 0) {
    if (isRegExp(value)) {
      return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
    } else {
      return ctx.stylize('[Object]', 'special');
    }
  }

  ctx.seen.push(value);

  var output;
  if (array) {
    output = formatArray(ctx, value, recurseTimes, visibleKeys, keys);
  } else {
    output = keys.map(function(key) {
      return formatProperty(ctx, value, recurseTimes, visibleKeys, key, array);
    });
  }

  ctx.seen.pop();

  return reduceToSingleString(output, base, braces);
}


function formatPrimitive(ctx, value) {
  if (isUndefined(value))
    return ctx.stylize('undefined', 'undefined');
  if (isString(value)) {
    var simple = '\'' + JSON.stringify(value).replace(/^"|"$/g, '')
                                             .replace(/'/g, "\\'")
                                             .replace(/\\"/g, '"') + '\'';
    return ctx.stylize(simple, 'string');
  }
  if (isNumber(value))
    return ctx.stylize('' + value, 'number');
  if (isBoolean(value))
    return ctx.stylize('' + value, 'boolean');
  // For some reason typeof null is "object", so special case here.
  if (isNull(value))
    return ctx.stylize('null', 'null');
}


function formatError(value) {
  return '[' + Error.prototype.toString.call(value) + ']';
}


function formatArray(ctx, value, recurseTimes, visibleKeys, keys) {
  var output = [];
  for (var i = 0, l = value.length; i < l; ++i) {
    if (hasOwnProperty(value, String(i))) {
      output.push(formatProperty(ctx, value, recurseTimes, visibleKeys,
          String(i), true));
    } else {
      output.push('');
    }
  }
  keys.forEach(function(key) {
    if (!key.match(/^\d+$/)) {
      output.push(formatProperty(ctx, value, recurseTimes, visibleKeys,
          key, true));
    }
  });
  return output;
}


function formatProperty(ctx, value, recurseTimes, visibleKeys, key, array) {
  var name, str, desc;
  desc = Object.getOwnPropertyDescriptor(value, key) || { value: value[key] };
  if (desc.get) {
    if (desc.set) {
      str = ctx.stylize('[Getter/Setter]', 'special');
    } else {
      str = ctx.stylize('[Getter]', 'special');
    }
  } else {
    if (desc.set) {
      str = ctx.stylize('[Setter]', 'special');
    }
  }
  if (!hasOwnProperty(visibleKeys, key)) {
    name = '[' + key + ']';
  }
  if (!str) {
    if (ctx.seen.indexOf(desc.value) < 0) {
      if (isNull(recurseTimes)) {
        str = formatValue(ctx, desc.value, null);
      } else {
        str = formatValue(ctx, desc.value, recurseTimes - 1);
      }
      if (str.indexOf('\n') > -1) {
        if (array) {
          str = str.split('\n').map(function(line) {
            return '  ' + line;
          }).join('\n').substr(2);
        } else {
          str = '\n' + str.split('\n').map(function(line) {
            return '   ' + line;
          }).join('\n');
        }
      }
    } else {
      str = ctx.stylize('[Circular]', 'special');
    }
  }
  if (isUndefined(name)) {
    if (array && key.match(/^\d+$/)) {
      return str;
    }
    name = JSON.stringify('' + key);
    if (name.match(/^"([a-zA-Z_][a-zA-Z_0-9]*)"$/)) {
      name = name.substr(1, name.length - 2);
      name = ctx.stylize(name, 'name');
    } else {
      name = name.replace(/'/g, "\\'")
                 .replace(/\\"/g, '"')
                 .replace(/(^"|"$)/g, "'");
      name = ctx.stylize(name, 'string');
    }
  }

  return name + ': ' + str;
}


function reduceToSingleString(output, base, braces) {
  var numLinesEst = 0;
  var length = output.reduce(function(prev, cur) {
    numLinesEst++;
    if (cur.indexOf('\n') >= 0) numLinesEst++;
    return prev + cur.replace(/\u001b\[\d\d?m/g, '').length + 1;
  }, 0);

  if (length > 60) {
    return braces[0] +
           (base === '' ? '' : base + '\n ') +
           ' ' +
           output.join(',\n  ') +
           ' ' +
           braces[1];
  }

  return braces[0] + base + ' ' + output.join(', ') + ' ' + braces[1];
}


// NOTE: These type checking functions intentionally don't use `instanceof`
// because it is fragile and can be easily faked with `Object.create()`.
function isArray(ar) {
  return Array.isArray(ar);
}
exports.isArray = isArray;

function isBoolean(arg) {
  return typeof arg === 'boolean';
}
exports.isBoolean = isBoolean;

function isNull(arg) {
  return arg === null;
}
exports.isNull = isNull;

function isNullOrUndefined(arg) {
  return arg == null;
}
exports.isNullOrUndefined = isNullOrUndefined;

function isNumber(arg) {
  return typeof arg === 'number';
}
exports.isNumber = isNumber;

function isString(arg) {
  return typeof arg === 'string';
}
exports.isString = isString;

function isSymbol(arg) {
  return typeof arg === 'symbol';
}
exports.isSymbol = isSymbol;

function isUndefined(arg) {
  return arg === void 0;
}
exports.isUndefined = isUndefined;

function isRegExp(re) {
  return isObject(re) && objectToString(re) === '[object RegExp]';
}
exports.isRegExp = isRegExp;

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}
exports.isObject = isObject;

function isDate(d) {
  return isObject(d) && objectToString(d) === '[object Date]';
}
exports.isDate = isDate;

function isError(e) {
  return isObject(e) &&
      (objectToString(e) === '[object Error]' || e instanceof Error);
}
exports.isError = isError;

function isFunction(arg) {
  return typeof arg === 'function';
}
exports.isFunction = isFunction;

function isPrimitive(arg) {
  return arg === null ||
         typeof arg === 'boolean' ||
         typeof arg === 'number' ||
         typeof arg === 'string' ||
         typeof arg === 'symbol' ||  // ES6 symbol
         typeof arg === 'undefined';
}
exports.isPrimitive = isPrimitive;

exports.isBuffer = require('./support/isBuffer');

function objectToString(o) {
  return Object.prototype.toString.call(o);
}


function pad(n) {
  return n < 10 ? '0' + n.toString(10) : n.toString(10);
}


var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep',
              'Oct', 'Nov', 'Dec'];

// 26 Feb 16:19:34
function timestamp() {
  var d = new Date();
  var time = [pad(d.getHours()),
              pad(d.getMinutes()),
              pad(d.getSeconds())].join(':');
  return [d.getDate(), months[d.getMonth()], time].join(' ');
}


// log is just a thin wrapper to console.log that prepends a timestamp
exports.log = function() {
  console.log('%s - %s', timestamp(), exports.format.apply(exports, arguments));
};


/**
 * Inherit the prototype methods from one constructor into another.
 *
 * The Function.prototype.inherits from lang.js rewritten as a standalone
 * function (not on Function.prototype). NOTE: If this file is to be loaded
 * during bootstrapping this function needs to be rewritten using some native
 * functions as prototype setup using normal JavaScript does not work as
 * expected during bootstrapping (see mirror.js in r114903).
 *
 * @param {function} ctor Constructor function which needs to inherit the
 *     prototype.
 * @param {function} superCtor Constructor function to inherit prototype from.
 */
exports.inherits = require('inherits');

exports._extend = function(origin, add) {
  // Don't do anything if add isn't an object
  if (!add || !isObject(add)) return origin;

  var keys = Object.keys(add);
  var i = keys.length;
  while (i--) {
    origin[keys[i]] = add[keys[i]];
  }
  return origin;
};

function hasOwnProperty(obj, prop) {
  return Object.prototype.hasOwnProperty.call(obj, prop);
}

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./support/isBuffer":7,"_process":5,"inherits":6}]},{},[1]);
