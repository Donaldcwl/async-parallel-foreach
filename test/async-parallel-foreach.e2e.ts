import { asyncParallelForEach, BACK_OFF_RETRY } from '../src/'

const TIMER_DELAY = 150 // ms

function sleep (ms) {
  return new Promise(resolve => setTimeout(() => resolve(), ms))
}

async function runCollIsArray (coll: Array<any>, parallelLimit, sleepMs = 0, errorOnIndex = []) {
  const startTime = Date.now()
  const result = await asyncParallelForEach(
    coll,
    parallelLimit,
    async (item, index) => {
      sleepMs > 0 && await sleep(sleepMs)
      // @ts-ignore
      if (errorOnIndex.includes(index)) {
        throw new Error('some error')
      }
      expect(index).toBeGreaterThanOrEqual(0)
      expect(coll[index]).toEqual(item)
      return item
    })
  const timeElapsed = Date.now() - startTime
  if (errorOnIndex.length === 0) {// no error
    result.forEach(({ value, error }, index) => {
      expect(value).toEqual(coll[index])
    })
  } else { // has error
    result.forEach(({ value, error }, index) => {
      // @ts-ignore
      if (errorOnIndex.includes(index)) {
        expect(value).toBeUndefined()
        expect(error).toBeInstanceOf(Error)
      } else {
        expect(value).toEqual(coll[index])
        expect(error).toBeUndefined()

      }
    })

  }
  return [result, timeElapsed]
}

async function runCollIsObject<T> (coll: {[key: string]: T}, parallelLimit, sleepMs = 0, errorOnKey = []) {
  const startTime = Date.now()
  const result = await asyncParallelForEach(
    coll,
    parallelLimit,
    async (value, key) => {
      sleepMs > 0 && await sleep(sleepMs)
      // @ts-ignore
      if (errorOnKey.includes(key)) {
        throw new Error('some error')
      }
      expect(key in coll).toBeTruthy()
      expect(coll[key]).toEqual(value)
      return value
    })
  const timeElapsed = Date.now() - startTime
  return [result, timeElapsed]
}

describe('Without error', () => {
  describe('Unlimited Parallel mode', () => {
    it('works if parallelLimit uses default value', async () => {
      const coll = ['a', 'b', 'c']
      const sleepMs = 500
      const [result, timeElapsed] = await runCollIsArray(coll, undefined, sleepMs)
      expect(timeElapsed).toBeGreaterThanOrEqual(sleepMs)
      expect(timeElapsed).toBeLessThanOrEqual(sleepMs + TIMER_DELAY)
    })

    it('works if coll is Array', async () => {
      const coll = ['a', 'b', 'c']
      const sleepMs = 500
      const [result, timeElapsed] = await runCollIsArray(coll, -1, sleepMs)
      expect(timeElapsed).toBeGreaterThanOrEqual(sleepMs)
      expect(timeElapsed).toBeLessThanOrEqual(sleepMs + TIMER_DELAY)
    })

    it('works if coll is Object', async () => {
      const coll = {
        a: 1,
        b: 'string',
        c: ['array'],
        d: { nested: 'object' }
      }
      const sleepMs = 500
      const [result, timeElapsed] = await runCollIsObject(coll, -1, sleepMs)
      expect(result).toEqual({
        a: { value: 1 },
        b: { value: 'string' },
        c: { value: ['array'] },
        d: { value: { nested: 'object' } }
      })
      expect(timeElapsed).toBeGreaterThanOrEqual(sleepMs)
      expect(timeElapsed).toBeLessThanOrEqual(sleepMs + TIMER_DELAY)
    })
  })

  describe('Limited Parallel mode', () => {
    it('works if coll is Array', async () => {
      const coll = ['a', 'b', 'c']
      const sleepMs = 500
      const parallelLimit = 2
      const [result, timeElapsed] = await runCollIsArray(coll, parallelLimit, sleepMs)
      expect(timeElapsed).toBeGreaterThanOrEqual(Math.ceil(coll.length / parallelLimit) * sleepMs)
      expect(timeElapsed).toBeLessThanOrEqual(Math.ceil(coll.length / parallelLimit) * sleepMs + TIMER_DELAY)
    })

    it('works if coll is Object', async () => {
      const coll = {
        a: 1,
        b: 'string',
        c: ['array'],
        d: { nested: 'object' }
      }
      const sleepMs = 500
      const parallelLimit = 2
      const [result, timeElapsed] = await runCollIsObject(coll, parallelLimit, sleepMs)
      expect(result).toEqual({
        a: { value: 1 },
        b: { value: 'string' },
        c: { value: ['array'] },
        d: { value: { nested: 'object' } }
      })
      expect(timeElapsed).toBeGreaterThanOrEqual(Math.ceil(Object.entries(coll).length / parallelLimit) * sleepMs)
      expect(timeElapsed).toBeLessThanOrEqual(Math.ceil(Object.entries(coll).length / parallelLimit) * sleepMs + TIMER_DELAY)
    })
  })

  describe('Sequential mode', () => {
    it('works if coll is Array', async () => {
      const coll = ['a', 'b', 'c']
      const sleepMs = 500
      const [result, timeElapsed] = await runCollIsArray(coll, 1, sleepMs)
      expect(timeElapsed).toBeGreaterThanOrEqual(coll.length * sleepMs)
      expect(timeElapsed).toBeLessThanOrEqual(coll.length * sleepMs + TIMER_DELAY)
    })

    it('works if coll is Object', async () => {
      const coll = {
        a: 1,
        b: 'string',
        c: ['array'],
        d: { nested: 'object' }
      }
      const sleepMs = 500
      const [result, timeElapsed] = await runCollIsObject(coll, 1, sleepMs)
      expect(result).toEqual({
        a: { value: 1 },
        b: { value: 'string' },
        c: { value: ['array'] },
        d: { value: { nested: 'object' } }
      })
      expect(timeElapsed).toBeGreaterThanOrEqual(Object.entries(coll).length * sleepMs)
      expect(timeElapsed).toBeLessThanOrEqual(Object.entries(coll).length * sleepMs + TIMER_DELAY)
    })
  })
})

