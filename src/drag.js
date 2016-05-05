import {dispatch} from "d3-dispatch";
import {event, select, mouse, touch} from "d3-selection";

function prevent() {
  event.preventDefault();
}

function mouseId() {
  return null;
}

// For mouse events, listen to the window for mousemove and mouseup such that we
// continue to receive events if the mouse goes outside the window.
function mouseContext() {
  return event.view;
}

// We only care about the first changed touch: if there are multiple new touches
// on DIFFERENT targets, we’ll receive multiple touchstart events; if there are
// multiple new touches on the SAME target, we only want to track the first.
function touchId() {
  return event.changedTouches[0].identifier;
}

// For touch events, listen to the target directly.
function touchContext() {
  return event.target;
}

export default function() {
  var listeners = dispatch("dragstart", "drag", "dragend"),
      mousestarted = started("mousemove", "mouseup", mouse, mouseId, mouseContext),
      touchstarted = started("touchmove", "touchend touchcancel", touch, touchId, touchContext);

  function drag(selection) {
    selection
        .on("mousedown.drag", mousestarted)
        .on("touchstart.drag", touchstarted);
  }

  function started(move, end, position, identify, contextify) {
    return function(d, i, nodes) {
      var id = identify(),
          node = this,
          parent = node.parentNode,
          origin = position(parent, id),
          ox = d.x - origin[0] || 0,
          oy = d.y - origin[1] || 0,
          dragged = false,
          view = select(event.view).on(scope("touchmove dragstart selectstart"), prevent, true),
          context = select(contextify()).on(scope(move), moved).on(scope(end), ended);

      // It’s tempting to call preventDefault on touchstart and mousedown so as
      // to prevent undesirable default behaviors, such as native dragging of
      // links or images, text selection, and scrolling. However, this would
      // also prevent desirable default behaviors, such as unfocusing a focused
      // input field. So instead, we cancel the specific undesirable behaviors.

      emit("dragstart");

      function emit(type) {
        listeners.call(type, node, d, i, nodes);
      }

      function scope(types) {
        var name = ".drag" + (id == null ? "" : "-" + id);
        return types == null ? name : types.trim()
            .split(/^|\s+/)
            .map(function(type) { return type + name; })
            .join(" ");
      }

      function moved() {
        var p = position(parent, id);
        if (p == null) return; // This touch didn’t change.
        d.x = p[0] + ox;
        d.y = p[1] + oy;
        dragged = true;
        emit("drag");
      }

      function ended() {
        if (!position(parent, id)) return; // This touch didn’t end.
        context.on(scope(), null);
        if (dragged) view.on(scope("click"), prevent, true), setTimeout(afterended, 0);
        else afterended();
        emit("dragend");
      }

      function afterended() {
        view.on(scope(), null);
      }
    };
  }

  drag.on = function() {
    var value = listeners.on.apply(listeners, arguments);
    return value === listeners ? drag : value;
  };

  return drag;
}
