noise.seed(Math.random());

var Salaryman = function () {
  this.mapData = [];
  this.noiseData = [];
  this.maxX = 640;
  this.maxY = 480;
  this.pointCoef = 0.5 - (Math.random() * 1);
  this.blockX = Math.floor(Math.random() * 15) + 15;
  this.blockY = Math.floor(this.blockX * (Math.random() + 1) / 2);
  this.playerX = 0;
  this.playerY = 0;
};

var i = 0;
var j = 0;

Salaryman.prototype.createMap = function () {
  var max_x = this.maxX;
  var max_y = this.maxY;
  var point_coef = this.pointCoef;
  var noise_data = [];
  var map_data = [];
  var x_d = this.blockX;
  var y_d = this.blockY;
  for (var y = 0; y < max_y; ++y) {
    noise_data[y] = noise_data[y] || [];
    for (var x = 0; x < max_x; ++x) {
      var value = noise.simplex2((x + i) / 100, (y + j) / 100);
      noise_data[y][x] = value;
    }
  }

  map_data = noise_data.map(function (row, y) {
    return row.map(function (col, x) {
      if (x % x_d === 0 && y % y_d === 0) {
        return col < point_coef ? " " : "#";
      } else if (x % x_d === 0) {
        return noise_data[y       - y % y_d] && noise_data[y       - y % y_d][x] >= point_coef &&
               noise_data[y + y_d - y % y_d] && noise_data[y + y_d - y % y_d][x] >= point_coef ? "#" : " ";

      } else if (y % y_d === 0) {
        return noise_data[y][x       - x % x_d] >= point_coef &&
               noise_data[y][x + x_d - x % x_d] >= point_coef ? "#" : " ";

      } else if (x % x_d === 1       && y % y_d === 1       ||
                 x % x_d === x_d - 1 && y % y_d === 1       ||
                 x % x_d === 1       && y % y_d === y_d - 1 ||
                 x % x_d === x_d - 1 && y % y_d === y_d - 1) {
        return "*"; // cornor

      } else if (y % y_d === 1 || y % y_d === y_d - 1) {
        return "-";

      } else if (x % x_d === 1 || x % x_d === x_d - 1){
        return "|";

      } else {
        return " ";
      }
    });
  });

  var get_rooms = function () {
    var result = [];
    map_data.forEach(function (row, y) {
      row.forEach(function (col, x) {
        if (col !== "*") {
          return;
        }
        for (var i = x + 1; i < max_x; ++i) {
          if (map_data[y][i] === "-") {
            continue;
          } else if (map_data[y][i] === "*") {
            break;
          }
          return;
        }
        if (i == max_x) {
          return;
        }
        for (var j = y + 1; j < max_y; ++j) {
          if (map_data[j][x] === "|") {
            continue;
          } else if (map_data[j][x] === "*") {
            break;
          }
          return;
        }
        if (j == max_y) {
          return;
        }
        // check minimum (TODO: USE CONSTANT)
        if (i - x < x_d / 2 || j - y < y_d / 2) {
          return;
        }
        result.push([ [x, y], [i, j] ]);
      });
    });
    return result;
  };

  var no_corridor = function (points) {
    for (var x = points[0][0]; x <= points[1][0]; ++x) {
      if ((points[0][1] > 0         && map_data[points[0][1] - 1][x] == "#") ||
          (points[1][1] < max_y - 1 && map_data[points[1][1] + 1][x] == "#")) {
        return false;
      }
    }
    for (var y = points[0][1]; y <= points[1][1]; ++y) {
      if ((points[0][0] > 0         && map_data[y][points[0][0] - 1] == "#") ||
          (points[1][0] < max_x - 1 && map_data[y][points[1][0] + 1] == "#")) {
        return false;
      }
    }
    return true;
  };

  var can_extend = function (points, option) {
    var n_blocked, s_blocked, w_blocked, e_blocked;
    if (option !== "w" && option !== "e") {
      for (var x = points[0][0]; x <= points[1][0]; ++x) {
        if (n_blocked || points[0][1] === 0        || map_data[points[0][1] - 1][x] !== " ") {
          n_blocked = true;
        }
        if (s_blocked || points[1][1] >= max_y - 1 || map_data[points[1][1] + 1][x] !== " ") {
          s_blocked = true;
        }
      }
    }
    if (option === "n") {
      return !n_blocked;
    } else if (option === "s") {
      return !s_blocked;
    }
    if (option !== "n" && option !== "s") {
      for (var y = points[0][1]; y <= points[1][1]; ++y) {
        if (w_blocked || points[0][0] === 0        || map_data[y][points[0][0] - 1] !== " ") {
          w_blocked = true;
        }
        if (e_blocked || points[1][0] >= max_x - 1 || map_data[y][points[1][0] + 1] !== " ") {
          e_blocked = true;
        }
      }
    }
    if (option === "w") {
      return !w_blocked;
    } else if (option === "e") {
      return !e_blocked;
    }

    return !n_blocked || !s_blocked || !w_blocked || !e_blocked;
  };

  var random_from_points = function (points) {
    var seed = noise_data[points[0][1]][points[0][0]] + noise_data[points[1][1]][points[1][0]];
    return (Math.abs(seed * 100000000) % 1000000) / 1000000;
  };

  var combine_rooms = function (points) {
    if (map_data[points[0][1]][points[0][0]] !== "*" ||
        map_data[points[0][1]][points[1][0]] !== "*" ||
        map_data[points[1][1]][points[0][0]] !== "*" ||
        map_data[points[1][1]][points[1][0]] !== "*"
       ) {
      return;
    }
    var random = random_from_points(points);
    var p1, p2, combine_type;
    if (random < 0.25 && points[0][1] > y_d) { // N
      p1 = [ points[0][0], points[0][1] - 2 ];
      p2 = [ points[1][0], points[0][1] ];
      combine_type = "|";

    } else if (random < 0.5 && points[1][1] < max_y - y_d) { // S
      p1 = [ points[0][0], points[1][1] ];
      p2 = [ points[1][0], points[1][1] + 2 ];
      combine_type = "|";

    } else if (random < 0.75 && points[0][1] > x_d) { // W
      p1 = [ points[0][0] - 2, points[0][1] ];
      p2 = [ points[0][0], points[1][1] ];
      combine_type = "-";

    } else if (points[1][0] < max_x - x_d) { // E
      p1 = [ points[1][0], points[0][1] ];
      p2 = [ points[1][0] + 2, points[1][1] ];
      combine_type = "-";

    } else { // no match OR no space
      p1 = [ points[0][0] - 1, points[0][1] - 1 ];
      p2 = [ points[1][0] + 1, points[1][1] + 1 ];
    }

    var x, y;
    // check ilegal combine
    for (x = p1[0]; x <= p2[0]; ++x) {
      for (y = p1[1]; y <= p2[1]; ++y) {
        if (x === p1[0] && y === p1[1] ||
            x === p1[0] && y === p2[1] ||
            x === p2[0] && y === p1[1] ||
            x === p2[0] && y === p2[1]) {
          if (map_data[y][x] !== "*") {
            return;
          }
        } else if (map_data[y][x] === "*") {
          return;
        }
      }
    }

    // combine 2 rooms
    for (x = p1[0]; x <= p2[0]; ++x) {
      for (y = p1[1]; y <= p2[1]; ++y) {
        if (combine_type === "|") {
          if (x === points[0][0] || x === points[1][0]) {
            map_data[y][x] = "|";
          } else {
            map_data[y][x] = " ";
          }
        } else if (combine_type === "-") {
          if (y === points[0][1] || y === points[1][1]) {
            map_data[y][x] = "-";
          } else {
            map_data[y][x] = " ";
          }
        }
      }
    }
  };

  var delete_room = function (points) {
    var p1 = points[0], p2 = points[1];
    for (x = p1[0]; x <= p2[0]; ++x) {
      for (y = p1[1]; y <= p2[1]; ++y) {
        map_data[y][x] = " ";
      }
    }
  };

  var extend_room_to = function (points, extend_type) {
    var p = [ points[0].concat(), points[1].concat() ];
    var old_x, new_x, old_y, new_y;
    while (can_extend(p, extend_type)) {
      if (extend_type === "n") {
        old_y = p[0][1]; --p[0][1]; new_y = p[0][1];
      } else if (extend_type === "s") {
        old_y = p[1][1]; ++p[1][1]; new_y = p[1][1];
      } else if (extend_type === "w") {
        old_x = p[0][0]; --p[0][0]; new_x = p[0][0];
      } else if (extend_type === "e") {
        old_x = p[1][0]; ++p[1][0]; new_x = p[1][0];
      }

      if (extend_type === "n" || extend_type === "s") {
        for (var x = points[0][0]; x <= points[1][0]; ++x) {
          map_data[old_y][x] = (x === points[0][0] || x === points[1][0]) ? "|" : " ";
          map_data[new_y][x] = (x === points[0][0] || x === points[1][0]) ? "*" : "-";
        }
      } else if (extend_type === "w" || extend_type === "e") {
        for (var y = points[0][1]; y <= points[1][1]; ++y) {
          map_data[y][old_x] = (y === points[0][1] || y === points[1][1]) ? "-" : " ";
          map_data[y][new_x] = (y === points[0][1] || y === points[1][1]) ? "*" : "|";
        }
      }
    }
    return p;
  };

  var extend_room = function (points) {
    var random = random_from_points(points);
    var order;
    if (random < 0.25) {
      order = [ "n", "w", "s", "e" ];
    } else if (random < 0.5) {
      order = [ "w", "s", "e", "n" ];
    } else if (random < 0.75) {
      order = [ "s", "e", "n", "w" ];
    } else {
      order = [ "e", "n", "w", "s" ];
    }
    points = extend_room_to(points, order[0]);
    points = extend_room_to(points, order[1]);
    points = extend_room_to(points, order[2]);
    points = extend_room_to(points, order[3]);
  };

  var all_rooms = get_rooms();
  var before_all_rooms_length = 0;
  while (all_rooms.length > 0 && all_rooms.length !== before_all_rooms_length) {
    all_rooms.forEach(combine_rooms);
    before_all_rooms_length = all_rooms.length;
    all_rooms = get_rooms();
  }

  get_rooms().filter(no_corridor).forEach(delete_room);

  get_rooms().filter(can_extend).forEach(extend_room);

  get_rooms().forEach(function (points) {
    var p1 = points[0], p2 = points[1];
    for (x = p1[0]; x <= p2[0]; ++x) {
      for (y = p1[1]; y <= p2[1]; ++y) {
        map_data[y][x] = map_data[y][x] === " " ? "." : map_data[y][x];
      }
    }
  });

  this.mapData = map_data;
  this.noiseData = noise_data;
};

