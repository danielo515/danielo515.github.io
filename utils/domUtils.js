
export const isActiveSection = (box, height, percent = 50) => {

        percent = percent / 100; // make the percent a decimal number, eg 0.5
        const requiredVisibleSectionSize = height * percent;
        const onePercent = height * 0.01;
        return box.top <= onePercent && box.bottom > requiredVisibleSectionSize; // more than x should be visible
}

let scrollHelper;
export function scrollTo(section_name){

      if(!section_name.trim()) return;
      if(!scrollHelper) scrollHelper = new ScrollHelper();
      var endlocation = window.pageYOffset
                        + document.getElementById(section_name).getBoundingClientRect().top
                        + 1;
      scrollHelper.startAnimateScroll(endlocation);
}

export function scrollToTop(){
      if(!scrollHelper) scrollHelper = new ScrollHelper();  
      scrollHelper.startAnimateScroll(0);
}

class ScrollHelper{
  constructor(){
    this.timeLapsed = 0;
    this.duration = 1000;
    this.interval = 16;
  }
  startAnimateScroll (endLocation, endCb) {
    clearInterval(this.animationInterval);
    this.timeLapsed = 0;
    this.startLocation =window.pageYOffset;
    this.animationInterval = setInterval(this.loopAnimateScroll(endLocation,endCb), this.interval);
  }
  loopAnimateScroll(endLocation, cb) {
    let _cb = cb;
    return ()=>{
      this.timeLapsed += this.interval;
      if(this.duration<=this.timeLapsed){
        clearInterval(this.animationInterval);
        window.scroll( 0, endLocation);
        _cb && _cb();
      }
      let distance = endLocation-this.startLocation;
      let speed = distance/(this.duration);
      let time = ( this.timeLapsed / this.duration);
      let pattern = time < 0.5 ? 2 * time * time : -1 + (4 - 2 * time) * time;
      let position = this.startLocation+ distance * pattern;//this.startLocation + (  speed );
      window.scroll( 0, Math.floor(position) );
      //stopAnimateScroll(position, endLocation);
    }
  };

  stopAnimateScroll(position, endLocation) {
    var currentLocation = window.pageYOffset;
    if ( position == endLocation || currentLocation == endLocation) {
      clearInterval(this.animationInterval);
    }
  };
}
