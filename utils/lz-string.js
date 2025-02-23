// LZ-String: JavaScript compression, version 1.4.4
const LZString = {
  compress: function(str) {
    if (str == null) return "";
    let res = "";
    let i, c, wc, w = 0, w_i = 0;
    const dictionary = {};
    const uncompressed = str;
    const dict_size = 256;
    
    for (i = 0; i < 256; i += 1) {
      dictionary[String.fromCharCode(i)] = i;
    }
    
    for (i = 0; i < uncompressed.length; i += 1) {
      c = uncompressed.charAt(i);
      wc = w + c;
      
      if (dictionary.hasOwnProperty(wc)) {
        w = wc;
      } else {
        if (dictionary.hasOwnProperty(w)) {
          if (w.charCodeAt(0) < 256) {
            for (i = 0; i < w.length; i += 1) {
              res += String.fromCharCode(w.charCodeAt(i));
            }
            res += String.fromCharCode(dict_size);
          } else {
            res += String.fromCharCode(dictionary[w]);
          }
        }
        dictionary[wc] = dict_size++;
        w = String(c);
      }
    }
    
    if (w !== "") {
      if (dictionary.hasOwnProperty(w)) {
        if (w.charCodeAt(0) < 256) {
          for (i = 0; i < w.length; i += 1) {
            res += String.fromCharCode(w.charCodeAt(i));
          }
          res += String.fromCharCode(dict_size);
        } else {
          res += String.fromCharCode(dictionary[w]);
        }
      }
    }
    
    return res;
  },

  decompress: function(compressed) {
    if (compressed == null) return "";
    if (compressed == "") return null;
    let i, w, c, wc, entry = "", dict_size = 256;
    const dictionary = [];
    
    for (i = 0; i < 256; i += 1) {
      dictionary[i] = String.fromCharCode(i);
    }
    
    w = String.fromCharCode(compressed.charCodeAt(0));
    let result = w;
    
    for (i = 1; i < compressed.length; i += 1) {
      c = compressed.charCodeAt(i);
      
      if (c < 256) {
        entry = dictionary[c];
      } else {
        if (c - dict_size < 0) return null;
        entry = w + w.charAt(0);
      }
      
      result += entry;
      dictionary[dict_size++] = w + entry.charAt(0);
      w = entry;
    }
    
    return result;
  }
};

module.exports = LZString; 