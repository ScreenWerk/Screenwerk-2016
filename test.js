const request = require('request')
const util = require('util')


const API = 'https://swpublisher.entu.eu/screen/'

let conf_url = API + '8209.json'
// conf_url = 'https://raw.githubusercontent.com/mitselek/Screenwerk-2016/master/package.json'

request(conf_url, function(error, response, data) {
  if (error) {
    console.error('err', error)
    return
  }
  if (response.statusCode !== 200) {
    console.error('code', response.statusCode)
    return
  }
  let configuration = JSON.parse(data)
  console.log(util.inspect(configuration))
  return
})
