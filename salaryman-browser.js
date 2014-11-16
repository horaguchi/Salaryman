document.write('<pre id="salaryman"></pre>');

var width = 80;
var height = 30;

Salaryman.prototype.drawMap = function (pre) {
  pre.innerHTML = this.getStatus() + this.getMap(width, height).map(function (row) {
    return row.join("") + "\n";
  }).join("").replace(/\{(#.{6})-fg\}(.*?)\{\/\1-fg\}/g, function (str, p1, p2) {
    return '<span style="color: ' + p1 + '">' + p2 + '</span>';
  });
};

var salaryman = new Salaryman;

var pre = document.getElementById('salaryman');
salaryman.drawMap(pre);

document.body.onkeypress = function (e) {
  salaryman.inputKey(String.fromCharCode(e.charCode));
  salaryman.drawMap(pre);
};