describe('With error', () => {
  describe('Unlimited Parallel mode', () => {
    it('works if coll is Array', async () => {
      const coll = ['a', 'b', 'c']
      const sleepMs = 500
      // @ts-ignore
      const [result, timeElapsed] = await runCollIsArray(coll, -1, sleepMs, [1])
      expect(timeElapsed).toBeGreaterThanOrEqual(sleepMs)
      expect(timeElapsed).toBeLessThanOrEqual(sleepMs + TIMER_DELAY)
    })

    it('works if coll is Object', async () => {
      const coll = {
        a: 1,
        b: 'string',
        c: ['array'],
        d: { nested: 'object' }
      }
      const sleepMs = 500
      // @ts-ignore
      const [result, timeElapsed] = await runCollIsObject(coll, -1, sleepMs, ['c', 'd'])
      expect(result.a).toEqual({ value: 1 })
      expect(result.b).toEqual({ value: 'string' })
      expect(Object.keys(result.c)).toEqual(['error']) // only have error key
      expect(Object.keys(result.d)).toEqual(['error']) // only have error key
      expect(result.c.error).toEqual(expect.any(Error))
      expect(result.d.error).toEqual(expect.any(Error))
      expect(timeElapsed).toBeGreaterThanOrEqual(sleepMs)
      expect(timeElapsed).toBeLessThanOrEqual(sleepMs + TIMER_DELAY)
    })
  })

  describe('Limited Parallel mode', () => {
    it('works if coll is Array', async () => {
      const coll = ['a', 'b', 'c']
      const sleepMs = 500
      const parallelLimit = 2
      // @ts-ignore
      const [result, timeElapsed] = await runCollIsArray(coll, parallelLimit, sleepMs, [1])
      expect(timeElapsed).toBeGreaterThanOrEqual(Math.ceil(coll.length / parallelLimit) * sleepMs)
      expect(timeElapsed).toBeLessThanOrEqual(Math.ceil(coll.length / parallelLimit) * sleepMs + TIMER_DELAY)
    })

    it('works if coll is Object', async () => {
      const coll = {
        a: 1,
        b: 'string',
        c: ['array'],
        d: { nested: 'object' }
      }
      const sleepMs = 500
      const parallelLimit = 2
      // @ts-ignore
      const [result, timeElapsed] = await runCollIsObject(coll, parallelLimit, sleepMs, ['c', 'd'])
      expect(result.a).toEqual({ value: 1 })
      expect(result.b).toEqual({ value: 'string' })
      expect(Object.keys(result.c)).toEqual(['error']) // only have error key
      expect(Object.keys(result.d)).toEqual(['error']) // only have error key
      expect(result.c.error).toEqual(expect.any(Error))
      expect(result.d.error).toEqual(expect.any(Error))
      expect(timeElapsed).toBeGreaterThanOrEqual(Math.ceil(Object.entries(coll).length / parallelLimit) * sleepMs)
      expect(timeElapsed).toBeLessThanOrEqual(Math.ceil(Object.entries(coll).length / parallelLimit) * sleepMs + TIMER_DELAY)
    })
  })

  describe('Sequential mode', () => {
    it('works if coll is Array', async () => {
      const coll = ['a', 'b', 'c']
      const sleepMs = 500
      // @ts-ignore
      const [result, timeElapsed] = await runCollIsArray(coll, 1, sleepMs, [1])
      expect(timeElapsed).toBeGreaterThanOrEqual(coll.length * sleepMs)
      expect(timeElapsed).toBeLessThanOrEqual(coll.length * sleepMs + TIMER_DELAY)
    })

    it('works if coll is Object', async () => {
      const coll = {
        a: 1,
        b: 'string',
        c: ['array'],
        d: { nested: 'object' }
      }
      const sleepMs = 500
      // @ts-ignore
      const [result, timeElapsed] = await runCollIsObject(coll, 1, sleepMs, ['c', 'd'])
      expect(result.a).toEqual({ value: 1 })
      expect(result.b).toEqual({ value: 'string' })
      expect(Object.keys(result.c)).toEqual(['error']) // only have error key
      expect(Object.keys(result.d)).toEqual(['error']) // only have error key
      expect(result.c.error).toEqual(expect.any(Error))
      expect(result.d.error).toEqual(expect.any(Error))
      expect(timeElapsed).toBeGreaterThanOrEqual(Object.entries(coll).length * sleepMs)
      expect(timeElapsed).toBeLessThanOrEqual(Object.entries(coll).length * sleepMs + TIMER_DELAY)
    })
  })

  describe('Retry', () => {
    describe('Unlimited Parallel mode', () => {
      it('works if coll all retries failed', async () => {
        const coll = ['a', 'b', 'c', 'd']
        const sleepMs = 500
        const eachMaxTry = 5
        const parallelLimit = -1
        const errorOnIndex = [0, 1, 3]
        const ineratee = jest.fn(async function (item, index) {
          sleepMs > 0 && await sleep(sleepMs)
          // @ts-ignore
          if (errorOnIndex.includes(index)) {
            throw new Error('some error')
          }
          expect(index).toBeGreaterThanOrEqual(0)
          expect(coll[index]).toEqual(item)
          return item
        })
        const startTime = Date.now()
        const result = await asyncParallelForEach(coll, parallelLimit, ineratee, eachMaxTry)
        const timeElapsed = Date.now() - startTime
        // correct number of errors
        expect(result.filter((_, index) => errorOnIndex.includes(index)).map(({ error }) => !!error).length).toEqual(errorOnIndex.length)
        // correct number of success
        expect(result.filter((_, index) => !errorOnIndex.includes(index)).map(({ value }) => !!value).length).toEqual(coll.length - errorOnIndex.length)
        // correct number of function executions with reties
        expect(ineratee).toHaveBeenCalledTimes(coll.length - errorOnIndex.length + errorOnIndex.length * eachMaxTry)

        expect(timeElapsed).toBeGreaterThanOrEqual(eachMaxTry * sleepMs)
        expect(timeElapsed).toBeLessThanOrEqual(eachMaxTry * sleepMs + TIMER_DELAY)
      })

      it('works if coll retry successfully', async () => {
        const coll = ['a', 'b', 'c', 'd']
        const sleepMs = 500
        const eachMaxTry = 5
        const parallelLimit = -1
        const errorOnIndex = [0, 1, 3]
        const retriedIndex: number[] = []
        const ineratee = jest.fn(async function (item, index) {
          sleepMs > 0 && await sleep(sleepMs)
          // @ts-ignore
          if (errorOnIndex.includes(index) && !retriedIndex.includes(index)) { // only throw error once on each index
            retriedIndex.push(index)
            throw new Error('some error')
          }
          expect(index).toBeGreaterThanOrEqual(0)
          expect(coll[index]).toEqual(item)
          return item
        })
        const startTime = Date.now()
        const result = await asyncParallelForEach(coll, parallelLimit, ineratee, eachMaxTry)
        const timeElapsed = Date.now() - startTime
        // all success at the end
        expect(result.map(({ value }) => value)).toEqual(coll)
        // correct number of function executions with reties
        expect(ineratee).toHaveBeenCalledTimes(coll.length - errorOnIndex.length + errorOnIndex.length * 2)

        expect(timeElapsed).toBeGreaterThanOrEqual(2 * sleepMs)
        expect(timeElapsed).toBeLessThanOrEqual(2 * sleepMs + TIMER_DELAY)
      })
    })

    describe('Sequential mode', () => {
      it('works if coll all retries failed', async () => {
        const coll = ['a', 'b', 'c', 'd']
        const sleepMs = 250
        const eachMaxTry = 5
        const parallelLimit = 1
        const errorOnIndex = [0, 1, 3]
        const ineratee = jest.fn(async function (item, index) {
          sleepMs > 0 && await sleep(sleepMs)
          // @ts-ignore
          if (errorOnIndex.includes(index)) {
            throw new Error('some error')
          }
          expect(index).toBeGreaterThanOrEqual(0)
          expect(coll[index]).toEqual(item)
          return item
        })
        const startTime = Date.now()
        const result = await asyncParallelForEach(coll, parallelLimit, ineratee, eachMaxTry)
        const timeElapsed = Date.now() - startTime
        // correct number of errors
        expect(result.filter((_, index) => errorOnIndex.includes(index)).map(({ error }) => !!error).length).toEqual(errorOnIndex.length)
        // correct number of success
        expect(result.filter((_, index) => !errorOnIndex.includes(index)).map(({ value }) => !!value).length).toEqual(coll.length - errorOnIndex.length)
        // correct number of function executions with reties
        expect(ineratee).toHaveBeenCalledTimes(coll.length - errorOnIndex.length + errorOnIndex.length * eachMaxTry)

        const expectedTimeElapsed = (coll.length - errorOnIndex.length) * sleepMs + errorOnIndex.length * eachMaxTry * sleepMs
        expect(timeElapsed).toBeGreaterThanOrEqual(expectedTimeElapsed)
        expect(timeElapsed).toBeLessThanOrEqual(expectedTimeElapsed + TIMER_DELAY)
      })

      it('works if coll retry successfully', async () => {
        const coll = ['a', 'b', 'c', 'd']
        const sleepMs = 500
        const eachMaxTry = 5
        const parallelLimit = 1
        const errorOnIndex = [0, 1, 3]
        const retriedIndex: number[] = []
        const ineratee = jest.fn(async function (item, index) {
          sleepMs > 0 && await sleep(sleepMs)
          // @ts-ignore
          if (errorOnIndex.includes(index) && !retriedIndex.includes(index)) { // only throw error once on each index
            retriedIndex.push(index)
            throw new Error('some error')
          }
          expect(index).toBeGreaterThanOrEqual(0)
          expect(coll[index]).toEqual(item)
          return item
        })
        const startTime = Date.now()
        const result = await asyncParallelForEach(coll, parallelLimit, ineratee, eachMaxTry)
        const timeElapsed = Date.now() - startTime
        // all success at the end
        expect(result.map(({ value }) => value)).toEqual(coll)
        // correct number of function executions with reties
        expect(ineratee).toHaveBeenCalledTimes(coll.length - errorOnIndex.length + errorOnIndex.length * 2)

        const expectedTimeElapsed = (coll.length - errorOnIndex.length) * sleepMs + errorOnIndex.length * 2 * sleepMs
        expect(timeElapsed).toBeGreaterThanOrEqual(expectedTimeElapsed)
        expect(timeElapsed).toBeLessThanOrEqual(expectedTimeElapsed + TIMER_DELAY)
      })
    })

    it('works if retry with exponential delay, Sequential mode, all retries failed', async () => {
      const coll = ['a', 'b']
      const sleepMs = 500
      const eachMaxTry = { times: 5, interval: BACK_OFF_RETRY.exponential() }
      const parallelLimit = 1
      const errorOnIndex = [0]

      const totalDelayed = (100 + 200 + 400 + 800) * errorOnIndex.length
      const expectedTimeElapsed = (coll.length - errorOnIndex.length) * sleepMs + errorOnIndex.length * eachMaxTry.times * sleepMs
      jest.setTimeout(expectedTimeElapsed + totalDelayed + TIMER_DELAY + TIMER_DELAY)

      const ineratee = jest.fn(async function (item, index) {
        sleepMs > 0 && await sleep(sleepMs)
        // @ts-ignore
        if (errorOnIndex.includes(index)) {
          throw new Error('some error')
        }
        expect(index).toBeGreaterThanOrEqual(0)
        expect(coll[index]).toEqual(item)
        return item
      })
      const startTime = Date.now()
      const result = await asyncParallelForEach(coll, parallelLimit, ineratee, eachMaxTry)
      const timeElapsed = Date.now() - startTime
      // correct number of errors
      expect(result.filter((_, index) => errorOnIndex.includes(index)).map(({ error }) => !!error).length).toEqual(errorOnIndex.length)
      // correct number of success
      expect(result.filter((_, index) => !errorOnIndex.includes(index)).map(({ value }) => !!value).length).toEqual(coll.length - errorOnIndex.length)
      // correct number of function executions with reties
      expect(ineratee).toHaveBeenCalledTimes(coll.length - errorOnIndex.length + errorOnIndex.length * eachMaxTry.times)

      expect(timeElapsed).toBeGreaterThanOrEqual(expectedTimeElapsed + totalDelayed)
      expect(timeElapsed).toBeLessThanOrEqual(expectedTimeElapsed + totalDelayed + TIMER_DELAY)
    })

    it('works if retry with random delay, Sequential mode, all retries failed', async () => {
      const coll = ['a', 'b']
      const sleepMs = 500
      const [minDelayMs, maxDelayMs] = [100, 3000]
      const eachMaxTry = { times: 5, interval: BACK_OFF_RETRY.randomBetween(minDelayMs, maxDelayMs) }
      const parallelLimit = 1
      const errorOnIndex = [0]

      const minTotalDelayed = eachMaxTry.times * minDelayMs * errorOnIndex.length
      const maxTotalDelayed = eachMaxTry.times * maxDelayMs * errorOnIndex.length
      const expectedTimeElapsed = (coll.length - errorOnIndex.length) * sleepMs + errorOnIndex.length * eachMaxTry.times * sleepMs
      jest.setTimeout(expectedTimeElapsed + maxTotalDelayed + TIMER_DELAY + maxTotalDelayed)

      const ineratee = jest.fn(async function (item, index) {
        sleepMs > 0 && await sleep(sleepMs)
        // @ts-ignore
        if (errorOnIndex.includes(index)) {
          throw new Error('some error')
        }
        expect(index).toBeGreaterThanOrEqual(0)
        expect(coll[index]).toEqual(item)
        return item
      })
      const startTime = Date.now()
      const result = await asyncParallelForEach(coll, parallelLimit, ineratee, eachMaxTry)
      const timeElapsed = Date.now() - startTime
      // correct number of errors
      expect(result.filter((_, index) => errorOnIndex.includes(index)).map(({ error }) => !!error).length).toEqual(errorOnIndex.length)
      // correct number of success
      expect(result.filter((_, index) => !errorOnIndex.includes(index)).map(({ value }) => !!value).length).toEqual(coll.length - errorOnIndex.length)
      // correct number of function executions with reties
      expect(ineratee).toHaveBeenCalledTimes(coll.length - errorOnIndex.length + errorOnIndex.length * eachMaxTry.times)

      expect(timeElapsed).toBeGreaterThanOrEqual(expectedTimeElapsed + minTotalDelayed)
      expect(timeElapsed).toBeLessThanOrEqual(expectedTimeElapsed + maxTotalDelayed + TIMER_DELAY)
    })
  })
})