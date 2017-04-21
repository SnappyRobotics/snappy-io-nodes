'use strict';

const debug = require('debug')('snappy:io:quadrature_encoder');

module.exports = function(RED) {
  var quad_EncoderNode = function(config) {
    RED.nodes.createNode(this, config);
    var node = this;
    var io = null;


    var last = 0;
    var lValue = 0;
    var value = 0;
    var rotation = 0;

    node.position = 0;

    function onPress() {
      debug('press')
    }

    var processInput = function() {
      var MSB = node.a;
      var LSB = node.b;
      var pos, turn;

      if (LSB === 1) {
        pos = MSB === 1 ? 0 : 1;
      } else {
        pos = MSB === 0 ? 2 : 3;
      }

      turn = pos - last;

      if (Math.abs(turn) !== 2) {
        if (turn === -1 || turn === 3) {
          value++;
        } else if (turn === 1 || turn === -3) {
          value--;
        }
      }

      last = pos;

      if (lValue !== value) {
        node.emit("change", value);
        if (config.outputType === 'typeA') {
          node.send([{
            payload: value
          }])
        } else {
          node.send([{
            payload: {
              count: value
            }
          }])
        }
      }

      lValue = value;
    }

    this.nodebot = RED.nodes.getNode(config.board);

    if (typeof this.nodebot === "object") {
      node.status({
        fill: "red",
        shape: "ring",
        text: "connecting ... "
      })

      node.nodebot.on('ioready', function() {
        node.status({
          fill: "green",
          shape: "dot",
          text: "connected"
        })

        try {
          io = node.nodebot.io;
          io.pinMode(config.pinA, io.MODES["PULLUP"])
          io.pinMode(config.pinB, io.MODES["PULLUP"])

          if (config.buttonPin) {
            io.pinMode(config.buttonPin, io.MODES["INPUT"])
          }

          io.digitalRead(config.pinA, (value) => {
            node.a = value;
            processInput()
          })

          io.digitalRead(config.pinB, (value) => {
            node.b = value;
            processInput()
          })

          if (config.buttonPin) {
            io.digitalRead(config.buttonPin, () => {
              onPress();
            })
          }
        } catch (e) {
          debug("erRr:", e)
          node.error(e)
          node.status({
            fill: "red",
            shape: "dot",
            text: "Error : " + e
          })
        }
      })
      node.nodebot.on('networkReady', function() {
        node.status({
          fill: "yellow",
          shape: "ring",
          text: "connecting..."
        })
      })
      node.nodebot.on('networkError', function() {
        node.status({
          fill: "red",
          shape: "dot",
          text: "disconnected"
        })
      })
      node.nodebot.on('ioError', function(err) {
        node.warn(err)
        node.status({
          fill: "red",
          shape: "dot",
          text: "error"
        })
      })

    } else {
      this.warn("nodebot not configured");
    }
  }

  RED.nodes.registerType("quadrature-encoder", quad_EncoderNode);
}
