
let stopped = true
let microphoneOff = true;
let gumStream;
let canvasTime = document.querySelector('.visualizer_time');
let canvasFreq = document.querySelector('.visualizer_freq');
let requestAnimationFrame = window.requestAnimationFrame || 
                            window.mozRequestAnimationFrame || 
                            window.webkitRequestAnimationFrame || 
                            window.oRequestAnimationFrame || 
                            window.msRequestAnimationFrame;

let AudioContext = window.AudioContext || window.webkitAudioContext;    


// let fftSize = 16384;
// let frameCount = 16384;

let fftSize = 32768;
let frameCount = 16384;

let audioCtx;
let scriptNode;
let arrayNotes = []


function drawCanvasBackground(canvas, width, height) {
  let canvasCtx = canvas.getContext("2d");

  canvasCtx.fillStyle = 'rgb(200, 200, 200)';
  canvasCtx.fillRect(0, 0, width, height);
}
window.addEventListener('DOMContentLoaded', (event) => {
  drawCanvasBackground(canvasTime, 1000, 100);
  drawCanvasBackground(canvasFreq, 1000, 100);

  $("#turn_on_microphone")[0].onclick = () => {
    microphoneOff = ! microphoneOff;
    console.log('microphoneOff =' + microphoneOff);
    $("#turn_on_microphone")[0].innerHTML = microphoneOff ? 'turn on microphone' : 'turn off microphone';
    if ( ! microphoneOff) {
      if (gumStream) {
        gumStream.getTracks().forEach(
          (track) => { 
            console.log('resuming track' + track);
            track.enabled = true;
          }
        )
      } else {
        navigator.mediaDevices.getUserMedia({ audio: true, video: false })
        .then(
          function(stream) {
            gumStream = stream;
            console.log('started stream ' + gumStream);
            audioCtx = new AudioContext();
            scriptNode = audioCtx.createScriptProcessor(frameCount, 1, 1);
            scriptNode.connect(audioCtx.destination);
            handleSuccess(gumStream);

          }
        ).catch(
          (e) => alert('Your browser does not support navigator.mediaDevices.getUserMedia.'
             + 'Additional error message:' + e
          )
        );
      }
      $('#start_analyzing').removeAttr('disabled');;

    } else {
      gumStream.getTracks().forEach(
        (track) => { 
          console.log('stopping track' + track);
          track.enabled = false;
          $('#start_analyzing').attr('disabled','disabled');
        }
      )
    }
  
  }

  $("#start_analyzing")[0].onclick = () => {
    console.log('clicked');
    stopped = ! stopped;
    $("#start_analyzing")[0].innerHTML = stopped ? 'start analyzing' : 'stop analyzing';
  }
});


function handleSuccess(stream) {
  if ( ! stream || ! stream.active) {
    console.log('stream not active');
    return ;
  }
  audioCtx.resume() 
  let numBuffers = fftSize / frameCount;
  const source = audioCtx.createMediaStreamSource(stream);

  source.connect(scriptNode);
  source.onended = function() {
    source.disconnect(scriptNode);
    scriptNode.disconnect(audioCtx.destination);
  }

  let fft = new miniFFT(fftSize);

  let input = [];
  let bufferCount = 0;

  scriptNode.onaudioprocess = function(audioProcessingEvent) {
    if (microphoneOff) {
      return ;
    }
    let inputBuffer = audioProcessingEvent.inputBuffer;
    let channelData = inputBuffer.getChannelData(0);
    input = input.concat(...channelData);
    bufferCount++;
    if (bufferCount < numBuffers) {
      return ;
    }
    let timeSeries = input;
    input = [];
    bufferCount = 0;
    let timeSeriesVisualize = timeSeries.map(
      x => x*1. *25
    )
    visualize(canvasTime, timeSeriesVisualize, 512, 1000, 100, 50);

    if (stopped) {
      return ;
    }

    // test frequency measurement correctness
    
    // let dt = 1./44100;
    // let freq = 10000.;
    // for (var j = 0; j < input.length; j++) {
    //   let t = j*dt;
    //   input[j] = Math.sin(2*Math.PI*freq*t);
    // }

    //

    let res = fft.analyze(timeSeries);
    res = fft.toMagnitude(res).slice(0, res.length/2);
    let freqLow = 20;
    let freqHigh = 8000;
    let factor = 44100./(fftSize);
    let low = freqLow/factor;
    let high = freqHigh/factor;

    let pitch = fft.getArgmax(res)*factor;
    res  = res.slice(low, high)

    let measureFreqText = document.querySelector('#measured_freq');
    measureFreqText.innerHTML = (Math.round(pitch*100)/100.).toString();
    
    
    let subsampleRate = 64;
    let subsampledRes = res.filter( (value, index, arr) => {
      return index % subsampleRate == 0;
    });
    let peakVal = fft.getMax(subsampledRes);
    let resVisualize = res.map(
      x => x*1. / peakVal*100
    )
    visualize(canvasFreq, resVisualize, subsampleRate, 1000, 100, 0);
  }
}


// draw an oscilloscope of the current audio source
function visualize(canvas, dataArray, subsampleRate, width, height, offset) {

  let draw = () => {
    let canvasCtx = canvas.getContext("2d");
    drawVisual = requestAnimationFrame(draw);
  
    canvasCtx.fillStyle = 'rgb(200, 200, 200)';
    canvasCtx.fillRect(0, 0, width, height);
  
    canvasCtx.lineWidth = 1;
    canvasCtx.strokeStyle = 'rgb(0, 0, 0)';
  
    canvasCtx.beginPath();
    let dataLength = dataArray.length;
    var sliceWidth = width * 1.0 / dataLength * subsampleRate;
    var x = 0;
    for(var i = 0; i < dataLength; i += subsampleRate) {
  
      var v = offset + dataArray[i];
      var y = height - v;
  
      if(i === 0) {
        canvasCtx.moveTo(x, y);
      } else {
        canvasCtx.lineTo(x, y);
      }
      x += sliceWidth;
    }
    canvasCtx.stroke();
  };

  draw();
}
