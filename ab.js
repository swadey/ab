var fs           = require('fs');
var xreg         = require('xregexp').XRegExp;
var express      = require("express");
var cons         = require("consolidate");
var app          = express();
var vid          = require("vid-streamer");
var waveform     = require('waveform-util')

var FFmpeg       = require('fluent-ffmpeg');
var MemoryStream = require('memorystream');

// ---------------------------------------------------------------------------------------------------------------------------------
// Functions
// ---------------------------------------------------------------------------------------------------------------------------------
function getaudio(fn) {
  var command = FFmpeg({ source: fn })
    .withNoVideo()
    .withAudioCodec('pcm_s16le')
    .toFormat('wav');
  var audioData = new MemoryStream();
  command.writeToStream(audioData, { end : true });
  return audioData;
}

function fnParts(fn) { 
  var parts = fn.match(/^(.*[\/\\])?(.*?)(\..*)?$/); 
  return { dir: (parts[1] === undefined ? "" : parts[1]), 
           base: parts[2], 
           extension: (parts[3] === undefined ? "" : parts[3]), 
           toPath: function() { return (this.dir === "" ? "" : (this.dir + "/")) + this.base + this.extension; }
         }; 
}
function base(fn) { return fnParts(fn).base }
function id(fn) {
  return "ID-" + base(fn).replace(xreg('(\\s+|\\p{P}|\\p{Z}|\\p{M})', 'g'), "_")
}

function waveimage(fn, cb) {
  var fnp        = fnParts(fn);
  var pfnp       = fnp;
  pfnp.extension = ".peaks";
  var peakFile   = pfnp.toPath();

  if (fs.existsSync(peakFile)) {
    console.log("using EXISTING peak file: %s", peakFile);
    fs.readFile(peakFile, 'utf8', function(err, peaks) { cb(JSON.parse(peaks)); })
  } else {
    console.log("creating NEW peak file: %s", peakFile);
    waveform.audio_data(fn, function(err, fmt) { 
      waveform.generate_peaks(fn, 2048, fmt.duration, fmt.sample_rate, fmt.channels, 
                              function (eff, peaks) { 
                                fs.writeFileSync(peakFile, JSON.stringify(peaks), 'utf8');
                                cb(peaks);
                              });
    });
  }
}

// ---------------------------------------------------------------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------------------------------------------------------------
var s = {
  rootFolder: __dirname + "/",
  rootPath: ""
};
var v = vid.settings(s);

app.use(express.logger())
app.use(express.compress());

app.engine('html', cons.handlebars);
app.set('view engine', 'html');
app.set('views', __dirname);

app.use("/css", express.static(__dirname + '/css'))
app.use("/js", express.static(__dirname + '/js'))
app.use("/img", express.static(__dirname + '/img'))
app.use("/fonts", express.static(__dirname + '/fonts'))

app.get("/:file", vid);
app.get('/waveform/:file', function(req, res) {
  waveimage(req.params.file, function(pks) { res.json(pks.peaks) });
});
app.get('/', function(req, res) {
  var files = fs.readdirSync(".").filter(function(f) { return !fs.lstatSync(f).isDirectory() && /^.*\.(mp3|mp4|m4a|wav|ogg|avi|wma)$/.test(f) });
  var obj   = { files : files.map(function(f) { return { name : f.replace(/'/g, "\\'"), id : id(f) } }) }
  res.render('index', obj);
});

app.listen(8000);
