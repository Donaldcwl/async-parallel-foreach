# Async parallel forEach #
[![npm](https://img.shields.io/npm/v/async-parallel-foreach.svg)](https://www.npmjs.com/package/async-parallel-foreach)
[![npm](./coverage/badge.svg)](https://www.npmjs.com/package/async-parallel-foreach)
[![npm](https://img.shields.io/npm/l/async-parallel-foreach.svg)](https://www.npmjs.com/package/async-parallel-foreach)

Javascript module to perform ***async flow control*** on collection/iterable/dictionary ***in parallel*** and make ***retry easily*** when error occurred

## Install ##
```
npm install async-parallel-foreach --save
or
yarn add async-parallel-foreach
```

## How to use this module in your project? ##
Frontend: used in framework like React, Angular, Vue etc
(work with bundler like webpack and rollup)

Backend: node.js
```javascript
import { asyncParallelForEach, BACK_OFF_RETRY } from 'async-parallel-foreach'
```

## API ##
### Main function ###
#### asyncParallelForEach(coll: Collection, parallelLimit: number, iteratee: Function, eachMaxTry): Promise\<Array<{ value: any, error: Error }>> ####
- coll - can be Array, Object (dictionary), Iterable
- parallelLimit - number of iteratee functions to be executed in parallel at any time
- iteratee - the function that you define to process each item in "coll"
- eachMaxTry - maximum number of times each item will be processed by "iteratee".
    - if eachMaxTry = 2, then the item will be retried 1 time when there is error throwed in the iteratee function
    - add delay before retry
        - set eachMaxTry = { times: 2, interval: 1000 } // wait for 1000 ms before retry
        - interval can also accept function returning the interval in ms
            - e.g. eachMaxTry = { times: 2, interval: (retryCount) => retryCount * 1000 } // retryCount start from 2 which means it is the 2nd trial
    - eachMaxTry follows the "opts" argument in [https://caolan.github.io/async/docs.html#retry](https://caolan.github.io/async/docs.html#retry) "retry" 
### BACK_OFF_RETRY strategies ###
- predefined interval function you may use
#### BACK_OFF_RETRY.randomBetween(minMs: number, maxMs: number) ####
#### BACK_OFF_RETRY.exponential() ####
- start from 100ms, then 200ms, 400ms, 800ms, 1600ms, ...
- e.g. eachMaxTry = { times: 5, interval: BACK_OFF_RETRY.randomBetween(100, 3000) } // random delay between 100ms and 3000ms

([details api document in here](http://htmlpreview.github.io/?https://github.com/Donaldcwl/async-parallel-foreach/blob/master/docs/index.html))

## Usage ##
- Example 1
```javascript
const imageUrls = ['https://this-image-is-fine.jpg', 'https://this-image-does-exist-404.jpg', 'https://another-fine-image.jpg', /*......*/]

processImages(imageUrls).then(successFn).catch(errorCallback)

async function processImages(imageUrls) {

  const parallelLimit = 5 // process at most 5 images simultaneously
  
  const results = await asyncParallelForEach(imageUrls, parallelLimit, async (imageUrl, index) => {
    
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
  
  const results = await asyncParallelForEach(foods, parallelLimit, async (value, foodName) => {
    
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
