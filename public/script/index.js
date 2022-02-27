
let stopped = true
let microphoneOff = true;
let gumStream;
let canvasTime = document.querySelector('.visualizer-time');
let canvasFreq = document.querySelector('.visualizer-freq');
let requestAnimationFrame = window.requestAnimationFrame || 
                            window.mozRequestAnimationFrame || 
                            window.webkitRequestAnimationFrame || 
                            window.oRequestAnimationFrame || 
                            window.msRequestAnimationFrame;

let AudioContext = window.AudioContext || window.webkitAudioContext;    

let fftSize = 32768;
let frameCount = 16384;

let audioCtx;
let scriptNode;
let arrayNote = []
let plotHeight;
let plotWidth;
plotWidth = screen.width*0.8;
plotHeight = $(window).height()*0.2;

let subSampleRateTimeSeries;
let subSampleRateFreqDomain;

let pitchChangeNoteOffset = 0;
let freqLow = 150;
let freqHigh = 600;
let isTemperamentOctaveOnly = true;
let isPitchTableShown = false;

let arrAnimationFrames = [];
if (isMobileDevice()) {
  subSampleRateTimeSeries = 256;
  subSampleRateFreqDomain = 16;
} else {
  subSampleRateTimeSeries = 1;
  subSampleRateFreqDomain = 1;
}

