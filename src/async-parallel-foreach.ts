import { eachOfLimit } from 'async'
import TaskState from './TaskState'
import { sleep } from './utils'

export function asyncParallelForEach<T, C extends T[] | IterableIterator<T> | { [key: string]: T }> (
  coll: C,
  parallelLimit: number = -1,
  iteratee: (item: T, index: string | number | any, taskState: TaskState) => Promise<any>,
  eachMaxTry: number | { times: number, interval?: number | ((retryCount: number) => number), errorFilter?: (error: Error) => boolean } = {
    times: 1,
    interval: 0
  }
): Promise<C extends T[] ? Array<{ value: any, error: Error }> : { [key: string]: { value: any, error: Error } }> {
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
      async (item, index, callback) => {

        const taskState = new TaskState({ maxTry: eachMaxTry })

        let done = false
        let value
        let error
        while (!done) {
          taskState._try()
          try {
            value = await Promise.resolve(iteratee(item, index, taskState))
            done = true
          } catch (err) {
            taskState._gotError(err)
            if (taskState._shouldRetry(err)) {
              await sleep(taskState._getDelayInterval())
            } else {
              error = err
              done = true
            }
          }
        }
        taskState._finish()

        if (typeof error === 'undefined') {
          results[index] = { value }
        } else {
          results[index] = { error }
        }
        callback()
        doneCnt++
        if (doneCnt === collLength) { // end
          resolve(results)
        }
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