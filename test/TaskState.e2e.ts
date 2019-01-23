import { asyncParallelForEach } from '../src/'

const TIMER_DELAY = 150 // ms

describe('TaskState', () => {
  it('works', async () => {
    const coll = ['a', 'b', 'c']
    const maxTry = 3
    const sleepMs = 500
    const currentTrial: Array<any> = []
    const timeElapsed: Array<any> = []
    const isFirstTrial: Array<any> = []
    const isLastTrial: Array<any> = []
    let incremented = false
    const result = await asyncParallelForEach(
      coll,
      1,
      async (item, index, taskState) => {
        currentTrial.push(taskState.currentTrial)
        timeElapsed.push(taskState.timeElapsed())
        isFirstTrial.push(taskState.isFirstTrial())
        isLastTrial.push(taskState.isLastTrial())
        if (item === 'c' && taskState.isLastTrial() && !incremented) {
          incremented = true
          taskState.incrementMaxTry()
          throw Error('error here')
        }
        if (taskState.currentTrial < maxTry) {
          throw Error('error here')
        }
      }, {
        times: maxTry,
        interval: sleepMs,
        errorFilter: (error) => error.message === 'error here'
      })
    expect(currentTrial).toEqual([1, 2, 3, 1, 2, 3, 1, 2, 3, 4])
    expect(timeElapsed.length).toEqual(maxTry * coll.length + 1)
    for (let [i, t] of Object.entries(timeElapsed.slice(0, timeElapsed.length - 1))) {
      const j = Number(i) % coll.length
      expect(t).toBeGreaterThanOrEqual(sleepMs * j)
      expect(t).toBeLessThanOrEqual(sleepMs * (j + 1) + TIMER_DELAY)
    }
    expect(timeElapsed[timeElapsed.length - 1]).toBeGreaterThanOrEqual(sleepMs * 3)
    expect(timeElapsed[timeElapsed.length - 1]).toBeLessThanOrEqual(sleepMs * 3 + TIMER_DELAY)
    expect(isFirstTrial).toEqual([true, false, false, true, false, false, true, false, false, false])
    expect(isLastTrial).toEqual([false, false, true, false, false, true, false, false, true, true])
  })

  it('works if interval and errorFilter use default value', async () => {
    const coll = ['a']
    const maxTry = 3
    const timeElapsed: Array<any> = []
    const result = await asyncParallelForEach(
      coll,
      1,
      async (item, index, taskState) => {
        timeElapsed.push(taskState.timeElapsed())
        throw Error('error here')
      }, { times: maxTry })
    for (let t of timeElapsed) {
      expect(t).toBeGreaterThanOrEqual(0)
      expect(t).toBeLessThanOrEqual(TIMER_DELAY)
    }
  })

  it('works if incrementMaxTry doesn\'t use default value', async () => {
    const coll = ['a']
    const maxTry = 3
    let incremented = false
    const iteratee = jest.fn(async (item, index, taskState) => {
      if (taskState.isLastTrial() && !incremented) {
        incremented = true
        taskState.incrementMaxTry(2)
      }
      throw Error('error here')
    })
    const result = await asyncParallelForEach(
      coll,
      1,
      iteratee,
      { times: maxTry })
    expect(iteratee).toBeCalledTimes(5)
  })
})