
var Salaryman = function () {
  noise.seed(Math.random());
  // map data
  this.noiseData = [];
  this.sightData = [];
  this.mapData = [];
  this.octave = 20;
  this.roadThreshold = 0 - (Math.random() * 0.5);
  this.blockX = 6;
  this.blockY = 5;
  this.bufferX = this.blockX * 200;
  this.bufferY = this.blockY * 200;
  this.playerX = -1;
  this.playerY = -1;
  this.baseX = 0;
  this.baseY = 0;
  this.recreateThreshold = 150; // > window sie / 2

  // game data
  this.time = 420;
  this.money = 0;
  this.hunger = 1000;
  this.sanity = 1000;
  this.log = "";

  // initial game
  this.createMap();
  this.seekPlayerPoint();
  this.log = "You need to work($), eat(%) and sleep(_)";
};

Salaryman.prototype.createMap = function () {
  var buffer_x = this.bufferX;
  var buffer_y = this.bufferY;
  var road_threshold = this.roadThreshold;
  var noise_data = [];
  var sight_data = [];
  var map_data = [];
  var x_d = this.blockX;
  var y_d = this.blockY;
  for (var y = 0; y < buffer_y; ++y) {
    noise_data[y] = noise_data[y] || [];
    for (var x = 0; x < buffer_x; ++x) {
      var value = noise.simplex2((x + this.baseX) / this.octave, (y + this.baseY) / this.octave);
      noise_data[y][x] = value;
    }
  }

  for (var y = 0; y < buffer_y; ++y) {
    sight_data[y] = sight_data[y] || [];
    for (var x = 0; x < buffer_x; ++x) {
      sight_data[y][x] = false;
    }
  }

  map_data = noise_data.map(function (row, y) {
    return row.map(function (col, x) {
      if (x % x_d === 0 && y % y_d === 0) {
        return col < road_threshold ? " " : "#";
      } else if (x % x_d === 0) {
        return noise_data[y       - y % y_d] && noise_data[y       - y % y_d][x] >= road_threshold &&
               noise_data[y + y_d - y % y_d] && noise_data[y + y_d - y % y_d][x] >= road_threshold ? "#" : " ";

      } else if (y % y_d === 0) {
        return noise_data[y][x       - x % x_d] >= road_threshold &&
               noise_data[y][x + x_d - x % x_d] >= road_threshold ? "#" : " ";

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
        for (var i = x + 1; i < buffer_x; ++i) {
          if (map_data[y][i] === "-" || map_data[y][i] === "+") {
            continue;
          } else if (map_data[y][i] === "*") {
            break;
          }
          return;
        }
        if (i === buffer_x) { // no corner
          return;
        }
        for (var j = y + 1; j < buffer_y; ++j) {
          if (map_data[j][x] === "|" || map_data[y][i] === "+") {
            continue;
          } else if (map_data[j][x] === "*") {
            break;
          }
          return;
        }
        if (j === buffer_y || i - x < x_d - 2 || j - y < y_d - 2) { // no corner OR check minimum
          return;
        }
        result.push([ [x, y], [i, j] ]);
      });
    });
    return result;
  };

  var no_corridor = function (points) {
    var p1 = points[0], p2 = points[1];
    for (var x = p1[0] + 1; x < p2[0]; ++x) {
      if ((p1[1] > 0         && map_data[p1[1] - 1][x] == "#") ||
          (p2[1] < buffer_y - 1 && map_data[p2[1] + 1][x] == "#")) {
        return false;
      }
    }
    for (var y = p1[1] + 1; y < p2[1]; ++y) {
      if ((p1[0] > 0         && map_data[y][p1[0] - 1] == "#") ||
          (p2[0] < buffer_x - 1 && map_data[y][p2[0] + 1] == "#")) {
        return false;
      }
    }
    return true;
  };

  var random_from_points = function (points) {
    var seed = noise_data[points[0][1]][points[0][0]] + noise_data[points[1][1]][points[1][0]];
    return (Math.abs(seed * 100000000) % 1000000) / 1000000;
  };

  var combine_rooms = function (points) {
    var p_x = points[0][0], p_y = points[0][1], p_x2 = points[1][0], p_y2 = points[1][1];
    if (map_data[p_y][p_x]   !== "*" ||
        map_data[p_y][p_x2]  !== "*" ||
        map_data[p_y2][p_x]  !== "*" ||
        map_data[p_y2][p_x2] !== "*"
       ) {
      return;
    }
    var random = random_from_points(points);
    var p1, p2, combine_type;
    if (random < 0.25 && p_y > y_d) { // N
      p1 = [ p_x, p_y - 2 ];
      p2 = [ p_x2, p_y ];
      combine_type = "|";

    } else if (random < 0.5 && p_y2 < buffer_y - y_d) { // S
      p1 = [ p_x, p_y2 ];
      p2 = [ p_x2, p_y2 + 2 ];
      combine_type = "|";

    } else if (random < 0.75 && p_y > x_d) { // W
      p1 = [ p_x - 2, p_y ];
      p2 = [ p_x, p_y2 ];
      combine_type = "-";

    } else if (p_x2 < buffer_x - x_d) { // E
      p1 = [ p_x2, p_y ];
      p2 = [ p_x2 + 2, p_y2 ];
      combine_type = "-";

    } else { // no match OR no space
      return;
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
          map_data[y][x] = (x === p_x || x === p_x2) ? "|" : " ";
        } else if (combine_type === "-") {
          map_data[y][x] = (y === p_y || y === p_y2) ? "-" : " ";
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

  var can_extend = function (points, option) {
    var n_blocked, s_blocked, w_blocked, e_blocked;
    if (option !== "w" && option !== "e") {
      for (var x = points[0][0], x2 = points[1][0]; x <= x2; ++x) {
        if (n_blocked || points[0][1] === 0        || map_data[points[0][1] - 1][x] !== " ") {
          n_blocked = true;
        }
        if (s_blocked || points[1][1] >= buffer_y - 1 || map_data[points[1][1] + 1][x] !== " ") {
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
      for (var y = points[0][1], y2 = points[1][1]; y <= y2; ++y) {
        if (w_blocked || points[0][0] === 0        || map_data[y][points[0][0] - 1] !== " ") {
          w_blocked = true;
        }
        if (e_blocked || points[1][0] >= buffer_x - 1 || map_data[y][points[1][0] + 1] !== " ") {
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
        for (var x = points[0][0], x2 = points[1][0]; x <= x2; ++x) {
          map_data[old_y][x] = (x === points[0][0] || x === points[1][0]) ? "|" : " ";
          map_data[new_y][x] = (x === points[0][0] || x === points[1][0]) ? "*" : "-";
        }
      } else if (extend_type === "w" || extend_type === "e") {
        for (var y = points[0][1], y2 = points[1][1]; y <= y2; ++y) {
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
    var random = random_from_points(points);
    var p1 = points[0], p2 = points[1];
    var item = [ -1, -1, -1 ];
    for (x = p1[0]; x <= p2[0]; ++x) {
      for (y = p1[1]; y <= p2[1]; ++y) {
        if (map_data[y][x] === " ") {
          map_data[y][x] = ".";
          if (item[2] < noise_data[y][x]) {
            item = [ x, y, noise_data[y][x] ];
          }
        }
      }
    }
    if (item[2] === -1) {
      console.log(points);
    } else {
      map_data[item[1]][item[0]] = random < 0.333 ? "_" : random < 0.666 ? "%" : "$";
    }

    var door1 = [ -1, -1, 100 ];
    var door2 = [ -1, -1, 100 ];
    for (var x = p1[0] + 1; x < p2[0]; ++x) {
      if (p1[1] > 0         && map_data[p1[1] - 1][x] == "#") {
        if (door1[2] > noise_data[p1[1]][x]) {
          door1 = [ x, p1[1], noise_data[p1[1]][x] ];
        }
      } else if (door1[2] !== 100) {
        map_data[door1[1]][door1[0]] = "+";
        door1 = [ -1, -1, 100 ];
      }
      if (p2[1] < buffer_y - 1 && map_data[p2[1] + 1][x] == "#") {
        if (door2[2] > noise_data[p2[1]][x]) {
          door2 = [ x, p2[1], noise_data[p2[1]][x] ];
        }
      } else if (door2[2] !== 100) {
        map_data[door2[1]][door2[0]] = "+";
        door2 = [ -1, -1, 100 ];
      }
    }
    if (door1[2] !== 100) {
      map_data[door1[1]][door1[0]] = "+";
    }
    if (door2[2] !== 100) {
      map_data[door2[1]][door2[0]] = "+";
    }

    door1 = [ -1, -1, 100 ];
    door2 = [ -1, -1, 100 ];
    for (var y = p1[1] + 1; y < p2[1]; ++y) {
      if (p1[0] > 0         && map_data[y][p1[0] - 1] == "#") {
        if (door1[2] > noise_data[y][p1[0]]) {
          door1 = [ p1[0], y, noise_data[y][p1[0]] ];
        }
      } else if (door1[2] !== 100) {
        map_data[door1[1]][door1[0]] = "+";
        door1 = [ -1, -1, 100 ];
      }
      if (p2[0] < buffer_x - 1 && map_data[y][p2[0] + 1] == "#") {
        if (door2[2] > noise_data[y][p2[0]]) {
          door2 = [ p2[0], y, noise_data[y][p2[0]] ];
        }
      } else if (door2[2] !== 100) {
        map_data[door2[1]][door2[0]] = "+";
        door2 = [ -1, -1, 100 ];
      }
    }
    if (door1[2] !== 100) {
      map_data[door1[1]][door1[0]] = "+";
    }
    if (door2[2] !== 100) {
      map_data[door2[1]][door2[0]] = "+";
    }
  });

  this.noiseData = noise_data;
  this.sightData = sight_data;
  this.mapData = map_data;
};

Salaryman.prototype.seekPlayerPoint = function () {
  var map_data = this.mapData;
  for (var y = Math.floor(this.bufferY / 4), y2 = y + Math.floor(this.bufferY / 2); y < y2; ++y) {
    for (var x = Math.floor(this.bufferX / 4), x2 = x + Math.floor(this.bufferX / 2); x < x2; ++x) {
      if (map_data[y][x] === "#") {
        this.playerX = x;
        this.playerY = y;
        Salaryman.updateSight(x, y, this.sightData, map_data);
        return;
      }
    }
  }
};

Salaryman.updateSight = function (player_x, player_y, sight_data, map_data) {
  var new_map = map_data[player_y][player_x];
  if (new_map === "#") {
    sight_data[player_y - 1][player_x - 1] = sight_data[player_y - 1][player_x - 1] || map_data[player_y - 1][player_x - 1] === "#" || map_data[player_y - 1][player_x - 1] === "+";
    sight_data[player_y - 1][player_x    ] = sight_data[player_y - 1][player_x    ] || map_data[player_y - 1][player_x    ] === "#" || map_data[player_y - 1][player_x    ] === "+";
    sight_data[player_y - 1][player_x + 1] = sight_data[player_y - 1][player_x + 1] || map_data[player_y - 1][player_x + 1] === "#" || map_data[player_y - 1][player_x + 1] === "+";
    sight_data[player_y    ][player_x - 1] = sight_data[player_y    ][player_x - 1] || map_data[player_y    ][player_x - 1] === "#" || map_data[player_y    ][player_x - 1] === "+";
    sight_data[player_y    ][player_x    ] = sight_data[player_y    ][player_x    ] || map_data[player_y    ][player_x    ] === "#" || map_data[player_y    ][player_x    ] === "+";
    sight_data[player_y    ][player_x + 1] = sight_data[player_y    ][player_x + 1] || map_data[player_y    ][player_x + 1] === "#" || map_data[player_y    ][player_x + 1] === "+";
    sight_data[player_y + 1][player_x - 1] = sight_data[player_y + 1][player_x - 1] || map_data[player_y + 1][player_x - 1] === "#" || map_data[player_y + 1][player_x - 1] === "+";
    sight_data[player_y + 1][player_x    ] = sight_data[player_y + 1][player_x    ] || map_data[player_y + 1][player_x    ] === "#" || map_data[player_y + 1][player_x    ] === "+";
    sight_data[player_y + 1][player_x + 1] = sight_data[player_y + 1][player_x + 1] || map_data[player_y + 1][player_x + 1] === "#" || map_data[player_y + 1][player_x + 1] === "+";

  } else if (new_map === "+") {
    sight_data[player_y - 1][player_x - 1] = sight_data[player_y - 1][player_x - 1] || map_data[player_y - 1][player_x - 1] !== "*";
    sight_data[player_y - 1][player_x    ] = sight_data[player_y - 1][player_x    ] || map_data[player_y - 1][player_x    ] !== "*";
    sight_data[player_y - 1][player_x + 1] = sight_data[player_y - 1][player_x + 1] || map_data[player_y - 1][player_x + 1] !== "*";
    sight_data[player_y    ][player_x - 1] = sight_data[player_y    ][player_x - 1] || map_data[player_y    ][player_x - 1] !== "*";
    sight_data[player_y    ][player_x    ] = sight_data[player_y    ][player_x    ] || map_data[player_y    ][player_x    ] !== "*";
    sight_data[player_y    ][player_x + 1] = sight_data[player_y    ][player_x + 1] || map_data[player_y    ][player_x + 1] !== "*";
    sight_data[player_y + 1][player_x - 1] = sight_data[player_y + 1][player_x - 1] || map_data[player_y + 1][player_x - 1] !== "*";
    sight_data[player_y + 1][player_x    ] = sight_data[player_y + 1][player_x    ] || map_data[player_y + 1][player_x    ] !== "*";
    sight_data[player_y + 1][player_x + 1] = sight_data[player_y + 1][player_x + 1] || map_data[player_y + 1][player_x + 1] !== "*";

  } else if (new_map === "." || new_map === "_" || new_map === "%" || new_map === "$") {
    var x1 = player_x, y1 = player_y;
    var x2 = player_x, y2 = player_y;
    while (map_data[player_y][x1] === "." || map_data[player_y][x1] === "_" || map_data[player_y][x1] === "%" || map_data[player_y][x1] === "$") {
      x1--;
    }
    while (map_data[y1][player_x] === "." || map_data[y1][player_x] === "_" || map_data[y1][player_x] === "%" || map_data[y1][player_x] === "$") {
      y1--;
    }
    while (map_data[player_y][x2] === "." || map_data[player_y][x2] === "_" || map_data[player_y][x2] === "%" || map_data[player_y][x2] === "$") {
      x2++;
    }
    while (map_data[y2][player_x] === "." || map_data[y2][player_x] === "_" || map_data[y2][player_x] === "%" || map_data[y2][player_x] === "$") {
      y2++;
    }
    for (var y = y1; y <= y2; ++y) {
      for (var x = x1; x <= x2; ++x) {
        sight_data[y][x] = true;
      }
    }
  }
};

Salaryman.prototype.getWork = function (x, y) {
  var day = Math.floor(this.time / 1440);
  var coef = ( Math.abs(this.baseX + x) + Math.abs(this.baseY + y) ) / 30;
  var noise  = (-0.1 * day + 1.1 + this.noiseData[y][x]) * 2;
  var noise2 = ( 0.1 * day + 2.1 - this.noiseData[y][x]) * 2;
  var result = {
    money: Math.floor(coef * noise),
    sanity: -1 * Math.floor(coef * noise2)
  };
  return result;
};

Salaryman.prototype.getFood = function (x, y) {
  var day = Math.floor(this.time / 1440);
  var noise = this.noiseData[y][x];
  var coef = ( Math.abs(this.baseX + x) + Math.abs(this.baseY + y) ) / 10;
  var noise  = (-0.1 * day + 1.1 + this.noiseData[y][x]) * 1;
  var noise2 = ( 0.1 * day + 2.1 - this.noiseData[y][x]) * 1;
  var result = {
    hunger: Math.floor(coef * noise),
    money: -1 * Math.floor(coef * noise2)
  };
  return result;
};

Salaryman.prototype.getBed = function (x, y) {
  var day = Math.floor(this.time / 1440);
  var noise = this.noiseData[y][x];
  var coef = ( Math.abs(this.baseX + x) + Math.abs(this.baseY + y) ) / 20;
  var noise  = (-0.1 * day + 1.1 + this.noiseData[y][x]) * 5;
  var noise2 = ( 0.1 * day + 2.1 - this.noiseData[y][x]) * 5;
  var result = {
    sanity: Math.floor(coef * noise),
    money: -1 * Math.floor(coef * noise2)
  };
  return result;
};

Salaryman.prototype.work = function () {
  var player_x = this.playerX;
  var player_y = this.playerY;
  if (this.mapData[player_y][player_x] !== "$") {
    this.log = "You can't work here.";
    return;
  }
  var menu = this.getWork(player_x, player_y);
  this.money += menu.money;
  this.sanity += menu.sanity;
  ++this.time;
  --this.hunger;
  if (this.time % 10 === 0) {
    --this.sanity;
  }
  this.log = "You work ($:+" + menu.money + ", _:" + menu.sanity + ").";
};

Salaryman.prototype.eat = function () {
  var player_x = this.playerX;
  var player_y = this.playerY;
  if (this.mapData[player_y][player_x] !== "%") {
    this.log = "You can't eat here.";
    return;
  }
  var menu = this.getFood(player_x, player_y);
  if (this.money + menu.money < 0) {
    this.log = "You don't have the money.";
    return;
  }
  this.money += menu.money;
  this.hunger = Math.min(1000, this.hunger + menu.hunger);
  ++this.time;
  if (this.time % 10 === 0) {
    --this.sanity;
  }
  this.log = "You eat (%:+" + menu.hunger + ", $:" + menu.money + ").";
};

Salaryman.prototype.sleep = function () {
  var player_x = this.playerX;
  var player_y = this.playerY;
  if (this.mapData[player_y][player_x] !== "_") {
    this.log = "You can't sleep here.";
    return;
  }
  var menu = this.getBed(player_x, player_y);
  if (this.money + menu.money < 0) {
    this.log = "You don't have the money.";
    return;
  }
  this.money += menu.money;
  this.sanity = Math.min(1000, this.sanity + menu.sanity);
  ++this.time;
  --this.hunger;
  this.log = "You sleep (_:+" + menu.sanity + ", $:" + menu.money + ").";
};

//Salaryman.CAN_WALK = /^[.#+%$_|\- *]$/;
Salaryman.CAN_WALK = /^[.#+%$_]$/;
Salaryman.prototype.movePlayer = function (m_x, m_y) {
  var map_data = this.mapData;
  var new_map = map_data[this.playerY + m_y][this.playerX + m_x];
  if ((m_x === 0 && m_y === 0) || !new_map.match(Salaryman.CAN_WALK)) {
    return;
  }

  ++this.time;
  --this.hunger;
  if (this.time % 10 === 0) {
    --this.sanity;
  }
  this.playerX += m_x;
  this.playerY += m_y;

  var player_x = this.playerX;
  var player_y = this.playerY;
  var buffer_x = this.bufferX;
  var buffer_y = this.bufferY;
  Salaryman.updateSight(player_x, player_y, this.sightData, map_data);

  var new_map = this.mapData[player_y][player_x];
  var menu;
  var point_log = "(" + (this.baseX + player_x) + "," + (this.baseY + player_y) + ")";
  if (new_map === "$") {
    menu = this.getWork(player_x, player_y);
    this.log = "$" + point_log + " - $:+" + menu.money + ", _:" + menu.sanity;
  } else if (new_map === "%") {
    menu = this.getFood(player_x, player_y);
    this.log = "%" + point_log + " - %:+" + menu.hunger + ", $:" + menu.money;
  } else if (new_map === "_") {
    menu = this.getBed(player_x, player_y);
    this.log = "_" + point_log + " - _:+" + menu.sanity + ", $:" + menu.money;
  }

  // check recreate
  var move_block_x = 0, move_block_y = 0;
  if (player_x < this.recreateThreshold || player_x > this.bufferX - this.recreateThreshold) {
    move_block_x = Math.floor((player_x - this.bufferX / 2) / this.blockX);
  }
  if (player_y < this.recreateThreshold || player_y > this.bufferY - this.recreateThreshold) {
    move_block_y = Math.floor((this.playerY - this.bufferY / 2) / this.blockY);
  }
  // recreate for infinity
  if (move_block_x !== 0 || move_block_y !== 0) {
    this.baseX += move_block_x * this.blockX;
    this.baseY += move_block_y * this.blockY;
    this.playerX -= move_block_x * this.blockX;
    this.playerY -= move_block_y * this.blockY;
    var old_sight_data = this.sightData;
    this.createMap();
    var new_sight_data = this.sightData;
    for (var y = 0; y < buffer_y; ++y) {
      for (var x = 0; x < buffer_x; ++x) {
        if (old_sight_data[y][x]) {
          var new_x = x - move_block_x * this.blockX;
          var new_y = y - move_block_y * this.blockY;
          if (0 <= new_x && new_x < buffer_x && 0 <= new_y && new_y < buffer_y) {
            new_sight_data[new_y][new_x] = true;
          }
        }
      }
    }
  }
};

Salaryman.addZero = function (value) {
  return value < 10 ? "0" + value : value;
};
Salaryman.prototype.getStatus = function () {
  return "(" + (this.baseX + this.playerX) + "," + (this.baseY + this.playerY) + ") Day " +
    Math.floor(this.time / 1440) + " " + Salaryman.addZero(Math.floor(this.time % 1440 / 60)) + ":" + Salaryman.addZero(Math.floor(this.time % 60)) +
    " Hunger:" + this.hunger + " Sanity:" + this.sanity + " Money:" + this.money + "\n" +
    this.log + "\n";
};
Salaryman.COLORS = {
  "@": "#0000FF",
  "+": "#0000cc",
  "%": "#cc00cc",
  "_": "#cccc00",
  "$": "#00cccc"
};
Salaryman.prototype.getMap = function (width, height) {
  var player_x = this.playerX;
  var player_y = this.playerY;
  var map_data = this.mapData;
  var sight_data = this.sightData;
  var result = [];
  for (var y = this.playerY - Math.floor(height / 2), y2 = y + height; y < y2; ++y) {
    var row = [];
    for (var x = this.playerX - Math.floor(width / 2), x2 = x + width; x < x2; ++x) {
      var str = (player_x === x && player_y === y) ? "@" : sight_data[y][x] ? map_data[y][x] : " ";
      var color = Salaryman.COLORS[str];
      if (color) {
        row.push("{" + color + "-fg}" + str + "{/" + color + "-fg}");
      } else {
        row.push(str);
      }
    }
    result.push(row);
  }
  return result;
};

Salaryman.prototype.inputKey = function (input_str) {
  if (this.hunger < 0 || this.sanity < 0) {
    this.log = "You died.";
    return;
  }

  if (input_str === "w" || input_str === "k") {
    this.movePlayer(0, -1);
  } else if (input_str === "a" || input_str === "h") {
    this.movePlayer(-1, 0);
  } else if (input_str === "s" || input_str === "j") {
    this.movePlayer(0, 1);
  } else if (input_str === "d" || input_str === "l") {
    this.movePlayer(1, 0);
  } else if (input_str === "d" || input_str === "l") {
    this.movePlayer(1, 0);
  } else if (input_str === "y") {
    this.movePlayer(-1, -1);
  } else if (input_str === "u") {
    this.movePlayer(1, -1);
  } else if (input_str === "b") {
    this.movePlayer(-1, 1);
  } else if (input_str === "n") {
    this.movePlayer(1, 1);
  } else if (input_str === "$"){
    this.work();
  } else if (input_str === "_") {
    this.sleep();
  } else if (input_str === "%") {
    this.eat();
  }
};
