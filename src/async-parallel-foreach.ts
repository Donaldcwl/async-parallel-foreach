import { eachOfLimit, IterableCollection, retry } from 'async'

export function asyncParallelForEach<T> (
  coll: IterableCollection<T>,
  parallelLimit: number = 1,
  iteratee: (item: T, index: number | string | any) => Promise<any>,
  eachMaxTry: number | { times: number, interval: number | ((retryCount: number) => number) } = { times: 1, interval: 0 }
): Promise<Array<{ value: any, error: Error }>> {
  return new Promise((resolve) => {
    const collLength = Array.isArray(coll) ? coll.length : Object.keys(coll).length
    if (parallelLimit === -1) {
      parallelLimit = collLength
    }
    const results: any = Array.isArray(coll) ? [] : {}
    let doneCnt = 0
    eachOfLimit(
      coll,
      parallelLimit,
      (item, index, callback) => {
        retry(
          eachMaxTry,
          (callback) => {
            Promise.resolve(iteratee(item, index))
              .then((...args) => callback(null, ...args))
              .catch(callback)
          },
          (err, result) => {
            if (err) {
              results[index] = { error: err }
            } else {
              results[index] = { value: result }
            }
            doneCnt++
            if (doneCnt === collLength) { // end
              resolve(results)
            }
            callback()
          }
        )
      }
    )
  })
}

export namespace BACK_OFF_RETRY {
  export function randomBetween (minMs: number, maxMs: number) {
    return function randomBackoff () {
      return Math.floor(Math.random() * (maxMs - minMs + 1) + minMs)
    }
  }

  export function exponential () {
    return function exponentialBackoff (retryCount) { // retryCount start from 2
      // start from 100, then 200, 400, 800, 1600, ....
      return 50 * Math.pow(2, retryCount - 1)
    }
  }
}