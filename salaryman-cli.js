#!/usr/bin/env node

var blessed = require('blessed');
var screen = blessed.screen();
screen.key(['escape', 'C-c'], function(ch, key) {
  return process.exit(0);
});

var seed = process.argv[2];

require('./perlin');

var Salaryman, salaryman;
Salaryman = require('./salaryman');
salaryman = new Salaryman(seed);

var title_box = blessed.box({
  top: 0,
  left: 0,
  width: '100%',
  height: 1,
  content: 'status1\nstatus2',
});
var display_box = blessed.box({
  top: 1,
  left: 0,
  width: '100%',
  height: screen.height - 2,
  content: 'log1\nlog2\nlog3',
  tags: true
});
screen.append(title_box);
screen.append(display_box);

title_box.setContent('salaryman v' + Salaryman.VERSION);

var displayScreen = function () {
  var text = salaryman.getStatus() + salaryman.getMap(screen.width, screen.height - 2).map(function (row) {
    return row.join("") + "\n";
  }).join("");
  display_box.setContent(text);
  screen.render();
};

var onkeypress = function(ch, key) {
  salaryman.inputKey(ch);
  displayScreen();
};
display_box.key(['w', 'a', 's', 'd', 'h', 'j', 'k', 'l', 'b', 'n', 'y', 'u', '$', '%', '_'], onkeypress);
display_box.focus();

displayScreen();