function isMobileDevice() {
	return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

function drawCanvasBackground(canvas, width, height) {
  let canvasCtx = canvas.getContext("2d");
  canvasCtx.canvas.width  = width;
  canvasCtx.canvas.height = height;

  canvasCtx.fillStyle = 'rgb(200, 200, 200)';
  canvasCtx.fillRect(0, 0, width, height);
}

function stopGumStreamtracks() {
  gumStream.getTracks().forEach(
    track => { 
      console.log('stopping track' + track);
      track.enabled = false;
      $('#start-analyzing').attr('disabled','disabled');
    }
  )
}

function cancelAllAnimationFrames() {
  arrAnimationFrames.forEach(animationFrame => {
    cancelAnimationFrame(animationFrame)
  });
  arrAnimationFrames = [];
}

window.addEventListener('beforeunload', () => {
  stopGumStreamtracks();
  cancelAllAnimationFrames();
});

window.addEventListener('DOMContentLoaded', () => {
  drawCanvasBackground(canvasTime, plotWidth, plotHeight);
  drawCanvasBackground(canvasFreq, plotWidth, plotHeight);
  $("#turn-on-microphone")[0].onclick = () => {
    microphoneOff = !microphoneOff;
    console.log('microphoneOff =' + microphoneOff);
    $("#turn-on-microphone")[0].innerHTML = microphoneOff ? 'Microphone On' : 'Microphone Off';
    if (!microphoneOff) {
      if (gumStream) {
        gumStream.getTracks().forEach(
          track => { 
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
          e => alert('Your browser does not support navigator.mediaDevices.getUserMedia.'
             + 'Additional error message:' + e
          )
        );
      }
      $('#start-analyzing').removeAttr('disabled');;
    } else {
      stopGumStreamtracks();
      cancelAllAnimationFrames();
    }
  }

  $("#start-analyzing")[0].onclick = () => {
    stopped = !stopped;
    $("#start-analyzing")[0].innerHTML = stopped ? 'start analyzing' : 'stop analyzing';
  }

  $('#pitch-change-select').on('change', function(e) {
    switch(this.value) {
      case 'noChange':
        pitchChangeNoteOffset = 0;
        break;
      case 'halfNoteFlat':
        pitchChangeNoteOffset = 1;
        break;
      case 'wholeNoteFlat':
        pitchChangeNoteOffset = 2;
        break;
      default:
        break;
    }
  });

  $('#temperament-octave-only').on('change', function(e) {
    if (this.checked) {
      freqLow = 150;
      freqHigh = 600;
      isTemperamentOctaveOnly = true;
    }
    else {
      freqLow = 20;
      freqHigh = 8000;
      isTemperamentOctaveOnly = false;
    }
  });

  $("#btn-show-pitch-table")[0].onclick = () => {
    isPitchTableShown = !isPitchTableShown;
    const pitchTableElem = $("#pitch-table");
    if (isPitchTableShown) {
      pitchTableElem.show();
      $("#btn-show-pitch-table")[0].innerHTML = 'Hide pitch table';
    }
    else {
      pitchTableElem.hide();
      $("#btn-show-pitch-table")[0].innerHTML = 'Show pitch table';
    }
  };

  $.ajax({
    type: "GET",
    url: "resource/notes_vs_freq.csv",
    dataType: "text",
    success: data => {
      let allLines = data.split(/\r\n|\n/);
      for (let i = 1; i < allLines.length; i++) {
        let line = allLines[i];
        let allItems = line.split(',');
        let noteName = allItems[2];
        let freq = allItems[3];
        arrayNote.push({
          'noteName': noteName,
          'freq': freq
        });
      }
    }
 });
});

function handleSuccess(stream) {
  if (!stream || !stream.active) {
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
      x => x * 25.
    )
    visualize(canvasTime, timeSeriesVisualize, subSampleRateTimeSeries, plotWidth, plotHeight, plotHeight/2);

    if (stopped) {
      return ;
    }

    // test frequency measurement correctness
        // let dt = 1./44100;
    // let freq = 10000.;
    // for (let j = 0; j < input.length; j++) {
    //   let t = j*dt;
    //   input[j] = Math.sin(2*Math.PI*freq*t);
    // }

    let res = fft.analyze(timeSeries);
    res = fft.toMagnitude(res).slice(0, res.length/2);

    let df = 44100. / fftSize; // delta f where f is frequency
    let lowIdx = freqLow / df;
    let highIdx = freqHigh / df;
    res  = res.slice(lowIdx, highIdx);
    let pitch = (lowIdx + fft.getArgmax(res))*df;
    $('#measured-freq')[0].innerHTML = (Math.round(pitch*1000)/1000.).toFixed(3);
    let minDiff = 1e7;
    let closestNoteName = '?';
    let nominalfrequency = '?';
    const arrayCandidateNote = isTemperamentOctaveOnly? arrayNote.slice(32, 52) : arrayNote; // F3 to C5
    for (let i = 0; i < arrayCandidateNote.length; i++) {
      let note = arrayCandidateNote[i];
      let diff = Math.abs(parseFloat(note.freq) - pitch);
      if (diff < minDiff) {
        minDiff = diff;
        let noteId = Math.min(arrayCandidateNote.length - 1, i + pitchChangeNoteOffset);
        let closestNote = arrayCandidateNote[noteId];
        closestNoteName = closestNote.noteName.substr(0, 3);
        nominalfrequency = (Math.round(note.freq*1000)/1000.).toFixed(3);
      }
    }
    $('#closest-note-name')[0].innerHTML = closestNoteName;
    $('#nominal-frequency')[0].innerHTML = nominalfrequency;
    let sharpFlatString = 'You are ';
    let diff = pitch - nominalfrequency;
    sharpFlatString += Math.abs(Math.round(diff*1000)/1000.).toFixed(3).padStart(6, '0');
    if (diff > 0) {
      sharpFlatString += ' Hz ♯';
    } else if (diff < 0) {
      sharpFlatString += ' Hz ♭';
    } else {
      sharpFlatString += ' right on pitch';
    }
    $('#sharp-flat-string')[0].innerHTML = sharpFlatString;
    let subsampledRes = res.filter((value, index) => {
      return index % subSampleRateFreqDomain == 0;
    });
    let peakVal = fft.getMax(subsampledRes);
    let resVisualize = res.map(
      x => x*1. / peakVal*100
    )
    visualize(canvasFreq, resVisualize, subSampleRateFreqDomain, plotWidth, plotHeight, 0);
  }
}

// draw an oscilloscope of the current audio source
function visualize(canvas, dataArray, subsampleRate, width, height, offset) {
  let draw = () => {
    let canvasCtx = canvas.getContext('2d');
    arrAnimationFrames.push(requestAnimationFrame(draw));
  
    canvasCtx.fillStyle = 'rgb(200, 200, 200)';
    canvasCtx.fillRect(0, 0, width, height);
  
    canvasCtx.lineWidth = 1;
    canvasCtx.strokeStyle = 'rgb(0, 0, 0)';
  
    canvasCtx.beginPath();
    let dataLength = dataArray.length;
    let sliceWidth = width * 1.0 / dataLength * subsampleRate;
    let x = 0;
    for(let i = 0; i < dataLength; i += subsampleRate) {
      let v = offset + dataArray[i];
      let y = height - v;
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
