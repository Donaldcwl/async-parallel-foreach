type IntervalFn = (retryCount: number) => number

export default class TaskState {
  constructor (props) {
    if (typeof props.maxTry === 'number') {
      this.maxTry = props.maxTry
    } else {
      this.maxTry = props.maxTry.times
      if (typeof props.maxTry.interval !== 'undefined') {
        this.interval = props.maxTry.interval
      }
      if (typeof props.maxTry.errorFilter !== 'undefined') {
        this.errorFilter = props.maxTry.errorFilter
      }
    }
  }

  private startTime = Date.now()

  private maxTry = 1

  private readonly interval: number | IntervalFn = 0

  private readonly errorFilter = (_) => true

  currentTrial = 0

  failedReasons: Error[] = []

  finished = false

  isFirstTrial () {
    return this.currentTrial === 1
  }

  isLastTrial () {
    return this.currentTrial >= this.maxTry
  }

  timeElapsed () {
    return Date.now() - this.startTime
  }

  incrementMaxTry (increment: number = 1) {
    this.maxTry += increment
  }

  _shouldRetry (error: Error): Boolean {
    return this.errorFilter(error) && this.currentTrial < this.maxTry
  }

  _getDelayInterval (): Number {
    if (typeof this.interval === 'function') {
      return this.interval(this.currentTrial + 1)
    } else {
      return this.interval
    }
  }

  _try () {
    this.currentTrial++
  }

  _gotError (err: Error) {
    this.failedReasons.push(err)
  }

  _finish() {
    this.finished = true
  }

}