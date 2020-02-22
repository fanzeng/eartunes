class ComplexNumber {
    constructor(real, imag=0) {
        this.real = real;
        this.imag = imag;
    }
    toString() {
        if (this.imag === 0.) {
            return Math.round(this.real*100.)/100.;
        } else {
            return Math.round(this.real*100.)/100.
                + ' + j '
                + Math.round(this.imag*100.)/100.;
        }
    }
    add(c) {
        return new ComplexNumber(this.real + c.real, this.imag + c.imag);
    }
    mul(c) {
        return new ComplexNumber(
            this.real*c.real - this.imag*c.imag,
            this.imag*c.real + this.real*c.imag
        );
    }
    mag(c) {
        return Math.sqrt(this.real*this.real + this.imag*this.imag);
    }
}

class miniFFT {
    constructor(size) {
        this.size = size;
        this.weight = Array.from(Array(size).keys()).map(
            x => {
                let angle = -2*Math.PI*x/size;
                return new ComplexNumber(Math.cos(angle), Math.sin(angle));
            }
        );
    }
    
    toComplex(arr) {
        return arr.map(
            r => new ComplexNumber(r)
        )
    }

    stackVertical(arr) {
        return [].concat(arr).concat(arr);
    }

    fft(arr, weight) {
        // arr.length must be equal to weights.length
        if (weight.length == 1) {
            return [
                weight[0].mul(arr[0])
            ];
        }
        let arrEven = arr.filter(
            (elem, idx, arr) => { return idx%2 == 0; }
        )
        let arrOdd = arr.filter(
            (elem, idx, arr) => { return idx%2 == 1; }
        )
        let weightSq = weight.filter(
            (value, index, array) => { return index < array.length/2; }
        ).map(w => w.mul(w))
        let even = this.stackVertical(this.fft(arrEven, weightSq))
        let odd = this.stackVertical(this.fft(arrOdd, weightSq));
        let res = even.map(
            (value, index, array) => {
                return value.add(weight[index].mul(odd[index]));
            }
        )
        return res;
    }

    analyze(arr) {
        arr = this.toComplex([...arr]);
        let res = this.fft(arr, this.weight);
        return res;
    }
    toMagnitude(arr) {
        return arr.map(
            c => {
                if (c instanceof ComplexNumber) {
                    return c.mag();
                } else {
                    return Math.abs(c);
                }
            }
        )

    }

    getMax(arr) {
        return Math.max(...this.toMagnitude(arr));
    }
    
    getArgmax(arr) {
        return this.toMagnitude(arr).map(
            (value, index, array) => [value, index]
        ).reduce(
            (previousValue, currentValue, currentIndex, array) => {
                return currentValue[0] > previousValue[0] ? 
                    currentValue : previousValue;
            }
        )[1];
    }
}

// fft = new miniFFT(8);
// let arr = [0,0,2,3,4,0,0,0];
// fft.analyze(arr);