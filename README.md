# Async parallel forEach #
[![npm](https://img.shields.io/npm/v/async-parallel-foreach.svg)](https://www.npmjs.com/package/async-parallel-foreach)
[![npm](./coverage/badge.svg)](https://github.com/Donaldcwl/async-parallel-foreach)
[![npm](https://img.shields.io/npm/l/async-parallel-foreach.svg)](https://github.com/Donaldcwl/async-parallel-foreach)

Javascript module to perform ***async flow control*** on collection/iterable/dictionary ***in controlled parallel*** and make ***retry easily*** when error occurred

## Features ##
- iterate collection (array/object/iterator) and ***run async function on each item*** in a collection
- control the ***concurrency*** of running async function on the items
- ***auto retry*** when error occurred
- ***delayed retry***

## Install ##
```bash
npm install async-parallel-foreach async --save
or
yarn add async-parallel-foreach async
```

## How to use this module in your project? ##
Frontend: used in framework like React, Angular, Vue etc
(work with bundler like webpack and rollup)
```javascript
import { asyncParallelForEach, BACK_OFF_RETRY } from 'async-parallel-foreach'
```

Backend: node.js
```javascript
const { asyncParallelForEach, BACK_OFF_RETRY } = require('async-parallel-foreach')
```

## API ##
### Main function ###
#### asyncParallelForEach(coll: Collection, parallelLimit: number, iteratee: Function[, eachMaxTry]): Promise\<Array<{ value: any, error: Error }>> ####
- coll - can be Array, Object (dictionary), Iterable
- parallelLimit - number of iteratee functions to be executed in parallel at any time, set `parallelLimit = -1` for unlimited parallelization (all items will start process at once)
- iteratee - the function that you define to process each item in "coll"
    - if "coll" is array, it will call with (value, index, taskState) 
    - if "coll" is object, it will call with (value, key, taskState)
    - "taskState" - corresponding to process an item
        - attributes:
            - currentTrial - the current trial, start from 1, up to eachMaxTry if any
            - failedReasons - array of error in previous trials (work with "eachMaxTry")
        - methods:
            - timeElapsed() - the time elapsed since first trial
            - isFirstTrial() - is it the first time to process this item (work with "eachMaxTry")
            - isLastTrial() - is it the last trial to process this item (work with "eachMaxTry")
            - incrementMaxTry(incrementNumber) - increase the nubmer of max try for this task
- eachMaxTry (optional) - maximum number of times each item will be processed by "iteratee" when error occurred. if omitted, each item will only processed once no matter error occurred or not.
    - if `eachMaxTry = 2`, then the item will be retried 1 time when there is error throwed in the iteratee function
    - add delay before retry
        - set `eachMaxTry = { times: 2, interval: 1000 }` // wait for 1000 ms before retry
        - interval can also accept function returning the interval in ms
            - e.g. `eachMaxTry = { times: 2, interval: (retryCount) => retryCount * 1000 }` // retryCount start from 2 which means it is the 2nd trial
    - filter specific error to retry
        - set `eachMaxTry = { times: 2, errorFilter: filterFn }`
        - e.g. `const filterFn = function (error) { return error.message === 'some error message which may throw in your "iteratee" function and you want to retry it' }`
    - all together
        - e.g. `eachMaxTry = {times: 2, interval: 1000, errorFilter: filterFn }`
### BACK_OFF_RETRY strategies ###
- predefined interval function you may use
#### BACK_OFF_RETRY.randomBetween(minMs: number, maxMs: number) ####
- e.g. `eachMaxTry = { times: 5, interval: BACK_OFF_RETRY.randomBetween(100, 3000) }` // random delay between 100ms and 3000ms
#### BACK_OFF_RETRY.exponential() ####
- start from 100ms, then 200ms, 400ms, 800ms, 1600ms, ...

([details api document in here](http://htmlpreview.github.io/?https://github.com/Donaldcwl/async-parallel-foreach/blob/master/docs/index.html))

## Usage ##
- Basic Example
```javascript
const imageUrls = ['https://this-image-is-fine.jpg', 'https://this-image-does-exist-404.jpg', 'https://another-fine-image.jpg', /*......*/]

processImages(imageUrls).then(successFn).catch(errorCallback)

async function processImages(imageUrls) {

  const parallelLimit = 5 // process at most 5 images simultaneously
  
  const results = await asyncParallelForEach(imageUrls, parallelLimit, async (imageUrl, index, taskState) => {
    
    const filePath = await downloadImage(imageUrl)
    
    const convertedFilePath = await covertImageFormat(filePath)
    
    const compressFilePath = await compressImage(convertedFilePath)
    
    const s3ImageUrl = await uploadToS3(compressFilePath)
    
    // above operations may fails (throw Error) for any reason e.g. Network connection problem, image corruption, etc
    
    return s3ImageUrl
    
  }, { 
    times: 10,  // try at most 10 times
    interval: BACK_OFF_RETRY.exponential()
  })
  
  // results is in format [
  //   {value: '<the s3ImageUrl returned in the iteratee function corresponding to this-image-is-fine.jpg>' },
  //   {error: new Error('404 - Image not found')},
  //   {value: '<the s3ImageUrl returned in the iteratee function corresponding to another-fine-image.jpg>' },
  //   ......
  // ]
  
  return results
}
```
- Advanced Example
```javascript
const imageUrls = ['https://this-image-is-fine.jpg', 'https://this-image-does-exist-404.jpg', 'https://another-fine-image.jpg', /*......*/]

processImages(imageUrls).then(successFn).catch(errorCallback)

async function processImages(imageUrls) {

  const parallelLimit = 5 // process at most 5 images simultaneously
  const maxTryTimes = 10
  
  const results = await asyncParallelForEach(imageUrls, parallelLimit, async (imageUrl, index, taskState) => {
    
    if (taskState.isLastTrial()) {
      if (itIsWorthAnExtryTrial()) {
        taskState.incrementMaxTry(1)
      } else {
          // since maxTryTimes is 10, we have already tried 9 times, just set it to default image as a last resort
          Logger.error({ imageUrl, failedReasons: taskState.failedReasons }) 
          return defaultImageUrl
      }
    }
    
    if (taskState.timeElapsed() > 60 * 1000) { // since this item has been processed for 60 second, since its first trial
      Logger.error({ imageUrl, failedReasons: [...taskState.failedReasons, new Error('timeout')] }) 
      return defaultImageUrl
    }
    
    if (taskState.currentTrial === 2) { // for the second trial, try to download from another CDN (may be)
      imageUrls = imageUrls.replace('<original domain>', '<new cdn domain>')
    }
    
    const filePath = await downloadImage(imageUrl)
    
    const convertedFilePath = await covertImageFormat(filePath)
    
    const compressFilePath = await compressImage(convertedFilePath)
    
    const s3ImageUrl = await uploadToS3(compressFilePath)
    
    // above operations may fails (throw Error) for any reason e.g. Network connection problem, image corruption, etc
    
    return s3ImageUrl
    
  }, { 
    times: maxTryTimes,  // try at most 10 times
    interval: BACK_OFF_RETRY.exponential()
  })
  
  // results is in format [
  //   {value: '<the s3ImageUrl returned in the iteratee function corresponding to this-image-is-fine.jpg>' },
  //   {error: new Error('404 - Image not found')},
  //   {value: '<the s3ImageUrl returned in the iteratee function corresponding to another-fine-image.jpg>' },
  //   ......
  // ]
  
  return results
}
```
- Example 2
```javascript
const foods = {
  orange: ['anything1'],
  apple: 'anything2',
  banana: 100
}

processFoods(foods).then(successFn).catch(errorCallback)

async function processFoods(foods) {

  const parallelLimit = 2 // process at most 2 food simultaneously
  
  const results = await asyncParallelForEach(foods, parallelLimit, async (value, foodName, taskState) => {
    
    // if foodName === 'orange', then value will be ['anything1']
    // if foodName === 'apple', then value will be 'anything2'
    // if foodName === 'banana', then value will be 100
    
    const someResult = await someAsyncOperation(value)
    
    return someResult
    
  }, { 
    times: 3,  // try at most 3 times
    interval: BACK_OFF_RETRY.randomBetween(100, 3000)
  })
  
  // results is in format {
  //   orange: {value: '<someResult>' },
  //   apple: {value: '<someResult>' },
  //   banana: {error: new Error('some error if any')}
  // }
  
  return results
}
```

## Example ##
Please check the "example" folder in this repo
- How to run the example:
```bash
git clone https://github.com/Donaldcwl/async-parallel-foreach.git
cd async-parallel-foreach/example
yarn install # or npm install
node example.js
```

### TODO FEATURES ###
- eachTrialTimeout, eachItemTimeout
- run iteratee function in web worker for CPU intensive tasks (use tiny-worker for node.js)