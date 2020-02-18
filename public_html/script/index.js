const handleSuccess = function(stream) {
const audioCtx = new AudioContext();
let frameCount = 16384;
const source = audioCtx.createMediaStreamSource(stream);

var scriptNode = audioCtx.createScriptProcessor(frameCount, 1, 1);
source.connect(scriptNode);
scriptNode.connect(audioCtx.destination);

let fft = new miniFFT(frameCount);
scriptNode.onaudioprocess = function(audioProcessingEvent) {
  var inputBuffer = audioProcessingEvent.inputBuffer;

  let input = inputBuffer.getChannelData(0);
  // let dt = 1./44100;
  // let freq = 2000;
  
  // for (var j = 0; j < myArrayBuffer.length; j++) {
  //   let t = j*dt;
  //   input[j] = Math.sin(2*Math.PI*freq*t);
  // }
  let res = fft.analyze(input);
  res = fft.toMagnitude(res).slice(0, res.length/2);
  let freqLow = 20;
  let freqHigh = 8000;
  let factor = 1./frameCount*44100;
  let low = freqLow/factor;
  let high = freqHigh/factor;
  res  = res.slice(low, high)
  let pitch = fft.getArgmax(res)*factor;
  let peakVal = fft.getMax(res);
  console.log('pitch=' + pitch)
  console.log('peakVal=' + peakVal)
  let canvasTime = document.querySelector('.visualizer_time');
  let canvasFreq = document.querySelector('.visualizer_freq');

  let inputVisualize = input.map(
    x => x*1. *25
  )

  let resVisualize = res.map(
    x => x*1. / peakVal*100
  )

  visualize(canvasTime, inputVisualize, 1000, 100, 50);
  visualize(canvasFreq, resVisualize, 1000, 100, 0);
  }
}


navigator.mediaDevices.getUserMedia({ audio: true, video: false })
.then(handleSuccess);


// draw an oscilloscope of the current audio source
function visualize(canvas, dataArray, width, height, offset) {

  let draw = () => {
    let canvasCtx = canvas.getContext("2d");
    drawVisual = requestAnimationFrame(draw);
  
  
    canvasCtx.fillStyle = 'rgb(200, 200, 200)';
    canvasCtx.fillRect(0, 0, width, height);
  
    canvasCtx.lineWidth = 2;
    canvasCtx.strokeStyle = 'rgb(0, 0, 0)';
  
    canvasCtx.beginPath();
    let dataLength = dataArray.length;
    var sliceWidth = width * 1.0 / dataLength;
    var x = 0;
  
    for(var i = 0; i < dataLength; i++) {
  
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
