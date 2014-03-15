function load(path, caller, container) {
  var wavesurfer = Object.create(WaveSurfer);
  
  //$(container).empty();

  // Progress bar and controls 
  var progressDiv = document.querySelector('#viewer-progress-bar');
  var progressBar = progressDiv.querySelector('.progress-bar');
  var controls    = document.querySelector('#controls');

  wavesurfer.on('loading', function (percent, xhr) {
    progressDiv.style.display = 'block';
    controls.style.display = "block";
    progressBar.text = percent + "%";
    progressBar.style.width = percent + '%';
  });
  wavesurfer.on('ready', function () {
    progressDiv.style.display = 'none';
    wavesurfer.play();
  });
  wavesurfer.on('destroy', function () {
    progressDiv.style.display = 'none';
    controls.style.display = "none";
  });
  
  wavesurfer.init({
    container: document.querySelector(container),
    loaderColor: 'purple',
    cursorColor: 'navy',
    markerWidth: 2,
    scrollParent: true,
    minPxPerSec: 15,
    // normalize: true,
    waveColor: 'violet',
    progressColor: 'purple'
  });
  
  wavesurfer.load(encodeURIComponent(unescape(path)));

  // Flash mark when it's played over
  wavesurfer.on('mark', function (marker) {
    if (marker.timer) { return; }
    
    marker.timer = setTimeout(function () {
      var origColor = marker.color;
      marker.update({ color: 'yellow' });
      
      setTimeout(function () {
        marker.update({ color: origColor });
        delete marker.timer;
      }, 100);
    }, 100);
  });
  
  wavesurfer.on('error', function (err) {
    console.error(err);
  });

  // Bind buttons and keypresses
  (function () {
    var eventHandlers = {
      'play': function () {
        wavesurfer.playPause();
      },
      
      'green-mark': function () {
        wavesurfer.mark({
          id: 'up',
          color: 'rgba(0, 255, 0, 0.5)'
        });
      },
      
      'red-mark': function () {
        wavesurfer.mark({
          id: 'down',
          color: 'rgba(255, 0, 0, 0.5)'
        });
      },
      
      'back': function () {
        wavesurfer.skipBackward();
      },
      
      'forth': function () {
        wavesurfer.skipForward();
      },
      
      'toggle-mute': function () {
        wavesurfer.toggleMute();
      }
    };
    
    document.addEventListener('keydown', function (e) {
      var map = {
        32: 'play',       // space
        38: 'green-mark', // up
        40: 'red-mark',   // down
        37: 'back',       // left
        39: 'forth'       // right
      };
      if (e.keyCode in map) {
        var handler = eventHandlers[map[e.keyCode]];
        e.preventDefault();
        handler && handler(e);
      }
    });
    
    document.addEventListener('click', function (e) {
      var action = e.target.dataset && e.target.dataset.action;
      if (action && action in eventHandlers) {
        eventHandlers[action](e);
      }
    });
  }());
}

function format_time(duration) {
  var hours = Math.floor(duration / 3600.0);
  var mins  = Math.floor((duration - hours * 3600.0) / 60.0);
  var secs  = (duration - hours * 3600.0 - mins * 60.0);
  // var parts = [];
  // if (hours !== 0) parts.push(hours + " hours");
  // if (mins !== 0) parts.push(mins + " mins");
  // parts.push(secs.toFixed(3) + " secs");
  // return parts.join(", ");
  return hours + ":" + (mins >= 10 ? mins : "0" + mins) + ":" + (secs < 10 ? "0" + secs.toFixed(3) : secs.toFixed(3));
}

function getWaveform(url, container) {
  var ll = Ladda.create(document.querySelector('#' + container + "-progress"));
  ll.start();
  $.ajax({
    type: "GET",
    cache: true,
    dataType: "json",
    url: url,
    success: function (info) {
      var waveform = new Waveform({ container: document.getElementById(container + "-waveform"),
                                    width: $('#' + container + '-waveform').width(),
                                    height: 30,
                                    interpolate: true,
                                    innerColor: "6f6f6f",
                                    outerColor: "ffffff",
                                    data: info.peaks });
      ll.stop();
      $('#' + container + '-title').append('<span class="label label-danger  pull-right">' + " duration: " + format_time(info.duration) + "</span>");
      $('#' + container + '-title').append('<span class="label label-default pull-right">' + " sample rate: " + info.sample_rate + " khz</span>");
      $('#' + container + '-title').append('<span class="label label-primary pull-right">' + (info.channels === 2 ? "stereo" : "mono") + "</span>");
      $('#' + container + '-progress').remove();
    }
  });
}
