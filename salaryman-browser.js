document.write('<canvas id="test"></canvas>');

Salaryman.prototype.drawCanvas = function (context) {
  context.clearRect(0, 0, this.maxX, this.maxY);

  this.mapData.forEach(function (row, y) {
    row.forEach(function (col, x) {
      if (col == "#") {
        context.fillStyle = "rgb(255,255,0)";
        context.fillRect(x, y, 1, 1);

      } else if (col == "-") {
        context.fillStyle = "black";
        context.fillRect(x, y, 1, 1);

      } else if (col == "|") {
        context.fillStyle = "black";
        context.fillRect(x, y, 1, 1);

      } else if (col == "*") {
        context.fillStyle = "black";
        context.fillRect(x, y, 1, 1);

      } else if (col == ".") {
        context.fillStyle = "rgb(255,255,200)";
        context.fillRect(x, y, 1, 1);

      } else if (col == " ") {
        // none
      }
    });
  });

};

var salaryman = new Salaryman;

var scale = 1;

document.getElementById('test').width = salaryman.maxX * scale;
document.getElementById('test').height = salaryman.maxY * scale;
var context = document.getElementById('test').getContext('2d');
context.scale(scale, scale);

salaryman.createMap();
salaryman.drawCanvas(context);
