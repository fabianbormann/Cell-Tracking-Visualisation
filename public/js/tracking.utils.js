Array.prototype.containsObject = function(cellId, frameId) {
  var found = -1;
  for(var i = 0; i < this.length; i++) {
      if (this[i].cellid == cellId && this[i].frameid == frameId) {
          found = i;
          break;
      }
  }
  return found
}

Array.prototype.containsKey = function(key) {
  var result = -1;
  for(var index = 0; index < this.length; index++) {
     if(this[index][0] == key) {
        result = index;
        break;
     }
  }
  return result;
}

Array.prototype.unique = function() {
  var result = this.filter( function( item, index, inputArray ) {
     return inputArray.indexOf(item) == index;
  });
  return result;
}

function fillString(value, maximum) {
  while (value.length < maximum) value = '0' + value;
  return value;
}

function base64toBinary(base64Data) {
  var byteCharacters = atob(base64Data);
  var bytesLength = byteCharacters.length;

  var byteArray = [];

  for (var currentChar = 0; currentChar < bytesLength; ++currentChar) {
     var decodedChar = byteCharacters.charCodeAt(currentChar);
        for(var i = 0; i < 8; i++) {
           byteArray.push(fillString(decodedChar.toString(2),8).charAt(i));
        }
  }
  return byteArray;
}

function isString(o) {
  return typeof o == "string" || (typeof o == "object" && o.constructor === String);
}