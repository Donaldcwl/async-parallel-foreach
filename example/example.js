const { asyncParallelForEach, BACK_OFF_RETRY } = require('async-parallel-foreach')

if (require.main === module) {
  (async () => {
    let results
    const coll = ['a', 'b', 'c', 'd', 'e']

    // Sequential
    console.log('Sequential:')
    results = await asyncParallelForEach(
      coll,
      1,
      async (item, index) => {
        console.log(new Date(), 'processing item', item)
        await new Promise(resolve => setTimeout(() => resolve(), 1000)) // simulate async function, sleep for 1 second
        return item
      })
    console.log(results)
    console.log(JSON.stringify(results) === JSON.stringify([{ value: 'a' }, { value: 'b' }, { value: 'c' }, { value: 'd' }, { value: 'e' }])) // true

    console.log('=======================\n')

    // Unlimited Parallel
    console.log('Unlimited Parallel:')
    results = await asyncParallelForEach(
      coll,
      -1,
      async (item, index) => {
        console.log(new Date(), 'processing item', item)
        await new Promise(resolve => setTimeout(() => resolve(), 1000)) // simulate async function, sleep for 1 second
        return item
      })
    console.log(results)
    console.log(JSON.stringify(results) === JSON.stringify([{ value: 'a' }, { value: 'b' }, { value: 'c' }, { value: 'd' }, { value: 'e' }])) // true

    console.log('=======================\n')

    // Limited Parallel
    console.log('Limited Parallel:')
    results = await asyncParallelForEach(
      coll,
      2,
      async (item, index) => {
        console.log(new Date(), 'processing item', item)
        await new Promise(resolve => setTimeout(() => resolve(), 1000)) // simulate async function, sleep for 1 second
        return item
      })
    console.log(results)
    console.log(JSON.stringify(results) === JSON.stringify([{ value: 'a' }, { value: 'b' }, { value: 'c' }, { value: 'd' }, { value: 'e' }])) // true

    console.log('=======================\n')

    // With error and retry
    console.log('With error and retry:')
    results = await asyncParallelForEach(
      coll,
      2,
      async (item, index) => {
        console.log(new Date(), 'processing item', item)
        await new Promise(resolve => setTimeout(() => resolve(), 1000)) // simulate async function, sleep for 1 second
        if (item === 'c') {
          throw new Error('some error')
        }
        return item
      }, {
        times: 4,
        interval: BACK_OFF_RETRY.exponential()
      })
    console.log(results)

  })()
}